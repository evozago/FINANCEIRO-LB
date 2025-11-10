import { useState, useEffect } from 'react';
import { Plus, Search, Edit, Trash2, RefreshCw, Calendar, Play, Pause, DollarSign, Copy } from 'lucide-react';
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
import { calcularDiasUteisNoMes } from '@/lib/diasUteis';
import { NovoPJForm } from '@/components/financeiro/NovoPJForm';
import { NovoPFForm } from '@/components/financeiro/NovoPFForm';
import { formatDateToISO } from '@/lib/date';

// Helper para calcular dias úteis de forma assíncrona (compatível com o código existente)
async function calcularDiasUteisMes(mes: number, ano: number): Promise<number> {
  return calcularDiasUteisNoMes(ano, mes);
}

interface ContaRecorrente {
  id: number;
  nome: string;
  valor_total_centavos: number;
  valor_esperado_centavos?: number;
  dia_vencimento: number;
  fornecedor_id?: number;
  fornecedor_pf_id?: number;
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

interface FornecedorPF {
  id: number;
  nome_completo: string;
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
    nome: '',
    valor_total_centavos: 0,
    dia_vencimento: '1',
    fornecedor_id: '',
    fornecedor_pf_id: '',
    tipo_fornecedor: 'pj' as 'pj' | 'pf',
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
        fetchFornecedoresPF(),
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

