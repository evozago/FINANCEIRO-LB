import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useQuery } from "@tanstack/react-query";

interface Parcela {
  id: number;
  conta_id: number;
  parcela_num: number;
  numero_parcela: number;
  valor_parcela_centavos: number;
  vencimento: string;
  pago: boolean;
  pago_em?: string | null;
  valor_pago_centavos?: number | null;
  forma_pagamento_id?: number | null;
  conta_bancaria_id?: number | null;
  observacao?: string | null;
}

interface ContaPagar {
  id: number;
  fornecedor_id: number | null;
  fornecedor_pf_id: number | null;
  categoria_id: number | null;
  filial_id: number | null;
  descricao: string | null;
  valor_total_centavos: number;
  numero_nota: string | null;
  chave_nfe: string | null;
  data_emissao: string | null;
  referencia: string | null;
}

interface EditarParcelaModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  parcela: Parcela | null;
  onSuccess: () => void;
}

export function EditarParcelaModal({ open, onOpenChange, parcela, onSuccess }: EditarParcelaModalProps) {
  // Estados da Conta
  const [contaData, setContaData] = useState<ContaPagar | null>(null);
  const [fornecedorTipo, setFornecedorTipo] = useState<"pj" | "pf">("pj");
  const [fornecedorId, setFornecedorId] = useState("");
  const [categoriaId, setCategoriaId] = useState("");
  const [filialId, setFilialId] = useState("");
  const [descricao, setDescricao] = useState("");
  const [valorTotalCentavos, setValorTotalCentavos] = useState(0);
  const [numeroNota, setNumeroNota] = useState("");
  const [chaveNfe, setChaveNfe] = useState("");
  const [dataEmissao, setDataEmissao] = useState("");
  const [referencia, setReferencia] = useState("");

  // Estados da Parcela
  const [valorParcelaCentavos, setValorParcelaCentavos] = useState(0);
  const [vencimento, setVencimento] = useState("");
  const [pago, setPago] = useState(false);
  const [pagoEm, setPagoEm] = useState("");
  const [valorPagoCentavos, setValorPagoCentavos] = useState(0);
  const [formaPagamentoId, setFormaPagamentoId] = useState<string>("");
  const [contaBancariaId, setContaBancariaId] = useState<string>("");
  const [observacao, setObservacao] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Fetch data
  const { data: fornecedoresPJ } = useQuery({
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

  const { data: fornecedoresPF } = useQuery({
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

  const { data: contasBancarias } = useQuery({
    queryKey: ["contas-bancarias"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contas_bancarias")
        .select("id, nome_conta, banco")
        .eq("ativa", true)
        .order("nome_conta");
      if (error) throw error;
      return data || [];
    },
  });

  const { data: formasPagamento } = useQuery({
    queryKey: ["formas-pagamento"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("formas_pagamento")
        .select("id, nome")
        .order("nome");
      if (error) throw error;
      return data || [];
    },
  });

  // Carregar dados da conta e parcela quando abrir
  useEffect(() => {
    if (parcela && open) {
      // Carregar dados da parcela
      setValorParcelaCentavos(parcela.valor_parcela_centavos);
      setVencimento(parcela.vencimento);
      setPago(parcela.pago);
      setPagoEm(parcela.pago_em || "");
      setValorPagoCentavos(parcela.valor_pago_centavos || parcela.valor_parcela_centavos);
      setFormaPagamentoId(parcela.forma_pagamento_id?.toString() || "");
      setContaBancariaId(parcela.conta_bancaria_id?.toString() || "");
      setObservacao(parcela.observacao || "");

      // Carregar dados da conta
      const loadContaData = async () => {
        const { data: conta, error } = await supabase
          .from("contas_pagar")
          .select("*")
          .eq("id", parcela.conta_id)
          .single();

        if (error) {
          console.error("Erro ao carregar conta:", error);
          return;
        }

        setContaData(conta);
        setFornecedorTipo(conta.fornecedor_id ? "pj" : "pf");
        setFornecedorId((conta.fornecedor_id || conta.fornecedor_pf_id)?.toString() || "");
        setCategoriaId(conta.categoria_id?.toString() || "");
        setFilialId(conta.filial_id?.toString() || "");
        setDescricao(conta.descricao || "");
        setValorTotalCentavos(conta.valor_total_centavos);
        setNumeroNota(conta.numero_nota || "");
        setChaveNfe(conta.chave_nfe || "");
        setDataEmissao(conta.data_emissao || "");
        setReferencia(conta.referencia || "");
      };

      loadContaData();
    }
  }, [parcela, open]);

  const parseOptionalId = (value: string): number | null => {
    if (!value) return null;
    const parsed = Number.parseInt(value, 10);
    return Number.isNaN(parsed) ? null : parsed;
  };

  const handleSave = async () => {
    if (!parcela || !contaData) return;

    if (!fornecedorId) {
      toast.error("Selecione um fornecedor");
      return;
    }

    if (valorTotalCentavos <= 0) {
      toast.error("Informe um valor total válido");
      return;
    }

    if (valorParcelaCentavos <= 0) {
      toast.error("Informe um valor de parcela válido");
      return;
    }

    setIsSaving(true);

    try {
      // Atualizar a conta
      const { error: contaError } = await supabase
        .from("contas_pagar")
        .update({
          fornecedor_id: fornecedorTipo === "pj" ? parseOptionalId(fornecedorId) : null,
          fornecedor_pf_id: fornecedorTipo === "pf" ? parseOptionalId(fornecedorId) : null,
          categoria_id: parseOptionalId(categoriaId),
          filial_id: parseOptionalId(filialId),
          descricao,
          valor_total_centavos: valorTotalCentavos,
          numero_nota: numeroNota || null,
          chave_nfe: chaveNfe || null,
          data_emissao: dataEmissao || null,
          referencia: referencia || null,
        })
        .eq("id", parcela.conta_id);

      if (contaError) throw contaError;

      // Atualizar a parcela
      const { error: parcelaError } = await supabase
        .from("contas_pagar_parcelas")
        .update({
          valor_parcela_centavos: valorParcelaCentavos,
          vencimento,
          pago,
          pago_em: pago ? pagoEm : null,
          valor_pago_centavos: pago ? valorPagoCentavos : null,
          forma_pagamento_id: pago && formaPagamentoId ? parseInt(formaPagamentoId) : null,
          conta_bancaria_id: pago && contaBancariaId ? parseInt(contaBancariaId) : null,
          observacao: observacao || null,
        })
        .eq("id", parcela.id);

      if (parcelaError) throw parcelaError;

      toast.success("Conta e parcela atualizadas com sucesso!");
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error("Erro ao salvar:", error);
      toast.error("Erro ao salvar alterações");
    } finally {
      setIsSaving(false);
    }
  };

  if (!parcela) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Conta e Parcela {parcela.numero_parcela || parcela.parcela_num}</DialogTitle>
          <DialogDescription>
            Edite as informações da conta a pagar e da parcela selecionada
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* DADOS DA CONTA */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Dados da Conta</h3>
            <Separator />

            {/* Tipo de Fornecedor */}
            <div className="space-y-2">
              <Label>Tipo de Fornecedor *</Label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="fornecedorTipo"
                    value="pj"
                    checked={fornecedorTipo === "pj"}
                    onChange={() => {
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
                    onChange={() => {
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
            <div className="space-y-2">
              <Label htmlFor="fornecedor">Fornecedor *</Label>
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
                      ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Categoria */}
              <div className="space-y-2">
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
              <div className="space-y-2">
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
            </div>

            {/* Descrição */}
            <div className="space-y-2">
              <Label htmlFor="descricao">Descrição</Label>
              <Textarea
                id="descricao"
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                placeholder="Descrição da conta"
                rows={2}
              />
            </div>

            {/* Valor Total */}
            <div className="space-y-2">
              <Label htmlFor="valorTotal">Valor Total da Conta *</Label>
              <CurrencyInput
                id="valorTotal"
                value={valorTotalCentavos}
                onValueChange={setValorTotalCentavos}
                placeholder="R$ 0,00"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Número da Nota */}
              <div className="space-y-2">
                <Label htmlFor="numeroNota">Número da Nota</Label>
                <Input
                  id="numeroNota"
                  value={numeroNota}
                  onChange={(e) => setNumeroNota(e.target.value)}
                  placeholder="Ex: 12345"
                />
              </div>

              {/* Data de Emissão */}
              <div className="space-y-2">
                <Label htmlFor="dataEmissao">Data de Emissão</Label>
                <Input
                  id="dataEmissao"
                  type="date"
                  value={dataEmissao}
                  onChange={(e) => setDataEmissao(e.target.value)}
                />
              </div>
            </div>

            {/* Chave NFe */}
            <div className="space-y-2">
              <Label htmlFor="chaveNfe">Chave da NFe</Label>
              <Input
                id="chaveNfe"
                value={chaveNfe}
                onChange={(e) => setChaveNfe(e.target.value)}
                placeholder="44 dígitos da chave de acesso"
                maxLength={44}
              />
            </div>

            {/* Referência */}
            <div className="space-y-2">
              <Label htmlFor="referencia">Referência</Label>
              <Input
                id="referencia"
                value={referencia}
                onChange={(e) => setReferencia(e.target.value)}
                placeholder="Referência interna"
              />
            </div>
          </div>

          {/* DADOS DA PARCELA */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Dados da Parcela</h3>
            <Separator />

            <div className="grid grid-cols-2 gap-4">
              {/* Valor da Parcela */}
              <div className="space-y-2">
                <Label htmlFor="valorParcela">Valor da Parcela *</Label>
                <CurrencyInput
                  id="valorParcela"
                  value={valorParcelaCentavos}
                  onValueChange={setValorParcelaCentavos}
                  placeholder="R$ 0,00"
                />
              </div>

              {/* Data de Vencimento */}
              <div className="space-y-2">
                <Label htmlFor="vencimento">Data de Vencimento *</Label>
                <Input
                  id="vencimento"
                  type="date"
                  value={vencimento}
                  onChange={(e) => setVencimento(e.target.value)}
                />
              </div>
            </div>

            {/* Marcar como Pago */}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="pago"
                checked={pago}
                onCheckedChange={(checked) => setPago(checked as boolean)}
              />
              <Label htmlFor="pago" className="cursor-pointer">
                Marcar como pago
              </Label>
            </div>

            {/* Campos de Pagamento */}
            {pago && (
              <div className="space-y-4 pl-6 border-l-2 border-muted">
                <div className="grid grid-cols-2 gap-4">
                  {/* Data do Pagamento */}
                  <div className="space-y-2">
                    <Label htmlFor="pagoEm">Data do Pagamento</Label>
                    <Input
                      id="pagoEm"
                      type="date"
                      value={pagoEm}
                      onChange={(e) => setPagoEm(e.target.value)}
                    />
                  </div>

                  {/* Valor Pago */}
                  <div className="space-y-2">
                    <Label htmlFor="valorPago">Valor Pago</Label>
                    <CurrencyInput
                      id="valorPago"
                      value={valorPagoCentavos}
                      onValueChange={setValorPagoCentavos}
                      placeholder="R$ 0,00"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Forma de Pagamento */}
                  <div className="space-y-2">
                    <Label htmlFor="formaPagamento">Forma de Pagamento</Label>
                    <Select 
                      value={formaPagamentoId} 
                      onValueChange={(value) => setFormaPagamentoId(value === "none" ? "" : value)}
                    >
                      <SelectTrigger id="formaPagamento">
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Nenhuma</SelectItem>
                        {formasPagamento?.map((forma) => (
                          <SelectItem key={forma.id} value={forma.id.toString()}>
                            {forma.nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Conta Bancária */}
                  <div className="space-y-2">
                    <Label htmlFor="contaBancaria">Conta Bancária</Label>
                    <Select 
                      value={contaBancariaId} 
                      onValueChange={(value) => setContaBancariaId(value === "none" ? "" : value)}
                    >
                      <SelectTrigger id="contaBancaria">
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Nenhuma</SelectItem>
                        {contasBancarias?.map((conta) => (
                          <SelectItem key={conta.id} value={conta.id.toString()}>
                            {conta.nome_conta} {conta.banco ? `- ${conta.banco}` : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            )}

            {/* Observação */}
            <div className="space-y-2">
              <Label htmlFor="observacao">Observação</Label>
              <Textarea
                id="observacao"
                value={observacao}
                onChange={(e) => setObservacao(e.target.value)}
                placeholder="Observações sobre esta parcela"
                rows={2}
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
          >
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? "Salvando..." : "Salvar Alterações"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}