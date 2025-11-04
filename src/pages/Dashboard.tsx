import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { format, startOfMonth, differenceInCalendarDays } from "date-fns";
import { DateRange } from "react-day-picker";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatsCard } from "@/components/ui/stats-card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DollarSign,
  TrendingUp,
  AlertTriangle,
  Calendar,
  Target,
  CheckCircle2,
  Clock,
  FileText,
  Upload,
  Plus,
  BadgeDollarSign,
  ShoppingCart,
  Loader2,
} from "lucide-react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

// ... (interfaces SalesMetrics, ContaVencendo, etc. - sem alterações)
interface SalesMetrics {
  vencendo_hoje_valor: number;
  vencendo_hoje_qtd: number;
  pagas_hoje_valor: number;
  pagas_hoje_qtd: number;
  vence_ate_fim_mes_valor: number;
  vence_ate_fim_mes_qtd: number;
  vencidas_valor: number;
  vencidas_qtd: number;
  pendentes_nao_recorrentes_valor: number;
  pendentes_nao_recorrentes_qtd: number;
  total_vendas_mes: number;
  valor_vendas_mes: number;
  ticket_medio_mes: number;
}

interface ContaVencendo {
  conta_id: number;
  descricao: string;
  fornecedor: string;
  valor_em_aberto: number;
  proximo_vencimento: string;
}
interface ParcelaWithContext {
  contaId: number;
  valorParcelaCentavos: number;
  valorPagoCentavos: number | null;
  vencimento: string;
  pagoEm: string | null;
  filialId: number | null;
  filialNome: string;
  categoriaId: number | null;
  categoriaNome: string;
  categoriaCor: string | null;
}

interface FilialOption {
  id: number;
  nome: string;
}

// NOVA INTERFACE PARA O FILTRO
interface CategoriaOption {
  id: number;
  nome: string;
}

interface VendedoraPerformance {
  vendedora_nome: string;
  valor_liquido_total: number;
  percentual_meta: number;
  meta_ajustada: number;
}

