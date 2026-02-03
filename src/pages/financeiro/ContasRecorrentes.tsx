import { useState, useEffect } from 'react';
import { Plus, Search, Edit, Trash2, RefreshCw, Play, Pause, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CurrencyInput } from '@/components/ui/currency-input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { formatDateToISO } from '@/lib/date';
import { Tables } from '@/integrations/supabase/types';

type ContaRecorrente = Tables<'contas_recorrentes'>;
type Fornecedor = { id: number; nome_fantasia?: string; razao_social: string; };
type FornecedorPF = { id: number; nome: string; };
type Categoria = { id: number; nome: string; };
type Filial = { id: number; nome: string; };

export function ContasRecorrentes() {
  const [contas, setContas] = useState<ContaRecorrente[]>([]);
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [fornecedoresPF, setFornecedoresPF] = useState<FornecedorPF[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [filiais, setFiliais] = useState<Filial[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingConta, setEditingConta] = useState<ContaRecorrente | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    descricao: '',
    valor_centavos: 0,
    dia_vencimento: '1',
    fornecedor_id: '',
    pessoa_fisica_id: '',
    tipo_fornecedor: 'pj' as 'pj' | 'pf',
    categoria_id: '',
    filial_id: '',
    ativo: true
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    await Promise.all([
      fetchContas(),
      fetchFornecedores(),
      fetchFornecedoresPF(),
      fetchCategorias(),
      fetchFiliais()
    ]);
    setLoading(false);
  };

  const fetchContas = async () => {
    const { data, error } = await supabase
      .from('contas_recorrentes')
      .select('*')
      .order('descricao');

    if (error) {
      toast({ title: 'Erro', description: 'Não foi possível carregar contas recorrentes.', variant: 'destructive' });
      return;
    }
    setContas(data || []);
  };

  const fetchFornecedores = async () => {
    const { data } = await supabase
      .from('pessoas_juridicas')
      .select('id, nome_fantasia, razao_social')
      .order('razao_social');
    setFornecedores(data || []);
  };

  const fetchFornecedoresPF = async () => {
    const { data } = await supabase
      .from('pessoas_fisicas')
      .select('id, nome')
      .order('nome');
    setFornecedoresPF((data || []).map(p => ({ id: p.id, nome: p.nome || '' })));
  };

  const fetchCategorias = async () => {
    const { data } = await supabase
      .from('categorias_financeiras')
      .select('id, nome')
      .order('nome');
    setCategorias(data || []);
  };

  const fetchFiliais = async () => {
    const { data } = await supabase
      .from('filiais')
      .select('id, nome')
      .order('nome');
    setFiliais(data || []);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.descricao.trim()) {
      toast({ title: 'Erro', description: 'Descrição é obrigatória.', variant: 'destructive' });
      return;
    }

    const dataToSubmit = {
      descricao: formData.descricao.trim(),
      valor_centavos: formData.valor_centavos,
      dia_vencimento: parseInt(formData.dia_vencimento),
      fornecedor_id: formData.tipo_fornecedor === 'pj' && formData.fornecedor_id ? parseInt(formData.fornecedor_id) : null,
      pessoa_fisica_id: formData.tipo_fornecedor === 'pf' && formData.pessoa_fisica_id ? parseInt(formData.pessoa_fisica_id) : null,
      categoria_id: formData.categoria_id ? parseInt(formData.categoria_id) : null,
      filial_id: formData.filial_id ? parseInt(formData.filial_id) : null,
      ativo: formData.ativo
    };

    try {
      if (editingConta) {
        const { error } = await supabase
          .from('contas_recorrentes')
          .update(dataToSubmit)
          .eq('id', editingConta.id);
        if (error) throw error;
        toast({ title: 'Sucesso', description: 'Conta recorrente atualizada.' });
      } else {
        const { error } = await supabase
          .from('contas_recorrentes')
          .insert([dataToSubmit]);
        if (error) throw error;
        toast({ title: 'Sucesso', description: 'Conta recorrente criada.' });
      }
      setIsDialogOpen(false);
      setEditingConta(null);
      resetForm();
      fetchContas();
    } catch (error: any) {
      toast({ title: 'Erro ao salvar', description: error?.message || '', variant: 'destructive' });
    }
  };

  const resetForm = () => {
    setFormData({
      descricao: '',
      valor_centavos: 0,
      dia_vencimento: '1',
      fornecedor_id: '',
      pessoa_fisica_id: '',
      tipo_fornecedor: 'pj',
      categoria_id: '',
      filial_id: '',
      ativo: true
    });
  };

  const handleEdit = (conta: ContaRecorrente) => {
    setEditingConta(conta);
    setFormData({
      descricao: conta.descricao || '',
      valor_centavos: conta.valor_centavos || 0,
      dia_vencimento: (conta.dia_vencimento || 1).toString(),
      fornecedor_id: conta.fornecedor_id?.toString() || '',
      pessoa_fisica_id: conta.pessoa_fisica_id?.toString() || '',
      tipo_fornecedor: conta.pessoa_fisica_id ? 'pf' : 'pj',
      categoria_id: conta.categoria_id?.toString() || '',
      filial_id: conta.filial_id?.toString() || '',
      ativo: conta.ativo ?? true
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Excluir esta conta recorrente?')) return;
    const { error } = await supabase.from('contas_recorrentes').delete().eq('id', id);
    if (error) {
      toast({ title: 'Erro', description: 'Não foi possível excluir.', variant: 'destructive' });
      return;
    }
    toast({ title: 'Excluída', description: 'Conta recorrente excluída.' });
    fetchContas();
  };

  const handleDuplicar = async (conta: ContaRecorrente) => {
    if (!confirm('Duplicar esta conta recorrente?')) return;
    const { error } = await supabase.from('contas_recorrentes').insert({
      descricao: `${conta.descricao} (cópia)`,
      valor_centavos: conta.valor_centavos,
      dia_vencimento: conta.dia_vencimento,
      fornecedor_id: conta.fornecedor_id,
      pessoa_fisica_id: conta.pessoa_fisica_id,
      categoria_id: conta.categoria_id,
      filial_id: conta.filial_id,
      ativo: false
    });
    if (error) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Duplicada', description: 'Nova conta criada inativa.' });
    fetchContas();
  };

  const toggleAtivo = async (id: number, ativo: boolean) => {
    const { error } = await supabase.from('contas_recorrentes').update({ ativo: !ativo }).eq('id', id);
    if (error) {
      toast({ title: 'Erro', variant: 'destructive' });
      return;
    }
    toast({ title: ativo ? 'Desativada' : 'Ativada' });
    fetchContas();
  };

  const gerarContasMes = async () => {
    setGenerating(true);
    const hoje = new Date();
    const mes = hoje.getMonth() + 1;
    const ano = hoje.getFullYear();
    
    const ativas = contas.filter(c => c.ativo);
    let geradas = 0;

    for (const conta of ativas) {
      const descricaoMes = `${conta.descricao} - ${String(mes).padStart(2, '0')}/${ano}`;
      
      // Verificar se já existe
      const { data: existe } = await supabase
        .from('contas_pagar')
        .select('id')
        .eq('descricao', descricaoMes)
        .limit(1);

      if (existe && existe.length > 0) continue;

      const diaVenc = conta.dia_vencimento || 1;
      const dataVenc = new Date(ano, mes - 1, Math.min(diaVenc, new Date(ano, mes, 0).getDate()));

      const { data: novaConta, error: insertError } = await supabase
        .from('contas_pagar')
        .insert({
          descricao: descricaoMes,
          valor_total_centavos: conta.valor_centavos || 0,
          fornecedor_id: conta.fornecedor_id,
          pessoa_fisica_id: conta.pessoa_fisica_id,
          categoria_id: conta.categoria_id,
          filial_id: conta.filial_id,
          num_parcelas: 1,
          referencia: `REC-${conta.id}-${mes}${ano}`
        })
        .select('id')
        .single();

      if (insertError || !novaConta) continue;

      await supabase.from('contas_pagar_parcelas').insert({
        conta_id: novaConta.id,
        numero_parcela: 1,
        valor_centavos: conta.valor_centavos || 0,
        vencimento: formatDateToISO(dataVenc),
        pago: false
      });

      geradas++;
    }

    setGenerating(false);
    toast({ title: `${geradas} conta(s) gerada(s) para ${String(mes).padStart(2, '0')}/${ano}` });
  };

  const filteredContas = contas.filter(c => 
    c.descricao?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getNomeFornecedor = (conta: ContaRecorrente) => {
    if (conta.fornecedor_id) {
      const f = fornecedores.find(f => f.id === conta.fornecedor_id);
      return f?.nome_fantasia || f?.razao_social || '-';
    }
    if (conta.pessoa_fisica_id) {
      const p = fornecedoresPF.find(p => p.id === conta.pessoa_fisica_id);
      return p?.nome || '-';
    }
    return '-';
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <h1 className="text-3xl font-bold">Contas Recorrentes</h1>
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Contas Recorrentes</h1>
          <p className="text-muted-foreground">Gerencie suas despesas fixas mensais</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={gerarContasMes} disabled={generating} variant="outline">
            <RefreshCw className={`mr-2 h-4 w-4 ${generating ? 'animate-spin' : ''}`} />
            Gerar Mês Atual
          </Button>
          <Button onClick={() => { resetForm(); setEditingConta(null); setIsDialogOpen(true); }}>
            <Plus className="mr-2 h-4 w-4" /> Nova Recorrência
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lista de Contas Recorrentes</CardTitle>
          <CardDescription>
            <div className="flex items-center gap-4 mt-2">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Descrição</TableHead>
                <TableHead>Fornecedor</TableHead>
                <TableHead>Dia Venc.</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredContas.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    Nenhuma conta recorrente encontrada
                  </TableCell>
                </TableRow>
              ) : (
                filteredContas.map(conta => (
                  <TableRow key={conta.id}>
                    <TableCell className="font-medium">{conta.descricao}</TableCell>
                    <TableCell>{getNomeFornecedor(conta)}</TableCell>
                    <TableCell>Dia {conta.dia_vencimento || 1}</TableCell>
                    <TableCell className="text-right">
                      R$ {((conta.valor_centavos || 0) / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell>
                      <Badge variant={conta.ativo ? 'default' : 'secondary'}>
                        {conta.ativo ? 'Ativa' : 'Inativa'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button size="icon" variant="ghost" onClick={() => toggleAtivo(conta.id, conta.ativo ?? true)}>
                          {conta.ativo ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => handleDuplicar(conta)}>
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => handleEdit(conta)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => handleDelete(conta.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingConta ? 'Editar' : 'Nova'} Conta Recorrente</DialogTitle>
            <DialogDescription>Preencha os dados da conta que se repete mensalmente</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>Descrição *</Label>
              <Input
                value={formData.descricao}
                onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                placeholder="Ex: Aluguel, Internet, Energia..."
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Valor *</Label>
                <CurrencyInput
                  value={formData.valor_centavos}
                  onValueChange={(v) => setFormData({ ...formData, valor_centavos: v })}
                />
              </div>
              <div>
                <Label>Dia de Vencimento</Label>
                <Select value={formData.dia_vencimento} onValueChange={(v) => setFormData({ ...formData, dia_vencimento: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 31 }, (_, i) => (
                      <SelectItem key={i + 1} value={(i + 1).toString()}>Dia {i + 1}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Tipo Fornecedor</Label>
                <Select value={formData.tipo_fornecedor} onValueChange={(v: 'pj' | 'pf') => setFormData({ ...formData, tipo_fornecedor: v, fornecedor_id: '', pessoa_fisica_id: '' })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pj">Pessoa Jurídica</SelectItem>
                    <SelectItem value="pf">Pessoa Física</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Fornecedor</Label>
                {formData.tipo_fornecedor === 'pj' ? (
                  <Select value={formData.fornecedor_id} onValueChange={(v) => setFormData({ ...formData, fornecedor_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                    <SelectContent>
                      {fornecedores.map(f => (
                        <SelectItem key={f.id} value={f.id.toString()}>{f.nome_fantasia || f.razao_social}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Select value={formData.pessoa_fisica_id} onValueChange={(v) => setFormData({ ...formData, pessoa_fisica_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                    <SelectContent>
                      {fornecedoresPF.map(p => (
                        <SelectItem key={p.id} value={p.id.toString()}>{p.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Categoria</Label>
                <Select value={formData.categoria_id} onValueChange={(v) => setFormData({ ...formData, categoria_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    {categorias.map(c => (
                      <SelectItem key={c.id} value={c.id.toString()}>{c.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Filial</Label>
                <Select value={formData.filial_id} onValueChange={(v) => setFormData({ ...formData, filial_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    {filiais.map(f => (
                      <SelectItem key={f.id} value={f.id.toString()}>{f.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
              <Button type="submit">{editingConta ? 'Salvar' : 'Criar'}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
