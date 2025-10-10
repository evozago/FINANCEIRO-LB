import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Edit, Trash2, Tag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Marca {
  id: number;
  nome: string;
  descricao?: string;
  pj_vinculada_id?: number;
  created_at: string;
  pessoas_juridicas?: {
    nome_fantasia?: string;
    razao_social: string;
    cnpj?: string;
  };
}

interface PessoaJuridica {
  id: number;
  nome_fantasia?: string;
  razao_social: string;
  cnpj?: string;
}

export function Marcas() {
  const navigate = useNavigate();
  const [marcas, setMarcas] = useState<Marca[]>([]);
  const [pessoasJuridicas, setPessoasJuridicas] = useState<PessoaJuridica[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingMarca, setEditingMarca] = useState<Marca | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    nome: '',
    descricao: '',
    pj_vinculada_id: '',
  });

  useEffect(() => {
    fetchMarcas();
    fetchPessoasJuridicas();
  }, []);

  const fetchMarcas = async () => {
    try {
      const { data, error } = await supabase
        .from('marcas')
        .select(`
          *,
          pessoas_juridicas!pj_vinculada_id(nome_fantasia, razao_social, cnpj)
        `)
        .order('nome');

      if (error) throw error;

      // Transformar os dados para o formato esperado
      const marcasFormatadas = (data || []).map(marca => {
        const pjData = Array.isArray(marca.pessoas_juridicas) 
          ? marca.pessoas_juridicas[0] 
          : marca.pessoas_juridicas;
        
        return {
          ...marca,
          pessoas_juridicas: pjData ? {
            nome_fantasia: (pjData as any).nome_fantasia || '',
            razao_social: (pjData as any).razao_social || '',
            cnpj: (pjData as any).cnpj || ''
          } : null
        };
      });

      setMarcas(marcasFormatadas as any);
    } catch (error) {
      console.error('Erro ao buscar marcas:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar as marcas.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchPessoasJuridicas = async () => {
    try {
      const { data, error } = await supabase
        .from('pessoas_juridicas')
        .select('id, nome_fantasia, razao_social, cnpj')
        .order('razao_social');

      if (error) throw error;
      setPessoasJuridicas(data || []);
    } catch (error) {
      console.error('Erro ao buscar pessoas jurídicas:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const dataToSubmit = {
        nome: formData.nome,
        descricao: formData.descricao || null,
        pj_vinculada_id: formData.pj_vinculada_id ? parseInt(formData.pj_vinculada_id) : null,
      };

      if (editingMarca) {
        const { error } = await supabase
          .from('marcas')
          .update(dataToSubmit)
          .eq('id', editingMarca.id);

        if (error) throw error;

        toast({
          title: 'Sucesso',
          description: 'Marca atualizada com sucesso.',
        });
      } else {
        const { error } = await supabase
          .from('marcas')
          .insert([dataToSubmit]);

        if (error) throw error;

        toast({
          title: 'Sucesso',
          description: 'Marca cadastrada com sucesso.',
        });
      }

      setIsDialogOpen(false);
      setEditingMarca(null);
      resetForm();
      fetchMarcas();
    } catch (error) {
      console.error('Erro ao salvar marca:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível salvar a marca.',
        variant: 'destructive',
      });
    }
  };

  const handleEdit = (marca: Marca) => {
    setEditingMarca(marca);
    setFormData({
      nome: marca.nome,
      descricao: marca.descricao || '',
      pj_vinculada_id: marca.pj_vinculada_id !== undefined && marca.pj_vinculada_id !== null ? String(marca.pj_vinculada_id) : '',
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Tem certeza que deseja excluir esta marca?')) return;

    try {
      const { error } = await supabase
        .from('marcas')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Sucesso',
        description: 'Marca excluída com sucesso.',
      });
      fetchMarcas();
    } catch (error) {
      console.error('Erro ao excluir marca:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível excluir a marca.',
        variant: 'destructive',
      });
    }
  };

  const resetForm = () => {
    setFormData({
      nome: '',
      descricao: '',
      pj_vinculada_id: '',
    });
  };

  const filteredMarcas = marcas.filter(marca =>
    marca.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (marca.descricao && marca.descricao.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (marca.pessoas_juridicas?.nome_fantasia && marca.pessoas_juridicas.nome_fantasia.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (marca.pessoas_juridicas?.razao_social && marca.pessoas_juridicas.razao_social.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (loading) {
    return <div>Carregando...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Marcas</h1>
          <p className="text-muted-foreground">
            Gerencie as marcas de produtos e suas vinculações
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => { 
              resetForm(); 
              setEditingMarca(null); 
              setIsDialogOpen(true);
            }}>
              <Plus className="mr-2 h-4 w-4" />
              Nova Marca
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingMarca ? 'Editar Marca' : 'Nova Marca'}
              </DialogTitle>
              <DialogDescription>
                Preencha os dados da marca
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="nome">Nome da Marca</Label>
                <Input
                  id="nome"
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  placeholder="Ex: Nike, Adidas, Samsung..."
                />
              </div>
              <div>
                <Label htmlFor="pj_vinculada_id">Empresa Vinculada</Label>
                <select
                  id="pj_vinculada_id"
                  value={formData.pj_vinculada_id}
                  onChange={(e) => setFormData({ ...formData, pj_vinculada_id: e.target.value })}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="">Selecione uma empresa (opcional)</option>
                  {pessoasJuridicas.map((pj) => (
                    <option key={pj.id} value={pj.id.toString()}>
                      {pj.nome_fantasia || pj.razao_social}
                    </option>
                  ))}
                </select>
                <p className="text-sm text-muted-foreground mt-1">
                  Vincule a marca a uma empresa para associação automática
                </p>
              </div>
              <div>
                <Label htmlFor="descricao">Descrição</Label>
                <Textarea
                  id="descricao"
                  value={formData.descricao}
                  onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                  placeholder="Descrição opcional da marca..."
                  rows={3}
                />
              </div>
              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit">
                  {editingMarca ? 'Atualizar' : 'Cadastrar'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Buscar Marcas</CardTitle>
          <CardDescription>
            Use o campo abaixo para filtrar as marcas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, descrição ou empresa vinculada..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Lista de Marcas</CardTitle>
          <CardDescription>
            {filteredMarcas.length} marca(s) encontrada(s)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Empresa Vinculada</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Data de Criação</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredMarcas.map((marca) => (
                <TableRow key={marca.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center space-x-2">
                      <Tag className="h-4 w-4 text-muted-foreground" />
                      <span
                        className="text-primary hover:underline cursor-pointer"
                        onClick={() => navigate(`/cadastros/marcas/${marca.id}`)}
                      >
                        {marca.nome}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {marca.pessoas_juridicas ? (
                      <div>
                        <div 
                          className="font-medium text-primary hover:underline cursor-pointer"
                          onClick={() => navigate(`/cadastros/pessoa-juridica/${marca.pj_vinculada_id}`)}
                        >
                          {marca.pessoas_juridicas.nome_fantasia || marca.pessoas_juridicas.razao_social}
                        </div>
                        {marca.pessoas_juridicas.cnpj && (
                          <div className="text-sm text-muted-foreground">
                            {marca.pessoas_juridicas.cnpj}
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">Não vinculada</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {marca.descricao || (
                      <span className="text-muted-foreground">Sem descrição</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {new Date(marca.created_at).toLocaleDateString('pt-BR')}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(marca)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(marca.id)}
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
    </div>
  );
}
