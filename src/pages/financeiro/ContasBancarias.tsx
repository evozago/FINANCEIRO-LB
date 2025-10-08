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
  banco: string;
  agencia?: string;
  numero_conta?: string;
  nome_conta: string;
  saldo_atual_centavos: number;
  ativa: boolean;
  pj_id: number | null;
  pf_id?: number | null;
  created_at: string;
  updated_at: string;
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

  const [pessoasJuridicas, setPessoasJuridicas] = useState<{ id: number; razao_social: string }[]>([]);
  const [pessoasFisicas, setPessoasFisicas] = useState<{ id: number; nome_completo: string }[]>([]);
  const [formData, setFormData] = useState({
    banco: '',
    agencia: '',
    conta: '',
    tipo_conta: 'corrente',
    saldo_atual_centavos: 0,
    limite_credito_centavos: '',
    ativa: true,
    observacoes: '',
    pj_id: '', // Adicionado para selecionar a Pessoa Jurídica
    pf_id: '', // Adicionado para selecionar a Pessoa Física
  });

  useEffect(() => {
    fetchContas();
    fetchPessoasJuridicas();
    fetchPessoasFisicas();
  }, []);

  const fetchPessoasJuridicas = async () => {
    try {
      const { data, error } = await supabase
        .from("pessoas_juridicas")
        .select("id, razao_social")
        .order("razao_social");
      if (error) throw error;
      setPessoasJuridicas(data || []);
    } catch (error) {
      console.error("Erro ao buscar Pessoas Jurídicas:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as Pessoas Jurídicas.",
        variant: "destructive",
      });
    }
  };

  const fetchPessoasFisicas = async () => {
    try {
      const { data, error } = await supabase
        .from("pessoas_fisicas")
        .select("id, nome_completo")
        .order("nome_completo");
      if (error) throw error;
      setPessoasFisicas(data || []);
    } catch (error) {
      console.error("Erro ao buscar Pessoas Físicas:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as Pessoas Físicas.",
        variant: "destructive",
      });
    }
  };

  const fetchContas = async () => {
    try {
      const { data, error } = await supabase
        .from('contas_bancarias')
        .select('*')
        .order('banco');

      if (error) throw error;
      setContas(data || []);
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
        nome_conta: formData.banco + ' - ' + formData.agencia + ' - ' + formData.conta,
        banco: formData.banco,
        agencia: formData.agencia,
        numero_conta: formData.conta,
        saldo_atual_centavos: formData.saldo_atual_centavos,
        ativa: formData.ativa,
        pj_id: formData.pj_id ? parseInt(formData.pj_id) : null,
        pf_id: formData.pf_id ? parseInt(formData.pf_id) : null,
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
      banco: conta.banco,
      agencia: conta.agencia || '',
      conta: conta.numero_conta || '',
      tipo_conta: 'corrente', // Default since tipo_conta doesn't exist in DB
      saldo_atual_centavos: conta.saldo_atual_centavos,
      limite_credito_centavos: '', // This field doesn't exist in DB
      ativa: conta.ativa,
      observacoes: '', // This field doesn't exist in DB
      pj_id: conta.pj_id ? String(conta.pj_id) : '',
      pf_id: conta.pf_id ? String(conta.pf_id) : '',
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
      banco: '',
      agencia: '',
      conta: '',
      tipo_conta: 'corrente',
      saldo_atual_centavos: 0,
      limite_credito_centavos: '',
      ativa: true,
      observacoes: '',
      pj_id: '',
      pf_id: '',
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

  const filteredContas = contas.filter(conta =>
    conta.banco.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (conta.agencia && conta.agencia.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (conta.numero_conta && conta.numero_conta.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const totalSaldo = contas.reduce((sum, conta) => sum + conta.saldo_atual_centavos, 0);

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
                  <Label htmlFor="banco">Banco *</Label>
                  <Input
                    id="banco"
                    value={formData.banco}
                    onChange={(e) => setFormData({ ...formData, banco: e.target.value })}
                    placeholder="Ex: Banco do Brasil, Itaú..."
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="tipo_conta">Tipo de Conta *</Label>
                  <Select value={formData.tipo_conta} onValueChange={(value) => setFormData({ ...formData, tipo_conta: value })}>
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
                  <Label htmlFor="agencia">Agência *</Label>
                  <Input
                    id="agencia"
                    value={formData.agencia}
                    onChange={(e) => setFormData({ ...formData, agencia: e.target.value })}
                    placeholder="Ex: 1234-5"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="conta">Conta *</Label>
                  <Input
                    id="conta"
                    value={formData.conta}
                    onChange={(e) => setFormData({ ...formData, conta: e.target.value })}
                    placeholder="Ex: 12345-6"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="pj_id">Pessoa Jurídica</Label>
                  <select
                    id="pj_id"
                    value={formData.pj_id}
                    onChange={(e) => setFormData({ ...formData, pj_id: e.target.value, pf_id: '' })}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="">Nenhuma</option>
                    {pessoasJuridicas.map((pj) => (
                      <option key={pj.id} value={String(pj.id)}>
                        {pj.razao_social}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label htmlFor="pf_id">Pessoa Física</Label>
                  <select
                    id="pf_id"
                    value={formData.pf_id}
                    onChange={(e) => setFormData({ ...formData, pf_id: e.target.value, pj_id: '' })}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="">Nenhuma</option>
                    {pessoasFisicas.map((pf) => (
                      <option key={pf.id} value={String(pf.id)}>
                        {pf.nome_completo}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label htmlFor="saldo_atual_centavos">Saldo Atual (R$)</Label>
                  <CurrencyInput
                    id="saldo_atual_centavos"
                    value={formData.saldo_atual_centavos}
                    onValueChange={(value) => setFormData({ ...formData, saldo_atual_centavos: value })}
                    placeholder="0,00"
                  />
                </div>
                <div>
                  <Label htmlFor="limite_credito_centavos">Limite de Crédito (R$)</Label>
                  <Input
                    id="limite_credito_centavos"
                    type="number"
                    step="0.01"
                    value={formData.limite_credito_centavos}
                    onChange={(e) => setFormData({ ...formData, limite_credito_centavos: e.target.value })}
                    placeholder="0,00"
                  />
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
                  placeholder="Observações sobre a conta..."
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
              {contas.filter(c => c.ativa).length} contas ativas
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
              {contas.filter(c => !c.ativa).length} inativas
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
              Clique no ícone para alternar
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
              placeholder="Buscar por banco, agência ou conta..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Contas Bancárias</CardTitle>
          <CardDescription>
            {filteredContas.length} conta(s) encontrada(s)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Banco</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Agência/Conta</TableHead>
                <TableHead>Saldo</TableHead>
                <TableHead>Limite</TableHead>
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
                      <span>{conta.banco}</span>
                    </div>
                  </TableCell>
                  <TableCell>Conta Corrente</TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">Ag: {conta.agencia || 'N/A'}</div>
                      <div className="text-sm text-muted-foreground">Cc: {conta.numero_conta || 'N/A'}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className={conta.saldo_atual_centavos < 0 ? 'text-red-600' : 'text-green-600'}>
                      {showSaldos ? formatCurrency(conta.saldo_atual_centavos) : '••••••'}
                    </span>
                  </TableCell>
                  <TableCell>
                    N/A
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
