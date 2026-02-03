import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Edit, Trash2, ShoppingCart, Eye } from 'lucide-react';
import { usePersistentState } from '@/hooks/usePersistentState';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CurrencyInput } from '@/components/ui/currency-input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { DatePicker } from '@/components/ui/date-picker';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { AnexosPedido } from '@/components/compras/AnexosPedido';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface Pedido {
  id: number;
  numero_pedido: string;
  data_pedido: string;
  data_entrega?: string;
  status: string;
  valor_total_centavos?: number;
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

interface PessoaJuridica {
  id: number;
  nome_fantasia: string;
  razao_social: string;
}

interface Filial {
  id: number;
  nome: string;
}

const statusOptions = [
  { value: 'pendente', label: 'Pendente', color: 'bg-yellow-500' },
  { value: 'confirmado', label: 'Confirmado', color: 'bg-blue-500' },
  { value: 'entregue', label: 'Entregue', color: 'bg-green-500' },
  { value: 'cancelado', label: 'Cancelado', color: 'bg-red-500' },
];

export function Pedidos() {
  const navigate = useNavigate();
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [fornecedores, setFornecedores] = useState<PessoaJuridica[]>([]);
  const [filiais, setFiliais] = useState<Filial[]>([]);
  const [searchTerm, setSearchTerm] = usePersistentState('pedidos-search', '');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPedido, setEditingPedido] = useState<Pedido | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    numero_pedido: '',
    data_pedido: new Date(),
    data_entrega: undefined as Date | undefined,
    status: 'pendente',
    valor_total_centavos: 0,
    observacoes: '',
    fornecedor_id: '',
    filial_id: '',
  });

  useEffect(() => {
    fetchPedidos();
    fetchFornecedores();
    fetchFiliais();
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

  const fetchFornecedores = async () => {
    try {
      const { data, error } = await supabase
        .from('pessoas_juridicas')
        .select('id, nome_fantasia, razao_social')
        .order('nome_fantasia');

      if (error) throw error;
      setFornecedores(data || []);
    } catch (error) {
      console.error('Erro ao buscar fornecedores:', error);
    }
  };

  const fetchFiliais = async () => {
    try {
      const { data, error } = await supabase
        .from('filiais')
        .select('id, nome')
        .order('nome');

      if (error) throw error;
      setFiliais(data || []);
    } catch (error) {
      console.error('Erro ao buscar filiais:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const dataToSubmit = {
        numero_pedido: formData.numero_pedido,
        data_pedido: formData.data_pedido.toISOString().split('T')[0],
        data_entrega: formData.data_entrega?.toISOString().split('T')[0] || null,
        status: formData.status,
        valor_total_centavos: formData.valor_total_centavos || null,
        observacoes: formData.observacoes || null,
        fornecedor_id: formData.fornecedor_id ? parseInt(formData.fornecedor_id) : null,
        filial_id: formData.filial_id ? parseInt(formData.filial_id) : null,
      };

      if (editingPedido) {
        const { error } = await supabase
          .from('compras_pedidos')
          .update(dataToSubmit)
          .eq('id', editingPedido.id);

        if (error) throw error;

        toast({
          title: 'Sucesso',
          description: 'Pedido atualizado com sucesso.',
        });
      } else {
        const { error } = await supabase
          .from('compras_pedidos')
          .insert([dataToSubmit]);

        if (error) throw error;

        toast({
          title: 'Sucesso',
          description: 'Pedido cadastrado com sucesso.',
        });
      }

      setIsDialogOpen(false);
      setEditingPedido(null);
      resetForm();
      fetchPedidos();
    } catch (error) {
      console.error('Erro ao salvar pedido:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível salvar o pedido.',
        variant: 'destructive',
      });
    }
  };

  const handleEdit = (pedido: Pedido) => {
    setEditingPedido(pedido);
    setFormData({
      numero_pedido: pedido.numero_pedido,
      data_pedido: new Date(pedido.data_pedido),
      data_entrega: pedido.data_entrega ? new Date(pedido.data_entrega) : undefined,
      status: pedido.status,
      valor_total_centavos: pedido.valor_total_centavos || 0,
      observacoes: pedido.observacoes || '',
      fornecedor_id: pedido.fornecedor_id?.toString() || '',
      filial_id: pedido.filial_id?.toString() || '',
    });
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

  const resetForm = () => {
    setFormData({
      numero_pedido: '',
      data_pedido: new Date(),
      data_entrega: undefined,
      status: 'pendente',
      valor_total_centavos: 0,
      observacoes: '',
      fornecedor_id: '',
      filial_id: '',
    });
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
      <Badge className={`${statusConfig?.color} text-white`}>
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
    return <div>Carregando...</div>;
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
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => { resetForm(); setEditingPedido(null); }}>
              <Plus className="mr-2 h-4 w-4" />
              Novo Pedido
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingPedido ? 'Editar Pedido' : 'Novo Pedido'}
              </DialogTitle>
              <DialogDescription>
                Preencha as informações do pedido de compra
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="numero_pedido">Número do Pedido *</Label>
                  <Input
                    id="numero_pedido"
                    value={formData.numero_pedido}
                    onChange={(e) => setFormData({ ...formData, numero_pedido: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="status">Status</Label>
                  <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {statusOptions.map((status) => (
                        <SelectItem key={status.value} value={status.value}>
                          {status.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="data_pedido">Data do Pedido *</Label>
                  <DatePicker
                    date={formData.data_pedido}
                    onSelect={(date) => setFormData({ ...formData, data_pedido: date || new Date() })}
                  />
                </div>
                <div>
                  <Label htmlFor="data_entrega">Previsão de Entrega</Label>
                  <DatePicker
                    date={formData.data_entrega}
                    onSelect={(date) => setFormData({ ...formData, data_entrega: date })}
                    placeholder="Selecione a data de entrega"
                  />
                </div>
                <div>
                  <Label htmlFor="fornecedor_id">Fornecedor</Label>
                  <Select value={formData.fornecedor_id} onValueChange={(value) => setFormData({ ...formData, fornecedor_id: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um fornecedor" />
                    </SelectTrigger>
                    <SelectContent>
                      {fornecedores.map((fornecedor) => (
                        <SelectItem key={fornecedor.id} value={fornecedor.id.toString()}>
                          {fornecedor.nome_fantasia || fornecedor.razao_social}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="filial_id">Filial</Label>
                  <Select value={formData.filial_id} onValueChange={(value) => setFormData({ ...formData, filial_id: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione uma filial" />
                    </SelectTrigger>
                    <SelectContent>
                      {filiais.map((filial) => (
                        <SelectItem key={filial.id} value={filial.id.toString()}>
                          {filial.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="valor_total_centavos">Valor Total</Label>
                  <CurrencyInput
                    value={formData.valor_total_centavos}
                    onValueChange={(value) => setFormData({ ...formData, valor_total_centavos: value })}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="observacoes">Observações</Label>
                <Textarea
                  id="observacoes"
                  value={formData.observacoes}
                  onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                  rows={3}
                />
              </div>
              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit">
                  {editingPedido ? 'Atualizar' : 'Cadastrar'}
                </Button>
              </div>
            </form>
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
              {filteredPedidos.map((pedido) => (
                <TableRow key={pedido.id}>
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
                    <div className="flex justify-end space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(pedido)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(pedido.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
