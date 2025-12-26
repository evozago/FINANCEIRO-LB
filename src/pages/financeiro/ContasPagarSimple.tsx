import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
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
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { EditarParcelaModal } from '@/components/financeiro/EditarParcelaModal';
import { CurrencyInput } from '@/components/ui/currency-input';
import {
  Search, Filter, Edit, Check, Trash2, Settings2, CalendarIcon,
  ArrowUpDown, X, Plus, RotateCcw, Edit2, Copy, Upload, FileText, Loader2
} from 'lucide-react';
import { useXMLImport } from '@/hooks/useXMLImport';
import { Progress } from '@/components/ui/progress';
import { format } from 'date-fns';
import { parseLocalDate } from '@/lib/date';

interface ParcelaCompleta {
  id: number;
  conta_id: number;
  numero_parcela: number;
  num_parcelas: number;
  valor_parcela_centavos: number;
  vencimento: string;
  pago: boolean;
  pago_em: string | null;
  descricao: string;
  fornecedor: string;
  fornecedor_id: number | null;
  fornecedor_pf_id: number | null;
  categoria: string;
  categoria_id: number | null;
  filial: string;
  filial_id: number | null;
  numero_nota: string;
  forma_pagamento_id: number | null;
  conta_bancaria_id: number | null;
}

interface Fornecedor { id: number; nome_fantasia?: string; razao_social?: string; nome_completo?: string; tipo: 'PJ' | 'PF'; }
interface Categoria { id: number; nome: string; }
interface Filial { id: number; nome: string; }
interface ContaBancaria { id: number; nome_conta: string; banco: string; }
interface FormaPagamento { id: number; nome: string; }

// Interface para dados de DAR_BAIXA vindos da IA
interface DarBaixaData {
  intencao: string;
  conta_pagar: {
    descricao?: string;
    valor_total_centavos?: number;
    valor_final_centavos?: number;
    juros_centavos?: number;
    desconto_centavos?: number;
    fornecedor_nome_sugerido?: string;
    data_pagamento?: string;
    numero_nota?: string;
  };
  // Alguns retornos vêm como `parcelas`, outros como `contas_pagar_parcelas`
  parcelas?: Array<{ parcela_num: number; valor_parcela_centavos: number; vencimento: string }>;
  contas_pagar_parcelas?: Array<{ parcela_num: number; valor_parcela_centavos: number; vencimento: string }>;
  observacao_ia?: string;
  fileName?: string;
}

// Interface para item de baixa em lote
interface BaixaLoteItem {
  data: DarBaixaData;
  parcelasCorrespondentes: ParcelaCompleta[];
  parcelaSelecionada: number | null;
  valorPago: number;
  confirmado: boolean;
}

