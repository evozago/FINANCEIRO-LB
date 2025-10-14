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

    try {
      const dataGeracao = new Date();
      const result = await gerarContasRecorrentes(conta, dataGeracao);

      if (result?.status === 'gerada') {
        toast({
          title: 'Sucesso',
          description: `Conta "${conta.nome}" gerada com sucesso.`,
        });
      } else if (result?.status === 'existente') {
        toast({
          title: 'Aviso',
          description: `A conta "${conta.nome}" para este período já existe.`,
          variant: 'destructive',
        });
      }
      fetchContas(); // Atualiza a lista para refletir a última data de geração
    } catch (error) {
      // O erro já é tratado dentro de gerarContasRecorrentes

  };

  const gerarContasRecorrentes = async (conta: ContaRecorrente, dataGeracao: Date) => {
    try {
      const mesGeracao = dataGeracao.getMonth() + 1;
      const anoGeracao = dataGeracao.getFullYear();

      let datasParaGerar: Date[] = [];

      if (conta.tipo_frequencia === 'diaria') {
        datasParaGerar.push(dataGeracao);
      } else if (conta.tipo_frequencia === 'semanal' || conta.tipo_frequencia === 'quinzenal') {
        // Para semanal/quinzenal, gerar para os dias da semana selecionados
        const diaSemanaGeracao = dataGeracao.getDay(); // 0 = Domingo, 1 = Segunda
        const diasSelecionados = conta.dias_semana || [];

        if (diasSelecionados.includes(diaSemanaGeracao + 1)) { // +1 porque getDay() é 0-6 e dias_semana é 1-7
          datasParaGerar.push(dataGeracao);
        }
      } else if (conta.tipo_frequencia === 'mensal') {
        // Para mensal, gerar se o dia do vencimento for igual ao dia da geração
        if (dataGeracao.getDate() === conta.dia_vencimento) {
          datasParaGerar.push(dataGeracao);
        }
      }

      let contasGeradas = 0;
      let contasJaExistentes = 0;

      for (const dataAtual of datasParaGerar) {
        const mesConta = dataAtual.getMonth() + 1;
        const anoConta = dataAtual.getFullYear();
        const descricaoConta = `${conta.nome} - ${String(mesConta).padStart(2, '0')}/${anoConta}`;

        // Verificar se já existe uma conta a pagar com a mesma descrição para evitar duplicidade
        const { data: contaExistente } = await supabase
          .from('contas_pagar')
          .select('id')
          .eq('descricao', descricaoConta)
          .limit(1);

        if (contaExistente && contaExistente.length > 0) {
          contasJaExistentes++;
          continue; // Pula para a próxima data se já existe
        }

        // Criar conta a pagar
        const { data: novaConta, error: novaContaError } = await supabase
          .from('contas_pagar')
          .insert({
            fornecedor_id: conta.fornecedor_id,
            categoria_id: conta.categoria_id,
            filial_id: conta.filial_id,
            descricao: descricaoConta,
            numero_nota: conta.numero_nota,
            chave_nfe: conta.chave_nfe,
            valor_total_centavos: conta.valor_total_centavos,
            num_parcelas: conta.num_parcelas,
            referencia: conta.referencia,
            data_emissao: conta.data_emissao,
          })
          .select()
          .single();

        if (novaContaError) throw novaContaError;

        // Calcular valor de cada parcela
        const valorParcela = Math.floor(conta.valor_total_centavos / conta.num_parcelas);
        const valorRestante = conta.valor_total_centavos - (valorParcela * conta.num_parcelas);

        // Criar parcelas
        const parcelas = [];
        for (let i = 1; i <= conta.num_parcelas; i++) {
          const vencimento = new Date(dataAtual);
          // Ajustar vencimento para parcelas futuras se houver mais de uma
          if (conta.num_parcelas > 1) {
            vencimento.setMonth(vencimento.getMonth() + (i - 1));
          }

          parcelas.push({
            conta_id: novaConta.id,
            parcela_num: i,
            valor_parcela_centavos: i === conta.num_parcelas ? valorParcela + valorRestante : valorParcela,
            vencimento: vencimento.toISOString().split('T')[0],
            pago: false,
          });
        }

        const { error: parcelasError } = await supabase
          .from('contas_pagar_parcelas')
          .insert(parcelas);

        if (parcelasError) throw parcelasError;
        contasGeradas++;
      }

      // Atualizar ultimo_gerado_em da conta recorrente APENAS se alguma conta foi gerada
      if (contasGeradas > 0) {
        await supabase
          .from('recorrencias')
          .update({ ultimo_gerado_em: dataGeracao.toISOString().split('T')[0] })
          .eq('id', conta.id);
      }

      return { status: contasGeradas > 0 ? 'gerada' : 'nenhuma_gerada', contasGeradas, contasJaExistentes };

    } catch (error: any) {
      console.error('Erro ao gerar conta recorrente:', error);
      toast({
        title: 'Erro',
          description: `Erro ao gerar conta recorrente: ${error.message || 'Erro desconhecido'}`,
          variant: 'destructive',
        });
      } finally {
        setGenerating(false);
        fetchContas(); // Recarrega a lista para atualizar o ultimo_gerado_em
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
  };_nota: ";
      chave_nfe: ";
      num_parcelas: 1;
      referencia: ";
      data_emissao: ";
      codigo_boleto: ";
      tipo_frequencia: "mensal";
      intervalo_frequencia: 1;
      dias_semana: [] as number[];
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
                    <CurrencyInput
                      valor_total_centavos: 0;"
                      value={formData.valor_esperado_centavos}
                      onValueChange={(value) => setFormData({ ...formData, valor_esperado_centavos: value })}
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
                  <div className="col-span-2">
                    <Label htmlFor="numero_nota">Número da Nota</Label>
                    <Input
                      id="numero_nota"
                      value={formData.numero_nota}
                      onChange={(e) => setFormData({ ...formData, numero_nota: e.target.value })}
                      placeholder="Número da Nota Fiscal"
                    />
                  </div>
                  <div className="col-span-2">
                    <Label htmlFor="chave_nfe">Chave NFe</Label>
                    <Input
                      id="chave_nfe"
                      value={formData.chave_nfe}
                      onChange={(e) => setFormData({ ...formData, chave_nfe: e.target.value })}
                      placeholder="Chave da Nota Fiscal Eletrônica"
                    />
                  </div>
                  <div>
                    <Label htmlFor="num_parcelas">Número de Parcelas *</Label>
                    <Input
                      id="num_parcelas"
                      type="number"
                      value={formData.num_parcelas}
                      onChange={(e) => setFormData({ ...formData, num_parcelas: parseInt(e.target.value) || 1 })}
                      min={1}
                      required
                    />
                  </div>
                  <div className="col-span-2">
                    <Label htmlFor="referencia">Referência</Label>
                    <Input
                      id="referencia"
                      value={formData.referencia}
                      onChange={(e) => setFormData({ ...formData, referencia: e.target.value })}
                      placeholder="Referência da conta"
                    />
                  </div>
                  <div>
                    <Label htmlFor="data_emissao">Data de Emissão</Label>
                    <Input
                      id="data_emissao"
                      type="date"
                      value={formData.data_emissao}
                      onChange={(e) => setFormData({ ...formData, data_emissao: e.target.value })}
                    />
                  </div>
                  <div className="col-span-2">
                    <Label htmlFor="codigo_boleto">Código de Barras/Boleto</Label>
                    <Input
                      id="codigo_boleto"
                      value={formData.codigo_boleto}
                      onChange={(e) => setFormData({ ...formData, codigo_boleto: e.target.value })}
                      placeholder="Código de barras ou número do boleto"
                    />
                  </div>
                  <div className="col-span-2">
                    <Label htmlFor="tipo_frequencia">Tipo de Frequência *</Label>
                    <select
                      id="tipo_frequencia"
                      value={formData.tipo_frequencia}
                      onChange={(e) => setFormData({ ...formData, tipo_frequencia: e.target.value as "diaria" | "semanal" | "quinzenal" | "mensal" })}
                      className="w-full p-2 border border-gray-300 rounded-md"
                      required
                    >
                      <option value="diaria">Diária</option>
                      <option value="semanal">Semanal</option>
                      <option value="quinzenal">Quinzenal</option>
                      <option value="mensal">Mensal</option>
                    </select>
                  </div>
                  {formData.tipo_frequencia !== "diaria" && (
                    <div className="col-span-2">
                      <Label htmlFor="intervalo_frequencia">Intervalo da Frequência *</Label>
                      <Input
                        id="intervalo_frequencia"
                        type="number"
                        value={formData.intervalo_frequencia}
                        onChange={(e) => setFormData({ ...formData, intervalo_frequencia: parseInt(e.target.value) || 1 })}
                        min={1}
                        required
                      />
                    </div>
                  )}
                  {(formData.tipo_frequencia === "semanal" || formData.tipo_frequencia === "quinzenal") && (
                    <div className="col-span-2">
                      <Label>Dias da Semana</Label>
                      <div className="flex flex-wrap gap-2">
                        {[1, 2, 3, 4, 5, 6, 7].map((dia) => (
                          <div key={dia} className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              id={`dia_semana_${dia}`}
                              checked={formData.dias_semana.includes(dia)}
                              onChange={(e) => {
                                const newDias = e.target.checked
                                  ? [...formData.dias_semana, dia]
                                  : formData.dias_semana.filter((d) => d !== dia);
                                setFormData({ ...formData, dias_semana: newDias.sort() });
                              }}
                            />
                            <Label htmlFor={`dia_semana_${dia}`}>{["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"][dia - 1]}</Label>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
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
                  className="w-full p-2 border rounded"
                  required
                >
                  <option value="">Selecione...</option>
                  {filiais.map(filial => (
                    <option key={filial.id} value={filial.id}>{filial.nome}</option>
                  ))}
                </select>
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
                <Label htmlFor="chave_nfe">Chave NFE</Label>
                <Input
                  id="chave_nfe"
                  value={formData.chave_nfe}
                  onChange={(e) => setFormData({ ...formData, chave_nfe: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="num_parcelas">Número de Parcelas</Label>
                <Input
                  id="num_parcelas"
                  type="number"
                  value={formData.num_parcelas}
                  onChange={(e) => setFormData({ ...formData, num_parcelas: parseInt(e.target.value) })}
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
              <div>
                <Label htmlFor="data_emissao">Data de Emissão</Label>
                <Input
                  id="data_emissao"
                  type="date"
                  value={formData.data_emissao}
                  onChange={(e) => setFormData({ ...formData, data_emissao: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="codigo_boleto">Código do Boleto</Label>
                <Input
                  id="codigo_boleto"
                  value={formData.codigo_boleto}
                  onChange={(e) => setFormData({ ...formData, codigo_boleto: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="tipo_frequencia">Tipo de Frequência</Label>
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
              <div>
                <Label htmlFor="intervalo_frequencia">Intervalo da Frequência</Label>
                <Input
                  id="intervalo_frequencia"
                  type="number"
                  value={formData.intervalo_frequencia}
                  onChange={(e) => setFormData({ ...formData, intervalo_frequencia: parseInt(e.target.value) })}
                />
              </div>
              <div>
                <Label>Dias da Semana</Label>
                <div className="flex space-x-2">
                  {[ "Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb" ].map((dia, index) => (
                    <Button
                      key={dia}
                      variant={formData.dias_semana.includes(index + 1) ? "default" : "outline"}
                      onClick={() => {
                        const novosDias = [...formData.dias_semana];
                        if (novosDias.includes(index + 1)) {
                          const i = novosDias.indexOf(index + 1);
                          novosDias.splice(i, 1);
                        } else {
                          novosDias.push(index + 1);
                        }
                        setFormData({ ...formData, dias_semana: novosDias });
                      }}
                    >
                      {dia}
                    </Button>
                  ))}
                </div>
              </div>             {filial.nome}
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
                        onClick={() => handleGerarConta(conta)}
                        disabled={generating}
                      >
                        <DollarSign className="h-4 w-4" />
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
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleGerarConta(conta)}
                        title="Gerar Conta"
                      >
                        <RefreshCw className="h-4 w-4" />
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
