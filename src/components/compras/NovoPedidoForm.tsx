import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CurrencyInput } from '@/components/ui/currency-input';
import { Textarea } from '@/components/ui/textarea';
import { DatePicker } from '@/components/ui/date-picker';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { NovoPJForm } from '@/components/financeiro/NovoPJForm';

interface PessoaJuridica {
  id: number;
  nome_fantasia: string | null;
  razao_social: string;
}

interface Marca {
  id: number;
  nome: string;
}

interface FormaPagamento {
  id: number;
  nome: string;
}

interface Filial {
  id: number;
  nome: string;
}

interface PedidoFormData {
  numero_pedido: string;
  data_pedido: Date;
  data_entrega?: Date;
  status: string;
  valor_total_centavos: number;
  desconto_centavos: number;
  forma_pagamento_id: string;
  negociacao: string;
  condicoes_pagamento: string;
  observacoes: string;
  fornecedor_id: string;
  filial_id: string;
  marcas_ids: number[];
}

interface NovoPedidoFormProps {
  editingPedido?: any | null;
  onSuccess: () => void;
  onCancel: () => void;
}

const statusOptions = [
  { value: 'pendente', label: 'Pendente' },
  { value: 'confirmado', label: 'Confirmado' },
  { value: 'entregue', label: 'Entregue' },
  { value: 'cancelado', label: 'Cancelado' },
];

