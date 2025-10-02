import { useState, useEffect } from 'react';
import { Plus, Search, Edit, Trash2, ShoppingCart, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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

interface Pedido {
  id: number;
  numero: string;
  data_pedido: string;
  previsao_entrega?: string;
  status: string;
  qtd_pecas_total?: number;
  qtd_referencias?: number;
  valor_bruto_centavos?: number;
  desconto_percentual?: number;
  desconto_valor_centavos?: number;
  valor_liquido_centavos?: number;
  preco_medio_centavos?: number;
  observacoes?: string;
  fornecedor_id?: number;
  marca_id?: number;
  representante_pf_id?: number;
  pessoas_juridicas?: {
    nome_fantasia: string;
  };
  marcas?: {
    nome: string;
  };
  pessoas_fisicas?: {
    nome_completo: string;
  };
}

interface PessoaJuridica {
  id: number;
  nome_fantasia: string;
  razao_social: string;
}

interface Marca {
  id: number;
  nome: string;
}

interface PessoaFisica {
  id: number;
  nome_completo: string;
}

const statusOptions = [
  { value: 'pendente', label: 'Pendente', color: 'bg-yellow-500' },
  { value: 'aprovado', label: 'Aprovado', color: 'bg-blue-500' },
  { value: 'enviado', label: 'Enviado', color: 'bg-purple-500' },
  { value: 'entregue', label: 'Entregue', color: 'bg-green-500' },
  { value: 'cancelado', label: 'Cancelado', color: 'bg-red-500' },
];

export function Pedidos() {
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [fornecedores, setFornecedores] = useState<PessoaJuridica[]>([]);
  const [marcas, setMarcas] = useState<Marca[]>([]);
  const [representantes, setRepresentantes] = useState<PessoaFisica[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPedido, setEditingPedido] = useState<Pedido | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    numero: '',
    data_pedido: new Date(),
    previsao_entrega: undefined as Date | undefined,
    status: 'pendente',
    qtd_pecas_total: '',
    qtd_referencias: '',
    valor_bruto_centavos: '',
    desconto_percentual: '',
    desconto_valor_centavos: '',
    valor_liquido_centavos: '',
    preco_medio_centavos: '',
    observacoes: '',
    fornecedor_id: '',
    marca_id: '',
    representante_pf_id: '',
  });

  useEffect(() => {
    fetchPedidos();
    fetchFornecedores();
    fetchMarcas();
    fetchRepresentantes();
  }, []);

  const fetchPedidos = async () => {
    try {
      const { data, error } = await supabase
        .from('compras_pedidos')
        .select(`
          *,
          pessoas_juridicas(nome_fantasia),
          marcas(nome),
          pessoas_fisicas(nome_completo)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPedidos(data || []);
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

  const fetchMarcas = async () => {
    try {
      const { data, error } = await supabase
        .from('marcas')
        .select('id, nome')
        .order('nome');

      if (error) throw error;
      setMarcas(data || []);
    } catch (error) {
      console.error('Erro ao buscar marcas:', error);
    }
  };

  const fetchRepresentantes = async () => {
    try {
      const { data, error } = await supabase
        .from('pessoas_fisicas')
        .select('id, nome_completo')
        .order('nome_completo');

      if (error) throw error;
      setRepresentantes(data || []);
    } catch (error) {
      console.error('Erro ao buscar representantes:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const dataToSubmit = {
        numero: formData.numero,
        data_pedido: formData.data_pedido.toISOString().split('T')[0],
        previsao_entrega: formData.previsao_entrega?.toISOString().split('T')[0] || null,
        status: formData.status as 'aberto' | 'cancelado' | 'parcial' | 'recebido',
        qtd_pecas_total: formData.qtd_pecas_total ? parseInt(formData.qtd_pecas_total) : null,
        qtd_referencias: formData.qtd_referencias ? parseInt(formData.qtd_referencias) : null,
        valor_bruto_centavos: formData.valor_bruto_centavos ? Math.round(parseFloat(formData.valor_bruto_centavos) * 100) : null,
        desconto_percentual: formData.desconto_percentual ? parseFloat(formData.desconto_percentual) : null,
        desconto_valor_centavos: formData.desconto_valor_centavos ? Math.round(parseFloat(formData.desconto_valor_centavos) * 100) : null,
        valor_liquido_centavos: formData.valor_liquido_centavos ? Math.round(parseFloat(formData.valor_liquido_centavos) * 100) : null,
        preco_medio_centavos: formData.preco_medio_centavos ? Math.round(parseFloat(formData.preco_medio_centavos) * 100) : null,
        observacoes: formData.observacoes || null,
        fornecedor_id: formData.fornecedor_id ? parseInt(formData.fornecedor_id) : null,
        marca_id: formData.marca_id ? parseInt(formData.marca_id) : null,
        representante_pf_id: formData.representante_pf_id ? parseInt(formData.representante_pf_id) : null,
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
      numero: pedido.numero,
      data_pedido: new Date(pedido.data_pedido),
      previsao_entrega: pedido.previsao_entrega ? new Date(pedido.previsao_entrega) : undefined,
      status: pedido.status,
      qtd_pecas_total: pedido.qtd_pecas_total?.toString() || '',
      qtd_referencias: pedido.qtd_referencias?.toString() || '',
      valor_bruto_centavos: pedido.valor_bruto_centavos ? (pedido.valor_bruto_centavos / 100).toString() : '',
      desconto_percentual: pedido.desconto_percentual?.toString() || '',
      desconto_valor_centavos: pedido.desconto_valor_centavos ? (pedido.desconto_valor_centavos / 100).toString() : '',
      valor_liquido_centavos: pedido.valor_liquido_centavos ? (pedido.valor_liquido_centavos / 100).toString() : '',
      preco_medio_centavos: pedido.preco_medio_centavos ? (pedido.preco_medio_centavos / 100).toString() : '',
      observacoes: pedido.observacoes || '',
      fornecedor_id: pedido.fornecedor_id?.toString() || '',
      marca_id: pedido.marca_id?.toString() || '',
      representante_pf_id: pedido.representante_pf_id?.toString() || '',
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
      numero: '',
      data_pedido: new Date(),
      previsao_entrega: undefined,
      status: 'pendente',
      qtd_pecas_total: '',
      qtd_referencias: '',
      valor_bruto_centavos: '',
      desconto_percentual: '',
      desconto_valor_centavos: '',
      valor_liquido_centavos: '',
      preco_medio_centavos: '',
      observacoes: '',
      fornecedor_id: '',
      marca_id: '',
      representante_pf_id: '',
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

  const filteredPedidos = pedidos.filter(pedido =>
    pedido.numero.toLowerCase().includes(searchTerm.toLowerCase()) ||
    pedido.pessoas_juridicas?.nome_fantasia.toLowerCase().includes(searchTerm.toLowerCase()) ||
    pedido.marcas?.nome.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
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
                  <Label htmlFor="numero">Número do Pedido *</Label>
                  <Input
                    id="numero"
                    value={formData.numero}
                    onChange={(e) => setFormData({ ...formData, numero: e.target.value })}
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
                  <Label htmlFor="previsao_entrega">Previsão de Entrega</Label>
                  <DatePicker
                    date={formData.previsao_entrega}
                    onSelect={(date) => setFormData({ ...formData, previsao_entrega: date })}
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
                  <Label htmlFor="marca_id">Marca</Label>
                  <Select value={formData.marca_id} onValueChange={(value) => setFormData({ ...formData, marca_id: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione uma marca" />
                    </SelectTrigger>
                    <SelectContent>
                      {marcas.map((marca) => (
                        <SelectItem key={marca.id} value={marca.id.toString()}>
                          {marca.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="representante_pf_id">Representante</Label>
                  <Select value={formData.representante_pf_id} onValueChange={(value) => setFormData({ ...formData, representante_pf_id: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um representante" />
                    </SelectTrigger>
                    <SelectContent>
                      {representantes.map((rep) => (
                        <SelectItem key={rep.id} value={rep.id.toString()}>
                          {rep.nome_completo}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="qtd_pecas_total">Qtd. Peças Total</Label>
                  <Input
                    id="qtd_pecas_total"
                    type="number"
                    value={formData.qtd_pecas_total}
                    onChange={(e) => setFormData({ ...formData, qtd_pecas_total: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="qtd_referencias">Qtd. Referências</Label>
                  <Input
                    id="qtd_referencias"
                    type="number"
                    value={formData.qtd_referencias}
                    onChange={(e) => setFormData({ ...formData, qtd_referencias: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="valor_bruto_centavos">Valor Bruto (R$)</Label>
                  <Input
                    id="valor_bruto_centavos"
                    type="number"
                    step="0.01"
                    value={formData.valor_bruto_centavos}
                    onChange={(e) => setFormData({ ...formData, valor_bruto_centavos: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="desconto_percentual">Desconto (%)</Label>
                  <Input
                    id="desconto_percentual"
                    type="number"
                    step="0.01"
                    value={formData.desconto_percentual}
                    onChange={(e) => setFormData({ ...formData, desconto_percentual: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="valor_liquido_centavos">Valor Líquido (R$)</Label>
                  <Input
                    id="valor_liquido_centavos"
                    type="number"
                    step="0.01"
                    value={formData.valor_liquido_centavos}
                    onChange={(e) => setFormData({ ...formData, valor_liquido_centavos: e.target.value })}
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
              placeholder="Buscar por número, fornecedor ou marca..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Pedidos de Compra</CardTitle>
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
                <TableHead>Marca</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Data</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPedidos.map((pedido) => (
                <TableRow key={pedido.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center space-x-2">
                      <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                      <span>{pedido.numero}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {pedido.pessoas_juridicas?.nome_fantasia || 'Não informado'}
                  </TableCell>
                  <TableCell>
                    {pedido.marcas?.nome || 'Não informado'}
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(pedido.status)}
                  </TableCell>
                  <TableCell>
                    {pedido.valor_liquido_centavos ? formatCurrency(pedido.valor_liquido_centavos) : 'N/A'}
                  </TableCell>
                  <TableCell>
                    {new Date(pedido.data_pedido).toLocaleDateString('pt-BR')}
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
