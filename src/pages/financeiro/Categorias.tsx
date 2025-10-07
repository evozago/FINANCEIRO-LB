import { useState, useEffect } from 'react';
import { Plus, Search, Edit, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Categoria {
  id: number;
  nome: string;
  descricao?: string;
  categoria_pai_id?: number | null;
  categoria_pai_nome?: string;
  created_at: string;
  updated_at: string;
}

export function Categorias() {
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCategoria, setEditingCategoria] = useState<Categoria | null>(null);
  const [formData, setFormData] = useState({
    nome: '',
    descricao: '',
    categoria_pai_id: ''
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchCategorias();
  }, []);

  const fetchCategorias = async () => {
    try {
      const { data, error } = await supabase
        .from('categorias_financeiras')
        .select(`
          *,
          categoria_pai:categoria_pai_id (
            id,
            nome
          )
        `)
        .order('nome');

      if (error) throw error;
      
      const categoriasFormatadas = (data || []).map(cat => ({
        ...cat,
        categoria_pai_nome: cat.categoria_pai?.nome
      }));
      
      setCategorias(categoriasFormatadas);
    } catch (error) {
      console.error('Erro ao buscar categorias:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar as categorias.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingCategoria) {
        const { error } = await supabase
          .from('categorias_financeiras')
          .update({
            nome: formData.nome,
            descricao: formData.descricao || null,
            categoria_pai_id: formData.categoria_pai_id ? parseInt(formData.categoria_pai_id) : null,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingCategoria.id);

        if (error) throw error;

        toast({
          title: 'Sucesso',
          description: 'Categoria atualizada com sucesso.',
        });
      } else {
        const { error } = await supabase
          .from('categorias_financeiras')
          .insert({
            nome: formData.nome,
            descricao: formData.descricao || null,
            categoria_pai_id: formData.categoria_pai_id ? parseInt(formData.categoria_pai_id) : null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });

        if (error) throw error;

        toast({
          title: 'Sucesso',
          description: 'Categoria criada com sucesso.',
        });
      }

      setDialogOpen(false);
      setEditingCategoria(null);
      setFormData({ nome: '', descricao: '', categoria_pai_id: '' });
      fetchCategorias();
    } catch (error) {
      console.error('Erro ao salvar categoria:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível salvar a categoria.',
        variant: 'destructive',
      });
    }
  };

  const handleEdit = (categoria: Categoria) => {
    setEditingCategoria(categoria);
    setFormData({
      nome: categoria.nome,
      descricao: categoria.descricao || '',
      categoria_pai_id: categoria.categoria_pai_id?.toString() || ''
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Tem certeza que deseja excluir esta categoria?')) return;

    try {
      const { error } = await supabase
        .from('categorias_financeiras')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Sucesso',
        description: 'Categoria excluída com sucesso.',
      });
      
      fetchCategorias();
    } catch (error) {
      console.error('Erro ao excluir categoria:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível excluir a categoria.',
        variant: 'destructive',
      });
    }
  };

  const filteredCategorias = categorias.filter(categoria =>
    categoria.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (categoria.descricao && categoria.descricao.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const openNewDialog = () => {
    setEditingCategoria(null);
    setFormData({ nome: '', descricao: '', categoria_pai_id: '' });
    setDialogOpen(true);
  };

  const categoriasPrincipais = categorias.filter(c => !c.categoria_pai_id);

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex justify-center items-center h-64">
          <div className="text-lg">Carregando categorias...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Categorias Financeiras</h1>
          <p className="text-muted-foreground">Gerencie as categorias para classificação de contas</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openNewDialog}>
              <Plus className="mr-2 h-4 w-4" />
              Nova Categoria
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingCategoria ? 'Editar Categoria' : 'Nova Categoria'}
              </DialogTitle>
              <DialogDescription>
                {editingCategoria 
                  ? 'Atualize as informações da categoria.' 
                  : 'Preencha os dados para criar uma nova categoria.'
                }
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="nome">Nome *</Label>
                <Input
                  id="nome"
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  placeholder="Ex: Fornecedores, Despesas Operacionais..."
                  required
                />
              </div>
              <div>
                <Label htmlFor="categoria_pai_id">Categoria Pai (opcional)</Label>
                <Select 
                  value={formData.categoria_pai_id} 
                  onValueChange={(value) => setFormData({ ...formData, categoria_pai_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma categoria pai (se for subcategoria)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Nenhuma (categoria principal)</SelectItem>
                    {categoriasPrincipais
                      .filter(c => !editingCategoria || c.id !== editingCategoria.id)
                      .map(c => (
                        <SelectItem key={c.id} value={c.id.toString()}>
                          {c.nome}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="descricao">Descrição</Label>
                <Textarea
                  id="descricao"
                  value={formData.descricao}
                  onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                  placeholder="Descrição opcional da categoria..."
                  rows={3}
                />
              </div>
              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit">
                  {editingCategoria ? 'Atualizar' : 'Criar'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lista de Categorias</CardTitle>
          <CardDescription>
            {categorias.length} categoria(s) cadastrada(s)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2 mb-4">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome ou descrição..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Categoria Pai</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Criado em</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCategorias.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8">
                      {searchTerm ? 'Nenhuma categoria encontrada.' : 'Nenhuma categoria cadastrada.'}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredCategorias.map((categoria) => (
                    <TableRow key={categoria.id}>
                      <TableCell className="font-medium">
                        {categoria.nome}
                        {!categoria.categoria_pai_id && (
                          <Badge variant="outline" className="ml-2 text-xs">Principal</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {categoria.categoria_pai_nome ? (
                          <Badge variant="secondary">{categoria.categoria_pai_nome}</Badge>
                        ) : '-'}
                      </TableCell>
                      <TableCell>{categoria.descricao || '-'}</TableCell>
                      <TableCell>
                        {new Date(categoria.created_at).toLocaleDateString('pt-BR')}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(categoria)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(categoria.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
