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
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import {
  Filter,
  Plus,
  Search,
  Settings2,
  X,
  Trash2,
  Eye,
  ArrowUpDown,
} from "lucide-react";

type ParcelaRow = {
  id: number;              // contas_pagar_parcelas.id
  conta_id: number;
  parcela_num: number;
  valor_parcela_centavos: number;
  vencimento: string;      // ISO date
  pago: boolean;
  fornecedor?: string;
  descricao?: string;
  categoria?: string;
  filial?: string;
  created_at?: string;
  updated_at?: string;
  forma_pagamento_id?: number | null;
};

type Fornecedor = { id: number; nome_fantasia: string | null; razao_social: string | null };
type Categoria = { id: number; nome: string };
type Filial = { id: number; nome: string };
type ContaBancaria = { id: number; banco: string; conta: string };

type SortKey =
  | "id"
  | "conta_id"
  | "fornecedor"
  | "descricao"
  | "categoria"
  | "filial"
  | "parcela_num"
  | "vencimento"
  | "valor_parcela_centavos"
  | "status";

const COLS = [
  { key: "select", label: "", fixed: true },
  { key: "id", label: "ID" },
  { key: "conta_id", label: "Conta" },
  { key: "fornecedor", label: "Fornecedor" },
  { key: "descricao", label: "Descrição" },
  { key: "categoria", label: "Categoria" },
  { key: "filial", label: "Filial" },
  { key: "parcela_num", label: "Parcela" },
  { key: "vencimento", label: "Vencimento" },
  { key: "valor_parcela_centavos", label: "Valor" },
  { key: "status", label: "Status" },
  { key: "acoes", label: "Ações" },
] as const;

const VISIBLE_DEFAULT: Record<string, boolean> = {
  select: true,
  id: true,
  conta_id: true,
  fornecedor: true,
  descricao: true,
  categoria: true,
  filial: true,
  parcela_num: true,
  vencimento: true,
  valor_parcela_centavos: true,
  status: true,
  acoes: true,
};

