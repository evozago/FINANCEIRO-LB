import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Plus, Trash2, Shield, Users, Loader2 } from 'lucide-react';

const ALL_MODULOS = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'cadastros', label: 'Cadastros' },
  { id: 'financeiro', label: 'Financeiro' },
  { id: 'vendas', label: 'Vendas' },
  { id: 'compras', label: 'Compras' },
  { id: 'produtos', label: 'Produtos' },
  { id: 'estoque', label: 'Estoque' },
  { id: 'crm', label: 'CRM' },
  { id: 'ecommerce', label: 'E-commerce' },
  { id: 'ferramentas', label: 'Ferramentas' },
  { id: 'relatorios', label: 'Relatórios' },
  { id: 'admin', label: 'Administração' },
];

interface UserData {
  user_id: string;
  nome: string;
  email: string;
  role: string;
}

export default function GerenciarUsuarios() {
  const { role } = useAuth();
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [openCreate, setOpenCreate] = useState(false);
  const [openModulos, setOpenModulos] = useState(false);
  const [selectedRole, setSelectedRole] = useState<string>('operador');
  const [selectedModulos, setSelectedModulos] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);

  // New user form
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newNome, setNewNome] = useState('');
  const [newRole, setNewRole] = useState('operador');

  const callAdmin = async (body: any) => {
    const { data: { session } } = await supabase.auth.getSession();
    const res = await supabase.functions.invoke('admin-users', {
      body,
      headers: { Authorization: `Bearer ${session?.access_token}` },
    });
    if (res.error) throw new Error(res.error.message);
    if (res.data?.error) throw new Error(res.data.error);
    return res.data;
  };

  const loadUsers = async () => {
    try {
      const data = await callAdmin({ action: 'list-users' });
      setUsers(data.users || []);
    } catch (err: any) {
      toast.error('Erro ao carregar usuários: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadUsers(); }, []);

  const handleCreateUser = async () => {
    if (!newEmail || !newPassword || !newNome) {
      toast.error('Preencha todos os campos');
      return;
    }
    setCreating(true);
    try {
      await callAdmin({ action: 'create-user', email: newEmail, password: newPassword, nome: newNome, role: newRole });
      toast.success('Usuário criado com sucesso!');
      setOpenCreate(false);
      setNewEmail(''); setNewPassword(''); setNewNome(''); setNewRole('operador');
      loadUsers();
    } catch (err: any) {
      toast.error('Erro: ' + err.message);
    } finally {
      setCreating(false);
    }
  };

  const handleChangeRole = async (userId: string, newRoleVal: string) => {
    try {
      await callAdmin({ action: 'update-role', user_id: userId, role: newRoleVal });
      toast.success('Perfil atualizado');
      loadUsers();
    } catch (err: any) {
      toast.error('Erro: ' + err.message);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Tem certeza que deseja excluir este usuário?')) return;
    try {
      await callAdmin({ action: 'delete-user', user_id: userId });
      toast.success('Usuário excluído');
      loadUsers();
    } catch (err: any) {
      toast.error('Erro: ' + err.message);
    }
  };

  const openModulosDialog = async (roleToEdit: string) => {
    setSelectedRole(roleToEdit);
    const { data } = await supabase.from('role_modulos').select('modulo').eq('role', roleToEdit as any);
    setSelectedModulos((data || []).map((d: any) => d.modulo));
    setOpenModulos(true);
  };

  const handleSaveModulos = async () => {
    try {
      await callAdmin({ action: 'update-modulos', role: selectedRole, modulos: selectedModulos });
      toast.success('Módulos atualizados');
      setOpenModulos(false);
    } catch (err: any) {
      toast.error('Erro: ' + err.message);
    }
  };

  if (role !== 'admin') {
    return <div className="p-8 text-center text-muted-foreground">Acesso restrito a administradores.</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users className="h-6 w-6" /> Gerenciar Usuários
          </h1>
          <p className="text-muted-foreground">Crie usuários e defina perfis de acesso</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={openCreate} onOpenChange={setOpenCreate}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" /> Novo Usuário</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Criar Novo Usuário</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label>Nome</Label>
                  <Input value={newNome} onChange={(e) => setNewNome(e.target.value)} placeholder="Nome completo" />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="email@exemplo.com" />
                </div>
                <div className="space-y-2">
                  <Label>Senha</Label>
                  <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Mínimo 6 caracteres" />
                </div>
                <div className="space-y-2">
                  <Label>Perfil</Label>
                  <Select value={newRole} onValueChange={setNewRole}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Administrador</SelectItem>
                      <SelectItem value="operador">Operador</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={handleCreateUser} className="w-full" disabled={creating}>
                  {creating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Criar Usuário
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Button variant="outline" onClick={() => openModulosDialog('operador')}>
            <Shield className="h-4 w-4 mr-2" /> Módulos do Operador
          </Button>
        </div>
      </div>

      {/* Modulos Dialog */}
      <Dialog open={openModulos} onOpenChange={setOpenModulos}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Módulos do perfil: {selectedRole}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-4">
            {ALL_MODULOS.map((mod) => (
              <div key={mod.id} className="flex items-center space-x-2">
                <Checkbox
                  id={mod.id}
                  checked={selectedModulos.includes(mod.id)}
                  onCheckedChange={(checked) => {
                    setSelectedModulos(prev =>
                      checked ? [...prev, mod.id] : prev.filter(m => m !== mod.id)
                    );
                  }}
                  disabled={selectedRole === 'admin'}
                />
                <Label htmlFor={mod.id}>{mod.label}</Label>
              </div>
            ))}
            <Button onClick={handleSaveModulos} className="w-full mt-4">Salvar</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle>Usuários Cadastrados</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Perfil</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((u) => (
                  <TableRow key={u.user_id}>
                    <TableCell className="font-medium">{u.nome}</TableCell>
                    <TableCell>{u.email}</TableCell>
                    <TableCell>
                      <Badge variant={u.role === 'admin' ? 'default' : 'secondary'}>
                        {u.role === 'admin' ? 'Administrador' : 'Operador'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Select
                        value={u.role}
                        onValueChange={(val) => handleChangeRole(u.user_id, val)}
                      >
                        <SelectTrigger className="w-32 inline-flex">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admin">Admin</SelectItem>
                          <SelectItem value="operador">Operador</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button variant="ghost" size="icon" onClick={() => handleDeleteUser(u.user_id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {users.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                      Nenhum usuário cadastrado
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
