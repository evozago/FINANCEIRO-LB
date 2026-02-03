import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Edit, Trash2, Share2, ShoppingCart, 
  Calendar, Building2, DollarSign, CreditCard, FileText,
  Tag, Copy, Check
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { NovoPedidoForm } from '@/components/compras/NovoPedidoForm';
import { AnexosPedidoUpload } from '@/components/compras/AnexosPedidoUpload';

interface Pedido {
  id: number;
  numero_pedido: string;
  data_pedido: string;
  data_entrega?: string;
  status: string;
  valor_total_centavos?: number;
  desconto_centavos?: number;
  forma_pagamento_id?: number;
  negociacao?: string;
  condicoes_pagamento?: string;
  observacoes?: string;
  fornecedor_id?: number;
  filial_id?: number;
  created_at?: string;
  pessoas_juridicas?: {
    id: number;
    nome_fantasia: string | null;
    razao_social: string;
    cnpj?: string;
    telefone?: string;
    email?: string;
  };
  filiais?: {
    nome: string;
  };
  formas_pagamento?: {
    nome: string;
  };
}

interface Marca {
  id: number;
  nome: string;
}

const statusOptions = [
  { value: 'pendente', label: 'Pendente', className: 'bg-warning text-warning-foreground' },
  { value: 'confirmado', label: 'Confirmado', className: 'bg-blue-500 text-white' },
  { value: 'entregue', label: 'Entregue', className: 'bg-green-500 text-white' },
  { value: 'cancelado', label: 'Cancelado', className: 'bg-destructive text-destructive-foreground' },
];

