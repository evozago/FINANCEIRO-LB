import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Edit, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface PessoaFisica {
  id: number;
  nome_completo: string;
  cpf: string;
  celular?: string;
  email?: string;
  endereco?: string;
  nascimento?: string;
  num_cadastro_folha: string;
  filial_id?: number;
  cargo_id?: number;
  created_at: string;
  filiais?: { nome: string };
  cargos?: { nome: string };
}

interface Filial {
  id: number;
  nome: string;
}

interface Cargo {
  id: number;
  nome: string;
}

export function PessoasFisicas() {
  const navigate = useNavigate();
  const [pessoas, setPessoas] = useState<PessoaFisica[]>([]);
  const [filiais, setFiliais] = useState<Filial[]>([]);
  const [cargos, setCargos] = useState<Cargo[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPessoa, setEditingPessoa] = useState<PessoaFisica | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    nome_completo: '',
    cpf: '',
    celular: '',
    email: '',
    endereco: '',
    nascimento: '',
    num_cadastro_folha: '',
    filial_id: '',
    cargo_id: '',
  });

  useEffect(() => {
    const loadInitialData = async () => {
      await Promise.all([
        fetchPessoas(),
        fetchFiliais(),
        fetchCargos()
      ]);
      setLoading(false);
    };
    loadInitialData();
  }, []);

  const fetchPessoas = async () => {
    try {
      const { data, error } = await supabase
        .from('pessoas_fisicas')
        .select(`
          *,
          filiais(nome),
          cargos(nome)
        `)
        .order('nome_completo');

      if (error) throw error;
      setPessoas(data || []);
    } catch (error) {
      console.error('Erro ao buscar pessoas físicas:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar as pessoas físicas.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchFiliais = async () => {
    try {
      const { data, error } = await supabase
        .from('filiais')
        .select('id, nome')
        .order('nome');

      if (error) throw error;
      setFiliais(data || []);
    } catch (error) {
      console.error('Erro ao buscar filiais:', error);
    }
  };

  const fetchCargos = async () => {
    try {
      const { data, error } = await supabase
        .from('cargos')
        .select('id, nome')
        .order('nome');

      if (error) throw error;
      setCargos(data || []);
    } catch (error) {
      console.error('Erro ao buscar cargos:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const dataToSubmit = {
        nome_completo: formData.nome_completo,
        cpf: formData.cpf && formData.cpf.trim() !== '' ? formData.cpf : null,
        celular: formData.celular && formData.celular.trim() !== '' ? formData.celular : null,
        email: formData.email && formData.email.trim() !== '' ? formData.email : null,
        endereco: formData.endereco && formData.endereco.trim() !== '' ? formData.endereco : null,
        nascimento: formData.nascimento && formData.nascimento.trim() !== '' ? formData.nascimento : null,
        num_cadastro_folha: formData.num_cadastro_folha && formData.num_cadastro_folha.trim() !== '' ? formData.num_cadastro_folha : null,
        filial_id: formData.filial_id ? parseInt(formData.filial_id) : null,
        cargo_id: formData.cargo_id ? parseInt(formData.cargo_id) : null,
      };

      if (editingPessoa) {
        const { error } = await supabase
          .from('pessoas_fisicas')
          .update(dataToSubmit)
          .eq('id', editingPessoa.id);

        if (error) throw error;

        toast({
          title: 'Sucesso',
          description: 'Pessoa física atualizada com sucesso.',
        });
      } else {
        const { error } = await supabase
          .from('pessoas_fisicas')
          .insert([dataToSubmit]);

        if (error) throw error;

        toast({
          title: 'Sucesso',
          description: 'Pessoa física cadastrada com sucesso.',
        });
      }

      setIsDialogOpen(false);
      setEditingPessoa(null);
      resetForm();
      fetchPessoas();
    } catch (error) {
      console.error('Erro ao salvar pessoa física:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível salvar a pessoa física.',
        variant: 'destructive',
      });
    }
  };

  const handleEdit = (pessoa: PessoaFisica) => {
    setEditingPessoa(pessoa);
    setFormData({
      nome_completo: pessoa.nome_completo,
      cpf: pessoa.cpf,
      celular: pessoa.celular || '',
      email: pessoa.email || '',
      endereco: pessoa.endereco || '',
      nascimento: pessoa.nascimento || '',
      num_cadastro_folha: pessoa.num_cadastro_folha,
      filial_id: pessoa.filial_id?.toString() || '',
      cargo_id: pessoa.cargo_id?.toString() || '',
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Tem certeza que deseja excluir esta pessoa física?')) return;

    try {
      const { error } = await supabase
        .from('pessoas_fisicas')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Sucesso',
        description: 'Pessoa física excluída com sucesso.',
      });
      fetchPessoas();
    } catch (error) {
      console.error('Erro ao excluir pessoa física:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível excluir a pessoa física.',
        variant: 'destructive',
      });
    }
  };

  const resetForm = () => {
    setFormData({
      nome_completo: '',
      cpf: '',
      celular: '',
      email: '',
      endereco: '',
      nascimento: '',
      num_cadastro_folha: '',
      filial_id: '',
      cargo_id: '',
    });
  };

  const filteredPessoas = pessoas.filter(pessoa =>
    pessoa.nome_completo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (pessoa.cpf && pessoa.cpf.includes(searchTerm)) ||
    (pessoa.num_cadastro_folha && pessoa.num_cadastro_folha.includes(searchTerm))
  );

  if (loading) {
    return <div>Carregando...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Pessoas Físicas</h1>
          <p className="text-muted-foreground">
            Gerencie os colaboradores e representantes
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => { resetForm(); setEditingPessoa(null); }}>
              <Plus className="mr-2 h-4 w-4" />
              Nova Pessoa
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingPessoa ? 'Editar Pessoa Física' : 'Nova Pessoa Física'}
              </DialogTitle>
              <DialogDescription>
                Preencha os dados da pessoa física
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="nome_completo">Nome Completo *</Label>
                  <Input
                    id="nome_completo"
                    value={formData.nome_completo}
                    onChange={(e) => setFormData({ ...formData, nome_completo: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="cpf">CPF</Label>
                  <Input
                    id="cpf"
                    value={formData.cpf}
                    onChange={(e) => setFormData({ ...formData, cpf: e.target.value })}
                    placeholder="000.000.000-00 (opcional)"
                  />
                </div>
                <div>
                  <Label htmlFor="celular">Celular</Label>
                  <Input
                    id="celular"
                    value={formData.celular}
                    onChange={(e) => setFormData({ ...formData, celular: e.target.value })}
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
                  <Label htmlFor="nascimento">Data de Nascimento</Label>
                  <Input
                    id="nascimento"
                    type="date"
                    value={formData.nascimento}
                    onChange={(e) => setFormData({ ...formData, nascimento: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="num_cadastro_folha">Nº Cadastro Folha</Label>
                  <Input
                    id="num_cadastro_folha"
                    value={formData.num_cadastro_folha}
                    onChange={(e) => setFormData({ ...formData, num_cadastro_folha: e.target.value })}
                    placeholder="Número opcional"
                  />
                </div>
                <div>
                  <Label htmlFor="filial_id">Filial</Label>
                  <select
                    id="filial_id"
                    value={formData.filial_id}
                    onChange={(e) => setFormData({ ...formData, filial_id: e.target.value })}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="">Selecione uma filial</option>
                    {filiais.map((filial) => (
                      <option key={filial.id} value={filial.id.toString()}>
                        {filial.nome}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label htmlFor="cargo_id">Cargo</Label>
                  <select
                    id="cargo_id"
                    value={formData.cargo_id}
                    onChange={(e) => setFormData({ ...formData, cargo_id: e.target.value })}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="">Selecione um cargo</option>
                    {cargos.map((cargo) => (
                      <option key={cargo.id} value={cargo.id.toString()}>
                        {cargo.nome}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="col-span-2">
                <Label htmlFor="endereco">Endereço</Label>
                <Input
                  id="endereco"
                  value={formData.endereco}
                  onChange={(e) => setFormData({ ...formData, endereco: e.target.value })}
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
          <CardTitle>Lista de Pessoas Físicas</CardTitle>
          <CardDescription>
            {pessoas.length} pessoa(s) cadastrada(s)
          </CardDescription>
          <div className="flex items-center space-x-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, CPF ou cadastro..."
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
                <TableHead>CPF</TableHead>
                <TableHead>Cadastro Folha</TableHead>
                <TableHead>Filial</TableHead>
                <TableHead>Cargo</TableHead>
                <TableHead>Contato</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPessoas.map((pessoa) => (
                <TableRow key={pessoa.id}>
                  <TableCell className="font-medium">
                    <span
                      className="text-primary hover:underline cursor-pointer"
                      onClick={() => navigate(`/cadastros/pessoas-fisicas/${pessoa.id}`)}
                    >
                      {pessoa.nome_completo}
                    </span>
                  </TableCell>
                  <TableCell>{pessoa.cpf}</TableCell>
                  <TableCell>{pessoa.num_cadastro_folha}</TableCell>
                  <TableCell>
                    {pessoa.filiais?.nome && (
                      <Badge variant="outline">{pessoa.filiais.nome}</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {pessoa.cargos?.nome && (
                      <Badge variant="secondary">{pessoa.cargos.nome}</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {pessoa.celular && <div>{pessoa.celular}</div>}
                      {pessoa.email && <div className="text-muted-foreground">{pessoa.email}</div>}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.location.href = `/cadastros/pessoas-fisicas/${pessoa.id}`}
                      >
                        Ver Detalhes
                      </Button>
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
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
