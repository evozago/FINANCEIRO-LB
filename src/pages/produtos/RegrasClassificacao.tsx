import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Plus,
  Pencil,
  Trash2,
  Settings2,
  GripVertical,
  Play,
  ArrowLeft,
} from 'lucide-react';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import { normalizarTexto } from '@/lib/classificador';

interface RegraForm {
  nome: string;
  tipo: 'contains' | 'exact' | 'startsWith' | 'containsAll' | 'notContains';
  termos: string;
  campo_destino: string;
  valor_destino: string;
  pontuacao: number;
  genero_automatico: string;
  ativo: boolean;
}

const tiposRegra = [
  { value: 'contains', label: 'Contém', desc: 'Busca o termo em qualquer posição' },
  { value: 'exact', label: 'Exato', desc: 'Nome exatamente igual' },
  { value: 'startsWith', label: 'Começa com', desc: 'Nome inicia com o termo' },
  { value: 'containsAll', label: 'Contém todos', desc: 'Deve ter TODOS os termos' },
  { value: 'notContains', label: 'Não contém', desc: 'Exclui se tiver o termo' },
];

const camposDestino = [
  { value: 'categoria', label: 'Categoria' },
  { value: 'subcategoria', label: 'Subcategoria' },
  { value: 'genero', label: 'Gênero' },
  { value: 'faixa_etaria', label: 'Faixa Etária' },
  { value: 'marca', label: 'Marca' },
  { value: 'estilo', label: 'Estilo' },
];

const initialForm: RegraForm = {
  nome: '',
  tipo: 'contains',
  termos: '',
  campo_destino: 'categoria',
  valor_destino: '',
  pontuacao: 100,
  genero_automatico: '',
  ativo: true,
};