export default function PedidoDetalhes() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [pedido, setPedido] = useState<Pedido | null>(null);
  const [marcas, setMarcas] = useState<Marca[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (id) {
      fetchPedido();
      fetchMarcasPedido();
    }
  }, [id]);

  const fetchPedido = async () => {
    try {
      const { data, error } = await supabase
        .from('compras_pedidos')
        .select(`
          *,
          pessoas_juridicas(id, nome_fantasia, razao_social, cnpj, telefone, email),
          filiais(nome),
          formas_pagamento(nome)
        `)
        .eq('id', parseInt(id!))
        .single();

      if (error) throw error;
      setPedido(data as Pedido);
    } catch (error) {
      console.error('Erro ao buscar pedido:', error);
      toast({
        title: 'Erro',
        description: 'Pedido não encontrado.',
        variant: 'destructive',
      });
      navigate('/compras/pedidos');
    } finally {
      setLoading(false);
    }
  };

  const fetchMarcasPedido = async () => {
    try {
      const { data, error } = await supabase
        .from('compras_pedido_marcas')
        .select('marca_id, marcas(id, nome)')
        .eq('pedido_id', parseInt(id!));

      if (error) throw error;
      
      const marcasData = data?.map(item => (item as any).marcas).filter(Boolean) || [];
      setMarcas(marcasData);
    } catch (error) {
      console.error('Erro ao buscar marcas:', error);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Tem certeza que deseja excluir este pedido?')) return;

    try {
      const { error } = await supabase
        .from('compras_pedidos')
        .delete()
        .eq('id', pedido!.id);

      if (error) throw error;

      toast({
        title: 'Sucesso',
        description: 'Pedido excluído com sucesso.',
      });
      navigate('/compras/pedidos');
    } catch (error) {
      console.error('Erro ao excluir pedido:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível excluir o pedido.',
        variant: 'destructive',
      });
    }
  };

  const handleShare = async () => {
    const url = window.location.href;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Pedido ${pedido?.numero_pedido}`,
          text: `Detalhes do pedido ${pedido?.numero_pedido}`,
          url,
        });
      } catch (error) {
        // User cancelled sharing
      }
    } else {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast({
        title: 'Link copiado!',
        description: 'O link foi copiado para a área de transferência.',
      });
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const formatCurrency = (centavos?: number) => {
    if (!centavos) return 'R$ 0,00';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(centavos / 100);
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('pt-BR');
  };

  const getStatusBadge = (status: string) => {
    const config = statusOptions.find(s => s.value === status);
    return (
      <Badge className={config?.className}>
        {config?.label || status}
      </Badge>
    );
  };

  const handleEditSuccess = () => {
    setIsEditOpen(false);
    fetchPedido();
    fetchMarcasPedido();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!pedido) {
    return null;
  }

  const valorLiquido = (pedido.valor_total_centavos || 0) - (pedido.desconto_centavos || 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/compras/pedidos')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <ShoppingCart className="h-6 w-6 text-primary" />
              <h1 className="text-2xl font-bold">{pedido.numero_pedido}</h1>
              {getStatusBadge(pedido.status)}
            </div>
            <p className="text-muted-foreground">
              Pedido criado em {formatDate(pedido.created_at)}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleShare}>
            {copied ? <Check className="h-4 w-4 mr-2" /> : <Share2 className="h-4 w-4 mr-2" />}
            {copied ? 'Copiado!' : 'Compartilhar'}
          </Button>
          <Button variant="outline" onClick={() => setIsEditOpen(true)}>
            <Edit className="h-4 w-4 mr-2" />
            Editar
          </Button>
          <Button variant="destructive" onClick={handleDelete}>
            <Trash2 className="h-4 w-4 mr-2" />
            Excluir
          </Button>
        </div>
      </div>

      <Tabs defaultValue="detalhes" className="space-y-6">
        <TabsList>
          <TabsTrigger value="detalhes">Detalhes</TabsTrigger>
          <TabsTrigger value="anexos">Anexos</TabsTrigger>
        </TabsList>

        <TabsContent value="detalhes" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Coluna Principal */}
            <div className="lg:col-span-2 space-y-6">
              {/* Informações do Pedido */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Informações do Pedido
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-sm text-muted-foreground">Data do Pedido</span>
                    <p className="font-medium">{formatDate(pedido.data_pedido)}</p>
                  </div>
                  <div>
                    <span className="text-sm text-muted-foreground">Previsão de Entrega</span>
                    <p className="font-medium">{formatDate(pedido.data_entrega)}</p>
                  </div>
                  <div>
                    <span className="text-sm text-muted-foreground">Filial</span>
                    <p className="font-medium">{pedido.filiais?.nome || '-'}</p>
                  </div>
                  <div>
                    <span className="text-sm text-muted-foreground">Status</span>
                    <div className="mt-1">{getStatusBadge(pedido.status)}</div>
                  </div>
                </CardContent>
              </Card>

              {/* Fornecedor */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-5 w-5" />
                    Fornecedor
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {pedido.pessoas_juridicas ? (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-lg">
                            {pedido.pessoas_juridicas.nome_fantasia || pedido.pessoas_juridicas.razao_social}
                          </p>
                          {pedido.pessoas_juridicas.nome_fantasia && (
                            <p className="text-sm text-muted-foreground">
                              {pedido.pessoas_juridicas.razao_social}
                            </p>
                          )}
                        </div>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => navigate(`/cadastros/pessoa-juridica/${pedido.pessoas_juridicas!.id}`)}
                        >
                          Ver Cadastro
                        </Button>
                      </div>
                      <Separator />
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">CNPJ</span>
                          <p>{pedido.pessoas_juridicas.cnpj || '-'}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Telefone</span>
                          <p>{pedido.pessoas_juridicas.telefone || '-'}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Email</span>
                          <p>{pedido.pessoas_juridicas.email || '-'}</p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-muted-foreground">Nenhum fornecedor vinculado</p>
                  )}
                </CardContent>
              </Card>

              {/* Marcas */}
              {marcas.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Tag className="h-5 w-5" />
                      Marcas do Pedido
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {marcas.map((marca) => (
                        <Badge key={marca.id} variant="secondary">
                          {marca.nome}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Negociação e Observações */}
              {(pedido.negociacao || pedido.observacoes) && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      Negociação e Observações
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {pedido.negociacao && (
                      <div>
                        <span className="text-sm text-muted-foreground font-medium">Negociação</span>
                        <p className="mt-1 whitespace-pre-wrap">{pedido.negociacao}</p>
                      </div>
                    )}
                    {pedido.observacoes && (
                      <div>
                        <span className="text-sm text-muted-foreground font-medium">Observações</span>
                        <p className="mt-1 whitespace-pre-wrap">{pedido.observacoes}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Coluna Lateral - Valores */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5" />
                    Valores
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Valor Bruto</span>
                    <span className="font-medium">{formatCurrency(pedido.valor_total_centavos)}</span>
                  </div>
                  <div className="flex justify-between text-destructive">
                    <span>Desconto</span>
                    <span>- {formatCurrency(pedido.desconto_centavos)}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between text-lg font-bold">
                    <span>Valor Líquido</span>
                    <span className="text-primary">{formatCurrency(valorLiquido)}</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5" />
                    Pagamento
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <span className="text-sm text-muted-foreground">Forma de Pagamento</span>
                    <p className="font-medium">{pedido.formas_pagamento?.nome || '-'}</p>
                  </div>
                  <div>
                    <span className="text-sm text-muted-foreground">Condições</span>
                    <p className="font-medium">{pedido.condicoes_pagamento || '-'}</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="anexos">
          <AnexosPedidoUpload pedidoId={pedido.id} />
        </TabsContent>
      </Tabs>

      {/* Dialog de Edição */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Pedido</DialogTitle>
            <DialogDescription>
              Atualize as informações do pedido
            </DialogDescription>
          </DialogHeader>
          <NovoPedidoForm
            editingPedido={pedido}
            onSuccess={handleEditSuccess}
            onCancel={() => setIsEditOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
