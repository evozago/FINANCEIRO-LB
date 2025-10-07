import { useState, useEffect } from 'react';
import { Plus, Search, Edit, Trash2, Calendar, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CurrencyInput } from '@/components/ui/currency-input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DatePicker } from '@/components/ui/date-picker';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface VendaDiaria {
  id: number;
  data: string;
  valor_bruto_centavos: number;
  desconto_centavos: number;
  valor_liquido_centavos: number;
  qtd_itens: number;
  created_at: string;
  filiais?: { nome: string };
  pessoas_fisicas?: { nome_completo: string };
}

interface Filial {
  id: number;
  nome: string;
}

interface Vendedora {
  id: number;
  nome_completo: string;
}

interface ResumoVendas {
  total_vendas: number;
  valor_bruto_total: number;
  valor_liquido_total: number;
  ticket_medio: number;
}

export function VendasDiarias() {
  const [vendas, setVendas] = useState<VendaDiaria[]>([]);
  const [filiais, setFiliais] = useState<Filial[]>([]);
  const [vendedoras, setVendedoras] = useState<Vendedora[]>([]);
  const [resumo, setResumo] = useState<ResumoVendas>({
    total_vendas: 0,
    valor_bruto_total: 0,
    valor_liquido_total: 0,
    ticket_medio: 0
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingVenda, setEditingVenda] = useState<VendaDiaria | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    data: new Date().toISOString().split('T')[0],
    filial_id: '',
    vendedora_pf_id: '',
    valor_bruto_centavos: 0,
    desconto_centavos: 0,
    qtd_itens: '1',
  });

  useEffect(() => {
    fetchVendas();
    fetchFiliais();
    fetchVendedoras();
  }, [selectedDate]);

  useEffect(() => {
    calcularResumo();
  }, [vendas]);

  const fetchVendas = async () => {
    try {
      const startDate = new Date(selectedDate);
      startDate.setHours(0, 0, 0, 0);
      
      const endDate = new Date(selectedDate);
      endDate.setHours(23, 59, 59, 999);

      const { data, error } = await supabase
        .from('vendas_diarias')
        .select(`
          *,
          filiais(nome),
          pessoas_fisicas(nome_completo)
        `)
        .gte('data', startDate.toISOString().split('T')[0])
        .lte('data', endDate.toISOString().split('T')[0])
        .order('data', { ascending: false });

      if (error) throw error;
      setVendas(data || []);
    } catch (error) {
      console.error('Erro ao buscar vendas diárias:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar as vendas diárias.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
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

  const fetchVendedoras = async () => {
    try {
      const { data, error } = await supabase
        .from('pessoas_fisicas')
        .select('id, nome_completo')
        .order('nome_completo');

      if (error) throw error;
      setVendedoras(data || []);
    } catch (error) {
      console.error('Erro ao buscar vendedoras:', error);
    }
  };

  const calcularResumo = () => {
    const total_vendas = vendas.length;
    const valor_bruto_total = vendas.reduce((sum, venda) => sum + venda.valor_bruto_centavos, 0);
    const valor_liquido_total = vendas.reduce((sum, venda) => sum + venda.valor_liquido_centavos, 0);
    const ticket_medio = total_vendas > 0 ? valor_liquido_total / total_vendas : 0;

    setResumo({
      total_vendas,
      valor_bruto_total,
      valor_liquido_total,
      ticket_medio
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const valor_bruto_centavos = formData.valor_bruto_centavos;
      const desconto_centavos = formData.desconto_centavos;
      const valor_liquido_centavos = valor_bruto_centavos - desconto_centavos;

      const dataToSubmit = {
        data: formData.data,
        filial_id: formData.filial_id ? parseInt(formData.filial_id) : null,
        vendedora_pf_id: formData.vendedora_pf_id ? parseInt(formData.vendedora_pf_id) : null,
        valor_bruto_centavos,
        desconto_centavos,
        valor_liquido_centavos,
        qtd_itens: parseInt(formData.qtd_itens),
      };

      if (editingVenda) {
        const { error } = await supabase
          .from('vendas_diarias')
          .update(dataToSubmit)
          .eq('id', editingVenda.id);

        if (error) throw error;

        toast({
          title: 'Sucesso',
          description: 'Venda atualizada com sucesso.',
        });
      } else {
        const { error } = await supabase
          .from('vendas_diarias')
          .insert([dataToSubmit]);

        if (error) throw error;

        toast({
          title: 'Sucesso',
          description: 'Venda cadastrada com sucesso.',
        });
      }

      setIsDialogOpen(false);
      setEditingVenda(null);
      resetForm();
      fetchVendas();
    } catch (error) {
      console.error('Erro ao salvar venda:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível salvar a venda.',
        variant: 'destructive',
      });
    }
  };

  const handleEdit = (venda: VendaDiaria) => {
    setEditingVenda(venda);
    setFormData({
      data: venda.data,
      filial_id: '', // Será preenchido quando tivermos os dados completos
      vendedora_pf_id: '',
      valor_bruto_centavos: venda.valor_bruto_centavos,
      desconto_centavos: venda.desconto_centavos,
      qtd_itens: venda.qtd_itens.toString(),
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Tem certeza que deseja excluir esta venda?')) return;

    try {
      const { error } = await supabase
        .from('vendas_diarias')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Sucesso',
        description: 'Venda excluída com sucesso.',
      });
      fetchVendas();
    } catch (error) {
      console.error('Erro ao excluir venda:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível excluir a venda.',
        variant: 'destructive',
      });
    }
  };

  const resetForm = () => {
    setFormData({
      data: new Date().toISOString().split('T')[0],
      filial_id: '',
      vendedora_pf_id: '',
      valor_bruto_centavos: 0,
      desconto_centavos: 0,
      qtd_itens: '1',
    });
  };

  const formatCurrency = (centavos: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(centavos / 100);
  };

  const filteredVendas = vendas.filter(venda =>
    venda.pessoas_fisicas?.nome_completo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    venda.filiais?.nome.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return <div>Carregando...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Vendas Diárias</h1>
          <p className="text-muted-foreground">
            Gerencie as vendas diárias por filial e vendedora
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => { resetForm(); setEditingVenda(null); }}>
              <Plus className="mr-2 h-4 w-4" />
              Nova Venda
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingVenda ? 'Editar Venda' : 'Nova Venda'}
              </DialogTitle>
              <DialogDescription>
                Preencha os dados da venda diária
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="data">Data</Label>
                  <Input
                    id="data"
                    type="date"
                    value={formData.data}
                    onChange={(e) => setFormData({ ...formData, data: e.target.value })}
                  />
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
                  <Label htmlFor="vendedora_pf_id">Vendedora</Label>
                  <Select value={formData.vendedora_pf_id} onValueChange={(value) => setFormData({ ...formData, vendedora_pf_id: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione uma vendedora" />
                    </SelectTrigger>
                    <SelectContent>
                      {vendedoras.map((vendedora) => (
                        <SelectItem key={vendedora.id} value={vendedora.id.toString()}>
                          {vendedora.nome_completo}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="qtd_itens">Quantidade de Itens</Label>
                  <Input
                    id="qtd_itens"
                    type="number"
                    min="1"
                    value={formData.qtd_itens}
                    onChange={(e) => setFormData({ ...formData, qtd_itens: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="valor_bruto_centavos">Valor Bruto (R$)</Label>
                  <CurrencyInput
                    id="valor_bruto_centavos"
                    value={formData.valor_bruto_centavos}
                    onValueChange={(value) => setFormData({ ...formData, valor_bruto_centavos: value })}
                  />
                </div>
                <div>
                  <Label htmlFor="desconto_centavos">Desconto (R$)</Label>
                  <CurrencyInput
                    id="desconto_centavos"
                    value={formData.desconto_centavos}
                    onValueChange={(value) => setFormData({ ...formData, desconto_centavos: value })}
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit">
                  {editingVenda ? 'Atualizar' : 'Cadastrar'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Cards de Resumo */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Vendas</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{resumo.total_vendas}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valor Bruto</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(resumo.valor_bruto_total)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valor Líquido</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(resumo.valor_liquido_total)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ticket Médio</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(resumo.ticket_medio)}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Vendas do Dia</CardTitle>
              <CardDescription>
                {vendas.length} venda(s) registrada(s)
              </CardDescription>
            </div>
            <div className="flex items-center space-x-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <Input
                type="date"
                value={selectedDate.toISOString().split('T')[0]}
                onChange={(e) => setSelectedDate(new Date(e.target.value))}
                className="w-40"
              />
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por vendedora ou filial..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Filial</TableHead>
                <TableHead>Vendedora</TableHead>
                <TableHead>Qtd Itens</TableHead>
                <TableHead>Valor Bruto</TableHead>
                <TableHead>Desconto</TableHead>
                <TableHead>Valor Líquido</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredVendas.map((venda) => (
                <TableRow key={venda.id}>
                  <TableCell>
                    {new Date(venda.data).toLocaleDateString('pt-BR')}
                  </TableCell>
                  <TableCell>
                    {venda.filiais?.nome && (
                      <Badge variant="outline">{venda.filiais.nome}</Badge>
                    )}
                  </TableCell>
                  <TableCell>{venda.pessoas_fisicas?.nome_completo}</TableCell>
                  <TableCell>{venda.qtd_itens}</TableCell>
                  <TableCell>{formatCurrency(venda.valor_bruto_centavos)}</TableCell>
                  <TableCell>{formatCurrency(venda.desconto_centavos)}</TableCell>
                  <TableCell className="font-medium">
                    {formatCurrency(venda.valor_liquido_centavos)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(venda)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(venda.id)}
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