export function ContasPagarSimple() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const { importFiles, processing: xmlProcessing, progress: xmlProgress } = useXMLImport();
  const [parcelas, setParcelas] = useState<ParcelaCompleta[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedParcelas, setSelectedParcelas] = useState<number[]>([]);
  const [lastSelectedIndex, setLastSelectedIndex] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);

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
  const [filterFornecedor, setFilterFornecedor] = useState<string[]>([]);
  const [filterFilial, setFilterFilial] = useState<string[]>([]);
  const [filterCategoria, setFilterCategoria] = useState<string[]>([]);
  const [filterStatus, setFilterStatus] = useState<string[]>([]);
  const [filterValorMin, setFilterValorMin] = useState('');
  const [filterValorMax, setFilterValorMax] = useState('');
  const [filterValorExato, setFilterValorExato] = useState('');
  const [filterDataVencimentoInicio, setFilterDataVencimentoInicio] = useState<Date | null>(null);
  const [filterDataVencimentoFim, setFilterDataVencimentoFim] = useState<Date | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  // modais
  const [showEditMassModal, setShowEditMassModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showColumnsModal, setShowColumnsModal] = useState(false);

  // DAR_BAIXA modal (IA) - individual
  const [showDarBaixaModal, setShowDarBaixaModal] = useState(false);
  const [darBaixaData, setDarBaixaData] = useState<DarBaixaData | null>(null);
  const [parcelasCorrespondentes, setParcelasCorrespondentes] = useState<ParcelaCompleta[]>([]);
  const [parcelaSelecionadaBaixa, setParcelaSelecionadaBaixa] = useState<number | null>(null);
  const [baixaFormData, setBaixaFormData] = useState({
    conta_bancaria_id: '',
    forma_pagamento_id: '',
    data_pagamento: new Date(),
    valor_pago_centavos: 0,
    observacao: ''
  });

  // DAR_BAIXA LOTE (múltiplos comprovantes)
  const [showBaixaLoteModal, setShowBaixaLoteModal] = useState(false);
  const [baixaLoteItems, setBaixaLoteItems] = useState<BaixaLoteItem[]>([]);
  const [baixaLoteFormaPagamento, setBaixaLoteFormaPagamento] = useState('');
  const [baixaLoteContaBancaria, setBaixaLoteContaBancaria] = useState('');
  const [baixaLoteProcessing, setBaixaLoteProcessing] = useState(false);

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
      desconto_percentual: number;
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
    valor_parcela: true, parcela: true, vencimento: true, data_pagamento: true, status: true, acoes: true
  });

  // ordenação
  const [sortField, setSortField] = useState<keyof ParcelaCompleta>('vencimento');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  useEffect(() => { fetchAllData(); }, []);
  
  // Effect para processar DAR_BAIXA vindo da IA (individual)
  useEffect(() => {
    const state = location.state as { darBaixa?: DarBaixaData; darBaixaLote?: DarBaixaData[] } | null;
    
    // Processar lote de comprovantes
    if (state?.darBaixaLote && parcelas.length > 0) {
      console.log("📋 Recebido DAR_BAIXA LOTE:", state.darBaixaLote);
      processarLoteBaixa(state.darBaixaLote);
      window.history.replaceState({}, document.title);
      return;
    }
    
    // Processar comprovante individual (compatibilidade)
    if (state?.darBaixa && parcelas.length > 0) {
      console.log("📋 Recebido DAR_BAIXA:", state.darBaixa);
      setDarBaixaData(state.darBaixa);
      searchMatchingParcelas(state.darBaixa);
      window.history.replaceState({}, document.title);
    }
  }, [location.state, parcelas]);
  
  // Processar lote de comprovantes
  const processarLoteBaixa = (lote: DarBaixaData[]) => {
    const items: BaixaLoteItem[] = lote.map(data => {
      const { correspondentes, melhorMatch, valorPago } = findMatchingParcelas(data);
      return {
        data,
        parcelasCorrespondentes: correspondentes,
        parcelaSelecionada: melhorMatch,
        valorPago,
        confirmado: melhorMatch !== null
      };
    });
    
    setBaixaLoteItems(items);
    setShowBaixaLoteModal(true);
    
    const comMatch = items.filter(i => i.parcelaSelecionada !== null).length;
    toast({
      title: `${lote.length} comprovante(s) processado(s)`,
      description: `${comMatch} com parcelas identificadas automaticamente.`,
    });
  };
  
  // Função para buscar parcelas correspondentes (retorna resultado em vez de setar state)
  const findMatchingParcelas = (data: DarBaixaData): { 
    correspondentes: ParcelaCompleta[]; 
    melhorMatch: number | null;
    valorPago: number;
  } => {
    const tolerancia = 0.15;

    const valorBusca =
      data.conta_pagar.valor_final_centavos ??
      data.conta_pagar.valor_total_centavos ??
      data.parcelas?.[0]?.valor_parcela_centavos ??
      data.contas_pagar_parcelas?.[0]?.valor_parcela_centavos ??
      0;

    const vencimentoSug =
      data.parcelas?.[0]?.vencimento ?? data.contas_pagar_parcelas?.[0]?.vencimento;

    const nomeFornecedorRaw = data.conta_pagar.fornecedor_nome_sugerido || '';

    const normalizeText = (txt: string) =>
      txt.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();

    const STOP = new Set(['ltda', 'me', 'eireli', 'sa', 's', 'a', 'do', 'da', 'de', 'e']);

    const tokenize = (txt: string) =>
      normalizeText(txt).split(' ').map(t => t.trim()).filter(t => t.length >= 2 && !STOP.has(t));

    const supplierSimilarity = (a: string, b: string) => {
      const ta = tokenize(a);
      const tb = tokenize(b);
      if (!ta.length || !tb.length) return 0;
      const setA = new Set(ta);
      const setB = new Set(tb);
      let inter = 0;
      for (const t of setA) if (setB.has(t)) inter++;
      const union = new Set([...setA, ...setB]).size;
      return union ? inter / union : 0;
    };

    const parcelasAbertas = parcelas.filter(p => !p.pago);

    const candidatos = parcelasAbertas
      .map(p => {
        const diffValor = valorBusca > 0 ? Math.abs(p.valor_parcela_centavos - valorBusca) : Number.POSITIVE_INFINITY;
        const valorMatch = valorBusca > 0 && diffValor <= valorBusca * tolerancia;
        const fornecedorScore = nomeFornecedorRaw ? supplierSimilarity(nomeFornecedorRaw, p.fornecedor) : 0;
        const fornecedorMatch = nomeFornecedorRaw ? fornecedorScore >= 0.45 : false;
        const vencimentoMatch = vencimentoSug ? p.vencimento === vencimentoSug : false;

        if (!valorMatch && !fornecedorMatch && !vencimentoMatch) return null;

        const valorScore = valorMatch && valorBusca > 0 ? 1 - diffValor / (valorBusca * tolerancia) : 0;
        const score = nomeFornecedorRaw
          ? fornecedorScore * 0.6 + valorScore * 0.3 + (vencimentoMatch ? 0.1 : 0)
          : valorScore * 0.85 + (vencimentoMatch ? 0.15 : 0);

        return { parcela: p, score };
      })
      .filter((x): x is { parcela: ParcelaCompleta; score: number } => !!x)
      .sort((a, b) => b.score - a.score);

    const correspondentes = candidatos.map(c => c.parcela);
    
    const valorFinal = data.conta_pagar.valor_final_centavos ?? data.conta_pagar.valor_total_centavos ?? valorBusca;

    // Auto-seleciona se houver match claro
    let melhorMatch: number | null = null;
    if (correspondentes.length > 0) {
      const top = candidatos[0];
      const second = candidatos[1];
      const autoSelect = correspondentes.length === 1 ||
        (!!top && top.score >= 0.88 && (!second || top.score - second.score >= 0.18));
      if (autoSelect && top) {
        melhorMatch = top.parcela.id;
      }
    }

    return { correspondentes, melhorMatch, valorPago: valorFinal || 0 };
  };
  
  // Função para buscar parcelas correspondentes ao comprovante (versão original para individual)
  const searchMatchingParcelas = (data: DarBaixaData) => {
    const { correspondentes, melhorMatch, valorPago } = findMatchingParcelas(data);

    setParcelasCorrespondentes(correspondentes);
    setParcelaSelecionadaBaixa(melhorMatch);

    setBaixaFormData(prev => ({
      ...prev,
      valor_pago_centavos: valorPago,
      data_pagamento: data.conta_pagar.data_pagamento
        ? parseLocalDate(data.conta_pagar.data_pagamento)
        : new Date(),
      observacao: data.observacao_ia || '',
    }));

    if (correspondentes.length > 0) {
      setShowDarBaixaModal(true);
      toast({
        title: `${correspondentes.length} parcela(s) encontrada(s)`,
        description: melhorMatch
          ? 'Sugestão selecionada automaticamente — confira antes de confirmar.'
          : 'Selecione a parcela correta para dar baixa.',
      });
      return;
    }

    toast({
      title: 'Nenhuma parcela correspondente',
      description: 'Criando nova conta a pagar...',
      variant: 'destructive',
    });
    navigate('/financeiro/contas-pagar/nova', { state: { dadosImportados: data } });
  };
  
  // Atualizar seleção de parcela em um item do lote
  const handleLoteItemSelect = (itemIndex: number, parcelaId: number | null) => {
    setBaixaLoteItems(prev => prev.map((item, idx) => {
      if (idx !== itemIndex) return item;
      const parcela = item.parcelasCorrespondentes.find(p => p.id === parcelaId);
      return {
        ...item,
        parcelaSelecionada: parcelaId,
        valorPago: item.data.conta_pagar.valor_final_centavos ?? 
                   item.data.conta_pagar.valor_total_centavos ?? 
                   parcela?.valor_parcela_centavos ?? 0,
        confirmado: parcelaId !== null
      };
    }));
  };
  
  // Confirmar todas as baixas em lote
  const handleConfirmarBaixaLote = async () => {
    const itemsParaBaixar = baixaLoteItems.filter(item => item.parcelaSelecionada !== null && item.confirmado);
    
    if (itemsParaBaixar.length === 0) {
      toast({ title: 'Nenhum item selecionado para baixa', variant: 'destructive' });
      return;
    }
    
    if (!baixaLoteFormaPagamento) {
      toast({ title: 'Selecione a forma de pagamento', variant: 'destructive' });
      return;
    }
    
    setBaixaLoteProcessing(true);
    let sucesso = 0;
    let erros = 0;
    
    for (const item of itemsParaBaixar) {
      try {
        await supabase.rpc('pagar_parcela', {
          parcela_id: item.parcelaSelecionada!,
          conta_bancaria_id: baixaLoteContaBancaria ? parseInt(baixaLoteContaBancaria) : null,
          forma_pagamento_id: parseInt(baixaLoteFormaPagamento),
          valor_pago_centavos: item.valorPago,
          observacao_param: item.data.observacao_ia || null
        });
        sucesso++;
      } catch (error: any) {
        console.error('Erro ao dar baixa:', error);
        erros++;
      }
    }
    
    setBaixaLoteProcessing(false);
    
    if (erros === 0) {
      toast({ title: `${sucesso} baixa(s) realizada(s) com sucesso!` });
    } else {
      toast({ 
        title: `${sucesso} baixa(s) realizada(s), ${erros} erro(s)`, 
        variant: 'destructive' 
      });
    }
    
    setShowBaixaLoteModal(false);
    setBaixaLoteItems([]);
    setBaixaLoteFormaPagamento('');
    setBaixaLoteContaBancaria('');
    fetchParcelas();
  };

  // Confirmar baixa da parcela
  const handleConfirmarBaixa = async () => {
    if (!parcelaSelecionadaBaixa) {
      toast({ title: 'Selecione uma parcela', variant: 'destructive' });
      return;
    }
    if (!baixaFormData.forma_pagamento_id) {
      toast({ title: 'Selecione a forma de pagamento', variant: 'destructive' });
      return;
    }
    
    try {
      await supabase.rpc('pagar_parcela', {
        parcela_id: parcelaSelecionadaBaixa,
        conta_bancaria_id: baixaFormData.conta_bancaria_id ? parseInt(baixaFormData.conta_bancaria_id) : null,
        forma_pagamento_id: parseInt(baixaFormData.forma_pagamento_id),
        valor_pago_centavos: baixaFormData.valor_pago_centavos,
        observacao_param: baixaFormData.observacao || null
      });
      
      toast({ title: 'Baixa realizada com sucesso!' });
      setShowDarBaixaModal(false);
      setDarBaixaData(null);
      setParcelasCorrespondentes([]);
      setParcelaSelecionadaBaixa(null);
      setBaixaFormData({
        conta_bancaria_id: '',
        forma_pagamento_id: '',
        data_pagamento: new Date(),
        valor_pago_centavos: 0,
        observacao: ''
      });
      fetchParcelas();
    } catch (error: any) {
      toast({ title: 'Erro ao dar baixa', description: error?.message || 'Erro desconhecido', variant: 'destructive' });
    }
  };

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
    const fornecedorPfIds = [...new Set(allContas.map(c => c.fornecedor_pf_id).filter(Boolean))];
    const categoriaIds  = [...new Set(allContas.map(c => c.categoria_id).filter(Boolean))];
    const filialIds     = [...new Set(allContas.map(c => c.filial_id).filter(Boolean))];

    let fornecedoresData: any[] = [];
    for (let i = 0; i < fornecedorIds.length; i += 1000) {
      const batch = fornecedorIds.slice(i, i + 1000);
      const { data } = await supabase.from('pessoas_juridicas').select('id, nome_fantasia, razao_social').in('id', batch);
      if (data) fornecedoresData = [...fornecedoresData, ...data];
    }

    let fornecedoresPfData: any[] = [];
    for (let i = 0; i < fornecedorPfIds.length; i += 1000) {
      const batch = fornecedorPfIds.slice(i, i + 1000);
      const { data } = await supabase.from('pessoas_fisicas').select('id, nome_completo').in('id', batch);
      if (data) fornecedoresPfData = [...fornecedoresPfData, ...data];
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
      const fornecedorPf = fornecedoresPfData.find((f: any) => f.id === conta?.fornecedor_pf_id);
      const categoria = categoriasData.find((c: any) => c.id === conta?.categoria_id);
      const filial = filiaisData.find((f: any) => f.id === conta?.filial_id);
      
      // Prioriza PJ, depois PF
      const nomeFornecedor = fornecedor?.nome_fantasia || fornecedor?.razao_social || 
                             fornecedorPf?.nome_completo || 'N/A';
      
      return {
        id: parcela.id,
        conta_id: parcela.conta_id,
        numero_parcela: parcela.numero_parcela || parcela.parcela_num || 1,
        num_parcelas: conta?.num_parcelas || conta?.qtd_parcelas || 1,
        valor_parcela_centavos: parcela.valor_parcela_centavos,
        vencimento: parcela.vencimento,
        pago: parcela.pago,
        pago_em: parcela.pago_em || null,
        descricao: conta?.descricao || 'N/A',
        fornecedor: nomeFornecedor,
        fornecedor_id: conta?.fornecedor_id || null,
        fornecedor_pf_id: conta?.fornecedor_pf_id || null,
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
    // Busca PJs
    const { data: pjData } = await supabase
      .from('pessoas_juridicas')
      .select('id, nome_fantasia, razao_social');
    
    // Busca PFs
    const { data: pfData } = await supabase
      .from('pessoas_fisicas')
      .select('id, nome_completo');
    
    const fornecedoresPJ = (pjData || []).map(f => ({ ...f, tipo: 'PJ' as const }));
    const fornecedoresPF = (pfData || []).map(f => ({ ...f, tipo: 'PF' as const }));
    
    setFornecedores([...fornecedoresPJ, ...fornecedoresPF]);
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
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        const fornecedorStr = p.fornecedor.toLowerCase();
        const descricaoStr = p.descricao.toLowerCase();
        const numeroNotaStr = p.numero_nota.toLowerCase();
        const categoriaStr = p.categoria.toLowerCase();
        const filialStr = p.filial.toLowerCase();
        const valorStr = (p.valor_parcela_centavos / 100).toFixed(2).replace('.', ',');
        const parcelaStr = `${p.numero_parcela}/${p.num_parcelas}`;
        const vencimentoStr = parseLocalDate(p.vencimento).toLocaleDateString('pt-BR');
        
        const match = 
          fornecedorStr.includes(searchLower) ||
          descricaoStr.includes(searchLower) ||
          numeroNotaStr.includes(searchLower) ||
          categoriaStr.includes(searchLower) ||
          filialStr.includes(searchLower) ||
          valorStr.includes(searchLower) ||
          parcelaStr.includes(searchLower) ||
          vencimentoStr.includes(searchLower);
        
        if (!match) return false;
      }
      if (filterFornecedor.length > 0) {
        const fornecedorMatch = filterFornecedor.some(f => {
          const [tipo, id] = f.split('-');
          const fornecedorIdNum = parseInt(id);
          if (tipo === 'PJ') return p.fornecedor_id === fornecedorIdNum;
          if (tipo === 'PF') return p.fornecedor_pf_id === fornecedorIdNum;
          return false;
        });
        if (!fornecedorMatch) return false;
      }
      if (filterFilial.length > 0 && !filterFilial.includes(p.filial_id?.toString() || '')) return false;
      if (filterCategoria.length > 0 && !filterCategoria.includes(p.categoria_id?.toString() || '')) return false;

      if (filterStatus.length > 0) {
        const hoje = new Date(); hoje.setHours(0,0,0,0);
        const dataVencimento = parseLocalDate(p.vencimento); dataVencimento.setHours(0,0,0,0);
        const seteDiasDepois = new Date(hoje); seteDiasDepois.setDate(hoje.getDate() + 7);
        
        const statusMatch = filterStatus.some(status => {
          if (status === 'pago') return p.pago;
          if (status === 'pendente') return !p.pago;
          if (status === 'vencido') return !p.pago && dataVencimento < hoje;
          if (status === 'a_vencer') return !p.pago && dataVencimento >= hoje;
          if (status === 'vence_7_dias') return !p.pago && dataVencimento >= hoje && dataVencimento <= seteDiasDepois;
          return false;
        });
        if (!statusMatch) return false;
      }

      if (filterValorMin && p.valor_parcela_centavos < parseFloat(filterValorMin) * 100) return false;
      if (filterValorMax && p.valor_parcela_centavos > parseFloat(filterValorMax) * 100) return false;
      
      // Filtro de valor exato (pesquisa parcial no valor formatado)
      if (filterValorExato) {
        const valorFormatado = (p.valor_parcela_centavos / 100).toFixed(2).replace('.', ',');
        const valorSemVirgula = (p.valor_parcela_centavos / 100).toFixed(2);
        const searchValor = filterValorExato.replace(',', '.');
        if (!valorFormatado.includes(filterValorExato) && !valorSemVirgula.includes(searchValor)) {
          return false;
        }
      }

      if (filterDataVencimentoInicio) {
        const dataVenc = parseLocalDate(p.vencimento);
        if (dataVenc < filterDataVencimentoInicio) return false;
      }
      if (filterDataVencimentoFim) {
        const dataVenc = parseLocalDate(p.vencimento);
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
    filterStatus, filterValorMin, filterValorMax, filterValorExato,
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
    filterValorMin, filterValorMax, filterValorExato, filterDataVencimentoInicio, filterDataVencimentoFim
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

  const handleDuplicarConta = async (contaId: number) => {
    if (!confirm('Deseja duplicar esta conta?')) return;
    try {
      const { data: contaOriginal, error: fetchError } = await supabase
        .from('contas_pagar')
        .select('*')
        .eq('id', contaId)
        .single();

      if (fetchError) throw fetchError;

      const { descricao, valor_total_centavos, fornecedor_id, fornecedor_pf_id, categoria_id, 
              filial_id, num_parcelas, referencia, numero_nota, chave_nfe } = contaOriginal;

      const { data: novaConta, error: insertError } = await supabase
        .from('contas_pagar')
        .insert({
          descricao: `${descricao} (cópia)`,
          valor_total_centavos,
          fornecedor_id,
          fornecedor_pf_id,
          categoria_id,
          filial_id,
          num_parcelas: num_parcelas || 1,
          referencia: referencia ? `${referencia}-COPIA` : null,
          numero_nota,
          chave_nfe
        })
        .select()
        .single();

      if (insertError) throw insertError;

      const { data: parcelasOriginais } = await supabase
        .from('contas_pagar_parcelas')
        .select('*')
        .eq('conta_id', contaId)
        .order('numero_parcela');

      if (parcelasOriginais && parcelasOriginais.length > 0) {
        const novasParcelas = parcelasOriginais.map(p => ({
          conta_id: novaConta.id,
          parcela_num: p.parcela_num || p.numero_parcela || 1,
          valor_parcela_centavos: p.valor_parcela_centavos,
          vencimento: p.vencimento,
          pago: false
        }));

        await supabase.from('contas_pagar_parcelas').insert(novasParcelas);
      }

      toast({ title: 'Conta duplicada com sucesso!' });
      fetchParcelas();
    } catch (error: any) {
      toast({ title: 'Erro ao duplicar', description: error?.message || '', variant: 'destructive' });
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
        .update({ 
          pago: false, 
          pago_em: null,
          forma_pagamento_id: null,
          conta_bancaria_id: null,
          valor_pago_centavos: null,
          observacao: null
        })
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
  const formatDate = (dateString: string) => parseLocalDate(dateString).toLocaleDateString('pt-BR');
  const getStatusBadge = (vencimento: string, pago: boolean) => {
    if (pago) return <Badge className="bg-green-500">Pago</Badge>;
    const hoje = new Date(); hoje.setHours(0,0,0,0); const dv = parseLocalDate(vencimento);
    if (dv < hoje) return <Badge variant="destructive">Vencido</Badge>;
    if (dv <= new Date(hoje.getTime() + 7 * 24 * 60 * 60 * 1000)) return <Badge variant="outline">Vence em 7 dias</Badge>;
    return <Badge variant="default">Pendente</Badge>;
  };

  const clearFilters = () => {
    setSearchTerm(''); setFilterFornecedor([]); setFilterFilial([]); setFilterCategoria([]); setFilterStatus([]);
    setFilterValorMin(''); setFilterValorMax(''); setFilterValorExato(''); setFilterDataVencimentoInicio(null); setFilterDataVencimentoFim(null);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div><h1 className="text-3xl font-bold tracking-tight">Contas a Pagar</h1><p className="text-muted-foreground">Carregando...</p></div>
      </div>
    );
  }

  const handleXMLImport = async (files: FileList | File[]) => {
    const xmlFiles = Array.from(files).filter(f => f.name.toLowerCase().endsWith('.xml'));
    if (xmlFiles.length === 0) {
      toast({ title: "Arquivo inválido", description: "Selecione apenas arquivos XML.", variant: "destructive" });
      return;
    }
    await importFiles(xmlFiles);
    fetchAllData(); // Recarregar dados após importação
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files.length > 0) {
      handleXMLImport(e.dataTransfer.files);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  return (
    <div className="space-y-6">
      {/* Campo rápido de importação de XML */}
      <div
        className={`border-2 border-dashed rounded-lg p-4 transition-colors ${
          isDragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50'
        } ${xmlProcessing ? 'pointer-events-none opacity-60' : ''}`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        <div className="flex items-center justify-center gap-4">
          {xmlProcessing ? (
            <div className="flex items-center gap-3 w-full max-w-md">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              <div className="flex-1">
                <p className="text-sm font-medium">Importando XMLs...</p>
                <Progress value={xmlProgress} className="h-2 mt-1" />
              </div>
            </div>
          ) : (
            <>
              <Upload className="h-5 w-5 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Arraste arquivos XML aqui ou{' '}
                <label className="text-primary hover:underline cursor-pointer">
                  clique para selecionar
                  <input
                    type="file"
                    accept=".xml"
                    multiple
                    className="hidden"
                    onChange={(e) => e.target.files && handleXMLImport(e.target.files)}
                  />
                </label>
              </p>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </>
          )}
        </div>
      </div>

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
              <div className="relative max-w-[160px]">
                <Input
                  type="text"
                  placeholder="Pesquisar valor..."
                  value={filterValorExato}
                  onChange={(e) => setFilterValorExato(e.target.value)}
                  className="pl-3"
                />
              </div>
              <Button variant="outline" onClick={() => setShowFilters(!showFilters)}>
                <Filter className="h-4 w-4 mr-2" />
                Filtros {[
                  filterFornecedor.length > 0, filterFilial.length > 0, filterCategoria.length > 0, filterStatus.length > 0,
                  filterValorMin, filterValorMax, filterDataVencimentoInicio, filterDataVencimentoFim
                ].filter(Boolean).length > 0 && `(${
                  [filterFornecedor.length > 0, filterFilial.length > 0, filterCategoria.length > 0, filterStatus.length > 0,
                   filterValorMin, filterValorMax, filterDataVencimentoInicio, filterDataVencimentoFim].filter(Boolean).length
                })`}
              </Button>
              {(
                filterFornecedor.length > 0 || filterFilial.length > 0 || filterCategoria.length > 0 || filterStatus.length > 0 ||
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
              <div className="space-y-2">
                <Label>Fornecedor ({filterFornecedor.length} selecionados)</Label>
                <ScrollArea className="h-[200px] border rounded-md p-2 bg-background">
                  {fornecedores.map(f => {
                    const value = `${f.tipo}-${f.id}`;
                    return (
                      <div key={value} className="flex items-center space-x-2 py-1.5">
                        <Checkbox
                          id={`fornecedor-${value}`}
                          checked={filterFornecedor.includes(value)}
                          onCheckedChange={(checked) => {
                            setFilterFornecedor(prev => 
                              checked ? [...prev, value] : prev.filter(v => v !== value)
                            );
                          }}
                        />
                        <label htmlFor={`fornecedor-${value}`} className="text-sm cursor-pointer flex-1">
                          {f.tipo === 'PJ' ? (f.nome_fantasia || f.razao_social) : f.nome_completo} ({f.tipo})
                        </label>
                      </div>
                    );
                  })}
                </ScrollArea>
              </div>
              <div className="space-y-2">
                <Label>Filial ({filterFilial.length} selecionadas)</Label>
                <ScrollArea className="h-[200px] border rounded-md p-2 bg-background">
                  {filiais.map(f => (
                    <div key={f.id} className="flex items-center space-x-2 py-1.5">
                      <Checkbox
                        id={`filial-${f.id}`}
                        checked={filterFilial.includes(f.id.toString())}
                        onCheckedChange={(checked) => {
                          setFilterFilial(prev => 
                            checked ? [...prev, f.id.toString()] : prev.filter(v => v !== f.id.toString())
                          );
                        }}
                      />
                      <label htmlFor={`filial-${f.id}`} className="text-sm cursor-pointer flex-1">
                        {f.nome}
                      </label>
                    </div>
                  ))}
                </ScrollArea>
              </div>
              <div className="space-y-2">
                <Label>Categoria ({filterCategoria.length} selecionadas)</Label>
                <ScrollArea className="h-[200px] border rounded-md p-2 bg-background">
                  {categorias.map(c => (
                    <div key={c.id} className="flex items-center space-x-2 py-1.5">
                      <Checkbox
                        id={`categoria-${c.id}`}
                        checked={filterCategoria.includes(c.id.toString())}
                        onCheckedChange={(checked) => {
                          setFilterCategoria(prev => 
                            checked ? [...prev, c.id.toString()] : prev.filter(v => v !== c.id.toString())
                          );
                        }}
                      />
                      <label htmlFor={`categoria-${c.id}`} className="text-sm cursor-pointer flex-1">
                        {c.nome}
                      </label>
                    </div>
                  ))}
                </ScrollArea>
              </div>
              <div className="space-y-2">
                <Label>Status ({filterStatus.length} selecionados)</Label>
                <div className="border rounded-md p-2 bg-background space-y-1.5">
                  {[
                    { value: 'a_vencer', label: 'A Vencer' },
                    { value: 'vence_7_dias', label: 'Vence em até 7 dias' },
                    { value: 'vencido', label: 'Vencidas' },
                    { value: 'pago', label: 'Pagas' },
                    { value: 'pendente', label: 'Pendentes' }
                  ].map(status => (
                    <div key={status.value} className="flex items-center space-x-2 py-1.5">
                      <Checkbox
                        id={`status-${status.value}`}
                        checked={filterStatus.includes(status.value)}
                        onCheckedChange={(checked) => {
                          setFilterStatus(prev => 
                            checked ? [...prev, status.value] : prev.filter(v => v !== status.value)
                          );
                        }}
                      />
                      <label htmlFor={`status-${status.value}`} className="text-sm cursor-pointer flex-1">
                        {status.label}
                      </label>
                    </div>
                  ))}
                </div>
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
            <>
              {/* Card de soma total */}
              <Card className="mb-4 border-primary/50 bg-primary/5">
                <CardContent className="py-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">
                        {selectedParcelas.length} {selectedParcelas.length === 1 ? 'parcela selecionada' : 'parcelas selecionadas'}
                      </p>
                      <p className="text-3xl font-bold text-primary">
                        {(() => {
                          const total = filteredAndSortedParcelas
                            .filter(p => selectedParcelas.includes(p.id))
                            .reduce((acc, p) => acc + p.valor_parcela_centavos, 0);
                          return formatCurrency(total);
                        })()}
                      </p>
                    </div>
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      onClick={() => setSelectedParcelas([])}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <X className="h-4 w-4 mr-2" />
                      Limpar seleção
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Barra de ações */}
              <div className="flex items-center gap-2 mb-4 p-3 bg-muted rounded-lg">
                <div className="flex-1" />
                <Button size="sm" variant="outline" onClick={() => setShowEditMassModal(true)}>
                  <Edit className="h-4 w-4 mr-2" />
                  Editar em Massa ({selectedParcelas.length})
                </Button>
                <Button size="sm" onClick={() => {
                  // Inicializar todos os campos com valores padrão
                  const hoje = new Date();
                  const contaBancariaDefault = '13'; // Digital Kids Mercado Pago
                  const formaPagamentoDefault = '4'; // Boleto
                  
                  const initialPaymentData: typeof paymentData = {};
                  const selecionadas = filteredAndSortedParcelas.filter(p => selectedParcelas.includes(p.id));
                  
                  selecionadas.forEach(parcela => {
                    initialPaymentData[parcela.id] = {
                      data_pagamento: hoje,
                      conta_bancaria_id: contaBancariaDefault,
                      forma_pagamento_id: formaPagamentoDefault,
                      codigo_identificador: '',
                      valor_original_centavos: parcela.valor_parcela_centavos,
                      valor_pago_centavos: parcela.valor_parcela_centavos,
                      desconto_percentual: 0
                    };
                  });
                  
                  setPaymentData(initialPaymentData);
                  setShowPaymentModal(true);
                }}>
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
            </>
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
                  {visibleColumns.numero_nota && (
                    <TableHead onClick={() => handleSort('numero_nota')} className="cursor-pointer">
                      Nº Nota Fiscal <ArrowUpDown className="inline h-4 w-4" />
                    </TableHead>
                  )}
                  {visibleColumns.categoria && (
                    <TableHead onClick={() => handleSort('categoria')} className="cursor-pointer">
                      Categoria <ArrowUpDown className="inline h-4 w-4" />
                    </TableHead>
                  )}
                  {visibleColumns.filial && (
                    <TableHead onClick={() => handleSort('filial')} className="cursor-pointer">
                      Filial <ArrowUpDown className="inline h-4 w-4" />
                    </TableHead>
                  )}
                  {visibleColumns.valor_parcela && (
                    <TableHead onClick={() => handleSort('valor_parcela_centavos')} className="cursor-pointer">
                      Valor <ArrowUpDown className="inline h-4 w-4" />
                    </TableHead>
                  )}
                  {visibleColumns.parcela && (
                    <TableHead onClick={() => handleSort('numero_parcela')} className="cursor-pointer">
                      Parcela <ArrowUpDown className="inline h-4 w-4" />
                    </TableHead>
                  )}
                  {visibleColumns.vencimento && (
                    <TableHead onClick={() => handleSort('vencimento')} className="cursor-pointer">
                      Vencimento <ArrowUpDown className="inline h-4 w-4" />
                    </TableHead>
                  )}
                  {visibleColumns.data_pagamento && (
                    <TableHead onClick={() => handleSort('pago_em')} className="cursor-pointer">
                      Data Pagamento <ArrowUpDown className="inline h-4 w-4" />
                    </TableHead>
                  )}
                  {visibleColumns.status && (
                    <TableHead onClick={() => handleSort('pago')} className="cursor-pointer">
                      Status <ArrowUpDown className="inline h-4 w-4" />
                    </TableHead>
                  )}
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
                      {visibleColumns.data_pagamento && (
                        <TableCell>
                          {parcela.pago && parcela.pago_em ? (
                            <span className="text-sm">{formatDate(parcela.pago_em)}</span>
                          ) : (
                            <span className="text-muted-foreground text-sm">-</span>
                          )}
                        </TableCell>
                      )}
                      {visibleColumns.status && <TableCell>{getStatusBadge(parcela.vencimento, parcela.pago)}</TableCell>}
                      {visibleColumns.acoes && (
                        <TableCell>
                          <div className="flex gap-1">
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
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDuplicarConta(parcela.conta_id);
                              }}
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                          </div>
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
                    <div className="flex items-center justify-between mb-1">
                      <Label>Data de Pagamento</Label>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="h-6 px-2 text-xs"
                        onClick={() => {
                          const currentDate = paymentData[parcela.id]?.data_pagamento;
                          if (!currentDate) return;
                          const updatedData: typeof paymentData = {};
                          selectedParcelas.forEach(id => {
                            updatedData[id] = {
                              ...paymentData[id],
                              data_pagamento: currentDate,
                              conta_bancaria_id: paymentData[id]?.conta_bancaria_id || '',
                              forma_pagamento_id: paymentData[id]?.forma_pagamento_id || '',
                              codigo_identificador: paymentData[id]?.codigo_identificador || '',
                              valor_original_centavos: paymentData[id]?.valor_original_centavos || filteredAndSortedParcelas.find(p => p.id === id)?.valor_parcela_centavos || 0,
                              valor_pago_centavos: paymentData[id]?.valor_pago_centavos || filteredAndSortedParcelas.find(p => p.id === id)?.valor_parcela_centavos || 0,
                              desconto_percentual: paymentData[id]?.desconto_percentual || 0
                            };
                          });
                          setPaymentData(updatedData);
                          toast({ title: 'Data aplicada a todos' });
                        }}
                      >
                        Aplicar a todos
                      </Button>
                    </div>
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
                              valor_pago_centavos: paymentData[parcela.id]?.valor_pago_centavos || parcela.valor_parcela_centavos,
                              desconto_percentual: paymentData[parcela.id]?.desconto_percentual || 0
                            }
                          })}
                          className="pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <Label>Banco Pagador</Label>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="h-6 px-2 text-xs"
                        onClick={() => {
                          const currentBank = paymentData[parcela.id]?.conta_bancaria_id;
                          if (!currentBank) return;
                          const updatedData: typeof paymentData = {};
                          selectedParcelas.forEach(id => {
                            updatedData[id] = {
                              ...paymentData[id],
                              conta_bancaria_id: currentBank,
                              data_pagamento: paymentData[id]?.data_pagamento || null,
                              forma_pagamento_id: paymentData[id]?.forma_pagamento_id || '',
                              codigo_identificador: paymentData[id]?.codigo_identificador || '',
                              valor_original_centavos: paymentData[id]?.valor_original_centavos || filteredAndSortedParcelas.find(p => p.id === id)?.valor_parcela_centavos || 0,
                              valor_pago_centavos: paymentData[id]?.valor_pago_centavos || filteredAndSortedParcelas.find(p => p.id === id)?.valor_parcela_centavos || 0,
                              desconto_percentual: paymentData[id]?.desconto_percentual || 0
                            };
                          });
                          setPaymentData(updatedData);
                          toast({ title: 'Banco aplicado a todos' });
                        }}
                      >
                        Aplicar a todos
                      </Button>
                    </div>
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
                            valor_pago_centavos: paymentData[parcela.id]?.valor_pago_centavos || parcela.valor_parcela_centavos,
                            desconto_percentual: paymentData[parcela.id]?.desconto_percentual || 0
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
                    <div className="flex items-center justify-between mb-1">
                      <Label>Forma de Pagamento</Label>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="h-6 px-2 text-xs"
                        onClick={() => {
                          const currentPaymentMethod = paymentData[parcela.id]?.forma_pagamento_id;
                          if (!currentPaymentMethod) return;
                          const updatedData: typeof paymentData = {};
                          selectedParcelas.forEach(id => {
                            updatedData[id] = {
                              ...paymentData[id],
                              forma_pagamento_id: currentPaymentMethod,
                              data_pagamento: paymentData[id]?.data_pagamento || null,
                              conta_bancaria_id: paymentData[id]?.conta_bancaria_id || '',
                              codigo_identificador: paymentData[id]?.codigo_identificador || '',
                              valor_original_centavos: paymentData[id]?.valor_original_centavos || filteredAndSortedParcelas.find(p => p.id === id)?.valor_parcela_centavos || 0,
                              valor_pago_centavos: paymentData[id]?.valor_pago_centavos || filteredAndSortedParcelas.find(p => p.id === id)?.valor_parcela_centavos || 0,
                              desconto_percentual: paymentData[id]?.desconto_percentual || 0
                            };
                          });
                          setPaymentData(updatedData);
                          toast({ title: 'Forma de pagamento aplicada a todos' });
                        }}
                      >
                        Aplicar a todos
                      </Button>
                    </div>
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
                            valor_pago_centavos: paymentData[parcela.id]?.valor_pago_centavos || parcela.valor_parcela_centavos,
                            desconto_percentual: paymentData[parcela.id]?.desconto_percentual || 0
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
                          valor_pago_centavos: paymentData[parcela.id]?.valor_pago_centavos || parcela.valor_parcela_centavos,
                          desconto_percentual: paymentData[parcela.id]?.desconto_percentual || 0
                        }
                      })}
                    />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <Label>Desconto (%)</Label>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="h-6 px-2 text-xs"
                        onClick={() => {
                          const currentDesconto = paymentData[parcela.id]?.desconto_percentual;
                          if (currentDesconto === undefined) return;
                          const updatedData: typeof paymentData = {};
                          selectedParcelas.forEach(id => {
                            const parcelaAtual = filteredAndSortedParcelas.find(p => p.id === id);
                            const valorOriginal = paymentData[id]?.valor_original_centavos || parcelaAtual?.valor_parcela_centavos || 0;
                            const valorComDesconto = Math.round(valorOriginal * (1 - currentDesconto / 100));
                            updatedData[id] = {
                              ...paymentData[id],
                              data_pagamento: paymentData[id]?.data_pagamento || null,
                              conta_bancaria_id: paymentData[id]?.conta_bancaria_id || '',
                              forma_pagamento_id: paymentData[id]?.forma_pagamento_id || '',
                              codigo_identificador: paymentData[id]?.codigo_identificador || '',
                              valor_original_centavos: valorOriginal,
                              valor_pago_centavos: valorComDesconto,
                              desconto_percentual: currentDesconto
                            };
                          });
                          setPaymentData(updatedData);
                          toast({ title: 'Desconto aplicado a todos' });
                        }}
                      >
                        Aplicar a todos
                      </Button>
                    </div>
                    <Input
                      type="number"
                      placeholder="0"
                      min="0"
                      max="100"
                      step="0.01"
                      value={paymentData[parcela.id]?.desconto_percentual || 0}
                      onChange={(e) => {
                        const desconto = parseFloat(e.target.value) || 0;
                        const valorOriginal = paymentData[parcela.id]?.valor_original_centavos || parcela.valor_parcela_centavos;
                        const valorComDesconto = Math.round(valorOriginal * (1 - desconto / 100));
                        setPaymentData({
                          ...paymentData,
                          [parcela.id]: {
                            data_pagamento: paymentData[parcela.id]?.data_pagamento || null,
                            conta_bancaria_id: paymentData[parcela.id]?.conta_bancaria_id || '',
                            forma_pagamento_id: paymentData[parcela.id]?.forma_pagamento_id || '',
                            codigo_identificador: paymentData[parcela.id]?.codigo_identificador || '',
                            valor_original_centavos: valorOriginal,
                            valor_pago_centavos: valorComDesconto,
                            desconto_percentual: desconto
                          }
                        });
                      }}
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
                      onValueChange={(valorCentavos) => {
                        const valorOriginal = paymentData[parcela.id]?.valor_original_centavos || parcela.valor_parcela_centavos;
                        const novoDesconto = ((valorOriginal - valorCentavos) / valorOriginal) * 100;
                        setPaymentData({
                          ...paymentData,
                          [parcela.id]: {
                            data_pagamento: paymentData[parcela.id]?.data_pagamento || null,
                            conta_bancaria_id: paymentData[parcela.id]?.conta_bancaria_id || '',
                            forma_pagamento_id: paymentData[parcela.id]?.forma_pagamento_id || '',
                            codigo_identificador: paymentData[parcela.id]?.codigo_identificador || '',
                            valor_original_centavos: valorOriginal,
                            valor_pago_centavos: valorCentavos,
                            desconto_percentual: novoDesconto > 0 ? novoDesconto : 0
                          }
                        });
                      }}
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
              <div>
                <span className="text-sm text-muted-foreground">Desconto Total:</span>
                <span className={`ml-2 font-bold ${
                  (() => {
                    const totalOriginal = filteredAndSortedParcelas.filter(p => selectedParcelas.includes(p.id)).reduce((acc, p) => acc + (paymentData[p.id]?.valor_original_centavos || p.valor_parcela_centavos), 0);
                    const totalPago = filteredAndSortedParcelas.filter(p => selectedParcelas.includes(p.id)).reduce((acc, p) => acc + (paymentData[p.id]?.valor_pago_centavos || p.valor_parcela_centavos), 0);
                    return totalPago < totalOriginal ? 'text-orange-600' : 'text-muted-foreground';
                  })()
                }`}>
                  {(() => {
                    const totalOriginal = filteredAndSortedParcelas.filter(p => selectedParcelas.includes(p.id)).reduce((acc, p) => acc + (paymentData[p.id]?.valor_original_centavos || p.valor_parcela_centavos), 0);
                    const totalPago = filteredAndSortedParcelas.filter(p => selectedParcelas.includes(p.id)).reduce((acc, p) => acc + (paymentData[p.id]?.valor_pago_centavos || p.valor_parcela_centavos), 0);
                    const percentualDesconto = totalOriginal > 0 ? ((totalOriginal - totalPago) / totalOriginal) * 100 : 0;
                    return `${percentualDesconto.toFixed(2)}%`;
                  })()}
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
              filial: true, valor_parcela: true, parcela: true, vencimento: true, data_pagamento: true, status: true, acoes: true
            })}>Restaurar Padrão</Button>
            <Button onClick={() => setShowColumnsModal(false)}>Aplicar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal DAR_BAIXA (IA) */}
      <Dialog open={showDarBaixaModal} onOpenChange={(open) => {
        setShowDarBaixaModal(open);
        if (!open) {
          setDarBaixaData(null);
          setParcelasCorrespondentes([]);
          setParcelaSelecionadaBaixa(null);
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Check className="h-5 w-5 text-green-500" />
              Dar Baixa - Comprovante Identificado
            </DialogTitle>
            <CardDescription>
              A IA identificou um comprovante de pagamento. Selecione a parcela correspondente.
            </CardDescription>
          </DialogHeader>
          
          <ScrollArea className="max-h-[60vh]">
            <div className="space-y-4 p-1">
              {/* Dados extraídos pela IA */}
              {darBaixaData && (
                <Card className="bg-blue-50 dark:bg-blue-950 border-blue-200">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Dados Extraídos pela IA</CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-2 gap-2 text-sm">
                    {darBaixaData.conta_pagar.fornecedor_nome_sugerido && (
                      <div>
                        <span className="text-muted-foreground">Fornecedor:</span>
                        <span className="ml-2 font-medium">{darBaixaData.conta_pagar.fornecedor_nome_sugerido}</span>
                      </div>
                    )}
                    {darBaixaData.conta_pagar.valor_total_centavos && (
                      <div>
                        <span className="text-muted-foreground">Valor:</span>
                        <span className="ml-2 font-medium">{formatCurrency(darBaixaData.conta_pagar.valor_total_centavos)}</span>
                      </div>
                    )}
                    {darBaixaData.conta_pagar.valor_final_centavos && darBaixaData.conta_pagar.valor_final_centavos !== darBaixaData.conta_pagar.valor_total_centavos && (
                      <div>
                        <span className="text-muted-foreground">Valor Pago:</span>
                        <span className="ml-2 font-medium text-green-600">{formatCurrency(darBaixaData.conta_pagar.valor_final_centavos)}</span>
                      </div>
                    )}
                    {darBaixaData.conta_pagar.juros_centavos && darBaixaData.conta_pagar.juros_centavos > 0 && (
                      <div>
                        <span className="text-muted-foreground">Juros:</span>
                        <span className="ml-2 font-medium text-red-600">+{formatCurrency(darBaixaData.conta_pagar.juros_centavos)}</span>
                      </div>
                    )}
                    {darBaixaData.conta_pagar.desconto_centavos && darBaixaData.conta_pagar.desconto_centavos > 0 && (
                      <div>
                        <span className="text-muted-foreground">Desconto:</span>
                        <span className="ml-2 font-medium text-green-600">-{formatCurrency(darBaixaData.conta_pagar.desconto_centavos)}</span>
                      </div>
                    )}
                    {darBaixaData.observacao_ia && (
                      <div className="col-span-2">
                        <span className="text-muted-foreground">Observação IA:</span>
                        <span className="ml-2 italic">{darBaixaData.observacao_ia}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Lista de parcelas correspondentes */}
              <div className="space-y-2">
                <Label className="text-base font-semibold">Parcelas Correspondentes ({parcelasCorrespondentes.length})</Label>
                {parcelasCorrespondentes.map((parcela) => (
                  <Card 
                    key={parcela.id} 
                    className={`cursor-pointer transition-all ${
                      parcelaSelecionadaBaixa === parcela.id 
                        ? 'ring-2 ring-primary bg-primary/5' 
                        : 'hover:bg-muted/50'
                    }`}
                    onClick={() => {
                      setParcelaSelecionadaBaixa(parcela.id);
                      setBaixaFormData(prev => ({
                        ...prev,
                        valor_pago_centavos: darBaixaData?.conta_pagar.valor_final_centavos || 
                                             darBaixaData?.conta_pagar.valor_total_centavos || 
                                             parcela.valor_parcela_centavos
                      }));
                    }}
                  >
                    <CardContent className="p-3 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Checkbox 
                          checked={parcelaSelecionadaBaixa === parcela.id}
                          onCheckedChange={() => setParcelaSelecionadaBaixa(parcela.id)}
                        />
                        <div>
                          <p className="font-medium">{parcela.fornecedor}</p>
                          <p className="text-sm text-muted-foreground">{parcela.descricao}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">{formatCurrency(parcela.valor_parcela_centavos)}</p>
                        <p className="text-sm text-muted-foreground">Venc: {formatDate(parcela.vencimento)}</p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {parcelasCorrespondentes.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Nenhuma parcela correspondente encontrada
                  </p>
                )}
              </div>

              {/* Formulário de pagamento */}
              {parcelaSelecionadaBaixa && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Dados do Pagamento</CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Data do Pagamento</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className="w-full justify-start text-left">
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {format(baixaFormData.data_pagamento, 'dd/MM/yyyy')}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar
                            mode="single"
                            selected={baixaFormData.data_pagamento}
                            onSelect={(date) => date && setBaixaFormData(prev => ({ ...prev, data_pagamento: date }))}
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                    <div>
                      <Label>Forma de Pagamento *</Label>
                      <Select 
                        value={baixaFormData.forma_pagamento_id} 
                        onValueChange={(v) => setBaixaFormData(prev => ({ ...prev, forma_pagamento_id: v }))}
                      >
                        <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                        <SelectContent>
                          {formasPagamento.map(f => (
                            <SelectItem key={f.id} value={f.id.toString()}>{f.nome}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Conta Bancária</Label>
                      <Select 
                        value={baixaFormData.conta_bancaria_id} 
                        onValueChange={(v) => setBaixaFormData(prev => ({ ...prev, conta_bancaria_id: v }))}
                      >
                        <SelectTrigger><SelectValue placeholder="Opcional" /></SelectTrigger>
                        <SelectContent>
                          {contasBancarias.map(c => (
                            <SelectItem key={c.id} value={c.id.toString()}>{c.nome_conta} ({c.banco})</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Valor Pago</Label>
                      <CurrencyInput
                        value={baixaFormData.valor_pago_centavos}
                        onValueChange={(v) => setBaixaFormData(prev => ({ ...prev, valor_pago_centavos: v }))}
                        placeholder="0,00"
                      />
                    </div>
                    <div className="col-span-2">
                      <Label>Observação</Label>
                      <Textarea
                        value={baixaFormData.observacao}
                        onChange={(e) => setBaixaFormData(prev => ({ ...prev, observacao: e.target.value }))}
                        placeholder="Observações sobre o pagamento..."
                      />
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </ScrollArea>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => {
              setShowDarBaixaModal(false);
              // Se não der baixa, oferecer criar nova conta
              if (darBaixaData) {
                navigate('/financeiro/contas-pagar/nova', { state: { dadosImportados: darBaixaData } });
              }
            }}>
              Criar Nova Conta
            </Button>
            <Button 
              onClick={handleConfirmarBaixa} 
              disabled={!parcelaSelecionadaBaixa || !baixaFormData.forma_pagamento_id}
            >
              <Check className="h-4 w-4 mr-2" />
              Confirmar Baixa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal DAR_BAIXA LOTE (múltiplos comprovantes) */}
      <Dialog open={showBaixaLoteModal} onOpenChange={(open) => {
        if (!open && !baixaLoteProcessing) {
          setShowBaixaLoteModal(false);
          setBaixaLoteItems([]);
          setBaixaLoteFormaPagamento('');
          setBaixaLoteContaBancaria('');
        }
      }}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Check className="h-5 w-5 text-green-500" />
              Baixa em Lote - {baixaLoteItems.length} Comprovantes
            </DialogTitle>
            <CardDescription>
              Revise os comprovantes identificados. Selecione a parcela correspondente para cada um.
            </CardDescription>
          </DialogHeader>
          
          {/* Configurações globais para o lote */}
          <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
            <div>
              <Label>Forma de Pagamento *</Label>
              <Select value={baixaLoteFormaPagamento} onValueChange={setBaixaLoteFormaPagamento}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  {formasPagamento.map(f => (
                    <SelectItem key={f.id} value={f.id.toString()}>{f.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Conta Bancária</Label>
              <Select value={baixaLoteContaBancaria} onValueChange={setBaixaLoteContaBancaria}>
                <SelectTrigger><SelectValue placeholder="Opcional" /></SelectTrigger>
                <SelectContent>
                  {contasBancarias.map(c => (
                    <SelectItem key={c.id} value={c.id.toString()}>{c.nome_conta} ({c.banco})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <ScrollArea className="max-h-[50vh]">
            <div className="space-y-3">
              {baixaLoteItems.map((item, itemIndex) => {
                const temMatch = item.parcelaSelecionada !== null;
                
                return (
                  <Card key={itemIndex} className={`${temMatch ? 'border-green-300 bg-green-50/30 dark:bg-green-950/20' : 'border-yellow-300 bg-yellow-50/30 dark:bg-yellow-950/20'}`}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        {/* Info do comprovante */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <FileText className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm font-medium truncate">{item.data.fileName || `Comprovante ${itemIndex + 1}`}</span>
                            {temMatch ? (
                              <Badge variant="outline" className="bg-green-100 text-green-700 border-green-300">
                                <Check className="h-3 w-3 mr-1" /> Identificado
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="bg-yellow-100 text-yellow-700 border-yellow-300">
                                Selecione
                              </Badge>
                            )}
                          </div>
                          
                          <div className="grid grid-cols-3 gap-2 text-sm">
                            {item.data.conta_pagar.fornecedor_nome_sugerido && (
                              <div>
                                <span className="text-muted-foreground">Fornecedor:</span>
                                <span className="ml-1 font-medium">{item.data.conta_pagar.fornecedor_nome_sugerido}</span>
                              </div>
                            )}
                            <div>
                              <span className="text-muted-foreground">Valor:</span>
                              <span className="ml-1 font-medium">
                                {formatCurrency(item.data.conta_pagar.valor_final_centavos || item.data.conta_pagar.valor_total_centavos || 0)}
                              </span>
                            </div>
                            {item.data.conta_pagar.data_pagamento && (
                              <div>
                                <span className="text-muted-foreground">Data:</span>
                                <span className="ml-1">{formatDate(item.data.conta_pagar.data_pagamento)}</span>
                              </div>
                            )}
                          </div>
                        </div>
                        
                        {/* Seletor de parcela */}
                        <div className="w-80">
                          <Select 
                            value={item.parcelaSelecionada?.toString() || ''} 
                            onValueChange={(v) => handleLoteItemSelect(itemIndex, v ? parseInt(v) : null)}
                          >
                            <SelectTrigger className={temMatch ? 'border-green-400' : 'border-yellow-400'}>
                              <SelectValue placeholder="Selecione a parcela..." />
                            </SelectTrigger>
                            <SelectContent>
                              {item.parcelasCorrespondentes.length === 0 ? (
                                <div className="p-2 text-sm text-muted-foreground">Nenhuma correspondência</div>
                              ) : (
                                item.parcelasCorrespondentes.map(parcela => (
                                  <SelectItem key={parcela.id} value={parcela.id.toString()}>
                                    <div className="flex justify-between gap-4 w-full">
                                      <span className="truncate">{parcela.fornecedor}</span>
                                      <span className="font-medium">{formatCurrency(parcela.valor_parcela_centavos)}</span>
                                      <span className="text-muted-foreground">{formatDate(parcela.vencimento)}</span>
                                    </div>
                                  </SelectItem>
                                ))
                              )}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </ScrollArea>

          <DialogFooter className="gap-2">
            <div className="flex-1 text-sm text-muted-foreground">
              {baixaLoteItems.filter(i => i.parcelaSelecionada !== null).length} de {baixaLoteItems.length} selecionados
            </div>
            <Button variant="outline" onClick={() => setShowBaixaLoteModal(false)} disabled={baixaLoteProcessing}>
              Cancelar
            </Button>
            <Button 
              onClick={handleConfirmarBaixaLote} 
              disabled={!baixaLoteFormaPagamento || baixaLoteItems.filter(i => i.parcelaSelecionada !== null).length === 0 || baixaLoteProcessing}
            >
              {baixaLoteProcessing ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Check className="h-4 w-4 mr-2" />
              )}
              Confirmar Baixas ({baixaLoteItems.filter(i => i.parcelaSelecionada !== null).length})
            </Button>
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