export default function RegrasClassificacao() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [form, setForm] = useState<RegraForm>(initialForm);
  const [testInput, setTestInput] = useState('');
  const [testResult, setTestResult] = useState<string | null>(null);

  const { data: regras = [], isLoading } = useQuery({
    queryKey: ['regras-classificacao'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('regras_classificacao')
        .select('*')
        .order('ordem');
      if (error) throw error;
      return data;
    },
  });

  const salvarMutation = useMutation({
    mutationFn: async (dados: RegraForm & { id?: number }) => {
      const termosArray = dados.termos
        .split(',')
        .map(t => t.trim())
        .filter(Boolean);

      const payload = {
        nome: dados.nome,
        tipo: dados.tipo,
        termos: termosArray,
        campo_destino: dados.campo_destino,
        valor_destino: dados.valor_destino,
        pontuacao: dados.pontuacao,
        genero_automatico: dados.genero_automatico || null,
        ativo: dados.ativo,
        ordem: dados.id ? undefined : regras.length,
      };

      if (dados.id) {
        const { error } = await supabase
          .from('regras_classificacao')
          .update(payload)
          .eq('id', dados.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('regras_classificacao')
          .insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['regras-classificacao'] });
      toast.success(editandoId ? 'Regra atualizada!' : 'Regra criada!');
      resetForm();
    },
    onError: () => toast.error('Erro ao salvar regra'),
  });

  const excluirMutation = useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase.from('regras_classificacao').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['regras-classificacao'] });
      toast.success('Regra excluída!');
    },
    onError: () => toast.error('Erro ao excluir regra'),
  });

  const resetForm = () => {
    setForm(initialForm);
    setEditandoId(null);
    setDialogOpen(false);
  };

  const abrirEdicao = (regra: typeof regras[0]) => {
    setEditandoId(regra.id);
    setForm({
      nome: regra.nome,
      tipo: regra.tipo as RegraForm['tipo'],
      termos: regra.termos.join(', '),
      campo_destino: regra.campo_destino,
      valor_destino: regra.valor_destino,
      pontuacao: regra.pontuacao,
      genero_automatico: regra.genero_automatico || '',
      ativo: regra.ativo ?? true,
    });
    setDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nome || !form.termos || !form.valor_destino) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }
    salvarMutation.mutate({ ...form, id: editandoId || undefined });
  };

  // Testar regra
  const testarRegra = () => {
    if (!testInput.trim()) return;
    
    const nomeNorm = normalizarTexto(testInput);
    const matches: string[] = [];

    for (const regra of regras.filter(r => r.ativo)) {
      const termosNorm = regra.termos.map(t => normalizarTexto(t));
      let match = false;

      switch (regra.tipo) {
        case 'exact':
          match = termosNorm.some(t => nomeNorm === t);
          break;
        case 'startsWith':
          match = termosNorm.some(t => nomeNorm.startsWith(t));
          break;
        case 'contains':
          match = termosNorm.some(t => nomeNorm.includes(t));
          break;
        case 'containsAll':
          match = termosNorm.every(t => nomeNorm.includes(t));
          break;
        case 'notContains':
          match = !termosNorm.some(t => nomeNorm.includes(t));
          break;
      }

      if (match) {
        matches.push(`✓ ${regra.nome} → ${regra.campo_destino}: ${regra.valor_destino}`);
      }
    }

    setTestResult(matches.length > 0 ? matches.join('\n') : 'Nenhuma regra aplicada');
  };

  const regrasPorCampo = camposDestino.map(campo => ({
    ...campo,
    regras: regras.filter(r => r.campo_destino === campo.value),
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Button variant="ghost" size="icon" asChild>
              <Link to="/produtos/classificador">
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Settings2 className="h-6 w-6" />
              Regras de Classificação
            </h1>
          </div>
          <p className="text-muted-foreground ml-10">
            Configure as regras para classificação automática de produtos
          </p>
        </div>

        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nova Regra
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editandoId ? 'Editar Regra' : 'Nova Regra'}</DialogTitle>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label>Nome da Regra *</Label>
                <Input
                  value={form.nome}
                  onChange={e => setForm({ ...form, nome: e.target.value })}
                  placeholder="Ex: Vestido Festa"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Tipo *</Label>
                  <Select value={form.tipo} onValueChange={(v) => setForm({ ...form, tipo: v as RegraForm['tipo'] })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {tiposRegra.map(t => (
                        <SelectItem key={t.value} value={t.value}>
                          {t.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">
                    {tiposRegra.find(t => t.value === form.tipo)?.desc}
                  </p>
                </div>

                <div>
                  <Label>Campo Destino *</Label>
                  <Select value={form.campo_destino} onValueChange={(v) => setForm({ ...form, campo_destino: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {camposDestino.map(c => (
                        <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label>Termos de Busca * (separados por vírgula)</Label>
                <Input
                  value={form.termos}
                  onChange={e => setForm({ ...form, termos: e.target.value })}
                  placeholder="Ex: VESTIDO, FESTA"
                />
              </div>

              <div>
                <Label>Valor a Aplicar *</Label>
                <Input
                  value={form.valor_destino}
                  onChange={e => setForm({ ...form, valor_destino: e.target.value })}
                  placeholder="Ex: Vestido Festa"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Pontuação Base</Label>
                  <Input
                    type="number"
                    value={form.pontuacao}
                    onChange={e => setForm({ ...form, pontuacao: parseInt(e.target.value) || 100 })}
                  />
                </div>
                <div>
                  <Label>Gênero Automático</Label>
                  <Select
                    value={form.genero_automatico || 'none'}
                    onValueChange={(v) => setForm({ ...form, genero_automatico: v === 'none' ? '' : v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Nenhum</SelectItem>
                      <SelectItem value="FEMININO">Feminino</SelectItem>
                      <SelectItem value="MASCULINO">Masculino</SelectItem>
                      <SelectItem value="UNISSEX">Unissex</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  checked={form.ativo}
                  onCheckedChange={(checked) => setForm({ ...form, ativo: checked })}
                />
                <Label>Regra ativa</Label>
              </div>

              <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={resetForm}>Cancelar</Button>
                <Button type="submit" disabled={salvarMutation.isPending}>
                  {salvarMutation.isPending ? 'Salvando...' : 'Salvar'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Testador */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Testar Regras</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              value={testInput}
              onChange={e => setTestInput(e.target.value)}
              placeholder="Digite um nome de produto para testar..."
              className="flex-1"
            />
            <Button onClick={testarRegra}>
              <Play className="h-4 w-4 mr-2" />
              Testar
            </Button>
          </div>
          {testResult && (
            <pre className="mt-3 p-3 bg-muted rounded text-sm whitespace-pre-wrap">{testResult}</pre>
          )}
        </CardContent>
      </Card>

      {/* Regras por categoria */}
      <Tabs defaultValue="categoria">
        <TabsList>
          {regrasPorCampo.map(campo => (
            <TabsTrigger key={campo.value} value={campo.value}>
              {campo.label} ({campo.regras.length})
            </TabsTrigger>
          ))}
        </TabsList>

        {regrasPorCampo.map(campo => (
          <TabsContent key={campo.value} value={campo.value} className="mt-4">
            <Card>
              <CardContent className="pt-6">
                {campo.regras.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    Nenhuma regra para {campo.label.toLowerCase()}
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-8"></TableHead>
                        <TableHead>Nome</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Termos</TableHead>
                        <TableHead>Valor</TableHead>
                        <TableHead>Pts</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {campo.regras.map((regra) => (
                        <TableRow key={regra.id}>
                          <TableCell>
                            <GripVertical className="h-4 w-4 text-muted-foreground" />
                          </TableCell>
                          <TableCell className="font-medium">{regra.nome}</TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {tiposRegra.find(t => t.value === regra.tipo)?.label}
                            </Badge>
                          </TableCell>
                          <TableCell className="max-w-[200px] truncate">
                            {regra.termos.join(', ')}
                          </TableCell>
                          <TableCell>{regra.valor_destino}</TableCell>
                          <TableCell>{regra.pontuacao}</TableCell>
                          <TableCell>
                            <Badge variant={regra.ativo ? 'default' : 'secondary'}>
                              {regra.ativo ? 'Ativa' : 'Inativa'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex gap-1 justify-end">
                              <Button size="icon" variant="ghost" onClick={() => abrirEdicao(regra)}>
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="text-destructive"
                                onClick={() => {
                                  if (confirm(`Excluir regra "${regra.nome}"?`)) {
                                    excluirMutation.mutate(regra.id);
                                  }
                                }}
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
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
