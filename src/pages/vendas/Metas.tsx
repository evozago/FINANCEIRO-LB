import { useState, useEffect } from 'react';
import { Plus, Search, Edit, Trash2, Target, TrendingUp, TrendingDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CurrencyInput } from '@/components/ui/currency-input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { VendedorasMensalComMeta } from '@/lib/supabase-views';

interface MetaVendedora {
  id: number;
  vendedora_pf_id: number;
  ano: number;
  mes: number;
  meta_centavos: number;
  pessoas_fisicas: { nome_completo: string };
}

interface VendedoraComMeta {
  vendedora_pf_id: number;
  vendedora_nome: string;
  ano: number;
  mes: number;
  meta_original: number;
  meta_ajustada: number;
  valor_liquido_total: number;
  percentual_meta: number;
  dias_trabalhados: number;
  dias_ferias: number;
}

interface Vendedora {
  id: number;
  nome_completo: string;
}

const meses = [
  { value: 1, label: 'Janeiro' },
  { value: 2, label: 'Fevereiro' },
  { value: 3, label: 'Março' },
  { value: 4, label: 'Abril' },
  { value: 5, label: 'Maio' },
  { value: 6, label: 'Junho' },
  { value: 7, label: 'Julho' },
  { value: 8, label: 'Agosto' },
  { value: 9, label: 'Setembro' },
  { value: 10, label: 'Outubro' },
  { value: 11, label: 'Novembro' },
  { value: 12, label: 'Dezembro' },
];

