import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import {
  Filter,
  Plus,
  Search,
  Settings2,
  X,
  Trash2,
  Eye,
} from "lucide-react";

type ParcelaRow = {
  id: number; // id da parcela (contas_pagar_parcelas.id)
  conta_id: number;
  parcela_num: number;
  valor_parcela_centavos: number;
  vencimento: string; // ISO date
  pago: boolean;
  fornecedor?: string;
  descricao?: string;
  categoria?: string;
  filial?: string;
  created_at?: string;
  updated_at?: string;
  // campos opcionais usados em pagamentos/bulk UI
  forma_pagamento_id?: number | null;
};

type Fornecedor = { id: number; nome_fantasia: string | null; razao_social: string | null };
type Categoria = { id: number; nome: string };
type Filial = { id: number; nome: string };
type ContaBancaria = { id: number; banco: string; conta: string };

export function ContasPagarSimple() {
  const navigate = useNavigate();
  const { toast } = useToast();

  // Dados
  const [parcelas, setParcelas] = useState<ParcelaRow[]>([]);
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [filiais, setFiliais] = useState<Filial[]>([]);
  const [contasBancarias, setContasBancarias] = useState<ContaBancaria[]>([]);

  // UI/Estado
  const [loading, setLoading] = useState<boolean>(true);
  const [deleting, setDeleting] = useState<boolean>(false);

  // Filtros e busca
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [showFilters, setShowFilters] = useState<boolean>(false);
  const [filterFornecedor, setFilterFornecedor] = useState<string>("all");
  const [filterFilial, setFilterFilial] = useState<string>("all");
  const [filterCategoria, setFilterCategoria] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterValorMin, setFilterValorMin] = useState<string>("");
  const [filterValorMax, setFilterValorMax] = useState<string>("");
  const [filterDataVencimentoInicio, setFilterDataVencimentoInicio] = useState<string | null>(null);
  const [filterDataVencimentoFim, setFilterDataVencimentoFim] = useState<string | null>(null);

  // Paginação simples
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize] = useState<number>(20);

  // Seleção
  const [selectedParcelas, setSelectedParcelas] = useState<number[]>([]);

  // ===== Helpers =====
  const formatCurrency = (centavos: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
      (centavos || 0) / 100
    );

  const formatDate = (dateString: string) =>
    dateString ? new Date(dateString).toLocaleDateString("pt-BR") : "-";

  const getStatusBadge = (vencimento: string, pago: boolean) => {
    if (pago) return <Badge className="bg-green-500">Pago</Badge>;
    const hoje = new Date();
    const dv = new Date(vencimento);
    if (dv < hoje) return <Badge variant="destructive">Vencido</Badge>;
    if (dv <= new Date(hoje.getTime() + 7 * 24 * 60 * 60 * 1000))
      return <Badge variant="outline">Vence em 7 dias</Badge>;
    return <Badge variant="default">Pendente</Badge>;
  };

  // ===== Fetch =====
  const fetchParcelas = async () => {
    setLoading(true);
    try {
      // Busca parcelas em aberto (ajuste conforme seu schema)
      const { data: parcelasData, error: parcelasError } = await supabase
        .from("contas_pagar_parcelas")
        .select("*")
        .eq("pago", false)
        .order("vencimento");

      if (parcelasError) throw parcelasError;

      const contasIds = [...new Set((parcelasData || []).map((p: any) => p.conta_id))];

      let contasMap = new Map<number, any>();
      if (contasIds.length > 0) {
        const { data: contasData, error: contasError } = await supabase
          .from("contas_pagar")
          .select("id, descricao, fornecedor_id, categoria_id, filial_id")
          .in("id", contasIds);

        if (contasError) throw contasError;
        (contasData || []).forEach((c: any) => contasMap.set(c.id, c));
      }

      const fornecedorIds = [
        ...new Set(
          (Array.from(contasMap.values()) || [])
            .map((c: any) => c.fornecedor_id)
            .filter(Boolean)
        ),
      ];
      let fornecedoresMap = new Map<number, Fornecedor>();
      if (fornecedorIds.length > 0) {
        const { data: fornecedoresData, error: fornecedoresError } = await supabase
          .from("pessoas_juridicas")
          .select("id, nome_fantasia, razao_social")
          .in("id", fornecedorIds);
        if (fornecedoresError) throw fornecedoresError;
        (fornecedoresData || []).forEach((f: any) => fornecedoresMap.set(f.id, f));
      }

      const categoriaIds = [
        ...new Set(
          (Array.from(contasMap.values()) || [])
            .map((c: any) => c.categoria_id)
            .filter(Boolean)
        ),
      ];
      let categoriasMap = new Map<number, Categoria>();
      if (categoriaIds.length > 0) {
        const { data: categoriasData, error: categoriasError } = await supabase
          .from("categorias_financeiras")
          .select("id, nome")
          .in("id", categoriaIds);
        if (categoriasError) throw categoriasError;
        (categoriasData || []).forEach((c: any) => categoriasMap.set(c.id, c));
      }

      const filialIds = [
        ...new Set(
          (Array.from(contasMap.values()) || [])
            .map((c: any) => c.filial_id)
            .filter(Boolean)
        ),
      ];
      let filiaisMap = new Map<number, Filial>();
      if (filialIds.length > 0) {
        const { data: filiaisData, error: filiaisError } = await supabase
          .from("filiais")
          .select("id, nome")
          .in("id", filialIds);
        if (filiaisError) throw filiaisError;
        (filiaisData || []).forEach((f: any) => filiaisMap.set(f.id, f));
      }

      const rows: ParcelaRow[] =
        (parcelasData || []).map((p: any) => {
          const conta = contasMap.get(p.conta_id);
          const forn = conta?.fornecedor_id ? fornecedoresMap.get(conta.fornecedor_id) : null;
          const cat = conta?.categoria_id ? categoriasMap.get(conta.categoria_id) : null;
          const fil = conta?.filial_id ? filiaisMap.get(conta.filial_id) : null;
          return {
            id: p.id,
            conta_id: p.conta_id,
            parcela_num: p.parcela_num || p.numero_parcela || 1,
            valor_parcela_centavos: p.valor_parcela_centavos ?? p.valor_centavos ?? 0,
            vencimento: p.vencimento,
            pago: !!p.pago,
            fornecedor:
              forn?.nome_fantasia || forn?.razao_social || (conta?.fornecedor_id ? `#${conta.fornecedor_id}` : "N/A"),
            descricao: conta?.descricao || "—",
            categoria: cat?.nome,
            filial: fil?.nome,
            created_at: p.created_at,
            updated_at: p.updated_at,
            forma_pagamento_id: p.forma_pagamento_id ?? null,
          };
        }) || [];

      setParcelas(rows);
    } catch (err) {
      console.error("Erro ao buscar parcelas:", err);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as parcelas.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchAuxiliares = async () => {
    try {
      const [{ data: forn }, { data: cats }, { data: fils }, { data: contas }] = await Promise.all([
        supabase.from("pessoas_juridicas").select("id, nome_fantasia, razao_social").order("nome_fantasia"),
        supabase.from("categorias_financeiras").select("id, nome").order("nome"),
        supabase.from("filiais").select("id, nome").order("nome"),
        supabase.from("contas_bancarias").select("id, banco, conta").order("banco"),
      ]);
      setFornecedores((forn || []) as any);
      setCategorias((cats || []) as any);
      setFiliais((fils || []) as any);
      setContasBancarias((contas || []) as any);
    } catch (err) {
      console.error("Erro ao buscar auxiliares:", err);
    }
  };

  useEffect(() => {
    fetchParcelas();
    fetchAuxiliares();
  }, []);

  // ===== Filtros/Ordenação =====
  const filteredAndSortedParcelas = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    let data = parcelas.filter((p) => {
      const matchTerm =
        !term ||
        (p.fornecedor || "").toLowerCase().includes(term) ||
        (p.descricao || "").toLowerCase().includes(term) ||
        String(p.id).includes(term) ||
        String(p.conta_id).includes(term);

      const matchFornecedor = filterFornecedor === "all" || String(p.fornecedor || "").includes(filterFornecedor);
      const matchFilial = filterFilial === "all" || (p.filial === filterFilial);
      const matchCategoria = filterCategoria === "all" || (p.categoria === filterCategoria);

      const matchStatus =
        filterStatus === "all" ||
        (filterStatus === "pago" && p.pago) ||
        (filterStatus === "aberto" && !p.pago);

      const valor = p.valor_parcela_centavos / 100;
      const matchValorMin = !filterValorMin || valor >= parseFloat(filterValorMin);
      const matchValorMax = !filterValorMax || valor <= parseFloat(filterValorMax);

      const venc = new Date(p.vencimento).getTime();
      const matchDataIni = !filterDataVencimentoInicio || venc >= new Date(filterDataVencimentoInicio).getTime();
      const matchDataFim = !filterDataVencimentoFim || venc <= new Date(filterDataVencimentoFim).getTime();

      return (
        matchTerm &&
        matchFornecedor &&
        matchFilial &&
        matchCategoria &&
        matchStatus &&
        matchValorMin &&
        matchValorMax &&
        matchDataIni &&
        matchDataFim
      );
    });

    // Ordenação padrão por vencimento asc
    data.sort((a, b) => new Date(a.vencimento).getTime() - new Date(b.vencimento).getTime());
    return data;
  }, [
    parcelas,
    searchTerm,
    filterFornecedor,
    filterFilial,
    filterCategoria,
    filterStatus,
    filterValorMin,
    filterValorMax,
    filterDataVencimentoInicio,
    filterDataVencimentoFim,
  ]);

  // Paginação
  const totalItems = filteredAndSortedParcelas.length;
  const totalPages = Math.ceil(totalItems / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedData = filteredAndSortedParcelas.slice(startIndex, endIndex);

  useEffect(() => {
    setCurrentPage(1);
  }, [
    searchTerm,
    filterFornecedor,
    filterFilial,
    filterCategoria,
    filterStatus,
    filterValorMin,
    filterValorMax,
    filterDataVencimentoInicio,
    filterDataVencimentoFim,
  ]);

  const clearFilters = () => {
    setSearchTerm("");
    setFilterFornecedor("all");
    setFilterFilial("all");
    setFilterCategoria("all");
    setFilterStatus("all");
    setFilterValorMin("");
    setFilterValorMax("");
    setFilterDataVencimentoInicio(null);
    setFilterDataVencimentoFim(null);
  };

  // ===== Ações =====

  // Exclusão em massa de PARCELAS selecionadas
  const handleBulkDelete = async () => {
    if (selectedParcelas.length === 0 || deleting) return;

    const msg =
      selectedParcelas.length === 1
        ? "Tem certeza que deseja excluir esta parcela?"
        : `Tem certeza que deseja excluir ${selectedParcelas.length} parcelas?`;

    if (!confirm(msg)) return;

    try {
      setDeleting(true);

      const { error } = await supabase
        .from("contas_pagar_parcelas")
        .delete()
        .in("id", selectedParcelas);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description:
          selectedParcelas.length === 1
            ? "Parcela excluída com sucesso."
            : `${selectedParcelas.length} parcelas excluídas com sucesso.`,
      });

      await fetchParcelas();
      setSelectedParcelas([]);
    } catch (err: any) {
      console.error("Erro ao excluir parcelas:", err);
      toast({
        title: "Erro ao excluir",
        description:
          err?.message || "Não foi possível excluir as parcelas. Verifique as políticas/RLS no Supabase.",
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
    }
  };

  // ===== Render =====
  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Contas a Pagar</h1>
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  const activeFiltersCount = [
    filterFornecedor !== "all",
    filterFilial !== "all",
    filterCategoria !== "all",
    filterStatus !== "all",
    filterValorMin,
    filterValorMax,
    filterDataVencimentoInicio,
    filterDataVencimentoFim,
  ].filter(Boolean).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Contas a Pagar</h1>
          <p className="text-muted-foreground">
            Total: {parcelas.length} parcela(s) | Exibindo: {filteredAndSortedParcelas.length}
          </p>
        </div>
        <Button onClick={() => navigate("/financeiro/contas-pagar/nova")}>
          <Plus className="h-4 w-4 mr-2" />
          Nova Conta a Pagar
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex-1 flex items-center gap-4">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por fornecedor, descrição, ID ou conta..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button variant="outline" onClick={() => setShowFilters(!showFilters)}>
                <Filter className="h-4 w-4 mr-2" />
                Filtros {activeFiltersCount > 0 && `(${activeFiltersCount})`}
              </Button>
              {activeFiltersCount > 0 && (
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  <X className="h-4 w-4 mr-2" />
                  Limpar Filtros
                </Button>
              )}
            </div>

            {/* Personalizar colunas (mantido mesmo sem implementação aqui) */}
            <Button variant="outline" onClick={() => {}}>
              <Settings2 className="h-4 w-4 mr-2" />
              Personalizar Colunas
            </Button>
          </div>

          {/* Barra de ações em massa */}
          <div className="mt-4 flex items-center gap-2">
            <Button
              size="sm"
              variant="destructive"
              onClick={handleBulkDelete}
              disabled={deleting || selectedParcelas.length === 0}
              title={deleting ? "Excluindo..." : "Excluir Selecionados"}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              {deleting ? "Excluindo..." : "Excluir Selecionados"}
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead style={{ width: 44 }}></TableHead>
                <TableHead>ID</TableHead>
                <TableHead>Conta</TableHead>
                <TableHead>Fornecedor</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Filial</TableHead>
                <TableHead>Parcela</TableHead>
                <TableHead>Vencimento</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedData.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>
                    <input
                      type="checkbox"
                      className="h-4 w-4"
                      checked={selectedParcelas.includes(p.id)}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setSelectedParcelas((prev) =>
                          checked ? [...prev, p.id] : prev.filter((id) => id !== p.id)
                        );
                      }}
                    />
                  </TableCell>
                  <TableCell>{p.id}</TableCell>
                  <TableCell>{p.conta_id}</TableCell>
                  <TableCell>{p.fornecedor || "-"}</TableCell>
                  <TableCell className="max-w-[280px]">
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Abrir conta"
                        onClick={() => navigate(`/financeiro/conta/${p.conta_id}`)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <span className="line-clamp-2">{p.descricao || "-"}</span>
                    </div>
                  </TableCell>
                  <TableCell>{p.categoria || "-"}</TableCell>
                  <TableCell>{p.filial || "-"}</TableCell>
                  <TableCell>{p.parcela_num}</TableCell>
                  <TableCell>{formatDate(p.vencimento)}</TableCell>
                  <TableCell>{formatCurrency(p.valor_parcela_centavos)}</TableCell>
                  <TableCell>{getStatusBadge(p.vencimento, p.pago)}</TableCell>
                  <TableCell className="text-right">
                    {/* ações linha, se precisar (excluir parcela única, etc.) */}
                  </TableCell>
                </TableRow>
              ))}

              {paginatedData.length === 0 && (
                <TableRow>
                  <TableCell colSpan={12} className="text-center text-muted-foreground">
                    Nenhuma parcela encontrada com os filtros atuais.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          {/* Paginação simples */}
          <div className="flex items-center justify-between mt-4">
            <span className="text-sm text-muted-foreground">
              Página {currentPage} de {totalPages || 1}
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              >
                Anterior
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              >
                Próxima
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default ContasPagarSimple;
