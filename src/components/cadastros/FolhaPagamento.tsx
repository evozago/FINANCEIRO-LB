import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, DollarSign, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { CurrencyInput } from '@/components/ui/currency-input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface FolhaLancamento {
  id: number;
  mes: number;
  ano: number;
  salario_centavos: number;
  adiantamento_centavos: number;
  vale_transporte_centavos: number;
  descontos_centavos: number;
  observacoes?: string;
  conta_pagar_id?: number;
  created_at: string;
}

interface FolhaPagamentoProps {
  pessoaFisicaId: number;
  pessoaNome: string;
}

export function FolhaPagamento({ pessoaFisicaId, pessoaNome }: FolhaPagamentoProps) {
  const [lancamentos, setLancamentos] = useState<FolhaLancamento[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingLancamento, setEditingLancamento] = useState<FolhaLancamento | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const currentDate = new Date();
  const [formData, setFormData] = useState({
    mes: (currentDate.getMonth() + 1).toString(),
    ano: currentDate.getFullYear().toString(),
    salario: '',
    adiantamento: '',
    vale_transporte: '',
    descontos: '',
    observacoes: '',
  });

  useEffect(() => {
    fetchLancamentos();
  }, [pessoaFisicaId]);

  const fetchLancamentos = async () => {
    try {
      const { data, error } = await supabase
        .from('folha_pagamento_lancamentos')
        .select('*')
        .eq('pessoa_fisica_id', pessoaFisicaId)
        .order('ano', { ascending: false })
        .order('mes', { ascending: false });

      if (error) throw error;
      setLancamentos(data || []);
    } catch (error) {
      console.error('Erro ao buscar lançamentos:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os lançamentos de folha.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const salarioCentavos = Math.round(parseFloat(formData.salario || '0') * 100);
    const adiantamentoCentavos = Math.round(parseFloat(formData.adiantamento || '0') * 100);
    const valeTransporteCentavos = Math.round(parseFloat(formData.vale_transporte || '0') * 100);
    const descontosCentavos = Math.round(parseFloat(formData.descontos || '0') * 100);

    if (salarioCentavos <= 0) {
      toast({
        title: 'Erro',
        description: 'Salário deve ser maior que zero.',
        variant: 'destructive',
      });
      return;
    }

    try {
      const dataToSubmit = {
        pessoa_fisica_id: pessoaFisicaId,
        mes: parseInt(formData.mes),
        ano: parseInt(formData.ano),
        salario_centavos: salarioCentavos,
        adiantamento_centavos: adiantamentoCentavos,
        vale_transporte_centavos: valeTransporteCentavos,
        descontos_centavos: descontosCentavos,
        observacoes: formData.observacoes || null,
      };

      if (editingLancamento) {
        const { error } = await supabase
          .from('folha_pagamento_lancamentos')
          .update(dataToSubmit)
          .eq('id', editingLancamento.id);

        if (error) throw error;

        toast({
          title: 'Sucesso',
          description: 'Lançamento atualizado com sucesso.',
        });
      } else {
        const { error } = await supabase
          .from('folha_pagamento_lancamentos')
          .insert([dataToSubmit]);

        if (error) throw error;

        toast({
          title: 'Sucesso',
          description: 'Lançamento criado com sucesso.',
        });
      }

      setIsDialogOpen(false);
      setEditingLancamento(null);
      resetForm();
      fetchLancamentos();
    } catch (error: any) {
      console.error('Erro ao salvar lançamento:', error);
      toast({
        title: 'Erro',
        description: error.message || 'Não foi possível salvar o lançamento.',
        variant: 'destructive',
      });
    }
  };

  const handleEdit = (lancamento: FolhaLancamento) => {
    setEditingLancamento(lancamento);
    setFormData({
      mes: lancamento.mes.toString(),
      ano: lancamento.ano.toString(),
      salario: (lancamento.salario_centavos / 100).toFixed(2),
      adiantamento: (lancamento.adiantamento_centavos / 100).toFixed(2),
      vale_transporte: (lancamento.vale_transporte_centavos / 100).toFixed(2),
      descontos: (lancamento.descontos_centavos / 100).toFixed(2),
      observacoes: lancamento.observacoes || '',
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Tem certeza que deseja excluir este lançamento?')) return;

    try {
      const { error } = await supabase
        .from('folha_pagamento_lancamentos')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Sucesso',
        description: 'Lançamento excluído com sucesso.',
      });
      fetchLancamentos();
    } catch (error) {
      console.error('Erro ao excluir lançamento:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível excluir o lançamento.',
        variant: 'destructive',
      });
    }
  };

  const resetForm = () => {
    const currentDate = new Date();
    setFormData({
      mes: (currentDate.getMonth() + 1).toString(),
      ano: currentDate.getFullYear().toString(),
      salario: '',
      adiantamento: '',
      vale_transporte: '',
      descontos: '',
      observacoes: '',
    });
  };

  const formatCurrency = (centavos: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(centavos / 100);
  };

  const getMesNome = (mes: number) => {
    const meses = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    return meses[mes - 1];
  };

  const calcularLiquido = (lancamento: FolhaLancamento) => {
    return lancamento.salario_centavos 
      - lancamento.adiantamento_centavos 
      - lancamento.vale_transporte_centavos 
      - lancamento.descontos_centavos;
  };

  const anos = Array.from({ length: 10 }, (_, i) => currentDate.getFullYear() - i);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Folha de Pagamento</CardTitle>
            <CardDescription>
              Lançamentos mensais de {pessoaNome}
            </CardDescription>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => { resetForm(); setEditingLancamento(null); }}>
                <Plus className="mr-2 h-4 w-4" />
                Novo Lançamento
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>
                  {editingLancamento ? 'Editar Lançamento' : 'Novo Lançamento'}
                </DialogTitle>
                <DialogDescription>
                  Preencha os dados da folha de pagamento
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="mes">Mês</Label>
                    <Select
                      value={formData.mes}
                      onValueChange={(value) => setFormData({ ...formData, mes: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o mês" />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 12 }, (_, i) => i + 1).map((mes) => (
                          <SelectItem key={mes} value={mes.toString()}>
                            {getMesNome(mes)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="ano">Ano</Label>
                    <Select
                      value={formData.ano}
                      onValueChange={(value) => setFormData({ ...formData, ano: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o ano" />
                      </SelectTrigger>
                      <SelectContent>
                        {anos.map((ano) => (
                          <SelectItem key={ano} value={ano.toString()}>
                            {ano}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="salario">Salário</Label>
                    <CurrencyInput
                      id="salario"
                      value={formData.salario}
                      onValueChange={(value) => setFormData({ ...formData, salario: String(value || '') })}
                      placeholder="R$ 0,00"
                    />
                  </div>
                  <div>
                    <Label htmlFor="adiantamento">Adiantamento</Label>
                    <CurrencyInput
                      id="adiantamento"
                      value={formData.adiantamento}
                      onValueChange={(value) => setFormData({ ...formData, adiantamento: String(value || '') })}
                      placeholder="R$ 0,00"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="vale_transporte">Vale Transporte</Label>
                    <CurrencyInput
                      id="vale_transporte"
                      value={formData.vale_transporte}
                      onValueChange={(value) => setFormData({ ...formData, vale_transporte: String(value || '') })}
                      placeholder="R$ 0,00"
                    />
                  </div>
                  <div>
                    <Label htmlFor="descontos">Outros Descontos</Label>
                    <CurrencyInput
                      id="descontos"
                      value={formData.descontos}
                      onValueChange={(value) => setFormData({ ...formData, descontos: String(value || '') })}
                      placeholder="R$ 0,00"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="observacoes">Observações</Label>
                  <Textarea
                    id="observacoes"
                    value={formData.observacoes}
                    onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                    placeholder="Observações adicionais..."
                    rows={3}
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsDialogOpen(false);
                      setEditingLancamento(null);
                      resetForm();
                    }}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit">
                    {editingLancamento ? 'Atualizar' : 'Criar'} Lançamento
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-center text-muted-foreground py-8">Carregando lançamentos...</p>
        ) : lancamentos.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">Nenhum lançamento cadastrado</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Período</TableHead>
                <TableHead className="text-right">Salário</TableHead>
                <TableHead className="text-right">Adiantamento</TableHead>
                <TableHead className="text-right">Vale Transp.</TableHead>
                <TableHead className="text-right">Descontos</TableHead>
                <TableHead className="text-right">Líquido</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-center">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lancamentos.map((lancamento) => (
                <TableRow key={lancamento.id}>
                  <TableCell className="font-medium">
                    {getMesNome(lancamento.mes)}/{lancamento.ano}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(lancamento.salario_centavos)}
                  </TableCell>
                  <TableCell className="text-right text-red-600">
                    {formatCurrency(lancamento.adiantamento_centavos)}
                  </TableCell>
                  <TableCell className="text-right text-red-600">
                    {formatCurrency(lancamento.vale_transporte_centavos)}
                  </TableCell>
                  <TableCell className="text-right text-red-600">
                    {formatCurrency(lancamento.descontos_centavos)}
                  </TableCell>
                  <TableCell className="text-right font-bold">
                    {formatCurrency(calcularLiquido(lancamento))}
                  </TableCell>
                  <TableCell>
                    {lancamento.conta_pagar_id ? (
                      <Badge>Conta Gerada</Badge>
                    ) : (
                      <Badge variant="outline">Não Gerada</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(lancamento)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(lancamento.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
