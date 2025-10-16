import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { EditarParcelaModal } from '@/components/financeiro/EditarParcelaModal';
import { CurrencyInput } from '@/components/ui/currency-input';
import {
  Search, Filter, Edit, Check, Trash2, Settings2, CalendarIcon,
  ArrowUpDown, X, Plus, RotateCcw, Edit2
} from 'lucide-react';
import { format } from 'date-fns';

interface ParcelaCompleta {
  id: number;
  conta_id: number;
  numero_parcela: number;
  num_parcelas: number;
  valor_parcela_centavos: number;
  vencimento: string;
  pago: boolean;
  descricao: string;
  fornecedor: string;
  fornecedor_id: number;
  categoria: string;
  categoria_id: number | null;
  filial: string;
  filial_id: number | null;
  numero_nota: string;
  forma_pagamento_id: number | null;
  conta_bancaria_id: number | null;
}

interface Fornecedor { id: number; nome_fantasia: string; razao_social: string; }
interface Categoria { id: number; nome: string; }
interface Filial { id: number; nome: string; }
interface ContaBancaria { id: number; nome_conta: string; banco: string; }
interface FormaPagamento { id: number; nome: string; }

export function ContasPagarSimple() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [parcelas, setParcelas] = useState<ParcelaCompleta[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedParcelas, setSelectedParcelas] = useState<number[]>([]);
  const [lastSelectedIndex, setLastSelectedIndex] = useState<number | null>(null);

  // paginação
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // dados auxiliares
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [filiais, setFiliais] = useState<Filial[]>([]);
  const [contasBancarias, setContasBancarias] = useState<ContaBancaria[]>([]);
  const [formasPagamento, setFormasPagamento] = useState<FormaPagamento[]>([]);

  // filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [filterFornecedor, setFilterFornecedor] = useState<string>('all');
  const [filterFilial, setFilterFilial] = useState<string>('all');
  const [filterCategoria, setFilterCategoria] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterValorMin, setFilterValorMin] = useState('');
  const [filterValorMax, setFilterValorMax] = useState('');
  const [filterDataVencimentoInicio, setFilterDataVencimentoInicio] = useState<Date | null>(null);
  const [filterDataVencimentoFim, setFilterDataVencimentoFim] = useState<Date | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  // modais
  const [showEditMassModal, setShowEditMassModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showColumnsModal, setShowColumnsModal] = useState(false);

  // edição em massa
  const [massEditData, setMassEditData] = useState({
    categoria_id: '',
    filial_id: '',
    forma_pagamento_id: '',
    vencimento: null as Date | null,
    observacao: ''
  });

  // pagamento em lote
  const [paymentData, setPaymentData] = useState<{
    [key: number]: { 
      data_pagamento: Date | null; 
      conta_bancaria_id: string; 
      forma_pagamento_id: string;
      codigo_identificador: string;
      valor_original_centavos: number;
      valor_pago_centavos: number;
    } | undefined
  }>({});
  const [paymentObservacao, setPaymentObservacao] = useState('');
  const [replicarPrimeiro, setReplicarPrimeiro] = useState(false);

  // modal edição individual
  const [editingParcela, setEditingParcela] = useState<ParcelaCompleta | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);

  // visibilidade colunas
  const [visibleColumns, setVisibleColumns] = useState({
    fornecedor: true, descricao: true, numero_nota: true, categoria: true, filial: true,
    valor_parcela: true, parcela: true, vencimento: true, status: true, acoes: true
  });

  // ordenação
  const [sortField, setSortField] = useState<keyof ParcelaCompleta>('vencimento');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  useEffect(() => { fetchAllData(); }, []);
  const fetchAllData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchParcelas(),
        fetchFornecedores(),
        fetchCategorias(),
        fetchFiliais(),
        fetchContasBancarias(),
        fetchFormasPagamento()
      ]);
    } finally { setLoading(false); }
  };

  const fetchParcelas = async () => {
    let allParcelas: any[] = [];
    let from = 0;
    const batchSize = 1000;
    let hasMore = true;

    while (hasMore) {
      const { data: parcelasData, error: parcelasError } = await supabase
        .from('contas_pagar_parcelas')
        .select('*')
        .order('vencimento')
        .range(from, from + batchSize - 1);
      if (parcelasError) throw parcelasError;
      if (parcelasData?.length) { allParcelas = [...allParcelas, ...parcelasData]; from += batchSize; hasMore = parcelasData.length === batchSize; }
      else { hasMore = false; }
    }

    if (!allParcelas.length) { setParcelas([]); return; }

    const contasIds = [...new Set(allParcelas.map(p => p.conta_id))];

    let allContas: any[] = [];
    for (let i = 0; i < contasIds.length; i += 1000) {
      const batch = contasIds.slice(i, i + 1000);
      const { data: contasData, error: contasError } = await supabase.from('contas_pagar').select('*').in('id', batch);
      if (contasError) throw contasError;
      if (contasData) allContas = [...allContas, ...contasData];
    }

    const fornecedorIds = [...new Set(allContas.map(c => c.fornecedor_id).filter(Boolean))];
    const categoriaIds  = [...new Set(allContas.map(c => c.categoria_id).filter(Boolean))];
    const filialIds     = [...new Set(allContas.map(c => c.filial_id).filter(Boolean))];

    let fornecedoresData: any[] = [];
    for (let i = 0; i < fornecedorIds.length; i += 1000) {
      const batch = fornecedorIds.slice(i, i + 1000);
      const { data } = await supabase.from('pessoas_juridicas').select('id, nome_fantasia, razao_social').in('id', batch);
      if (data) fornecedoresData = [...fornecedoresData, ...data];
    }

    let categoriasData: any[] = [];
    for (let i = 0; i < categoriaIds.length; i += 1000) {
      const batch = categoriaIds.slice(i, i + 1000);
      const { data } = await supabase.from('categorias_financeiras').select('id, nome').in('id', batch);
      if (data) categoriasData = [...categoriasData, ...data];
    }

    let filiaisData: any[] = [];
    for (let i = 0; i < filialIds.length; i += 1000) {
      const batch = filialIds.slice(i, i + 1000);
      const { data } = await supabase.from('filiais').select('id, nome').in('id', batch);
      if (data) filiaisData = [...filiaisData, ...data];
    }

    const parcelasCompletas = allParcelas.map(parcela => {
      const conta = allContas.find(c => c.id === parcela.conta_id);
      const fornecedor = fornecedoresData.find((f: any) => f.id === conta?.fornecedor_id);
      const categoria = categoriasData.find((c: any) => c.id === conta?.categoria_id);
      const filial = filiaisData.find((f: any) => f.id === conta?.filial_id);
      return {
        id: parcela.id,
        conta_id: parcela.conta_id,
        numero_parcela: parcela.numero_parcela || parcela.parcela_num || 1,
        num_parcelas: conta?.num_parcelas || conta?.qtd_parcelas || 1,
        valor_parcela_centavos: parcela.valor_parcela_centavos,
        vencimento: parcela.vencimento,
        pago: parcela.pago,
        descricao: conta?.descricao || 'N/A',
        fornecedor: fornecedor?.nome_fantasia || fornecedor?.razao_social || 'N/A',
        fornecedor_id: conta?.fornecedor_id || 0,
        categoria: categoria?.nome || 'N/A',
        categoria_id: conta?.categoria_id || null,
        filial: filial?.nome || 'N/A',
        filial_id: conta?.filial_id || null,
        numero_nota: conta?.numero_nota || conta?.numero_nf || 'N/A',
        forma_pagamento_id: parcela.forma_pagamento_id || null,
        conta_bancaria_id: parcela.conta_bancaria_id || null
      };
    });

    setParcelas(parcelasCompletas);
  };

  const fetchFornecedores = async () => {
    const { data } = await supabase.from('pessoas_juridicas').select('id, nome_fantasia, razao_social');
    setFornecedores(data || []);
  };
  const fetchCategorias = async () => {
    const { data } = await supabase.from('categorias_financeiras').select('id, nome');
    setCategorias(data || []);
  };
  const fetchFiliais = async () => {
    const { data } = await supabase.from('filiais').select('id, nome');
    setFiliais(data || []);
  };
  const fetchContasBancarias = async () => {
    const { data } = await supabase.from('contas_bancarias').select('id, nome_conta, banco');
    setContasBancarias(data || []);
  };
  const fetchFormasPagamento = async () => {
    const { data } = await supabase.from('formas_pagamento').select('id, nome');
    setFormasPagamento(data || []);
  };

  // filtros + ordenação
  const filteredAndSortedParcelas = React.useMemo(() => {
    let filtered = parcelas.filter(p => {
      if (searchTerm &&
          !p.fornecedor.toLowerCase().includes(searchTerm.toLowerCase()) &&
          !p.descricao.toLowerCase().includes(searchTerm.toLowerCase()) &&
          !p.numero_nota.toLowerCase().includes(searchTerm.toLowerCase())) return false;
      if (filterFornecedor !== 'all' && p.fornecedor_id !== parseInt(filterFornecedor)) return false;
      if (filterFilial !== 'all' && p.filial_id !== parseInt(filterFilial)) return false;
      if (filterCategoria !== 'all' && p.categoria_id !== parseInt(filterCategoria)) return false;

      if (filterStatus !== 'all') {
        const hoje = new Date(); hoje.setHours(0,0,0,0);
        const dataVencimento = new Date(p.vencimento); dataVencimento.setHours(0,0,0,0);
        if (filterStatus === 'pago' && !p.pago) return false;
        if (filterStatus === 'pendente' && p.pago) return false;
        if (filterStatus === 'vencido' && (p.pago || dataVencimento >= hoje)) return false;
        if (filterStatus === 'a_vencer' && (p.pago || dataVencimento < hoje)) return false;
      }

      if (filterValorMin && p.valor_parcela_centavos < parseFloat(filterValorMin) * 100) return false;
      if (filterValorMax && p.valor_parcela_centavos > parseFloat(filterValorMax) * 100) return false;

      if (filterDataVencimentoInicio) {
        const dataVenc = new Date(p.vencimento);
        if (dataVenc < filterDataVencimentoInicio) return false;
      }
      if (filterDataVencimentoFim) {
        const dataVenc = new Date(p.vencimento);
        if (dataVenc > filterDataVencimentoFim) return false;
      }
      return true;
    });

    filtered.sort((a, b) => {
      const aVal = a[sortField] as any;
      const bVal = b[sortField] as any;
      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [
    parcelas, searchTerm, filterFornecedor, filterFilial, filterCategoria,
    filterStatus, filterValorMin, filterValorMax,
    filterDataVencimentoInicio, filterDataVencimentoFim, sortField, sortDirection
  ]);

  const handleSort = (field: keyof ParcelaCompleta) => {
    if (sortField === field) setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDirection('asc'); }
  };

  // seleção
  const paginatedData = React.useMemo(() => {
    const totalItems = filteredAndSortedParcelas.length;
    const totalPages = Math.ceil(totalItems / pageSize);
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return filteredAndSortedParcelas.slice(startIndex, endIndex);
  }, [filteredAndSortedParcelas, currentPage, pageSize]);

  const totalItems = filteredAndSortedParcelas.length;
  const totalPages = Math.ceil(totalItems / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;

  useEffect(() => { setCurrentPage(1); }, [
    searchTerm, filterFornecedor, filterFilial, filterCategoria, filterStatus,
    filterValorMin, filterValorMax, filterDataVencimentoInicio, filterDataVencimentoFim
  ]);

  const toggleSelectAll = () => {
    if (selectedParcelas.length === paginatedData.length) setSelectedParcelas([]);
    else setSelectedParcelas(paginatedData.map(p => p.id));
    setLastSelectedIndex(null);
  };

  const toggleSelectParcela = (id: number, index: number, event: React.MouseEvent) => {
    if (event.shiftKey && lastSelectedIndex !== null) {
      const start = Math.min(lastSelectedIndex, index);
      const end = Math.max(lastSelectedIndex, index);
      const rangeIds = paginatedData.slice(start, end + 1).map(p => p.id);
      setSelectedParcelas(prev => Array.from(new Set([...prev, ...rangeIds])));
    } else {
      setSelectedParcelas(prev => prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]);
      setLastSelectedIndex(index);
    }
  };

  // ==== NOVO: Excluir Selecionados (em massa) ====
  const handleBulkDelete = async () => {
    if (!selectedParcelas.length) {
      toast({ title: 'Selecione ao menos 1 parcela', variant: 'destructive' });
      return;
    }
    const msg = selectedParcelas.length === 1 ? 'Excluir esta parcela?' : `Excluir ${selectedParcelas.length} parcelas?`;
    if (!confirm(msg)) return;

    try {
      const { error } = await supabase
        .from('contas_pagar_parcelas')
        .delete()
        .in('id', selectedParcelas);
      if (error) throw error;

      toast({ title: `${selectedParcelas.length} parcela(s) excluída(s)` });
      setSelectedParcelas([]);
      fetchParcelas();
    } catch (error: any) {
      toast({ title: 'Erro ao excluir', description: error?.message || '', variant: 'destructive' });
    }
  };

  const handleMassEdit = async () => {
    try {
      const updates: any = {};
      if (massEditData.categoria_id) updates.categoria_id = parseInt(massEditData.categoria_id);
      if (massEditData.filial_id) updates.filial_id = parseInt(massEditData.filial_id);
      if (massEditData.forma_pagamento_id) updates.forma_pagamento_id = parseInt(massEditData.forma_pagamento_id);
      if (massEditData.vencimento) updates.vencimento = format(massEditData.vencimento, 'yyyy-MM-dd');
      if (massEditData.observacao) updates.observacao = massEditData.observacao;

      const contasIds = [...new Set(filteredAndSortedParcelas.filter(p => selectedParcelas.includes(p.id)).map(p => p.conta_id))];
      if (updates.categoria_id || updates.filial_id) {
        const contaUpdates: any = {};
        if (updates.categoria_id) contaUpdates.categoria_id = updates.categoria_id;
        if (updates.filial_id) contaUpdates.filial_id = updates.filial_id;
        await supabase.from('contas_pagar').update(contaUpdates).in('id', contasIds);
      }

      const parcelaUpdates: any = {};
      if (updates.vencimento) parcelaUpdates.vencimento = updates.vencimento;
      if (updates.forma_pagamento_id) parcelaUpdates.forma_pagamento_id = updates.forma_pagamento_id;
      if (updates.observacao) parcelaUpdates.observacao = updates.observacao;

      if (Object.keys(parcelaUpdates).length) {
        await supabase.from('contas_pagar_parcelas').update(parcelaUpdates).in('id', selectedParcelas);
      }

      toast({ title: `${selectedParcelas.length} parcela(s) atualizada(s)` });
      setShowEditMassModal(false);
      setSelectedParcelas([]);
      setMassEditData({ categoria_id: '', filial_id: '', forma_pagamento_id: '', vencimento: null, observacao: '' });
      fetchParcelas();
    } catch (error) {
      toast({ title: 'Erro ao atualizar parcelas', variant: 'destructive' });
    }
  };

  const handleMassPayment = async () => {
    try {
      const selecionadas = filteredAndSortedParcelas.filter(p => selectedParcelas.includes(p.id));
      if (!selecionadas.length) {
        toast({ title: 'Nenhuma parcela selecionada', variant: 'destructive' });
        return;
      }
      const primeira = selecionadas[0];
      const dadosPrimeiro = replicarPrimeiro ? paymentData[primeira.id] : null;

      for (const parcela of selecionadas) {
        const payment = replicarPrimeiro && dadosPrimeiro ? dadosPrimeiro : paymentData[parcela.id];
        if (!payment?.data_pagamento) {
          toast({ title: 'Data de pagamento obrigatória', description: `Preencha a data de ${parcela.fornecedor}`, variant: 'destructive' });
          return;
        }
        if (!payment?.forma_pagamento_id) {
          toast({ title: 'Forma de pagamento obrigatória', description: `Selecione a forma de pagamento para ${parcela.fornecedor}`, variant: 'destructive' });
          return;
        }
        await supabase.rpc('pagar_parcela', {
          parcela_id: parcela.id,
          conta_bancaria_id: payment?.conta_bancaria_id ? parseInt(payment.conta_bancaria_id) : null,
          forma_pagamento_id: parseInt(payment.forma_pagamento_id),
          valor_pago_centavos: payment?.valor_pago_centavos || parcela.valor_parcela_centavos,
          observacao_param: paymentObservacao
        });
      }
      toast({ title: `${selectedParcelas.length} parcela(s) paga(s)` });
      setShowPaymentModal(false);
      setSelectedParcelas([]);
      setPaymentData({});
      setPaymentObservacao('');
      setReplicarPrimeiro(false);
      fetchParcelas();
    } catch (error: any) {
      toast({ title: 'Erro ao processar pagamento', description: error?.message || 'Erro desconhecido', variant: 'destructive' });
    }
  };

  // ==== NOVO: Desfazer Pago (em massa) ====
  const handleBulkUnmarkPaid = async () => {
    if (!selectedParcelas.length) {
      toast({ title: 'Selecione ao menos 1 parcela', variant: 'destructive' });
      return;
    }
    if (!confirm('Remover o status de pago das parcelas selecionadas?')) return;
    try {
      const { error } = await supabase
        .from('contas_pagar_parcelas')
        .update({ pago: false, data_pagamento: null })
        .in('id', selectedParcelas);
      if (error) throw error;
      toast({ title: `${selectedParcelas.length} parcela(s) marcadas como NÃO pagas` });
      setSelectedParcelas([]);
      fetchParcelas();
    } catch (error: any) {
      toast({ title: 'Erro ao desfazer pago', description: error?.message || '', variant: 'destructive' });
    }
  };

  const formatCurrency = (centavos: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(centavos / 100);
  const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString('pt-BR');
  const getStatusBadge = (vencimento: string, pago: boolean) => {
    if (pago) return <Badge className="bg-green-500">Pago</Badge>;
    const hoje = new Date(); const dv = new Date(vencimento);
    if (dv < hoje) return <Badge variant="destructive">Vencido</Badge>;
    if (dv <= new Date(hoje.getTime() + 7 * 24 * 60 * 60 * 1000)) return <Badge variant="outline">Vence em 7 dias</Badge>;
    return <Badge variant="default">Pendente</Badge>;
  };

  const clearFilters = () => {
    setSearchTerm(''); setFilterFornecedor('all'); setFilterFilial('all'); setFilterCategoria('all'); setFilterStatus('all');
    setFilterValorMin(''); setFilterValorMax(''); setFilterDataVencimentoInicio(null); setFilterDataVencimentoFim(null);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div><h1 className="text-3xl font-bold tracking-tight">Contas a Pagar</h1><p className="text-muted-foreground">Carregando...</p></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Contas a Pagar</h1>
          <p className="text-muted-foreground">Total: {parcelas.length} parcela(s) | Exibindo: {filteredAndSortedParcelas.length}</p>
        </div>
        <Button onClick={() => navigate('/financeiro/contas-pagar/nova')}>
          <Plus className="h-4 w-4 mr-2" />
          Nova Conta a Pagar
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex-1 flex items-center gap-4">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Buscar por fornecedor, descrição ou ID..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
              </div>
              <Button variant="outline" onClick={() => setShowFilters(!showFilters)}>
                <Filter className="h-4 w-4 mr-2" />
                Filtros {[
                  filterFornecedor !== 'all', filterFilial !== 'all', filterCategoria !== 'all', filterStatus !== 'all',
                  filterValorMin, filterValorMax, filterDataVencimentoInicio, filterDataVencimentoFim
                ].filter(Boolean).length > 0 && `(${
                  [filterFornecedor !== 'all', filterFilial !== 'all', filterCategoria !== 'all', filterStatus !== 'all',
                   filterValorMin, filterValorMax, filterDataVencimentoInicio, filterDataVencimentoFim].filter(Boolean).length
                })`}
              </Button>
              {(
                filterFornecedor !== 'all' || filterFilial !== 'all' || filterCategoria !== 'all' || filterStatus !== 'all' ||
                filterValorMin || filterValorMax || filterDataVencimentoInicio || filterDataVencimentoFim
              ) && (
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  <X className="h-4 w-4 mr-2" />
                  Limpar Filtros
                </Button>
              )}
            </div>
            <Button variant="outline" onClick={() => setShowColumnsModal(true)}>
              <Settings2 className="h-4 w-4 mr-2" />
              Personalizar Colunas
            </Button>
          </div>

          {showFilters && (
            <div className="grid grid-cols-3 gap-4 mt-4 p-4 border rounded-lg bg-muted/50">
              <div>
                <Label>Fornecedor</Label>
                <Select value={filterFornecedor} onValueChange={setFilterFornecedor}>
                  <SelectTrigger><SelectValue placeholder="Todos os fornecedores" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os fornecedores</SelectItem>
                    {fornecedores.map(f => (
                      <SelectItem key={f.id} value={f.id.toString()}>
                        {f.nome_fantasia || f.razao_social}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Filial</Label>
                <Select value={filterFilial} onValueChange={setFilterFilial}>
                  <SelectTrigger><SelectValue placeholder="Todas as filiais" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as filiais</SelectItem>
                    {filiais.map(f => (<SelectItem key={f.id} value={f.id.toString()}>{f.nome}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Categoria</Label>
                <Select value={filterCategoria} onValueChange={setFilterCategoria}>
                  <SelectTrigger><SelectValue placeholder="Todas as categorias" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as categorias</SelectItem>
                    {categorias.map(c => (<SelectItem key={c.id} value={c.id.toString()}>{c.nome}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Status</Label>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    <SelectItem value="a_vencer">A Vencer</SelectItem>
                    <SelectItem value="vencido">Vencidas</SelectItem>
                    <SelectItem value="pago">Pagas</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Valor Mínimo</Label>
                <Input type="number" placeholder="0,00" value={filterValorMin} onChange={(e) => setFilterValorMin(e.target.value)} />
              </div>
              <div>
                <Label>Valor Máximo</Label>
                <Input type="number" placeholder="999999,99" value={filterValorMax} onChange={(e) => setFilterValorMax(e.target.value)} />
              </div>
              <div>
                <Label>Data Vencimento - De</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {filterDataVencimentoInicio ? format(filterDataVencimentoInicio, 'dd/MM/yyyy') : 'Data inicial'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 bg-background z-50">
                    <Calendar mode="single" selected={filterDataVencimentoInicio || undefined} onSelect={(date) => setFilterDataVencimentoInicio(date || null)} className="pointer-events-auto" />
                  </PopoverContent>
                </Popover>
              </div>
              <div>
                <Label>Data Vencimento - Até</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {filterDataVencimentoFim ? format(filterDataVencimentoFim, 'dd/MM/yyyy') : 'Data final'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 bg-background z-50">
                    <Calendar mode="single" selected={filterDataVencimentoFim || undefined} onSelect={(date) => setFilterDataVencimentoFim(date || null)} className="pointer-events-auto" />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          )}
        </CardHeader>

        <CardContent>
          {selectedParcelas.length > 0 && (
            <div className="flex items-center gap-2 mb-4 p-3 bg-muted rounded-lg">
              <span className="text-sm font-medium">{selectedParcelas.length} itens selecionados</span>
              <div className="flex-1" />
              <Button size="sm" variant="outline" onClick={() => setShowEditMassModal(true)}>
                <Edit className="h-4 w-4 mr-2" />
                Editar em Massa ({selectedParcelas.length})
              </Button>
              <Button size="sm" onClick={() => setShowPaymentModal(true)}>
                <Check className="h-4 w-4 mr-2" />
                Marcar como Pago
              </Button>
              <Button size="sm" variant="outline" onClick={handleBulkUnmarkPaid}>
                <RotateCcw className="h-4 w-4 mr-2" />
                Desfazer Pago
              </Button>
              <Button size="sm" variant="destructive" onClick={handleBulkDelete}>
                <Trash2 className="h-4 w-4 mr-2" />
                Excluir Selecionados
              </Button>
            </div>
          )}

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={paginatedData.length > 0 && paginatedData.every(p => selectedParcelas.includes(p.id))}
                      onCheckedChange={toggleSelectAll}
                    />
                  </TableHead>
                  {visibleColumns.fornecedor && (
                    <TableHead onClick={() => handleSort('fornecedor')} className="cursor-pointer">
                      Fornecedor <ArrowUpDown className="inline h-4 w-4" />
                    </TableHead>
                  )}
                  {visibleColumns.descricao && (
                    <TableHead onClick={() => handleSort('descricao')} className="cursor-pointer">
                      Descrição <ArrowUpDown className="inline h-4 w-4" />
                    </TableHead>
                  )}
                  {visibleColumns.numero_nota && <TableHead>Nº Nota Fiscal</TableHead>}
                  {visibleColumns.categoria && <TableHead>Categoria</TableHead>}
                  {visibleColumns.filial && <TableHead>Filial</TableHead>}
                  {visibleColumns.valor_parcela && (
                    <TableHead onClick={() => handleSort('valor_parcela_centavos')} className="cursor-pointer">
                      Valor <ArrowUpDown className="inline h-4 w-4" />
                    </TableHead>
                  )}
                  {visibleColumns.parcela && <TableHead>Parcela</TableHead>}
                  {visibleColumns.vencimento && (
                    <TableHead onClick={() => handleSort('vencimento')} className="cursor-pointer">
                      Vencimento <ArrowUpDown className="inline h-4 w-4" />
                    </TableHead>
                  )}
                  {visibleColumns.status && <TableHead>Status</TableHead>}
                  {visibleColumns.acoes && <TableHead className="w-24">Ações</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center text-muted-foreground py-8">
                      Nenhuma parcela encontrada
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedData.map((parcela, index) => (
                    <TableRow key={parcela.id} className="cursor-pointer hover:bg-muted/50">
                      <TableCell>
                        <Checkbox
                          checked={selectedParcelas.includes(parcela.id)}
                          onClick={(e: React.MouseEvent) => toggleSelectParcela(parcela.id, index, e)}
                        />
                      </TableCell>
                      {visibleColumns.fornecedor && (
                        <TableCell
                          className="font-medium cursor-pointer hover:underline"
                          onClick={() => navigate(`/financeiro/fornecedor/${parcela.fornecedor_id}`)}
                        >
                          {parcela.fornecedor}
                        </TableCell>
                      )}
                      {visibleColumns.descricao && (
                        <TableCell
                          className="cursor-pointer hover:underline"
                          onClick={() => navigate(`/financeiro/conta/${parcela.conta_id}`)}
                        >
                          {parcela.descricao}
                        </TableCell>
                      )}
                      {visibleColumns.numero_nota && (
                        <TableCell
                          className="cursor-pointer hover:underline"
                          onClick={() => navigate(`/financeiro/conta/${parcela.conta_id}`)}
                        >
                          {parcela.numero_nota}
                        </TableCell>
                      )}
                      {visibleColumns.categoria && <TableCell>{parcela.categoria}</TableCell>}
                      {visibleColumns.filial && <TableCell>{parcela.filial}</TableCell>}
                      {visibleColumns.valor_parcela && <TableCell>{formatCurrency(parcela.valor_parcela_centavos)}</TableCell>}
                      {visibleColumns.parcela && (
                        <TableCell>
                          <Badge variant="outline">{parcela.numero_parcela}/{parcela.num_parcelas}</Badge>
                        </TableCell>
                      )}
                      {visibleColumns.vencimento && <TableCell>{formatDate(parcela.vencimento)}</TableCell>}
                      {visibleColumns.status && <TableCell>{getStatusBadge(parcela.vencimento, parcela.pago)}</TableCell>}
                      {visibleColumns.acoes && (
                        <TableCell>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingParcela(parcela as any);
                              setShowEditModal(true);
                            }}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          <div className="flex items-center justify-between px-2 py-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                Mostrando {startIndex + 1} a {Math.min(endIndex, totalItems)} de {totalItems} parcelas
              </span>
              <Select value={pageSize.toString()} onValueChange={(v) => { setPageSize(Number(v)); setCurrentPage(1); }}>
                <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10 linhas</SelectItem>
                  <SelectItem value="20">20 linhas</SelectItem>
                  <SelectItem value="50">50 linhas</SelectItem>
                  <SelectItem value="100">100 linhas</SelectItem>
                  <SelectItem value="200">200 linhas</SelectItem>
                  <SelectItem value="500">500 linhas</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setCurrentPage(1)} disabled={currentPage === 1}>Primeira</Button>
              <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>Anterior</Button>
              <span className="text-sm">Página {currentPage} de {totalPages}</span>
              <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>Próxima</Button>
              <Button variant="outline" size="sm" onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages}>Última</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Modal Edição em Massa */}
      <Dialog open={showEditMassModal} onOpenChange={setShowEditMassModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edição em Massa</DialogTitle>
            <CardDescription>{selectedParcelas.length} parcela(s) selecionada(s). Apenas os campos preenchidos serão atualizados.</CardDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Categoria</Label>
              <Select value={massEditData.categoria_id} onValueChange={(v) => setMassEditData({ ...massEditData, categoria_id: v })}>
                <SelectTrigger><SelectValue placeholder="Selecionar categoria" /></SelectTrigger>
                <SelectContent>{categorias.map(c => (<SelectItem key={c.id} value={c.id.toString()}>{c.nome}</SelectItem>))}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Filial</Label>
              <Select value={massEditData.filial_id} onValueChange={(v) => setMassEditData({ ...massEditData, filial_id: v })}>
                <SelectTrigger><SelectValue placeholder="Selecionar filial" /></SelectTrigger>
                <SelectContent>{filiais.map(f => (<SelectItem key={f.id} value={f.id.toString()}>{f.nome}</SelectItem>))}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Forma de Pagamento</Label>
              <Select value={massEditData.forma_pagamento_id} onValueChange={(v) => setMassEditData({ ...massEditData, forma_pagamento_id: v })}>
                <SelectTrigger><SelectValue placeholder="Selecionar forma de pagamento" /></SelectTrigger>
                <SelectContent>{formasPagamento.map(f => (<SelectItem key={f.id} value={f.id.toString()}>{f.nome}</SelectItem>))}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Nova Data de Vencimento</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {massEditData.vencimento ? format(massEditData.vencimento, 'dd/MM/yyyy') : 'Selecionar data'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar mode="single" selected={massEditData.vencimento || undefined} onSelect={(date) => setMassEditData({ ...massEditData, vencimento: date || null })} className="pointer-events-auto" />
                </PopoverContent>
              </Popover>
            </div>
            <div className="col-span-2">
              <Label>Observações</Label>
              <Textarea placeholder="Observações adicionais" value={massEditData.observacao} onChange={(e) => setMassEditData({ ...massEditData, observacao: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowEditMassModal(false);
              setMassEditData({ categoria_id: '', filial_id: '', forma_pagamento_id: '', vencimento: null, observacao: '' });
            }}>Cancelar</Button>
            <Button onClick={handleMassEdit}>Atualizar {selectedParcelas.length} Parcela(s)</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Pagamento em Lote */}
      <Dialog open={showPaymentModal} onOpenChange={setShowPaymentModal}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Pagamento em Lote</DialogTitle>
            <CardDescription>{selectedParcelas.length} conta(s) selecionada(s) para pagamento</CardDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center space-x-2 p-3 bg-muted rounded-lg">
              <Checkbox id="replicar-primeiro" checked={replicarPrimeiro} onCheckedChange={(checked) => setReplicarPrimeiro(!!checked)} />
              <Label htmlFor="replicar-primeiro" className="cursor-pointer">Replicar dados do primeiro pagamento para todos</Label>
            </div>
            {filteredAndSortedParcelas.filter(p => selectedParcelas.includes(p.id)).map(parcela => (
              <Card key={parcela.id}>
                <CardHeader>
                  <CardTitle className="text-base">{parcela.fornecedor}</CardTitle>
                  <CardDescription>Parcela {parcela.numero_parcela} - Venc: {formatDate(parcela.vencimento)}</CardDescription>
                  <CardDescription>NFe {parcela.numero_nota} - Parcela {parcela.numero_parcela}</CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-4 gap-4">
                  <div>
                    <Label>Data de Pagamento</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-start">
                          <CalendarIcon className="mr-2 h-4 w-4" />

                          {paymentData[parcela.id]?.data_pagamento ? format(paymentData[parcela.id].data_pagamento as Date, 'dd/MM/yyyy') : 'Selecionar'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0 bg-background z-50">
                        <Calendar
                          mode="single"
                          selected={paymentData[parcela.id]?.data_pagamento || undefined}
                          onSelect={(date) => setPaymentData({
                            ...paymentData,
                            [parcela.id]: {
                              data_pagamento: date || null,
                              conta_bancaria_id: paymentData[parcela.id]?.conta_bancaria_id || '',
                              forma_pagamento_id: paymentData[parcela.id]?.forma_pagamento_id || '',
                              codigo_identificador: paymentData[parcela.id]?.codigo_identificador || '',
                              valor_original_centavos: paymentData[parcela.id]?.valor_original_centavos || parcela.valor_parcela_centavos,
                              valor_pago_centavos: paymentData[parcela.id]?.valor_pago_centavos || parcela.valor_parcela_centavos
                            }
                          })}
                          className="pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div>
                    <Label>Banco Pagador</Label>
                      <Select
                        value={paymentData[parcela.id]?.conta_bancaria_id ? paymentData[parcela.id]!.conta_bancaria_id : 'none'}
                        onValueChange={(v) => setPaymentData({
                          ...paymentData,
                          [parcela.id]: {
                            data_pagamento: paymentData[parcela.id]?.data_pagamento || null,
                            conta_bancaria_id: v === 'none' ? '' : v,
                            forma_pagamento_id: paymentData[parcela.id]?.forma_pagamento_id || '',
                            codigo_identificador: paymentData[parcela.id]?.codigo_identificador || '',
                            valor_original_centavos: paymentData[parcela.id]?.valor_original_centavos || parcela.valor_parcela_centavos,
                            valor_pago_centavos: paymentData[parcela.id]?.valor_pago_centavos || parcela.valor_parcela_centavos
                          }
                        })}
                      >
                        <SelectTrigger><SelectValue placeholder="Banco" /></SelectTrigger>
                        <SelectContent className="bg-background z-50">
                          <SelectItem value="none">Nenhum</SelectItem>
                          {contasBancarias
                            .filter((c) => c.id != null)
                            .map((c) => (
                              <SelectItem key={c.id} value={c.id.toString()}>
                                {c.nome_conta}
                                {c.banco ? ` - ${c.banco}` : ''}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                  </div>
                  <div>
                    <Label>Forma de Pagamento</Label>
                      <Select
                        value={paymentData[parcela.id]?.forma_pagamento_id ? paymentData[parcela.id]!.forma_pagamento_id : 'none'}
                        onValueChange={(v) => setPaymentData({
                          ...paymentData,
                          [parcela.id]: {
                            data_pagamento: paymentData[parcela.id]?.data_pagamento || null,
                            conta_bancaria_id: paymentData[parcela.id]?.conta_bancaria_id || '',
                            forma_pagamento_id: v === 'none' ? '' : v,
                            codigo_identificador: paymentData[parcela.id]?.codigo_identificador || '',
                            valor_original_centavos: paymentData[parcela.id]?.valor_original_centavos || parcela.valor_parcela_centavos,
                            valor_pago_centavos: paymentData[parcela.id]?.valor_pago_centavos || parcela.valor_parcela_centavos
                          }
                        })}
                      >
                        <SelectTrigger><SelectValue placeholder="Forma" /></SelectTrigger>
                        <SelectContent className="bg-background z-50">
                          <SelectItem value="none">Nenhuma</SelectItem>
                          {formasPagamento
                            .filter((f) => f.id != null)
                            .map((f) => (
                              <SelectItem key={f.id} value={f.id.toString()}>
                                {f.nome}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                  </div>
                  <div>
                    <Label>Código Identificador</Label>
                    <Input
                      placeholder="Ex: TED123"
                      value={paymentData[parcela.id]?.codigo_identificador || ''}
                      onChange={(e) => setPaymentData({
                        ...paymentData,
                        [parcela.id]: {
                          data_pagamento: paymentData[parcela.id]?.data_pagamento || null,
                          conta_bancaria_id: paymentData[parcela.id]?.conta_bancaria_id || '',
                          forma_pagamento_id: paymentData[parcela.id]?.forma_pagamento_id || '',
                          codigo_identificador: e.target.value,
                          valor_original_centavos: paymentData[parcela.id]?.valor_original_centavos || parcela.valor_parcela_centavos,
                          valor_pago_centavos: paymentData[parcela.id]?.valor_pago_centavos || parcela.valor_parcela_centavos
                        }
                      })}
                    />
                  </div>
                  <div className="col-span-2">
                    <Label>Valor Original</Label>
                    <Input
                      type="text"
                      value={formatCurrency(paymentData[parcela.id]?.valor_original_centavos || parcela.valor_parcela_centavos)}
                      disabled
                      className="bg-muted"
                    />
                  </div>
                  <div className="col-span-2">
                    <Label>Valor Pago (editável)</Label>
                    <CurrencyInput
                      value={paymentData[parcela.id]?.valor_pago_centavos || parcela.valor_parcela_centavos}
                      onValueChange={(valorCentavos) => setPaymentData({
                        ...paymentData,
                        [parcela.id]: {
                          data_pagamento: paymentData[parcela.id]?.data_pagamento || null,
                          conta_bancaria_id: paymentData[parcela.id]?.conta_bancaria_id || '',
                          forma_pagamento_id: paymentData[parcela.id]?.forma_pagamento_id || '',
                          codigo_identificador: paymentData[parcela.id]?.codigo_identificador || '',
                          valor_original_centavos: paymentData[parcela.id]?.valor_original_centavos || parcela.valor_parcela_centavos,
                          valor_pago_centavos: valorCentavos
                        }
                      })}
                      placeholder="0,00"
                    />
                  </div>
                  <div className="col-span-4 flex justify-between items-center pt-2 border-t">
                    <div className="flex gap-4">
                      <div>
                        <span className="text-sm text-muted-foreground">Valor Original:</span>
                        <span className="ml-2 font-bold">{formatCurrency(paymentData[parcela.id]?.valor_original_centavos || parcela.valor_parcela_centavos)}</span>
                      </div>
                      <div>
                        <span className="text-sm text-muted-foreground">Valor Pago:</span>
                        <span className={`ml-2 font-bold ${(paymentData[parcela.id]?.valor_pago_centavos || parcela.valor_parcela_centavos) !== (paymentData[parcela.id]?.valor_original_centavos || parcela.valor_parcela_centavos) ? 'text-orange-600' : 'text-green-600'}`}>
                          {formatCurrency(paymentData[parcela.id]?.valor_pago_centavos || parcela.valor_parcela_centavos)}
                        </span>
                      </div>
                      {(paymentData[parcela.id]?.valor_pago_centavos || parcela.valor_parcela_centavos) !== (paymentData[parcela.id]?.valor_original_centavos || parcela.valor_parcela_centavos) && (
                        <div>
                          <span className="text-sm text-muted-foreground">Diferença:</span>
                          <span className="ml-2 font-bold text-orange-600">
                            {formatCurrency(Math.abs((paymentData[parcela.id]?.valor_pago_centavos || parcela.valor_parcela_centavos) - (paymentData[parcela.id]?.valor_original_centavos || parcela.valor_parcela_centavos)))}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            <div>
              <Label>Observações</Label>
              <Textarea placeholder="Ex: Pagamento via PIX, desconto por antecipação, juros por atraso, etc."
                        value={paymentObservacao} onChange={(e) => setPaymentObservacao(e.target.value)} />
            </div>
            <div className="flex justify-between items-center p-4 bg-muted rounded-lg">
              <div>
                <span className="text-sm text-muted-foreground">Total Original:</span>
                <span className="ml-2 font-bold">
                  {formatCurrency(filteredAndSortedParcelas.filter(p => selectedParcelas.includes(p.id)).reduce((acc, p) => {
                    return acc + (paymentData[p.id]?.valor_original_centavos || p.valor_parcela_centavos);
                  }, 0))}
                </span>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">Total a Pagar:</span>
                <span className="ml-2 font-bold text-green-600">
                  {formatCurrency(filteredAndSortedParcelas.filter(p => selectedParcelas.includes(p.id)).reduce((acc, p) => {
                    return acc + (paymentData[p.id]?.valor_pago_centavos || p.valor_parcela_centavos);
                  }, 0))}
                </span>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">Diferença Total:</span>
                <span className={`ml-2 font-bold ${
                  filteredAndSortedParcelas.filter(p => selectedParcelas.includes(p.id)).reduce((acc, p) => acc + (paymentData[p.id]?.valor_pago_centavos || p.valor_parcela_centavos), 0) !==
                  filteredAndSortedParcelas.filter(p => selectedParcelas.includes(p.id)).reduce((acc, p) => acc + (paymentData[p.id]?.valor_original_centavos || p.valor_parcela_centavos), 0)
                  ? 'text-orange-600' : 'text-muted-foreground'
                }`}>
                  {formatCurrency(Math.abs(
                    filteredAndSortedParcelas.filter(p => selectedParcelas.includes(p.id)).reduce((acc, p) => acc + (paymentData[p.id]?.valor_pago_centavos || p.valor_parcela_centavos), 0) -
                    filteredAndSortedParcelas.filter(p => selectedParcelas.includes(p.id)).reduce((acc, p) => acc + (paymentData[p.id]?.valor_original_centavos || p.valor_parcela_centavos), 0)
                  ))}
                </span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPaymentModal(false)}>Cancelar</Button>
            <Button onClick={handleMassPayment}>Confirmar Pagamento ({selectedParcelas.length})</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Personalizar Colunas */}
      <Dialog open={showColumnsModal} onOpenChange={setShowColumnsModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Personalizar Colunas</DialogTitle>
            <CardDescription>Marque/desmarque para mostrar/ocultar colunas.</CardDescription>
          </DialogHeader>
          <div className="space-y-2">
            {Object.entries(visibleColumns).map(([key, value]) => (
              <div key={key} className="flex items-center space-x-2">
                <Checkbox checked={value} onCheckedChange={(checked) => setVisibleColumns({ ...visibleColumns, [key]: !!checked })} />
                <Label className="capitalize">{key.replace('_', ' ')}</Label>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setVisibleColumns({
              fornecedor: true, descricao: true, numero_nota: true, categoria: true,
              filial: true, valor_parcela: true, parcela: true, vencimento: true, status: true, acoes: true
            })}>Restaurar Padrão</Button>
            <Button onClick={() => setShowColumnsModal(false)}>Aplicar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Editar Parcela Individual */}
      <EditarParcelaModal
        open={showEditModal}
        onOpenChange={setShowEditModal}
        parcela={editingParcela as any}
        onSuccess={() => {
          fetchParcelas();
          setEditingParcela(null);
        }}
      />
    </div>
  );
}

export default ContasPagarSimple;