const LS_COLS_KEY = "cp_simple_columns_v1";

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

  // Ordenação
  const [sortKey, setSortKey] = useState<SortKey>("vencimento");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  // Visibilidade de colunas
  const [visibleCols, setVisibleCols] = useState<Record<string, boolean>>(() => {
    const raw = typeof window !== "undefined" ? localStorage.getItem(LS_COLS_KEY) : null;
    return raw ? JSON.parse(raw) : VISIBLE_DEFAULT;
  });

  useEffect(() => {
    localStorage.setItem(LS_COLS_KEY, JSON.stringify(visibleCols));
  }, [visibleCols]);

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

  // ===== Ordenação / Filtros =====
  const sortBy = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const filteredAndSortedParcelas = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    let data = parcelas.filter((p) => {
      const matchTerm =
        !term ||
        (p.fornecedor || "").toLowerCase().includes(term) ||
        (p.descricao || "").toLowerCase().includes(term) ||
        String(p.id).includes(term) ||
        String(p.conta_id).includes(term);

      const matchFornecedor =
        filterFornecedor === "all" ||
        (p.fornecedor || "").toLowerCase().includes(filterFornecedor.toLowerCase());

      const matchFilial =
        filterFilial === "all" || (p.filial || "").toLowerCase() === filterFilial.toLowerCase();

      const matchCategoria =
        filterCategoria === "all" ||
        (p.categoria || "").toLowerCase() === filterCategoria.toLowerCase();

      const matchStatus =
        filterStatus === "all" ||
        (filterStatus === "pago" && p.pago) ||
        (filterStatus === "aberto" && !p.pago);

      const valor = p.valor_parcela_centavos / 100;
      const matchValorMin = !filterValorMin || valor >= Number(filterValorMin.replace(",", "."));
      const matchValorMax = !filterValorMax || valor <= Number(filterValorMax.replace(",", "."));

      const venc = new Date(p.vencimento).getTime();
      const matchDataIni =
        !filterDataVencimentoInicio || venc >= new Date(filterDataVencimentoInicio).getTime();
      const matchDataFim =
        !filterDataVencimentoFim || venc <= new Date(filterDataVencimentoFim).getTime();

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

    // Ordenação
    const dir = sortDir === "asc" ? 1 : -1;
    data.sort((a, b) => {
      const get = (k: SortKey) => {
        switch (k) {
          case "status":
            return a.pago ? 1 : 0;
          case "vencimento":
            return new Date(a.vencimento).getTime();
          default:
            // @ts-ignore
            return a[k] ?? "";
        }
      };
      const va = get(sortKey);
      const vb = ((): any => {
        switch (sortKey) {
          case "status":
            return b.pago ? 1 : 0;
          case "vencimento":
            return new Date(b.vencimento).getTime();
          default:
            // @ts-ignore
            return b[sortKey] ?? "";
        }
      })();

      if (typeof va === "number" && typeof vb === "number") return (va - vb) * dir;
      return String(va).localeCompare(String(vb)) * dir;
    });

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
    sortKey,
    sortDir,
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

  // Render
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

  const renderTh = (key: SortKey, label: string) => {
    if (!visibleCols[key]) return null;
    const active = sortKey === key;
    return (
      <TableHead
        onClick={() => sortBy(key)}
        className="cursor-pointer select-none"
        title={`Ordenar por ${label}`}
      >
        <div className="inline-flex items-center gap-1">
          {label}
          <ArrowUpDown className={`h-3.5 w-3.5 ${active ? "opacity-100" : "opacity-40"}`} />
        </div>
      </TableHead>
    );
  };

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

            {/* Personalizar colunas (com persistência) */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  <Settings2 className="h-4 w-4 mr-2" />
                  Personalizar Colunas
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="max-h-72 overflow-auto">
                {COLS.filter((c) => !c.fixed).map((col) => (
                  <DropdownMenuCheckboxItem
                    key={col.key}
                    checked={!!visibleCols[col.key]}
                    onCheckedChange={(checked) =>
                      setVisibleCols((prev) => ({ ...prev, [col.key]: !!checked }))
                    }
                  >
                    {col.label}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
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

          {/* Filtros avançados */}
          {showFilters && (
            <div className="mt-4 grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-3">
              <Select value={filterFornecedor} onValueChange={setFilterFornecedor}>
                <SelectTrigger><SelectValue placeholder="Fornecedor" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos fornecedores</SelectItem>
                  {fornecedores.map((f) => (
                    <SelectItem
                      key={f.id}
                      value={(f.nome_fantasia || f.razao_social || `#${f.id}`).toLowerCase()}
                    >
                      {f.nome_fantasia || f.razao_social || `#${f.id}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={filterFilial} onValueChange={setFilterFilial}>
                <SelectTrigger><SelectValue placeholder="Filial" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas filiais</SelectItem>
                  {filiais.map((fi) => (
                    <SelectItem key={fi.id} value={(fi.nome || "").toLowerCase()}>
                      {fi.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={filterCategoria} onValueChange={setFilterCategoria}>
                <SelectTrigger><SelectValue placeholder="Categoria" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas categorias</SelectItem>
                  {categorias.map((c) => (
                    <SelectItem key={c.id} value={(c.nome || "").toLowerCase()}>
                      {c.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos status</SelectItem>
                  <SelectItem value="aberto">Em aberto</SelectItem>
                  <SelectItem value="pago">Pago</SelectItem>
                </SelectContent>
              </Select>

              <Input
                placeholder="Valor mín (R$)"
                inputMode="decimal"
                value={filterValorMin}
                onChange={(e) => setFilterValorMin(e.target.value)}
              />
              <Input
                placeholder="Valor máx (R$)"
                inputMode="decimal"
                value={filterValorMax}
                onChange={(e) => setFilterValorMax(e.target.value)}
              />
              <Input
                type="date"
                placeholder="Vencimento de"
                value={filterDataVencimentoInicio || ""}
                onChange={(e) => setFilterDataVencimentoInicio(e.target.value || null)}
              />
              <Input
                type="date"
                placeholder="Vencimento até"
                value={filterDataVencimentoFim || ""}
                onChange={(e) => setFilterDataVencimentoFim(e.target.value || null)}
              />
            </div>
          )}
        </CardHeader>

        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                {visibleCols.select && <TableHead style={{ width: 44 }}></TableHead>}
                {renderTh("id", "ID")}
                {renderTh("conta_id", "Conta")}
                {visibleCols.fornecedor && (
                  <TableHead onClick={() => sortBy("fornecedor")} className="cursor-pointer select-none" title="Ordenar por Fornecedor">
                    <div className="inline-flex items-center gap-1">
                      Fornecedor
                      <ArrowUpDown className={`h-3.5 w-3.5 ${sortKey === "fornecedor" ? "opacity-100" : "opacity-40"}`} />
                    </div>
                  </TableHead>
                )}
                {visibleCols.descricao && (
                  <TableHead onClick={() => sortBy("descricao")} className="cursor-pointer select-none" title="Ordenar por Descrição">
                    <div className="inline-flex items-center gap-1">
                      Descrição
                      <ArrowUpDown className={`h-3.5 w-3.5 ${sortKey === "descricao" ? "opacity-100" : "opacity-40"}`} />
                    </div>
                  </TableHead>
                )}
                {visibleCols.categoria && (
                  <TableHead onClick={() => sortBy("categoria")} className="cursor-pointer select-none" title="Ordenar por Categoria">
                    <div className="inline-flex items-center gap-1">
                      Categoria
                      <ArrowUpDown className={`h-3.5 w-3.5 ${sortKey === "categoria" ? "opacity-100" : "opacity-40"}`} />
                    </div>
                  </TableHead>
                )}
                {visibleCols.filial && (
                  <TableHead onClick={() => sortBy("filial")} className="cursor-pointer select-none" title="Ordenar por Filial">
                    <div className="inline-flex items-center gap-1">
                      Filial
                      <ArrowUpDown className={`h-3.5 w-3.5 ${sortKey === "filial" ? "opacity-100" : "opacity-40"}`} />
                    </div>
                  </TableHead>
                )}
                {renderTh("parcela_num", "Parcela")}
                {renderTh("vencimento", "Vencimento")}
                {renderTh("valor_parcela_centavos", "Valor")}
                {renderTh("status", "Status")}
                {visibleCols.acoes && <TableHead className="text-right">Ações</TableHead>}
              </TableRow>
            </TableHeader>

            <TableBody>
              {paginatedData.map((p) => (
                <TableRow key={p.id}>
                  {visibleCols.select && (
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
                  )}

                  {visibleCols.id && <TableCell>{p.id}</TableCell>}
                  {visibleCols.conta_id && <TableCell>{p.conta_id}</TableCell>}
                  {visibleCols.fornecedor && <TableCell>{p.fornecedor || "-"}</TableCell>}
                  {visibleCols.descricao && (
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
                  )}
                  {visibleCols.categoria && <TableCell>{p.categoria || "-"}</TableCell>}
                  {visibleCols.filial && <TableCell>{p.filial || "-"}</TableCell>}
                  {visibleCols.parcela_num && <TableCell>{p.parcela_num}</TableCell>}
                  {visibleCols.vencimento && <TableCell>{formatDate(p.vencimento)}</TableCell>}
                  {visibleCols.valor_parcela_centavos && (
                    <TableCell>{formatCurrency(p.valor_parcela_centavos)}</TableCell>
                  )}
                  {visibleCols.status && (
                    <TableCell>{getStatusBadge(p.vencimento, p.pago)}</TableCell>
                  )}

                  {visibleCols.acoes && (
                    <TableCell className="text-right">
                      {/* ações por linha, se quiser incluir exclusão unitária futuramente */}
                    </TableCell>
                  )}
                </TableRow>
              ))}

              {paginatedData.length === 0 && (
                <TableRow>
                  <TableCell colSpan={COLS.filter(c => visibleCols[c.key] || c.fixed).length} className="text-center text-muted-foreground">
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
