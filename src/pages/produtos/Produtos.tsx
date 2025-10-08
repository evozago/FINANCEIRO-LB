import { useState, useEffect } from 'react';
import { Plus, Search, Edit, Trash2, Package, Eye, Palette, Ruler } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CurrencyInput } from '@/components/ui/currency-input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface Produto {
  id: number;
  nome: string;
  descricao?: string;
  categoria?: string;
  genero?: string;
  faixa_etaria?: string;
  tipo_manga?: string;
  unidade_medida?: string;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

interface Cor {
  id: number;
  nome: string;
  hex_code?: string;
}

interface Tamanho {
  id: number;
  nome: string;
  ordem?: number;
}

interface ProdutoGrade {
  id: number;
  produto_id: number;
  cor_id?: number;
  tamanho_id?: number;
  sku?: string;
  custo_centavos?: number;
  preco_venda_centavos?: number;
  estoque: number;
  cores?: Cor;
  tamanhos?: Tamanho;
}

const categoriaOptions = [
  'Conjunto', 'Vestido', 'Blusa', 'Bermuda', 'Short', 'Camisa', 
  'Salopete', 'Jardineira', 'Sunga', 'Maiô', 'Biquíni', 'Meia', 
  'Cueca', 'Calcinha', 'Meia Calça', 'Laço', 'Calçado'
];

const generoOptions = ['Menino', 'Menina', 'Unissex'];
const faixaEtariaOptions = ['Bebê (0-12 meses)', 'Infantil (1-6 anos)', 'Juvenil (7+ anos)'];
const tipoMangaOptions = ['Manga Longa', 'Manga Curta', 'Sem Manga'];