export function NovoPedidoForm({ editingPedido, onSuccess, onCancel }: NovoPedidoFormProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [fornecedores, setFornecedores] = useState<PessoaJuridica[]>([]);
  const [marcas, setMarcas] = useState<Marca[]>([]);
  const [formasPagamento, setFormasPagamento] = useState<FormaPagamento[]>([]);
  const [filiais, setFiliais] = useState<Filial[]>([]);

  const [formData, setFormData] = useState<PedidoFormData>({
    numero_pedido: '',
    data_pedido: new Date(),
    data_entrega: undefined,
    status: 'pendente',
    valor_total_centavos: 0,
    desconto_centavos: 0,
    forma_pagamento_id: '',
    negociacao: '',
    condicoes_pagamento: '',
    observacoes: '',
    fornecedor_id: '',
    filial_id: '',
    marcas_ids: [],
  });

  useEffect(() => {
    fetchFornecedores();
    fetchMarcas();
    fetchFormasPagamento();
    fetchFiliais();
  }, []);

  useEffect(() => {
    if (editingPedido) {
      loadPedidoData();
    }
  }, [editingPedido]);

  const loadPedidoData = async () => {
    if (!editingPedido) return;

    // Load marcas do pedido
    const { data: marcasPedido } = await supabase
      .from('compras_pedido_marcas')
      .select('marca_id')
      .eq('pedido_id', editingPedido.id);

    setFormData({
      numero_pedido: editingPedido.numero_pedido || '',
      data_pedido: new Date(editingPedido.data_pedido),
      data_entrega: editingPedido.data_entrega ? new Date(editingPedido.data_entrega) : undefined,
      status: editingPedido.status || 'pendente',
      valor_total_centavos: editingPedido.valor_total_centavos || 0,
      desconto_centavos: editingPedido.desconto_centavos || 0,
      forma_pagamento_id: editingPedido.forma_pagamento_id?.toString() || '',
      negociacao: editingPedido.negociacao || '',
      condicoes_pagamento: editingPedido.condicoes_pagamento || '',
      observacoes: editingPedido.observacoes || '',
      fornecedor_id: editingPedido.fornecedor_id?.toString() || '',
      filial_id: editingPedido.filial_id?.toString() || '',
      marcas_ids: marcasPedido?.map(m => m.marca_id) || [],
    });
  };

  const fetchFornecedores = async () => {
    const { data } = await supabase
      .from('pessoas_juridicas')
      .select('id, nome_fantasia, razao_social')
      .eq('ativo', true)
      .order('nome_fantasia');
    setFornecedores(data || []);
  };

  const fetchMarcas = async () => {
    const { data } = await supabase
      .from('marcas')
      .select('id, nome')
      .eq('ativo', true)
      .order('nome');
    setMarcas(data || []);
  };

  const fetchFormasPagamento = async () => {
    const { data } = await supabase
      .from('formas_pagamento')
      .select('id, nome')
      .eq('ativo', true)
      .order('nome');
    setFormasPagamento(data || []);
  };

  const fetchFiliais = async () => {
    const { data } = await supabase
      .from('filiais')
      .select('id, nome')
      .eq('ativo', true)
      .order('nome');
    setFiliais(data || []);
  };

  const handleMarcaToggle = (marcaId: number) => {
    setFormData(prev => ({
      ...prev,
      marcas_ids: prev.marcas_ids.includes(marcaId)
        ? prev.marcas_ids.filter(id => id !== marcaId)
        : [...prev.marcas_ids, marcaId]
    }));
  };

  const handleNovoFornecedor = (newPJ: { id: number; razao_social: string; nome_fantasia?: string }) => {
    fetchFornecedores();
    setFormData(prev => ({ ...prev, fornecedor_id: newPJ.id.toString() }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.numero_pedido.trim()) {
      toast({
        title: 'Erro',
        description: 'O número do pedido é obrigatório.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      const pedidoData = {
        numero_pedido: formData.numero_pedido,
        data_pedido: formData.data_pedido.toISOString().split('T')[0],
        data_entrega: formData.data_entrega?.toISOString().split('T')[0] || null,
        status: formData.status,
        valor_total_centavos: formData.valor_total_centavos || null,
        desconto_centavos: formData.desconto_centavos || null,
        forma_pagamento_id: formData.forma_pagamento_id ? parseInt(formData.forma_pagamento_id) : null,
        negociacao: formData.negociacao || null,
        condicoes_pagamento: formData.condicoes_pagamento || null,
        observacoes: formData.observacoes || null,
        fornecedor_id: formData.fornecedor_id ? parseInt(formData.fornecedor_id) : null,
        filial_id: formData.filial_id ? parseInt(formData.filial_id) : null,
      };

      let pedidoId: number;

      if (editingPedido) {
        const { error } = await supabase
          .from('compras_pedidos')
          .update(pedidoData)
          .eq('id', editingPedido.id);

        if (error) throw error;
        pedidoId = editingPedido.id;

        // Remove marcas antigas
        await supabase
          .from('compras_pedido_marcas')
          .delete()
          .eq('pedido_id', pedidoId);
      } else {
        const { data, error } = await supabase
          .from('compras_pedidos')
          .insert([pedidoData])
          .select()
          .single();

        if (error) throw error;
        pedidoId = data.id;
      }

      // Inserir marcas selecionadas
      if (formData.marcas_ids.length > 0) {
        const marcasToInsert = formData.marcas_ids.map(marca_id => ({
          pedido_id: pedidoId,
          marca_id,
        }));

        const { error: marcasError } = await supabase
          .from('compras_pedido_marcas')
          .insert(marcasToInsert);

        if (marcasError) throw marcasError;
      }

      toast({
        title: 'Sucesso',
        description: editingPedido ? 'Pedido atualizado!' : 'Pedido criado!',
      });

      onSuccess();
    } catch (error) {
      console.error('Erro ao salvar pedido:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível salvar o pedido.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const valorLiquido = formData.valor_total_centavos - formData.desconto_centavos;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Informações Básicas */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Informações do Pedido</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label htmlFor="numero_pedido">Número do Pedido *</Label>
            <Input
              id="numero_pedido"
              value={formData.numero_pedido}
              onChange={(e) => setFormData({ ...formData, numero_pedido: e.target.value })}
              placeholder="Ex: PED-001"
              required
            />
          </div>
          
          <div>
            <Label htmlFor="data_pedido">Data do Pedido *</Label>
            <DatePicker
              date={formData.data_pedido}
              onSelect={(date) => setFormData({ ...formData, data_pedido: date || new Date() })}
            />
          </div>
          
          <div>
            <Label htmlFor="data_entrega">Previsão de Entrega</Label>
            <DatePicker
              date={formData.data_entrega}
              onSelect={(date) => setFormData({ ...formData, data_entrega: date })}
              placeholder="Selecione"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="status">Status</Label>
            <Select 
              value={formData.status} 
              onValueChange={(value) => setFormData({ ...formData, status: value })}
            >
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
            <Label htmlFor="filial_id">Filial</Label>
            <Select 
              value={formData.filial_id} 
              onValueChange={(value) => setFormData({ ...formData, filial_id: value })}
            >
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
      </div>

      {/* Fornecedor */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Fornecedor</h3>
        
        <div className="flex gap-2">
          <div className="flex-1">
            <Label htmlFor="fornecedor_id">Fornecedor (Pessoa Jurídica) *</Label>
            <Select 
              value={formData.fornecedor_id} 
              onValueChange={(value) => setFormData({ ...formData, fornecedor_id: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o fornecedor" />
              </SelectTrigger>
              <SelectContent>
                {fornecedores.map((f) => (
                  <SelectItem key={f.id} value={f.id.toString()}>
                    {f.nome_fantasia || f.razao_social}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end">
            <NovoPJForm onSuccess={handleNovoFornecedor} />
          </div>
        </div>
      </div>

      {/* Marcas */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Marcas do Pedido</h3>
        <p className="text-sm text-muted-foreground">
          Selecione as marcas incluídas neste pedido (um fornecedor pode ter várias marcas)
        </p>
        
        <div className="flex flex-wrap gap-2 p-4 border rounded-lg bg-muted/30">
          {marcas.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma marca cadastrada</p>
          ) : (
            marcas.map((marca) => (
              <label 
                key={marca.id} 
                className="flex items-center gap-2 cursor-pointer"
              >
                <Checkbox
                  checked={formData.marcas_ids.includes(marca.id)}
                  onCheckedChange={() => handleMarcaToggle(marca.id)}
                />
                <Badge variant={formData.marcas_ids.includes(marca.id) ? "default" : "outline"}>
                  {marca.nome}
                </Badge>
              </label>
            ))
          )}
        </div>
      </div>

      {/* Valores */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Valores</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label htmlFor="valor_total">Valor Bruto</Label>
            <CurrencyInput
              value={formData.valor_total_centavos}
              onValueChange={(value) => setFormData({ ...formData, valor_total_centavos: value })}
              placeholder="R$ 0,00"
            />
          </div>
          
          <div>
            <Label htmlFor="desconto">Desconto</Label>
            <CurrencyInput
              value={formData.desconto_centavos}
              onValueChange={(value) => setFormData({ ...formData, desconto_centavos: value })}
              placeholder="R$ 0,00"
            />
          </div>
          
          <div>
            <Label>Valor Líquido</Label>
            <div className="h-10 px-3 py-2 border rounded-md bg-muted flex items-center font-medium">
              {new Intl.NumberFormat('pt-BR', {
                style: 'currency',
                currency: 'BRL',
              }).format(valorLiquido / 100)}
            </div>
          </div>
        </div>
      </div>

      {/* Pagamento e Negociação */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Pagamento e Negociação</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="forma_pagamento_id">Forma de Pagamento</Label>
            <Select 
              value={formData.forma_pagamento_id} 
              onValueChange={(value) => setFormData({ ...formData, forma_pagamento_id: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {formasPagamento.map((fp) => (
                  <SelectItem key={fp.id} value={fp.id.toString()}>
                    {fp.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Label htmlFor="condicoes_pagamento">Condições de Pagamento</Label>
            <Input
              id="condicoes_pagamento"
              value={formData.condicoes_pagamento}
              onChange={(e) => setFormData({ ...formData, condicoes_pagamento: e.target.value })}
              placeholder="Ex: 30/60/90 dias"
            />
          </div>
        </div>
        
        <div>
          <Label htmlFor="negociacao">Negociação</Label>
          <Textarea
            id="negociacao"
            value={formData.negociacao}
            onChange={(e) => setFormData({ ...formData, negociacao: e.target.value })}
            placeholder="Detalhes da negociação, acordos especiais, etc."
            rows={3}
          />
        </div>
      </div>

      {/* Observações */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Observações</h3>
        
        <Textarea
          id="observacoes"
          value={formData.observacoes}
          onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
          placeholder="Observações gerais sobre o pedido..."
          rows={4}
        />
      </div>

      {/* Botões */}
      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? 'Salvando...' : (editingPedido ? 'Atualizar Pedido' : 'Criar Pedido')}
        </Button>
      </div>
    </form>
  );
}