  const fetchFornecedoresPF = async () => {
    try {
      const { data, error } = await supabase
        .from('pessoas_fisicas')
        .select('id, nome_completo')
        .order('nome_completo');

      if (error) throw error;
      setFornecedoresPF(data || []);
    } catch (error) {
      console.error('Erro ao buscar fornecedores PF:', error);
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

    if (!formData.valor_total_centavos || formData.valor_total_centavos <= 0) {
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
        dia_vencimento: parseInt(formData.dia_vencimento),
        fornecedor_id: formData.tipo_fornecedor === 'pj' && formData.fornecedor_id ? parseInt(formData.fornecedor_id) : null,
        fornecedor_pf_id: formData.tipo_fornecedor === 'pf' && formData.fornecedor_pf_id ? parseInt(formData.fornecedor_pf_id) : null,
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
      valor_total_centavos: conta.valor_total_centavos || conta.valor_esperado_centavos || 0,
      dia_vencimento: conta.dia_vencimento.toString(),
      fornecedor_id: conta.fornecedor_id?.toString() || '',
      fornecedor_pf_id: conta.fornecedor_pf_id?.toString() || '',
      tipo_fornecedor: conta.fornecedor_pf_id ? 'pf' : 'pj',
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

  const handleDuplicarRecorrencia = async (recorrenciaId: number) => {
    if (!confirm('Deseja duplicar esta recorrência?')) return;
    try {
      const { data: recorrenciaOriginal, error: fetchError } = await supabase
        .from('recorrencias')
        .select('*')
        .eq('id', recorrenciaId)
        .single();

      if (fetchError) throw fetchError;

      const { nome, valor_total_centavos, dia_vencimento, fornecedor_id, fornecedor_pf_id, 
              categoria_id, filial_id, ativa, livre, sem_data_final, dia_fechamento } = recorrenciaOriginal;

      const { error: insertError } = await supabase
        .from('recorrencias')
        .insert({
          nome: `${nome} (cópia)`,
          valor_total_centavos,
          dia_vencimento,
          fornecedor_id,
          fornecedor_pf_id,
          categoria_id,
          filial_id,
          ativa: false,
          livre,
          sem_data_final,
          dia_fechamento
        });

      if (insertError) throw insertError;

      toast({ title: 'Recorrência duplicada com sucesso!', description: 'A nova recorrência foi criada inativa.' });
      fetchContas();
    } catch (error: any) {
      toast({ title: 'Erro ao duplicar', description: error?.message || '', variant: 'destructive' });
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

      console.log('Gerando contas para:', { mesAtual, anoAtual });
      console.log('Total de contas recorrentes:', contas.length);

      // Buscar contas ativas (excluindo contas livres)
      const contasAtivas = contas.filter(conta => conta.ativa && !conta.livre);

      console.log('Contas ativas (não livres):', contasAtivas.length);
      console.log('Contas ativas:', contasAtivas.map(c => ({ nome: c.nome, ativa: c.ativa, livre: c.livre })));

      if (contasAtivas.length === 0) {
        toast({
          title: 'Informação',
          description: 'Nenhuma conta recorrente ativa encontrada.',
        });
        return;
      }

      // Buscar informações das categorias para verificar se calculam por dias úteis
      const { data: categoriasData } = await supabase
        .from('categorias_financeiras')
        .select('id, calcula_por_dias_uteis, valor_por_dia_centavos');

      const categoriasMap = new Map(
        (categoriasData || []).map(cat => [cat.id, cat])
      );

      let contasGeradas = 0;
      let contasJaExistentes = 0;

      for (const conta of contasAtivas) {
        const categoria = categoriasMap.get(conta.categoria_id);
        let valorConta = conta.valor_total_centavos || conta.valor_esperado_centavos || 0;

        // Se a categoria calcula por dias úteis, multiplicar valor/dia pelos dias úteis
        if (categoria?.calcula_por_dias_uteis && categoria?.valor_por_dia_centavos) {
          const diasUteis = await calcularDiasUteisMes(mesAtual, anoAtual);
          valorConta = categoria.valor_por_dia_centavos * diasUteis;
        }

        const descricaoConta = `${conta.nome} - ${String(mesAtual).padStart(2, '0')}/${anoAtual}`;
        
        // Verificar se já existe
        const { data: contaExistente } = await supabase
          .from('contas_pagar')
          .select('id')
          .eq('descricao', descricaoConta)
          .limit(1);

        if (!contaExistente || contaExistente.length === 0) {
          // Calcular data de vencimento - usar componentes locais para evitar problemas de timezone
          let dataVencimento;
          try {
            // Criar data local sem problemas de timezone
            const year = anoAtual;
            const month = mesAtual - 1;
            const day = conta.dia_vencimento;
            
            dataVencimento = new Date(year, month, day);
            
            // Se a data é inválida (ex: 31 de fevereiro), usar último dia do mês
            if (dataVencimento.getMonth() !== month) {
              dataVencimento = new Date(year, month + 1, 0); // Último dia do mês
            }
          } catch {
            dataVencimento = new Date(anoAtual, mesAtual, 0);
          }

          console.log(`Gerando conta: ${descricaoConta}, vencimento: ${formatDateToISO(dataVencimento)}`);
          
          // Criar conta a pagar
          const { data: novaConta, error: insertError } = await supabase
            .from('contas_pagar')
            .insert({
              descricao: descricaoConta,
              valor_total_centavos: valorConta,
              fornecedor_id: conta.fornecedor_id,
              fornecedor_pf_id: conta.fornecedor_pf_id,
              categoria_id: conta.categoria_id,
              filial_id: conta.filial_id,
              num_parcelas: 1,
              referencia: `REC-${conta.id}-${String(mesAtual).padStart(2, '0')}${anoAtual}`
            })
            .select('id')
            .single();

          if (insertError) {
            console.error('Erro ao inserir conta:', insertError);
          }

          if (!insertError && novaConta) {
            // Criar parcela usando formatDateToISO para evitar problemas de timezone
            const { error: parcelaError } = await supabase
              .from('contas_pagar_parcelas')
              .insert({
                conta_id: novaConta.id,
                parcela_num: 1,
                numero_parcela: 1,
                valor_parcela_centavos: valorConta,
                vencimento: formatDateToISO(dataVencimento),
                pago: false
              });

            if (parcelaError) {
              console.error('Erro ao inserir parcela:', parcelaError);
            } else {
              contasGeradas++;
            }
          }
        } else {
          console.log(`Conta já existe: ${descricaoConta}`);
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

  const gerarContaLivre = async (conta: ContaRecorrente) => {
    try {
      const hoje = new Date();
      const timestamp = Date.now();
      const descricaoConta = `${conta.nome} - ${hoje.toLocaleDateString('pt-BR')} ${new Date().toLocaleTimeString('pt-BR')}`;
      const valorConta = conta.valor_total_centavos || conta.valor_esperado_centavos || 0;
      
      // Calcular data de vencimento (hoje ou data configurada)
      const dataVencimento = hoje.toISOString().split('T')[0];
      
      // Criar conta a pagar
      const { data: novaConta, error: insertError } = await supabase
        .from('contas_pagar')
        .insert({
          descricao: descricaoConta,
          valor_total_centavos: valorConta,
          fornecedor_id: conta.fornecedor_id,
          fornecedor_pf_id: conta.fornecedor_pf_id,
          categoria_id: conta.categoria_id,
          filial_id: conta.filial_id,
          num_parcelas: 1,
          referencia: `LIVRE-${conta.id}-${timestamp}`
        })
        .select('id')
        .single();

      if (insertError) throw insertError;

      if (novaConta) {
        // Criar parcela
        await supabase
          .from('contas_pagar_parcelas')
          .insert({
            conta_id: novaConta.id,
            parcela_num: 1,
            valor_parcela_centavos: valorConta,
            vencimento: dataVencimento,
            pago: false
          });

        toast({
          title: 'Sucesso',
          description: 'Conta gerada com sucesso!',
        });
      }
    } catch (error) {
      console.error('Erro ao gerar conta livre:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao gerar conta.',
        variant: 'destructive',
      });
    }
  };

  const resetForm = () => {
    setFormData({
      nome: '',
      valor_total_centavos: 0,
      dia_vencimento: '1',
      fornecedor_id: '',
      fornecedor_pf_id: '',
      tipo_fornecedor: 'pj',
      categoria_id: '',
      filial_id: '',
      ativa: true,
      livre: false,
      sem_data_final: true,
      dia_fechamento: '',
    });
  };

  const handleNovoPJ = (newPJ: { id: number; razao_social: string; nome_fantasia?: string }) => {
    fetchFornecedores();
    setFormData({ ...formData, fornecedor_id: newPJ.id.toString(), tipo_fornecedor: 'pj' });
  };

  const handleNovoPF = (newPF: { id: number; nome_completo: string }) => {
    fetchFornecedoresPF();
    setFormData({ ...formData, fornecedor_pf_id: newPF.id.toString(), tipo_fornecedor: 'pf' });
  };

  const formatCurrency = (centavos: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(centavos / 100);
  };

  const getFornecedorNome = (conta: ContaRecorrente) => {
    if (conta.fornecedor_pf_id) {
      const fornecedorPF = fornecedoresPF.find(f => f.id === conta.fornecedor_pf_id);
      return fornecedorPF?.nome_completo || 'Não encontrado';
    }
    if (conta.fornecedor_id) {
      const fornecedor = fornecedores.find(f => f.id === conta.fornecedor_id);
      return fornecedor?.nome_fantasia || fornecedor?.razao_social || 'Não encontrado';
    }
    return 'Não definido';
  };

  const getCategoriaNome = (categoriaId: number) => {
    const categoria = categorias.find(c => c.id === categoriaId);
    return categoria?.nome || 'Não encontrada';
  };

  const getFilialNome = (filialId: number) => {
    const filial = filiais.find(f => f.id === filialId);
    return filial?.nome || 'Não encontrada';
  };

  const filteredContas = contas.filter(conta => {
    const searchLower = searchTerm.toLowerCase();
    const fornecedorNome = getFornecedorNome(conta).toLowerCase();
    const categoriaNome = getCategoriaNome(conta.categoria_id).toLowerCase();
    const filialNome = getFilialNome(conta.filial_id).toLowerCase();
    const valorStr = formatCurrency(conta.valor_total_centavos || conta.valor_esperado_centavos || 0).toLowerCase();
    const diaVencimento = conta.livre ? 'dia atual' : `dia ${conta.dia_vencimento}`;
    const status = conta.ativa ? 'ativa' : 'inativa';
    const tipo = conta.livre ? 'livre' : '';
    
    return (
      conta.nome.toLowerCase().includes(searchLower) ||
      fornecedorNome.includes(searchLower) ||
      categoriaNome.includes(searchLower) ||
      filialNome.includes(searchLower) ||
      valorStr.includes(searchLower) ||
      diaVencimento.toLowerCase().includes(searchLower) ||
      status.includes(searchLower) ||
      tipo.includes(searchLower)
    );
  });

  const contasAtivas = contas.filter(conta => conta.ativa).length;
  const contasInativas = contas.filter(conta => !conta.ativa).length;
  const contasLivres = contas.filter(conta => conta.livre && conta.ativa).length;
  const valorTotalMensal = contas
    .filter(conta => conta.ativa && !conta.livre)
    .reduce((sum, conta) => sum + (conta.valor_total_centavos || conta.valor_esperado_centavos || 0), 0);

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
                    <Label htmlFor="valor_total_centavos">Valor Esperado (R$) *</Label>
                    <CurrencyInput
                      id="valor_total_centavos"
                      value={formData.valor_total_centavos}
                      onValueChange={(value) => setFormData({ ...formData, valor_total_centavos: value })}
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
                  <div className="col-span-2">
                    <Label>Tipo de Fornecedor</Label>
                    <div className="flex gap-4 mt-2">
                      <label className="flex items-center gap-2">
                        <input
                          type="radio"
                          value="pj"
                          checked={formData.tipo_fornecedor === 'pj'}
                          onChange={(e) => setFormData({ 
                            ...formData, 
                            tipo_fornecedor: e.target.value as 'pj' | 'pf',
                            fornecedor_id: '',
                            fornecedor_pf_id: ''
                          })}
                        />
                        Pessoa Jurídica
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="radio"
                          value="pf"
                          checked={formData.tipo_fornecedor === 'pf'}
                          onChange={(e) => setFormData({ 
                            ...formData, 
                            tipo_fornecedor: e.target.value as 'pj' | 'pf',
                            fornecedor_id: '',
                            fornecedor_pf_id: ''
                          })}
                        />
                        Pessoa Física
                      </label>
                    </div>
                  </div>
                  
                  {formData.tipo_fornecedor === 'pj' ? (
                    <div className="col-span-2">
                      <Label htmlFor="fornecedor_id">Fornecedor PJ (Opcional)</Label>
                      <div className="flex gap-2">
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
                        <NovoPJForm onSuccess={handleNovoPJ} />
                      </div>
                    </div>
                  ) : (
                    <div className="col-span-2">
                      <Label htmlFor="fornecedor_pf_id">Fornecedor PF (Opcional)</Label>
                      <div className="flex gap-2">
                        <select 
                          id="fornecedor_pf_id"
                          value={formData.fornecedor_pf_id} 
                          onChange={(e) => setFormData({ ...formData, fornecedor_pf_id: e.target.value })}
                          className="w-full p-2 border border-gray-300 rounded-md"
                        >
                          <option value="">Nenhum fornecedor</option>
                          {fornecedoresPF.map((fornecedor) => (
                            <option key={fornecedor.id} value={fornecedor.id.toString()}>
                              {fornecedor.nome_completo}
                            </option>
                          ))}
                        </select>
                        <NovoPFForm onSuccess={handleNovoPF} />
                      </div>
                    </div>
                  )}
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
                    <Label htmlFor="livre">Conta Livre (pode ser gerada múltiplas vezes)</Label>
                  </div>
                  
                  {formData.livre && (
                    <div className="pl-6 text-sm text-muted-foreground">
                      Esta conta poderá ser gerada quantas vezes for necessário, com vencimento para o dia da geração
                    </div>
                  )}
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
            <CardTitle className="text-sm font-medium">Contas Livres</CardTitle>
            <RefreshCw className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{contasLivres}</div>
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
                  <TableCell className="font-medium">
                    {conta.nome}
                    {conta.livre && (
                      <Badge variant="outline" className="ml-2">Livre</Badge>
                    )}
                  </TableCell>
                  <TableCell>{getFornecedorNome(conta)}</TableCell>
                  <TableCell>{getCategoriaNome(conta.categoria_id)}</TableCell>
                  <TableCell>{getFilialNome(conta.filial_id)}</TableCell>
                  <TableCell>{formatCurrency(conta.valor_total_centavos || conta.valor_esperado_centavos || 0)}</TableCell>
                  <TableCell>
                    {conta.livre ? 'Dia atual' : `Dia ${conta.dia_vencimento}`}
                  </TableCell>
                  <TableCell>
                    <Badge variant={conta.ativa ? 'default' : 'secondary'}>
                      {conta.ativa ? 'Ativa' : 'Inativa'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      {conta.livre && conta.ativa && (
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => gerarContaLivre(conta)}
                          title="Gerar nova conta"
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      )}
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
                        title="Editar"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDuplicarRecorrencia(conta.id)}
                        title="Duplicar"
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(conta.id)}
                        title="Excluir"
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
