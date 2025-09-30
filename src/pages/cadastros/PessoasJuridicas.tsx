import { useState, useEffect } from 'react';
import { Plus, Search, Edit, Trash2, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface PessoaJuridica {
  id: number;
  razao_social: string;
  nome_fantasia?: string;
  cnpj?: string;
  insc_estadual?: string;
  celular?: string;
  email?: string;
  endereco?: string;
  fundacao?: string;
  categoria_id?: number;
  created_at: string;
  updated_at: string;
}

interface CategoriaPJ {
  id: number;
  nome: string;
  descricao?: string;
}

export function PessoasJuridicas() {
  const [pessoas, setPessoas] = useState<PessoaJuridica[]>([]);
  const [categorias, setCategorias] = useState<CategoriaPJ[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPessoa, setEditingPessoa] = useState<PessoaJuridica | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    razao_social: '',
    nome_fantasia: '',
    cnpj: '',
    insc_estadual: '',
    celular: '',
    email: '',
    endereco: '',
    fundacao: '',
    categoria_id: '',
  });

  useEffect(() => {
    fetchPessoas();
    fetchCategorias();
  }, []);

  const fetchPessoas = async () => {
    try {
      const { data, error } = await supabase
        .from('pessoas_juridicas')
        .select('*')
        .order('razao_social');

      if (error) throw error;
      setPessoas(data || []);
    } catch (error) {
      console.error('Erro ao buscar pessoas jurídicas:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar as pessoas jurídicas.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchCategorias = async () => {
    try {
      // Por enquanto, usar categorias financeiras como categorias de PJ
      const { data, error } = await supabase
        .from('categorias_financeiras')
        .select('id, nome')
        .order('nome');

      if (error) throw error;
      setCategorias(data?.map(cat => ({ 
        id: cat.id, 
        nome: cat.nome,
        descricao: undefined 
      })) || []);
    } catch (error) {
      console.error('Erro ao buscar categorias:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validação básica
    if (!formData.razao_social.trim()) {
      toast({
        title: 'Erro',
        description: 'Razão social é obrigatória.',
        variant: 'destructive',
      });
      return;
    }
    
    try {
      const dataToSubmit = {
        razao_social: formData.razao_social.trim(),
        nome_fantasia: formData.nome_fantasia.trim() || null,
        cnpj: formData.cnpj.trim() || null,
        insc_estadual: formData.insc_estadual.trim() || null,
        celular: formData.celular.trim() || null,
        email: formData.email.trim() || null,
        endereco: formData.endereco.trim() || null,
        fundacao: formData.fundacao || null,
        categoria_id: formData.categoria_id ? parseInt(formData.categoria_id) : null,
      };

      if (editingPessoa) {
        const { error } = await supabase
          .from('pessoas_juridicas')
          .update(dataToSubmit)
          .eq('id', editingPessoa.id);

        if (error) throw error;

        toast({
          title: 'Sucesso',
          description: 'Pessoa jurídica atualizada com sucesso.',
        });
      } else {
        const { error } = await supabase
          .from('pessoas_juridicas')
          .insert([dataToSubmit]);

        if (error) throw error;

        toast({
          title: 'Sucesso',
          description: 'Pessoa jurídica cadastrada com sucesso.',
        });
      }

      setIsDialogOpen(false);
      setEditingPessoa(null);
      resetForm();
      fetchPessoas();
    } catch (error) {
      console.error('Erro ao salvar pessoa jurídica:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível salvar a pessoa jurídica.',
        variant: 'destructive',
      });
    }
  };

  const handleEdit = (pessoa: PessoaJuridica) => {
    setEditingPessoa(pessoa);
    setFormData({
      razao_social: pessoa.razao_social,
      nome_fantasia: pessoa.nome_fantasia || '',
      cnpj: pessoa.cnpj || '',
      insc_estadual: pessoa.insc_estadual || '',
      celular: pessoa.celular || '',
      email: pessoa.email || '',
      endereco: pessoa.endereco || '',
      fundacao: pessoa.fundacao || '',
      categoria_id: pessoa.categoria_id?.toString() || '',
    });
    
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Tem certeza que deseja excluir esta pessoa jurídica?')) return;

    try {
      const { error } = await supabase
        .from('pessoas_juridicas')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Sucesso',
        description: 'Pessoa jurídica excluída com sucesso.',
      });
      fetchPessoas();
    } catch (error) {
      console.error('Erro ao excluir pessoa jurídica:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível excluir a pessoa jurídica.',
        variant: 'destructive',
      });
    }
  };

  const resetForm = () => {
    setFormData({
      razao_social: '',
      nome_fantasia: '',
      cnpj: '',
      insc_estadual: '',
      celular: '',
      email: '',
      endereco: '',
      fundacao: '',
      categoria_id: '',
    });
  };

  const filteredPessoas = pessoas.filter(pessoa =>
    pessoa.razao_social.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (pessoa.nome_fantasia && pessoa.nome_fantasia.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (pessoa.cnpj && pessoa.cnpj.includes(searchTerm))
  );

  if (loading) {
    return <div>Carregando...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Pessoas Jurídicas</h1>
          <p className="text-muted-foreground">
            Gerencie empresas, fornecedores e clientes
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => { resetForm(); setEditingPessoa(null); }}>
              <Plus className="mr-2 h-4 w-4" />
              Nova Pessoa Jurídica
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingPessoa ? 'Editar Pessoa Jurídica' : 'Nova Pessoa Jurídica'}
              </DialogTitle>
              <DialogDescription>
                Preencha as informações da empresa
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="razao_social">Razão Social *</Label>
                  <Input
                    id="razao_social"
                    value={formData.razao_social}
                    onChange={(e) => setFormData({ ...formData, razao_social: e.target.value })}
                    placeholder="Nome da empresa"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="nome_fantasia">Nome Fantasia</Label>
                  <Input
                    id="nome_fantasia"
                    value={formData.nome_fantasia}
                    onChange={(e) => setFormData({ ...formData, nome_fantasia: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="cnpj">CNPJ</Label>
                  <Input
                    id="cnpj"
                    value={formData.cnpj}
                    onChange={(e) => setFormData({ ...formData, cnpj: e.target.value })}
                    placeholder="00.000.000/0000-00"
                  />
                </div>
                <div>
                  <Label htmlFor="insc_estadual">Inscrição Estadual</Label>
                  <Input
                    id="insc_estadual"
                    value={formData.insc_estadual}
                    onChange={(e) => setFormData({ ...formData, insc_estadual: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="celular">Celular</Label>
                  <Input
                    id="celular"
                    value={formData.celular}
                    onChange={(e) => setFormData({ ...formData, celular: e.target.value })}
                    placeholder="(00) 00000-0000"
                  />
                </div>
                <div>
                  <Label htmlFor="email">E-mail</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="fundacao">Data de Fundação</Label>
                  <Input
                    id="fundacao"
                    type="date"
                    value={formData.fundacao}
                    onChange={(e) => setFormData({ ...formData, fundacao: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="categoria_id">Categoria</Label>
                  <Select value={formData.categoria_id} onValueChange={(value) => setFormData({ ...formData, categoria_id: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione uma categoria" />
                    </SelectTrigger>
                    <SelectContent>
                      {categorias.map((categoria) => (
                        <SelectItem key={categoria.id} value={categoria.id.toString()}>
                          {categoria.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label htmlFor="endereco">Endereço</Label>
                <Textarea
                  id="endereco"
                  value={formData.endereco}
                  onChange={(e) => setFormData({ ...formData, endereco: e.target.value })}
                  placeholder="Endereço completo"
                />
              </div>
              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit">
                  {editingPessoa ? 'Atualizar' : 'Cadastrar'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lista de Pessoas Jurídicas</CardTitle>
          <CardDescription>
            {filteredPessoas.length} {filteredPessoas.length === 1 ? 'empresa cadastrada' : 'empresas cadastradas'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2 mb-4">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por razão social, nome fantasia ou CNPJ..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
          </div>
          
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Razão Social</TableHead>
                <TableHead>Nome Fantasia</TableHead>
                <TableHead>CNPJ</TableHead>
                <TableHead>E-mail</TableHead>
                <TableHead>Celular</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPessoas.map((pessoa) => (
                <TableRow key={pessoa.id}>
                  <TableCell className="font-medium">{pessoa.razao_social}</TableCell>
                  <TableCell>{pessoa.nome_fantasia || '-'}</TableCell>
                  <TableCell>{pessoa.cnpj || '-'}</TableCell>
                  <TableCell>{pessoa.email || '-'}</TableCell>
                  <TableCell>{pessoa.celular || '-'}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(pessoa)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(pessoa.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filteredPessoas.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    Nenhuma pessoa jurídica encontrada
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}