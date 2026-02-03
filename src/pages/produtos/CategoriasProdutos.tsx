import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Plus, Pencil, Trash2, Tags, FolderTree } from 'lucide-react';
import { toast } from 'sonner';

interface CategoriaProduto {
  id: number;
  nome: string;
  descricao: string | null;
  cor: string | null;
  categoria_pai_id: number | null;
  ativo: boolean | null;
  created_at: string | null;
}

const coresPredefinidas = [
  '#ec4899', '#f97316', '#8b5cf6', '#06b6d4', 
  '#10b981', '#f59e0b', '#ef4444', '#6366f1',
  '#84cc16', '#14b8a6', '#a855f7', '#3b82f6'
];

export default function CategoriasProdutos() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editando, setEditando] = useState<CategoriaProduto | null>(null);
  const [form, setForm] = useState({
    nome: '',
    descricao: '',
    cor: '#6366f1',
    categoria_pai_id: null as number | null,
    ativo: true,
  });

  const { data: categorias = [], isLoading } = useQuery({
    queryKey: ['categorias-produtos'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categorias_produtos')
        .select('*')
        .order('nome');
      if (error) throw error;
      return data as CategoriaProduto[];
    },
  });

  const salvarMutation = useMutation({
    mutationFn: async (dados: typeof form & { id?: number }) => {
      if (dados.id) {
        const { error } = await supabase
          .from('categorias_produtos')
          .update({
            nome: dados.nome,
            descricao: dados.descricao || null,
            cor: dados.cor,
            categoria_pai_id: dados.categoria_pai_id,
            ativo: dados.ativo,
          })
          .eq('id', dados.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('categorias_produtos')
          .insert({
            nome: dados.nome,
            descricao: dados.descricao || null,
            cor: dados.cor,
            categoria_pai_id: dados.categoria_pai_id,
            ativo: dados.ativo,
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categorias-produtos'] });
      toast.success(editando ? 'Categoria atualizada!' : 'Categoria criada!');
      resetForm();
    },
    onError: () => {
      toast.error('Erro ao salvar categoria');
    },
  });

  const excluirMutation = useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase
        .from('categorias_produtos')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categorias-produtos'] });
      toast.success('Categoria excluída!');
    },
    onError: () => {
      toast.error('Erro ao excluir categoria. Verifique se não há produtos vinculados.');
    },
  });

  const resetForm = () => {
    setForm({ nome: '', descricao: '', cor: '#6366f1', categoria_pai_id: null, ativo: true });
    setEditando(null);
    setDialogOpen(false);
  };

  const abrirEdicao = (cat: CategoriaProduto) => {
    setEditando(cat);
    setForm({
      nome: cat.nome,
      descricao: cat.descricao || '',
      cor: cat.cor || '#6366f1',
      categoria_pai_id: cat.categoria_pai_id,
      ativo: cat.ativo ?? true,
    });
    setDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nome.trim()) {
      toast.error('Nome é obrigatório');
      return;
    }
    salvarMutation.mutate({ ...form, id: editando?.id });
  };

  const getCategoriaPaiNome = (id: number | null) => {
    if (!id) return null;
    const cat = categorias.find(c => c.id === id);
    return cat?.nome || null;
  };

  const categoriasAtivas = categorias.filter(c => c.ativo);
  const categoriasInativas = categorias.filter(c => !c.ativo);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Tags className="h-6 w-6" />
            Categorias de Produtos
          </h1>
          <p className="text-muted-foreground">
            Organize seus produtos em categorias hierárquicas
          </p>
        </div>

        <Dialog open={dialogOpen} onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nova Categoria
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editando ? 'Editar Categoria' : 'Nova Categoria'}
              </DialogTitle>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="nome">Nome *</Label>
                <Input
                  id="nome"
                  value={form.nome}
                  onChange={(e) => setForm({ ...form, nome: e.target.value })}
                  placeholder="Ex: Camisetas"
                />
              </div>

              <div>
                <Label htmlFor="descricao">Descrição</Label>
                <Textarea
                  id="descricao"
                  value={form.descricao}
                  onChange={(e) => setForm({ ...form, descricao: e.target.value })}
                  placeholder="Descrição opcional"
                  rows={2}
                />
              </div>

              <div>
                <Label>Categoria Pai (opcional)</Label>
                <Select
                  value={form.categoria_pai_id?.toString() || 'none'}
                  onValueChange={(val) => 
                    setForm({ ...form, categoria_pai_id: val === 'none' ? null : parseInt(val) })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Nenhuma (categoria raiz)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhuma (categoria raiz)</SelectItem>
                    {categorias
                      .filter(c => c.id !== editando?.id)
                      .map(cat => (
                        <SelectItem key={cat.id} value={cat.id.toString()}>
                          {cat.nome}
                        </SelectItem>
                      ))
                    }
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Cor</Label>
                <div className="flex gap-2 mt-2 flex-wrap">
                  {coresPredefinidas.map((cor) => (
                    <button
                      key={cor}
                      type="button"
                      onClick={() => setForm({ ...form, cor })}
                      className={`w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 ${
                        form.cor === cor ? 'border-foreground ring-2 ring-offset-2' : 'border-transparent'
                      }`}
                      style={{ backgroundColor: cor }}
                    />
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  id="ativo"
                  checked={form.ativo}
                  onCheckedChange={(checked) => setForm({ ...form, ativo: checked })}
                />
                <Label htmlFor="ativo">Categoria ativa</Label>
              </div>

              <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={salvarMutation.isPending}>
                  {salvarMutation.isPending ? 'Salvando...' : 'Salvar'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{categorias.length}</div>
            <p className="text-sm text-muted-foreground">Total de categorias</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-600">{categoriasAtivas.length}</div>
            <p className="text-sm text-muted-foreground">Categorias ativas</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-muted-foreground">{categoriasInativas.length}</div>
            <p className="text-sm text-muted-foreground">Categorias inativas</p>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FolderTree className="h-5 w-5" />
            Lista de Categorias
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Carregando...</div>
          ) : categorias.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhuma categoria cadastrada. Clique em "Nova Categoria" para começar.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cor</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>Categoria Pai</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categorias.map((cat) => (
                  <TableRow key={cat.id}>
                    <TableCell>
                      <div
                        className="w-6 h-6 rounded-full"
                        style={{ backgroundColor: cat.cor || '#6366f1' }}
                      />
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{cat.nome}</div>
                        {cat.descricao && (
                          <div className="text-sm text-muted-foreground">{cat.descricao}</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {getCategoriaPaiNome(cat.categoria_pai_id) || (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={cat.ativo ? 'default' : 'secondary'}>
                        {cat.ativo ? 'Ativa' : 'Inativa'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-1 justify-end">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => abrirEdicao(cat)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="text-destructive hover:text-destructive"
                          onClick={() => {
                            if (confirm(`Excluir categoria "${cat.nome}"?`)) {
                              excluirMutation.mutate(cat.id);
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
    </div>
  );
}
