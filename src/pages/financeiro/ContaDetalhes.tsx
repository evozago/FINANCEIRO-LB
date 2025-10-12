import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Save, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";

type ContaPagar = {
  id: number;
  descricao: string;
  numero_nota?: string | null;
  chave_nfe?: string | null;
  valor_total_centavos: number;
  num_parcelas: number;
  referencia?: string | null;
  fornecedor_id?: number | null;
  categoria_id?: number | null;
  observacoes?: string | null;
};

export default function ContaDetalhes() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    descricao: "",
    numero_nota: "",
    chave_nfe: "",
    valor_total: "",
    num_parcelas: "1",
    referencia: "",
    fornecedor_id: "",
    categoria_id: "",
    observacoes: "",
  });

  const contaId = Number(id);

  const formatCurrencyToInput = (centavos: number | null | undefined) =>
    centavos ? (centavos / 100).toString().replace(".", ",") : "";

  const parseCurrencyToCentavos = (valor: string) => {
    const normalized = valor.replace(/\./g, "").replace(",", ".");
    const num = Number(normalized);
    if (Number.isNaN(num)) return 0;
    return Math.round(num * 100);
    };

  const fetchConta = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("contas_pagar")
        .select("*")
        .eq("id", contaId)
        .single();

      if (error) throw error;

      const c = data as unknown as ContaPagar;
      setForm({
        descricao: c.descricao ?? "",
        numero_nota: c.numero_nota ?? "",
        chave_nfe: c.chave_nfe ?? "",
        valor_total: formatCurrencyToInput(c.valor_total_centavos),
        num_parcelas: String(c.num_parcelas ?? 1),
        referencia: c.referencia ?? "",
        fornecedor_id: c.fornecedor_id ? String(c.fornecedor_id) : "",
        categoria_id: c.categoria_id ? String(c.categoria_id) : "",
        observacoes: c.observacoes ?? "",
      });
    } catch (error) {
      console.error("Erro ao carregar conta:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar a conta.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        descricao: form.descricao,
        numero_nota: form.numero_nota || null,
        chave_nfe: form.chave_nfe || null,
        valor_total_centavos: parseCurrencyToCentavos(form.valor_total),
        num_parcelas: parseInt(form.num_parcelas || "1", 10),
        referencia: form.referencia || null,
        fornecedor_id: form.fornecedor_id ? parseInt(form.fornecedor_id, 10) : null,
        categoria_id: form.categoria_id ? parseInt(form.categoria_id, 10) : null,
        observacoes: form.observacoes || null,
      };

      const { error } = await supabase
        .from("contas_pagar")
        .update(payload)
        .eq("id", contaId);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Conta a pagar atualizada com sucesso.",
      });
      navigate("/financeiro/contas-pagar");
    } catch (error) {
      console.error("Erro ao salvar:", error);
      toast({
        title: "Erro",
        description: "Não foi possível salvar as alterações.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Tem certeza que deseja excluir esta conta e todas as parcelas?")) return;
    try {
      const { error } = await supabase.from("contas_pagar").delete().eq("id", contaId);
      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Conta a pagar excluída com sucesso.",
      });
      navigate("/financeiro/contas-pagar");
    } catch (error) {
      console.error("Erro ao excluir conta:", error);
      toast({
        title: "Erro",
        description: "Não foi possível excluir a conta.",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    if (!Number.isFinite(contaId)) {
      toast({
        title: "Erro",
        description: "ID inválido.",
        variant: "destructive",
      });
      navigate("/financeiro/contas-pagar");
      return;
    }
    fetchConta();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contaId]);

  if (loading) return <div>Carregando...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          <h1 className="text-3xl font-bold tracking-tight">Conta #{contaId}</h1>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleDelete}>
            <Trash2 className="h-4 w-4 mr-2" />
            Excluir
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            <Save className="h-4 w-4 mr-2" />
            Salvar
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Detalhes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Descrição</Label>
              <Input
                value={form.descricao}
                onChange={(e) => setForm((f) => ({ ...f, descricao: e.target.value }))}
              />
            </div>
            <div>
              <Label>Número da Nota</Label>
              <Input
                value={form.numero_nota}
                onChange={(e) =>
                  setForm((f) => ({ ...f, numero_nota: e.target.value }))
                }
              />
            </div>
            <div>
              <Label>Chave NFe</Label>
              <Input
                value={form.chave_nfe}
                onChange={(e) => setForm((f) => ({ ...f, chave_nfe: e.target.value }))}
              />
            </div>
            <div>
              <Label>Valor Total (R$)</Label>
              <Input
                inputMode="decimal"
                placeholder="0,00"
                value={form.valor_total}
                onChange={(e) => setForm((f) => ({ ...f, valor_total: e.target.value }))}
              />
            </div>
            <div>
              <Label>Nº de Parcelas</Label>
              <Input
                type="number"
                min={1}
                value={form.num_parcelas}
                onChange={(e) =>
                  setForm((f) => ({ ...f, num_parcelas: e.target.value }))
                }
              />
            </div>
            <div>
              <Label>Referência</Label>
              <Input
                value={form.referencia}
                onChange={(e) =>
                  setForm((f) => ({ ...f, referencia: e.target.value }))
                }
              />
            </div>
            <div>
              <Label>Fornecedor (ID)</Label>
              <Input
                placeholder="ex: 12"
                value={form.fornecedor_id}
                onChange={(e) =>
                  setForm((f) => ({ ...f, fornecedor_id: e.target.value }))
                }
              />
            </div>
            <div>
              <Label>Categoria (ID)</Label>
              <Input
                placeholder="ex: 5"
                value={form.categoria_id}
                onChange={(e) =>
                  setForm((f) => ({ ...f, categoria_id: e.target.value }))
                }
              />
            </div>
          </div>

          <Separator />

          <div>
            <Label>Observações</Label>
            <Textarea
              rows={4}
              value={form.observacoes}
              onChange={(e) =>
                setForm((f) => ({ ...f, observacoes: e.target.value }))
              }
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
