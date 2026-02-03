import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import Papa from 'papaparse';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Upload, FileSpreadsheet, Check, X, AlertTriangle, Search, Loader2, AlertCircle } from 'lucide-react';

interface ContaBancaria {
  id: number;
  nome: string;
  banco?: string;
}

interface FormaPagamento {
  id: number;
  nome: string;
}

interface ExtratoItem {
  data: string;
  descricao: string;
  valor: number;
  tipo: 'entrada' | 'saida';
  formaPagamento?: string;
  identificador?: string; // Código único do pagamento para deduplicação
  raw: Record<string, any>;
}

interface ParcelaMatch {
  parcela_id: number;
  conta_id: number;
  fornecedor: string;
  descricao: string;
  valor_parcela: number;
  vencimento: string;
  numero_parcela: number;
  total_parcelas: number;
  score: number;
  diferenca_valor: number;
  diferenca_dias: number;
  ja_pago?: boolean; // Indica se a parcela já foi paga
  pago_em?: string; // Data em que foi pago
  valor_pago?: number; // Valor pago anteriormente (para mostrar quando já pago)
  observacao_pagamento?: string; // Observação do pagamento anterior
}

interface ReconciliacaoItem {
  extrato: ExtratoItem;
  matches: ParcelaMatch[];
  selectedMatch: ParcelaMatch | null;
  confirmed: boolean;
  substituirPagamento?: boolean; // Se true, substitui o pagamento existente
  identificadorDuplicado?: boolean; // Se o identificador já existe no sistema
}

type FiltroReconciliacao = 'todos' | 'selecionados' | 'com_match' | 'sem_match';

interface ImportarExtratoBancarioProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}

