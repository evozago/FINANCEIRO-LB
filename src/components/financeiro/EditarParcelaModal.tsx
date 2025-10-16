import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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

interface EditarParcelaModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  parcela: Parcela | null;
  onSuccess: () => void;
}

export function EditarParcelaModal({ open, onOpenChange, parcela, onSuccess }: EditarParcelaModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<Partial<Parcela>>({});
  const [contasBancarias, setContasBancarias] = useState<Array<{ id: number; nome_conta: string; banco: string | null }>>([]);
  const [formasPagamento, setFormasPagamento] = useState<Array<{ id: number; nome: string }>>([]);

  const sanitizeOptionalString = (value: string | null | undefined): string | null => {
    const trimmed = (value ?? "").trim();
    return trimmed.length > 0 ? trimmed : null;
  };

  useEffect(() => {
    if (parcela) {
      setFormData({
        ...parcela,
        pago_em: parcela.pago_em ?? null,
        valor_pago_centavos: parcela.valor_pago_centavos ?? parcela.valor_parcela_centavos,
      });
    }
  }, [parcela]);

  useEffect(() => {
    async function fetchData() {
      const [contasResult, formasResult] = await Promise.all([
        supabase.from("contas_bancarias").select("*").eq("ativa", true).order("nome_conta"),
        supabase.from("formas_pagamento").select("*").order("nome")
      ]);

      if (contasResult.error) {
        console.error("Erro ao carregar contas bancárias:", contasResult.error);
      }

      if (formasResult.error) {
        console.error("Erro ao carregar formas de pagamento:", formasResult.error);
      }

      setContasBancarias((contasResult.data as Array<{ id: number; nome_conta: string; banco: string | null }> | null) ?? []);
      setFormasPagamento((formasResult.data as Array<{ id: number; nome: string }> | null) ?? []);
    }
    if (open) fetchData();
  }, [open]);

  const handleSave = async () => {
    if (!parcela) return;

    setLoading(true);
    try {
      const valorAnterior = parcela.valor_parcela_centavos;
      const novoValor = Math.max(0, Math.round(formData.valor_parcela_centavos ?? valorAnterior));
      const diferenca = novoValor - valorAnterior;

      if (!formData.vencimento) {
        toast.error("Informe a data de vencimento da parcela.");
        setLoading(false);
        return;
      }

      const pago = Boolean(formData.pago);
      const valorPago = pago ? Math.max(0, Math.round(formData.valor_pago_centavos ?? novoValor)) : null;
      const pagoEm = pago ? formData.pago_em || null : null;
      const formaPagamentoId = pago ? formData.forma_pagamento_id ?? null : null;
      const contaBancariaId = pago ? formData.conta_bancaria_id ?? null : null;

      // 1. Atualizar a parcela
      const { error: parcelaError } = await supabase
        .from("contas_pagar_parcelas")
        .update({
          valor_parcela_centavos: novoValor,
          vencimento: formData.vencimento,
          pago,
          pago_em: pagoEm,
          valor_pago_centavos: valorPago,
          forma_pagamento_id: formaPagamentoId,
          conta_bancaria_id: contaBancariaId,
          observacao: sanitizeOptionalString(formData.observacao),
        })
        .eq("id", parcela.id);

      if (parcelaError) throw parcelaError;

      // 2. Atualizar o valor total da conta pai se houve mudança no valor
      if (diferenca !== 0) {
        const { data: contaAtual, error: contaFetchError } = await supabase
          .from("contas_pagar")
          .select("valor_total_centavos")
          .eq("id", parcela.conta_id)
          .single();

        if (contaFetchError) throw contaFetchError;

        const novoTotal = (contaAtual.valor_total_centavos || 0) + diferenca;

        const { error: contaUpdateError } = await supabase
          .from("contas_pagar")
          .update({ valor_total_centavos: novoTotal })
          .eq("id", parcela.conta_id);

        if (contaUpdateError) throw contaUpdateError;
      }

      toast.success("Parcela atualizada com sucesso!");
      onSuccess();
      onOpenChange(false);
    } catch (error: unknown) {
      console.error("Erro ao salvar parcela:", error);
      const message = error instanceof Error ? error.message : "Erro desconhecido";
      toast.error("Erro ao salvar parcela: " + message);
    } finally {
      setLoading(false);
    }
  };

  if (!parcela) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Editar Parcela {parcela.numero_parcela || parcela.parcela_num}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Valor da Parcela */}
          <div className="grid gap-2">
            <Label htmlFor="valor">Valor da Parcela *</Label>
            <CurrencyInput
              id="valor"
              value={formData.valor_parcela_centavos ?? 0}
              onValueChange={(value) => setFormData({ ...formData, valor_parcela_centavos: value })}
            />
          </div>

          {/* Data de Vencimento */}
          <div className="grid gap-2">
            <Label htmlFor="vencimento">Data de Vencimento *</Label>
            <Input
              id="vencimento"
              type="date"
              value={formData.vencimento || ""}
              onChange={(e) => setFormData({ ...formData, vencimento: e.target.value })}
            />
          </div>

          {/* Status de Pagamento */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="pago"
              checked={Boolean(formData.pago)}
              onCheckedChange={(checked) => setFormData({ ...formData, pago: checked === true })}
            />
            <Label htmlFor="pago" className="cursor-pointer">
              Marcar como pago
            </Label>
          </div>

           {/* Campos de Pagamento (aparecem se marcado como pago) */}
          {formData.pago && (
            <>
              <div className="grid gap-2">
                <Label htmlFor="data_pagamento">Data de Pagamento</Label>
                <Input
                  id="data_pagamento"
                  type="date"
                  value={formData.pago_em || ""}
                  onChange={(e) => setFormData({ ...formData, pago_em: e.target.value })}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="valor_pago">Valor Pago</Label>
                <CurrencyInput
                  id="valor_pago"
                  value={formData.valor_pago_centavos ?? formData.valor_parcela_centavos ?? 0}
                  onValueChange={(value) => setFormData({ ...formData, valor_pago_centavos: value })}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="forma_pagamento">Forma de Pagamento</Label>
                <Select
                  value={
                    formData.forma_pagamento_id != null
                      ? formData.forma_pagamento_id.toString()
                      : "none"
                  }
                  onValueChange={(value) =>
                    setFormData({
                      ...formData,
                      forma_pagamento_id: value === "none" ? null : Number.parseInt(value, 10),
                    })
                  }
                >
                  <SelectTrigger id="forma_pagamento">
                    <SelectValue placeholder="Selecione a forma de pagamento" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhuma</SelectItem>
                    {formasPagamento.map((forma) => (
                      <SelectItem key={forma.id} value={forma.id.toString()}>
                        {forma.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="conta_bancaria">Conta Bancária</Label>
                <Select
                  value={
                    formData.conta_bancaria_id != null
                      ? formData.conta_bancaria_id.toString()
                      : "none"
                  }
                  onValueChange={(value) =>
                    setFormData({
                      ...formData,
                      conta_bancaria_id: value === "none" ? null : Number.parseInt(value, 10),
                    })
                  }
                >
                  <SelectTrigger id="conta_bancaria">
                    <SelectValue placeholder="Selecione a conta bancária" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhuma</SelectItem>
                    {contasBancarias.map((conta) => (
                      <SelectItem key={conta.id} value={conta.id.toString()}>
                        {conta.nome_conta} {conta.banco ? `- ${conta.banco}` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          {/* Observação */}
          <div className="grid gap-2">
            <Label htmlFor="observacao">Observação</Label>
            <Textarea
              id="observacao"
              value={formData.observacao || ""}
              onChange={(e) => setFormData({ ...formData, observacao: e.target.value })}
              placeholder="Observações sobre esta parcela"
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading ? "Salvando..." : "Salvar Alterações"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
