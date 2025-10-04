import { useState, useEffect } from 'react';
import { Plus, Search, Edit, Trash2, RefreshCw, Calendar, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { DatePicker } from '@/components/ui/date-picker';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ContaRecorrente {
  id: number;
  descricao: string;
  valor_centavos: number;
  tipo_recorrencia: string;
  dia_vencimento: number;
  fornecedor_id?: number;
  categoria_id?: number;
  ativa: boolean;
  proxima_geracao: string;
  observacoes?: string;
  created_at: string;
  pessoas_juridicas?: {
    nome_fantasia?: string;
    razao_social: string;
  };
  categorias_financeiras?: {
    nome: string;
  };
}

interface Fornecedor {
  id: number;
  nome_fantasia?: string;
  razao_social: string;
}

interface Categoria {
  id: number;
  nome: string;
}

const tiposRecorrencia = [
  { value: 'mensal', label: 'Mensal' },
  { value: 'bimestral', label: 'Bimestral' },
  { value: 'trimestral', label: 'Trimestral' },
  { value: 'semestral', label: 'Semestral' },
  { value: 'anual', label: 'Anual' },
];

export function ContasRecorrentes() {
  const [contas, setContas] = useState<ContaRecorrente[]>([]);
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingConta, setEditingConta] = useState<ContaRecorrente | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    descricao: '',
    valor_centavos: '',
    tipo_recorrencia: 'mensal',
    dia_vencimento: '1',
    fornecedor_id: '',
    categoria_id: '',
    ativa: true,
    proxima_geracao: new Date(),
    observacoes: '',
  });

  useEffect(() => {
    fetchContas();
    fetchFornecedores();
    fetchCategorias();
  }, []);

  const fetchContas = async () => {
    try {
      const { data, error } = await supabase
        .from('contas_recorrentes')
        .select(`
          *,
          pessoas_juridicas(nome_fantasia, razao_social),
          categorias_financeiras(nome)
        `)
        .order('descricao');

      if (error) throw error;
      setContas(data || []);
    } catch (error) {
      console.error('Erro ao buscar contas recorrentes:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar as contas recorrentes.',
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
        .order('razao_social');

      if (error) throw error;
      setFornecedores(data || []);
    } catch (error) {
      console.error('Erro ao buscar fornecedores:', error);
    }
  };

  const fetchCategorias = async () => {
    try {
      const { data, error } = await supabase
        .from('categorias_financeiras')
        .select('id, nome')
        .order('nome');

      if (error) throw error;
      setCategorias(data || []);
    } catch (error) {
      console.error('Erro ao buscar categorias:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const dataToSubmit = {
        descricao: formData.descricao,
        valor_centavos: Math.round(parseFloat(formData.valor_centavos) * 100),
        tipo_recorrencia: formData.tipo_recorrencia,
        dia_vencimento: parseInt(formData.dia_vencimento),
        fornecedor_id: formData.fornecedor_id ? parseInt(formData.fornecedor_id) : null,
        categoria_id: formData.categoria_id ? parseInt(formData.categoria_id) : null,
        ativa: formData.ativa,
        proxima_geracao: formData.proxima_geracao.toISOString().split('T')[0],
        observacoes: formData.observacoes || null,
      };

      if (editingConta) {
        const { error } = await supabase
          .from('contas_recorrentes')
          .update(dataToSubmit)
          .eq('id', editingConta.id);

        if (error) throw error;

        toast({
          title: 'Sucesso',
          description: 'Conta recorrente atualizada com sucesso.',
        });
      } else {
        const { error } = await supabase
          .from('contas_recorrentes')
          .insert([dataToSubmit]);

        if (error) throw error;

        toast({
          title: 'Sucesso',
          description: 'Conta recorrente cadastrada com sucesso.',
        });
      }

      setIsDialogOpen(false);
      setEditingConta(null);
      resetForm();
      fetchContas();
    } catch (error) {
      console.error('Erro ao salvar conta recorrente:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível salvar a conta recorrente.',
        variant: 'destructive',
      });
    }
  };

  const handleEdit = (conta: ContaRecorrente) => {
    setEditingConta(conta);
    setFormData({
      descricao: conta.descricao,
      valor_centavos: (conta.valor_centavos / 100).toString(),
      tipo_recorrencia: conta.tipo_recorrencia,
      dia_vencimento: conta.dia_vencimento.toString(),
      fornecedor_id: conta.fornecedor_id?.toString() || '',
      categoria_id: conta.categoria_id?.toString() || '',
      ativa: conta.ativa,
      proxima_geracao: new Date(conta.proxima_geracao),
      observacoes: conta.observacoes || '',
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Tem certeza que deseja excluir esta conta recorrente?')) return;

    try {
      const { error } = await supabase
        .from('contas_recorrentes')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Sucesso',
        description: 'Conta recorrente excluída com sucesso.',
      });
      fetchContas();
    } catch (error) {
      console.error('Erro ao excluir conta recorrente:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível excluir a conta recorrente.',
        variant: 'destructive',
      });
    }
  };

  const gerarContasPendentes = async () => {
    try {
      // Buscar contas ativas que precisam ser geradas
      const hoje = new Date().toISOString().split('T')[0];
      
      const { data: contasPendentes, error } = await supabase
        .from('contas_recorrentes')
        .select('*')
        .eq('ativa', true)
        .lte('proxima_geracao', hoje);

      if (error) throw error;

      if (!contasPendentes || contasPendentes.length === 0) {
        toast({
          title: 'Informação',
          description: 'Não há contas pendentes para gerar.',
        });
        return;
      }

      let contasGeradas = 0;

      for (const conta of contasPendentes) {
        // Gerar a conta a pagar
        const { error: insertError } = await supabase
          .from('contas_pagar')
          .insert([{
            descricao: `${conta.descricao} - ${new Date().toLocaleDateString('pt-BR')}`,
            valor_total_centavos: conta.valor_centavos,
            num_parcelas: 1,
            fornecedor_id: conta.fornecedor_id,
            categoria_id: conta.categoria_id,
            observacoes: `Gerada automaticamente da conta recorrente: ${conta.descricao}`,
          }]);

        if (insertError) {
          console.error('Erro ao gerar conta:', insertError);
          continue;
        }

        // Calcular próxima geração
        const proximaGeracao = new Date(conta.proxima_geracao);
        switch (conta.tipo_recorrencia) {
          case 'mensal':
            proximaGeracao.setMonth(proximaGeracao.getMonth() + 1);
            break;
          case 'bimestral':
            proximaGeracao.setMonth(proximaGeracao.getMonth() + 2);
            break;
          case 'trimestral':
            proximaGeracao.setMonth(proximaGeracao.getMonth() + 3);
            break;
          case 'semestral':
            proximaGeracao.setMonth(proximaGeracao.getMonth() + 6);
            break;
          case 'anual':
            proximaGeracao.setFullYear(proximaGeracao.getFullYear() + 1);
            break;
        }

        // Atualizar próxima geração
        await supabase
          .from('contas_recorrentes')
          .update({ proxima_geracao: proximaGeracao.toISOString().split('T')[0] })
          .eq('id', conta.id);

        contasGeradas++;
      }

      toast({
        title: 'Sucesso',
        description: `${contasGeradas} conta(s) gerada(s) com sucesso.`,
      });

      fetchContas();
    } catch (error) {
      console.error('Erro ao gerar contas pendentes:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao gerar contas pendentes.',
        variant: 'destructive',
      });
    }
  };

  const resetForm = () => {
    setFormData({
      descricao: '',
      valor_centavos: '',
      tipo_recorrencia: 'mensal',
      dia_vencimento: '1',
      fornecedor_id: '',
      categoria_id: '',
      ativa: true,
      proxima_geracao: new Date(),
      observacoes: '',
    });
  };

  const formatCurrency = (centavos: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(centavos / 100);
  };

  const getTipoRecorrenciaLabel = (tipo: string) => {
    return tiposRecorrencia.find(t => t.value === tipo)?.label || tipo;
  };

  const isVencimentoProximo = (proximaGeracao: string) => {
    const hoje = new Date();
    const vencimento = new Date(proximaGeracao);
    const diffTime = vencimento.getTime() - hoje.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= 7 && diffDays >= 0;
  };

  const isVencida = (proximaGeracao: string) => {
    const hoje = new Date();
    const vencimento = new Date(proximaGeracao);
    return vencimento < hoje;
  };

  const filteredContas = contas.filter(conta =>
    conta.descricao.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (conta.pessoas_juridicas?.nome_fantasia && conta.pessoas_juridicas.nome_fantasia.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (conta.pessoas_juridicas?.razao_social && conta.pessoas_juridicas.razao_social.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const contasVencidas = contas.filter(conta => conta.ativa && isVencida(conta.proxima_geracao)).length;
  const contasProximoVencimento = contas.filter(conta => conta.ativa && isVencimentoProximo(conta.proxima_geracao)).length;

  if (loading) {
    return <div>Carregando...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Contas Recorrentes</h1>
          <p className="text-muted-foreground">
            Gerencie contas que se repetem periodicamente
          </p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={gerarContasPendentes}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Gerar Pendentes
          </Button>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => { resetForm(); setEditingConta(null); }}>
                <Plus className="mr-2 h-4 w-4" />
                Nova Conta Recorrente
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>
                  {editingConta ? 'Editar Conta Recorrente' : 'Nova Conta Recorrente'}
                </DialogTitle>
                <DialogDescription>
                  Configure uma conta que se repete automaticamente
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <Label htmlFor="descricao">Descrição *</Label>
                    <Input
                      id="descricao"
                      value={formData.descricao}
                      onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                      placeholder="Ex: Aluguel, Energia elétrica..."
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="valor_centavos">Valor (R$) *</Label>
                    <Input
                      id="valor_centavos"
                      type="number"
                      step="0.01"
                      value={formData.valor_centavos}
                      onChange={(e) => setFormData({ ...formData, valor_centavos: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="tipo_recorrencia">Tipo de Recorrência *</Label>
                    <Select value={formData.tipo_recorrencia} onValueChange={(value) => setFormData({ ...formData, tipo_recorrencia: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {tiposRecorrencia.map((tipo) => (
                          <SelectItem key={tipo.value} value={tipo.value}>
                            {tipo.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="dia_vencimento">Dia do Vencimento *</Label>
                    <Select value={formData.dia_vencimento} onValueChange={(value) => setFormData({ ...formData, dia_vencimento: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 31 }, (_, i) => i + 1).map((dia) => (
                          <SelectItem key={dia} value={dia.toString()}>
                            Dia {dia}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="proxima_geracao">Próxima Geração</Label>
                    <DatePicker
                      date={formData.proxima_geracao}
                      onSelect={(date) => setFormData({ ...formData, proxima_geracao: date || new Date() })}
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
                    <Label htmlFor="categoria_id">Categoria</Label>
                    <Select value={formData.categoria_id} onValueChange={(value) => setFormData({ ...formData, categoria_id: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione uma categoria" />
                      </SelectTrigger>
                      <SelectContent>
                        {categorias.map((categoria) => (
                          <SelectItem key={categoria.id} value={categoria.id.toString()}>
                            {categoria.nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="ativa"
                    checked={formData.ativa}
                    onCheckedChange={(checked) => setFormData({ ...formData, ativa: checked })}
                  />
                  <Label htmlFor="ativa">Conta ativa</Label>
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
                    {editingConta ? 'Atualizar' : 'Cadastrar'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Alertas */}
      {(contasVencidas > 0 || contasProximoVencimento > 0) && (
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-orange-800">
              <AlertCircle className="h-5 w-5" />
              <span>Alertas</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {contasVencidas > 0 && (
                <div className="text-red-600">
                  <strong>{contasVencidas}</strong> conta(s) vencida(s) para geração
                </div>
              )}
              {contasProximoVencimento > 0 && (
                <div className="text-orange-600">
                  <strong>{contasProximoVencimento}</strong> conta(s) com vencimento próximo (7 dias)
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Buscar Contas Recorrentes</CardTitle>
          <CardDescription>
            Use o campo abaixo para filtrar as contas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por descrição ou fornecedor..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Contas Recorrentes</CardTitle>
          <CardDescription>
            {filteredContas.length} conta(s) encontrada(s)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Descrição</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Recorrência</TableHead>
                <TableHead>Próxima Geração</TableHead>
                <TableHead>Fornecedor</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredContas.map((conta) => (
                <TableRow key={conta.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center space-x-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <div>{conta.descricao}</div>
                        {conta.categorias_financeiras && (
                          <div className="text-sm text-muted-foreground">
                            {conta.categorias_financeiras.nome}
                          </div>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">
                    {formatCurrency(conta.valor_centavos)}
                  </TableCell>
                  <TableCell>
                    <div>
                      <div>{getTipoRecorrenciaLabel(conta.tipo_recorrencia)}</div>
                      <div className="text-sm text-muted-foreground">
                        Dia {conta.dia_vencimento}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <span className={
                        isVencida(conta.proxima_geracao) ? 'text-red-600 font-medium' :
                        isVencimentoProximo(conta.proxima_geracao) ? 'text-orange-600 font-medium' :
                        'text-muted-foreground'
                      }>
                        {new Date(conta.proxima_geracao).toLocaleDateString('pt-BR')}
                      </span>
                      {isVencida(conta.proxima_geracao) && (
                        <Badge variant="destructive">Vencida</Badge>
                      )}
                      {isVencimentoProximo(conta.proxima_geracao) && !isVencida(conta.proxima_geracao) && (
                        <Badge variant="secondary">Próximo</Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {conta.pessoas_juridicas ? 
                      (conta.pessoas_juridicas.nome_fantasia || conta.pessoas_juridicas.razao_social) : 
                      'Não informado'
                    }
                  </TableCell>
                  <TableCell>
                    <Badge variant={conta.ativa ? 'default' : 'secondary'}>
                      {conta.ativa ? 'Ativa' : 'Inativa'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(conta)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(conta.id)}
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
