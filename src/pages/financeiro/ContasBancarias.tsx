import { useState, useEffect } from 'react';
import { Plus, Search, Edit, Trash2, CreditCard, Eye, EyeOff } from 'lucide-react';
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
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ContaBancaria {
  id: number;
  nome: string;
  banco?: string;
  agencia?: string;
  conta?: string;
  tipo?: string;
  saldo_inicial_centavos?: number;
  ativo?: boolean;
  created_at: string;
}

const tiposConta = [
  { value: 'corrente', label: 'Conta Corrente' },
  { value: 'poupanca', label: 'Poupança' },
  { value: 'investimento', label: 'Investimento' },
  { value: 'cartao_credito', label: 'Cartão de Crédito' },
];

export function ContasBancarias() {
  const [contas, setContas] = useState<ContaBancaria[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingConta, setEditingConta] = useState<ContaBancaria | null>(null);
  const [loading, setLoading] = useState(true);
  const [showSaldos, setShowSaldos] = useState(false);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    nome: '',
    banco: '',
    agencia: '',
    conta: '',
    tipo: 'corrente',
    saldo_inicial_centavos: 0,
    ativo: true,
  });

  useEffect(() => {
    fetchContas();
  }, []);

  const fetchContas = async () => {
    try {
      const { data, error } = await supabase
        .from('contas_bancarias')
        .select('*')
        .order('nome');

      if (error) throw error;
      setContas((data || []) as ContaBancaria[]);
    } catch (error) {
      console.error('Erro ao buscar contas bancárias:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar as contas bancárias.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const dataToSubmit = {
        nome: formData.nome,
        banco: formData.banco || null,
        agencia: formData.agencia || null,
        conta: formData.conta || null,
        tipo: formData.tipo,
        saldo_inicial_centavos: formData.saldo_inicial_centavos,
        ativo: formData.ativo,
      };

      if (editingConta) {
        const { error } = await supabase
          .from('contas_bancarias')
          .update(dataToSubmit)
          .eq('id', editingConta.id);

        if (error) throw error;

        toast({
          title: 'Sucesso',
          description: 'Conta bancária atualizada com sucesso.',
        });
      } else {
        const { error } = await supabase
          .from('contas_bancarias')
          .insert([dataToSubmit]);

        if (error) throw error;

        toast({
          title: 'Sucesso',
          description: 'Conta bancária cadastrada com sucesso.',
        });
      }

      setIsDialogOpen(false);
      setEditingConta(null);
      resetForm();
      fetchContas();
    } catch (error) {
      console.error('Erro ao salvar conta bancária:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível salvar a conta bancária.',
        variant: 'destructive',
      });
    }
  };

  const handleEdit = (conta: ContaBancaria) => {
    setEditingConta(conta);
    setFormData({
      nome: conta.nome,
      banco: conta.banco || '',
      agencia: conta.agencia || '',
      conta: conta.conta || '',
      tipo: conta.tipo || 'corrente',
      saldo_inicial_centavos: conta.saldo_inicial_centavos || 0,
      ativo: conta.ativo ?? true,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Tem certeza que deseja excluir esta conta bancária?')) return;

    try {
      const { error } = await supabase
        .from('contas_bancarias')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Sucesso',
        description: 'Conta bancária excluída com sucesso.',
      });
      fetchContas();
    } catch (error) {
      console.error('Erro ao excluir conta bancária:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível excluir a conta bancária.',
        variant: 'destructive',
      });
    }
  };

  const resetForm = () => {
    setFormData({
      nome: '',
      banco: '',
      agencia: '',
      conta: '',
      tipo: 'corrente',
      saldo_inicial_centavos: 0,
      ativo: true,
    });
  };

  const formatCurrency = (centavos: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(centavos / 100);
  };

  const getTipoContaLabel = (tipo: string) => {
    return tiposConta.find(t => t.value === tipo)?.label || tipo;
  };

  const filteredContas = contas.filter(conta => {
    const searchLower = searchTerm.toLowerCase();
    const nomeStr = conta.nome?.toLowerCase() || '';
    const bancoStr = conta.banco?.toLowerCase() || '';
    const agenciaStr = conta.agencia?.toLowerCase() || '';
    const contaStr = conta.conta?.toLowerCase() || '';
    const statusStr = conta.ativo ? 'ativa' : 'inativa';
    
    return (
      nomeStr.includes(searchLower) ||
      bancoStr.includes(searchLower) ||
      agenciaStr.includes(searchLower) ||
      contaStr.includes(searchLower) ||
      statusStr.includes(searchLower)
    );
  });

  const totalSaldo = contas.reduce((sum, conta) => sum + (conta.saldo_inicial_centavos || 0), 0);

  if (loading) {
    return <div>Carregando...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Contas Bancárias</h1>
          <p className="text-muted-foreground">
            Gerencie as contas bancárias da empresa
          </p>
        </div>
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
                {editingConta ? 'Editar Conta Bancária' : 'Nova Conta Bancária'}
              </DialogTitle>
              <DialogDescription>
                Preencha as informações da conta bancária
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="nome">Nome da Conta *</Label>
                  <Input
                    id="nome"
                    value={formData.nome}
                    onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                    placeholder="Ex: Conta Principal"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="banco">Banco</Label>
                  <Input
                    id="banco"
                    value={formData.banco}
                    onChange={(e) => setFormData({ ...formData, banco: e.target.value })}
                    placeholder="Ex: Banco do Brasil, Itaú..."
                  />
                </div>
                <div>
                  <Label htmlFor="tipo">Tipo de Conta</Label>
                  <Select value={formData.tipo} onValueChange={(value) => setFormData({ ...formData, tipo: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {tiposConta.map((tipo) => (
                        <SelectItem key={tipo.value} value={tipo.value}>
                          {tipo.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="agencia">Agência</Label>
                  <Input
                    id="agencia"
                    value={formData.agencia}
                    onChange={(e) => setFormData({ ...formData, agencia: e.target.value })}
                    placeholder="Ex: 1234-5"
                  />
                </div>
                <div>
                  <Label htmlFor="conta">Conta</Label>
                  <Input
                    id="conta"
                    value={formData.conta}
                    onChange={(e) => setFormData({ ...formData, conta: e.target.value })}
                    placeholder="Ex: 12345-6"
                  />
                </div>
                <div>
                  <Label htmlFor="saldo_inicial_centavos">Saldo Inicial (R$)</Label>
                  <CurrencyInput
                    id="saldo_inicial_centavos"
                    value={formData.saldo_inicial_centavos}
                    onValueChange={(value) => setFormData({ ...formData, saldo_inicial_centavos: value })}
                    placeholder="0,00"
                  />
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="ativo"
                  checked={formData.ativo}
                  onCheckedChange={(checked) => setFormData({ ...formData, ativo: checked })}
                />
                <Label htmlFor="ativo">Conta ativa</Label>
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

      {/* Resumo Financeiro */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total em Contas</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {showSaldos ? formatCurrency(totalSaldo) : '••••••'}
            </div>
            <p className="text-xs text-muted-foreground">
              {contas.filter(c => c.ativo).length} contas ativas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Contas Cadastradas</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{contas.length}</div>
            <p className="text-xs text-muted-foreground">
              {contas.filter(c => !c.ativo).length} inativas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Controles</CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowSaldos(!showSaldos)}
            >
              {showSaldos ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
          </CardHeader>
          <CardContent>
            <div className="text-sm">
              {showSaldos ? 'Saldos visíveis' : 'Saldos ocultos'}
            </div>
            <p className="text-xs text-muted-foreground">
              Clique para {showSaldos ? 'ocultar' : 'mostrar'}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Buscar Contas</CardTitle>
          <CardDescription>
            Use o campo abaixo para filtrar as contas bancárias
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, banco, agência..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Contas Bancárias Cadastradas</CardTitle>
          <CardDescription>
            {filteredContas.length} conta(s) encontrada(s)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Banco</TableHead>
                <TableHead>Agência</TableHead>
                <TableHead>Conta</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Saldo Inicial</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredContas.map((conta) => (
                <TableRow key={conta.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center space-x-2">
                      <CreditCard className="h-4 w-4 text-muted-foreground" />
                      <span>{conta.nome}</span>
                    </div>
                  </TableCell>
                  <TableCell>{conta.banco || '-'}</TableCell>
                  <TableCell>{conta.agencia || '-'}</TableCell>
                  <TableCell>{conta.conta || '-'}</TableCell>
                  <TableCell>{getTipoContaLabel(conta.tipo || 'corrente')}</TableCell>
                  <TableCell>
                    {showSaldos ? formatCurrency(conta.saldo_inicial_centavos || 0) : '••••••'}
                  </TableCell>
                  <TableCell>
                    <Badge variant={conta.ativo ? 'default' : 'secondary'}>
                      {conta.ativo ? 'Ativa' : 'Inativa'}
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
