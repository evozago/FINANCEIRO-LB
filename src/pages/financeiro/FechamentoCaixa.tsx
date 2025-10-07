import { useState, useEffect } from 'react';
import { Calendar, DollarSign, TrendingUp, TrendingDown, Calculator, FileText, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { DatePicker } from '@/components/ui/date-picker';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { CurrencyInput } from '@/components/ui/currency-input';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface FechamentoCaixa {
  id: number;
  data_fechamento: string;
  filial_id?: number;
  vendas_dinheiro_centavos: number;
  vendas_cartao_centavos: number;
  vendas_pix_centavos: number;
  outras_entradas_centavos: number;
  total_entradas_centavos: number;
  pagamentos_fornecedores_centavos: number;
  outras_saidas_centavos: number;
  total_saidas_centavos: number;
  saldo_final_centavos: number;
  observacoes?: string;
  status: string;
  created_at: string;
  filiais?: {
    nome: string;
  };
}

interface Filial {
  id: number;
  nome: string;
}

const statusOptions = [
  { value: 'aberto', label: 'Aberto', color: 'bg-blue-500' },
  { value: 'fechado', label: 'Fechado', color: 'bg-green-500' },
  { value: 'revisao', label: 'Em Revisão', color: 'bg-yellow-500' },
];

export function FechamentoCaixa() {
  const [fechamentos, setFechamentos] = useState<FechamentoCaixa[]>([]);
  const [filiais, setFiliais] = useState<Filial[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedFilial, setSelectedFilial] = useState<string>('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingFechamento, setEditingFechamento] = useState<FechamentoCaixa | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    data_fechamento: new Date(),
    filial_id: '',
    vendas_dinheiro_centavos: 0,
    vendas_cartao_centavos: 0,
    vendas_pix_centavos: 0,
    outras_entradas_centavos: 0,
    pagamentos_fornecedores_centavos: 0,
    outras_saidas_centavos: 0,
    observacoes: '',
    status: 'aberto',
  });

  useEffect(() => {
    fetchFechamentos();
    fetchFiliais();
  }, [selectedDate, selectedFilial]);

  const fetchFechamentos = async () => {
    try {
      let query = supabase
        .from('fechamento_caixa')
        .select(`
          *,
          filiais(nome)
        `)
        .order('data_fechamento', { ascending: false });

      // Filtrar por data (mês/ano)
      const startOfMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
      const endOfMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0);
      
      query = query
        .gte('data_fechamento', startOfMonth.toISOString().split('T')[0])
        .lte('data_fechamento', endOfMonth.toISOString().split('T')[0]);

      // Filtrar por filial se selecionada
      if (selectedFilial !== 'all') {
        query = query.eq('filial_id', parseInt(selectedFilial));
      }

      const { data, error } = await query;

      if (error) throw error;
      setFechamentos((data || []) as any);
    } catch (error) {
      console.error('Erro ao buscar fechamentos:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os fechamentos.',
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const vendasDinheiro = formData.vendas_dinheiro_centavos;
      const vendasCartao = formData.vendas_cartao_centavos;
      const vendasPix = formData.vendas_pix_centavos;
      const outrasEntradas = formData.outras_entradas_centavos;
      const pagamentosFornecedores = formData.pagamentos_fornecedores_centavos;
      const outrasSaidas = formData.outras_saidas_centavos;

      const totalEntradas = vendasDinheiro + vendasCartao + vendasPix + outrasEntradas;
      const totalSaidas = pagamentosFornecedores + outrasSaidas;
      const saldoFinal = totalEntradas - totalSaidas;

      const dataToSubmit = {
        data_fechamento: formData.data_fechamento.toISOString().split('T')[0],
        filial_id: formData.filial_id ? parseInt(formData.filial_id) : null,
        vendas_dinheiro_centavos: vendasDinheiro,
        vendas_cartao_centavos: vendasCartao,
        vendas_pix_centavos: vendasPix,
        outras_entradas_centavos: outrasEntradas,
        total_entradas_centavos: totalEntradas,
        pagamentos_fornecedores_centavos: pagamentosFornecedores,
        outras_saidas_centavos: outrasSaidas,
        total_saidas_centavos: totalSaidas,
        saldo_final_centavos: saldoFinal,
        observacoes: formData.observacoes || null,
        status: formData.status,
      };

      if (editingFechamento) {
        const { error } = await supabase
          .from('fechamento_caixa')
          .update(dataToSubmit)
          .eq('id', editingFechamento.id);

        if (error) throw error;

        toast({
          title: 'Sucesso',
          description: 'Fechamento atualizado com sucesso.',
        });
      } else {
        const { error } = await supabase
          .from('fechamento_caixa')
          .insert([dataToSubmit]);

        if (error) throw error;

        toast({
          title: 'Sucesso',
          description: 'Fechamento cadastrado com sucesso.',
        });
      }

      setIsDialogOpen(false);
      setEditingFechamento(null);
      resetForm();
      fetchFechamentos();
    } catch (error) {
      console.error('Erro ao salvar fechamento:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível salvar o fechamento.',
        variant: 'destructive',
      });
    }
  };

  const handleEdit = (fechamento: FechamentoCaixa) => {
    setEditingFechamento(fechamento);
    setFormData({
      data_fechamento: new Date(fechamento.data_fechamento),
      filial_id: fechamento.filial_id?.toString() || '',
      vendas_dinheiro_centavos: fechamento.vendas_dinheiro_centavos,
      vendas_cartao_centavos: fechamento.vendas_cartao_centavos,
      vendas_pix_centavos: fechamento.vendas_pix_centavos,
      outras_entradas_centavos: fechamento.outras_entradas_centavos,
      pagamentos_fornecedores_centavos: fechamento.pagamentos_fornecedores_centavos,
      outras_saidas_centavos: fechamento.outras_saidas_centavos,
      observacoes: fechamento.observacoes || '',
      status: fechamento.status,
    });
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      data_fechamento: new Date(),
      filial_id: '',
      vendas_dinheiro_centavos: 0,
      vendas_cartao_centavos: 0,
      vendas_pix_centavos: 0,
      outras_entradas_centavos: 0,
      pagamentos_fornecedores_centavos: 0,
      outras_saidas_centavos: 0,
      observacoes: '',
      status: 'aberto',
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

  const calculateTotals = () => {
    const totalEntradas = fechamentos.reduce((sum, f) => sum + f.total_entradas_centavos, 0);
    const totalSaidas = fechamentos.reduce((sum, f) => sum + f.total_saidas_centavos, 0);
    const saldoLiquido = totalEntradas - totalSaidas;

    return { totalEntradas, totalSaidas, saldoLiquido };
  };

  const exportToCSV = () => {
    if (fechamentos.length === 0) {
      toast({
        title: 'Aviso',
        description: 'Não há dados para exportar.',
        variant: 'destructive',
      });
      return;
    }

    const headers = [
      'Data',
      'Filial',
      'Vendas Dinheiro',
      'Vendas Cartão',
      'Vendas PIX',
      'Outras Entradas',
      'Total Entradas',
      'Pagamentos Fornecedores',
      'Outras Saídas',
      'Total Saídas',
      'Saldo Final',
      'Status'
    ].join(',');

    const rows = fechamentos.map(f => [
      new Date(f.data_fechamento).toLocaleDateString('pt-BR'),
      f.filiais?.nome || 'Não informado',
      (f.vendas_dinheiro_centavos / 100).toFixed(2),
      (f.vendas_cartao_centavos / 100).toFixed(2),
      (f.vendas_pix_centavos / 100).toFixed(2),
      (f.outras_entradas_centavos / 100).toFixed(2),
      (f.total_entradas_centavos / 100).toFixed(2),
      (f.pagamentos_fornecedores_centavos / 100).toFixed(2),
      (f.outras_saidas_centavos / 100).toFixed(2),
      (f.total_saidas_centavos / 100).toFixed(2),
      (f.saldo_final_centavos / 100).toFixed(2),
      f.status
    ].join(','));

    const csv = [headers, ...rows].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fechamento_caixa_${selectedDate.getFullYear()}_${(selectedDate.getMonth() + 1).toString().padStart(2, '0')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const totals = calculateTotals();

  if (loading) {
    return <div>Carregando...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Fechamento de Caixa</h1>
          <p className="text-muted-foreground">
            Controle diário de entradas e saídas
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => { resetForm(); setEditingFechamento(null); }}>
              <Calculator className="mr-2 h-4 w-4" />
              Novo Fechamento
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingFechamento ? 'Editar Fechamento' : 'Novo Fechamento'}
              </DialogTitle>
              <DialogDescription>
                Registre as movimentações do caixa
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="data_fechamento">Data *</Label>
                  <DatePicker
                    date={formData.data_fechamento}
                    onSelect={(date) => setFormData({ ...formData, data_fechamento: date || new Date() })}
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
              </div>

              <div>
                <h3 className="text-lg font-medium mb-2">Entradas</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="vendas_dinheiro_centavos">Vendas Dinheiro (R$)</Label>
                    <CurrencyInput
                      id="vendas_dinheiro_centavos"
                      value={formData.vendas_dinheiro_centavos}
                      onValueChange={(value) => setFormData({ ...formData, vendas_dinheiro_centavos: value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="vendas_cartao_centavos">Vendas Cartão (R$)</Label>
                    <CurrencyInput
                      id="vendas_cartao_centavos"
                      value={formData.vendas_cartao_centavos}
                      onValueChange={(value) => setFormData({ ...formData, vendas_cartao_centavos: value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="vendas_pix_centavos">Vendas PIX (R$)</Label>
                    <CurrencyInput
                      id="vendas_pix_centavos"
                      value={formData.vendas_pix_centavos}
                      onValueChange={(value) => setFormData({ ...formData, vendas_pix_centavos: value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="outras_entradas_centavos">Outras Entradas (R$)</Label>
                    <CurrencyInput
                      id="outras_entradas_centavos"
                      value={formData.outras_entradas_centavos}
                      onValueChange={(value) => setFormData({ ...formData, outras_entradas_centavos: value })}
                    />
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-medium mb-2">Saídas</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="pagamentos_fornecedores_centavos">Pagamentos Fornecedores (R$)</Label>
                    <CurrencyInput
                      id="pagamentos_fornecedores_centavos"
                      value={formData.pagamentos_fornecedores_centavos}
                      onValueChange={(value) => setFormData({ ...formData, pagamentos_fornecedores_centavos: value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="outras_saidas_centavos">Outras Saídas (R$)</Label>
                    <CurrencyInput
                      id="outras_saidas_centavos"
                      value={formData.outras_saidas_centavos}
                      onValueChange={(value) => setFormData({ ...formData, outras_saidas_centavos: value })}
                    />
                  </div>
                </div>
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
                  {editingFechamento ? 'Atualizar' : 'Cadastrar'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Calendar className="h-5 w-5" />
            <span>Filtros</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-4">
            <div>
              <label className="text-sm font-medium">Mês/Ano</label>
              <DatePicker
                date={selectedDate}
                onSelect={(date) => setSelectedDate(date || new Date())}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Filial</label>
              <Select value={selectedFilial} onValueChange={setSelectedFilial}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as filiais</SelectItem>
                  {filiais.map((filial) => (
                    <SelectItem key={filial.id} value={filial.id.toString()}>
                      {filial.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button variant="outline" onClick={exportToCSV}>
              <Download className="h-4 w-4 mr-2" />
              Exportar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Resumo */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Entradas</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(totals.totalEntradas)}
            </div>
            <p className="text-xs text-muted-foreground">
              {fechamentos.length} fechamento(s)
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Saídas</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {formatCurrency(totals.totalSaidas)}
            </div>
            <p className="text-xs text-muted-foreground">
              Pagamentos e despesas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Saldo Líquido</CardTitle>
            <DollarSign className={`h-4 w-4 ${totals.saldoLiquido >= 0 ? 'text-green-600' : 'text-red-600'}`} />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${totals.saldoLiquido >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(totals.saldoLiquido)}
            </div>
            <p className="text-xs text-muted-foreground">
              Resultado do período
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabela de Fechamentos */}
      <Card>
        <CardHeader>
          <CardTitle>Fechamentos de Caixa</CardTitle>
          <CardDescription>
            {fechamentos.length} fechamento(s) encontrado(s)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Filial</TableHead>
                <TableHead>Entradas</TableHead>
                <TableHead>Saídas</TableHead>
                <TableHead>Saldo</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {fechamentos.map((fechamento) => (
                <TableRow key={fechamento.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center space-x-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <span>{new Date(fechamento.data_fechamento).toLocaleDateString('pt-BR')}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {fechamento.filiais?.nome || 'Não informado'}
                  </TableCell>
                  <TableCell>
                    <span className="text-green-600 font-medium">
                      {formatCurrency(fechamento.total_entradas_centavos)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="text-red-600 font-medium">
                      {formatCurrency(fechamento.total_saidas_centavos)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className={`font-medium ${fechamento.saldo_final_centavos >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(fechamento.saldo_final_centavos)}
                    </span>
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(fechamento.status)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(fechamento)}
                    >
                      Editar
                    </Button>
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
