import React, { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Eye } from "lucide-react";

type PessoaJuridica = {
  id: number;
  cnpj: string | null;
  nome_fantasia: string | null;
  razao_social: string | null;
  email?: string | null;
  inscricao_estadual?: string | null;
  data_fundacao?: string | null;
  celular?: string | null;
  endereco?: string | null;
};

type ResumoFornecedor = {
  pessoa_juridica_id: number;
  cnpj: string | null;
  nome: string | null;
  total_contas_centavos: number;
  total_em_aberto_centavos: number;
  total_pago_centavos: number;
  total_vencido_centavos: number;
};

type LinhaRPC = {
  conta_id: number;
  descricao: string | null;
  numero_nota: string | null;
  valor_total_centavos: number;
  num_parcelas: number;
  created_at: string;
  parcela_id: number | null;
  parcela_num: number | null;
  vencimento: string | null;
  pago: boolean | null;
  data_pagamento: string | null;
  valor_parcela_centavos: number | null;
};

export default function PessoaJuridicaDetalhes() {
  const { id } = useParams<{ id: string }>();
  const fornecedorId = Number(id);
  const { toast } = useToast();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [pj, setPJ] = useState<PessoaJuridica | null>(null);
  const [resumo, setResumo] = useState<ResumoFornecedor | null>(null);
  const [linhas, setLinhas] = useState<LinhaRPC[]>([]);
  const [parcelasDialogOpen, setParcelasDialogOpen] = useState(false);
  const [parcelasDaConta, setParcelasDaConta] = useState<LinhaRPC[]>([]);
  const [contaSelecionada, setContaSelecionada] = useState<number | null>(null);

  const currency = (cent?: number | null) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(((cent ?? 0) / 100));

  const formatDate = (d?: string | null) => (d ? new Date(d).toLocaleDateString("pt-BR") : "-");

  useEffect(() => {
    let mounted = true;
    const run = async () => {
      setLoading(true);
      try {
        // 1) Pessoa Jurídica
        const { data: pjData, error: pjErr } = await supabase
          .from("pessoas_juridicas")
          .select("*")
          .eq("id", fornecedorId)
          .single();
        if (pjErr) throw pjErr;
        if (!mounted) return;
        setPJ(pjData as PessoaJuridica);

        // 2) Resumo (view)
        const { data: resData, error: resErr } = await supabase
          .from("vw_fin_resumo_por_fornecedor" as any)
          .select("*")
          .eq("pessoa_juridica_id", fornecedorId)
          .maybeSingle();
        if (resErr && String(resErr.message).toLowerCase().includes("schema cache")) {
          console.warn("Resumo indisponível no cache do PostgREST, seguindo sem:", resErr.message);
          setResumo(null);
        } else if (resErr) {
          throw resErr;
        } else {
          setResumo((resData as any) ?? null);
        }

        // 3) Contas + Parcelas (busca direta nas tabelas)
        const { data: contasData, error: contasErr } = await supabase
          .from("contas_pagar")
          .select("id, descricao, numero_nota, valor_total_centavos, num_parcelas, created_at")
          .eq("fornecedor_id", fornecedorId)
          .order("created_at", { ascending: false })
          .limit(200);
        
        if (contasErr) throw contasErr;
        if (!mounted) return;

        // Buscar parcelas de todas as contas
        const contaIds = (contasData || []).map(c => c.id);
        let parcelasData: any[] = [];
        
        if (contaIds.length > 0) {
          const { data: parcelas, error: parcelasErr } = await supabase
            .from("contas_pagar_parcelas")
            .select("id, conta_id, numero_parcela, vencimento, pago, data_pagamento, valor_centavos")
            .in("conta_id", contaIds);
          
          if (parcelasErr) throw parcelasErr;
          parcelasData = parcelas || [];
        }

        // Montar as linhas combinando contas e parcelas
        const linhasTemp: LinhaRPC[] = [];
        for (const conta of (contasData || [])) {
          const parcelasDaConta = parcelasData.filter(p => p.conta_id === conta.id);
          
          if (parcelasDaConta.length === 0) {
            // Conta sem parcelas
            linhasTemp.push({
              conta_id: conta.id,
              descricao: conta.descricao,
              numero_nota: conta.numero_nota,
              valor_total_centavos: conta.valor_total_centavos,
              num_parcelas: conta.num_parcelas || 0,
              created_at: conta.created_at,
              parcela_id: null,
              parcela_num: null,
              vencimento: null,
              pago: null,
              data_pagamento: null,
              valor_parcela_centavos: null,
            });
          } else {
            // Conta com parcelas
            for (const parcela of parcelasDaConta) {
              linhasTemp.push({
                conta_id: conta.id,
                descricao: conta.descricao,
                numero_nota: conta.numero_nota,
                valor_total_centavos: conta.valor_total_centavos,
                num_parcelas: conta.num_parcelas || parcelasDaConta.length,
                created_at: conta.created_at,
                parcela_id: parcela.id,
                parcela_num: parcela.numero_parcela,
                vencimento: parcela.vencimento,
                pago: parcela.pago,
                data_pagamento: parcela.data_pagamento,
                valor_parcela_centavos: parcela.valor_centavos,
              });
            }
          }
        }
        
        setLinhas(linhasTemp);
      } catch (err: any) {
        console.error(err);
        toast({
          title: "Erro ao carregar",
          description: err?.message || "Falha ao carregar dados do fornecedor.",
          variant: "destructive",
        });
      } finally {
        if (mounted) setLoading(false);
      }
    };
    run();
    return () => { mounted = false; };
  }, [fornecedorId]);

  // Agrupa linhas por conta
  const contas = useMemo(() => {
    const map = new Map<number, { conta_id: number; descricao: string; numero_nota: string | null; created_at: string; valor_total_centavos: number; parcelas: LinhaRPC[] }>();
    for (const l of linhas) {
      if (!map.has(l.conta_id)) {
        map.set(l.conta_id, {
          conta_id: l.conta_id,
          descricao: l.descricao ?? "-",
          numero_nota: l.numero_nota ?? null,
          created_at: l.created_at,
          valor_total_centavos: l.valor_total_centavos,
          parcelas: [],
        });
      }
      if (l.parcela_id) map.get(l.conta_id)!.parcelas.push(l);
    }
    return Array.from(map.values()).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [linhas]);

  const abrirParcelas = (contaId: number) => {
    const subset = linhas.filter(l => l.conta_id === contaId && l.parcela_id);
    setParcelasDaConta(subset);
    setContaSelecionada(contaId);
    setParcelasDialogOpen(true);
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <Button variant="outline" onClick={() => navigate(-1)}><ArrowLeft className="h-4 w-4 mr-2" />Voltar</Button>
        <div className="mt-6">Carregando...</div>
      </div>
    );
  }

  const nomePJ = pj ? (pj.nome_fantasia || pj.razao_social || `PJ #${pj.id}`) : "-";

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{nomePJ}</h1>
            <p className="text-muted-foreground">
              CNPJ: <span className="font-medium">{pj?.cnpj || "-"}</span>
            </p>
          </div>
        </div>
      </div>

      {/* Resumo financeiro */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Total em Contas</CardTitle></CardHeader>
          <CardContent className="text-2xl font-bold">{currency(resumo?.total_contas_centavos)}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Pago</CardTitle></CardHeader>
          <CardContent className="text-2xl font-bold text-green-600">{currency(resumo?.total_pago_centavos)}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Em Aberto</CardTitle></CardHeader>
          <CardContent className="text-2xl font-bold">{currency(resumo?.total_em_aberto_centavos)}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Vencido</CardTitle></CardHeader>
          <CardContent className="text-2xl font-bold text-red-600">{currency(resumo?.total_vencido_centavos)}</CardContent>
        </Card>
      </div>

      {/* Dados do PJ */}
      <Card>
        <CardHeader>
          <CardTitle>Dados da Empresa</CardTitle>
          <CardDescription>Informações cadastrais</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div><div className="text-sm text-muted-foreground">CNPJ</div><div className="font-medium">{pj?.cnpj || "-"}</div></div>
          <div><div className="text-sm text-muted-foreground">Inscrição Estadual</div><div className="font-medium">{pj?.inscricao_estadual || "Não informado"}</div></div>
          <div><div className="text-sm text-muted-foreground">E-mail</div><div className="font-medium">{pj?.email || "Não informado"}</div></div>
          <div><div className="text-sm text-muted-foreground">Celular</div><div className="font-medium">{pj?.celular || "Não informado"}</div></div>
          <div><div className="text-sm text-muted-foreground">Data de Fundação</div><div className="font-medium">{formatDate(pj?.data_fundacao)}</div></div>
          <div><div className="text-sm text-muted-foreground">Endereço</div><div className="font-medium">{pj?.endereco || "Não informado"}</div></div>
        </CardContent>
      </Card>

      {/* Histórico de contas do fornecedor */}
      <Card>
        <CardHeader>
          <CardTitle>Histórico de Contas a Pagar</CardTitle>
          <CardDescription>Últimas {contas.length} contas registradas</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Nº Nota</TableHead>
                  <TableHead>Data Cadastro</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Parcelas</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {contas.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-6">
                      Nenhuma conta registrada para este CNPJ.
                    </TableCell>
                  </TableRow>
                ) : (
                  contas.map((c) => (
                    <TableRow key={c.conta_id}>
                      <TableCell className="max-w-[420px]">
                        <span className="line-clamp-2">{c.descricao}</span>
                      </TableCell>
                      <TableCell>{c.numero_nota || "-"}</TableCell>
                      <TableCell>{formatDate(c.created_at)}</TableCell>
                      <TableCell>{currency(c.valor_total_centavos)}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="cursor-pointer" onClick={() => abrirParcelas(c.conta_id)}>
                          {c.parcelas.length || 0} parcela(s)
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="outline" size="sm" onClick={() => navigate(`/financeiro/conta/${c.conta_id}`)}>
                          <Eye className="h-4 w-4 mr-2" /> Ver conta
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Dialog de parcelas */}
      <Dialog open={parcelasDialogOpen} onOpenChange={setParcelasDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader><DialogTitle>Parcelas — Conta #{contaSelecionada ?? "-"}</DialogTitle></DialogHeader>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Vencimento</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Data Pagto</TableHead>
                  <TableHead>Valor Parcela</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {parcelasDaConta.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-6">Nenhuma parcela.</TableCell>
                  </TableRow>
                ) : (
                  parcelasDaConta
                    .sort((a,b) => (a.parcela_num ?? 0) - (b.parcela_num ?? 0))
                    .map((p) => (
                      <TableRow key={p.parcela_id ?? `${p.conta_id}-${p.parcela_num}`}>
                        <TableCell>{p.parcela_num ?? "-"}</TableCell>
                        <TableCell>{formatDate(p.vencimento)}</TableCell>
                        <TableCell>
                          {p.pago ? <Badge className="bg-green-500">Pago</Badge> :
                            (p.vencimento && new Date(p.vencimento) < new Date() ? <Badge variant="destructive">Vencido</Badge> : <Badge>Aberto</Badge>)
                          }
                        </TableCell>
                        <TableCell>{formatDate(p.data_pagamento)}</TableCell>
                        <TableCell>{currency(p.valor_parcela_centavos)}</TableCell>
                      </TableRow>
                    ))
                )}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
