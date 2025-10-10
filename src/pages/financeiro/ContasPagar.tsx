import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Edit, Trash2, CreditCard, Eye } from 'lucide-react';
import { usePersistentState } from '@/hooks/usePersistentState';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';


interface ContaPagar {
  id: number;
  descricao: string;
  numero_nota?: string;
  chave_nfe?: string;
  valor_total_centavos: number;
  num_parcelas: number;
  referencia?: string;
  created_at: string;
  pessoas_juridicas: { nome_fantasia: string };
  categorias_financeiras: { nome: string };
  filiais: { nome: string };
  parcelas_abertas?: number;
  valor_em_aberto?: number;
  proximo_vencimento?: string;
  status_pagamento?: string;
}

interface Fornecedor {
  id: number;
  nome_fantasia: string;
}

interface Categoria {
  id: number;
  nome: string;
}

interface Filial {
  id: number;
  nome: string;
}

interface Parcela {
  id: number;
  parcela_num: number;
  valor_parcela_centavos: number;
  vencimento: string;
  pago: boolean;
  pago_em?: string;
  valor_pago_centavos?: number;
  observacao?: string;
}

export function ContasPagar() {
  const navigate = useNavigate();
  const [contas, setContas] = useState<ContaPagar[]>([]);
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [filiais, setFiliais] = useState<Filial[]>([]);
  const [parcelas, setParcelas] = useState<Parcela[]>([]);
  const [searchTerm, setSearchTerm] = usePersistentState('contas-pagar-search', '');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isParcelasDialogOpen, setIsParcelasDialogOpen] = useState(false);
  const [editingConta, setEditingConta] = useState<ContaPagar | null>(null);
  const [selectedConta, setSelectedConta] = useState<ContaPagar | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    fornecedor_id: '',
    categoria_id: '',
    filial_id: '',
    descricao: '',
    numero_nota: '',
    chave_nfe: '',
    valor_total_centavos: '',
    num_parcelas: '1',
    referencia: '',
  });

  useEffect(() => {
    fetchContas();
    fetchFornecedores();
    fetchCategorias();
    fetchFiliais();
  }, []);

  const fetchContas = async () => {
    try {
      const { data, error } = await supabase
        .from('contas_pagar_parcelas')
        .select(`
          *,
          contas_pagar!inner(
            id,
            descricao,
            fornecedor_id,
            fornecedor_pf_id,
            pessoas_juridicas:fornecedor_id(nome_fantasia, razao_social),
            pessoas_fisicas:fornecedor_pf_id(nome_completo)
          )
        `)
        .eq('pago', false)
        .order('vencimento');

      if (error) throw error;
      
      const transformedData = (data || []).map(parcela => {
        const conta = (parcela as any).contas_pagar;
        const fornecedorNome = conta?.pessoas_juridicas?.nome_fantasia || 
                               conta?.pessoas_juridicas?.razao_social ||
                               conta?.pessoas_fisicas?.nome_completo ||
                               'N/A';
        
        return {
          id: parcela.id,
          descricao: conta?.descricao || 'N/A',
          valor_total_centavos: parcela.valor_parcela_centavos,
          num_parcelas: 1,
          pessoas_juridicas: { nome_fantasia: fornecedorNome },
          created_at: parcela.created_at,
          updated_at: parcela.updated_at,
          parcela_num: parcela.parcela_num,
          vencimento: parcela.vencimento,
          conta_id: parcela.conta_id
        };
      });
      
      setContas(transformedData as any);
    } catch (error) {
      console.error('Erro ao buscar contas a pagar:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar as contas a pagar.',
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
        .select('id, nome_fantasia')
        .order('nome_fantasia');

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

  const fetchParcelas = async (contaId: number) => {
    try {
      const { data, error } = await supabase
        .from('contas_pagar_parcelas')
        .select('*')
        .eq('conta_id', contaId)
        .order('parcela_num');

      if (error) throw error;
      setParcelas(data || []);
    } catch (error) {
      console.error('Erro ao buscar parcelas:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar as parcelas.',
        variant: 'destructive',
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const dataToSubmit = {
        ...formData,
        fornecedor_id: parseInt(formData.fornecedor_id),
        categoria_id: parseInt(formData.categoria_id),
        filial_id: parseInt(formData.filial_id),
        valor_total_centavos: Math.round(parseFloat(formData.valor_total_centavos) * 100),
        num_parcelas: parseInt(formData.num_parcelas),
      };

      if (editingConta) {
        const { error } = await supabase
          .from('contas_pagar')
          .update(dataToSubmit)
          .eq('id', editingConta.id);

        if (error) throw error;

        toast({
          title: 'Sucesso',
          description: 'Conta a pagar atualizada com sucesso.',
        });
      } else {
        const { data: contaData, error: contaError } = await supabase
          .from('contas_pagar')
          .insert([dataToSubmit])
          .select()
          .single();

        if (contaError) throw contaError;

        // Note: Automatic parcel generation will be implemented later
        // For now, parcels need to be created manually

        toast({
          title: 'Sucesso',
          description: 'Conta a pagar cadastrada com sucesso.',
        });
      }

      setIsDialogOpen(false);
      setEditingConta(null);
      resetForm();
      fetchContas();
    } catch (error) {
      console.error('Erro ao salvar conta a pagar:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível salvar a conta a pagar.',
        variant: 'destructive',
      });
    }
  };

  const handleEdit = (conta: ContaPagar) => {
    // Navegar para a página de detalhes onde pode editar
    const contaId = (conta as any).conta_id || conta.id;
    navigate(`/financeiro/conta/${contaId}`);
  };

  const handleDelete = async (conta: ContaPagar) => {
    const contaId = (conta as any).conta_id;
    if (!contaId) {
      toast({
        title: 'Erro',
        description: 'ID da conta não encontrado.',
        variant: 'destructive',
      });
      return;
    }

    if (!confirm('Tem certeza que deseja excluir esta conta a pagar e todas suas parcelas?')) return;

    try {
      const { error } = await supabase
        .from('contas_pagar')
        .delete()
        .eq('id', contaId);

      if (error) throw error;

      toast({
        title: 'Sucesso',
        description: 'Conta a pagar excluída com sucesso.',
      });
      fetchContas();
    } catch (error) {
      console.error('Erro ao excluir conta a pagar:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível excluir a conta a pagar.',
        variant: 'destructive',
      });
    }
  };

  const handleViewParcelas = (conta: ContaPagar) => {
    setSelectedConta(conta);
    fetchParcelas(conta.id);
    setIsParcelasDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      fornecedor_id: '',
      categoria_id: '',
      filial_id: '',
      descricao: '',
      numero_nota: '',
      chave_nfe: '',
      valor_total_centavos: '',
      num_parcelas: '1',
      referencia: '',
    });
  };

  const formatCurrency = (centavos: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(centavos / 100);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Em Aberto':
        return <Badge variant="destructive">Em Aberto</Badge>;
      case 'Parcialmente Pago':
        return <Badge variant="secondary">Parcialmente Pago</Badge>;
      case 'Pago':
        return <Badge variant="default">Pago</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const filteredContas = contas.filter(conta =>
    conta.descricao.toLowerCase().includes(searchTerm.toLowerCase()) ||
    conta.numero_nota?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    conta.pessoas_juridicas.nome_fantasia.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return <div>Carregando...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Contas a Pagar</h1>
          <p className="text-muted-foreground">
            Gerencie as contas a pagar e seus vencimentos
          </p>
        </div>
        <div className="flex space-x-2">

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => { resetForm(); setEditingConta(null); }}>
                <Plus className="mr-2 h-4 w-4" />
                Nova Conta
              </Button>
            </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingConta ? 'Editar Conta a Pagar' : 'Nova Conta a Pagar'}
              </DialogTitle>
              <DialogDescription>
                Preencha os dados da conta a pagar
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="fornecedor_id">Fornecedor</Label>
                  <Select value={formData.fornecedor_id} onValueChange={(value) => setFormData({ ...formData, fornecedor_id: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um fornecedor" />
                    </SelectTrigger>
                    <SelectContent>
                      {fornecedores.map((fornecedor) => (
                        <SelectItem key={fornecedor.id} value={fornecedor.id.toString()}>
                          {fornecedor.nome_fantasia}
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
                  <Label htmlFor="valor_total_centavos">Valor Total (R$)</Label>
                  <Input
                    id="valor_total_centavos"
                    type="number"
                    step="0.01"
                    value={formData.valor_total_centavos}
                    onChange={(e) => setFormData({ ...formData, valor_total_centavos: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="num_parcelas">Número de Parcelas</Label>
                  <Input
                    id="num_parcelas"
                    type="number"
                    min="1"
                    value={formData.num_parcelas}
                    onChange={(e) => setFormData({ ...formData, num_parcelas: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="numero_nota">Número da Nota</Label>
                  <Input
                    id="numero_nota"
                    value={formData.numero_nota}
                    onChange={(e) => setFormData({ ...formData, numero_nota: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="chave_nfe">Chave NFe</Label>
                  <Input
                    id="chave_nfe"
                    value={formData.chave_nfe}
                    onChange={(e) => setFormData({ ...formData, chave_nfe: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="referencia">Referência</Label>
                  <Input
                    id="referencia"
                    value={formData.referencia}
                    onChange={(e) => setFormData({ ...formData, referencia: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="descricao">Descrição</Label>
                <Textarea
                  id="descricao"
                  value={formData.descricao}
                  onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
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

      <Card>
        <CardHeader>
          <CardTitle>Lista de Contas a Pagar</CardTitle>
          <CardDescription>
            {contas.length} conta(s) em aberto
          </CardDescription>
          <div className="flex items-center space-x-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por descrição, nota ou fornecedor..."
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
                <TableHead>Descrição</TableHead>
                <TableHead>Fornecedor</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Valor Total</TableHead>
                <TableHead>Valor em Aberto</TableHead>
                <TableHead>Próximo Vencimento</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredContas.map((conta) => (
                <TableRow key={conta.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{conta.descricao}</div>
                      {conta.numero_nota && (
                        <div className="text-sm text-muted-foreground">
                          NF: {conta.numero_nota}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span
                      className="text-primary hover:underline cursor-pointer"
                      onClick={() => navigate(`/cadastros/pessoa-juridica/${(conta as any).contas_pagar?.fornecedor_id}`)}
                    >
                      {conta.pessoas_juridicas.nome_fantasia}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{conta.categorias_financeiras.nome}</Badge>
                  </TableCell>
                  <TableCell>{formatCurrency(conta.valor_total_centavos)}</TableCell>
                  <TableCell>{formatCurrency(conta.valor_em_aberto || 0)}</TableCell>
                  <TableCell>
                    {conta.proximo_vencimento && 
                      new Date(conta.proximo_vencimento).toLocaleDateString('pt-BR')
                    }
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(conta.status_pagamento || 'Em Aberto')}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewParcelas(conta)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
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
                        onClick={() => handleDelete(conta)}
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

      {/* Dialog para visualizar parcelas */}
      <Dialog open={isParcelasDialogOpen} onOpenChange={setIsParcelasDialogOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Parcelas - {selectedConta?.descricao}</DialogTitle>
            <DialogDescription>
              Visualize e gerencie as parcelas desta conta
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Parcela</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Vencimento</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Pago em</TableHead>
                  <TableHead>Valor Pago</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {parcelas.map((parcela) => (
                  <TableRow key={parcela.id}>
                    <TableCell>{parcela.parcela_num}</TableCell>
                    <TableCell>{formatCurrency(parcela.valor_parcela_centavos)}</TableCell>
                    <TableCell>
                      {new Date(parcela.vencimento).toLocaleDateString('pt-BR')}
                    </TableCell>
                    <TableCell>
                      <Badge variant={parcela.pago ? 'default' : 'destructive'}>
                        {parcela.pago ? 'Pago' : 'Em Aberto'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {parcela.pago_em && 
                        new Date(parcela.pago_em).toLocaleDateString('pt-BR')
                      }
                    </TableCell>
                    <TableCell>
                      {parcela.valor_pago_centavos && 
                        formatCurrency(parcela.valor_pago_centavos)
                      }
                    </TableCell>
                    <TableCell className="text-right">
                      {!parcela.pago && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            // Implementar função de pagamento
                            toast({
                              title: 'Funcionalidade em desenvolvimento',
                              description: 'A funcionalidade de pagamento será implementada em breve.',
                            });
                          }}
                        >
                          <CreditCard className="h-4 w-4" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
