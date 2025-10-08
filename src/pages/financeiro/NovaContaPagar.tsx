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
import { ArrowLeft } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

export default function NovaContaPagar() {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [fornecedorId, setFornecedorId] = useState("");
  const [categoriaId, setCategoriaId] = useState("");
  const [filialId, setFilialId] = useState("");
  const [empresaDestinatariaId, setEmpresaDestinatariaId] = useState("");
  const [descricao, setDescricao] = useState("");
  const [valorTotalCentavos, setValorTotalCentavos] = useState(0);
  const [numParcelas, setNumParcelas] = useState(1);
  const [numeroNota, setNumeroNota] = useState("");
  const [chaveNfe, setChaveNfe] = useState("");
  const [dataEmissao, setDataEmissao] = useState("");
  const [referencia, setReferencia] = useState("");
  const [dataVencimento, setDataVencimento] = useState("");

  // Fetch fornecedores
  const { data: fornecedores } = useQuery({
    queryKey: ["fornecedores"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pessoas_juridicas")
        .select("id, razao_social, nome_fantasia")
        .order("razao_social");
      if (error) throw error;
      return data;
    },
  });

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

  // Fetch empresas (para empresa destinatária)
  const { data: empresas } = useQuery({
    queryKey: ["empresas"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pessoas_juridicas")
        .select("id, razao_social, nome_fantasia")
        .order("razao_social");
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
      // Criar conta a pagar
      const { data: conta, error: contaError } = await supabase
        .from("contas_pagar")
        .insert({
          fornecedor_id: parseInt(fornecedorId),
          categoria_id: categoriaId ? parseInt(categoriaId) : null,
          filial_id: filialId ? parseInt(filialId) : null,
          empresa_destinataria_id: empresaDestinatariaId ? parseInt(empresaDestinatariaId) : null,
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

      // Calcular valor de cada parcela
      const valorParcela = Math.floor(valorTotalCentavos / numParcelas);
      const valorRestante = valorTotalCentavos - (valorParcela * numParcelas);

      // Criar parcelas
      const parcelas = [];
      const baseDate = dataVencimento ? new Date(dataVencimento) : new Date();

      for (let i = 1; i <= numParcelas; i++) {
        const vencimento = new Date(baseDate);
        vencimento.setMonth(vencimento.getMonth() + (i - 1));

        parcelas.push({
          conta_id: conta.id,
          numero_parcela: i,
          valor_parcela_centavos: i === numParcelas ? valorParcela + valorRestante : valorParcela,
          vencimento: vencimento.toISOString().split('T')[0],
          pago: false,
        });
      }

      const { error: parcelasError } = await supabase
        .from("contas_pagar_parcelas")
        .insert(parcelas);

      if (parcelasError) throw parcelasError;

      toast.success("Conta a pagar criada com sucesso!");
      navigate("/financeiro/contas-pagar");
    } catch (error: any) {
      console.error("Erro ao criar conta:", error);
      toast.error("Erro ao criar conta a pagar: " + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => navigate("/financeiro/contas-pagar")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Nova Conta a Pagar</h1>
          <p className="text-muted-foreground">Cadastro manual de conta a pagar</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Dados da Conta</CardTitle>
            <CardDescription>Preencha os campos abaixo para cadastrar uma nova conta a pagar</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Fornecedor */}
            <div className="grid gap-2">
              <Label htmlFor="fornecedor">Fornecedor *</Label>
              <Select value={fornecedorId} onValueChange={setFornecedorId}>
                <SelectTrigger id="fornecedor">
                  <SelectValue placeholder="Selecione o fornecedor" />
                </SelectTrigger>
                <SelectContent>
                  {fornecedores?.map((f) => (
                    <SelectItem key={f.id} value={f.id.toString()}>
                      {f.nome_fantasia || f.razao_social}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Categoria */}
            <div className="grid gap-2">
              <Label htmlFor="categoria">Categoria</Label>
              <Select value={categoriaId} onValueChange={setCategoriaId}>
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
              <Select value={filialId} onValueChange={setFilialId}>
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

            {/* Empresa Destinatária */}
            <div className="grid gap-2">
              <Label htmlFor="empresa">Empresa Destinatária</Label>
              <Select value={empresaDestinatariaId} onValueChange={setEmpresaDestinatariaId}>
                <SelectTrigger id="empresa">
                  <SelectValue placeholder="Selecione a empresa destinatária" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhuma</SelectItem>
                  {empresas?.map((e) => (
                    <SelectItem key={e.id} value={e.id.toString()}>
                      {e.nome_fantasia || e.razao_social}
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
    </div>
  );
}