export function Dashboard() {
  const navigate = useNavigate();
  const [salesMetrics, setSalesMetrics] = useState<SalesMetrics>({
    vencendo_hoje_valor: 0,
    vencendo_hoje_qtd: 0,
    pagas_hoje_valor: 0,
    pagas_hoje_qtd: 0,
    vence_ate_fim_mes_valor: 0,
    vence_ate_fim_mes_qtd: 0,
    vencidas_valor: 0,
    vencidas_qtd: 0,
    pendentes_nao_recorrentes_valor: 0,
    pendentes_nao_recorrentes_qtd: 0,
    total_vendas_mes: 0,
    valor_vendas_mes: 0,
    ticket_medio_mes: 0,
  });
  const [contasVencendo, setContasVencendo] = useState<ContaVencendo[]>([]);
  const [vendedorasPerformance, setVendedorasPerformance] = useState<VendedoraPerformance[]>([]);
  const [openParcels, setOpenParcels] = useState<ParcelaWithContext[]>([]);
  const [paidParcels, setPaidParcels] = useState<ParcelaWithContext[]>([]);

  // === ESTADOS DOS FILTROS ===
  const [filiais, setFiliais] = useState<FilialOption[]>([]);
  const [selectedFilial, setSelectedFilial] = useState<string>("all");
  const [categorias, setCategorias] = useState<CategoriaOption[]>([]); // NOVO ESTADO
  const [selectedCategoria, setSelectedCategoria] = useState<string>("all"); // NOVO ESTADO
  // ============================

  const [dateRange, setDateRange] = useState<DateRange>({
    from: startOfMonth(new Date()),
    to: new Date(),
  });

  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const { toast } = useToast();

  useEffect(() => {
    fetchFiliais();
    fetchCategorias(); // NOVA CHAMADA
  }, []);

  useEffect(() => {
    if (!dateRange?.from || !dateRange?.to) return;

    let isMounted = true;

    const loadDashboard = async () => {
      if (!loading) {
        setIsRefreshing(true);
      }

      await fetchDashboardData(dateRange.from, dateRange.to);

      if (isMounted) {
        if (loading) {
          setLoading(false);
        }
        setIsRefreshing(false);
      }
    };

    loadDashboard();

    return () => {
      isMounted = false;
    };
    // NÃO adicione 'selectedCategoria' aqui, pois o fetch não depende dele
  }, [dateRange, loading]);

  const fetchDashboardData = async (from: Date, to: Date) => {
    const fromStr = format(from, "yyyy-MM-dd");
    const toStr = format(to, "yyyy-MM-dd");

    try {
      await Promise.all([
        fetchFinancialAnalytics(fromStr, toStr),
        fetchVendasMetrics(),
        fetchContasVencendo(),
        fetchVendedorasPerformance(),
      ]);
    } catch (error) {
      console.error("Erro ao carregar dashboard:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os dados do dashboard.",
        variant: "destructive",
      });
    }
  };

  const fetchFiliais = async () => {
    try {
      const { data, error } = await supabase.from("filiais").select("id, nome").order("nome");

      if (error) throw error;
      setFiliais(data || []);
    } catch (error) {
      console.error("Erro ao carregar filiais:", error);
    }
  };

  // +++ NOVA FUNÇÃO +++
  const fetchCategorias = async () => {
    try {
      const { data, error } = await supabase
        .from("categorias_financeiras")
        .select("id, nome")
        .eq("archived", false)
        .order("nome");

      if (error) throw error;
      setCategorias(data || []);
    } catch (error) {
      console.error("Erro ao carregar categorias:", error);
    }
  };
  // +++ FIM DA NOVA FUNÇÃO +++

  const fetchFinancialAnalytics = async (from: string, to: string) => {
    try {
      const { data: openData, error: openError } = await supabase

        .from("contas_pagar_parcelas")
        .select(
          `
          id,
          conta_id,
          valor_parcela_centavos,
          valor_pago_centavos,
          vencimento,
          pago_em,
          contas_pagar!inner(
            filial_id,
            categoria_id, // <-- Coluna original
            filiais(nome),
            categorias_financeiras(nome, cor) // <-- Tabela original
          )
        `,
        )
        .eq("pago", false)
        .gte("vencimento", from)
        .lte("vencimento", to);

      if (openError) throw openError;

      const { data: paidData, error: paidError } = await supabase
        .from("contas_pagar_parcelas")
        .select(
          `
          id,
          conta_id,
          valor_parcela_centavos,
          valor_pago_centavos,
          vencimento,
          pago_em,
          contas_pagar!inner(
            filial_id,
            categoria_id, // <-- Coluna original
            filiais(nome),
            categorias_financeiras(nome, cor) // <-- Tabela original
          )
        `,
        )
        .eq("pago", true)
        .gte("pago_em", from)
        .lte("pago_em", to);

      if (paidError) throw paidError;

      const mapToContext = (items: any[] | null) =>
        (items || []).map((item) => ({
          contaId: item.conta_id,
          valorParcelaCentavos: item.valor_parcela_centavos || 0,
          valorPagoCentavos: item.valor_pago_centavos ?? null,
          vencimento: item.vencimento,
          pagoEm: item.pago_em,
          filialId: item.contas_pagar?.filial_id ?? null,
          filialNome: item.contas_pagar?.filiais?.nome || "Sem filial",
          // Campos originais mantidos
          categoriaId: item.contas_pagar?.categoria_id ?? null,
          categoriaNome: item.contas_pagar?.categorias_financeiras?.nome || "Sem categoria",
          categoriaCor: item.contas_pagar?.categorias_financeiras?.cor ?? null,
        })) as ParcelaWithContext[];

      setOpenParcels(mapToContext(openData));
      setPaidParcels(mapToContext(paidData));
    } catch (error) {
      console.error("Erro ao buscar dados financeiros:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os dados financeiros do período.",
        variant: "destructive",
      });
      setOpenParcels([]);
      setPaidParcels([]);
    }
  };

  // ... (funções fetchVendasMetrics, fetchContasVencendo, fetchVendedorasPerformance, formatCurrency, formatDate - sem alterações)
  const fetchVendasMetrics = async () => {
    try {
      const hoje = new Date();
      const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
      const fimMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);

      const { data: vendas, error } = await supabase
        .from("vendas_diarias")
        .select("valor_liquido_centavos, qtd_itens")
        .gte("data", inicioMes.toISOString().split("T")[0])
        .lte("data", fimMes.toISOString().split("T")[0]);

      if (error) throw error;

      const totalVendas = vendas?.length || 0;
      const valorVendasMes = vendas?.reduce((sum, venda) => sum + venda.valor_liquido_centavos, 0) || 0;
      const ticketMedio = totalVendas > 0 ? valorVendasMes / totalVendas : 0;

      setSalesMetrics((prev) => ({
        ...prev,
        total_vendas_mes: totalVendas,
        valor_vendas_mes: valorVendasMes,
        ticket_medio_mes: ticketMedio,
      }));
    } catch (error) {
      console.error("Erro ao buscar métricas de vendas:", error);
    }
  };

  const fetchContasVencendo = async () => {
    try {
      const hoje = new Date();
      const proximosDias = new Date();
      proximosDias.setDate(hoje.getDate() + 7);

      const { data, error } = await supabase
        .from("contas_pagar_parcelas")
        .select(
          `
          id,
          valor_parcela_centavos,
          vencimento,
          contas_pagar!inner(
            id,
            descricao,
            pessoas_juridicas!fornecedor_id(razao_social, nome_fantasia)
          )
        `,
        )
        .eq("pago", false)
        .gte("vencimento", hoje.toISOString().split("T")[0])
        .lte("vencimento", proximosDias.toISOString().split("T")[0])
        .order("vencimento")
        .limit(5);

      if (error) throw error;

      const formattedData =
        data?.map((item) => ({
          conta_id: item.contas_pagar?.id || 0,
          descricao: item.contas_pagar?.descricao || "",
          fornecedor:
            item.contas_pagar?.pessoas_juridicas?.razao_social ||
            item.contas_pagar?.pessoas_juridicas?.nome_fantasia ||
            "Não informado",
          valor_em_aberto: item.valor_parcela_centavos,
          proximo_vencimento: item.vencimento,
        })) || [];

      setContasVencendo(formattedData);
    } catch (error) {
      console.error("Erro ao buscar contas vencendo:", error);
    }
  };

  const fetchVendedorasPerformance = async () => {
    try {
      const hoje = new Date();
      const ano = hoje.getFullYear();
      const mes = hoje.getMonth() + 1;

      const { data: vendas, error } = await supabase
        .from("vendas_diarias")
        .select(
          `
          vendedora_pf_id,
          valor_liquido_centavos,
          pessoas_fisicas(nome_completo)
        `,
        )
        .gte("data", `${ano}-${mes.toString().padStart(2, "0")}-01`)
        .lte("data", `${ano}-${mes.toString().padStart(2, "0")}-31`);

      if (error) throw error;

      const vendedorasMap = new Map();
      vendas?.forEach((venda) => {
        const vendedoraId = venda.vendedora_pf_id;
        const nome = venda.pessoas_fisicas?.nome_completo || "Não informado";

        if (!vendedorasMap.has(vendedoraId)) {
          vendedorasMap.set(vendedoraId, {
            vendedora_nome: nome,
            valor_liquido_total: 0,
            percentual_meta: 0,
            meta_ajustada: 100000,
          });
        }

        const vendedora = vendedorasMap.get(vendedoraId);
        vendedora.valor_liquido_total += venda.valor_liquido_centavos;
        vendedora.percentual_meta = (vendedora.valor_liquido_total / vendedora.meta_ajustada) * 100;
      });

      const performance = Array.from(vendedorasMap.values())
        .sort((a, b) => b.percentual_meta - a.percentual_meta)
        .slice(0, 5);

      setVendedorasPerformance(performance);
    } catch (error) {
      console.error("Erro ao buscar performance das vendedoras:", error);
    }
  };

  const formatCurrency = (centavos: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(centavos / 100);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("pt-BR");
  };

  // +++ LÓGICA DE FILTRAGEM ATUALIZADA +++
  const filteredOpenParcels = useMemo(() => {
    const filialId = Number(selectedFilial);
    const categoriaId = Number(selectedCategoria); // Novo

    return openParcels.filter((parcel) => {
      // Filtro de Filial
      const filialMatch =
        selectedFilial === "all" ||
        (selectedFilial === "unassigned" && parcel.filialId === null) ||
        (!Number.isNaN(filialId) && parcel.filialId === filialId);

      // Filtro de Categoria (Novo)
      const categoriaMatch =
        selectedCategoria === "all" ||
        (selectedCategoria === "unassigned" && parcel.categoriaId === null) || // Se quiser filtrar "sem categoria"
        (!Number.isNaN(categoriaId) && parcel.categoriaId === categoriaId);

      return filialMatch && categoriaMatch;
    });
  }, [openParcels, selectedFilial, selectedCategoria]); // <-- DEPENDE DA CATEGORIA AGORA

  const filteredPaidParcels = useMemo(() => {
    const filialId = Number(selectedFilial);
    const categoriaId = Number(selectedCategoria); // Novo

    return paidParcels.filter((parcel) => {
      // Filtro de Filial
      const filialMatch =
        selectedFilial === "all" ||
        (selectedFilial === "unassigned" && parcel.filialId === null) ||
        (!Number.isNaN(filialId) && parcel.filialId === filialId);

      // Filtro de Categoria (Novo)
      const categoriaMatch =
        selectedCategoria === "all" ||
        (selectedCategoria === "unassigned" && parcel.categoriaId === null) ||
        (!Number.isNaN(categoriaId) && parcel.categoriaId === categoriaId);

      return filialMatch && categoriaMatch;
    });
  }, [paidParcels, selectedFilial, selectedCategoria]); // <-- DEPENDE DA CATEGORIA AGORA
  // +++ FIM DA ATUALIZAÇÃO DA LÓGICA +++

  const financialOverview = useMemo(() => {
    // ... (nenhuma alteração aqui, pois já depende dos memos atualizados)
    const totalAberto = filteredOpenParcels.reduce((sum, parcela) => sum + parcela.valorParcelaCentavos, 0);
    const totalPago = filteredPaidParcels.reduce(
      (sum, parcela) => sum + (parcela.valorPagoCentavos ?? parcela.valorParcelaCentavos),
      0,
    );
    const quantidadeAberto = filteredOpenParcels.length;
    const quantidadePagas = filteredPaidParcels.length;
    const ticketMedioPago = quantidadePagas > 0 ? totalPago / quantidadePagas : 0;

    const delays = filteredPaidParcels
      .filter((parcela) => parcela.pagoEm)
      .map((parcela) => differenceInCalendarDays(new Date(parcela.pagoEm as string), new Date(parcela.vencimento)));
    const atrasoMedioDias = delays.length > 0 ? delays.reduce((acc, valor) => acc + valor, 0) / delays.length : null;

    const percentualPago =
      quantidadePagas + quantidadeAberto > 0 ? (quantidadePagas / (quantidadePagas + quantidadeAberto)) * 100 : 0;

    return {
      totalAberto,
      totalPago,
      quantidadeAberto,
      quantidadePagas,
      ticketMedioPago,
      atrasoMedioDias,
      percentualPago,
    };
  }, [filteredOpenParcels, filteredPaidParcels]);

  const filialChartData = useMemo(() => {
    // ... (nenhuma alteração aqui, este gráfico não deve ser filtrado por categoria)
    const map = new Map<string, { filialId: number | null; filial: string; valorPago: number; valorAberto: number }>();

    const upsert = (
      key: string,
      data: { filialId: number | null; filial: string; valorPago?: number; valorAberto?: number },
    ) => {
      const existing = map.get(key) || { filialId: data.filialId, filial: data.filial, valorPago: 0, valorAberto: 0 };
      map.set(key, {
        filialId: existing.filialId,
        filial: existing.filial,
        valorPago: existing.valorPago + (data.valorPago || 0),
        valorAberto: existing.valorAberto + (data.valorAberto || 0),
      });
    };

    openParcels.forEach((parcela) => {
      const key = parcela.filialId !== null ? parcela.filialId.toString() : "unassigned";
      upsert(key, {
        filialId: parcela.filialId,
        filial: parcela.filialNome,
        valorAberto: parcela.valorParcelaCentavos,
      });
    });

    paidParcels.forEach((parcela) => {
      const key = parcela.filialId !== null ? parcela.filialId.toString() : "unassigned";
      upsert(key, {
        filialId: parcela.filialId,
        filial: parcela.filialNome,
        valorPago: parcela.valorPagoCentavos ?? parcela.valorParcelaCentavos,
      });
    });

    const data = Array.from(map.values())
      .map((item) => ({
        ...item,
        valorPago: item.valorPago / 100,
        valorAberto: item.valorAberto / 100,
      }))
      .sort((a, b) => b.valorPago + b.valorAberto - (a.valorPago + a.valorAberto));

    if (selectedFilial === "all") return data;
    if (selectedFilial === "unassigned") {
      return data.filter((item) => item.filialId === null);
    }
    const filialId = Number(selectedFilial);
    if (Number.isNaN(filialId)) return data;
    return data.filter((item) => item.filialId === filialId);
  }, [openParcels, paidParcels, selectedFilial]); // <-- Correto, não depende da categoria

  const categoriaChartData = useMemo(() => {
    // ... (nenhuma alteração aqui, pois já depende dos memos atualizados)
    const map = new Map<
      string,
      { categoriaId: number | null; categoria: string; cor: string | null; valorPago: number; valorAberto: number }
    >();

    const upsert = (
      key: string,
      data: {
        categoriaId: number | null;
        categoria: string;
        cor: string | null;
        valorPago?: number;
        valorAberto?: number;
      },
    ) => {
      const existing = map.get(key) || {
        categoriaId: data.categoriaId,
        categoria: data.categoria,
        cor: data.cor,
        valorPago: 0,
        valorAberto: 0,
      };
      map.set(key, {
        categoriaId: existing.categoriaId,
        categoria: existing.categoria,
        cor: existing.cor,
        valorPago: existing.valorPago + (data.valorPago || 0),
        valorAberto: existing.valorAberto + (data.valorAberto || 0),
      });
    };

    filteredOpenParcels.forEach((parcela) => {
      const key = parcela.categoriaId !== null ? parcela.categoriaId.toString() : "unassigned";
      upsert(key, {
        categoriaId: parcela.categoriaId,
        categoria: parcela.categoriaNome,
        cor: parcela.categoriaCor,
        valorAberto: parcela.valorParcelaCentavos,
      });
    });

    filteredPaidParcels.forEach((parcela) => {
      const key = parcela.categoriaId !== null ? parcela.categoriaId.toString() : "unassigned";
      upsert(key, {
        categoriaId: parcela.categoriaId,
        categoria: parcela.categoriaNome,
        cor: parcela.categoriaCor,
        valorPago: parcela.valorPagoCentavos ?? parcela.valorParcelaCentavos,
      });
    });

    return Array.from(map.values())
      .map((item) => ({
        ...item,
        valorPago: item.valorPago / 100,
        valorAberto: item.valorAberto / 100,
      }))
      .sort((a, b) => b.valorPago + b.valorAberto - (a.valorPago + a.valorAberto))
      .slice(0, 12);
  }, [filteredOpenParcels, filteredPaidParcels]);

  // ... (dailySeriesData, statusDistribution, etc. - sem alterações, pois dependem dos memos atualizados)
  const dailySeriesData = useMemo(() => {
    const map = new Map<string, { date: string; pagos: number; abertos: number }>();

    filteredPaidParcels.forEach((parcela) => {
      const dateKey = parcela.pagoEm || parcela.vencimento;
      const existing = map.get(dateKey) || { date: dateKey, pagos: 0, abertos: 0 };
      existing.pagos += parcela.valorPagoCentavos ?? parcela.valorParcelaCentavos;
      map.set(dateKey, existing);
    });

    filteredOpenParcels.forEach((parcela) => {
      const dateKey = parcela.vencimento;
      const existing = map.get(dateKey) || { date: dateKey, pagos: 0, abertos: 0 };
      existing.abertos += parcela.valorParcelaCentavos;
      map.set(dateKey, existing);
    });

    return Array.from(map.values())
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .map((item) => ({
        ...item,
        pagos: item.pagos / 100,
        abertos: item.abertos / 100,
        label: format(new Date(item.date), "dd/MM"),
      }));
  }, [filteredOpenParcels, filteredPaidParcels]);

  const statusDistribution = useMemo(
    () => [
      { name: "Pagas", value: financialOverview.quantidadePagas, color: "hsl(var(--success))" },
      { name: "Em aberto", value: financialOverview.quantidadeAberto, color: "hsl(var(--warning))" },
    ],
    [financialOverview.quantidadePagas, financialOverview.quantidadeAberto],
  );

  const statusValueChartData = useMemo(
    () => [
      { name: "Pagas", valor: financialOverview.totalPago / 100 },
      { name: "Em aberto", valor: financialOverview.totalAberto / 100 },
    ],
    [financialOverview.totalPago, financialOverview.totalAberto],
  );

  const periodoLabel = useMemo(() => {
    if (!dateRange?.from || !dateRange?.to) return "";
    return `${format(dateRange.from, "dd/MM/yyyy")} - ${format(dateRange.to, "dd/MM/yyyy")}`;
  }, [dateRange]);

  const atrasoDescricao = useMemo(() => {
    if (financialOverview.atrasoMedioDias === null) {
      return "Sem pagamentos registrados no período";
    }
    if (financialOverview.atrasoMedioDias > 0) {
      return "Média de dias após o vencimento";
    }
    if (financialOverview.atrasoMedioDias < 0) {
      return "Média de dias antes do vencimento";
    }
    return "Pagamentos realizados no dia do vencimento";
  }, [financialOverview.atrasoMedioDias]);

  const handleRangeChange = (range: DateRange | undefined) => {
    if (!range?.from) return;
    if (!range.to) {
      setDateRange({ from: range.from, to: range.from });
      return;
    }
    setDateRange(range);
  };

  if (loading) {
    // ... (skeleton/loading state - sem alterações)
    return (
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="space-y-2">
            <Skeleton className="h-10 w-64" />
            <Skeleton className="h-6 w-48" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-10 w-36" />
            <Skeleton className="h-10 w-36" />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-10 w-48" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <div className="grid gap-6 xl:grid-cols-2">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-[320px]" />
          ))}
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }
  // ... (variáveis atrasoValor, percentualPagoDisplay - sem alterações)
  const atrasoValor =
    financialOverview.atrasoMedioDias === null
      ? "Sem dados"
      : `${Math.abs(financialOverview.atrasoMedioDias).toFixed(1)} dias`;

  const percentualPagoDisplay = Math.max(0, Math.min(100, financialOverview.percentualPago));
  const percentualAberto = Math.max(0, Math.min(100, 100 - percentualPagoDisplay));

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        {/* ... (header e botões - sem alterações) */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">Gestão financeira e controle de pagamentos</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => navigate("/compras/importar-xml")}>
            <Upload className="h-4 w-4 mr-2" />
            Importar XML
          </Button>
          <Button onClick={() => navigate("/financeiro/contas-pagar")}>
            <Plus className="h-4 w-4 mr-2" />
            Nova Conta
          </Button>
        </div>
      </div>

      {/* +++ ÁREA DE FILTROS ATUALIZADA +++ */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <DateRangePicker value={dateRange} onChange={handleRangeChange} />

          <Select value={selectedFilial} onValueChange={setSelectedFilial}>
            <SelectTrigger className="w-full sm:w-[220px]">
              <SelectValue placeholder="Filial" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as filiais</SelectItem>
              {filiais.map((filial) => (
                <SelectItem key={filial.id} value={filial.id.toString()}>
                  {filial.nome}
                </SelectItem>
              ))}
              <SelectItem value="unassigned">Sem filial vinculada</SelectItem>
            </SelectContent>
          </Select>

          {/* NOVO FILTRO DE CATEGORIA */}
          <Select value={selectedCategoria} onValueChange={setSelectedCategoria}>
            <SelectTrigger className="w-full sm:w-[220px]">
              <SelectValue placeholder="Categoria" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as categorias</SelectItem>
              {categorias.map((cat) => (
                <SelectItem key={cat.id} value={cat.id.toString()}>
                  {cat.nome}
                </SelectItem>
              ))}
              <SelectItem value="unassigned">Sem categoria</SelectItem>
            </SelectContent>
          </Select>
          {/* FIM DO NOVO FILTRO */}
        </div>
        <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
          {/* ... (label de período e refresh - sem alterações) */}
          {periodoLabel && <span>Período: {periodoLabel}</span>}
          {isRefreshing && (
            <span className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Atualizando dados...
            </span>
          )}
        </div>
      </div>
      {/* +++ FIM DA ÁREA DE FILTROS +++ */}

      {/* Restante do JSX (Cards, Gráficos, etc.) sem nenhuma alteração */}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatsCard
          title="Total Pago no Período"
          value={formatCurrency(financialOverview.totalPago)}
          description={`Ticket médio: ${formatCurrency(financialOverview.ticketMedioPago)}`}
          icon={DollarSign}
          variant="success"
        />
        <StatsCard
          title="Total em Aberto"
          value={formatCurrency(financialOverview.totalAberto)}
          description={`Parcelas em aberto: ${financialOverview.quantidadeAberto}`}
          icon={AlertTriangle}
          variant="warning"
        />
        <StatsCard
          title="Contas Pagas"
          value={financialOverview.quantidadePagas.toString()}
          description={`Participação: ${percentualPagoDisplay.toFixed(1)}%`}
          icon={CheckCircle2}
          variant="success"
        />
        <StatsCard
          title="Contas em Aberto"
          value={financialOverview.quantidadeAberto.toString()}
          description={`Participação: ${percentualAberto.toFixed(1)}%`}
          icon={Clock}
          variant="info"
        />
        <StatsCard
          title="Atraso Médio"
          value={atrasoValor}
          description={atrasoDescricao}
          icon={Calendar}
          variant={
            financialOverview.atrasoMedioDias === null
              ? "default"
              : financialOverview.atrasoMedioDias > 0
                ? "danger"
                : financialOverview.atrasoMedioDias < 0
                  ? "success"
                  : "info"
          }
        />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <StatsCard
          title="Vendas do Mês"
          value={salesMetrics.total_vendas_mes.toString()}
          description={`${formatCurrency(salesMetrics.valor_vendas_mes)} faturado`}
          icon={ShoppingCart}
          variant="success"
        />
        <StatsCard
          title="Ticket Médio de Vendas"
          value={formatCurrency(salesMetrics.ticket_medio_mes)}
          description="Média por venda no mês atual"
          icon={BadgeDollarSign}
          variant="info"
        />
        <StatsCard
          title="Percentual de Pagamentos"
          value={`${percentualPagoDisplay.toFixed(1)}%`}
          description="Parcelas pagas sobre o total do período"
          icon={TrendingUp}
          variant="default"
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Pagamentos por Filial</CardTitle>
            <CardDescription>Valores pagos e em aberto no período selecionado</CardDescription>
          </CardHeader>
          <CardContent>
            {filialChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={filialChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="filial" tick={{ fontSize: 12 }} />
                  <YAxis />
                  <Tooltip formatter={(value: number) => formatCurrency(Math.round(Number(value) * 100))} />
                  <Legend />
                  <Bar dataKey="valorPago" name="Pago" fill="hsl(var(--success))" radius={[8, 8, 0, 0]} />
                  <Bar dataKey="valorAberto" name="Em aberto" fill="hsl(var(--warning))" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[320px] flex items-center justify-center text-sm text-muted-foreground text-center px-4">
                Nenhum dado encontrado para o período selecionado.
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Categorias Financeiras</CardTitle>
            <CardDescription>Principais categorias de contas pagas e a pagar</CardDescription>
          </CardHeader>
          <CardContent>
            {categoriaChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={categoriaChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="categoria" tick={{ fontSize: 12 }} interval={0} height={60} />
                  <YAxis />
                  <Tooltip formatter={(value: number) => formatCurrency(Math.round(Number(value) * 100))} />
                  <Legend />
                  <Bar dataKey="valorPago" name="Pago" fill="hsl(var(--success))" radius={[8, 8, 0, 0]} />
                  <Bar dataKey="valorAberto" name="Em aberto" fill="hsl(var(--info))" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[320px] flex items-center justify-center text-sm text-muted-foreground text-center px-4">
                Nenhuma categoria encontrada para o período selecionado.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Evolução diária de pagamentos</CardTitle>
            <CardDescription>Comparativo entre valores pagos e previstos por dia</CardDescription>
          </CardHeader>
          <CardContent>
            {dailySeriesData.length > 0 ? (
              <ResponsiveContainer width="100%" height={320}>
                <LineChart data={dailySeriesData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="label" />
                  <YAxis />
                  <Tooltip
                    formatter={(value: number) => formatCurrency(Math.round(Number(value) * 100))}
                    labelFormatter={(label, payload) => {
                      const original = payload?.[0]?.payload?.date;
                      return original ? format(new Date(original), "dd/MM/yyyy") : label;
                    }}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="pagos"
                    name="Pagos"
                    stroke="hsl(var(--success))"
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="abertos"
                    name="A pagar"
                    stroke="hsl(var(--warning))"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[320px] flex items-center justify-center text-sm text-muted-foreground text-center px-4">
                Nenhuma movimentação encontrada para o período selecionado.
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Distribuição por Situação</CardTitle>
            <CardDescription>Quantidades e valores consolidados do período</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {statusDistribution.every((item) => item.value === 0) ? (
              <div className="h-[320px] flex items-center justify-center text-sm text-muted-foreground text-center px-4">
                Ainda não há parcelas pagas ou em aberto no período selecionado.
              </div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={240}>
                  <PieChart>
                    <Pie
                      data={statusDistribution}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={90}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    >
                      {statusDistribution.map((entry, index) => (
                        <Cell key={`status-cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => `${value} parcelas`} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
                <ResponsiveContainer width="100%" height={160}>
                  <BarChart data={statusValueChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip formatter={(value: number) => formatCurrency(Math.round(Number(value) * 100))} />
                    <Bar dataKey="valor" name="Valor" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
