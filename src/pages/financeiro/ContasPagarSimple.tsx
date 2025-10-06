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
import { Search, Filter, Edit, Check, Trash2, Settings2, CalendarIcon, ArrowUpDown, X } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface ParcelaCompleta {
  id: number;
  conta_id: number;
  numero_parcela: number;
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

interface Fornecedor {
  id: number;
  nome_fantasia: string;
  razao_social: string;
}

interface Categoria {
  id: number;
  nome: string;
}

interface Filial {
  id: number;
  nome: string;
}

interface ContaBancaria {
  id: number;
  nome_conta: string;
  banco: string;
}

interface FormaPagamento {
  id: number;
  nome: string;
}

export function ContasPagarSimple() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [parcelas, setParcelas] = useState<ParcelaCompleta[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedParcelas, setSelectedParcelas] = useState<number[]>([]);
  
  // Dados auxiliares
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [filiais, setFiliais] = useState<Filial[]>([]);
  const [contasBancarias, setContasBancarias] = useState<ContaBancaria[]>([]);
  const [formasPagamento, setFormasPagamento] = useState<FormaPagamento[]>([]);

  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [filterFornecedor, setFilterFornecedor] = useState<string>('all');
  const [filterFilial, setFilterFilial] = useState<string>('all');
  const [filterCategoria, setFilterCategoria] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('pendente');
  const [filterValorMin, setFilterValorMin] = useState('');
  const [filterValorMax, setFilterValorMax] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Modais
  const [showEditMassModal, setShowEditMassModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showColumnsModal, setShowColumnsModal] = useState(false);

  // Edição em massa
  const [massEditData, setMassEditData] = useState({
    categoria_id: '',
    filial_id: '',
    forma_pagamento_id: '',
    vencimento: null as Date | null,
    observacao: ''
  });

  // Pagamento em lote
  const [paymentData, setPaymentData] = useState<{
    [key: number]: {
      data_pagamento: Date | null;
      conta_bancaria_id: string;
      codigo_identificador: string;
    } | undefined
  }>({});
  const [paymentObservacao, setPaymentObservacao] = useState('');

  // Colunas visíveis
  const [visibleColumns, setVisibleColumns] = useState({
    fornecedor: true,
    descricao: true,
    numero_nota: true,
    categoria: true,
    filial: true,
    valor_parcela: true,
    parcela: true,
    vencimento: true,
    status: true
  });

  // Ordenação
  const [sortField, setSortField] = useState<keyof ParcelaCompleta>('vencimento');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  useEffect(() => {
    fetchAllData();
  }, []);

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
    } finally {
      setLoading(false);
    }
  };

  const fetchParcelas = async () => {
    const { data: parcelasData, error: parcelasError } = await supabase
      .from('contas_pagar_parcelas')
      .select('*')
      .order('vencimento');
      
    if (parcelasError) throw parcelasError;
    
    const contasIds = [...new Set(parcelasData?.map(p => p.conta_id) || [])];
    if (contasIds.length === 0) {
      setParcelas([]);
      return;
    }
    
    const { data: contasData, error: contasError } = await supabase
      .from('contas_pagar')
      .select('*')
      .in('id', contasIds);
      
    if (contasError) throw contasError;
    
    const fornecedorIds = [...new Set(contasData?.map(c => c.fornecedor_id).filter(id => id) || [])];
    const categoriaIds = [...new Set(contasData?.map(c => c.categoria_id).filter(id => id) || [])];
    const filialIds = [...new Set(contasData?.map(c => c.filial_id).filter(id => id) || [])];
    
    const [{ data: fornecedoresData }, { data: categoriasData }, { data: filiaisData }] = await Promise.all([
      supabase.from('pessoas_juridicas').select('id, nome_fantasia, razao_social').in('id', fornecedorIds),
      supabase.from('categorias_financeiras').select('id, nome').in('id', categoriaIds),
      supabase.from('filiais').select('id, nome').in('id', filialIds)
    ]);
    
    const parcelasCompletas = parcelasData?.map(parcela => {
      const conta = contasData?.find(c => c.id === parcela.conta_id);
      const fornecedor = fornecedoresData?.find(f => f.id === conta?.fornecedor_id);
      const categoria = categoriasData?.find(c => c.id === conta?.categoria_id);
      const filial = filiaisData?.find(f => f.id === conta?.filial_id);
      
      return {
        id: parcela.id,
        conta_id: parcela.conta_id,
        numero_parcela: parcela.numero_parcela || parcela.parcela_num || 1,
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
    }) || [];
    
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

  // Filtros e ordenação
  const filteredAndSortedParcelas = React.useMemo(() => {
    let filtered = parcelas.filter(p => {
      if (searchTerm && !p.fornecedor.toLowerCase().includes(searchTerm.toLowerCase()) &&
          !p.descricao.toLowerCase().includes(searchTerm.toLowerCase()) &&
          !p.numero_nota.toLowerCase().includes(searchTerm.toLowerCase())) {
        return false;
      }
      if (filterFornecedor !== 'all' && p.fornecedor_id !== parseInt(filterFornecedor)) return false;
      if (filterFilial !== 'all' && p.filial_id !== parseInt(filterFilial)) return false;
      if (filterCategoria !== 'all' && p.categoria_id !== parseInt(filterCategoria)) return false;
      if (filterStatus === 'pendente' && p.pago) return false;
      if (filterStatus === 'pago' && !p.pago) return false;
      if (filterValorMin && p.valor_parcela_centavos < parseFloat(filterValorMin) * 100) return false;
      if (filterValorMax && p.valor_parcela_centavos > parseFloat(filterValorMax) * 100) return false;
      return true;
    });

    filtered.sort((a, b) => {
      const aVal = a[sortField];
      const bVal = b[sortField];
      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [parcelas, searchTerm, filterFornecedor, filterFilial, filterCategoria, filterStatus, filterValorMin, filterValorMax, sortField, sortDirection]);

  const handleSort = (field: keyof ParcelaCompleta) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const toggleSelectAll = () => {
    if (selectedParcelas.length === filteredAndSortedParcelas.length) {
      setSelectedParcelas([]);
    } else {
      setSelectedParcelas(filteredAndSortedParcelas.map(p => p.id));
    }
  };

  const toggleSelectParcela = (id: number) => {
    setSelectedParcelas(prev =>
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );
  };

  const handleMassEdit = async () => {
    try {
      const updates: any = {};
      if (massEditData.categoria_id) updates.categoria_id = parseInt(massEditData.categoria_id);
      if (massEditData.filial_id) updates.filial_id = parseInt(massEditData.filial_id);
      if (massEditData.forma_pagamento_id) updates.forma_pagamento_id = parseInt(massEditData.forma_pagamento_id);
      if (massEditData.vencimento) updates.vencimento = format(massEditData.vencimento, 'yyyy-MM-dd');
      if (massEditData.observacao) updates.observacao = massEditData.observacao;

      // Atualizar contas_pagar para categoria e filial
      const contasIds = [...new Set(filteredAndSortedParcelas.filter(p => selectedParcelas.includes(p.id)).map(p => p.conta_id))];
      if (updates.categoria_id || updates.filial_id) {
        const contaUpdates: any = {};
        if (updates.categoria_id) contaUpdates.categoria_id = updates.categoria_id;
        if (updates.filial_id) contaUpdates.filial_id = updates.filial_id;
        
        await supabase.from('contas_pagar').update(contaUpdates).in('id', contasIds);
      }

      // Atualizar parcelas
      const parcelaUpdates: any = {};
      if (updates.vencimento) parcelaUpdates.vencimento = updates.vencimento;
      if (updates.forma_pagamento_id) parcelaUpdates.forma_pagamento_id = updates.forma_pagamento_id;
      if (updates.observacao) parcelaUpdates.observacao = updates.observacao;

      if (Object.keys(parcelaUpdates).length > 0) {
        await supabase.from('contas_pagar_parcelas').update(parcelaUpdates).in('id', selectedParcelas);
      }

      toast({ title: `${selectedParcelas.length} parcela(s) atualizada(s) com sucesso` });
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
      const selectedParcelasData = filteredAndSortedParcelas.filter(p => selectedParcelas.includes(p.id));
      
      for (const parcela of selectedParcelasData) {
        const payment = paymentData[parcela.id];
        if (!payment?.data_pagamento || !payment?.conta_bancaria_id) {
          toast({ title: 'Preencha todos os campos de pagamento', variant: 'destructive' });
          return;
        }

        await supabase.rpc('pagar_parcela', {
          parcela_id: parcela.id,
          conta_bancaria_id: parseInt(payment.conta_bancaria_id),
          forma_pagamento_id: parcela.forma_pagamento_id || 1,
          valor_pago_centavos: parcela.valor_parcela_centavos,
          observacao_param: paymentObservacao
        });
      }

      toast({ title: `${selectedParcelas.length} parcela(s) paga(s) com sucesso` });
      setShowPaymentModal(false);
      setSelectedParcelas([]);
      setPaymentData({});
      setPaymentObservacao('');
      fetchParcelas();
    } catch (error) {
      toast({ title: 'Erro ao processar pagamento', variant: 'destructive' });
    }
  };

  const formatCurrency = (centavos: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(centavos / 100);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const getStatusBadge = (vencimento: string, pago: boolean) => {
    if (pago) return <Badge className="bg-green-500">Pago</Badge>;
    
    const hoje = new Date();
    const dataVencimento = new Date(vencimento);
    
    if (dataVencimento < hoje) {
      return <Badge variant="destructive">Vencido</Badge>;
    } else if (dataVencimento <= new Date(hoje.getTime() + 7 * 24 * 60 * 60 * 1000)) {
      return <Badge variant="outline">Vence em 7 dias</Badge>;
    } else {
      return <Badge variant="default">Pendente</Badge>;
    }
  };

  const clearFilters = () => {
    setSearchTerm('');
    setFilterFornecedor('all');
    setFilterFilial('all');
    setFilterCategoria('all');
    setFilterStatus('pendente');
    setFilterValorMin('');
    setFilterValorMax('');
  };

  const activeFiltersCount = [
    filterFornecedor !== 'all',
    filterFilial !== 'all',
    filterCategoria !== 'all',
    filterStatus !== 'pendente',
    filterValorMin,
    filterValorMax
  ].filter(Boolean).length;

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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Contas a Pagar</h1>
        <p className="text-muted-foreground">
          {filteredAndSortedParcelas.length} parcela(s) {filterStatus === 'pendente' ? 'pendente(s)' : ''}
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex-1 flex items-center gap-4">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por fornecedor, descrição ou ID..."
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
                  <SelectTrigger>
                    <SelectValue placeholder="Todos os fornecedores" />
                  </SelectTrigger>
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
                  <SelectTrigger>
                    <SelectValue placeholder="Todas as filiais" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as filiais</SelectItem>
                    {filiais.map(f => (
                      <SelectItem key={f.id} value={f.id.toString()}>{f.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Categoria</Label>
                <Select value={filterCategoria} onValueChange={setFilterCategoria}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todas as categorias" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as categorias</SelectItem>
                    {categorias.map(c => (
                      <SelectItem key={c.id} value={c.id.toString()}>{c.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Status</Label>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="pendente">Pendente</SelectItem>
                    <SelectItem value="pago">Pago</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Valor Mínimo</Label>
                <Input
                  type="number"
                  placeholder="0,00"
                  value={filterValorMin}
                  onChange={(e) => setFilterValorMin(e.target.value)}
                />
              </div>
              <div>
                <Label>Valor Máximo</Label>
                <Input
                  type="number"
                  placeholder="999999,99"
                  value={filterValorMax}
                  onChange={(e) => setFilterValorMax(e.target.value)}
                />
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
              <Button size="sm" variant="destructive">
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
                      checked={selectedParcelas.length === filteredAndSortedParcelas.length && filteredAndSortedParcelas.length > 0}
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
                  {visibleColumns.numero_nota && (
                    <TableHead>Nº Nota Fiscal</TableHead>
                  )}
                  {visibleColumns.categoria && (
                    <TableHead>Categoria</TableHead>
                  )}
                  {visibleColumns.filial && (
                    <TableHead>Filial</TableHead>
                  )}
                  {visibleColumns.valor_parcela && (
                    <TableHead onClick={() => handleSort('valor_parcela_centavos')} className="cursor-pointer">
                      Valor <ArrowUpDown className="inline h-4 w-4" />
                    </TableHead>
                  )}
                  {visibleColumns.parcela && (
                    <TableHead>Parcela</TableHead>
                  )}
                  {visibleColumns.vencimento && (
                    <TableHead onClick={() => handleSort('vencimento')} className="cursor-pointer">
                      Vencimento <ArrowUpDown className="inline h-4 w-4" />
                    </TableHead>
                  )}
                  {visibleColumns.status && (
                    <TableHead>Status</TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAndSortedParcelas.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center text-muted-foreground py-8">
                      Nenhuma parcela encontrada
                    </TableCell>
                  </TableRow>
                ) : (
                   filteredAndSortedParcelas.map((parcela) => (
                    <TableRow key={parcela.id} className="cursor-pointer hover:bg-muted/50">
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={selectedParcelas.includes(parcela.id)}
                          onCheckedChange={() => toggleSelectParcela(parcela.id)}
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
                      {visibleColumns.parcela && <TableCell>{parcela.numero_parcela}</TableCell>}
                      {visibleColumns.vencimento && <TableCell>{formatDate(parcela.vencimento)}</TableCell>}
                      {visibleColumns.status && <TableCell>{getStatusBadge(parcela.vencimento, parcela.pago)}</TableCell>}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
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
              <Select value={massEditData.categoria_id} onValueChange={(v) => setMassEditData({...massEditData, categoria_id: v})}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar categoria" />
                </SelectTrigger>
                <SelectContent>
                  {categorias.map(c => (
                    <SelectItem key={c.id} value={c.id.toString()}>{c.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Filial</Label>
              <Select value={massEditData.filial_id} onValueChange={(v) => setMassEditData({...massEditData, filial_id: v})}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar filial" />
                </SelectTrigger>
                <SelectContent>
                  {filiais.map(f => (
                    <SelectItem key={f.id} value={f.id.toString()}>{f.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Forma de Pagamento</Label>
              <Select value={massEditData.forma_pagamento_id} onValueChange={(v) => setMassEditData({...massEditData, forma_pagamento_id: v})}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar forma de pagamento" />
                </SelectTrigger>
                <SelectContent>
                  {formasPagamento.map(f => (
                    <SelectItem key={f.id} value={f.id.toString()}>{f.nome}</SelectItem>
                  ))}
                </SelectContent>
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
                  <Calendar
                    mode="single"
                    selected={massEditData.vencimento || undefined}
                    onSelect={(date) => setMassEditData({...massEditData, vencimento: date || null})}
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="col-span-2">
              <Label>Observações</Label>
              <Textarea
                placeholder="Observações adicionais"
                value={massEditData.observacao}
                onChange={(e) => setMassEditData({...massEditData, observacao: e.target.value})}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowEditMassModal(false);
              setMassEditData({ categoria_id: '', filial_id: '', forma_pagamento_id: '', vencimento: null, observacao: '' });
            }}>
              Cancelar
            </Button>
            <Button onClick={handleMassEdit}>
              Atualizar {selectedParcelas.length} Parcela(s)
            </Button>
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
            {filteredAndSortedParcelas.filter(p => selectedParcelas.includes(p.id)).map(parcela => (
              <Card key={parcela.id}>
                <CardHeader>
                  <CardTitle className="text-base">{parcela.fornecedor}</CardTitle>
                  <CardDescription>Parcela {parcela.numero_parcela} - Venc: {formatDate(parcela.vencimento)}</CardDescription>
                  <CardDescription>NFe {parcela.numero_nota} - Parcela {parcela.numero_parcela}</CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-3 gap-4">
                  <div>
                    <Label>Data de Pagamento *</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-start">
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {paymentData[parcela.id]?.data_pagamento ? format(paymentData[parcela.id].data_pagamento, 'dd/MM/yyyy') : 'Selecionar'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={paymentData[parcela.id]?.data_pagamento || undefined}
                          onSelect={(date) => setPaymentData({...paymentData, [parcela.id]: {data_pagamento: date || null, conta_bancaria_id: paymentData[parcela.id]?.conta_bancaria_id || '', codigo_identificador: paymentData[parcela.id]?.codigo_identificador || ''}})}
                          className="pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div>
                    <Label>Banco Pagador *</Label>
                    <Select 
                      value={paymentData[parcela.id]?.conta_bancaria_id || ''} 
                      onValueChange={(v) => setPaymentData({...paymentData, [parcela.id]: {data_pagamento: paymentData[parcela.id]?.data_pagamento || null, conta_bancaria_id: v, codigo_identificador: paymentData[parcela.id]?.codigo_identificador || ''}})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Banco" />
                      </SelectTrigger>
                      <SelectContent>
                        {contasBancarias.map(c => (
                          <SelectItem key={c.id} value={c.id.toString()}>
                            {c.nome_conta} - {c.banco}
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
                      onChange={(e) => setPaymentData({...paymentData, [parcela.id]: {data_pagamento: paymentData[parcela.id]?.data_pagamento || null, conta_bancaria_id: paymentData[parcela.id]?.conta_bancaria_id || '', codigo_identificador: e.target.value}})}
                    />
                  </div>
                  <div className="col-span-3 flex justify-between items-center pt-2 border-t">
                    <span className="text-sm text-muted-foreground">Original</span>
                    <span className="font-bold">{formatCurrency(parcela.valor_parcela_centavos)}</span>
                    <span className="text-sm text-muted-foreground">Pago</span>
                    <span className="font-bold text-green-600">{formatCurrency(parcela.valor_parcela_centavos)}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
            <div>
              <Label>Observações</Label>
              <Textarea
                placeholder="Ex: Pagamento via PIX, desconto por antecipação, juros por atraso, etc."
                value={paymentObservacao}
                onChange={(e) => setPaymentObservacao(e.target.value)}
              />
            </div>
            <div className="flex justify-between items-center p-4 bg-muted rounded-lg">
              <div>
                <span className="text-sm text-muted-foreground">Total Original:</span>
                <span className="ml-2 font-bold">
                  {formatCurrency(filteredAndSortedParcelas.filter(p => selectedParcelas.includes(p.id)).reduce((acc, p) => acc + p.valor_parcela_centavos, 0))}
                </span>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">Total a Pagar:</span>
                <span className="ml-2 font-bold text-green-600">
                  {formatCurrency(filteredAndSortedParcelas.filter(p => selectedParcelas.includes(p.id)).reduce((acc, p) => acc + p.valor_parcela_centavos, 0))}
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
            <CardDescription>Arraste para reordenar e marque/desmarque para mostrar/ocultar colunas.</CardDescription>
          </DialogHeader>
          <div className="space-y-2">
            {Object.entries(visibleColumns).map(([key, value]) => (
              <div key={key} className="flex items-center space-x-2">
                <Checkbox
                  checked={value}
                  onCheckedChange={(checked) => setVisibleColumns({...visibleColumns, [key]: !!checked})}
                />
                <Label className="capitalize">{key.replace('_', ' ')}</Label>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setVisibleColumns({
              fornecedor: true, descricao: true, numero_nota: true, categoria: true,
              filial: true, valor_parcela: true, parcela: true, vencimento: true, status: true
            })}>
              Restaurar Padrão
            </Button>
            <Button onClick={() => setShowColumnsModal(false)}>Aplicar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
