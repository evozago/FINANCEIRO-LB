import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Edit2, Trash2, Calendar, DollarSign, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ContaDetalhesData {
  id: number;
  descricao: string;
  numero_nota: string;
  chave_nfe: string;
  valor_total_centavos: number;
  qtd_parcelas: number;
  data_emissao: string;
  categoria: string;
  categoria_id: number;
  fornecedor: string;
  fornecedor_id: number;
  filial: string;
  filial_id: number;
  referencia: string;
}

interface ParcelaData {
  id: number;
  numero_parcela: number;
  valor_parcela_centavos: number;
  vencimento: string;
  pago: boolean;
  pago_em: string | null;
  forma_pagamento: string | null;
  conta_bancaria: string | null;
  valor_pago_centavos: number | null;
  observacao: string | null;
}

export function ContaDetalhes() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [conta, setConta] = useState<ContaDetalhesData | null>(null);
  const [parcelas, setParcelas] = useState<ParcelaData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchContaDetalhes();
  }, [id]);

  const fetchContaDetalhes = async () => {
    try {
      setLoading(true);

      // Buscar dados da conta
      const { data: contaData, error: contaError } = await supabase
        .from('contas_pagar')
        .select(`
          id,
          descricao,
          numero_nota,
          chave_nfe,
          valor_total_centavos,
          qtd_parcelas,
          data_emissao,
          referencia,
          categoria_id,
          fornecedor_id,
          filial_id
        `)
        .eq('id', Number(id))
        .single();

      if (contaError) throw contaError;

      // Buscar dados relacionados
      const [categoriaRes, fornecedorRes, filialRes] = await Promise.all([
        contaData.categoria_id ? supabase.from('categorias_financeiras').select('nome').eq('id', contaData.categoria_id).single() : null,
        supabase.from('pessoas_juridicas').select('nome_fantasia, razao_social').eq('id', contaData.fornecedor_id).single(),
        contaData.filial_id ? supabase.from('filiais').select('nome').eq('id', contaData.filial_id).single() : null
      ]);

      const contaFormatted: ContaDetalhesData = {
        id: contaData.id,
        descricao: contaData.descricao || '',
        numero_nota: contaData.numero_nota || '',
        chave_nfe: contaData.chave_nfe || '',
        valor_total_centavos: contaData.valor_total_centavos,
        qtd_parcelas: contaData.qtd_parcelas || 1,
        data_emissao: contaData.data_emissao,
        categoria: categoriaRes?.data?.nome || 'Sem categoria',
        categoria_id: contaData.categoria_id,
        fornecedor: fornecedorRes?.data?.nome_fantasia || fornecedorRes?.data?.razao_social || 'Sem fornecedor',
        fornecedor_id: contaData.fornecedor_id,
        filial: filialRes?.data?.nome || 'Sem filial',
        filial_id: contaData.filial_id,
        referencia: contaData.referencia || ''
      };

      setConta(contaFormatted);

      // Buscar parcelas
      const { data: parcelasData, error: parcelasError } = await supabase
        .from('contas_pagar_parcelas')
        .select(`
          id,
          numero_parcela,
          valor_parcela_centavos,
          vencimento,
          pago,
          pago_em,
          valor_pago_centavos,
          observacao,
          forma_pagamento_id,
          conta_bancaria_id
        `)
        .eq('conta_id', Number(id))
        .order('numero_parcela', { ascending: true });

      if (parcelasError) throw parcelasError;

      // Buscar dados relacionados das parcelas
      const formasPagIds = [...new Set(parcelasData.filter(p => p.forma_pagamento_id).map(p => p.forma_pagamento_id!))] as number[];
      const contasBancIds = [...new Set(parcelasData.filter(p => p.conta_bancaria_id).map(p => p.conta_bancaria_id!))] as number[];

      const formasData = formasPagIds.length > 0 
        ? await supabase.from('formas_pagamento').select('id, nome').in('id', formasPagIds)
        : { data: [] as Array<{id: number, nome: string}> };
      
      const contasData = contasBancIds.length > 0 
        ? await supabase.from('contas_bancarias').select('id, nome_conta, banco').in('id', contasBancIds)
        : { data: [] as Array<{id: number, nome_conta: string, banco: string}> };

      const formasMap = new Map((formasData.data || []).map(f => [f.id, f.nome]));
      const contasMap = new Map((contasData.data || []).map(c => [c.id, `${c.nome_conta} - ${c.banco}`]));

      const parcelasFormatted: ParcelaData[] = parcelasData.map(p => ({
        id: p.id,
        numero_parcela: p.numero_parcela,
        valor_parcela_centavos: p.valor_parcela_centavos,
        vencimento: p.vencimento,
        pago: p.pago,
        pago_em: p.pago_em || null,
        forma_pagamento: p.forma_pagamento_id ? (formasMap.get(p.forma_pagamento_id) || null) : null,
        conta_bancaria: p.conta_bancaria_id ? (contasMap.get(p.conta_bancaria_id) || null) : null,
        valor_pago_centavos: p.valor_pago_centavos || null,
        observacao: p.observacao || null
      }));

      setParcelas(parcelasFormatted);
    } catch (error: any) {
      console.error('Erro ao carregar detalhes da conta:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os detalhes da conta.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (centavos: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(centavos / 100);
  };

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'dd/MM/yyyy', { locale: ptBR });
  };

  const getStatusBadge = (parcela: ParcelaData) => {
    if (parcela.pago) {
      return <Badge className="bg-success text-success-foreground">Pago</Badge>;
    }
    
    const hoje = new Date();
    const vencimento = new Date(parcela.vencimento);
    
    if (vencimento < hoje) {
      return <Badge variant="destructive">Vencida</Badge>;
    }
    
    return <Badge className="bg-warning text-warning-foreground">Aberto</Badge>;
  };

  const calcularProgresso = () => {
    if (!parcelas.length) return 0;
    const pagas = parcelas.filter(p => p.pago).length;
    return (pagas / parcelas.length) * 100;
  };

  const calcularValorPago = () => {
    return parcelas
      .filter(p => p.pago)
      .reduce((sum, p) => sum + (p.valor_pago_centavos || p.valor_parcela_centavos), 0);
  };

  const calcularValorPendente = () => {
    return parcelas
      .filter(p => !p.pago)
      .reduce((sum, p) => sum + p.valor_parcela_centavos, 0);
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!conta) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <p className="text-muted-foreground">Conta não encontrada</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/financeiro/contas-pagar')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Detalhes da Conta</h1>
            <p className="text-muted-foreground">
              ID: {conta.id} • {conta.numero_nota || conta.referencia} • {conta.qtd_parcelas} parcelas
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Edit2 className="h-4 w-4 mr-2" />
            Editar
          </Button>
          <Button variant="destructive" size="sm">
            <Trash2 className="h-4 w-4 mr-2" />
            Excluir
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="geral" className="w-full">
        <TabsList>
          <TabsTrigger value="geral">Visão Geral</TabsTrigger>
          <TabsTrigger value="historico">Histórico</TabsTrigger>
        </TabsList>

        <TabsContent value="geral" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Coluna Esquerda - Informações */}
            <div className="lg:col-span-2 space-y-6">
              {/* Informações da Conta */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Informações da Conta
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h3 className="font-semibold text-lg">{conta.numero_nota ? `NFe ${conta.numero_nota}` : conta.descricao}</h3>
                    {conta.data_emissao && (
                      <p className="text-sm text-muted-foreground">
                        Criada em {formatDate(conta.data_emissao)}
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1 flex items-center gap-2">
                        <DollarSign className="h-4 w-4" />
                        Valor Total
                      </p>
                      <p className="text-2xl font-bold">{formatCurrency(conta.valor_total_centavos)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1 flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        Parcelas
                      </p>
                      <p className="text-2xl font-bold">{conta.qtd_parcelas}x</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Categoria</span>
                      <span className="text-sm font-medium">{conta.categoria}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Filial</span>
                      <span className="text-sm font-medium">{conta.filial}</span>
                    </div>
                  </div>

                  {conta.chave_nfe && (
                    <div className="bg-muted p-3 rounded-lg">
                      <p className="text-xs text-muted-foreground mb-1">Chave de Acesso</p>
                      <p className="text-xs font-mono break-all">{conta.chave_nfe}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Parcelas */}
              <Card>
                <CardHeader>
                  <CardTitle>Parcelas</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Parcela</TableHead>
                          <TableHead>Valor</TableHead>
                          <TableHead>Vencimento</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Data Pagamento</TableHead>
                          <TableHead>Banco Pagador</TableHead>
                          <TableHead>Código</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {parcelas.map((parcela) => (
                          <TableRow 
                            key={parcela.id}
                            className="cursor-pointer hover:bg-muted/50"
                            onClick={() => {
                              // Futura navegação para detalhes da parcela
                            }}
                          >
                            <TableCell>{parcela.numero_parcela}/{conta.qtd_parcelas}</TableCell>
                            <TableCell>{formatCurrency(parcela.valor_parcela_centavos)}</TableCell>
                            <TableCell>
                              <span className={new Date(parcela.vencimento) < new Date() && !parcela.pago ? 'text-destructive' : ''}>
                                {formatDate(parcela.vencimento)}
                              </span>
                            </TableCell>
                            <TableCell>{getStatusBadge(parcela)}</TableCell>
                            <TableCell>{parcela.pago_em ? formatDate(parcela.pago_em) : '-'}</TableCell>
                            <TableCell className="text-sm">{parcela.conta_bancaria || '-'}</TableCell>
                            <TableCell className="text-sm">{parcela.observacao || '-'}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Coluna Direita - Progresso e Fornecedor */}
            <div className="space-y-6">
              {/* Progresso de Pagamento */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Progresso de Pagamento</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Concluído</span>
                      <span className="font-medium">{Math.round(calcularProgresso())}%</span>
                    </div>
                    <Progress value={calcularProgresso()} className="h-2" />
                  </div>

                  <div className="space-y-2 pt-2 border-t">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Pago:</span>
                      <span className="text-sm font-medium text-success">{formatCurrency(calcularValorPago())}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Pendente:</span>
                      <span className="text-sm font-medium text-warning">{formatCurrency(calcularValorPendente())}</span>
                    </div>
                    <div className="flex justify-between pt-2 border-t">
                      <span className="text-sm font-semibold">Total:</span>
                      <span className="text-sm font-semibold">{formatCurrency(conta.valor_total_centavos)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Fornecedor */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Fornecedor</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="font-medium">{conta.fornecedor}</p>
                  </div>
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => navigate(`/financeiro/fornecedor/${conta.fornecedor_id}`)}
                  >
                    Ver Fornecedor
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="historico">
          <Card>
            <CardHeader>
              <CardTitle>Histórico de Alterações</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Em desenvolvimento...</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
