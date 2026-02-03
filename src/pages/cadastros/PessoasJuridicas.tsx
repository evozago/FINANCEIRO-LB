import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Search, Edit, Trash2, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface PessoaJuridica {
  id: number;
  razao_social: string;
  nome_fantasia?: string;
  cnpj?: string;
  ie?: string;
  telefone?: string;
  email?: string;
  endereco?: string;
  cidade?: string;
  estado?: string;
  cep?: string;
  tipo?: string;
  created_at: string;
  updated_at: string;
}

export function PessoasJuridicas() {
  const navigate = useNavigate();
  const [pessoas, setPessoas] = useState<PessoaJuridica[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPessoa, setEditingPessoa] = useState<PessoaJuridica | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    razao_social: '',
    nome_fantasia: '',
    cnpj: '',
    ie: '',
    telefone: '',
    email: '',
    endereco: '',
    cidade: '',
    estado: '',
    cep: '',
    tipo: 'fornecedor',
  });

  useEffect(() => {
    fetchPessoas();
  }, []);

  const fetchPessoas = async () => {
    try {
      const { data, error } = await supabase
        .from('pessoas_juridicas')
        .select('*')
        .order('razao_social');

      if (error) throw error;
      setPessoas((data || []) as PessoaJuridica[]);
    } catch (error) {
      console.error('Erro ao buscar pessoas jurídicas:', error);
      toast({ title: 'Erro', description: 'Não foi possível carregar as pessoas jurídicas.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const dataToSubmit = {
        razao_social: formData.razao_social?.trim() || '',
        nome_fantasia: formData.nome_fantasia?.trim() || null,
        cnpj: formData.cnpj?.trim() || null,
        ie: formData.ie?.trim() || null,
        telefone: formData.telefone?.trim() || null,
        email: formData.email?.trim() || null,
        endereco: formData.endereco?.trim() || null,
        cidade: formData.cidade?.trim() || null,
        estado: formData.estado?.trim() || null,
        cep: formData.cep?.trim() || null,
        tipo: formData.tipo || 'fornecedor',
      };

      if (editingPessoa) {
        const { error } = await supabase.from('pessoas_juridicas').update(dataToSubmit).eq('id', editingPessoa.id);
        if (error) throw error;
        toast({ title: 'Sucesso', description: 'Pessoa jurídica atualizada com sucesso.' });
      } else {
        const { error } = await supabase.from('pessoas_juridicas').insert([dataToSubmit]);
        if (error) throw error;
        toast({ title: 'Sucesso', description: 'Pessoa jurídica cadastrada com sucesso.' });
      }

      setIsDialogOpen(false);
      setEditingPessoa(null);
      resetForm();
      fetchPessoas();
    } catch (error) {
      console.error('Erro ao salvar pessoa jurídica:', error);
      toast({ title: 'Erro', description: 'Não foi possível salvar a pessoa jurídica.', variant: 'destructive' });
    }
  };

  const handleEdit = (pessoa: PessoaJuridica) => {
    setEditingPessoa(pessoa);
    setFormData({
      razao_social: pessoa.razao_social,
      nome_fantasia: pessoa.nome_fantasia || '',
      cnpj: pessoa.cnpj || '',
      ie: pessoa.ie || '',
      telefone: pessoa.telefone || '',
      email: pessoa.email || '',
      endereco: pessoa.endereco || '',
      cidade: pessoa.cidade || '',
      estado: pessoa.estado || '',
      cep: pessoa.cep || '',
      tipo: pessoa.tipo || 'fornecedor',
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Tem certeza que deseja excluir esta pessoa jurídica?')) return;
    try {
      const { error } = await supabase.from('pessoas_juridicas').delete().eq('id', id);
      if (error) throw error;
      toast({ title: 'Sucesso', description: 'Pessoa jurídica excluída com sucesso.' });
      fetchPessoas();
    } catch (error) {
      console.error('Erro ao excluir pessoa jurídica:', error);
      toast({ title: 'Erro', description: 'Não foi possível excluir a pessoa jurídica.', variant: 'destructive' });
    }
  };

  const resetForm = () => {
    setFormData({
      razao_social: '', nome_fantasia: '', cnpj: '', ie: '',
      telefone: '', email: '', endereco: '', cidade: '', estado: '', cep: '', tipo: 'fornecedor',
    });
  };

  const filteredPessoas = pessoas.filter(p =>
    p.razao_social.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.nome_fantasia && p.nome_fantasia.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (p.cnpj && p.cnpj.includes(searchTerm))
  );

  if (loading) return <div>Carregando...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Pessoas Jurídicas</h1>
          <p className="text-muted-foreground">Gerencie empresas, fornecedores e clientes</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => { resetForm(); setEditingPessoa(null); }}>
              <Plus className="mr-2 h-4 w-4" />
              Nova Pessoa Jurídica
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingPessoa ? 'Editar Pessoa Jurídica' : 'Nova Pessoa Jurídica'}</DialogTitle>
              <DialogDescription>Preencha as informações da empresa</DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="razao_social">Razão Social *</Label>
                  <Input id="razao_social" value={formData.razao_social}
                         onChange={(e) => setFormData({ ...formData, razao_social: e.target.value })} required />
                </div>
                <div>
                  <Label htmlFor="nome_fantasia">Nome Fantasia</Label>
                  <Input id="nome_fantasia" value={formData.nome_fantasia}
                         onChange={(e) => setFormData({ ...formData, nome_fantasia: e.target.value })} />
                </div>
                <div>
                  <Label htmlFor="cnpj">CNPJ</Label>
                  <Input id="cnpj" value={formData.cnpj}
                         onChange={(e) => setFormData({ ...formData, cnpj: e.target.value })} />
                </div>
                <div>
                  <Label htmlFor="ie">Inscrição Estadual</Label>
                  <Input id="ie" value={formData.ie}
                         onChange={(e) => setFormData({ ...formData, ie: e.target.value })} />
                </div>
                <div>
                  <Label htmlFor="telefone">Telefone</Label>
                  <Input id="telefone" value={formData.telefone}
                         onChange={(e) => setFormData({ ...formData, telefone: e.target.value })} />
                </div>
                <div>
                  <Label htmlFor="email">E-mail</Label>
                  <Input id="email" type="email" value={formData.email}
                         onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
                </div>
                <div>
                  <Label htmlFor="cidade">Cidade</Label>
                  <Input id="cidade" value={formData.cidade}
                         onChange={(e) => setFormData({ ...formData, cidade: e.target.value })} />
                </div>
                <div>
                  <Label htmlFor="estado">Estado</Label>
                  <Input id="estado" value={formData.estado}
                         onChange={(e) => setFormData({ ...formData, estado: e.target.value })} maxLength={2} />
                </div>
                <div>
                  <Label htmlFor="cep">CEP</Label>
                  <Input id="cep" value={formData.cep}
                         onChange={(e) => setFormData({ ...formData, cep: e.target.value })} />
                </div>
                <div>
                  <Label htmlFor="tipo">Tipo</Label>
                  <select
                    id="tipo"
                    value={formData.tipo}
                    onChange={(e) => setFormData({ ...formData, tipo: e.target.value })}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    <option value="fornecedor">Fornecedor</option>
                    <option value="cliente">Cliente</option>
                    <option value="parceiro">Parceiro</option>
                  </select>
                </div>
              </div>
              <div>
                <Label htmlFor="endereco">Endereço</Label>
                <Textarea id="endereco" rows={3} value={formData.endereco}
                          onChange={(e) => setFormData({ ...formData, endereco: e.target.value })} />
              </div>

              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
                <Button type="submit">{editingPessoa ? 'Atualizar' : 'Cadastrar'}</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Busca */}
      <Card>
        <CardHeader>
          <CardTitle>Buscar Pessoas Jurídicas</CardTitle>
          <CardDescription>Use o campo abaixo para filtrar as empresas</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar por razão social, nome fantasia ou CNPJ..." value={searchTerm}
                   onChange={(e) => setSearchTerm(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      {/* Lista */}
      <Card>
        <CardHeader>
          <CardTitle>Pessoas Jurídicas Cadastradas</CardTitle>
          <CardDescription>{filteredPessoas.length} empresa(s) encontrada(s)</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Empresa</TableHead>
                <TableHead>CNPJ</TableHead>
                <TableHead>Contato</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Cadastrado em</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPessoas.map((pessoa) => (
                <TableRow key={pessoa.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center space-x-2">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <Link
                          to={`/cadastros/pessoa-juridica/${pessoa.id}`}
                          className="text-primary hover:underline"
                        >
                          {pessoa.nome_fantasia || pessoa.razao_social}
                        </Link>
                        {pessoa.nome_fantasia && (
                          <div className="text-sm text-muted-foreground">{pessoa.razao_social}</div>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{pessoa.cnpj || '-'}</TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {pessoa.telefone && <div>{pessoa.telefone}</div>}
                      {pessoa.email && <div className="text-muted-foreground">{pessoa.email}</div>}
                    </div>
                  </TableCell>
                  <TableCell className="capitalize">{pessoa.tipo || 'fornecedor'}</TableCell>
                  <TableCell>{new Date(pessoa.created_at).toLocaleDateString('pt-BR')}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/cadastros/pessoa-juridica/${pessoa.id}`)}
                      >
                        Ver Detalhes
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleEdit(pessoa)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleDelete(pessoa.id)}>
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
