import { useState, useEffect } from 'react';
import { Plus, Search, Edit, Trash2, FolderOpen, FolderTree, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

type TipoCategoria = 'materia_prima' | 'consumo_interno' | 'revenda' | 'servico' | 'outros';

interface Categoria {
  id: number;
  nome: string;
  tipo: TipoCategoria;
  descricao?: string;
  categoria_pai_id?: number | null;
  categoria_pai_nome?: string;
  created_at: string;
  updated_at: string;
  total_contas?: number;
}

export function Categorias() {
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCategoria, setEditingCategoria] = useState<Categoria | null>(null);
  const [formData, setFormData] = useState({
    nome: '',
    tipo: 'outros' as TipoCategoria,
    descricao: '',
    categoria_pai_id: ''
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchCategorias();
  }, []);

  const fetchCategorias = async () => {
    try {
      // Buscar categorias com contagem de uso
      const { data, error } = await supabase
        .from('categorias_financeiras')
        .select(`
          *,
          categoria_pai:categoria_pai_id (
            id,
            nome
          )
        `)
        .order('tipo')
        .order('nome');

      if (error) throw error;
      
      // Buscar contagem de contas por categoria
      const { data: contasData } = await supabase
        .from('contas_pagar')
        .select('categoria_id');
      
      const contagemPorCategoria = (contasData || []).reduce((acc, conta) => {
        if (conta.categoria_id) {
          acc[conta.categoria_id] = (acc[conta.categoria_id] || 0) + 1;
        }
        return acc;
      }, {} as Record<number, number>);
      
      const categoriasFormatadas = (data || []).map(cat => ({
        ...cat,
        categoria_pai_nome: cat.categoria_pai?.nome,
        total_contas: contagemPorCategoria[cat.id] || 0
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
      // Validação: não permitir nomes duplicados
      const { data: existente } = await supabase
        .from('categorias_financeiras')
        .select('id')
        .eq('nome', formData.nome.trim())
        .neq('id', editingCategoria?.id || 0)
        .maybeSingle();
      
      if (existente) {
        toast({
          title: 'Erro',
          description: 'Já existe uma categoria com este nome.',
          variant: 'destructive',
        });
        return;
      }

      // Validação: não permitir 3 níveis de hierarquia
      if (formData.categoria_pai_id) {
        const categoriaPai = categorias.find(c => c.id === parseInt(formData.categoria_pai_id));
        if (categoriaPai?.categoria_pai_id) {
          toast({
            title: 'Erro',
            description: 'Não é permitido criar mais de 2 níveis de hierarquia. Esta categoria já é uma subcategoria.',
            variant: 'destructive',
          });
          return;
        }
      }

      if (editingCategoria) {
        const { error } = await supabase
          .from('categorias_financeiras')
          .update({
            nome: formData.nome.trim(),
            tipo: formData.tipo,
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
            nome: formData.nome.trim(),
            tipo: formData.tipo,
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
      setFormData({ nome: '', tipo: 'outros', descricao: '', categoria_pai_id: '' });
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
      tipo: categoria.tipo || 'outros',
      descricao: categoria.descricao || '',
      categoria_pai_id: categoria.categoria_pai_id?.toString() || ''
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: number) => {
    const categoria = categorias.find(c => c.id === id);
    
    // Validação: não permitir excluir categoria em uso
    if (categoria && categoria.total_contas && categoria.total_contas > 0) {
      toast({
        title: 'Erro',
        description: `Esta categoria está sendo usada em ${categoria.total_contas} conta(s). Não é possível excluí-la.`,
        variant: 'destructive',
      });
      return;
    }

    // Validação: verificar se tem subcategorias
    const temFilhas = categorias.some(c => c.categoria_pai_id === id);
    if (temFilhas) {
      toast({
        title: 'Erro',
        description: 'Esta categoria possui subcategorias. Exclua ou mova as subcategorias primeiro.',
        variant: 'destructive',
      });
      return;
    }

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
    setFormData({ nome: '', tipo: 'outros', descricao: '', categoria_pai_id: '' });
    setDialogOpen(true);
  };

  const categoriasPrincipais = categorias.filter(c => !c.categoria_pai_id);

  const getTipoLabel = (tipo: TipoCategoria) => {
    const labels = {
      materia_prima: 'Matéria Prima',
      consumo_interno: 'Consumo Interno',
      revenda: 'Revenda',
      servico: 'Serviço',
      outros: 'Outros'
    };
    return labels[tipo];
  };

  const getTipoBadgeVariant = (tipo: TipoCategoria): "default" | "secondary" | "destructive" | "outline" => {
    const variants = {
      materia_prima: 'default' as const,
      consumo_interno: 'destructive' as const,
      revenda: 'secondary' as const,
      servico: 'outline' as const,
      outros: 'outline' as const
    };
    return variants[tipo];
  };

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
                <Label>Tipo *</Label>
                <RadioGroup 
                  value={formData.tipo} 
                  onValueChange={(value) => setFormData({ ...formData, tipo: value as TipoCategoria })}
                  className="flex flex-col space-y-2 mt-2"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="materia_prima" id="tipo-materia-prima" />
                    <Label htmlFor="tipo-materia-prima" className="font-normal cursor-pointer">
                      Matéria Prima
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="consumo_interno" id="tipo-consumo-interno" />
                    <Label htmlFor="tipo-consumo-interno" className="font-normal cursor-pointer">
                      Consumo Interno
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="revenda" id="tipo-revenda" />
                    <Label htmlFor="tipo-revenda" className="font-normal cursor-pointer">
                      Revenda
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="servico" id="tipo-servico" />
                    <Label htmlFor="tipo-servico" className="font-normal cursor-pointer">
                      Serviço
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="outros" id="tipo-outros" />
                    <Label htmlFor="tipo-outros" className="font-normal cursor-pointer">
                      Outros
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              <div>
                <Label htmlFor="categoria_pai_id">Categoria Pai (opcional)</Label>
                <Select 
                  value={formData.categoria_pai_id || "none"} 
                  onValueChange={(value) => setFormData({ ...formData, categoria_pai_id: value === "none" ? "" : value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma categoria pai (se for subcategoria)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhuma (categoria principal)</SelectItem>
                    {categoriasPrincipais
                      .filter(c => !editingCategoria || c.id !== editingCategoria.id)
                      .map(c => (
                        <SelectItem key={c.id} value={c.id.toString()}>
                          {c.nome}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  Máximo de 2 níveis de hierarquia permitidos
                </p>
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
                  <TableHead>Tipo</TableHead>
                  <TableHead>Hierarquia</TableHead>
                  <TableHead>Uso</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCategorias.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      {searchTerm ? 'Nenhuma categoria encontrada.' : 'Nenhuma categoria cadastrada.'}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredCategorias.map((categoria) => {
                    const isSubcategoria = !!categoria.categoria_pai_id;
                    return (
                      <TableRow key={categoria.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            {isSubcategoria && (
                              <span className="ml-4 text-muted-foreground">└─</span>
                            )}
                            {isSubcategoria ? (
                              <FolderTree className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <FolderOpen className="h-4 w-4 text-primary" />
                            )}
                            {categoria.nome}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={getTipoBadgeVariant(categoria.tipo)}>
                            {getTipoLabel(categoria.tipo)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {categoria.categoria_pai_nome ? (
                            <Badge variant="secondary" className="text-xs">
                              {categoria.categoria_pai_nome}
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs">Principal</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {categoria.total_contas && categoria.total_contas > 0 ? (
                            <Badge variant="default" className="text-xs">
                              {categoria.total_contas} conta(s)
                            </Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">Não utilizada</span>
                          )}
                        </TableCell>
                        <TableCell className="max-w-xs truncate">
                          {categoria.descricao || '-'}
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
                              disabled={!!categoria.total_contas && categoria.total_contas > 0}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