export function Produtos() {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [cores, setCores] = useState<Cor[]>([]);
  const [tamanhos, setTamanhos] = useState<Tamanho[]>([]);
  const [produtoGrades, setProdutoGrades] = useState<ProdutoGrade[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isGradeDialogOpen, setIsGradeDialogOpen] = useState(false);
  const [editingProduto, setEditingProduto] = useState<Produto | null>(null);
  const [selectedProduto, setSelectedProduto] = useState<Produto | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    nome: '',
    descricao: '',
    categoria: '',
    genero: '',
    faixa_etaria: '',
    tipo_manga: '',
    unidade_medida: 'UN',
    ativo: true,
  });

  const [gradeFormData, setGradeFormData] = useState({
    cor_id: '',
    tamanho_id: '',
    sku: '',
    custo_centavos: 0,
    preco_venda_centavos: 0,
    estoque: 0,
  });

  const [newCor, setNewCor] = useState({ nome: '', hex_code: '' });
  const [newTamanho, setNewTamanho] = useState({ nome: '', ordem: 0 });

  useEffect(() => {
    fetchProdutos();
    fetchCores();
    fetchTamanhos();
  }, []);

  const fetchProdutos = async () => {
    try {
      const { data, error } = (await supabase
        .from('produtos' as any)
        .select('*')
        .order('created_at', { ascending: false })) as any;

      if (error) throw error;
      setProdutos((data || []) as Produto[]);
    } catch (error) {
      console.error('Erro ao buscar produtos:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os produtos.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchCores = async () => {
    try {
      const { data, error } = (await supabase
        .from('cores' as any)
        .select('*')
        .order('nome')) as any;

      if (error) throw error;
      setCores((data || []) as Cor[]);
    } catch (error) {
      console.error('Erro ao buscar cores:', error);
    }
  };

  const fetchTamanhos = async () => {
    try {
      const { data, error } = (await supabase
        .from('tamanhos' as any)
        .select('*')
        .order('ordem', { ascending: true })) as any;

      if (error) throw error;
      setTamanhos((data || []) as Tamanho[]);
    } catch (error) {
      console.error('Erro ao buscar tamanhos:', error);
    }
  };

  const fetchProdutoGrades = async (produtoId: number) => {
    try {
      const { data, error } = (await supabase
        .from('produto_grades' as any)
        .select(`
          *,
          cores(id, nome, hex_code),
          tamanhos(id, nome, ordem)
        `)
        .eq('produto_id', produtoId)) as any;

      if (error) throw error;
      setProdutoGrades((data || []) as any);
    } catch (error) {
      console.error('Erro ao buscar grades do produto:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingProduto) {
        const { error } = (await supabase
          .from('produtos' as any)
          .update(formData)
          .eq('id', editingProduto.id)) as any;

        if (error) throw error;

        toast({
          title: 'Sucesso',
          description: 'Produto atualizado com sucesso.',
        });
      } else {
        const { error } = (await supabase
          .from('produtos' as any)
          .insert([formData])) as any;

        if (error) throw error;

        toast({
          title: 'Sucesso',
          description: 'Produto cadastrado com sucesso.',
        });
      }

      setIsDialogOpen(false);
      setEditingProduto(null);
      resetForm();
      fetchProdutos();
    } catch (error) {
      console.error('Erro ao salvar produto:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível salvar o produto.',
        variant: 'destructive',
      });
    }
  };

  const handleGradeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedProduto) return;

    try {
      const dataToSubmit = {
        produto_id: selectedProduto.id,
        cor_id: gradeFormData.cor_id ? parseInt(gradeFormData.cor_id) : null,
        tamanho_id: gradeFormData.tamanho_id ? parseInt(gradeFormData.tamanho_id) : null,
        sku: gradeFormData.sku || null,
        custo_centavos: gradeFormData.custo_centavos || null,
        preco_venda_centavos: gradeFormData.preco_venda_centavos || null,
        estoque: gradeFormData.estoque || 0,
      };

      const { error } = (await supabase
        .from('produto_grades' as any)
        .insert([dataToSubmit])) as any;

      if (error) throw error;

      toast({
        title: 'Sucesso',
        description: 'Grade adicionada com sucesso.',
      });

      resetGradeForm();
      fetchProdutoGrades(selectedProduto.id);
    } catch (error) {
      console.error('Erro ao salvar grade:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível salvar a grade.',
        variant: 'destructive',
      });
    }
  };

  const handleEdit = (produto: Produto) => {
    setEditingProduto(produto);
    setFormData({
      nome: produto.nome,
      descricao: produto.descricao || '',
      categoria: produto.categoria || '',
      genero: produto.genero || '',
      faixa_etaria: produto.faixa_etaria || '',
      tipo_manga: produto.tipo_manga || '',
      unidade_medida: produto.unidade_medida || 'UN',
      ativo: produto.ativo,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Tem certeza que deseja excluir este produto?')) return;

    try {
      const { error } = (await supabase
        .from('produtos' as any)
        .delete()
        .eq('id', id)) as any;

      if (error) throw error;

      toast({
        title: 'Sucesso',
        description: 'Produto excluído com sucesso.',
      });
      fetchProdutos();
    } catch (error) {
      console.error('Erro ao excluir produto:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível excluir o produto.',
        variant: 'destructive',
      });
    }
  };

  const handleGerenciarGrades = (produto: Produto) => {
    setSelectedProduto(produto);
    fetchProdutoGrades(produto.id);
    setIsGradeDialogOpen(true);
  };

  const addCor = async () => {
    if (!newCor.nome) return;

    try {
      const { error } = (await supabase
        .from('cores' as any)
        .insert([newCor])) as any;

      if (error) throw error;

      toast({
        title: 'Sucesso',
        description: 'Cor adicionada com sucesso.',
      });

      setNewCor({ nome: '', hex_code: '' });
      fetchCores();
    } catch (error) {
      console.error('Erro ao adicionar cor:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível adicionar a cor.',
        variant: 'destructive',
      });
    }
  };

  const addTamanho = async () => {
    if (!newTamanho.nome) return;

    try {
      const { error } = (await supabase
        .from('tamanhos' as any)
        .insert([newTamanho])) as any;

      if (error) throw error;

      toast({
        title: 'Sucesso',
        description: 'Tamanho adicionado com sucesso.',
      });

      setNewTamanho({ nome: '', ordem: 0 });
      fetchTamanhos();
    } catch (error) {
      console.error('Erro ao adicionar tamanho:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível adicionar o tamanho.',
        variant: 'destructive',
      });
    }
  };

  const resetForm = () => {
    setFormData({
      nome: '',
      descricao: '',
      categoria: '',
      genero: '',
      faixa_etaria: '',
      tipo_manga: '',
      unidade_medida: 'UN',
      ativo: true,
    });
  };

  const resetGradeForm = () => {
    setGradeFormData({
      cor_id: '',
      tamanho_id: '',
      sku: '',
      custo_centavos: 0,
      preco_venda_centavos: 0,
      estoque: 0,
    });
  };

  const formatCurrency = (centavos: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(centavos / 100);
  };

  const filteredProdutos = produtos.filter(produto =>
    produto.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    produto.categoria?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    produto.genero?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return <div>Carregando...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Produtos</h1>
          <p className="text-muted-foreground">
            Gerencie os produtos com grades de cor e tamanho
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => { resetForm(); setEditingProduto(null); }}>
              <Plus className="mr-2 h-4 w-4" />
              Novo Produto
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingProduto ? 'Editar Produto' : 'Novo Produto'}
              </DialogTitle>
              <DialogDescription>
                Preencha as informações do produto
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label htmlFor="nome">Nome do Produto</Label>
                  <Input
                    id="nome"
                    value={formData.nome}
                    onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                    placeholder="Digite o nome do produto"
                  />
                </div>
                
                <div className="col-span-2">
                  <Label htmlFor="descricao">Descrição</Label>
                  <Textarea
                    id="descricao"
                    value={formData.descricao}
                    onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                    placeholder="Descrição detalhada do produto"
                  />
                </div>

                <div>
                  <Label htmlFor="categoria">Categoria</Label>
                  <Select value={formData.categoria} onValueChange={(value) => setFormData({ ...formData, categoria: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione uma categoria" />
                    </SelectTrigger>
                    <SelectContent>
                      {categoriaOptions.map((categoria) => (
                        <SelectItem key={categoria} value={categoria}>
                          {categoria}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="genero">Gênero</Label>
                  <Select value={formData.genero} onValueChange={(value) => setFormData({ ...formData, genero: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o gênero" />
                    </SelectTrigger>
                    <SelectContent>
                      {generoOptions.map((genero) => (
                        <SelectItem key={genero} value={genero}>
                          {genero}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="faixa_etaria">Faixa Etária</Label>
                  <Select value={formData.faixa_etaria} onValueChange={(value) => setFormData({ ...formData, faixa_etaria: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a faixa etária" />
                    </SelectTrigger>
                    <SelectContent>
                      {faixaEtariaOptions.map((faixa) => (
                        <SelectItem key={faixa} value={faixa}>
                          {faixa}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="tipo_manga">Tipo de Manga</Label>
                  <Select value={formData.tipo_manga} onValueChange={(value) => setFormData({ ...formData, tipo_manga: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o tipo de manga" />
                    </SelectTrigger>
                    <SelectContent>
                      {tipoMangaOptions.map((tipo) => (
                        <SelectItem key={tipo} value={tipo}>
                          {tipo}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit">
                  {editingProduto ? 'Atualizar' : 'Cadastrar'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lista de Produtos</CardTitle>
          <CardDescription>
            {produtos.length} produtos cadastrados
          </CardDescription>
          <div className="flex items-center space-x-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar produtos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Gênero</TableHead>
                <TableHead>Faixa Etária</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProdutos.map((produto) => (
                <TableRow key={produto.id}>
                  <TableCell className="font-medium">{produto.nome}</TableCell>
                  <TableCell>{produto.categoria || '-'}</TableCell>
                  <TableCell>{produto.genero || '-'}</TableCell>
                  <TableCell>{produto.faixa_etaria || '-'}</TableCell>
                  <TableCell>
                    <Badge variant={produto.ativo ? 'default' : 'secondary'}>
                      {produto.ativo ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleGerenciarGrades(produto)}
                      >
                        <Package className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(produto)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(produto.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Dialog para Gerenciar Grades */}
      <Dialog open={isGradeDialogOpen} onOpenChange={setIsGradeDialogOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Gerenciar Grades - {selectedProduto?.nome}
            </DialogTitle>
            <DialogDescription>
              Gerencie as variações de cor, tamanho, custo e preço do produto
            </DialogDescription>
          </DialogHeader>
          
          <Tabs defaultValue="grades" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="grades">Grades</TabsTrigger>
              <TabsTrigger value="cores">Cores</TabsTrigger>
              <TabsTrigger value="tamanhos">Tamanhos</TabsTrigger>
            </TabsList>
            
            <TabsContent value="grades" className="space-y-4">
              <form onSubmit={handleGradeSubmit} className="space-y-4 p-4 border rounded-lg">
                <h3 className="text-lg font-semibold">Adicionar Nova Grade</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="cor_id">Cor</Label>
                    <Select value={gradeFormData.cor_id} onValueChange={(value) => setGradeFormData({ ...gradeFormData, cor_id: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione uma cor" />
                      </SelectTrigger>
                      <SelectContent>
                        {cores.map((cor) => (
                          <SelectItem key={cor.id} value={cor.id.toString()}>
                            <div className="flex items-center space-x-2">
                              {cor.hex_code && (
                                <div 
                                  className="w-4 h-4 rounded-full border" 
                                  style={{ backgroundColor: cor.hex_code }}
                                />
                              )}
                              <span>{cor.nome}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="tamanho_id">Tamanho</Label>
                    <Select value={gradeFormData.tamanho_id} onValueChange={(value) => setGradeFormData({ ...gradeFormData, tamanho_id: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um tamanho" />
                      </SelectTrigger>
                      <SelectContent>
                        {tamanhos.map((tamanho) => (
                          <SelectItem key={tamanho.id} value={tamanho.id.toString()}>
                            {tamanho.nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="sku">SKU</Label>
                    <Input
                      id="sku"
                      value={gradeFormData.sku}
                      onChange={(e) => setGradeFormData({ ...gradeFormData, sku: e.target.value })}
                      placeholder="Código SKU"
                    />
                  </div>

                  <div>
                    <Label htmlFor="custo">Custo</Label>
                    <CurrencyInput
                      value={gradeFormData.custo_centavos}
                      onValueChange={(value) => setGradeFormData({ ...gradeFormData, custo_centavos: value })}
                      placeholder="R$ 0,00"
                    />
                  </div>

                  <div>
                    <Label htmlFor="preco_venda">Preço de Venda</Label>
                    <CurrencyInput
                      value={gradeFormData.preco_venda_centavos}
                      onValueChange={(value) => setGradeFormData({ ...gradeFormData, preco_venda_centavos: value })}
                      placeholder="R$ 0,00"
                    />
                  </div>

                  <div>
                    <Label htmlFor="estoque">Estoque</Label>
                    <Input
                      id="estoque"
                      type="number"
                      value={gradeFormData.estoque}
                      onChange={(e) => setGradeFormData({ ...gradeFormData, estoque: parseInt(e.target.value) || 0 })}
                      placeholder="0"
                    />
                  </div>
                </div>
                <Button type="submit">Adicionar Grade</Button>
              </form>

              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Grades Cadastradas</h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Cor</TableHead>
                      <TableHead>Tamanho</TableHead>
                      <TableHead>SKU</TableHead>
                      <TableHead>Custo</TableHead>
                      <TableHead>Preço Venda</TableHead>
                      <TableHead>Estoque</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {produtoGrades.map((grade) => (
                      <TableRow key={grade.id}>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            {grade.cores?.hex_code && (
                              <div 
                                className="w-4 h-4 rounded-full border" 
                                style={{ backgroundColor: grade.cores.hex_code }}
                              />
                            )}
                            <span>{grade.cores?.nome || '-'}</span>
                          </div>
                        </TableCell>
                        <TableCell>{grade.tamanhos?.nome || '-'}</TableCell>
                        <TableCell>{grade.sku || '-'}</TableCell>
                        <TableCell>
                          {grade.custo_centavos ? formatCurrency(grade.custo_centavos) : '-'}
                        </TableCell>
                        <TableCell>
                          {grade.preco_venda_centavos ? formatCurrency(grade.preco_venda_centavos) : '-'}
                        </TableCell>
                        <TableCell>{grade.estoque}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>
            
            <TabsContent value="cores" className="space-y-4">
              <div className="p-4 border rounded-lg">
                <h3 className="text-lg font-semibold mb-4">Adicionar Nova Cor</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="cor_nome">Nome da Cor</Label>
                    <Input
                      id="cor_nome"
                      value={newCor.nome}
                      onChange={(e) => setNewCor({ ...newCor, nome: e.target.value })}
                      placeholder="Ex: Azul Royal"
                    />
                  </div>
                  <div>
                    <Label htmlFor="cor_hex">Código Hex</Label>
                    <Input
                      id="cor_hex"
                      value={newCor.hex_code}
                      onChange={(e) => setNewCor({ ...newCor, hex_code: e.target.value })}
                      placeholder="#0066CC"
                    />
                  </div>
                  <div className="flex items-end">
                    <Button onClick={addCor}>
                      <Palette className="mr-2 h-4 w-4" />
                      Adicionar
                    </Button>
                  </div>
                </div>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cor</TableHead>
                    <TableHead>Nome</TableHead>
                    <TableHead>Código Hex</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cores.map((cor) => (
                    <TableRow key={cor.id}>
                      <TableCell>
                        {cor.hex_code && (
                          <div 
                            className="w-8 h-8 rounded-full border" 
                            style={{ backgroundColor: cor.hex_code }}
                          />
                        )}
                      </TableCell>
                      <TableCell>{cor.nome}</TableCell>
                      <TableCell>{cor.hex_code || '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TabsContent>
            
            <TabsContent value="tamanhos" className="space-y-4">
              <div className="p-4 border rounded-lg">
                <h3 className="text-lg font-semibold mb-4">Adicionar Novo Tamanho</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="tamanho_nome">Nome do Tamanho</Label>
                    <Input
                      id="tamanho_nome"
                      value={newTamanho.nome}
                      onChange={(e) => setNewTamanho({ ...newTamanho, nome: e.target.value })}
                      placeholder="Ex: P, M, G, 36, 38"
                    />
                  </div>
                  <div>
                    <Label htmlFor="tamanho_ordem">Ordem</Label>
                    <Input
                      id="tamanho_ordem"
                      type="number"
                      value={newTamanho.ordem}
                      onChange={(e) => setNewTamanho({ ...newTamanho, ordem: parseInt(e.target.value) || 0 })}
                      placeholder="1, 2, 3..."
                    />
                  </div>
                  <div className="flex items-end">
                    <Button onClick={addTamanho}>
                      <Ruler className="mr-2 h-4 w-4" />
                      Adicionar
                    </Button>
                  </div>
                </div>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Ordem</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tamanhos.map((tamanho) => (
                    <TableRow key={tamanho.id}>
                      <TableCell>{tamanho.nome}</TableCell>
                      <TableCell>{tamanho.ordem || '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </div>
  );
}
