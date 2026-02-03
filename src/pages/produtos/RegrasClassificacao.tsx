import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
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
  Upload,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  CheckSquare,
  Power,
  Edit3,
} from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import { normalizarTexto } from '@/lib/classificador';

type SortKey = 'nome' | 'tipo' | 'termos' | 'valor_destino' | 'pontuacao' | 'ativo';
type SortDirection = 'asc' | 'desc' | null;

interface RegraForm {
  nome: string;
  tipo: 'contains' | 'exact' | 'startsWith' | 'containsAll' | 'notContains';
  termos: string;
  termos_exclusao: string; // Novo campo para termos de exclusão
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
  { value: 'containsAll', label: 'Contém todos', desc: 'Deve ter TODOS os termos (ideal para conjuntos!)' },
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
  termos_exclusao: '', // Inicializa vazio
  campo_destino: 'categoria',
  valor_destino: '',
  pontuacao: 100,
  genero_automatico: '',
  ativo: true,
};

export default function RegrasClassificacao() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [importMarcasOpen, setImportMarcasOpen] = useState(false);
  const [marcasInput, setMarcasInput] = useState('');
  const [importandoMarcas, setImportandoMarcas] = useState(false);
  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [form, setForm] = useState<RegraForm>(initialForm);
  const [testInput, setTestInput] = useState('');
  const [testResult, setTestResult] = useState<string | null>(null);
  
  // Seleção de linhas
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  
  // Modal de edição em lote
  const [batchEditOpen, setBatchEditOpen] = useState(false);
  const [batchForm, setBatchForm] = useState({
    tipo: '' as string,
    campo_destino: '' as string,
    valor_destino: '' as string,
  });
  
  // Ordenação
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);
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

      // Processar termos de exclusão
      const termosExclusaoArray = dados.termos_exclusao
        .split(',')
        .map(t => t.trim())
        .filter(Boolean);

      const payload = {
        nome: dados.nome,
        tipo: dados.tipo,
        termos: termosArray,
        termos_exclusao: termosExclusaoArray, // Novo campo
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
      termos_exclusao: (regra.termos_exclusao || []).join(', '), // Carregar termos de exclusão
      campo_destino: regra.campo_destino,
      valor_destino: regra.valor_destino,
      pontuacao: regra.pontuacao ?? 100,
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

  // Testar regra - agora considera termos de exclusão
  const testarRegra = () => {
    if (!testInput.trim()) return;
    
    const nomeNorm = normalizarTexto(testInput);
    const matches: string[] = [];

    for (const regra of regras.filter(r => r.ativo)) {
      const termosNorm = regra.termos.map(t => normalizarTexto(t));
      const termosExclusaoNorm = (regra.termos_exclusao || []).map(t => normalizarTexto(t));
      
      // Primeiro verifica exclusões
      if (termosExclusaoNorm.length > 0) {
        const temExclusao = termosExclusaoNorm.some(t => nomeNorm.includes(t));
        if (temExclusao) {
          continue; // Pula esta regra se tem termo de exclusão
        }
      }
      
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
        const exclusaoInfo = termosExclusaoNorm.length > 0 
          ? ` (exceto: ${regra.termos_exclusao?.join(', ')})` 
          : '';
        matches.push(`✓ ${regra.nome} → ${regra.campo_destino}: ${regra.valor_destino}${exclusaoInfo}`);
      }
    }

    setTestResult(matches.length > 0 ? matches.join('\n') : 'Nenhuma regra aplicada');
  };

  // Importar marcas em lote (separadas por ponto e vírgula)
  const importarMarcasEmLote = async () => {
    if (!marcasInput.trim()) {
      toast.error('Digite as marcas separadas por ponto e vírgula');
      return;
    }

    setImportandoMarcas(true);
    try {
      const marcas = marcasInput
        .split(';')
        .map(m => m.trim())
        .filter(Boolean);

      if (marcas.length === 0) {
        toast.error('Nenhuma marca válida encontrada');
        return;
      }

      // Criar regra para cada marca
      const regrasParaInserir = marcas.map((marca, idx) => ({
        nome: `Marca: ${marca}`,
        tipo: 'contains',
        termos: [marca.toUpperCase()],
        termos_exclusao: [],
        campo_destino: 'marca',
        valor_destino: marca,
        pontuacao: 100,
        genero_automatico: null,
        ativo: true,
        ordem: regras.length + idx,
      }));

      const { error } = await supabase
        .from('regras_classificacao')
        .insert(regrasParaInserir);

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ['regras-classificacao'] });
      toast.success(`${marcas.length} marcas importadas com sucesso!`);
      setMarcasInput('');
      setImportMarcasOpen(false);
    } catch (err) {
      console.error(err);
      toast.error('Erro ao importar marcas');
    } finally {
      setImportandoMarcas(false);
    }
  };

  // Função de ordenação
  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      if (sortDirection === 'asc') setSortDirection('desc');
      else if (sortDirection === 'desc') { setSortKey(null); setSortDirection(null); }
      else setSortDirection('asc');
    } else {
      setSortKey(key);
      setSortDirection('asc');
    }
  };

  const getSortIcon = (key: SortKey) => {
    if (sortKey !== key) return <ArrowUpDown className="h-3 w-3 ml-1 opacity-50" />;
    if (sortDirection === 'asc') return <ArrowUp className="h-3 w-3 ml-1" />;
    return <ArrowDown className="h-3 w-3 ml-1" />;
  };

  // Ordena e agrupa regras por campo
  const regrasPorCampo = useMemo(() => {
    return camposDestino.map(campo => {
      let regrasFiltered = regras.filter(r => r.campo_destino === campo.value);
      
      if (sortKey && sortDirection) {
        regrasFiltered = [...regrasFiltered].sort((a, b) => {
          let valA: string | number | boolean;
          let valB: string | number | boolean;
          
          switch (sortKey) {
            case 'nome':
              valA = a.nome.toLowerCase();
              valB = b.nome.toLowerCase();
              break;
            case 'tipo':
              valA = a.tipo;
              valB = b.tipo;
              break;
            case 'termos':
              valA = a.termos.join(', ').toLowerCase();
              valB = b.termos.join(', ').toLowerCase();
              break;
            case 'valor_destino':
              valA = a.valor_destino.toLowerCase();
              valB = b.valor_destino.toLowerCase();
              break;
            case 'pontuacao':
              valA = a.pontuacao ?? 0;
              valB = b.pontuacao ?? 0;
              break;
            case 'ativo':
              valA = a.ativo ? 1 : 0;
              valB = b.ativo ? 1 : 0;
              break;
            default:
              return 0;
          }
          
          if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
          if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
          return 0;
        });
      }
      
      return { ...campo, regras: regrasFiltered };
    });
  }, [regras, sortKey, sortDirection]);

  // Funções de seleção
  const toggleSelection = (id: number) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedIds(newSet);
  };

  const toggleSelectAll = (regrasTab: typeof regras) => {
    const idsTab = regrasTab.map(r => r.id);
    const allSelected = idsTab.every(id => selectedIds.has(id));
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(idsTab));
    }
  };

  // Ações em lote
  const excluirSelecionadasMutation = useMutation({
    mutationFn: async (ids: number[]) => {
      const { error } = await supabase
        .from('regras_classificacao')
        .delete()
        .in('id', ids);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['regras-classificacao'] });
      toast.success(`${selectedIds.size} regras excluídas!`);
      setSelectedIds(new Set());
    },
    onError: () => toast.error('Erro ao excluir regras'),
  });

  const alterarStatusMutation = useMutation({
    mutationFn: async ({ ids, ativo }: { ids: number[]; ativo: boolean }) => {
      const { error } = await supabase
        .from('regras_classificacao')
        .update({ ativo })
        .in('id', ids);
      if (error) throw error;
    },
    onSuccess: (_, { ativo }) => {
      queryClient.invalidateQueries({ queryKey: ['regras-classificacao'] });
      toast.success(`${selectedIds.size} regras ${ativo ? 'ativadas' : 'desativadas'}!`);
      setSelectedIds(new Set());
    },
    onError: () => toast.error('Erro ao alterar status'),
  });

  const handleExcluirSelecionadas = () => {
    if (selectedIds.size === 0) return;
    if (confirm(`Excluir ${selectedIds.size} regras selecionadas?`)) {
      excluirSelecionadasMutation.mutate(Array.from(selectedIds));
    }
  };

  const handleAtivarSelecionadas = () => {
    if (selectedIds.size === 0) return;
    alterarStatusMutation.mutate({ ids: Array.from(selectedIds), ativo: true });
  };

  const handleDesativarSelecionadas = () => {
    if (selectedIds.size === 0) return;
    alterarStatusMutation.mutate({ ids: Array.from(selectedIds), ativo: false });
  };

  // Edição em lote
  const editarLoteMutation = useMutation({
    mutationFn: async (payload: { ids: number[]; updates: Record<string, string> }) => {
      const { error } = await supabase
        .from('regras_classificacao')
        .update(payload.updates)
        .in('id', payload.ids);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['regras-classificacao'] });
      toast.success(`${selectedIds.size} regras atualizadas!`);
      setSelectedIds(new Set());
      setBatchEditOpen(false);
      setBatchForm({ tipo: '', campo_destino: '', valor_destino: '' });
    },
    onError: () => toast.error('Erro ao atualizar regras'),
  });

  const handleEditarEmLote = () => {
    const updates: Record<string, string> = {};
    if (batchForm.tipo) updates.tipo = batchForm.tipo;
    if (batchForm.campo_destino) updates.campo_destino = batchForm.campo_destino;
    if (batchForm.valor_destino) updates.valor_destino = batchForm.valor_destino;

    if (Object.keys(updates).length === 0) {
      toast.error('Selecione pelo menos um campo para alterar');
      return;
    }

    editarLoteMutation.mutate({ ids: Array.from(selectedIds), updates });
  };

  const openBatchEdit = () => {
    setBatchForm({ tipo: '', campo_destino: '', valor_destino: '' });
    setBatchEditOpen(true);
  };

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

        <div className="flex gap-2">
          {/* Botão importar marcas em lote */}
          <Dialog open={importMarcasOpen} onOpenChange={setImportMarcasOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Upload className="h-4 w-4 mr-2" />
                Importar Marcas
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Importar Marcas em Lote</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Marcas (separadas por ponto e vírgula)</Label>
                  <Textarea
                    value={marcasInput}
                    onChange={e => setMarcasInput(e.target.value)}
                    placeholder="Ex: Nike; Adidas; Puma; Reebok"
                    rows={5}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Uma regra será criada para cada marca, detectando automaticamente pelo nome do produto.
                  </p>
                </div>
                <div className="flex gap-2 justify-end">
                  <Button variant="outline" onClick={() => setImportMarcasOpen(false)}>Cancelar</Button>
                  <Button onClick={importarMarcasEmLote} disabled={importandoMarcas}>
                    {importandoMarcas ? 'Importando...' : 'Importar Marcas'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

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
                  placeholder="Ex: CONJUNTO, BERMUDA, CAMISETA"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Para "Contém todos": produto deve ter TODOS os termos
                </p>
              </div>

              <div>
                <Label>Termos de Exclusão (opcional, separados por vírgula)</Label>
                <Input
                  value={form.termos_exclusao}
                  onChange={e => setForm({ ...form, termos_exclusao: e.target.value })}
                  placeholder="Ex: PRAIA, PISCINA"
                  className="border-warning focus:border-warning"
                />
                <p className="text-xs text-warning mt-1">
                  Se o produto contiver algum desses termos, a regra NÃO será aplicada
                </p>
              </div>

              <div>
                <Label>Valor a Aplicar *</Label>
                <Input
                  value={form.valor_destino}
                  onChange={e => setForm({ ...form, valor_destino: e.target.value })}
                  placeholder="Ex: Conjunto Camiseta Bermuda"
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

        {regrasPorCampo.map(campo => {
          const idsTab = campo.regras.map(r => r.id);
          const allSelected = idsTab.length > 0 && idsTab.every(id => selectedIds.has(id));
          const someSelected = idsTab.some(id => selectedIds.has(id));
          const selectedCount = idsTab.filter(id => selectedIds.has(id)).length;

          return (
            <TabsContent key={campo.value} value={campo.value} className="mt-4">
              <Card>
                {/* Barra de ações em lote */}
                {selectedCount > 0 && (
                  <div className="border-b px-4 py-3 flex items-center gap-4 bg-muted/30">
                    <span className="text-sm font-medium">
                      {selectedCount} {selectedCount === 1 ? 'regra selecionada' : 'regras selecionadas'}
                    </span>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={openBatchEdit}>
                        <Edit3 className="h-3.5 w-3.5 mr-1" />
                        Editar
                      </Button>
                      <Button size="sm" variant="outline" onClick={handleAtivarSelecionadas}>
                        <Power className="h-3.5 w-3.5 mr-1" />
                        Ativar
                      </Button>
                      <Button size="sm" variant="outline" onClick={handleDesativarSelecionadas}>
                        <Power className="h-3.5 w-3.5 mr-1" />
                        Desativar
                      </Button>
                      <Button size="sm" variant="destructive" onClick={handleExcluirSelecionadas}>
                        <Trash2 className="h-3.5 w-3.5 mr-1" />
                        Excluir
                      </Button>
                    </div>
                  </div>
                )}
                <CardContent className="pt-6">
                  {campo.regras.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                      Nenhuma regra para {campo.label.toLowerCase()}
                    </p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-10">
                            <Checkbox
                              checked={allSelected}
                              onCheckedChange={() => toggleSelectAll(campo.regras)}
                              aria-label="Selecionar todas"
                            />
                          </TableHead>
                          <TableHead 
                            className="cursor-pointer hover:bg-muted/50 select-none"
                            onClick={() => handleSort('nome')}
                          >
                            <div className="flex items-center">
                              Nome {getSortIcon('nome')}
                            </div>
                          </TableHead>
                          <TableHead 
                            className="cursor-pointer hover:bg-muted/50 select-none"
                            onClick={() => handleSort('tipo')}
                          >
                            <div className="flex items-center">
                              Tipo {getSortIcon('tipo')}
                            </div>
                          </TableHead>
                          <TableHead 
                            className="cursor-pointer hover:bg-muted/50 select-none"
                            onClick={() => handleSort('termos')}
                          >
                            <div className="flex items-center">
                              Termos {getSortIcon('termos')}
                            </div>
                          </TableHead>
                          <TableHead 
                            className="cursor-pointer hover:bg-muted/50 select-none"
                            onClick={() => handleSort('valor_destino')}
                          >
                            <div className="flex items-center">
                              Valor {getSortIcon('valor_destino')}
                            </div>
                          </TableHead>
                          <TableHead 
                            className="cursor-pointer hover:bg-muted/50 select-none"
                            onClick={() => handleSort('pontuacao')}
                          >
                            <div className="flex items-center">
                              Pts {getSortIcon('pontuacao')}
                            </div>
                          </TableHead>
                          <TableHead 
                            className="cursor-pointer hover:bg-muted/50 select-none"
                            onClick={() => handleSort('ativo')}
                          >
                            <div className="flex items-center">
                              Status {getSortIcon('ativo')}
                            </div>
                          </TableHead>
                          <TableHead className="text-right">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {campo.regras.map((regra) => (
                          <TableRow 
                            key={regra.id}
                            className={selectedIds.has(regra.id) ? 'bg-muted/50' : ''}
                          >
                            <TableCell>
                              <Checkbox
                                checked={selectedIds.has(regra.id)}
                                onCheckedChange={() => toggleSelection(regra.id)}
                                aria-label={`Selecionar ${regra.nome}`}
                              />
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
          );
        })}
      </Tabs>

      {/* Modal de edição em lote */}
      <Dialog open={batchEditOpen} onOpenChange={setBatchEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar {selectedIds.size} regras em lote</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              Deixe em branco os campos que não deseja alterar.
            </p>
            
            <div>
              <Label>Tipo de Regra</Label>
              <Select 
                value={batchForm.tipo || 'none'} 
                onValueChange={(v) => setBatchForm({ ...batchForm, tipo: v === 'none' ? '' : v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Manter atual" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Manter atual</SelectItem>
                  {tiposRegra.map(t => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label} - {t.desc}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Campo Destino</Label>
              <Select 
                value={batchForm.campo_destino || 'none'} 
                onValueChange={(v) => setBatchForm({ ...batchForm, campo_destino: v === 'none' ? '' : v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Manter atual" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Manter atual</SelectItem>
                  {camposDestino.map(c => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Valor Destino</Label>
              <Input
                value={batchForm.valor_destino}
                onChange={(e) => setBatchForm({ ...batchForm, valor_destino: e.target.value })}
                placeholder="Deixe vazio para manter atual"
              />
            </div>
          </div>
          
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setBatchEditOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleEditarEmLote} 
              disabled={editarLoteMutation.isPending}
            >
              {editarLoteMutation.isPending ? 'Salvando...' : 'Aplicar Alterações'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
