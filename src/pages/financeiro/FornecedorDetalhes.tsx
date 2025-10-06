import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Building2, Mail, Phone, MapPin, FileText, TrendingUp } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface FornecedorData {
  id: number;
  nome_fantasia: string;
  razao_social: string;
  cnpj: string;
  email: string;
  celular: string;
  endereco: string;
}

interface ContaFornecedor {
  id: number;
  descricao: string;
  numero_nota: string;
  valor_total_centavos: number;
  qtd_parcelas: number;
  data_emissao: string;
  parcelas_pagas: number;
  parcelas_pendentes: number;
  valor_pago: number;
  valor_pendente: number;
}

export function FornecedorDetalhes() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [fornecedor, setFornecedor] = useState<FornecedorData | null>(null);
  const [contas, setContas] = useState<ContaFornecedor[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFornecedorDetalhes();
  }, [id]);

  const fetchFornecedorDetalhes = async () => {
    try {
      setLoading(true);

      // Buscar dados do fornecedor
      const { data: fornecedorData, error: fornecedorError } = await supabase
        .from('pessoas_juridicas')
        .select('*')
        .eq('id', Number(id))
        .single();

      if (fornecedorError) throw fornecedorError;
      setFornecedor(fornecedorData);

      // Buscar contas do fornecedor
      const { data: contasData, error: contasError } = await supabase
        .from('contas_pagar')
        .select(`
          id,
          descricao,
          numero_nota,
          valor_total_centavos,
          qtd_parcelas,
          data_emissao
        `)
        .eq('fornecedor_id', Number(id))
        .order('data_emissao', { ascending: false });

      if (contasError) throw contasError;

      // Para cada conta, buscar informações das parcelas
      const contasComParcelas = await Promise.all(
        contasData.map(async (conta) => {
          const { data: parcelas } = await supabase
            .from('contas_pagar_parcelas')
            .select('pago, valor_parcela_centavos, valor_pago_centavos')
            .eq('conta_id', conta.id);

          const parcelasPagas = parcelas?.filter(p => p.pago).length || 0;
          const parcelasPendentes = (conta.qtd_parcelas || 1) - parcelasPagas;
          const valorPago = parcelas?.filter(p => p.pago).reduce((sum, p) => sum + (p.valor_pago_centavos || p.valor_parcela_centavos), 0) || 0;
          const valorPendente = parcelas?.filter(p => !p.pago).reduce((sum, p) => sum + p.valor_parcela_centavos, 0) || 0;

          return {
            ...conta,
            parcelas_pagas: parcelasPagas,
            parcelas_pendentes: parcelasPendentes,
            valor_pago: valorPago,
            valor_pendente: valorPendente
          };
        })
      );

      setContas(contasComParcelas);
    } catch (error: any) {
      console.error('Erro ao carregar detalhes do fornecedor:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os detalhes do fornecedor.',
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

  const calcularTotais = () => {
    const totalComprado = contas.reduce((sum, c) => sum + c.valor_total_centavos, 0);
    const totalPago = contas.reduce((sum, c) => sum + c.valor_pago, 0);
    const totalPendente = contas.reduce((sum, c) => sum + c.valor_pendente, 0);
    const totalContas = contas.length;

    return { totalComprado, totalPago, totalPendente, totalContas };
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

  if (!fornecedor) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <p className="text-muted-foreground">Fornecedor não encontrado</p>
        </div>
      </div>
    );
  }

  const totais = calcularTotais();

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
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Building2 className="h-8 w-8" />
              {fornecedor.nome_fantasia || fornecedor.razao_social}
            </h1>
            <p className="text-muted-foreground">{fornecedor.razao_social}</p>
          </div>
        </div>
      </div>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total de Contas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totais.totalContas}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Comprado</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totais.totalComprado)}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Pago</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">{formatCurrency(totais.totalPago)}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Pendente</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning">{formatCurrency(totais.totalPendente)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="contas" className="w-full">
        <TabsList>
          <TabsTrigger value="contas">Contas a Pagar</TabsTrigger>
          <TabsTrigger value="info">Informações</TabsTrigger>
        </TabsList>

        <TabsContent value="contas" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Histórico de Contas a Pagar</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Descrição/NFe</TableHead>
                      <TableHead>Data Emissão</TableHead>
                      <TableHead>Valor Total</TableHead>
                      <TableHead>Parcelas</TableHead>
                      <TableHead>Pagas</TableHead>
                      <TableHead>Valor Pago</TableHead>
                      <TableHead>Valor Pendente</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {contas.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center text-muted-foreground">
                          Nenhuma conta encontrada
                        </TableCell>
                      </TableRow>
                    ) : (
                      contas.map((conta) => (
                        <TableRow
                          key={conta.id}
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => navigate(`/financeiro/conta/${conta.id}`)}
                        >
                          <TableCell className="font-medium">
                            {conta.numero_nota ? `NFe ${conta.numero_nota}` : conta.descricao}
                          </TableCell>
                          <TableCell>{conta.data_emissao ? formatDate(conta.data_emissao) : '-'}</TableCell>
                          <TableCell>{formatCurrency(conta.valor_total_centavos)}</TableCell>
                          <TableCell>{conta.qtd_parcelas || 1}x</TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {conta.parcelas_pagas}/{conta.qtd_parcelas || 1}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-success">{formatCurrency(conta.valor_pago)}</TableCell>
                          <TableCell className="text-warning">{formatCurrency(conta.valor_pendente)}</TableCell>
                          <TableCell>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/financeiro/conta/${conta.id}`);
                              }}
                            >
                              <FileText className="h-4 w-4" />
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
        </TabsContent>

        <TabsContent value="info">
          <Card>
            <CardHeader>
              <CardTitle>Informações do Fornecedor</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Building2 className="h-4 w-4" />
                    <span className="text-sm font-medium">Razão Social</span>
                  </div>
                  <p>{fornecedor.razao_social || '-'}</p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Building2 className="h-4 w-4" />
                    <span className="text-sm font-medium">Nome Fantasia</span>
                  </div>
                  <p>{fornecedor.nome_fantasia || '-'}</p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <FileText className="h-4 w-4" />
                    <span className="text-sm font-medium">CNPJ</span>
                  </div>
                  <p className="font-mono">{fornecedor.cnpj || '-'}</p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Mail className="h-4 w-4" />
                    <span className="text-sm font-medium">E-mail</span>
                  </div>
                  <p>{fornecedor.email || '-'}</p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Phone className="h-4 w-4" />
                    <span className="text-sm font-medium">Celular</span>
                  </div>
                  <p>{fornecedor.celular || '-'}</p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    <span className="text-sm font-medium">Endereço</span>
                  </div>
                  <p>{fornecedor.endereco || '-'}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
