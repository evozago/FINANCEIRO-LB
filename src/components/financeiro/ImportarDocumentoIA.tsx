import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Upload, 
  FileImage, 
  FileText, 
  Loader2, 
  Sparkles,
  Check,
  AlertTriangle,
  X,
  Eye,
  CreditCard,
  Search,
  Receipt
} from "lucide-react";

interface ContaPagar {
  descricao: string;
  numero_nota: string | null;
  chave_nfe: string | null;
  valor_total_centavos: number;
  data_emissao: string | null;
  referencia: string | null;
  fornecedor_nome_sugerido: string;
  categoria_sugerida: string;
}

interface Parcela {
  parcela_num: number;
  valor_parcela_centavos: number;
  vencimento: string;
}

interface Pagamento {
  data_pagamento: string | null;
  valor_pago_centavos: number;
  juros_centavos: number;
  desconto_centavos: number;
  multa_centavos: number;
  forma_pagamento_sugerida: string | null;
  numero_documento_referencia: string | null;
  codigo_barras: string | null;
}

interface GeminiResponse {
  intencao: "CRIAR_CONTA" | "DAR_BAIXA";
  conta_pagar: ContaPagar;
  parcelas: Parcela[];
  pagamento: Pagamento | null;
  confianca: number;
  observacoes: string | null;
}

interface Categoria {
  id: number;
  nome: string;
}

interface Fornecedor {
  id: number;
  nome: string;
}

interface Filial {
  id: number;
  nome: string;
}

interface ParcelaEncontrada {
  id: number;
  conta_id: number;
  parcela_num: number;
  valor_parcela_centavos: number;
  vencimento: string;
  pago: boolean;
  conta_descricao: string;
  fornecedor_nome: string | null;
  numero_nota: string | null;
}

interface ImportarDocumentoIAProps {
  categorias: Categoria[];
  fornecedoresPJ: Fornecedor[];
  fornecedoresPF: Fornecedor[];
  filiais: Filial[];
  onSave: (data: {
    fornecedorTipo: "pj" | "pf";
    fornecedorId: number | null;
    fornecedorNome: string;
    categoriaId: number | null;
    filialId: number | null;
    descricao: string;
    valorTotalCentavos: number;
    numParcelas: number;
    numeroNota: string;
    chaveNfe: string;
    dataEmissao: string;
    referencia: string;
    parcelas: Parcela[];
  }) => Promise<void>;
  onCancel: () => void;
}

