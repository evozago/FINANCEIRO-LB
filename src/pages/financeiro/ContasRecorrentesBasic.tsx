import { useState, useEffect } from 'react';
import { Plus, Search, Edit, Trash2, RefreshCw, Calendar, Play, Pause, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ContaRecorrente {
  id: number;
  nome: string;
  valor_total_centavos: number;
  valor_esperado_centavos?: number;
  dia_vencimento: number;
  fornecedor_id?: number;
  categoria_id: number;
  filial_id: number;
  ativa: boolean;
  livre: boolean;
  sem_data_final: boolean;
  dia_fechamento?: number;
  created_at: string;
  updated_at: string;
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

interface Filial {
  id: number;
  nome: string;
}

export function ContasRecorrentes() {
  const [contas, setContas] = useState<ContaRecorrente[]>([]);
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [filiais, setFiliais] = useState<Filial[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingConta, setEditingConta] = useState<ContaRecorrente | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    nome: '',
    valor_esperado_centavos: '',
    dia_vencimento: '1',
    fornecedor_id: '',
    categoria_id: '',
    filial_id: '',
    ativa: true,
    livre: false,
    sem_data_final: true,
    dia_fechamento: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchContas(),
        fetchFornecedores(),
        fetchCategorias(),
        fetchFiliais()
      ]);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchContas = async () => {
    try {
      const { data, error } = await supabase
        .from('recorrencias')
        .select('*')
        .order('nome');

      if (error) {
        console.error('Erro na query recorrencias:', error);
        throw error;
      }
      
      setContas(data || []);
    } catch (error) {
      console.error('Erro ao buscar contas recorrentes:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar as contas recorrentes.',
        variant: 'destructive',
      });
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
    
    // Validações básicas
    if (!formData.nome.trim()) {
      toast({
        title: 'Erro',
        description: 'Nome é obrigatório.',
        variant: 'destructive',
      });
      return;
    }

    if (!formData.categoria_id) {
      toast({
        title: 'Erro',
        description: 'Categoria é obrigatória.',
        variant: 'destructive',
      });
      return;
    }

    if (!formData.filial_id) {
      toast({
        title: 'Erro',
        description: 'Filial é obrigatória.',
        variant: 'destructive',
      });
      return;
    }

    if (!formData.valor_esperado_centavos || parseFloat(formData.valor_esperado_centavos) <= 0) {
      toast({
        title: 'Erro',
        description: 'Valor deve ser maior que zero.',
        variant: 'destructive',
      });
      return;
    }
    
    try {
      const dataToSubmit = {
        nome: formData.nome.trim(),
        valor_esperado_centavos: Math.round(parseFloat(formData.valor_esperado_centavos) * 100),
        dia_vencimento: parseInt(formData.dia_vencimento),
        fornecedor_id: formData.fornecedor_id ? parseInt(formData.fornecedor_id) : null,
        categoria_id: parseInt(formData.categoria_id),
        filial_id: parseInt(formData.filial_id),
        ativa: formData.ativa,
        livre: formData.livre,
        sem_data_final: formData.sem_data_final,
        dia_fechamento: formData.dia_fechamento ? parseInt(formData.dia_fechamento) : null,
      };

      if (editingConta) {
        const { error } = await supabase
          .from('recorrencias')
          .update(dataToSubmit)
          .eq('id', editingConta.id);

        if (error) throw error;

        toast({
          title: 'Sucesso',
          description: 'Conta recorrente atualizada com sucesso.',
        });
      } else {
        const { error } = await supabase
          .from('recorrencias')
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
        description: `Erro ao salvar: ${error.message || 'Erro desconhecido'}`,
        variant: 'destructive',
      });
    }
  };

  const handleEdit = (conta: ContaRecorrente) => {
    setEditingConta(conta);
    setFormData({
      nome: conta.nome,
      valor_esperado_centavos: (conta.valor_esperado_centavos / 100).toString(),
      dia_vencimento: conta.dia_vencimento.toString(),
      fornecedor_id: conta.fornecedor_id?.toString() || '',
      categoria_id: conta.categoria_id.toString(),
      filial_id: conta.filial_id.toString(),
      ativa: conta.ativa,
      livre: conta.livre,
      sem_data_final: conta.sem_data_final,
      dia_fechamento: conta.dia_fechamento?.toString() || '',
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Tem certeza que deseja excluir esta conta recorrente?')) return;

    try {
      const { error } = await supabase
        .from('recorrencias')
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

  const toggleAtiva = async (id: number, ativa: boolean) => {
    try {
      const { error } = await supabase
        .from('recorrencias')
        .update({ ativa: !ativa })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Sucesso',
        description: `Conta recorrente ${!ativa ? 'ativada' : 'desativada'} com sucesso.`,
      });
      fetchContas();
    } catch (error) {
      console.error('Erro ao alterar status:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível alterar o status da conta.',
        variant: 'destructive',
      });
    }
  };

  const gerarContasMes = async () => {
    setGenerating(true);
    try {
      const hoje = new Date();
      const mesAtual = hoje.getMonth() + 1;
      const anoAtual = hoje.getFullYear();

      // Buscar contas ativas
      const contasAtivas = contas.filter(conta => conta.ativa);

      if (contasAtivas.length === 0) {
        toast({
          title: 'Informação',
          description: 'Nenhuma conta recorrente ativa encontrada.',
        });
        return;
      }

      let contasGeradas = 0;
      let contasJaExistentes = 0;

      for (const conta of contasAtivas) {
        const descricaoConta = `${conta.nome} - ${String(mesAtual).padStart(2, '0')}/${anoAtual}`;
        
        // Verificar se já existe
        const { data: contaExistente } = await supabase
          .from('contas_pagar')
          .select('id')
          .eq('descricao', descricaoConta)
          .limit(1);

        if (!contaExistente || contaExistente.length === 0) {
          // Calcular data de vencimento
          let dataVencimento;
          try {
            dataVencimento = new Date(anoAtual, mesAtual - 1, conta.dia_vencimento);
            // Se a data é inválida (ex: 31 de fevereiro), usar último dia do mês
            if (dataVencimento.getMonth() !== mesAtual - 1) {
              dataVencimento = new Date(anoAtual, mesAtual, 0); // Último dia do mês anterior
            }
          } catch {
            dataVencimento = new Date(anoAtual, mesAtual, 0);
          }
          
          // Criar conta a pagar
          const { data: novaConta, error: insertError } = await supabase
            .from('contas_pagar')
            .insert({
              descricao: descricaoConta,
              valor_total_centavos: conta.valor_esperado_centavos,
              fornecedor_id: conta.fornecedor_id,
              categoria_id: conta.categoria_id,
              filial_id: conta.filial_id,
              num_parcelas: 1,
              referencia: `REC-${conta.id}-${String(mesAtual).padStart(2, '0')}${anoAtual}`
            })
            .select('id')
            .single();

          if (!insertError && novaConta) {
            // Criar parcela
            await supabase
              .from('contas_pagar_parcelas')
              .insert({
                conta_id: novaConta.id,
                parcela_num: 1,
                valor_parcela_centavos: conta.valor_esperado_centavos,
                vencimento: dataVencimento.toISOString().split('T')[0],
                pago: false
              });

            contasGeradas++;
          }
        } else {
          contasJaExistentes++;
        }
      }

      toast({
        title: 'Geração Concluída',
        description: `${contasGeradas} conta(s) gerada(s). ${contasJaExistentes} já existiam.`,
      });
      
    } catch (error) {
      console.error('Erro ao gerar contas:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao gerar contas do mês.',
        variant: 'destructive',
      });
    } finally {
      setGenerating(false);
    }
  };

  const resetForm = () => {
    setFormData({
      nome: '',
      valor_esperado_centavos: '',
      dia_vencimento: '1',
      fornecedor_id: '',
      categoria_id: '',
      filial_id: '',
      ativa: true,
      livre: false,
      sem_data_final: true,
      dia_fechamento: '',
    });
  };

  const formatCurrency = (centavos: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(centavos / 100);
  };

  const getFornecedorNome = (fornecedorId?: number) => {
    if (!fornecedorId) return 'Não definido';
    const fornecedor = fornecedores.find(f => f.id === fornecedorId);
    return fornecedor?.nome_fantasia || fornecedor?.razao_social || 'Não encontrado';
  };

  const getCategoriaNome = (categoriaId: number) => {
    const categoria = categorias.find(c => c.id === categoriaId);
    return categoria?.nome || 'Não encontrada';
  };

  const getFilialNome = (filialId: number) => {
    const filial = filiais.find(f => f.id === filialId);
    return filial?.nome || 'Não encontrada';
  };

  const filteredContas = contas.filter(conta =>
    conta.nome.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const contasAtivas = contas.filter(conta => conta.ativa).length;
  const contasInativas = contas.filter(conta => !conta.ativa).length;
  const valorTotalMensal = contas
    .filter(conta => conta.ativa)
    .reduce((sum, conta) => sum + conta.valor_esperado_centavos, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Carregando contas recorrentes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Contas Recorrentes</h1>
          <p className="text-muted-foreground">
            Gerencie contas que se repetem mensalmente
          </p>
        </div>
        <div className="flex space-x-2">
          <Button 
            variant="outline" 
            onClick={gerarContasMes}
            disabled={generating}
          >
            {generating ? (
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            Gerar Contas do Mês
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
                  Configure uma conta que se repete automaticamente todo mês
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <Label htmlFor="nome">Nome da Conta *</Label>
                    <Input
                      id="nome"
                      value={formData.nome}
                      onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                      placeholder="Ex: Aluguel, Energia elétrica, Internet..."
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="valor_esperado_centavos">Valor Esperado (R$) *</Label>
                    <Input
                      id="valor_esperado_centavos"
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={formData.valor_esperado_centavos}
                      onChange={(e) => setFormData({ ...formData, valor_esperado_centavos: e.target.value })}
                      placeholder="0,00"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="dia_vencimento">Dia do Vencimento *</Label>
                    <select 
                      id="dia_vencimento"
                      value={formData.dia_vencimento} 
                      onChange={(e) => setFormData({ ...formData, dia_vencimento: e.target.value })}
                      className="w-full p-2 border border-gray-300 rounded-md"
                    >
                      {Array.from({ length: 31 }, (_, i) => i + 1).map((dia) => (
                        <option key={dia} value={dia.toString()}>
                          Dia {dia}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label htmlFor="categoria_id">Categoria *</Label>
                    <select 
                      id="categoria_id"
                      value={formData.categoria_id} 
                      onChange={(e) => setFormData({ ...formData, categoria_id: e.target.value })}
                      className="w-full p-2 border border-gray-300 rounded-md"
                      required
                    >
                      <option value="">Selecione uma categoria</option>
                      {categorias.map((categoria) => (
                        <option key={categoria.id} value={categoria.id.toString()}>
                          {categoria.nome}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label htmlFor="filial_id">Filial *</Label>
                    <select 
                      id="filial_id"
                      value={formData.filial_id} 
                      onChange={(e) => setFormData({ ...formData, filial_id: e.target.value })}
                      className="w-full p-2 border border-gray-300 rounded-md"
                      required
                    >
                      <option value="">Selecione uma filial</option>
                      {filiais.map((filial) => (
                        <option key={filial.id} value={filial.id.toString()}>
                          {filial.nome}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label htmlFor="fornecedor_id">Fornecedor (Opcional)</Label>
                    <select 
                      id="fornecedor_id"
                      value={formData.fornecedor_id} 
                      onChange={(e) => setFormData({ ...formData, fornecedor_id: e.target.value })}
                      className="w-full p-2 border border-gray-300 rounded-md"
                    >
                      <option value="">Nenhum fornecedor</option>
                      {fornecedores.map((fornecedor) => (
                        <option key={fornecedor.id} value={fornecedor.id.toString()}>
                          {fornecedor.nome_fantasia || fornecedor.razao_social}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="ativa"
                      checked={formData.ativa}
                      onChange={(e) => setFormData({ ...formData, ativa: e.target.checked })}
                    />
                    <Label htmlFor="ativa">Conta ativa (gerar automaticamente)</Label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="livre"
                      checked={formData.livre}
                      onChange={(e) => setFormData({ ...formData, livre: e.target.checked })}
                    />
                    <Label htmlFor="livre">Conta livre (valor pode variar)</Label>
                  </div>
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

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Contas Ativas</CardTitle>
            <Play className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{contasAtivas}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Contas Inativas</CardTitle>
            <Pause className="h-4 w-4 text-gray-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-600">{contasInativas}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Contas</CardTitle>
            <Calendar className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{contas.length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valor Mensal</CardTitle>
            <DollarSign className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {formatCurrency(valorTotalMensal)}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Buscar Contas Recorrentes</CardTitle>
          <CardDescription>
            Use o campo abaixo para filtrar as contas por nome
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome da conta..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Lista de Contas Recorrentes</CardTitle>
          <CardDescription>
            {filteredContas.length} conta(s) encontrada(s)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Fornecedor</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Filial</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Vencimento</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredContas.map((conta) => (
                <TableRow key={conta.id}>
                  <TableCell className="font-medium">{conta.nome}</TableCell>
                  <TableCell>{getFornecedorNome(conta.fornecedor_id)}</TableCell>
                  <TableCell>{getCategoriaNome(conta.categoria_id)}</TableCell>
                  <TableCell>{getFilialNome(conta.filial_id)}</TableCell>
                  <TableCell>{formatCurrency(conta.valor_esperado_centavos)}</TableCell>
                  <TableCell>Dia {conta.dia_vencimento}</TableCell>
                  <TableCell>
                    <Badge variant={conta.ativa ? 'default' : 'secondary'}>
                      {conta.ativa ? 'Ativa' : 'Inativa'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleAtiva(conta.id, conta.ativa)}
                        title={conta.ativa ? 'Desativar' : 'Ativar'}
                      >
                        {conta.ativa ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(conta)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
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
          
          {filteredContas.length === 0 && (
            <div className="text-center py-8">
              <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium">Nenhuma conta recorrente encontrada</h3>
              <p className="text-muted-foreground">
                {searchTerm ? 'Tente ajustar os filtros de busca.' : 'Comece criando sua primeira conta recorrente.'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
