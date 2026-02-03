import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Save, Trash2, FileText, Building2, Tag, Calendar, CreditCard, Banknote } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

type ContaPagar = {
  id: number;
  descricao: string;
  numero_nota?: string | null;
  chave_nfe?: string | null;
  valor_total_centavos: number;
  num_parcelas: number;
  qtd_parcelas: number;
  referencia?: string | null;
  fornecedor_id?: number | null;
  categoria_id?: number | null;
  filial_id?: number | null;
  data_emissao?: string | null;
  observacoes?: string | null;
  fornecedor?: { nome_fantasia?: string; razao_social?: string; cnpj?: string };
  categoria?: { nome: string; cor: string };
  filial?: { nome: string };
};

type Parcela = {
  id: number;
  numero_parcela: number;
  vencimento: string;
  valor_centavos: number;
  pago: boolean;
  data_pagamento?: string | null;
  forma_pagamento?: { nome: string } | null;
  conta_bancaria?: { nome: string; banco?: string } | null;
  observacoes?: string | null;
};

export default function ContaDetalhes() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [conta, setConta] = useState<ContaPagar | null>(null);
  const [parcelas, setParcelas] = useState<Parcela[]>([]);

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
        .select(`
          *,
          fornecedor:pessoas_juridicas!fornecedor_id(nome_fantasia, razao_social, cnpj),
          categoria:categorias_financeiras(nome, cor),
          filial:filiais(nome)
        `)
        .eq("id", contaId)
        .single();

      if (error) throw error;

      const c = data as unknown as ContaPagar;
      setConta(c);
      
      setForm({
        descricao: c.descricao ?? "",
        numero_nota: c.numero_nota ?? "",
        chave_nfe: c.chave_nfe ?? "",
        valor_total: formatCurrencyToInput(c.valor_total_centavos),
        num_parcelas: String(c.num_parcelas ?? c.qtd_parcelas ?? 1),
        referencia: c.referencia ?? "",
        fornecedor_id: c.fornecedor_id ? String(c.fornecedor_id) : "",
        categoria_id: c.categoria_id ? String(c.categoria_id) : "",
        observacoes: c.observacoes ?? "",
      });

      // Buscar parcelas
      const { data: parcelasData, error: parcelasError } = await supabase
        .from("contas_pagar_parcelas")
        .select(`
          *,
          forma_pagamento:formas_pagamento(nome),
          conta_bancaria:contas_bancarias(nome, banco)
        `)
        .eq("conta_id", contaId)
        .order("numero_parcela", { ascending: true });

      if (parcelasError) throw parcelasError;
      setParcelas((parcelasData || []) as Parcela[]);

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

  const formatCurrency = (centavos: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(centavos / 100);
  };

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'dd/MM/yyyy', { locale: ptBR });
  };

  if (loading) return <div className="container mx-auto p-6">Carregando...</div>;

  if (!conta) {
    return (
      <div className="container mx-auto p-6">
        <p className="text-muted-foreground">Conta não encontrada</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <FileText className="h-8 w-8" />
              Conta #{contaId}
            </h1>
            <p className="text-muted-foreground mt-1">{conta.descricao}</p>
          </div>
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

      {/* Informações Principais */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Fornecedor
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              <div className="font-semibold">
                {conta.fornecedor?.nome_fantasia || conta.fornecedor?.razao_social || 'Não informado'}
              </div>
              {conta.fornecedor?.cnpj && (
                <div className="text-sm text-muted-foreground font-mono">
                  CNPJ: {conta.fornecedor.cnpj}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Tag className="h-4 w-4" />
              Categoria
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              {conta.categoria && (
                <>
                  <div 
                    className="h-3 w-3 rounded-full" 
                    style={{ backgroundColor: conta.categoria.cor }}
                  />
                  <span className="font-medium">{conta.categoria.nome}</span>
                </>
              )}
              {!conta.categoria && <span className="text-muted-foreground">Não informada</span>}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Data de Emissão
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="font-medium">
              {conta.data_emissao ? formatDate(conta.data_emissao) : 'Não informada'}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detalhes Completos da Conta */}
      <Card>
        <CardHeader>
          <CardTitle>Detalhes da Conta</CardTitle>
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
            <div className="md:col-span-2">
              <Label>Chave NFe</Label>
              <Input
                value={form.chave_nfe}
                className="font-mono text-sm"
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
              <Label>Filial</Label>
              <Input
                disabled
                value={conta.filial?.nome || 'Não informada'}
                className="bg-muted"
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

      {/* Parcelas */}
      <Card>
        <CardHeader>
          <CardTitle>Parcelas ({parcelas.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Parcela</TableHead>
                  <TableHead>Vencimento</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Data Pagamento</TableHead>
                  <TableHead>Valor Pago</TableHead>
                  <TableHead>Forma Pagamento</TableHead>
                  <TableHead>Conta Bancária</TableHead>
                  <TableHead>Observação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {parcelas.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center text-muted-foreground">
                      Nenhuma parcela encontrada
                    </TableCell>
                  </TableRow>
                ) : (
                  parcelas.map((parcela) => (
                    <TableRow key={parcela.id}>
                      <TableCell className="font-medium">
                        {parcela.numero_parcela}/{parcelas.length}
                      </TableCell>
                      <TableCell>{formatDate(parcela.vencimento)}</TableCell>
                      <TableCell>{formatCurrency(parcela.valor_centavos)}</TableCell>
                      <TableCell>
                        <Badge variant={parcela.pago ? "default" : "secondary"}>
                          {parcela.pago ? "Pago" : "Pendente"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {parcela.data_pagamento ? formatDate(parcela.data_pagamento) : '-'}
                      </TableCell>
                      <TableCell>
                        {parcela.pago ? formatCurrency(parcela.valor_centavos) : '-'}
                      </TableCell>
                      <TableCell>
                        {parcela.forma_pagamento?.nome || '-'}
                      </TableCell>
                      <TableCell>
                        {parcela.conta_bancaria ? (
                          <div className="text-sm">
                            <div className="font-medium">{parcela.conta_bancaria.nome}</div>
                            {parcela.conta_bancaria.banco && (
                              <div className="text-muted-foreground">{parcela.conta_bancaria.banco}</div>
                            )}
                          </div>
                        ) : '-'}
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        {parcela.observacoes || '-'}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