export function ImportarDocumentoIA({
  categorias,
  fornecedoresPJ,
  fornecedoresPF,
  filiais,
  onSave,
  onCancel
}: ImportarDocumentoIAProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [extractedData, setExtractedData] = useState<GeminiResponse | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>("");

  // Form state para criação de conta
  const [fornecedorTipo, setFornecedorTipo] = useState<"pj" | "pf">("pj");
  const [fornecedorId, setFornecedorId] = useState<string>("");
  const [fornecedorNome, setFornecedorNome] = useState("");
  const [categoriaId, setCategoriaId] = useState<string>("");
  const [filialId, setFilialId] = useState<string>("");
  const [descricao, setDescricao] = useState("");
  const [valorTotalCentavos, setValorTotalCentavos] = useState(0);
  const [numeroNota, setNumeroNota] = useState("");
  const [chaveNfe, setChaveNfe] = useState("");
  const [dataEmissao, setDataEmissao] = useState("");
  const [referencia, setReferencia] = useState("");
  const [parcelas, setParcelas] = useState<Parcela[]>([]);

  // State para dar baixa
  const [parcelasEncontradas, setParcelasEncontradas] = useState<ParcelaEncontrada[]>([]);
  const [parcelaSelecionada, setParcelaSelecionada] = useState<ParcelaEncontrada | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [contaBancariaId, setContaBancariaId] = useState<string>("");
  const [formaPagamentoId, setFormaPagamentoId] = useState<string>("");
  const [contasBancarias, setContasBancarias] = useState<{id: number, nome: string}[]>([]);
  const [formasPagamento, setFormasPagamento] = useState<{id: number, nome: string}[]>([]);

  const [isSaving, setIsSaving] = useState(false);

  // Carregar contas bancárias e formas de pagamento
  const loadPaymentOptions = useCallback(async () => {
    const [contasRes, formasRes] = await Promise.all([
      supabase.from('contas_bancarias').select('id, nome').eq('ativo', true),
      supabase.from('formas_pagamento').select('id, nome')
    ]);
    
    if (contasRes.data) {
      setContasBancarias(contasRes.data.map(c => ({ id: c.id, nome: c.nome })));
    }
    if (formasRes.data) {
      setFormasPagamento(formasRes.data);
    }
  }, []);

  // Buscar parcelas que podem corresponder ao comprovante
  const searchMatchingParcelas = useCallback(async (pagamento: Pagamento, contaPagar: ContaPagar) => {
    setIsSearching(true);
    try {
      // Buscar parcelas não pagas que possam corresponder
      let query = supabase
        .from('contas_pagar_parcelas')
        .select(`
          id,
          conta_id,
          parcela_num,
          valor_parcela_centavos,
          vencimento,
          pago,
          conta:contas_pagar!inner(
            descricao,
            numero_nota,
            fornecedor:pessoas_juridicas(nome_fantasia, razao_social)
          )
        `)
        .eq('pago', false)
        .order('vencimento', { ascending: true })
        .limit(20);

      // Filtrar por valor aproximado (com tolerância de 10% para juros/desconto)
      const valorBase = pagamento.valor_pago_centavos - (pagamento.juros_centavos || 0) - (pagamento.multa_centavos || 0) + (pagamento.desconto_centavos || 0);
      const tolerancia = valorBase * 0.15;
      
      query = query
        .gte('valor_parcela_centavos', valorBase - tolerancia)
        .lte('valor_parcela_centavos', valorBase + tolerancia);

      const { data, error } = await query;

      if (error) throw error;

      const parcelasFormatadas: ParcelaEncontrada[] = (data || []).map((p: any) => ({
        id: p.id,
        conta_id: p.conta_id,
        parcela_num: p.parcela_num,
        valor_parcela_centavos: p.valor_parcela_centavos,
        vencimento: p.vencimento,
        pago: p.pago,
        conta_descricao: p.conta?.descricao || '',
        fornecedor_nome: p.conta?.fornecedor?.nome_fantasia || p.conta?.fornecedor?.razao_social || null,
        numero_nota: p.conta?.numero_nota || null,
      }));

      setParcelasEncontradas(parcelasFormatadas);

      // Se encontrou só uma, seleciona automaticamente
      if (parcelasFormatadas.length === 1) {
        setParcelaSelecionada(parcelasFormatadas[0]);
      }

      if (parcelasFormatadas.length === 0) {
        toast.warning("Nenhuma parcela em aberto encontrada com valor similar");
      } else {
        toast.success(`${parcelasFormatadas.length} parcela(s) encontrada(s)`);
      }

    } catch (error) {
      console.error("Erro ao buscar parcelas:", error);
      toast.error("Erro ao buscar parcelas");
    } finally {
      setIsSearching(false);
    }
  }, []);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    setFileName(file.name);
    setIsProcessing(true);
    setExtractedData(null);
    setParcelasEncontradas([]);
    setParcelaSelecionada(null);

    try {
      // Criar preview URL
      const objectUrl = URL.createObjectURL(file);
      setPreviewUrl(objectUrl);

      // Converter arquivo para base64
      const base64 = await fileToBase64(file);
      const mimeType = file.type;
      
      console.log(`📤 Enviando ${file.name} (${mimeType}) para análise...`);

      // Chamar Edge Function
      const { data, error } = await supabase.functions.invoke('gemini-chat', {
        body: mimeType.startsWith('image/') 
          ? { image_base64: base64, image_mime_type: mimeType }
          : { pdf_base64: base64 }
      });

      if (error) throw error;

      if (data.error) {
        throw new Error(data.error);
      }

      console.log("✅ Dados extraídos:", data);
      const response = data as GeminiResponse;
      setExtractedData(response);

      // Se é DAR_BAIXA, buscar parcelas correspondentes
      if (response.intencao === "DAR_BAIXA" && response.pagamento) {
        await loadPaymentOptions();
        await searchMatchingParcelas(response.pagamento, response.conta_pagar);
        toast.info("Comprovante detectado! Selecione a parcela para dar baixa.");
      } else {
        // Fluxo normal de criação de conta
        setDescricao(response.conta_pagar.descricao || "");
        setValorTotalCentavos(response.conta_pagar.valor_total_centavos || 0);
        setNumeroNota(response.conta_pagar.numero_nota || "");
        setChaveNfe(response.conta_pagar.chave_nfe || "");
        setDataEmissao(response.conta_pagar.data_emissao || "");
        setReferencia(response.conta_pagar.referencia || "");
        setFornecedorNome(response.conta_pagar.fornecedor_nome_sugerido || "");
        setParcelas(response.parcelas || []);

        // Tentar encontrar categoria sugerida
        const catSugerida = categorias.find(c => 
          c.nome.toLowerCase().includes(response.conta_pagar.categoria_sugerida?.toLowerCase() || "")
        );
        if (catSugerida) {
          setCategoriaId(catSugerida.id.toString());
        }

        // Tentar encontrar fornecedor sugerido
        const fornSugerido = fornecedoresPJ.find(f => 
          f.nome.toLowerCase().includes(response.conta_pagar.fornecedor_nome_sugerido?.toLowerCase() || "")
        );
        if (fornSugerido) {
          setFornecedorId(fornSugerido.id.toString());
          setFornecedorTipo("pj");
        }
      }

      toast.success(`Documento analisado com ${response.confianca}% de confiança`);

    } catch (error) {
      console.error("❌ Erro ao processar documento:", error);
      toast.error(error instanceof Error ? error.message : "Erro ao processar documento");
    } finally {
      setIsProcessing(false);
    }
  }, [categorias, fornecedoresPJ, loadPaymentOptions, searchMatchingParcelas]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpg', '.jpeg', '.png', '.webp'],
      'application/pdf': ['.pdf']
    },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024 // 10MB
  });

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
    });
  };

  const handleSave = async () => {
    if (valorTotalCentavos <= 0) {
      toast.error("Informe um valor válido");
      return;
    }

    setIsSaving(true);
    try {
      await onSave({
        fornecedorTipo,
        fornecedorId: fornecedorId ? parseInt(fornecedorId) : null,
        fornecedorNome,
        categoriaId: categoriaId ? parseInt(categoriaId) : null,
        filialId: filialId ? parseInt(filialId) : null,
        descricao,
        valorTotalCentavos,
        numParcelas: parcelas.length || 1,
        numeroNota,
        chaveNfe,
        dataEmissao,
        referencia,
        parcelas
      });
      toast.success("Conta salva com sucesso!");
    } catch (error) {
      console.error("Erro ao salvar:", error);
      toast.error(error instanceof Error ? error.message : "Erro ao salvar");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDarBaixa = async () => {
    if (!parcelaSelecionada || !extractedData?.pagamento) {
      toast.error("Selecione uma parcela para dar baixa");
      return;
    }

    if (!contaBancariaId) {
      toast.error("Selecione a conta bancária");
      return;
    }

    setIsSaving(true);
    try {
      const pagamento = extractedData.pagamento;
      const valorPago = pagamento.valor_pago_centavos;

      // Atualizar parcela diretamente 
      const { error } = await supabase
        .from('contas_pagar_parcelas')
        .update({
          pago: true,
          data_pagamento: pagamento.data_pagamento || new Date().toISOString().split('T')[0],
          forma_pagamento_id: formaPagamentoId ? parseInt(formaPagamentoId) : null,
          conta_bancaria_id: parseInt(contaBancariaId),
          observacoes: `Pago via comprovante. ${pagamento.juros_centavos ? `Juros: R$ ${(pagamento.juros_centavos/100).toFixed(2)}` : ''} ${pagamento.desconto_centavos ? `Desconto: R$ ${(pagamento.desconto_centavos/100).toFixed(2)}` : ''} ${pagamento.multa_centavos ? `Multa: R$ ${(pagamento.multa_centavos/100).toFixed(2)}` : ''}`
        })
        .eq('id', parcelaSelecionada.id);

      if (error) throw error;

      toast.success("Baixa realizada com sucesso!");
      resetForm();
      onCancel();

    } catch (error) {
      console.error("Erro ao dar baixa:", error);
      toast.error(error instanceof Error ? error.message : "Erro ao dar baixa");
    } finally {
      setIsSaving(false);
    }
  };

  const formatCurrency = (centavos: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(centavos / 100);
  };

  const getConfiancaColor = (confianca: number) => {
    if (confianca >= 80) return "bg-green-500/20 text-green-700 border-green-500/30";
    if (confianca >= 50) return "bg-yellow-500/20 text-yellow-700 border-yellow-500/30";
    return "bg-red-500/20 text-red-700 border-red-500/30";
  };

  const resetForm = () => {
    setExtractedData(null);
    setPreviewUrl(null);
    setFileName("");
    setDescricao("");
    setValorTotalCentavos(0);
    setNumeroNota("");
    setChaveNfe("");
    setDataEmissao("");
    setReferencia("");
    setFornecedorNome("");
    setFornecedorId("");
    setCategoriaId("");
    setFilialId("");
    setParcelas([]);
    setParcelasEncontradas([]);
    setParcelaSelecionada(null);
    setContaBancariaId("");
    setFormaPagamentoId("");
  };

  // Render do fluxo de DAR_BAIXA
  const renderDarBaixa = () => {
    if (!extractedData?.pagamento) return null;
    const pagamento = extractedData.pagamento;

    return (
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Preview do comprovante */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Receipt className="h-4 w-4" />
                Comprovante de Pagamento
              </CardTitle>
              <Badge variant="outline" className="bg-blue-500/20 text-blue-700 border-blue-500/30">
                <CreditCard className="h-3 w-3 mr-1" />
                Dar Baixa
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">{fileName}</p>
          </CardHeader>
          <CardContent>
            {previewUrl && (
              <div className="border rounded-lg overflow-hidden bg-muted/50 max-h-[300px] overflow-y-auto">
                {fileName.toLowerCase().endsWith('.pdf') ? (
                  <iframe src={previewUrl} className="w-full h-[300px]" title="Preview PDF" />
                ) : (
                  <img src={previewUrl} alt="Preview" className="w-full h-auto object-contain" />
                )}
              </div>
            )}

            {/* Dados extraídos do comprovante */}
            <div className="mt-4 space-y-3">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="p-3 bg-muted/50 rounded-lg">
                  <span className="text-muted-foreground">Valor Pago</span>
                  <p className="font-bold text-lg">{formatCurrency(pagamento.valor_pago_centavos)}</p>
                </div>
                <div className="p-3 bg-muted/50 rounded-lg">
                  <span className="text-muted-foreground">Data</span>
                  <p className="font-medium">{pagamento.data_pagamento || '-'}</p>
                </div>
              </div>
              
              {(pagamento.juros_centavos > 0 || pagamento.desconto_centavos > 0 || pagamento.multa_centavos > 0) && (
                <div className="grid grid-cols-3 gap-2 text-sm">
                  {pagamento.juros_centavos > 0 && (
                    <div className="p-2 bg-red-500/10 rounded text-center">
                      <span className="text-red-600 text-xs">Juros</span>
                      <p className="font-medium text-red-700">{formatCurrency(pagamento.juros_centavos)}</p>
                    </div>
                  )}
                  {pagamento.multa_centavos > 0 && (
                    <div className="p-2 bg-orange-500/10 rounded text-center">
                      <span className="text-orange-600 text-xs">Multa</span>
                      <p className="font-medium text-orange-700">{formatCurrency(pagamento.multa_centavos)}</p>
                    </div>
                  )}
                  {pagamento.desconto_centavos > 0 && (
                    <div className="p-2 bg-green-500/10 rounded text-center">
                      <span className="text-green-600 text-xs">Desconto</span>
                      <p className="font-medium text-green-700">-{formatCurrency(pagamento.desconto_centavos)}</p>
                    </div>
                  )}
                </div>
              )}

              {pagamento.forma_pagamento_sugerida && (
                <div className="p-2 bg-muted/50 rounded text-sm">
                  <span className="text-muted-foreground">Forma: </span>
                  <span className="font-medium">{pagamento.forma_pagamento_sugerida}</span>
                </div>
              )}
            </div>

            <Button variant="outline" className="w-full mt-4" onClick={resetForm}>
              <X className="h-4 w-4 mr-2" />
              Enviar Outro Documento
            </Button>
          </CardContent>
        </Card>

        {/* Seleção de parcela */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Search className="h-4 w-4" />
              Selecione a Parcela
            </CardTitle>
            <CardDescription>
              Parcelas encontradas com valor similar ao comprovante
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isSearching ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : parcelasEncontradas.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <AlertTriangle className="h-10 w-10 mx-auto mb-2 text-yellow-500" />
                <p>Nenhuma parcela encontrada</p>
                <p className="text-sm">Verifique se existe uma conta com esse valor</p>
              </div>
            ) : (
              <>
                <div className="space-y-2 max-h-[250px] overflow-y-auto">
                  {parcelasEncontradas.map((p) => (
                    <div
                      key={p.id}
                      onClick={() => setParcelaSelecionada(p)}
                      className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                        parcelaSelecionada?.id === p.id 
                          ? 'border-primary bg-primary/5' 
                          : 'hover:border-muted-foreground/50'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium text-sm">{p.conta_descricao || 'Sem descrição'}</p>
                          <p className="text-xs text-muted-foreground">
                            {p.fornecedor_nome || 'Fornecedor não informado'}
                          </p>
                          {p.numero_nota && (
                            <p className="text-xs text-muted-foreground">Nota: {p.numero_nota}</p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="font-bold">{formatCurrency(p.valor_parcela_centavos)}</p>
                          <p className="text-xs text-muted-foreground">Venc: {p.vencimento}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {parcelaSelecionada && (
                  <>
                    <Separator />
                    
                    <div className="space-y-3">
                      <div className="space-y-2">
                        <Label>Conta Bancária *</Label>
                        <Select value={contaBancariaId} onValueChange={setContaBancariaId}>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione a conta..." />
                          </SelectTrigger>
                          <SelectContent>
                            {contasBancarias.map(c => (
                              <SelectItem key={c.id} value={c.id.toString()}>{c.nome}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>Forma de Pagamento</Label>
                        <Select value={formaPagamentoId} onValueChange={setFormaPagamentoId}>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione..." />
                          </SelectTrigger>
                          <SelectContent>
                            {formasPagamento.map(f => (
                              <SelectItem key={f.id} value={f.id.toString()}>{f.nome}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="flex gap-3 pt-2">
                      <Button variant="outline" className="flex-1" onClick={onCancel} disabled={isSaving}>
                        Cancelar
                      </Button>
                      <Button 
                        className="flex-1" 
                        onClick={handleDarBaixa} 
                        disabled={isSaving || !contaBancariaId}
                      >
                        {isSaving ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Processando...
                          </>
                        ) : (
                          <>
                            <Check className="h-4 w-4 mr-2" />
                            Confirmar Baixa
                          </>
                        )}
                      </Button>
                    </div>
                  </>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    );
  };

  // Render do fluxo normal CRIAR_CONTA
  const renderCriarConta = () => {
    if (!extractedData) return null;

    return (
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Preview do documento */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Eye className="h-4 w-4" />
                Documento Original
              </CardTitle>
              <Badge variant="outline" className={getConfiancaColor(extractedData.confianca)}>
                {extractedData.confianca >= 80 && <Check className="h-3 w-3 mr-1" />}
                {extractedData.confianca < 50 && <AlertTriangle className="h-3 w-3 mr-1" />}
                {extractedData.confianca}% confiança
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">{fileName}</p>
          </CardHeader>
          <CardContent>
            {previewUrl && (
              <div className="border rounded-lg overflow-hidden bg-muted/50 max-h-[500px] overflow-y-auto">
                {fileName.toLowerCase().endsWith('.pdf') ? (
                  <iframe src={previewUrl} className="w-full h-[500px]" title="Preview PDF" />
                ) : (
                  <img src={previewUrl} alt="Preview" className="w-full h-auto object-contain" />
                )}
              </div>
            )}

            {extractedData.observacoes && (
              <div className="mt-4 p-3 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">
                  <strong>Observações da IA:</strong> {extractedData.observacoes}
                </p>
              </div>
            )}

            <Button variant="outline" className="w-full mt-4" onClick={resetForm}>
              <X className="h-4 w-4 mr-2" />
              Enviar Outro Documento
            </Button>
          </CardContent>
        </Card>

        {/* Formulário de revisão */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Revise os Dados</CardTitle>
            <CardDescription>
              Confira e corrija os dados extraídos antes de salvar
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Fornecedor */}
            <div className="space-y-2">
              <Label>Fornecedor Sugerido</Label>
              <Input 
                value={fornecedorNome} 
                onChange={(e) => setFornecedorNome(e.target.value)}
                className="bg-muted/50"
              />
              <div className="flex gap-2">
                <Select value={fornecedorId} onValueChange={setFornecedorId}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Ou selecione existente..." />
                  </SelectTrigger>
                  <SelectContent>
                    {fornecedorTipo === "pj" 
                      ? fornecedoresPJ.map(f => (
                          <SelectItem key={f.id} value={f.id.toString()}>{f.nome}</SelectItem>
                        ))
                      : fornecedoresPF.map(f => (
                          <SelectItem key={f.id} value={f.id.toString()}>{f.nome}</SelectItem>
                        ))
                    }
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setFornecedorTipo(fornecedorTipo === "pj" ? "pf" : "pj")}
                >
                  {fornecedorTipo === "pj" ? "PJ" : "PF"}
                </Button>
              </div>
            </div>

            {/* Valor */}
            <div className="space-y-2">
              <Label>Valor Total *</Label>
              <CurrencyInput 
                value={valorTotalCentavos} 
                onValueChange={setValorTotalCentavos}
              />
            </div>

            {/* Descrição */}
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea 
                value={descricao} 
                onChange={(e) => setDescricao(e.target.value)}
                rows={2}
              />
            </div>

            {/* Categoria e Filial */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Categoria</Label>
                <Select value={categoriaId} onValueChange={setCategoriaId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {categorias.map(c => (
                      <SelectItem key={c.id} value={c.id.toString()}>{c.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Filial</Label>
                <Select value={filialId} onValueChange={setFilialId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {filiais.map(f => (
                      <SelectItem key={f.id} value={f.id.toString()}>{f.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Dados do documento */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Número Nota/Boleto</Label>
                <Input 
                  value={numeroNota} 
                  onChange={(e) => setNumeroNota(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Data Emissão</Label>
                <Input 
                  type="date"
                  value={dataEmissao} 
                  onChange={(e) => setDataEmissao(e.target.value)}
                />
              </div>
            </div>

            {/* Chave NFe */}
            {chaveNfe && (
              <div className="space-y-2">
                <Label>Chave NFe</Label>
                <Input 
                  value={chaveNfe} 
                  onChange={(e) => setChaveNfe(e.target.value)}
                  className="font-mono text-xs"
                />
              </div>
            )}

            {/* Referência */}
            {referencia && (
              <div className="space-y-2">
                <Label>Código de Barras/Referência</Label>
                <Input 
                  value={referencia} 
                  onChange={(e) => setReferencia(e.target.value)}
                  className="font-mono text-xs"
                />
              </div>
            )}

            <Separator />

            {/* Parcelas */}
            <div className="space-y-3">
              <Label className="text-base font-semibold">
                Parcelas ({parcelas.length})
              </Label>
              <div className="space-y-2 max-h-[200px] overflow-y-auto">
                {parcelas.map((p, idx) => (
                  <div 
                    key={idx} 
                    className="flex items-center gap-4 p-3 bg-muted/50 rounded-lg"
                  >
                    <span className="text-sm font-medium w-16">
                      {p.parcela_num}/{parcelas.length}
                    </span>
                    <Input
                      type="date"
                      value={p.vencimento}
                      onChange={(e) => {
                        const newParcelas = [...parcelas];
                        newParcelas[idx].vencimento = e.target.value;
                        setParcelas(newParcelas);
                      }}
                      className="flex-1"
                    />
                    <span className="text-sm font-medium min-w-[100px] text-right">
                      {formatCurrency(p.valor_parcela_centavos)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            {/* Botões */}
            <div className="flex gap-3 pt-2">
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={onCancel}
                disabled={isSaving}
              >
                Cancelar
              </Button>
              <Button 
                className="flex-1"
                onClick={handleSave}
                disabled={isSaving || valorTotalCentavos <= 0}
              >
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Salvar Conta
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Upload Area */}
      {!extractedData && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Importar com IA
            </CardTitle>
            <CardDescription>
              Envie uma imagem ou PDF. A IA identifica automaticamente se é um <strong>boleto/nota</strong> (criar conta) ou <strong>comprovante</strong> (dar baixa).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div
              {...getRootProps()}
              className={`
                border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
                transition-colors duration-200
                ${isDragActive 
                  ? 'border-primary bg-primary/5' 
                  : 'border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50'
                }
                ${isProcessing ? 'pointer-events-none opacity-50' : ''}
              `}
            >
              <input {...getInputProps()} />
              
              {isProcessing ? (
                <div className="flex flex-col items-center gap-4">
                  <Loader2 className="h-12 w-12 animate-spin text-primary" />
                  <div>
                    <p className="font-medium">Analisando documento...</p>
                    <p className="text-sm text-muted-foreground">
                      Identificando tipo e extraindo dados
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-4">
                  <div className="flex gap-4">
                    <FileImage className="h-10 w-10 text-muted-foreground" />
                    <FileText className="h-10 w-10 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="font-medium">
                      {isDragActive ? "Solte o arquivo aqui" : "Arraste ou clique para enviar"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Suporta JPG, PNG, WEBP e PDF (máx. 10MB)
                    </p>
                  </div>
                  <Button variant="outline" type="button">
                    <Upload className="h-4 w-4 mr-2" />
                    Selecionar Arquivo
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Render baseado na intenção */}
      {extractedData?.intencao === "DAR_BAIXA" && renderDarBaixa()}
      {extractedData?.intencao === "CRIAR_CONTA" && renderCriarConta()}
    </div>
  );
}
