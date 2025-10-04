import { useState, useEffect } from 'react';
import { Plus, Search, Edit, Trash2, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Filial {
  id: number;
  nome: string;
  pj_id: number;
  created_at: string;
  pessoas_juridicas: {
    nome_fantasia: string;
    razao_social: string;
  };
}

interface PessoaJuridica {
  id: number;
  nome_fantasia: string;
  razao_social: string;
}

export function Filiais() {
  const [filiais, setFiliais] = useState<Filial[]>([]);
  const [pessoasJuridicas, setPessoasJuridicas] = useState<PessoaJuridica[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingFilial, setEditingFilial] = useState<Filial | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    nome: '',
    pj_id: '',
  });

  useEffect(() => {
    fetchFiliais();
    fetchPessoasJuridicas();
  }, []);

  const fetchFiliais = async () => {
    try {
      const { data, error } = await supabase
        .from('filiais')
        .select(`
          *,
          pessoas_juridicas(nome_fantasia, razao_social)
        `)
        .order('nome');

      if (error) throw error;
      setFiliais(data || []);
    } catch (error) {
      console.error('Erro ao buscar filiais:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar as filiais.',
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
        .select('id, nome_fantasia, razao_social')
        .order('nome_fantasia');

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
        pj_id: parseInt(formData.pj_id),
      };

      if (editingFilial) {
        const { error } = await supabase
          .from('filiais')
          .update(dataToSubmit)
          .eq('id', editingFilial.id);

        if (error) throw error;

        toast({
          title: 'Sucesso',
          description: 'Filial atualizada com sucesso.',
        });
      } else {
        const { error } = await supabase
          .from('filiais')
          .insert([dataToSubmit]);

        if (error) throw error;

        toast({
          title: 'Sucesso',
          description: 'Filial cadastrada com sucesso.',
        });
      }

      setIsDialogOpen(false);
      setEditingFilial(null);
      resetForm();
      fetchFiliais();
    } catch (error) {
      console.error('Erro ao salvar filial:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível salvar a filial.',
        variant: 'destructive',
      });
    }
  };

  const handleEdit = (filial: Filial) => {
    setEditingFilial(filial);
    setFormData({
      nome: filial.nome,
      pj_id: filial.pj_id.toString(),
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Tem certeza que deseja excluir esta filial?')) return;

    try {
      const { error } = await supabase
        .from('filiais')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Sucesso',
        description: 'Filial excluída com sucesso.',
      });
      fetchFiliais();
    } catch (error) {
      console.error('Erro ao excluir filial:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível excluir a filial.',
        variant: 'destructive',
      });
    }
  };

  const resetForm = () => {
    setFormData({
      nome: '',
      pj_id: '',
    });
  };

  const filteredFiliais = filiais.filter(filial =>
    filial.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    filial.pessoas_juridicas.nome_fantasia.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return <div>Carregando...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Filiais</h1>
          <p className="text-muted-foreground">
            Gerencie as filiais da empresa
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => { resetForm(); setEditingFilial(null); }}>
              <Plus className="mr-2 h-4 w-4" />
              Nova Filial
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingFilial ? 'Editar Filial' : 'Nova Filial'}
              </DialogTitle>
              <DialogDescription>
                Preencha as informações da filial
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="nome">Nome da Filial *</Label>
                <Input
                  id="nome"
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="pj_id">Empresa *</Label>
                <Select value={formData.pj_id} onValueChange={(value) => setFormData({ ...formData, pj_id: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma empresa" />
                  </SelectTrigger>
                  <SelectContent>
                    {pessoasJuridicas.map((pj) => (
                      <SelectItem key={pj.id} value={pj.id.toString()}>
                        {pj.nome_fantasia || pj.razao_social}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit">
                  {editingFilial ? 'Atualizar' : 'Cadastrar'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Buscar Filiais</CardTitle>
          <CardDescription>
            Use o campo abaixo para filtrar as filiais
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome da filial ou empresa..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Filiais Cadastradas</CardTitle>
          <CardDescription>
            {filteredFiliais.length} filial(is) encontrada(s)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Empresa</TableHead>
                <TableHead>Cadastrado em</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredFiliais.map((filial) => (
                <TableRow key={filial.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center space-x-2">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      <span>{filial.nome}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">{filial.pessoas_juridicas.nome_fantasia}</div>
                      <div className="text-sm text-muted-foreground">{filial.pessoas_juridicas.razao_social}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {new Date(filial.created_at).toLocaleDateString('pt-BR')}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(filial)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(filial.id)}
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
