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
  Eye
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

interface GeminiResponse {
  conta_pagar: ContaPagar;
  parcelas: Parcela[];
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

  // Form state para edição
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

  const [isSaving, setIsSaving] = useState(false);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    setFileName(file.name);
    setIsProcessing(true);
    setExtractedData(null);

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
      setExtractedData(data as GeminiResponse);

      // Preencher formulário com dados extraídos
      const response = data as GeminiResponse;
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

      toast.success(`Documento analisado com ${response.confianca}% de confiança`);

    } catch (error) {
      console.error("❌ Erro ao processar documento:", error);
      toast.error(error instanceof Error ? error.message : "Erro ao processar documento");
    } finally {
      setIsProcessing(false);
    }
  }, [categorias, fornecedoresPJ]);

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
        // Remove o prefixo data:mime;base64,
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
              Envie uma imagem ou PDF de boleto, nota fiscal ou fatura. 
              A IA extrairá automaticamente os dados para você revisar.
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
                      Gemini 3 Flash está extraindo os dados
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

      {/* Review Form */}
      {extractedData && (
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
                    <iframe 
                      src={previewUrl} 
                      className="w-full h-[500px]"
                      title="Preview PDF"
                    />
                  ) : (
                    <img 
                      src={previewUrl} 
                      alt="Preview" 
                      className="w-full h-auto object-contain"
                    />
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

              <Button 
                variant="outline" 
                className="w-full mt-4" 
                onClick={resetForm}
              >
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
      )}
    </div>
  );
}
