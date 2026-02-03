import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Edit, Trash2, ShoppingCart, Eye } from 'lucide-react';
import { usePersistentState } from '@/hooks/usePersistentState';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { NovoPedidoForm } from '@/components/compras/NovoPedidoForm';

interface Pedido {
  id: number;
  numero_pedido: string;
  data_pedido: string;
  data_entrega?: string;
  status: string;
  valor_total_centavos?: number;
  desconto_centavos?: number;
  observacoes?: string;
  fornecedor_id?: number;
  filial_id?: number;
  pessoas_juridicas?: {
    nome_fantasia: string;
    razao_social: string;
  };
  filiais?: {
    nome: string;
  };
}

const statusOptions = [
  { value: 'pendente', label: 'Pendente', className: 'bg-warning text-warning-foreground' },
  { value: 'confirmado', label: 'Confirmado', className: 'bg-blue-500 text-white' },
  { value: 'entregue', label: 'Entregue', className: 'bg-green-500 text-white' },
  { value: 'cancelado', label: 'Cancelado', className: 'bg-destructive text-destructive-foreground' },
];

export function Pedidos() {
  const navigate = useNavigate();
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [searchTerm, setSearchTerm] = usePersistentState('pedidos-search', '');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPedido, setEditingPedido] = useState<Pedido | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchPedidos();
  }, []);

  const fetchPedidos = async () => {
    try {
      const { data, error } = await supabase
        .from('compras_pedidos')
        .select(`
          *,
          pessoas_juridicas(nome_fantasia, razao_social),
          filiais(nome)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPedidos((data || []) as Pedido[]);
    } catch (error) {
      console.error('Erro ao buscar pedidos:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os pedidos.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (pedido: Pedido) => {
    setEditingPedido(pedido);
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Tem certeza que deseja excluir este pedido?')) return;

    try {
      const { error } = await supabase
        .from('compras_pedidos')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Sucesso',
        description: 'Pedido excluído com sucesso.',
      });
      fetchPedidos();
    } catch (error) {
      console.error('Erro ao excluir pedido:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível excluir o pedido.',
        variant: 'destructive',
      });
    }
  };

  const handleFormSuccess = () => {
    setIsDialogOpen(false);
    setEditingPedido(null);
    fetchPedidos();
  };

  const handleFormCancel = () => {
    setIsDialogOpen(false);
    setEditingPedido(null);
  };

  const formatCurrency = (centavos: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(centavos / 100);
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = statusOptions.find(s => s.value === status);
    return (
      <Badge className={statusConfig?.className}>
        {statusConfig?.label || status}
      </Badge>
    );
  };

  const filteredPedidos = pedidos.filter(pedido => {
    const searchLower = searchTerm.toLowerCase();
    const statusConfig = statusOptions.find(s => s.value === pedido.status);
    const statusLabel = (statusConfig?.label || pedido.status).toLowerCase();
    const valorStr = pedido.valor_total_centavos ? formatCurrency(pedido.valor_total_centavos).toLowerCase() : '';
    const dataStr = new Date(pedido.data_pedido).toLocaleDateString('pt-BR');
    const fornecedorStr = (pedido.pessoas_juridicas?.nome_fantasia || pedido.pessoas_juridicas?.razao_social || '').toLowerCase();
    
    return (
      (pedido.numero_pedido || '').toLowerCase().includes(searchLower) ||
      fornecedorStr.includes(searchLower) ||
      statusLabel.includes(searchLower) ||
      valorStr.includes(searchLower) ||
      dataStr.includes(searchLower)
    );
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Pedidos de Compra</h1>
          <p className="text-muted-foreground">
            Gerencie os pedidos de compra da empresa
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) setEditingPedido(null);
        }}>
          <DialogTrigger asChild>
            <Button onClick={() => setEditingPedido(null)}>
              <Plus className="mr-2 h-4 w-4" />
              Novo Pedido
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingPedido ? 'Editar Pedido' : 'Novo Pedido de Compra'}
              </DialogTitle>
              <DialogDescription>
                Preencha as informações do pedido
              </DialogDescription>
            </DialogHeader>
            
            <NovoPedidoForm
              editingPedido={editingPedido}
              onSuccess={handleFormSuccess}
              onCancel={handleFormCancel}
            />
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Buscar Pedidos</CardTitle>
          <CardDescription>
            Use o campo abaixo para filtrar os pedidos
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por número, fornecedor, status..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Pedidos Cadastrados</CardTitle>
          <CardDescription>
            {filteredPedidos.length} pedido(s) encontrado(s)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Número</TableHead>
                <TableHead>Fornecedor</TableHead>
                <TableHead>Data Pedido</TableHead>
                <TableHead>Data Entrega</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPedidos.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    Nenhum pedido encontrado
                  </TableCell>
                </TableRow>
              ) : (
                filteredPedidos.map((pedido) => (
                  <TableRow 
                    key={pedido.id} 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => navigate(`/compras/pedido/${pedido.id}`)}
                  >
                    <TableCell className="font-medium">
                      <div className="flex items-center space-x-2">
                        <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                        <span>{pedido.numero_pedido}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {pedido.pessoas_juridicas?.nome_fantasia || pedido.pessoas_juridicas?.razao_social || '-'}
                    </TableCell>
                    <TableCell>
                      {new Date(pedido.data_pedido).toLocaleDateString('pt-BR')}
                    </TableCell>
                    <TableCell>
                      {pedido.data_entrega ? new Date(pedido.data_entrega).toLocaleDateString('pt-BR') : '-'}
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(pedido.status)}
                    </TableCell>
                    <TableCell>
                      {pedido.valor_total_centavos ? formatCurrency(pedido.valor_total_centavos) : '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end space-x-1" onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => navigate(`/compras/pedido/${pedido.id}`)}
                          title="Ver detalhes"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(pedido)}
                          title="Editar"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(pedido.id)}
                          title="Excluir"
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
