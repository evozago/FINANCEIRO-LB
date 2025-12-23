import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, FileText, Sparkles } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { PreviewParcelas, type PreviewParcela } from "@/components/financeiro/PreviewParcelas";
import { formatDateToISO, parseLocalDate, todayLocalDate } from "@/lib/date";
import { NovoPJForm } from "@/components/financeiro/NovoPJForm";
import { NovoPFForm } from "@/components/financeiro/NovoPFForm";
import { ImportarDocumentoIA } from "@/components/financeiro/ImportarDocumentoIA";

export default function NovaContaPagar() {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<"manual" | "ia">("ia");

  // Form state
  const [fornecedorTipo, setFornecedorTipo] = useState<"pj" | "pf">("pj");
  const [fornecedorId, setFornecedorId] = useState("");
  const [categoriaId, setCategoriaId] = useState("");
  const [filialId, setFilialId] = useState("");
  const [descricao, setDescricao] = useState("");
  const [valorTotalCentavos, setValorTotalCentavos] = useState(0);
  const [numParcelas, setNumParcelas] = useState(1);
  const [numeroNota, setNumeroNota] = useState("");
  const [chaveNfe, setChaveNfe] = useState("");
  const [dataEmissao, setDataEmissao] = useState("");
  const [referencia, setReferencia] = useState("");
  const [dataVencimento, setDataVencimento] = useState("");
  const [codigoBoleto, setCodigoBoleto] = useState("");
  const [anexo, setAnexo] = useState<File | null>(null);
  const [parcelasPersonalizadas, setParcelasPersonalizadas] = useState<PreviewParcela[]>([]);

  const parseOptionalId = (value: string): number | null => {
    if (!value) {
      return null;
    }

    const parsed = Number.parseInt(value, 10);
    return Number.isNaN(parsed) ? null : parsed;
  };

  type NovaParcelaInsert = {
    conta_id: number;
    parcela_num: number;
    numero_parcela: number;
    valor_parcela_centavos: number;
    vencimento: string;
    pago: boolean;
  };

  // Fetch fornecedores PJ
  const { data: fornecedoresPJ, refetch: refetchPJ } = useQuery({
    queryKey: ["fornecedores-pj"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pessoas_juridicas")
        .select("id, razao_social, nome_fantasia")
        .order("razao_social");
      if (error) throw error;
      return data;
    },
  });

  // Fetch fornecedores PF
  const { data: fornecedoresPF, refetch: refetchPF } = useQuery({
    queryKey: ["fornecedores-pf"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pessoas_fisicas")
        .select("id, nome_completo")
        .order("nome_completo");
      if (error) throw error;
      return data;
    },
  });

  const handleNovoPJ = (newPJ: { id: number; razao_social: string; nome_fantasia?: string }) => {
    refetchPJ();
    setFornecedorId(newPJ.id.toString());
    setFornecedorTipo("pj");
  };

  const handleNovoPF = (newPF: { id: number; nome_completo: string }) => {
    refetchPF();
    setFornecedorId(newPF.id.toString());
    setFornecedorTipo("pf");
  };

  // Fetch categorias
  const { data: categorias } = useQuery({
    queryKey: ["categorias"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categorias_financeiras")
        .select("id, nome")
        .order("nome");
      if (error) throw error;
      return data;
    },
  });

  // Fetch filiais
  const { data: filiais } = useQuery({
    queryKey: ["filiais"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("filiais")
        .select("id, nome")
        .order("nome");
      if (error) throw error;
      return data;
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!fornecedorId) {
      toast.error("Selecione um fornecedor");
      return;
    }

    if (valorTotalCentavos <= 0) {
      toast.error("Informe um valor válido");
      return;
    }

    if (numParcelas < 1) {
      toast.error("Número de parcelas deve ser maior que zero");
      return;
    }

    setIsSubmitting(true);

    try {
      // Criar conta a pagar com fornecedor PJ ou PF
      const { data: conta, error: contaError } = await supabase
        .from("contas_pagar")
        .insert({
          fornecedor_id: fornecedorTipo === "pj" ? parseOptionalId(fornecedorId) : null,
          fornecedor_pf_id: fornecedorTipo === "pf" ? parseOptionalId(fornecedorId) : null,
          categoria_id: parseOptionalId(categoriaId),
          filial_id: parseOptionalId(filialId),
          descricao,
          valor_total_centavos: valorTotalCentavos,
          num_parcelas: numParcelas,
          numero_nota: numeroNota || null,
          chave_nfe: chaveNfe || null,
          data_emissao: dataEmissao || null,
          referencia: referencia || null,
        })
        .select()
        .single();

      if (contaError) throw contaError;

      // Usar parcelas personalizadas se existirem, senão calcular automaticamente
      const parcelas: NovaParcelaInsert[] = parcelasPersonalizadas.length > 0
        ? parcelasPersonalizadas.map((p) => ({
            conta_id: conta.id,
            parcela_num: p.numero,
            numero_parcela: p.numero,
            valor_parcela_centavos: p.valor_centavos,
            vencimento: p.vencimento,
            pago: false,
          }))
        : (() => {
            const valorParcela = Math.floor(valorTotalCentavos / numParcelas);
            const valorRestante = valorTotalCentavos - valorParcela * numParcelas;
            const baseDate = dataVencimento ? parseLocalDate(dataVencimento) : todayLocalDate();
            const temp: NovaParcelaInsert[] = [];

            for (let i = 1; i <= numParcelas; i++) {
              // Criar data sem timezone issues - usar componentes locais
              const year = baseDate.getFullYear();
              const month = baseDate.getMonth();
              const day = baseDate.getDate();
              
              const vencimento = new Date(year, month, day);
              vencimento.setMonth(vencimento.getMonth() + (i - 1));
              
              temp.push({
                conta_id: conta.id,
                parcela_num: i,
                numero_parcela: i,
                valor_parcela_centavos: i === numParcelas ? valorParcela + valorRestante : valorParcela,
                vencimento: formatDateToISO(vencimento),
                pago: false,
              });
            }
            return temp;
          })();

      const { error: parcelasError } = await supabase
        .from("contas_pagar_parcelas")
        .insert(parcelas);

      if (parcelasError) throw parcelasError;

      toast.success("Conta a pagar criada com sucesso!");
      navigate("/financeiro/contas-pagar");
    } catch (error: unknown) {
      console.error("Erro ao criar conta:", error);
      const message = error instanceof Error ? error.message : "Erro desconhecido";
      toast.error("Erro ao criar conta a pagar: " + message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handler para salvar via IA
  const handleSaveFromIA = async (data: {
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
    parcelas: { parcela_num: number; valor_parcela_centavos: number; vencimento: string }[];
  }) => {
    try {
      // Criar conta a pagar
      const { data: conta, error: contaError } = await supabase
        .from("contas_pagar")
        .insert({
          fornecedor_id: data.fornecedorTipo === "pj" ? data.fornecedorId : null,
          fornecedor_pf_id: data.fornecedorTipo === "pf" ? data.fornecedorId : null,
          categoria_id: data.categoriaId,
          filial_id: data.filialId,
          descricao: data.descricao || data.fornecedorNome,
          valor_total_centavos: data.valorTotalCentavos,
          num_parcelas: data.numParcelas,
          numero_nota: data.numeroNota || null,
          chave_nfe: data.chaveNfe || null,
          data_emissao: data.dataEmissao || null,
          referencia: data.referencia || null,
        })
        .select()
        .single();

      if (contaError) throw contaError;

      // Criar parcelas
      const parcelas = data.parcelas.map((p) => ({
        conta_id: conta.id,
        parcela_num: p.parcela_num,
        numero_parcela: p.parcela_num,
        valor_parcela_centavos: p.valor_parcela_centavos,
        vencimento: p.vencimento,
        pago: false,
      }));

      const { error: parcelasError } = await supabase
        .from("contas_pagar_parcelas")
        .insert(parcelas);

      if (parcelasError) throw parcelasError;

      navigate("/financeiro/contas-pagar");
    } catch (error) {
      console.error("Erro ao salvar:", error);
      throw error;
    }
  };

  // Preparar dados para o componente de IA
  const categoriasForIA = categorias?.map(c => ({ id: c.id, nome: c.nome })) || [];
  const fornecedoresPJForIA = fornecedoresPJ?.map(f => ({ 
    id: f.id, 
    nome: f.nome_fantasia || f.razao_social || "" 
  })) || [];
  const fornecedoresPFForIA = fornecedoresPF?.map(f => ({ 
    id: f.id, 
    nome: f.nome_completo 
  })) || [];
  const filiaisForIA = filiais?.map(f => ({ id: f.id, nome: f.nome })) || [];

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => navigate("/financeiro/contas-pagar")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Nova Conta a Pagar</h1>
          <p className="text-muted-foreground">Importe com IA ou cadastre manualmente</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "manual" | "ia")}>
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="ia" className="flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            Importar com IA
          </TabsTrigger>
          <TabsTrigger value="manual" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Cadastro Manual
          </TabsTrigger>
        </TabsList>

        <TabsContent value="ia" className="mt-6">
          <ImportarDocumentoIA
            categorias={categoriasForIA}
            fornecedoresPJ={fornecedoresPJForIA}
            fornecedoresPF={fornecedoresPFForIA}
            filiais={filiaisForIA}
            onSave={handleSaveFromIA}
            onCancel={() => navigate("/financeiro/contas-pagar")}
          />
        </TabsContent>

        <TabsContent value="manual" className="mt-6">
          <form onSubmit={handleSubmit}>
            <Card>
              <CardHeader>
                <CardTitle>Dados da Conta</CardTitle>
                <CardDescription>Preencha os campos abaixo para cadastrar uma nova conta a pagar</CardDescription>
              </CardHeader>
          <CardContent className="space-y-6">
            {/* Tipo de Fornecedor */}
            <div className="grid gap-2">
              <Label>Tipo de Fornecedor *</Label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="fornecedorTipo"
                    value="pj"
                    checked={fornecedorTipo === "pj"}
                    onChange={(e) => {
                      setFornecedorTipo("pj");
                      setFornecedorId("");
                    }}
                    className="cursor-pointer"
                  />
                  <span>Pessoa Jurídica</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="fornecedorTipo"
                    value="pf"
                    checked={fornecedorTipo === "pf"}
                    onChange={(e) => {
                      setFornecedorTipo("pf");
                      setFornecedorId("");
                    }}
                    className="cursor-pointer"
                  />
                  <span>Pessoa Física</span>
                </label>
              </div>
            </div>

            {/* Fornecedor */}
            <div className="grid gap-2">
              <Label htmlFor="fornecedor">Fornecedor *</Label>
              <div className="flex gap-2">
                <Select value={fornecedorId} onValueChange={setFornecedorId}>
                  <SelectTrigger id="fornecedor">
                    <SelectValue placeholder="Selecione o fornecedor" />
                  </SelectTrigger>
                  <SelectContent>
                    {fornecedorTipo === "pj" 
                      ? fornecedoresPJ?.map((f) => (
                          <SelectItem key={f.id} value={f.id.toString()}>
                            {f.nome_fantasia || f.razao_social}
                          </SelectItem>
                        ))
                      : fornecedoresPF?.map((f) => (
                          <SelectItem key={f.id} value={f.id.toString()}>
                            {f.nome_completo}
                          </SelectItem>
                        ))
                    }
                  </SelectContent>
                </Select>
                {fornecedorTipo === "pj" ? (
                  <NovoPJForm onSuccess={handleNovoPJ} />
                ) : (
                  <NovoPFForm onSuccess={handleNovoPF} />
                )}
              </div>
            </div>

            {/* Categoria */}
            <div className="grid gap-2">
              <Label htmlFor="categoria">Categoria</Label>
              <Select
                value={categoriaId}
                onValueChange={(value) => setCategoriaId(value === "none" ? "" : value)}
              >
                <SelectTrigger id="categoria">
                  <SelectValue placeholder="Selecione a categoria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhuma</SelectItem>
                  {categorias?.map((c) => (
                    <SelectItem key={c.id} value={c.id.toString()}>
                      {c.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Filial */}
            <div className="grid gap-2">
              <Label htmlFor="filial">Filial</Label>
              <Select
                value={filialId}
                onValueChange={(value) => setFilialId(value === "none" ? "" : value)}
              >
                <SelectTrigger id="filial">
                  <SelectValue placeholder="Selecione a filial" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhuma</SelectItem>
                  {filiais?.map((f) => (
                    <SelectItem key={f.id} value={f.id.toString()}>
                      {f.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Descrição */}
            <div className="grid gap-2">
              <Label htmlFor="descricao">Descrição</Label>
              <Textarea
                id="descricao"
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                placeholder="Descrição da conta"
                rows={3}
              />
            </div>

            {/* Valor Total */}
            <div className="grid gap-2">
              <Label htmlFor="valor">Valor Total *</Label>
              <CurrencyInput
                id="valor"
                value={valorTotalCentavos}
                onValueChange={setValorTotalCentavos}
                placeholder="R$ 0,00"
              />
            </div>

            {/* Número de Parcelas */}
            <div className="grid gap-2">
              <Label htmlFor="parcelas">Número de Parcelas</Label>
              <Input
                id="parcelas"
                type="number"
                min="1"
                value={numParcelas}
                onChange={(e) => setNumParcelas(parseInt(e.target.value) || 1)}
              />
            </div>

            {/* Data de Vencimento */}
            <div className="grid gap-2">
              <Label htmlFor="vencimento">Data do Primeiro Vencimento</Label>
              <Input
                id="vencimento"
                type="date"
                value={dataVencimento}
                onChange={(e) => setDataVencimento(e.target.value)}
              />
            </div>

            {/* Preview das Parcelas */}
            {numParcelas > 1 && valorTotalCentavos > 0 && dataVencimento && (
              <PreviewParcelas
                valorTotal={valorTotalCentavos}
                numParcelas={numParcelas}
                dataInicial={dataVencimento}
                onChange={setParcelasPersonalizadas}
              />
            )}

            {/* Número da Nota */}
            <div className="grid gap-2">
              <Label htmlFor="nota">Número da Nota</Label>
              <Input
                id="nota"
                value={numeroNota}
                onChange={(e) => setNumeroNota(e.target.value)}
                placeholder="Ex: 12345"
              />
            </div>

            {/* Chave NFe */}
            <div className="grid gap-2">
              <Label htmlFor="chave">Chave da NFe</Label>
              <Input
                id="chave"
                value={chaveNfe}
                onChange={(e) => setChaveNfe(e.target.value)}
                placeholder="44 dígitos da chave de acesso"
                maxLength={44}
              />
            </div>

            {/* Data de Emissão */}
            <div className="grid gap-2">
              <Label htmlFor="emissao">Data de Emissão</Label>
              <Input
                id="emissao"
                type="date"
                value={dataEmissao}
                onChange={(e) => setDataEmissao(e.target.value)}
              />
            </div>

            {/* Referência */}
            <div className="grid gap-2">
              <Label htmlFor="referencia">Referência</Label>
              <Input
                id="referencia"
                value={referencia}
                onChange={(e) => setReferencia(e.target.value)}
                placeholder="Referência interna"
              />
            </div>

            {/* Código do Boleto */}
            <div className="grid gap-2">
              <Label htmlFor="codigoBoleto">Código do Boleto</Label>
              <Input
                id="codigoBoleto"
                value={codigoBoleto}
                onChange={(e) => setCodigoBoleto(e.target.value)}
                placeholder="Código de barras do boleto"
              />
            </div>

            {/* Anexo */}
            <div className="grid gap-2">
              <Label htmlFor="anexo">Anexo (Boleto/Nota)</Label>
              <Input
                id="anexo"
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={(e) => setAnexo(e.target.files?.[0] || null)}
              />
              {anexo && (
                <p className="text-sm text-muted-foreground">
                  Arquivo selecionado: {anexo.name}
                </p>
              )}
            </div>

            {/* Botões */}
            <div className="flex gap-4 justify-end pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate("/financeiro/contas-pagar")}
                disabled={isSubmitting}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Salvando..." : "Salvar Conta"}
              </Button>
            </div>
            </CardContent>
          </Card>
        </form>
        </TabsContent>
      </Tabs>
    </div>
  );
}
