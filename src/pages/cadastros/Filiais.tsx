import { useState, useEffect } from 'react';
import { Plus, Search, Edit, Trash2, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Filial {
  id: number;
  nome: string;
  cnpj?: string;
  endereco?: string;
  telefone?: string;
  ativo?: boolean;
  created_at: string;
}

export function Filiais() {
  const [filiais, setFiliais] = useState<Filial[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingFilial, setEditingFilial] = useState<Filial | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    nome: '',
    cnpj: '',
    endereco: '',
    telefone: '',
  });

  useEffect(() => {
    fetchFiliais();
  }, []);

  const fetchFiliais = async () => {
    try {
      const { data, error } = await supabase
        .from('filiais')
        .select('*')
        .order('nome');

      if (error) throw error;
      setFiliais((data || []) as Filial[]);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const dataToSubmit = {
        nome: formData.nome,
        cnpj: formData.cnpj || null,
        endereco: formData.endereco || null,
        telefone: formData.telefone || null,
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
      cnpj: filial.cnpj || '',
      endereco: filial.endereco || '',
      telefone: filial.telefone || '',
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
      cnpj: '',
      endereco: '',
      telefone: '',
    });
  };

  const filteredFiliais = filiais.filter(filial =>
    filial.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (filial.cnpj && filial.cnpj.includes(searchTerm))
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
                <Label htmlFor="cnpj">CNPJ</Label>
                <Input
                  id="cnpj"
                  value={formData.cnpj}
                  onChange={(e) => setFormData({ ...formData, cnpj: e.target.value })}
                  placeholder="00.000.000/0000-00"
                />
              </div>
              <div>
                <Label htmlFor="endereco">Endereço</Label>
                <Input
                  id="endereco"
                  value={formData.endereco}
                  onChange={(e) => setFormData({ ...formData, endereco: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="telefone">Telefone</Label>
                <Input
                  id="telefone"
                  value={formData.telefone}
                  onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                />
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
              placeholder="Buscar por nome ou CNPJ..."
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
                <TableHead>CNPJ</TableHead>
                <TableHead>Endereço</TableHead>
                <TableHead>Telefone</TableHead>
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
                  <TableCell>{filial.cnpj || '-'}</TableCell>
                  <TableCell>{filial.endereco || '-'}</TableCell>
                  <TableCell>{filial.telefone || '-'}</TableCell>
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
