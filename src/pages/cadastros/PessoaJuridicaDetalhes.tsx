import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Building2, MapPin, Phone, Mail, Calendar, DollarSign, FileText, History, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';

interface PessoaJuridica {
  id: number;
  razao_social?: string;
  nome_fantasia?: string;
  cnpj?: string;
  insc_estadual?: string;
  celular?: string;
  email?: string;
  endereco?: string;
  fundacao?: string;
  categoria_id?: number;
  created_at: string;
  updated_at: string;
}

interface Marca {
  id: number;
  nome: string;
}

interface Representante {
  id: number;
  nome_completo: string;
}

interface Conta {
  id: number;
  descricao: string;
  numero_nota?: string;
  valor_total_centavos: number;
  created_at: string;
}

interface Pedido {
  id: number;
  numero_pedido: string;
  data_pedido: string;
  valor_liquido_centavos: number;
  status: string;
}

export function PessoaJuridicaDetalhes() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [pessoa, setPessoa] = useState<PessoaJuridica | null>(null);
  const [marcas, setMarcas] = useState<Marca[]>([]);
  const [representantes, setRepresentantes] = useState<Representante[]>([]);
  const [contas, setContas] = useState<Conta[]>([]);
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      fetchPessoaDetalhes();
      fetchMarcasVinculadas();
      fetchRepresentantesVinculados();
      fetchContas();
      fetchPedidos();
    }
  }, [id]);

  const fetchPessoaDetalhes = async () => {
    try {
      const { data, error } = await supabase
        .from('pessoas_juridicas')
        .select('*')
        .eq('id', parseInt(id!))
        .single();

      if (error) throw error;
      setPessoa(data);
    } catch (error) {
      console.error('Erro ao buscar pessoa jurídica:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os dados da pessoa.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchMarcasVinculadas = async () => {
    try {
      const { data, error } = await supabase
        .from('pj_marcas')
        .select('marca_id, marcas(id, nome)')
        .eq('pj_id', parseInt(id!));

      if (error) throw error;
      setMarcas(data?.map((item: any) => item.marcas) || []);
    } catch (error) {
      console.error('Erro ao buscar marcas:', error);
    }
  };

  const fetchRepresentantesVinculados = async () => {
    try {
      const { data, error } = await supabase
        .from('pj_representantes')
        .select('pf_id, pessoas_fisicas(id, nome_completo)')
        .eq('pj_id', parseInt(id!));

      if (error) throw error;
      setRepresentantes(data?.map((item: any) => item.pessoas_fisicas) || []);
    } catch (error) {
      console.error('Erro ao buscar representantes:', error);
    }
  };

  const fetchContas = async () => {
    try {
      const { data, error } = await supabase
        .from('contas_pagar')
        .select('id, descricao, numero_nota, valor_total_centavos, created_at')
        .eq('fornecedor_id', parseInt(id!))
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setContas(data || []);
    } catch (error) {
      console.error('Erro ao buscar contas:', error);
    }
  };

  const fetchPedidos = async () => {
    try {
      const { data, error } = await supabase
        .from('compras_pedidos')
        .select('id, numero_pedido, data_pedido, valor_liquido_centavos, status')
        .eq('fornecedor_id', parseInt(id!))
        .order('data_pedido', { ascending: false })
        .limit(50);

      if (error) throw error;
      setPedidos(data || []);
    } catch (error) {
      console.error('Erro ao buscar pedidos:', error);
    }
  };

  const formatCurrency = (centavos: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(centavos / 100);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('pt-BR');
  };

  const formatDateTime = (date: string) => {
    return new Date(date).toLocaleString('pt-BR');
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-3/4" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (!pessoa) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Pessoa jurídica não encontrada</p>
        <Button onClick={() => navigate('/cadastros/pessoas-juridicas')} className="mt-4">
          Voltar
        </Button>
      </div>
    );
  }

  const totalContas = contas.reduce((sum, c) => sum + c.valor_total_centavos, 0);
  const totalPedidos = pedidos.reduce((sum, p) => sum + p.valor_liquido_centavos, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => navigate('/cadastros/pessoas-juridicas')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              {pessoa.nome_fantasia || pessoa.razao_social || 'Sem nome'}
            </h1>
            <p className="text-muted-foreground">
              {pessoa.razao_social && pessoa.nome_fantasia && `Razão Social: ${pessoa.razao_social}`}
            </p>
          </div>
        </div>
      </div>

      {/* Cards de Informações Principais */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total em Contas</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalContas)}</div>
            <p className="text-xs text-muted-foreground">{contas.length} contas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total em Pedidos</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalPedidos)}</div>
            <p className="text-xs text-muted-foreground">{pedidos.length} pedidos</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Marcas Vinculadas</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{marcas.length}</div>
            <p className="text-xs text-muted-foreground">marcas cadastradas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Representantes</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{representantes.length}</div>
            <p className="text-xs text-muted-foreground">representantes</p>
          </CardContent>
        </Card>
      </div>

      {/* Dados da Empresa */}
      <Card>
        <CardHeader>
          <CardTitle>Dados da Empresa</CardTitle>
          <CardDescription>Informações cadastrais da pessoa jurídica</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <Building2 className="h-4 w-4" />
                CNPJ
              </div>
              <div className="font-medium">{pessoa.cnpj || 'Não informado'}</div>
            </div>
            <div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <FileText className="h-4 w-4" />
                Inscrição Estadual
              </div>
              <div className="font-medium">{pessoa.insc_estadual || 'Não informado'}</div>
            </div>
            <div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <Phone className="h-4 w-4" />
                Celular
              </div>
              <div className="font-medium">{pessoa.celular || 'Não informado'}</div>
            </div>
            <div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <Mail className="h-4 w-4" />
                E-mail
              </div>
              <div className="font-medium">{pessoa.email || 'Não informado'}</div>
            </div>
            <div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <Calendar className="h-4 w-4" />
                Data de Fundação
              </div>
              <div className="font-medium">
                {pessoa.fundacao ? formatDate(pessoa.fundacao) : 'Não informado'}
              </div>
            </div>
            <div className="md:col-span-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <MapPin className="h-4 w-4" />
                Endereço
              </div>
              <div className="font-medium">{pessoa.endereco || 'Não informado'}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Vínculos */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Marcas Vinculadas</CardTitle>
            <CardDescription>{marcas.length} marca(s) cadastrada(s)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {marcas.map((marca) => (
                <Badge key={marca.id} variant="secondary" className="mr-2">
                  {marca.nome}
                </Badge>
              ))}
              {marcas.length === 0 && (
                <p className="text-sm text-muted-foreground">Nenhuma marca vinculada</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Representantes</CardTitle>
            <CardDescription>{representantes.length} representante(s)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {representantes.map((rep) => (
                <Badge key={rep.id} variant="outline" className="mr-2">
                  {rep.nome_completo}
                </Badge>
              ))}
              {representantes.length === 0 && (
                <p className="text-sm text-muted-foreground">Nenhum representante vinculado</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs de Histórico */}
      <Tabs defaultValue="contas" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="contas">Contas a Pagar</TabsTrigger>
          <TabsTrigger value="pedidos">Pedidos de Compra</TabsTrigger>
          <TabsTrigger value="alteracoes">Alterações</TabsTrigger>
        </TabsList>

        <TabsContent value="contas" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Histórico de Contas a Pagar</CardTitle>
              <CardDescription>Últimas 50 contas registradas</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Nº Nota</TableHead>
                    <TableHead>Data Cadastro</TableHead>
                    <TableHead className="text-right">Valor Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {contas.map((conta) => (
                    <TableRow key={conta.id}>
                      <TableCell className="font-medium">{conta.descricao || 'Sem descrição'}</TableCell>
                      <TableCell>{conta.numero_nota || '-'}</TableCell>
                      <TableCell>{formatDate(conta.created_at)}</TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(conta.valor_total_centavos)}
                      </TableCell>
                    </TableRow>
                  ))}
                  {contas.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground">
                        Nenhuma conta registrada
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pedidos" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Histórico de Pedidos de Compra</CardTitle>
              <CardDescription>Últimos 50 pedidos realizados</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nº Pedido</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pedidos.map((pedido) => (
                    <TableRow key={pedido.id}>
                      <TableCell className="font-medium">{pedido.numero_pedido}</TableCell>
                      <TableCell>{formatDate(pedido.data_pedido)}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{pedido.status}</Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(pedido.valor_liquido_centavos)}
                      </TableCell>
                    </TableRow>
                  ))}
                  {pedidos.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground">
                        Nenhum pedido registrado
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="alteracoes" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Histórico de Alterações</CardTitle>
              <CardDescription>Registro de modificações no cadastro</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-start gap-4">
                  <div className="rounded-full bg-primary/10 p-2">
                    <History className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">Cadastro criado</p>
                    <p className="text-sm text-muted-foreground">
                      {formatDateTime(pessoa.created_at)}
                    </p>
                  </div>
                </div>
                <Separator />
                <div className="flex items-start gap-4">
                  <div className="rounded-full bg-primary/10 p-2">
                    <History className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">Última atualização</p>
                    <p className="text-sm text-muted-foreground">
                      {formatDateTime(pessoa.updated_at)}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
