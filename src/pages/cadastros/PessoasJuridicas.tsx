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
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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

interface Marca { id: number; nome: string; selected: boolean; }
interface Representante { id: number; nome_completo: string; selected: boolean; }
interface CategoriaPJ { id: number; nome: string; descricao?: string; }

export function PessoasJuridicas() {
  const navigate = useNavigate();
  const [pessoas, setPessoas] = useState<PessoaJuridica[]>([]);
  const [marcas, setMarcas] = useState<Marca[]>([]);
  const [representantes, setRepresentantes] = useState<Representante[]>([]);
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
    fetchMarcas();
    fetchRepresentantes();
    fetchCategorias();
  }, []);

  const fetchPessoas = async () => {
    try {
      const { data, error } = await supabase
        .from('pessoas_juridicas')
        .select(`*, categorias_pj(nome)`)
        .order('razao_social');

      if (error) throw error;
      setPessoas(data || []);
    } catch (error) {
      console.error('Erro ao buscar pessoas jurídicas:', error);
      toast({ title: 'Erro', description: 'Não foi possível carregar as pessoas jurídicas.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const fetchMarcas = async () => {
    try {
      const { data, error } = await supabase.from('marcas').select('id, nome').order('nome');
      if (error) throw error;
      setMarcas((data || []).map(m => ({ ...m, selected: false })));
    } catch (error) { console.error('Erro ao buscar marcas:', error); }
  };

  const fetchRepresentantes = async () => {
    try {
      const { data, error } = await supabase
        .from('pessoas_fisicas')
        .select(`id, nome_completo, cargos(nome)`)
        .eq('cargos.nome', 'Representante')
        .order('nome_completo');
      if (error) throw error;
      setRepresentantes((data || []).map(r => ({ ...r, selected: false })));
    } catch (error) { console.error('Erro ao buscar representantes:', error); }
  };

  const fetchCategorias = async () => {
    try {
      const { data, error } = await supabase.from('categorias_financeiras').select('id, nome').order('nome');
      if (error) throw error;
      setCategorias((data || []).map(cat => ({ id: cat.id, nome: cat.nome })));
    } catch (error) { console.error('Erro ao buscar categorias:', error); }
  };

  const fetchMarcasVinculadas = async (pessoaId: number) => {
    try {
      const { data, error } = await supabase.from('pj_marcas').select('marca_id').eq('pj_id', pessoaId);
      if (error) throw error;
      const ids = data?.map(i => i.marca_id) || [];
      setMarcas(prev => prev.map(m => ({ ...m, selected: ids.includes(m.id) })));
    } catch (error) { console.error('Erro ao buscar marcas vinculadas:', error); }
  };

  const fetchRepresentantesVinculados = async (pessoaId: number) => {
    try {
      const { data, error } = await supabase.from('pj_representantes').select('pf_id').eq('pj_id', pessoaId);
      if (error) throw error;
      const ids = data?.map(i => i.pf_id) || [];
      setRepresentantes(prev => prev.map(r => ({ ...r, selected: ids.includes(r.id) })));
    } catch (error) { console.error('Erro ao buscar representantes vinculados:', error); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      let pessoaId: number;
      const dataToSubmit = {
        razao_social: formData.razao_social?.trim() || null,
        nome_fantasia: formData.nome_fantasia?.trim() || null,
        cnpj: formData.cnpj?.trim() || null,
        insc_estadual: formData.insc_estadual?.trim() || null,
        celular: formData.celular?.trim() || null,
        email: formData.email?.trim() || null,
        endereco: formData.endereco?.trim() || null,
        fundacao: formData.fundacao || null,
        categoria_id: formData.categoria_id ? parseInt(formData.categoria_id) : null,
      };

      if (editingPessoa) {
        const { error } = await supabase.from('pessoas_juridicas').update(dataToSubmit).eq('id', editingPessoa.id);
        if (error) throw error;
        pessoaId = editingPessoa.id;
        toast({ title: 'Sucesso', description: 'Pessoa jurídica atualizada com sucesso.' });
      } else {
        const { data: pessoaData, error } = await supabase.from('pessoas_juridicas').insert([dataToSubmit]).select().single();
        if (error) throw error;
        pessoaId = pessoaData.id;
        toast({ title: 'Sucesso', description: 'Pessoa jurídica cadastrada com sucesso.' });
      }

      await saveMarcasVinculadas(pessoaId);
      await saveRepresentantesVinculados(pessoaId);

      setIsDialogOpen(false);
      setEditingPessoa(null);
      resetForm();
      fetchPessoas();
    } catch (error) {
      console.error('Erro ao salvar pessoa jurídica:', error);
      toast({ title: 'Erro', description: 'Não foi possível salvar a pessoa jurídica.', variant: 'destructive' });
    }
  };

  const saveMarcasVinculadas = async (pessoaId: number) => {
    try {
      await supabase.from('pj_marcas').delete().eq('pj_id', pessoaId);
      const selecionadas = marcas.filter(m => m.selected);
      if (selecionadas.length > 0) {
        await supabase.from('pj_marcas').insert(selecionadas.map(m => ({ pj_id: pessoaId, marca_id: m.id })));
      }
    } catch (error) { console.error('Erro ao salvar marcas vinculadas:', error); }
  };

  const saveRepresentantesVinculados = async (pessoaId: number) => {
    try {
      await supabase.from('pj_representantes').delete().eq('pj_id', pessoaId);
      const selecionados = representantes.filter(r => r.selected);
      if (selecionados.length > 0) {
        await supabase.from('pj_representantes').insert(selecionados.map(r => ({ pj_id: pessoaId, pf_id: r.id })));
      }
    } catch (error) { console.error('Erro ao salvar representantes vinculados:', error); }
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
    fetchMarcasVinculadas(pessoa.id);
    fetchRepresentantesVinculados(pessoa.id);
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
      razao_social: '', nome_fantasia: '', cnpj: '', insc_estadual: '',
      celular: '', email: '', endereco: '', fundacao: '', categoria_id: '',
    });
    setMarcas(prev => prev.map(m => ({ ...m, selected: false })));
    setRepresentantes(prev => prev.map(r => ({ ...r, selected: false })));
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
              <Tabs defaultValue="dados" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="dados">Dados Básicos</TabsTrigger>
                  <TabsTrigger value="marcas">Marcas</TabsTrigger>
                  <TabsTrigger value="representantes">Representantes</TabsTrigger>
                </TabsList>

                <TabsContent value="dados" className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="razao_social">Razão Social</Label>
                      <Input id="razao_social" value={formData.razao_social}
                             onChange={(e) => setFormData({ ...formData, razao_social: e.target.value })} />
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
                      <Label htmlFor="insc_estadual">Inscrição Estadual</Label>
                      <Input id="insc_estadual" value={formData.insc_estadual}
                             onChange={(e) => setFormData({ ...formData, insc_estadual: e.target.value })} />
                    </div>
                    <div>
                      <Label htmlFor="celular">Celular</Label>
                      <Input id="celular" value={formData.celular}
                             onChange={(e) => setFormData({ ...formData, celular: e.target.value })} />
                    </div>
                    <div>
                      <Label htmlFor="email">E-mail</Label>
                      <Input id="email" type="email" value={formData.email}
                             onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
                    </div>
                    <div>
                      <Label htmlFor="fundacao">Data de Fundação</Label>
                      <Input id="fundacao" type="date" value={formData.fundacao}
                             onChange={(e) => setFormData({ ...formData, fundacao: e.target.value })} />
                    </div>
                    <div>
                      <Label htmlFor="categoria_id">Categoria</Label>
                      <select
                        id="categoria_id"
                        value={formData.categoria_id}
                        onChange={(e) => setFormData({ ...formData, categoria_id: e.target.value })}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      >
                        <option value="">Sem categoria</option>
                        {categorias.map((c) => (
                          <option key={c.id} value={c.id.toString()}>{c.nome}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="endereco">Endereço</Label>
                    <Textarea id="endereco" rows={3} value={formData.endereco}
                              onChange={(e) => setFormData({ ...formData, endereco: e.target.value })} />
                  </div>
                </TabsContent>

                <TabsContent value="marcas" className="space-y-4">
                  <div>
                    <h3 className="text-lg font-medium">Marcas Vinculadas</h3>
                    <p className="text-sm text-muted-foreground">Selecione as marcas que esta empresa representa</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4 max-h-60 overflow-y-auto">
                    {marcas.map((m) => (
                      <div key={m.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`marca-${m.id}`}
                          checked={m.selected}
                          onCheckedChange={(checked) => {
                            setMarcas(prev => prev.map(x => x.id === m.id ? { ...x, selected: !!checked } : x));
                          }}
                        />
                        <Label htmlFor={`marca-${m.id}`} className="text-sm">{m.nome}</Label>
                      </div>
                    ))}
                  </div>
                </TabsContent>

                <TabsContent value="representantes" className="space-y-4">
                  <div>
                    <h3 className="text-lg font-medium">Representantes</h3>
                    <p className="text-sm text-muted-foreground">Selecione os representantes desta empresa</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4 max-h-60 overflow-y-auto">
                    {representantes.map((r) => (
                      <div key={r.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`rep-${r.id}`}
                          checked={r.selected}
                          onCheckedChange={(checked) => {
                            setRepresentantes(prev => prev.map(x => x.id === r.id ? { ...x, selected: !!checked } : x));
                          }}
                        />
                        <Label htmlFor={`rep-${r.id}`} className="text-sm">{r.nome_completo}</Label>
                      </div>
                    ))}
                  </div>
                </TabsContent>
              </Tabs>

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
                <TableHead>Cadastrado em</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPessoas.map((p) => {
                const nome = p.nome_fantasia || p.razao_social || `PJ #${p.id}`;
                const href = `/cadastros/pessoa-juridica/${p.id}`; // **rota única**
                return (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center space-x-2">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        <div>
                          {/* Link canônico */}
                          <Link to={href} className="font-medium text-primary hover:underline">
                            {nome}
                          </Link>
                          {p.nome_fantasia && (
                            <div className="text-sm text-muted-foreground">{p.razao_social}</div>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{p.cnpj || 'Não informado'}</TableCell>
                    <TableCell>
                      <div>
                        {p.celular && <div className="text-sm">{p.celular}</div>}
                        {p.email && <div className="text-sm text-muted-foreground">{p.email}</div>}
                      </div>
                    </TableCell>
                    <TableCell>{new Date(p.created_at).toLocaleDateString('pt-BR')}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end space-x-2">
                        {/* Botão coerente com o Link */}
                        <Button variant="outline" size="sm" onClick={() => navigate(href)}>
                          Ver Detalhes
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => handleEdit(p)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => handleDelete(p.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
