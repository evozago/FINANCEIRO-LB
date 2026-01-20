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
import { Upload, FileSpreadsheet, Check, X, AlertTriangle, Search, Loader2 } from 'lucide-react';

interface ContaBancaria {
  id: number;
  nome_conta: string;
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
}

interface ReconciliacaoItem {
  extrato: ExtratoItem;
  matches: ParcelaMatch[];
  selectedMatch: ParcelaMatch | null;
  confirmed: boolean;
}

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
  const [valorSaidaNegativo, setValorSaidaNegativo] = useState<boolean>(true);
  
  // Dados auxiliares
  const [contasBancarias, setContasBancarias] = useState<ContaBancaria[]>([]);
  const [formasPagamento, setFormasPagamento] = useState<FormaPagamento[]>([]);
  
  // Reconciliação
  const [reconciliacoes, setReconciliacoes] = useState<ReconciliacaoItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processedCount, setProcessedCount] = useState(0);

  // Carregar dados auxiliares
  const loadAuxData = async () => {
    const [contasRes, formasRes] = await Promise.all([
      supabase.from('contas_bancarias').select('id, nome_conta, banco'),
      supabase.from('formas_pagamento').select('id, nome')
    ]);
    
    if (contasRes.data) setContasBancarias(contasRes.data);
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
        
        return {
          data: parseDate(row[colData]),
          descricao: String(row[colDescricao] || ''),
          valor: Math.abs(valor),
          tipo,
          formaPagamento,
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
    const valorMin = extrato.valor * (1 - toleranciaValor / 100);
    const valorMax = extrato.valor * (1 + toleranciaValor / 100);
    const valorCentavosMin = Math.round(valorMin * 100);
    const valorCentavosMax = Math.round(valorMax * 100);
    
    const dataExtrato = new Date(extrato.data + 'T12:00:00');
    if (isNaN(dataExtrato.getTime())) {
      console.error('Data inválida no extrato:', extrato.data);
      return [];
    }
    
    // Filtrar parcelas que correspondem ao critério de valor e data
    const parcelasFiltradas = parcelasAbertas.filter(p => {
      const valorOk = p.valor_parcela_centavos >= valorCentavosMin && 
                      p.valor_parcela_centavos <= valorCentavosMax;
      
      const vencimento = new Date(p.vencimento + 'T12:00:00');
      const diffDias = Math.abs(Math.floor((dataExtrato.getTime() - vencimento.getTime()) / (1000 * 60 * 60 * 24)));
      const dataOk = diffDias <= toleranciaDias;
      
      return valorOk && dataOk;
    });

    return parcelasFiltradas.map(p => {
      const valorParcela = p.valor_parcela_centavos / 100;
      const diferencaValor = Math.abs(extrato.valor - valorParcela);
      const diferencaPercentual = (diferencaValor / valorParcela) * 100;
      
      const vencimento = new Date(p.vencimento + 'T12:00:00');
      const diferencaDias = Math.abs(Math.floor((dataExtrato.getTime() - vencimento.getTime()) / (1000 * 60 * 60 * 24)));
      
      // Score baseado em proximidade de valor e data
      const scoreValor = Math.max(0, 1 - (diferencaPercentual / Math.max(toleranciaValor, 1)));
      const scoreDias = Math.max(0, 1 - (diferencaDias / Math.max(toleranciaDias, 1)));
      const score = (scoreValor * 0.6) + (scoreDias * 0.4);

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
        diferenca_dias: diferencaDias
      };
    }).sort((a, b) => b.score - a.score);
  };

  const carregarParcelasAbertas = async () => {
    // Buscar todas as parcelas abertas de uma vez
    const { data: parcelas, error } = await supabase
      .from('contas_pagar_parcelas')
      .select(`
        id,
        conta_id,
        numero_parcela,
        valor_parcela_centavos,
        vencimento,
        pago,
        contas_pagar!inner (
          id,
          descricao,
          fornecedor_id,
          fornecedor_pf_id,
          qtd_parcelas
        )
      `)
      .eq('pago', false);

    if (error || !parcelas) {
      console.error('Erro ao buscar parcelas:', error);
      return [];
    }

    // Buscar nomes dos fornecedores
    const pjIds = [...new Set(parcelas.map(p => (p.contas_pagar as any)?.fornecedor_id).filter(Boolean))];
    const pfIds = [...new Set(parcelas.map(p => (p.contas_pagar as any)?.fornecedor_pf_id).filter(Boolean))];

    const [pjRes, pfRes] = await Promise.all([
      pjIds.length > 0 ? supabase.from('pessoas_juridicas').select('id, nome_fantasia, razao_social').in('id', pjIds) : { data: [] },
      pfIds.length > 0 ? supabase.from('pessoas_fisicas').select('id, nome_completo').in('id', pfIds) : { data: [] }
    ]);

    const pjMap: Record<number, string> = {};
    const pfMap: Record<number, string> = {};
    
    pjRes.data?.forEach((pj: any) => {
      pjMap[pj.id] = pj.nome_fantasia || pj.razao_social || 'PJ sem nome';
    });
    pfRes.data?.forEach((pf: any) => {
      pfMap[pf.id] = pf.nome_completo || 'PF sem nome';
    });

    return parcelas.map(p => {
      const conta = p.contas_pagar as any;
      let fornecedorNome = 'Não identificado';
      
      if (conta?.fornecedor_id && pjMap[conta.fornecedor_id]) {
        fornecedorNome = pjMap[conta.fornecedor_id];
      } else if (conta?.fornecedor_pf_id && pfMap[conta.fornecedor_pf_id]) {
        fornecedorNome = pfMap[conta.fornecedor_pf_id];
      }

      return {
        id: p.id,
        conta_id: p.conta_id,
        numero_parcela: p.numero_parcela,
        valor_parcela_centavos: p.valor_parcela_centavos,
        vencimento: p.vencimento,
        descricao: conta?.descricao || '',
        fornecedor_nome: fornecedorNome,
        total_parcelas: conta?.qtd_parcelas || 1
      };
    });
  };

  const iniciarReconciliacao = async () => {
    if (!contaBancariaId || !formaPagamentoId) {
      toast.error('Selecione a conta bancária e forma de pagamento');
      return;
    }
    
    setIsProcessing(true);
    setStep('reconcile');
    
    try {
      // Carregar todas as parcelas abertas de uma vez
      const parcelasAbertas = await carregarParcelasAbertas();
      console.log(`Carregadas ${parcelasAbertas.length} parcelas abertas`);
      
      const saidas = processExtrato();
      console.log(`Processando ${saidas.length} saídas do extrato`);
      
      const reconciliacaoItems: ReconciliacaoItem[] = [];
      
      // Processar em batches para não travar a UI
      const batchSize = 50;
      for (let i = 0; i < saidas.length; i += batchSize) {
        const batch = saidas.slice(i, Math.min(i + batchSize, saidas.length));
        
        const batchResults = await Promise.all(
          batch.map(async (extrato) => {
            const matches = await buscarMatchesParcela(extrato, parcelasAbertas);
            return {
              extrato,
              matches,
              selectedMatch: matches.length === 1 && matches[0].score >= 0.8 ? matches[0] : null,
              confirmed: matches.length === 1 && matches[0].score >= 0.9
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

  const selectMatch = (reconcIndex: number, match: ParcelaMatch | null) => {
    setReconciliacoes(prev => prev.map((item, i) => 
      i === reconcIndex ? { ...item, selectedMatch: match, confirmed: match !== null } : item
    ));
  };

  const confirmarBaixas = async () => {
    const itemsParaBaixa = reconciliacoes.filter(r => r.confirmed && r.selectedMatch);
    
    if (itemsParaBaixa.length === 0) {
      toast.error('Nenhum item selecionado para dar baixa');
      return;
    }
    
    setIsProcessing(true);
    let sucessos = 0;
    let erros = 0;
    
    for (const item of itemsParaBaixa) {
      const match = item.selectedMatch!;
      const valorPagoCentavos = Math.round(item.extrato.valor * 100);
      
      // Usar forma de pagamento do CSV se disponível, senão usar a global
      const formaIdFromCsv = getFormaPagamentoId(item.extrato.formaPagamento);
      const formaIdFinal = formaIdFromCsv || parseInt(formaPagamentoId);
      
      const { error } = await supabase.rpc('pagar_parcela', {
        parcela_id: match.parcela_id,
        valor_pago_centavos: valorPagoCentavos,
        forma_pagamento_id: formaIdFinal,
        conta_bancaria_id: parseInt(contaBancariaId),
        observacao_param: `Baixa automática via extrato: ${item.extrato.descricao}`
      });
      
      if (error) {
        console.error('Erro ao dar baixa:', error);
        erros++;
      } else {
        sucessos++;
      }
    }
    
    setIsProcessing(false);
    
    if (sucessos > 0) {
      toast.success(`${sucessos} parcela(s) baixada(s) com sucesso`);
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
                        {conta.nome_conta} {conta.banco && `(${conta.banco})`}
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
                <div className="flex items-center justify-between">
                  <div className="flex gap-4">
                    <Badge variant="outline" className="text-sm">
                      Total: {reconciliacoes.length} saídas
                    </Badge>
                    <Badge variant="secondary" className="text-sm">
                      Com match: {withMatchCount}
                    </Badge>
                    <Badge className="text-sm bg-green-600">
                      Selecionados: {confirmedCount}
                    </Badge>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setStep('config')}>
                      Voltar
                    </Button>
                    <Button onClick={confirmarBaixas} disabled={confirmedCount === 0}>
                      <Check className="h-4 w-4 mr-2" />
                      Confirmar {confirmedCount} Baixa(s)
                    </Button>
                  </div>
                </div>

                <div className="flex-1 min-h-0 overflow-auto border rounded-md">
                  <div className="space-y-3 p-4">
                    {reconciliacoes.map((item, index) => (
                      <Card key={index} className={item.confirmed ? 'border-green-500' : ''}>
                        <CardHeader className="py-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <Checkbox 
                                checked={item.confirmed}
                                onCheckedChange={() => item.selectedMatch && toggleConfirm(index)}
                                disabled={!item.selectedMatch}
                              />
                              <div>
                                <CardTitle className="text-sm font-medium">
                                  {formatDate(item.extrato.data)} - {formatCurrency(item.extrato.valor)}
                                </CardTitle>
                                <p className="text-xs text-muted-foreground truncate max-w-md">
                                  {item.extrato.descricao}
                                </p>
                              </div>
                            </div>
                            
                            {item.matches.length === 0 ? (
                              <Badge variant="destructive">
                                <X className="h-3 w-3 mr-1" />
                                Sem match
                              </Badge>
                            ) : item.matches.length === 1 && item.matches[0].score >= 0.9 ? (
                              <Badge className="bg-green-600">
                                <Check className="h-3 w-3 mr-1" />
                                Match exato
                              </Badge>
                            ) : (
                              <Badge variant="secondary">
                                <AlertTriangle className="h-3 w-3 mr-1" />
                                {item.matches.length} opção(ões)
                              </Badge>
                            )}
                          </div>
                        </CardHeader>
                        
                        {item.matches.length > 0 && (
                          <CardContent className="pt-0 pb-3">
                            <div className="space-y-2">
                              {item.matches.slice(0, 5).map((match, mIndex) => (
                                <div 
                                  key={mIndex}
                                  className={`flex items-center justify-between p-2 rounded border cursor-pointer transition-colors ${
                                    item.selectedMatch?.parcela_id === match.parcela_id 
                                      ? 'border-primary bg-primary/5' 
                                      : 'hover:bg-muted/50'
                                  }`}
                                  onClick={() => selectMatch(index, match)}
                                >
                                  <div className="flex items-center gap-3">
                                    <div className={`w-3 h-3 rounded-full ${
                                      item.selectedMatch?.parcela_id === match.parcela_id 
                                        ? 'bg-primary' 
                                        : 'bg-muted'
                                    }`} />
                                    <div>
                                      <p className="text-sm font-medium">{match.fornecedor}</p>
                                      <p className="text-xs text-muted-foreground">
                                        {match.descricao} • Parcela {match.numero_parcela}/{match.total_parcelas}
                                      </p>
                                    </div>
                                  </div>
                                  
                                  <div className="text-right">
                                    <p className="text-sm font-medium">{formatCurrency(match.valor_parcela)}</p>
                                    <p className="text-xs text-muted-foreground">
                                      Venc: {formatDate(match.vencimento)} • 
                                      Δ {match.diferenca_dias}d / {formatCurrency(match.diferenca_valor)}
                                    </p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </CardContent>
                        )}
                      </Card>
                    ))}
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