export function ImportarExtratoBancario({ isOpen, onClose, onComplete }: ImportarExtratoBancarioProps) {
  const [step, setStep] = useState<'upload' | 'config' | 'mapping' | 'reconcile' | 'confirm'>('upload');
  const [extratoData, setExtratoData] = useState<Record<string, any>[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  
  // Configurações
  const [contaBancariaId, setContaBancariaId] = useState<string>('');
  const [formaPagamentoId, setFormaPagamentoId] = useState<string>('');
  const [toleranciaDias, setToleranciaDias] = useState<number>(10);
  const [toleranciaValor, setToleranciaValor] = useState<number>(1); // percentual
  
  // Mapeamento de colunas
  const [colData, setColData] = useState<string>('');
  const [colDescricao, setColDescricao] = useState<string>('');
  const [colValor, setColValor] = useState<string>('');
  const [colTipo, setColTipo] = useState<string>('');
  const [colFormaPagamento, setColFormaPagamento] = useState<string>('');
  const [colIdentificador, setColIdentificador] = useState<string>(''); // Coluna de identificador único
  const [valorSaidaNegativo, setValorSaidaNegativo] = useState<boolean>(true);
  
  // Dados auxiliares
  const [contasBancarias, setContasBancarias] = useState<ContaBancaria[]>([]);
  const [formasPagamento, setFormasPagamento] = useState<FormaPagamento[]>([]);
  
  // Reconciliação
  const [reconciliacoes, setReconciliacoes] = useState<ReconciliacaoItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processedCount, setProcessedCount] = useState(0);
  const [filtroReconciliacao, setFiltroReconciliacao] = useState<FiltroReconciliacao[]>(['todos']);
  const [filtrarPorNome, setFiltrarPorNome] = useState<boolean>(true); // Novo: filtro por correspondência de nome

  // Carregar dados auxiliares
  const loadAuxData = async () => {
    const [contasRes, formasRes] = await Promise.all([
      supabase.from('contas_bancarias').select('id, nome, banco'),
      supabase.from('formas_pagamento').select('id, nome')
    ]);
    
    if (contasRes.data) setContasBancarias(contasRes.data as ContaBancaria[]);
    if (formasRes.data) setFormasPagamento(formasRes.data);
  };

  React.useEffect(() => {
    if (isOpen) {
      loadAuxData();
    }
  }, [isOpen]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      encoding: 'UTF-8',
      complete: (results) => {
        if (results.data && results.data.length > 0) {
          setExtratoData(results.data as Record<string, any>[]);
          setColumns(results.meta.fields || []);
          
          // Tentar detectar colunas automaticamente
          const fields = results.meta.fields || [];
          fields.forEach(field => {
            const lower = field.toLowerCase();
            if (lower.includes('data') || lower.includes('date')) {
              setColData(field);
            }
            if (lower.includes('descri') || lower.includes('histor') || lower.includes('memo')) {
              setColDescricao(field);
            }
            if (lower.includes('valor') || lower.includes('value') || lower.includes('amount')) {
              setColValor(field);
            }
            if (lower.includes('tipo') || lower.includes('type') || lower.includes('d/c')) {
              setColTipo(field);
            }
            if (lower.includes('forma') || lower.includes('pagamento') || lower.includes('metodo') || lower.includes('payment')) {
              setColFormaPagamento(field);
            }
            if (lower.includes('identific') || lower.includes('codigo') || lower.includes('id') || lower.includes('ref')) {
              setColIdentificador(field);
            }
          });
          
          setStep('config');
          toast.success(`${results.data.length} linhas carregadas`);
        }
      },
      error: (error) => {
        toast.error('Erro ao ler arquivo: ' + error.message);
      }
    });
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx']
    },
    maxFiles: 1
  });

  const parseValue = (val: any): number => {
    if (typeof val === 'number') return val;
    if (!val) return 0;
    
    let str = String(val).trim();
    // Remove símbolos de moeda
    str = str.replace(/[R$\s]/g, '');
    // Detecta formato brasileiro (1.234,56) vs americano (1,234.56)
    if (str.includes(',') && str.includes('.')) {
      if (str.lastIndexOf(',') > str.lastIndexOf('.')) {
        // Formato brasileiro
        str = str.replace(/\./g, '').replace(',', '.');
      } else {
        // Formato americano
        str = str.replace(/,/g, '');
      }
    } else if (str.includes(',')) {
      str = str.replace(',', '.');
    }
    
    return parseFloat(str) || 0;
  };

  const parseDate = (val: any): string => {
    if (!val) return '';
    const str = String(val).trim();
    
    // Tenta diversos formatos
    const formats = [
      /^(\d{2})\/(\d{2})\/(\d{4})$/, // DD/MM/YYYY
      /^(\d{2})-(\d{2})-(\d{4})$/, // DD-MM-YYYY
      /^(\d{4})-(\d{2})-(\d{2})$/, // YYYY-MM-DD
      /^(\d{4})\/(\d{2})\/(\d{2})$/, // YYYY/MM/DD
    ];
    
    for (const format of formats) {
      const match = str.match(format);
      if (match) {
        if (format === formats[0] || format === formats[1]) {
          return `${match[3]}-${match[2]}-${match[1]}`;
        }
        if (format === formats[2]) {
          return str;
        }
        if (format === formats[3]) {
          return `${match[1]}-${match[2]}-${match[3]}`;
        }
      }
    }
    
    return str;
  };

  const processExtrato = (): ExtratoItem[] => {
    return extratoData
      .map(row => {
        const valor = parseValue(row[colValor]);
        let tipo: 'entrada' | 'saida' = 'entrada';
        
        if (colTipo && row[colTipo]) {
          const tipoVal = String(row[colTipo]).toLowerCase();
          if (tipoVal.includes('d') || tipoVal.includes('deb') || tipoVal.includes('sai')) {
            tipo = 'saida';
          }
        } else if (valorSaidaNegativo) {
          tipo = valor < 0 ? 'saida' : 'entrada';
        }

        // Extrair forma de pagamento do CSV se a coluna estiver mapeada
        let formaPagamento: string | undefined;
        if (colFormaPagamento && row[colFormaPagamento]) {
          formaPagamento = String(row[colFormaPagamento]).trim();
        }

        // Extrair identificador único se a coluna estiver mapeada
        let identificador: string | undefined;
        if (colIdentificador && row[colIdentificador]) {
          identificador = String(row[colIdentificador]).trim();
        }
        
        return {
          data: parseDate(row[colData]),
          descricao: String(row[colDescricao] || ''),
          valor: Math.abs(valor),
          tipo,
          formaPagamento,
          identificador,
          raw: row
        };
      })
      .filter(item => item.tipo === 'saida' && item.valor > 0);
  };

  // Mapear nome da forma de pagamento para ID
  const getFormaPagamentoId = (nome?: string): number | null => {
    if (!nome) return null;
    const nomeNorm = nome.toLowerCase().trim();
    
    const forma = formasPagamento.find(f => {
      const fNome = f.nome.toLowerCase();
      return fNome === nomeNorm || 
             fNome.includes(nomeNorm) || 
             nomeNorm.includes(fNome);
    });
    
    return forma?.id || null;
  };

  const buscarMatchesParcela = async (extrato: ExtratoItem, parcelasAbertas: any[]): Promise<ParcelaMatch[]> => {
    // Comparação de valor em centavos (evita erro de float) e tolerância simétrica:
    // aceita diferença de até X% do maior valor (entre extrato e parcela).
    const extratoValorCentavos = Math.round(Math.abs(extrato.valor) * 100);

    const dataExtrato = new Date(extrato.data + 'T12:00:00');
    if (isNaN(dataExtrato.getTime())) {
      console.error('Data inválida no extrato:', extrato.data);
      return [];
    }

    // Filtrar parcelas que correspondem ao critério de valor e data
    const parcelasFiltradas = parcelasAbertas.filter(p => {
      const diffCentavos = Math.abs(p.valor_parcela_centavos - extratoValorCentavos);
      const baseCentavos = Math.max(p.valor_parcela_centavos, extratoValorCentavos);
      const maxDiffCentavos = Math.round(baseCentavos * (toleranciaValor / 100));
      const valorOk = diffCentavos <= maxDiffCentavos;

      const vencimento = new Date(p.vencimento + 'T12:00:00');
      const diffDias = Math.abs(Math.floor((dataExtrato.getTime() - vencimento.getTime()) / (1000 * 60 * 60 * 24)));
      const dataOk = diffDias <= toleranciaDias;

      return valorOk && dataOk;
    });

    return parcelasFiltradas.map(p => {
      const valorParcela = p.valor_parcela_centavos / 100;
      const diferencaCentavos = Math.abs(extratoValorCentavos - p.valor_parcela_centavos);
      const diferencaValor = diferencaCentavos / 100;
      const diferencaPercentual = p.valor_parcela_centavos > 0 ? (diferencaCentavos / p.valor_parcela_centavos) * 100 : 0;
      
      const vencimento = new Date(p.vencimento + 'T12:00:00');
      const diferencaDias = Math.abs(Math.floor((dataExtrato.getTime() - vencimento.getTime()) / (1000 * 60 * 60 * 24)));
      
      // Score baseado em proximidade de valor e data
      const scoreValor = Math.max(0, 1 - (diferencaPercentual / Math.max(toleranciaValor, 1)));
      const scoreDias = Math.max(0, 1 - (diferencaDias / Math.max(toleranciaDias, 1)));
      
      // NOVO: Score baseado em correspondência do nome do fornecedor na descrição
      const normalizar = (str: string) => str.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      const compactar = (str: string) => normalizar(str).replace(/\s+/g, ''); // Remove espaços
      
      const descricaoNormalizada = normalizar(extrato.descricao);
      const descricaoCompactada = compactar(extrato.descricao);
      const fornecedorNormalizado = normalizar(p.fornecedor_nome || '');
      const fornecedorCompactado = compactar(p.fornecedor_nome || '');
      
      let scoreFornecedor = 0;
      if (fornecedorNormalizado && descricaoNormalizada) {
        // Verificar match exato (com ou sem espaços)
        if (descricaoNormalizada.includes(fornecedorNormalizado) || 
            descricaoCompactada.includes(fornecedorCompactado) ||
            fornecedorCompactado.includes(compactar(extrato.descricao.split(' ')[0]))) {
          scoreFornecedor = 1;
        } else {
          // Verificar palavras-chave do nome do fornecedor
          const palavrasFornecedor = fornecedorNormalizado.split(/\s+/).filter(p => p.length > 2);
          const palavrasEncontradas = palavrasFornecedor.filter(palavra => 
            descricaoNormalizada.includes(palavra) || descricaoCompactada.includes(palavra)
          );
          if (palavrasFornecedor.length > 0) {
            scoreFornecedor = palavrasEncontradas.length / palavrasFornecedor.length;
          }
          
          // Também verificar se palavras da descrição estão no fornecedor
          const palavrasDescricao = descricaoNormalizada.split(/\s+/).filter(p => p.length > 3);
          const matchReverso = palavrasDescricao.filter(palavra => 
            fornecedorNormalizado.includes(palavra) || fornecedorCompactado.includes(palavra)
          );
          if (palavrasDescricao.length > 0) {
            const scoreReverso = matchReverso.length / palavrasDescricao.length;
            scoreFornecedor = Math.max(scoreFornecedor, scoreReverso);
          }
        }
      }
      
      // Score final: 40% valor, 20% data, 40% nome do fornecedor
      const score = (scoreValor * 0.4) + (scoreDias * 0.2) + (scoreFornecedor * 0.4);

      return {
        parcela_id: p.id,
        conta_id: p.conta_id,
        fornecedor: p.fornecedor_nome || 'Não identificado',
        descricao: p.descricao || '',
        valor_parcela: valorParcela,
        vencimento: p.vencimento,
        numero_parcela: p.numero_parcela || 1,
        total_parcelas: p.total_parcelas || 1,
        score,
        diferenca_valor: diferencaValor,
        diferenca_dias: diferencaDias,
        ja_pago: p.pago || false,
        pago_em: p.pago_em || undefined,
        valor_pago: p.valor_pago_centavos ? p.valor_pago_centavos / 100 : undefined,
        observacao_pagamento: p.observacao || undefined
      };
    }).sort((a, b) => b.score - a.score);
  };

  const carregarTodasParcelas = async () => {
    // Buscar TODAS as parcelas (abertas e pagas) para verificar duplicidade
    const { data: parcelas, error } = await supabase
      .from('contas_pagar_parcelas')
      .select(`
        id,
        conta_id,
        numero_parcela,
        valor_centavos,
        vencimento,
        pago,
        data_pagamento,
        observacoes,
        contas_pagar!inner (
          id,
          descricao,
          fornecedor_id,
          pessoa_fisica_id,
          num_parcelas
        )
      `);

    if (error || !parcelas) {
      console.error('Erro ao buscar parcelas:', error);
      return [];
    }

    // Buscar nomes dos fornecedores
    const pjIds = [...new Set(parcelas.map(p => (p.contas_pagar as any)?.fornecedor_id).filter(Boolean))];
    const pfIds = [...new Set(parcelas.map(p => (p.contas_pagar as any)?.pessoa_fisica_id).filter(Boolean))];

    const [pjRes, pfRes] = await Promise.all([
      pjIds.length > 0 ? supabase.from('pessoas_juridicas').select('id, nome_fantasia, razao_social').in('id', pjIds) : { data: [] },
      pfIds.length > 0 ? supabase.from('pessoas_fisicas').select('id, nome').in('id', pfIds) : { data: [] }
    ]);

    const pjMap: Record<number, string> = {};
    const pfMap: Record<number, string> = {};
    
    pjRes.data?.forEach((pj: any) => {
      pjMap[pj.id] = pj.nome_fantasia || pj.razao_social || 'PJ sem nome';
    });
    pfRes.data?.forEach((pf: any) => {
      pfMap[pf.id] = pf.nome || 'PF sem nome';
    });

    return parcelas.map(p => {
      const conta = p.contas_pagar as any;
      let fornecedorNome = 'Não identificado';
      
      if (conta?.fornecedor_id && pjMap[conta.fornecedor_id]) {
        fornecedorNome = pjMap[conta.fornecedor_id];
      } else if (conta?.pessoa_fisica_id && pfMap[conta.pessoa_fisica_id]) {
        fornecedorNome = pfMap[conta.pessoa_fisica_id];
      }

      return {
        id: p.id,
        conta_id: p.conta_id,
        numero_parcela: p.numero_parcela,
        valor_parcela_centavos: p.valor_centavos,
        vencimento: p.vencimento,
        descricao: conta?.descricao || '',
        fornecedor_nome: fornecedorNome,
        total_parcelas: conta?.num_parcelas || 1,
        pago: p.pago,
        pago_em: p.data_pagamento,
        valor_pago_centavos: p.valor_centavos,
        observacao: p.observacoes
      };
    });
  };

  // Verificar se um identificador já existe nas observações das parcelas pagas
  const verificarIdentificadorDuplicado = (identificador: string, todasParcelas: any[]): boolean => {
    if (!identificador) return false;
    const prefixo = `[EXTRATO:${identificador}]`;
    return todasParcelas.some(p => 
      p.pago && p.observacao && p.observacao.includes(prefixo)
    );
  };

  const iniciarReconciliacao = async () => {
    if (!contaBancariaId || !formaPagamentoId) {
      toast.error('Selecione a conta bancária e forma de pagamento');
      return;
    }
    
    setIsProcessing(true);
    setStep('reconcile');
    
    try {
      // Carregar todas as parcelas (abertas e pagas) de uma vez
      const todasParcelas = await carregarTodasParcelas();
      console.log(`Carregadas ${todasParcelas.length} parcelas (abertas e pagas)`);
      
      const saidas = processExtrato();
      console.log(`Processando ${saidas.length} saídas do extrato`);
      
      const reconciliacaoItems: ReconciliacaoItem[] = [];
      
      // Processar em batches para não travar a UI
      const batchSize = 50;
      for (let i = 0; i < saidas.length; i += batchSize) {
        const batch = saidas.slice(i, Math.min(i + batchSize, saidas.length));
        
        const batchResults = await Promise.all(
          batch.map(async (extrato) => {
            // Verificar se o identificador já existe no sistema
            const identificadorDuplicado = extrato.identificador 
              ? verificarIdentificadorDuplicado(extrato.identificador, todasParcelas)
              : false;

            // Se identificador duplicado, pular a busca de matches
            if (identificadorDuplicado) {
              return {
                extrato,
                matches: [],
                selectedMatch: null,
                confirmed: false,
                identificadorDuplicado: true
              };
            }

            const matches = await buscarMatchesParcela(extrato, todasParcelas);
            // Priorizar parcelas não pagas para auto-seleção
            const matchesAbertos = matches.filter(m => !m.ja_pago);
            const autoSelect = matchesAbertos.length === 1 && matchesAbertos[0].score >= 0.8 ? matchesAbertos[0] : null;
            return {
              extrato,
              matches,
              selectedMatch: autoSelect,
              confirmed: autoSelect !== null && autoSelect.score >= 0.9,
              identificadorDuplicado: false
            };
          })
        );
        
        reconciliacaoItems.push(...batchResults);
        setProcessedCount(Math.min(i + batchSize, saidas.length));
        
        // Pequeno delay para permitir atualização da UI
        await new Promise(resolve => setTimeout(resolve, 10));
      }
      
      setReconciliacoes(reconciliacaoItems);
    } catch (error) {
      console.error('Erro na reconciliação:', error);
      toast.error('Erro ao processar reconciliação');
    }
    
    setIsProcessing(false);
  };

  const toggleConfirm = (index: number) => {
    setReconciliacoes(prev => prev.map((item, i) => 
      i === index ? { ...item, confirmed: !item.confirmed } : item
    ));
  };

  const selectMatch = (reconcIndex: number, match: ParcelaMatch | null, substituir: boolean = false) => {
    setReconciliacoes(prev => prev.map((item, i) => 
      i === reconcIndex ? { 
        ...item, 
        selectedMatch: match, 
        confirmed: match !== null,
        substituirPagamento: substituir
      } : item
    ));
  };

  // Habilitar/desabilitar substituição de pagamento para item já pago
  const toggleSubstituirPagamento = (index: number) => {
    setReconciliacoes(prev => prev.map((item, i) => 
      i === index ? { ...item, substituirPagamento: !item.substituirPagamento, confirmed: !item.substituirPagamento } : item
    ));
  };

  const confirmarBaixas = async () => {
    const itemsParaBaixa = reconciliacoes.filter(r => 
      r.confirmed && r.selectedMatch && !r.identificadorDuplicado
    );
    
    if (itemsParaBaixa.length === 0) {
      toast.error('Nenhum item selecionado para dar baixa');
      return;
    }
    
    setIsProcessing(true);
    let sucessos = 0;
    let substituicoes = 0;
    let erros = 0;
    
    for (const item of itemsParaBaixa) {
      const match = item.selectedMatch!;
      const valorPagoCentavos = Math.round(item.extrato.valor * 100);
      
      // Usar forma de pagamento do CSV se disponível, senão usar a global
      const formaIdFromCsv = getFormaPagamentoId(item.extrato.formaPagamento);
      const formaIdFinal = formaIdFromCsv || parseInt(formaPagamentoId);
      
      // Montar observação com identificador se disponível
      let observacao = `Baixa automática via extrato: ${item.extrato.descricao}`;
      if (item.extrato.identificador) {
        observacao = `[EXTRATO:${item.extrato.identificador}] ${observacao}`;
      }

      // Se for substituição de pagamento, primeiro limpar os dados antigos
      if (item.substituirPagamento && match.ja_pago) {
        const { error: clearError } = await supabase
          .from('contas_pagar_parcelas')
          .update({
            pago: false,
            pago_em: null,
            valor_pago_centavos: null,
            forma_pagamento_id: null,
            conta_bancaria_id: null,
            observacao: null
          })
          .eq('id', match.parcela_id);

        if (clearError) {
          console.error('Erro ao limpar pagamento anterior:', clearError);
          erros++;
          continue;
        }
      }
      
      // Atualizar parcela diretamente já que pagar_parcela não existe como função
      const { error } = await supabase
        .from('contas_pagar_parcelas')
        .update({
          pago: true,
          data_pagamento: new Date().toISOString().split('T')[0],
          valor_centavos: valorPagoCentavos,
          forma_pagamento_id: formaIdFinal,
          conta_bancaria_id: parseInt(contaBancariaId),
          observacoes: observacao
        })
        .eq('id', match.parcela_id);
      
      if (error) {
        console.error('Erro ao dar baixa:', error);
        erros++;
      } else {
        if (item.substituirPagamento) {
          substituicoes++;
        } else {
          sucessos++;
        }
      }
    }
    
    setIsProcessing(false);
    
    if (sucessos > 0) {
      toast.success(`${sucessos} parcela(s) baixada(s) com sucesso`);
    }
    if (substituicoes > 0) {
      toast.success(`${substituicoes} pagamento(s) substituído(s) com sucesso`);
    }
    if (erros > 0) {
      toast.error(`${erros} erro(s) ao dar baixa`);
    }
    
    onComplete();
    handleClose();
  };

  const handleClose = () => {
    setStep('upload');
    setExtratoData([]);
    setColumns([]);
    setReconciliacoes([]);
    setProcessedCount(0);
    onClose();
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('pt-BR');
  };

  const confirmedCount = reconciliacoes.filter(r => r.confirmed && r.selectedMatch).length;
  const withMatchCount = reconciliacoes.filter(r => r.matches.length > 0).length;
  const withoutMatchCount = reconciliacoes.filter(r => r.matches.length === 0).length;

  // Detectar seleções duplicadas (mesma parcela selecionada em múltiplos itens do extrato)
  const selecoesDuplicadas = React.useMemo(() => {
    const parcelasSelecionadas = reconciliacoes
      .filter(r => r.confirmed && r.selectedMatch && !r.identificadorDuplicado)
      .map(r => ({
        parcela_id: r.selectedMatch!.parcela_id,
        fornecedor: r.selectedMatch!.fornecedor,
        valor: r.selectedMatch!.valor_parcela,
        extratoDescricao: r.extrato.descricao,
        extratoData: r.extrato.data,
        extratoValor: r.extrato.valor
      }));
    
    // Encontrar duplicatas
    const contagem: Record<number, typeof parcelasSelecionadas> = {};
    parcelasSelecionadas.forEach(item => {
      if (!contagem[item.parcela_id]) {
        contagem[item.parcela_id] = [];
      }
      contagem[item.parcela_id].push(item);
    });

    return Object.entries(contagem)
      .filter(([_, items]) => items.length > 1)
      .map(([parcela_id, items]) => ({
        parcela_id: Number(parcela_id),
        fornecedor: items[0].fornecedor,
        valor: items[0].valor,
        extratos: items.map(i => ({
          descricao: i.extratoDescricao,
          data: i.extratoData,
          valor: i.extratoValor
        }))
      }));
  }, [reconciliacoes]);

  const temDuplicatas = selecoesDuplicadas.length > 0;

  // Helper para verificar se uma parcela está selecionada em outra linha
  const getParcelaEmOutraLinha = (parcelaId: number, currentIndex: number): { descricao: string; data: string } | null => {
    for (let i = 0; i < reconciliacoes.length; i++) {
      if (i !== currentIndex && 
          reconciliacoes[i].confirmed && 
          reconciliacoes[i].selectedMatch?.parcela_id === parcelaId) {
        return {
          descricao: reconciliacoes[i].extrato.descricao,
          data: reconciliacoes[i].extrato.data
        };
      }
    }
    return null;
  };

  // Função para verificar se há pelo menos uma palavra em comum entre descrição e fornecedor
  const temPalavraEmComum = (descricao: string, fornecedor: string): boolean => {
    if (!descricao || !fornecedor) return false;
    
    const normalizar = (str: string) => str.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    
    // Palavras a ignorar (muito comuns ou curtas)
    const palavrasIgnorar = new Set(['de', 'da', 'do', 'das', 'dos', 'e', 'em', 'para', 'com', 'por', 'uma', 'um', 'ltda', 'sa', 'me', 'eireli', 'epp', 'pix', 'ted', 'doc', 'boleto', 'pagamento', 'transferencia', 'debito', 'credito']);
    
    const palavrasDescricao = normalizar(descricao)
      .split(/[\s\-\/\.\,]+/)
      .filter(p => p.length > 2 && !palavrasIgnorar.has(p));
    
    const palavrasFornecedor = normalizar(fornecedor)
      .split(/[\s\-\/\.\,]+/)
      .filter(p => p.length > 2 && !palavrasIgnorar.has(p));
    
    // Verificar se há qualquer palavra em comum
    for (const palavra of palavrasDescricao) {
      if (palavrasFornecedor.some(pf => pf.includes(palavra) || palavra.includes(pf))) {
        return true;
      }
    }
    
    return false;
  };

  // Filtrar matches de um item baseado na correspondência de nome
  const filtrarMatchesPorNome = (item: ReconciliacaoItem): ParcelaMatch[] => {
    if (!filtrarPorNome) return item.matches;
    
    return item.matches.filter(match => 
      temPalavraEmComum(item.extrato.descricao, match.fornecedor)
    );
  };

  // Filtrar reconciliações baseado no filtro selecionado
  const toggleFiltro = (filtro: FiltroReconciliacao) => {
    if (filtro === 'todos') {
      setFiltroReconciliacao(['todos']);
    } else {
      setFiltroReconciliacao(prev => {
        const newFiltros = prev.filter(f => f !== 'todos');
        if (newFiltros.includes(filtro)) {
          const result = newFiltros.filter(f => f !== filtro);
          return result.length === 0 ? ['todos'] : result;
        } else {
          return [...newFiltros, filtro];
        }
      });
    }
  };

  const reconciliacoesFiltradas = reconciliacoes.filter(item => {
    if (filtroReconciliacao.includes('todos')) return true;
    
    const checks: boolean[] = [];
    if (filtroReconciliacao.includes('selecionados')) {
      checks.push(item.confirmed && item.selectedMatch !== null);
    }
    if (filtroReconciliacao.includes('com_match')) {
      checks.push(item.matches.length > 0);
    }
    if (filtroReconciliacao.includes('sem_match')) {
      checks.push(item.matches.length === 0);
    }
    
    return checks.some(c => c);
  });

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Importar Extrato Bancário - Reconciliação Automática
          </DialogTitle>
        </DialogHeader>

        {step === 'upload' && (
          <div className="flex-1 flex flex-col gap-4">
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors ${
                isDragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50'
              }`}
            >
              <input {...getInputProps()} />
              <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-lg font-medium">Arraste o extrato bancário aqui</p>
              <p className="text-sm text-muted-foreground mt-2">Suporta arquivos CSV, XLS, XLSX</p>
            </div>
          </div>
        )}

        {step === 'config' && (
          <div className="flex-1 flex flex-col gap-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Conta Bancária *</Label>
                <Select value={contaBancariaId} onValueChange={setContaBancariaId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a conta" />
                  </SelectTrigger>
                  <SelectContent>
                    {contasBancarias.map(conta => (
                      <SelectItem key={conta.id} value={String(conta.id)}>
                        {conta.nome} {conta.banco && `(${conta.banco})`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>Forma de Pagamento Padrão *</Label>
                <Select value={formaPagamentoId} onValueChange={setFormaPagamentoId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a forma" />
                  </SelectTrigger>
                  <SelectContent>
                    {formasPagamento.map(forma => (
                      <SelectItem key={forma.id} value={String(forma.id)}>
                        {forma.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">Usada quando não informada no CSV</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tolerância de Dias (vencimento)</Label>
                <Input 
                  type="number" 
                  value={toleranciaDias} 
                  onChange={(e) => setToleranciaDias(parseInt(e.target.value) || 10)}
                  min={1}
                  max={30}
                />
                <p className="text-xs text-muted-foreground">Buscar parcelas ±{toleranciaDias} dias da data do pagamento</p>
              </div>
              
              <div className="space-y-2">
                <Label>Tolerância de Valor (%)</Label>
                <Input 
                  type="number" 
                  value={toleranciaValor} 
                  onChange={(e) => setToleranciaValor(parseFloat(e.target.value) || 1)}
                  min={0}
                  max={10}
                  step={0.5}
                />
                <p className="text-xs text-muted-foreground">Aceitar diferença de até {toleranciaValor}% no valor</p>
              </div>
            </div>

            <div className="border rounded-lg p-4 space-y-4">
              <h3 className="font-medium">Mapeamento de Colunas</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Coluna de Data *</Label>
                  <Select value={colData} onValueChange={setColData}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {columns.map(col => (
                        <SelectItem key={col} value={col}>{col}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label>Coluna de Descrição *</Label>
                  <Select value={colDescricao} onValueChange={setColDescricao}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {columns.map(col => (
                        <SelectItem key={col} value={col}>{col}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label>Coluna de Valor *</Label>
                  <Select value={colValor} onValueChange={setColValor}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {columns.map(col => (
                        <SelectItem key={col} value={col}>{col}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label>Coluna de Tipo (D/C)</Label>
                  <Select value={colTipo || "none"} onValueChange={(val) => setColTipo(val === "none" ? "" : val)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Opcional" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Nenhuma</SelectItem>
                      {columns.map(col => (
                        <SelectItem key={col} value={col}>{col}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Coluna de Forma de Pagamento</Label>
                  <Select value={colFormaPagamento || "none"} onValueChange={(val) => setColFormaPagamento(val === "none" ? "" : val)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Opcional" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Nenhuma (usar padrão)</SelectItem>
                      {columns.map(col => (
                        <SelectItem key={col} value={col}>{col}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">Ex: PIX, Boleto, Débito, TED</p>
                </div>
                
                <div className="space-y-2">
                  <Label>Coluna de Identificador (Deduplicação)</Label>
                  <Select value={colIdentificador || "none"} onValueChange={(val) => setColIdentificador(val === "none" ? "" : val)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Opcional" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Nenhuma</SelectItem>
                      {columns.map(col => (
                        <SelectItem key={col} value={col}>{col}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">Código único para evitar duplicidade em importações</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Checkbox 
                  id="valorNegativo" 
                  checked={valorSaidaNegativo} 
                  onCheckedChange={(checked) => setValorSaidaNegativo(checked as boolean)}
                />
                <Label htmlFor="valorNegativo" className="text-sm">
                  Valores negativos são saídas (débitos)
                </Label>
              </div>
            </div>

            <div className="text-sm text-muted-foreground">
              <strong>{extratoData.length}</strong> linhas carregadas • 
              Colunas detectadas: {columns.join(', ')}
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={handleClose}>Cancelar</Button>
              <Button 
                onClick={iniciarReconciliacao}
                disabled={!colData || !colDescricao || !colValor || !contaBancariaId || !formaPagamentoId}
              >
                <Search className="h-4 w-4 mr-2" />
                Iniciar Reconciliação
              </Button>
            </div>
          </div>
        )}

        {step === 'reconcile' && (
          <div className="flex-1 flex flex-col gap-4 min-h-0">
            {isProcessing ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-4">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <p className="text-lg">Processando extrato...</p>
                <p className="text-sm text-muted-foreground">
                  {processedCount} de {processExtrato().length} itens processados
                </p>
              </div>
            ) : (
              <>
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <div className="flex gap-4">
                      <Badge variant="outline" className="text-sm">
                        Total: {reconciliacoes.length} saídas
                      </Badge>
                      <Badge variant="secondary" className="text-sm">
                        Com match: {withMatchCount}
                      </Badge>
                      <Badge variant="destructive" className="text-sm">
                        Sem match: {withoutMatchCount}
                      </Badge>
                      <Badge className="text-sm bg-primary">
                        Selecionados: {confirmedCount}
                      </Badge>
                    </div>
                    
                    <div className="flex gap-2">
                      <Button variant="outline" onClick={() => setStep('config')}>
                        Voltar
                      </Button>
                      <Button 
                        onClick={confirmarBaixas} 
                        disabled={confirmedCount === 0 || temDuplicatas}
                        className={temDuplicatas ? 'opacity-50 cursor-not-allowed' : ''}
                      >
                        <Check className="h-4 w-4 mr-2" />
                        Confirmar {confirmedCount} Baixa(s)
                      </Button>
                    </div>
                  </div>

                  {/* Alerta de duplicatas */}
                  {temDuplicatas && (
                    <div className="bg-destructive/10 border border-destructive/50 rounded-lg p-4">
                      <div className="flex items-start gap-3">
                        <AlertCircle className="h-5 w-5 text-destructive mt-0.5 flex-shrink-0" />
                        <div className="flex-1">
                          <h4 className="font-semibold text-destructive">Atenção: Contas Duplicadas Selecionadas</h4>
                          <p className="text-sm text-destructive/80 mt-1 mb-3">
                            A mesma conta a pagar está selecionada para múltiplas linhas do extrato. 
                            <strong> Ajuste as seleções para continuar.</strong>
                          </p>
                          <div className="space-y-3">
                            {selecoesDuplicadas.map((dup) => (
                              <div key={dup.parcela_id} className="bg-background/80 rounded p-3 border border-destructive/30">
                                <div className="font-medium text-sm text-destructive">
                                  📋 {dup.fornecedor} - {formatCurrency(dup.valor)}
                                </div>
                                <p className="text-xs text-muted-foreground mt-1 mb-2">
                                  Esta conta está selecionada para {dup.extratos.length} linhas do extrato:
                                </p>
                                <ul className="space-y-1">
                                  {dup.extratos.map((ext, i) => (
                                    <li key={i} className="text-xs flex items-center gap-2 text-destructive/80">
                                      <span className="w-2 h-2 rounded-full bg-destructive/50" />
                                      <span className="font-medium">{formatDate(ext.data)}</span>
                                      <span className="text-muted-foreground">•</span>
                                      <span>{formatCurrency(ext.valor)}</span>
                                      <span className="text-muted-foreground truncate max-w-xs">
                                        - {ext.descricao}
                                      </span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            ))}
                          </div>
                          <p className="text-xs text-destructive/70 mt-3 italic">
                            💡 Dica: Clique em outra opção de match ou desmarque os itens duplicados acima.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                  <div className="flex flex-wrap items-center gap-3 p-2 border rounded-md bg-muted/50">
                    <span className="text-sm font-medium">Filtrar:</span>
                    <div className="flex items-center gap-2">
                      <Checkbox 
                        id="filtro-todos"
                        checked={filtroReconciliacao.includes('todos')}
                        onCheckedChange={() => toggleFiltro('todos')}
                      />
                      <Label htmlFor="filtro-todos" className="text-sm cursor-pointer">Todos</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox 
                        id="filtro-selecionados"
                        checked={filtroReconciliacao.includes('selecionados')}
                        onCheckedChange={() => toggleFiltro('selecionados')}
                      />
                      <Label htmlFor="filtro-selecionados" className="text-sm cursor-pointer">Selecionados ({confirmedCount})</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox 
                        id="filtro-com-match"
                        checked={filtroReconciliacao.includes('com_match')}
                        onCheckedChange={() => toggleFiltro('com_match')}
                      />
                      <Label htmlFor="filtro-com-match" className="text-sm cursor-pointer">Com match ({withMatchCount})</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox 
                        id="filtro-sem-match"
                        checked={filtroReconciliacao.includes('sem_match')}
                        onCheckedChange={() => toggleFiltro('sem_match')}
                      />
                      <Label htmlFor="filtro-sem-match" className="text-sm cursor-pointer">Sem match ({withoutMatchCount})</Label>
                    </div>
                    
                    <div className="border-l pl-3 ml-1 flex items-center gap-2">
                      <Checkbox 
                        id="filtro-por-nome"
                        checked={filtrarPorNome}
                        onCheckedChange={(checked) => setFiltrarPorNome(checked as boolean)}
                      />
                      <Label htmlFor="filtro-por-nome" className="text-sm cursor-pointer text-primary font-medium">
                        🔍 Só mostrar matches com nome correspondente
                      </Label>
                    </div>
                  </div>
                </div>

                <div className="flex-1 min-h-0 overflow-auto border rounded-md">
                  <div className="space-y-3 p-4">
                    {reconciliacoesFiltradas.map((item) => {
                      // Encontrar o índice original para as funções de callback
                      const originalIndex = reconciliacoes.findIndex(r => r === item);
                      return (
                        <Card key={originalIndex} className={`${item.confirmed ? 'border-primary' : ''} ${item.identificadorDuplicado ? 'opacity-50' : ''}`}>
                          <CardHeader className="py-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <Checkbox 
                                  checked={item.confirmed}
                                  onCheckedChange={() => {
                                    if (item.selectedMatch?.ja_pago) {
                                      toggleSubstituirPagamento(originalIndex);
                                    } else if (item.selectedMatch) {
                                      toggleConfirm(originalIndex);
                                    }
                                  }}
                                  disabled={!item.selectedMatch || item.identificadorDuplicado}
                                />
                                <div>
                                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                                    {formatDate(item.extrato.data)} - {formatCurrency(item.extrato.valor)}
                                    {item.extrato.identificador && (
                                      <Badge variant="outline" className="text-xs">
                                        ID: {item.extrato.identificador}
                                      </Badge>
                                    )}
                                  </CardTitle>
                                  <p className="text-xs text-muted-foreground truncate max-w-md">
                                    {item.extrato.descricao}
                                  </p>
                                </div>
                              </div>
                              
                              {item.identificadorDuplicado ? (
                                <Badge variant="outline" className="text-muted-foreground border-muted-foreground">
                                  <X className="h-3 w-3 mr-1" />
                                  Identificador já importado
                                </Badge>
                              ) : item.matches.length === 0 ? (
                                <Badge variant="destructive">
                                  <X className="h-3 w-3 mr-1" />
                                  Sem match
                                </Badge>
                              ) : item.substituirPagamento ? (
                                <Badge variant="default" className="bg-amber-500 hover:bg-amber-600">
                                  <AlertTriangle className="h-3 w-3 mr-1" />
                                  Substituir pagamento
                                </Badge>
                              ) : item.matches.length === 1 && item.matches[0].score >= 0.9 && !item.matches[0].ja_pago ? (
                                <Badge className="bg-primary">
                                  <Check className="h-3 w-3 mr-1" />
                                  Match exato
                                </Badge>
                              ) : item.matches.every(m => m.ja_pago) ? (
                                <Badge variant="outline" className="text-amber-600 border-amber-600">
                                  <Check className="h-3 w-3 mr-1" />
                                  Já pago no sistema
                                </Badge>
                              ) : (
                                <Badge variant="secondary">
                                  <AlertTriangle className="h-3 w-3 mr-1" />
                                  {item.matches.length} opção(ões)
                                </Badge>
                              )}
                            </div>
                          </CardHeader>
                          
                          {item.matches.length > 0 && !item.identificadorDuplicado && (
                            <CardContent className="pt-0 pb-3">
                              <div className="space-y-2">
                                {(() => {
                                  const matchesFiltrados = filtrarMatchesPorNome(item);
                                  if (matchesFiltrados.length === 0 && filtrarPorNome) {
                                    return (
                                      <div className="text-sm text-muted-foreground italic p-2 text-center border border-dashed rounded">
                                        Nenhum match com nome correspondente. Desative o filtro para ver todas as opções.
                                      </div>
                                    );
                                  }
                                  return matchesFiltrados.slice(0, 5).map((match, mIndex) => {
                                  const outraLinha = getParcelaEmOutraLinha(match.parcela_id, originalIndex);
                                  const estaSelecionadoAqui = item.selectedMatch?.parcela_id === match.parcela_id;
                                  const estaEmConflito = outraLinha !== null && estaSelecionadoAqui;
                                  
                                  return (
                                    <div 
                                      key={mIndex}
                                      className={`flex flex-col p-2 rounded border cursor-pointer transition-colors ${
                                        estaEmConflito
                                          ? 'border-destructive bg-destructive/10'
                                          : outraLinha && !estaSelecionadoAqui
                                            ? 'border-dashed border-muted-foreground/50 bg-muted/20 opacity-60'
                                            : match.ja_pago && estaSelecionadoAqui && item.substituirPagamento
                                              ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/30'
                                              : match.ja_pago 
                                                ? 'bg-muted/30 border-muted' 
                                                : estaSelecionadoAqui 
                                                  ? 'border-primary bg-primary/5' 
                                                  : 'hover:bg-muted/50'
                                      }`}
                                      onClick={() => {
                                        if (match.ja_pago) {
                                          selectMatch(originalIndex, match, true);
                                        } else {
                                          selectMatch(originalIndex, match, false);
                                        }
                                      }}
                                    >
                                      {/* Aviso de conflito/duplicata */}
                                      {outraLinha && (
                                        <div className={`text-xs mb-2 p-1.5 rounded flex items-center gap-2 ${
                                          estaSelecionadoAqui 
                                            ? 'bg-destructive/20 text-destructive' 
                                            : 'bg-muted text-muted-foreground'
                                        }`}>
                                          <AlertCircle className="h-3 w-3 flex-shrink-0" />
                                          <span>
                                            {estaSelecionadoAqui 
                                              ? '⚠️ CONFLITO: Esta conta também está selecionada em outra linha do extrato!' 
                                              : `Já selecionada para: ${formatDate(outraLinha.data)} - ${outraLinha.descricao.substring(0, 30)}...`
                                            }
                                          </span>
                                        </div>
                                      )}
                                      
                                      <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                          <div className={`w-3 h-3 rounded-full ${
                                            estaEmConflito
                                              ? 'bg-destructive'
                                              : estaSelecionadoAqui && item.substituirPagamento
                                                ? 'bg-amber-500'
                                                : match.ja_pago
                                                  ? 'bg-muted-foreground/30'
                                                  : estaSelecionadoAqui 
                                                    ? 'bg-primary' 
                                                    : 'bg-muted'
                                          }`} />
                                          <div>
                                            <div className="flex items-center gap-2 flex-wrap">
                                              <p className="text-sm font-medium">{match.fornecedor}</p>
                                              {match.ja_pago && (
                                                <Badge variant="outline" className="text-xs text-amber-600 border-amber-600">
                                                  JÁ PAGO
                                                </Badge>
                                              )}
                                              {outraLinha && !estaSelecionadoAqui && (
                                                <Badge variant="outline" className="text-xs text-muted-foreground">
                                                  Em uso
                                                </Badge>
                                              )}
                                            </div>
                                            <p className="text-xs text-muted-foreground">
                                              {match.descricao} • Parcela {match.numero_parcela}/{match.total_parcelas}
                                            </p>
                                          </div>
                                        </div>
                                      
                                      <div className="text-right">
                                        <p className="text-sm font-medium">{formatCurrency(match.valor_parcela)}</p>
                                        {(() => {
                                          const diferencaCentavos = item.extrato.valor - match.valor_parcela;
                                          const diferencaPerc = match.valor_parcela > 0 
                                            ? ((diferencaCentavos / match.valor_parcela) * 100)
                                            : 0;
                                          const isDesconto = diferencaCentavos < 0;
                                          
                                          return (
                                            <div className="flex items-center gap-2 justify-end">
                                              <p className="text-xs text-muted-foreground">
                                                Venc: {formatDate(match.vencimento)} • Δ {match.diferenca_dias}d
                                              </p>
                                              {diferencaCentavos !== 0 && (
                                                <Badge 
                                                  variant="outline" 
                                                  className={`text-xs ${
                                                    isDesconto 
                                                      ? 'text-green-600 border-green-600 bg-green-50 dark:bg-green-950/30' 
                                                      : 'text-red-600 border-red-600 bg-red-50 dark:bg-red-950/30'
                                                  }`}
                                                >
                                                  {isDesconto ? '↓' : '↑'} {Math.abs(diferencaPerc).toFixed(2)}%
                                                  <span className="ml-1 opacity-75">
                                                    ({isDesconto ? '-' : '+'}{formatCurrency(Math.abs(diferencaCentavos))})
                                                  </span>
                                                </Badge>
                                              )}
                                              {diferencaCentavos === 0 && (
                                                <Badge variant="outline" className="text-xs text-primary border-primary">
                                                  Valor exato
                                                </Badge>
                                              )}
                                            </div>
                                          );
                                        })()}
                                      </div>
                                    </div>
                                    
                                    {/* Mostrar detalhes do pagamento anterior para itens já pagos */}
                                    {match.ja_pago && (match.pago_em || match.valor_pago) && (
                                      <div className="mt-2 pt-2 border-t border-dashed text-xs text-muted-foreground flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                          <span>Pagamento anterior:</span>
                                          {match.pago_em && (
                                            <span>📅 {formatDate(match.pago_em)}</span>
                                          )}
                                          {match.valor_pago && (
                                            <span>💰 {formatCurrency(match.valor_pago)}</span>
                                          )}
                                        </div>
                                        {item.selectedMatch?.parcela_id === match.parcela_id && item.substituirPagamento && (
                                          <Badge variant="outline" className="text-xs text-amber-600 border-amber-600">
                                            Será substituído pelo extrato
                                          </Badge>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                );
                              });
                            })()}
                              </div>
                            </CardContent>
                          )}
                        </Card>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