export function Metas() {
  const [metas, setMetas] = useState<MetaVendedora[]>([]);
  const [vendedorasComMeta, setVendedorasComMeta] = useState<VendedorasMensalComMeta[]>([]);
  const [vendedoras, setVendedoras] = useState<Vendedora[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingMeta, setEditingMeta] = useState<MetaVendedora | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedAno, setSelectedAno] = useState(new Date().getFullYear());
  const [selectedMes, setSelectedMes] = useState(new Date().getMonth() + 1);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    vendedora_pf_id: '',
    ano: new Date().getFullYear().toString(),
    mes: (new Date().getMonth() + 1).toString(),
    meta_centavos: 0,
  });

  useEffect(() => {
    fetchMetas();
    fetchVendedoras();
    fetchVendedorasComMeta();
  }, [selectedAno, selectedMes]);

  const fetchMetas = async () => {
    try {
      const { data, error } = await supabase
        .from('metas_vendedoras')
        .select(`
          *,
          pessoas_fisicas(nome_completo)
        `)
        .eq('ano', selectedAno)
        .eq('mes', selectedMes)
        .order('pessoas_fisicas(nome_completo)');

      if (error) throw error;
      setMetas(data || []);
    } catch (error) {
      console.error('Erro ao buscar metas:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar as metas.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
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

  const fetchVendedorasComMeta = async () => {
    try {
      const { data, error } = await supabase
        .from('vendedoras_mensal_com_meta')
        .select('*')
        .eq('ano', selectedAno)
        .eq('mes', selectedMes)
        .order('vendedora_nome');

      if (error) throw error;
      setVendedorasComMeta((data || []) as VendedorasMensalComMeta[]);
    } catch (error) {
      console.error('Erro ao buscar vendedoras com meta:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const dataToSubmit = {
        vendedora_pf_id: parseInt(formData.vendedora_pf_id),
        ano: parseInt(formData.ano),
        mes: parseInt(formData.mes),
        meta_centavos: formData.meta_centavos,
      };

      if (editingMeta) {
        const { error } = await supabase
          .from('metas_vendedoras')
          .update(dataToSubmit)
          .eq('id', editingMeta.id);

        if (error) throw error;

        toast({
          title: 'Sucesso',
          description: 'Meta atualizada com sucesso.',
        });
      } else {
        const { error } = await supabase
          .from('metas_vendedoras')
          .insert([dataToSubmit]);

        if (error) throw error;

        toast({
          title: 'Sucesso',
          description: 'Meta cadastrada com sucesso.',
        });
      }

      setIsDialogOpen(false);
      setEditingMeta(null);
      resetForm();
      fetchMetas();
      fetchVendedorasComMeta();
    } catch (error) {
      console.error('Erro ao salvar meta:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível salvar a meta.',
        variant: 'destructive',
      });
    }
  };

  const handleEdit = (meta: MetaVendedora) => {
    setEditingMeta(meta);
    setFormData({
      vendedora_pf_id: meta.vendedora_pf_id.toString(),
      ano: meta.ano.toString(),
      mes: meta.mes.toString(),
      meta_centavos: meta.meta_centavos,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Tem certeza que deseja excluir esta meta?')) return;

    try {
      const { error } = await supabase
        .from('metas_vendedoras')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Sucesso',
        description: 'Meta excluída com sucesso.',
      });
      fetchMetas();
      fetchVendedorasComMeta();
    } catch (error) {
      console.error('Erro ao excluir meta:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível excluir a meta.',
        variant: 'destructive',
      });
    }
  };

  const resetForm = () => {
    setFormData({
      vendedora_pf_id: '',
      ano: new Date().getFullYear().toString(),
      mes: (new Date().getMonth() + 1).toString(),
      meta_centavos: 0,
    });
  };

  const formatCurrency = (centavos: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(centavos / 100);
  };

  const getPerformanceBadge = (percentual: number) => {
    if (percentual >= 100) {
      return <Badge className="bg-green-500">Meta Atingida</Badge>;
    } else if (percentual >= 80) {
      return <Badge variant="secondary">Próximo da Meta</Badge>;
    } else {
      return <Badge variant="destructive">Abaixo da Meta</Badge>;
    }
  };

  const getPerformanceIcon = (percentual: number) => {
    if (percentual >= 100) {
      return <TrendingUp className="h-4 w-4 text-green-500" />;
    } else {
      return <TrendingDown className="h-4 w-4 text-red-500" />;
    }
  };

  const filteredMetas = metas.filter(meta =>
    meta.pessoas_fisicas.nome_completo.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredVendedorasComMeta = vendedorasComMeta.filter(vendedora =>
    vendedora.vendedora_nome.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return <div>Carregando...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Metas de Vendas</h1>
          <p className="text-muted-foreground">
            Gerencie as metas mensais das vendedoras
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => { resetForm(); setEditingMeta(null); }}>
              <Plus className="mr-2 h-4 w-4" />
              Nova Meta
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingMeta ? 'Editar Meta' : 'Nova Meta'}
              </DialogTitle>
              <DialogDescription>
                Defina a meta mensal para a vendedora
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
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
                  <Label htmlFor="meta_centavos">Meta (R$)</Label>
                  <CurrencyInput
                    id="meta_centavos"
                    value={formData.meta_centavos}
                    onValueChange={(value) => setFormData({ ...formData, meta_centavos: value })}
                  />
                </div>
                <div>
                  <Label htmlFor="ano">Ano</Label>
                  <Input
                    id="ano"
                    type="number"
                    min="2020"
                    max="2030"
                    value={formData.ano}
                    onChange={(e) => setFormData({ ...formData, ano: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="mes">Mês</Label>
                  <Select value={formData.mes} onValueChange={(value) => setFormData({ ...formData, mes: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um mês" />
                    </SelectTrigger>
                    <SelectContent>
                      {meses.map((mes) => (
                        <SelectItem key={mes.value} value={mes.value.toString()}>
                          {mes.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit">
                  {editingMeta ? 'Atualizar' : 'Cadastrar'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-4">
            <div>
              <Label htmlFor="ano-filter">Ano</Label>
              <Select value={selectedAno.toString()} onValueChange={(value) => setSelectedAno(parseInt(value))}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[2023, 2024, 2025, 2026].map((ano) => (
                    <SelectItem key={ano} value={ano.toString()}>
                      {ano}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="mes-filter">Mês</Label>
              <Select value={selectedMes.toString()} onValueChange={(value) => setSelectedMes(parseInt(value))}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {meses.map((mes) => (
                    <SelectItem key={mes.value} value={mes.value.toString()}>
                      {mes.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1">
              <Label htmlFor="search">Buscar</Label>
              <div className="flex items-center space-x-2">
                <Search className="h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Buscar por vendedora..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Performance das Vendedoras */}
      <Card>
        <CardHeader>
          <CardTitle>Performance vs Meta</CardTitle>
          <CardDescription>
            Acompanhamento do desempenho das vendedoras em relação às metas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Vendedora</TableHead>
                <TableHead>Meta Original</TableHead>
                <TableHead>Meta Ajustada</TableHead>
                <TableHead>Vendido</TableHead>
                <TableHead>Performance</TableHead>
                <TableHead>Dias Trabalhados</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredVendedorasComMeta.map((vendedora) => (
                <TableRow key={vendedora.vendedora_pf_id}>
                  <TableCell className="font-medium">
                    {vendedora.vendedora_nome}
                  </TableCell>
                  <TableCell>{formatCurrency(vendedora.meta_original || 0)}</TableCell>
                  <TableCell>{formatCurrency(vendedora.meta_ajustada || 0)}</TableCell>
                  <TableCell>{formatCurrency(vendedora.valor_liquido_total || 0)}</TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      {getPerformanceIcon(vendedora.percentual_meta)}
                      <div className="flex-1">
                        <Progress 
                          value={Math.min(vendedora.percentual_meta, 100)} 
                          className="w-20"
                        />
                      </div>
                      <span className="text-sm font-medium">
                        {vendedora.percentual_meta.toFixed(1)}%
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <div>{vendedora.dias_trabalhados} dias</div>
                      {vendedora.dias_ferias > 0 && (
                        <div className="text-muted-foreground">
                          {vendedora.dias_ferias} dias de férias
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {getPerformanceBadge(vendedora.percentual_meta)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Metas Cadastradas */}
      <Card>
        <CardHeader>
          <CardTitle>Metas Cadastradas</CardTitle>
          <CardDescription>
            {metas.length} meta(s) cadastrada(s) para {meses.find(m => m.value === selectedMes)?.label} de {selectedAno}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Vendedora</TableHead>
                <TableHead>Período</TableHead>
                <TableHead>Meta</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredMetas.map((meta) => (
                <TableRow key={meta.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center space-x-2">
                      <Target className="h-4 w-4 text-muted-foreground" />
                      <span>{meta.pessoas_fisicas.nome_completo}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {meses.find(m => m.value === meta.mes)?.label} {meta.ano}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-medium">
                    {formatCurrency(meta.meta_centavos)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(meta)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(meta.id)}
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
