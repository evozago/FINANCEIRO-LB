import { useState, useEffect } from 'react';
import { Plus, Search, Edit, Trash2, RefreshCw, Calendar, Play, Pause, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CurrencyInput } from '@/components/ui/currency-input';
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
  dia_vencimento: number;
  fornecedor_id?: number | null;
  categoria_id: number;
  filial_id: number;
  ativa: boolean;
  livre: boolean;
  sem_data_final: boolean;
  dia_fechamento?: number | null;
  numero_nota?: string | null;
  chave_nfe?: string | null;
  num_parcelas: number;
  referencia?: string | null;
  data_emissao?: string | null;
  codigo_boleto?: string | null;
  tipo_frequencia: 'diaria' | 'semanal' | 'quinzenal' | 'mensal';
  intervalo_frequencia: number;
  dias_semana?: number[] | null;
  ultimo_gerado_em?: string | null;
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

  const [formData, setFormData] = useState<Omit<ContaRecorrente, 'id' | 'created_at' | 'updated_at' | 'ultimo_gerado_em'>>({
    nome: "",
    valor_total_centavos: 0,
    dia_vencimento: 1,
    fornecedor_id: undefined,
    categoria_id: 0,
    filial_id: 0,
    ativa: true,
    livre: false,
    sem_data_final: true,
    dia_fechamento: undefined,
    numero_nota: undefined,
    chave_nfe: undefined,
    num_parcelas: 1,
    referencia: undefined,
    data_emissao: undefined,
    codigo_boleto: undefined,
    tipo_frequencia: "mensal",
    intervalo_frequencia: 1,
    dias_semana: [],
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

    if (formData.valor_total_centavos <= 0) {
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
        valor_total_centavos: formData.valor_total_centavos,
        dia_vencimento: parseInt(formData.dia_vencimento.toString()),
        fornecedor_id: formData.fornecedor_id || null,
        categoria_id: formData.categoria_id,
        filial_id: formData.filial_id,
        ativa: formData.ativa,
        livre: formData.livre,
        sem_data_final: formData.sem_data_final,
        dia_fechamento: formData.dia_fechamento || null,
        numero_nota: formData.numero_nota || null,
        chave_nfe: formData.chave_nfe || null,
        num_parcelas: formData.num_parcelas,
        referencia: formData.referencia || null,
        data_emissao: formData.data_emissao || null,
        codigo_boleto: formData.codigo_boleto || null,
        tipo_frequencia: formData.tipo_frequencia,
        intervalo_frequencia: formData.intervalo_frequencia,
        dias_semana: formData.dias_semana.length > 0 ? formData.dias_semana : null,
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
      valor_total_centavos: conta.valor_total_centavos,
      dia_vencimento: conta.dia_vencimento,
      fornecedor_id: conta.fornecedor_id || undefined,
      categoria_id: conta.categoria_id,
      filial_id: conta.filial_id,
      ativa: conta.ativa,
      livre: conta.livre,
      sem_data_final: conta.sem_data_final,
      dia_fechamento: conta.dia_fechamento || undefined,
      numero_nota: conta.numero_nota || undefined,
      chave_nfe: conta.chave_nfe || undefined,
      num_parcelas: conta.num_parcelas,
      referencia: conta.referencia || undefined,
      data_emissao: conta.data_emissao || undefined,
      codigo_boleto: conta.codigo_boleto || undefined,
      tipo_frequencia: conta.tipo_frequencia,
      intervalo_frequencia: conta.intervalo_frequencia,
      dias_semana: conta.dias_semana || [],
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

  const handleGerarConta = async (conta: ContaRecorrente) => {
    setGenerating(true);
    try {
      const hoje = new Date();
      const vencimento = new Date(hoje.getFullYear(), hoje.getMonth(), conta.dia_vencimento);

      const { data: novaConta, error: contaError } = await supabase
        .from('contas_pagar')
        .insert({
          fornecedor_id: conta.fornecedor_id,
          categoria_id: conta.categoria_id,
          filial_id: conta.filial_id,
          descricao: conta.nome,
          numero_nota: conta.numero_nota,
          chave_nfe: conta.chave_nfe,
          valor_total_centavos: conta.valor_total_centavos,
          num_parcelas: conta.num_parcelas,
          recorrencia_id: conta.id,
          referencia: conta.referencia,
          data_emissao: conta.data_emissao,
          codigo_boleto: conta.codigo_boleto,
        })
        .select('id')
        .single();

      if (contaError) throw contaError;

      const parcelas = [];
      const valorParcela = Math.round(conta.valor_total_centavos / conta.num_parcelas);

      for (let i = 1; i <= conta.num_parcelas; i++) {
        const vencimentoParcela = new Date(vencimento);
        vencimentoParcela.setMonth(vencimentoParcela.getMonth() + i - 1);

        parcelas.push({
          conta_id: novaConta.id,
          numero_parcela: i,
          valor_parcela_centavos: valorParcela,
          vencimento: vencimentoParcela.toISOString().split('T')[0],
          pago: false,
        });
      }

      const { error: parcelasError } = await supabase
        .from('contas_pagar_parcelas')
        .insert(parcelas);

      if (parcelasError) throw parcelasError;

      await supabase
        .from('recorrencias')
        .update({ ultimo_gerado_em: hoje.toISOString().split('T')[0] })
        .eq('id', conta.id);

      toast({
        title: 'Sucesso',
        description: 'Conta a pagar gerada com sucesso!',
      });

    } catch (error) {
      console.error('Erro ao gerar conta recorrente:', error);
      toast({
        title: 'Erro',
        description: `Erro ao gerar conta recorrente: ${error.message || 'Erro desconhecido'}`,
        variant: 'destructive',
      });
    } finally {
      setGenerating(false);
    }
  };

  const resetForm = () => {
    setFormData({
      nome: "",
      valor_total_centavos: 0,
      dia_vencimento: 1,
      fornecedor_id: undefined,
      categoria_id: 0,
      filial_id: 0,
      ativa: true,
      livre: false,
      sem_data_final: true,
      dia_fechamento: undefined,
      numero_nota: undefined,
      chave_nfe: undefined,
      num_parcelas: 1,
      referencia: undefined,
      data_emissao: undefined,
      codigo_boleto: undefined,
      tipo_frequencia: "mensal",
      intervalo_frequencia: 1,
      dias_semana: [],
    });
  };

  const filteredContas = contas.filter(conta =>
    conta.nome.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="container mx-auto p-4">
      <Card>
        <CardHeader>
          <CardTitle>Contas Recorrentes</CardTitle>
          <CardDescription>Gerencie suas contas recorrentes.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-2">
              <Input
                placeholder="Buscar por nome..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="max-w-sm"
              />
              <Button variant="outline" size="icon">
                <Search className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => loadData()} disabled={loading}>
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={() => {
                    setEditingConta(null);
                    resetForm();
                    setIsDialogOpen(true);
                  }}>
                    <Plus className="mr-2 h-4 w-4" /> Nova Conta Recorrente
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[600px]">
                  <DialogHeader>
                    <DialogTitle>{editingConta ? 'Editar' : 'Nova'} Conta Recorrente</DialogTitle>
                    <DialogDescription>
                      {editingConta ? 'Altere os dados da sua conta recorrente.' : 'Preencha os dados para cadastrar uma nova conta recorrente.'}
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleSubmit} className="grid gap-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor="nome">Nome</Label>
                        <Input
                          id="nome"
                          value={formData.nome}
                          onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                          required
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="valor">Valor</Label>
                        <CurrencyInput
                          id="valor"
                          value={formData.valor_total_centavos}
                          onValueChange={(value) => setFormData({ ...formData, valor_total_centavos: value || 0 })}
                          required
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor="dia_vencimento">Dia do Vencimento</Label>
                        <Input
                          id="dia_vencimento"
                          type="number"
                          min={1}
                          max={31}
                          value={formData.dia_vencimento}
                          onChange={(e) => setFormData({ ...formData, dia_vencimento: parseInt(e.target.value) })}
                          required
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="num_parcelas">Nº de Parcelas</Label>
                        <Input
                          id="num_parcelas"
                          type="number"
                          min={1}
                          value={formData.num_parcelas}
                          onChange={(e) => setFormData({ ...formData, num_parcelas: parseInt(e.target.value) })}
                          required
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="data_emissao">Data de Emissão</Label>
                        <Input
                          id="data_emissao"
                          type="date"
                          value={formData.data_emissao || ''}
                          onChange={(e) => setFormData({ ...formData, data_emissao: e.target.value })}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor="fornecedor">Fornecedor</Label>
                        <select
                          id="fornecedor"
                          value={formData.fornecedor_id || ''}
                          onChange={(e) => setFormData({ ...formData, fornecedor_id: parseInt(e.target.value) || undefined })}
                          className="w-full p-2 border rounded"
                        >
                          <option value="">Selecione...</option>
                          {fornecedores.map(f => (
                            <option key={f.id} value={f.id}>{f.razao_social}</option>
                          ))}
                        </select>
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="categoria">Categoria</Label>
                        <select
                          id="categoria"
                          value={formData.categoria_id || ''}
                          onChange={(e) => setFormData({ ...formData, categoria_id: parseInt(e.target.value) })}
                          className="w-full p-2 border rounded"
                          required
                        >
                          <option value="">Selecione...</option>
                          {categorias.map(c => (
                            <option key={c.id} value={c.id}>{c.nome}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor="filial">Filial</Label>
                        <select
                          id="filial"
                          value={formData.filial_id || ''}
                          onChange={(e) => setFormData({ ...formData, filial_id: parseInt(e.target.value) })}
                          className="w-full p-2 border rounded"
                          required
                        >
                          <option value="">Selecione...</option>
                          {filiais.map(f => (
                            <option key={f.id} value={f.id}>{f.nome}</option>
                          ))}
                        </select>
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="referencia">Referência</Label>
                        <Input
                          id="referencia"
                          value={formData.referencia || ''}
                          onChange={(e) => setFormData({ ...formData, referencia: e.target.value })}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor="numero_nota">Número da Nota</Label>
                        <Input
                          id="numero_nota"
                          value={formData.numero_nota || ''}
                          onChange={(e) => setFormData({ ...formData, numero_nota: e.target.value })}
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="chave_nfe">Chave NFe</Label>
                        <Input
                          id="chave_nfe"
                          value={formData.chave_nfe || ''}
                          onChange={(e) => setFormData({ ...formData, chave_nfe: e.target.value })}
                        />
                      </div>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="codigo_boleto">Código do Boleto</Label>
                      <Input
                        id="codigo_boleto"
                        value={formData.codigo_boleto || ''}
                        onChange={(e) => setFormData({ ...formData, codigo_boleto: e.target.value })}
                      />
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor="tipo_frequencia">Frequência</Label>
                        <select
                          id="tipo_frequencia"
                          value={formData.tipo_frequencia}
                          onChange={(e) => setFormData({ ...formData, tipo_frequencia: e.target.value as any })}
                          className="w-full p-2 border rounded"
                        >
                          <option value="diaria">Diária</option>
                          <option value="semanal">Semanal</option>
                          <option value="quinzenal">Quinzenal</option>
                          <option value="mensal">Mensal</option>
                        </select>
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="intervalo_frequencia">Intervalo</Label>
                        <Input
                          id="intervalo_frequencia"
                          type="number"
                          min={1}
                          value={formData.intervalo_frequencia}
                          onChange={(e) => setFormData({ ...formData, intervalo_frequencia: parseInt(e.target.value) })}
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label>Dias da Semana</Label>
                        <div className="flex gap-2">
                          {[...Array(7)].map((_, i) => (
                            <Button
                              key={i}
                              type="button"
                              variant={formData.dias_semana?.includes(i) ? 'default' : 'outline'}
                              onClick={() => {
                                const newDias = [...(formData.dias_semana || [])];
                                if (newDias.includes(i)) {
                                  newDias.splice(newDias.indexOf(i), 1);
                                } else {
                                  newDias.push(i);
                                }
                                setFormData({ ...formData, dias_semana: newDias });
                              }}
                            >
                              {["D", "S", "T", "Q", "Q", "S", "S"][i]}
                            </Button>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="ativa"
                        checked={formData.ativa}
                        onChange={(e) => setFormData({ ...formData, ativa: e.target.checked })}
                      />
                      <Label htmlFor="ativa">Ativa</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="livre"
                        checked={formData.livre}
                        onChange={(e) => setFormData({ ...formData, livre: e.target.checked })}
                      />
                      <Label htmlFor="livre">Livre</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="sem_data_final"
                        checked={formData.sem_data_final}
                        onChange={(e) => setFormData({ ...formData, sem_data_final: e.target.checked })}
                      />
                      <Label htmlFor="sem_data_final">Sem Data Final</Label>
                    </div>
                    <div className="flex justify-end gap-2 mt-4">
                      <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
                      <Button type="submit">{editingConta ? 'Salvar Alterações' : 'Cadastrar'}</Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Dia Venc.</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center">Carregando...</TableCell>
                </TableRow>
              ) : filteredContas.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center">Nenhuma conta recorrente encontrada.</TableCell>
                </TableRow>
              ) : (
                filteredContas.map((conta) => (
                  <TableRow key={conta.id}>
                    <TableCell>{conta.nome}</TableCell>
                    <TableCell>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(conta.valor_total_centavos / 100)}</TableCell>
                    <TableCell>{conta.dia_vencimento}</TableCell>
                    <TableCell>
                      <Badge variant={conta.ativa ? 'default' : 'destructive'}>
                        {conta.ativa ? 'Ativa' : 'Inativa'}
                      </Badge>
                    </TableCell>
                    <TableCell className="flex gap-2">
                      <Button variant="outline" size="icon" onClick={() => handleGerarConta(conta)} disabled={generating}>
                        <DollarSign className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="icon" onClick={() => toggleAtiva(conta.id, conta.ativa)}>
                        {conta.ativa ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                      </Button>
                      <Button variant="outline" size="icon" onClick={() => handleEdit(conta)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="destructive" size="icon" onClick={() => handleDelete(conta.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
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

