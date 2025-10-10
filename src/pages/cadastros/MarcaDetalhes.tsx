import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Building2, ShoppingCart, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface MarcaData {
  id: number;
  nome: string;
  descricao?: string;
  pj_vinculada_id?: number;
  created_at: string;
  pessoas_juridicas?: {
    id: number;
    nome_fantasia?: string;
    razao_social: string;
    cnpj?: string;
    celular?: string;
    email?: string;
  };
}

interface Pedido {
  id: number;
  numero_pedido: string;
  data_pedido: string;
  valor_liquido_centavos?: number;
  status: string;
  pessoas_juridicas?: {
    id: number;
    nome_fantasia?: string;
    razao_social: string;
  };
}

export function MarcaDetalhes() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [marca, setMarca] = useState<MarcaData | null>(null);
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      fetchMarcaDetalhes();
    }
  }, [id]);

  const fetchMarcaDetalhes = async () => {
    try {
      setLoading(true);

      // Buscar dados da marca
      const { data: marcaData, error: marcaError } = await supabase
        .from('marcas')
        .select(`
          *,
          pessoas_juridicas!pj_vinculada_id(
            id,
            nome_fantasia,
            razao_social,
            cnpj,
            celular,
            email
          )
        `)
        .eq('id', parseInt(id))
        .single();

      if (marcaError) throw marcaError;
      setMarca(marcaData);

      // Buscar pedidos desta marca
      const { data: pedidosData, error: pedidosError} = await supabase
        .from('compras_pedidos')
        .select(`
          id,
          numero_pedido,
          data_pedido,
          valor_liquido_centavos,
          status,
          pessoas_juridicas!fornecedor_id(
            id,
            nome_fantasia,
            razao_social
          )
        `)
        .eq('marca_id', parseInt(id))
        .order('data_pedido', { ascending: false });

      if (pedidosError) throw pedidosError;
      setPedidos(pedidosData || []);
    } catch (error) {
      console.error('Erro ao buscar detalhes da marca:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os detalhes da marca.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
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

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline', label: string }> = {
      aberto: { variant: 'secondary', label: 'Aberto' },
      parcial: { variant: 'default', label: 'Parcial' },
      recebido: { variant: 'default', label: 'Recebido' },
      cancelado: { variant: 'destructive', label: 'Cancelado' },
    };

    const config = statusMap[status] || { variant: 'outline', label: status };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const calcularTotais = () => {
    const totalPedidos = pedidos.length;
    const valorTotal = pedidos.reduce((sum, p) => sum + (p.valor_liquido_centavos || 0), 0);
    const ticketMedio = totalPedidos > 0 ? valorTotal / totalPedidos : 0;

    return { totalPedidos, valorTotal, ticketMedio };
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-full" />
        <div className="grid gap-4 md:grid-cols-3">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (!marca) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold mb-4">Marca não encontrada</h2>
        <Button onClick={() => navigate('/cadastros/marcas')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar para Marcas
        </Button>
      </div>
    );
  }

  const totais = calcularTotais();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="outline" size="sm" onClick={() => navigate('/cadastros/marcas')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold tracking-tight">{marca.nome}</h1>
          <p className="text-muted-foreground">
            Cadastrada em {formatDate(marca.created_at)}
          </p>
        </div>
      </div>

      {/* Cards de Resumo */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Pedidos</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totais.totalPedidos}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valor Total Comprado</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totais.valorTotal)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ticket Médio</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totais.ticketMedio)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Conteúdo Principal */}
      <Tabs defaultValue="pedidos" className="w-full">
        <TabsList>
          <TabsTrigger value="pedidos">Pedidos de Compra ({pedidos.length})</TabsTrigger>
          <TabsTrigger value="informacoes">Informações</TabsTrigger>
        </TabsList>

        <TabsContent value="pedidos" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Pedidos de Compra</CardTitle>
              <CardDescription>
                Histórico de pedidos realizados para esta marca
              </CardDescription>
            </CardHeader>
            <CardContent>
              {pedidos.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  Nenhum pedido cadastrado para esta marca
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Número do Pedido</TableHead>
                      <TableHead>Fornecedor</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pedidos.map((pedido) => (
                      <TableRow 
                        key={pedido.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => navigate(`/compras/pedidos`)}
                      >
                        <TableCell className="font-medium">{pedido.numero_pedido}</TableCell>
                        <TableCell>
                          {pedido.pessoas_juridicas && (
                            <span
                              className="text-primary hover:underline cursor-pointer"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/cadastros/pessoa-juridica/${pedido.pessoas_juridicas!.id}`);
                              }}
                            >
                              {pedido.pessoas_juridicas.nome_fantasia || pedido.pessoas_juridicas.razao_social}
                            </span>
                          )}
                        </TableCell>
                        <TableCell>{formatDate(pedido.data_pedido)}</TableCell>
                        <TableCell>{getStatusBadge(pedido.status)}</TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(pedido.valor_liquido_centavos || 0)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="informacoes" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Informações da Marca</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">Nome</h3>
                <p className="text-muted-foreground">{marca.nome}</p>
              </div>

              {marca.descricao && (
                <>
                  <Separator />
                  <div>
                    <h3 className="font-semibold mb-2">Descrição</h3>
                    <p className="text-muted-foreground">{marca.descricao}</p>
                  </div>
                </>
              )}

              {marca.pessoas_juridicas && (
                <>
                  <Separator />
                  <div>
                    <h3 className="font-semibold mb-2 flex items-center gap-2">
                      <Building2 className="h-4 w-4" />
                      Empresa Vinculada
                    </h3>
                    <div 
                      className="text-primary hover:underline cursor-pointer"
                      onClick={() => navigate(`/cadastros/pessoa-juridica/${marca.pessoas_juridicas!.id}`)}
                    >
                      <p className="font-medium">
                        {marca.pessoas_juridicas.nome_fantasia || marca.pessoas_juridicas.razao_social}
                      </p>
                      {marca.pessoas_juridicas.cnpj && (
                        <p className="text-sm text-muted-foreground">CNPJ: {marca.pessoas_juridicas.cnpj}</p>
                      )}
                      {marca.pessoas_juridicas.celular && (
                        <p className="text-sm text-muted-foreground">Tel: {marca.pessoas_juridicas.celular}</p>
                      )}
                      {marca.pessoas_juridicas.email && (
                        <p className="text-sm text-muted-foreground">Email: {marca.pessoas_juridicas.email}</p>
                      )}
                    </div>
                  </div>
                </>
              )}

              <Separator />
              <div>
                <h3 className="font-semibold mb-2">Data de Cadastro</h3>
                <p className="text-muted-foreground">{formatDate(marca.created_at)}</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
