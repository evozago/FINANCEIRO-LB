import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Key, Copy, Plus, Trash2, Eye, EyeOff, RefreshCw, Shield } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '@/components/ui/dialog';

interface ApiKey {
  id: string;
  nome: string;
  chave: string;
  ativo: boolean;
  created_at: string;
  ultimo_uso_at: string | null;
}

function gerarChaveAPI(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const prefix = 'fc_live_';
  let result = '';
  const array = new Uint8Array(48);
  crypto.getRandomValues(array);
  for (let i = 0; i < array.length; i++) {
    result += chars[array[i] % chars.length];
  }
  return prefix + result;
}

export default function Configuracoes() {
  const { role } = useAuth();
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [novoNome, setNovoNome] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [visibleKeys, setVisibleKeys] = useState<Set<string>>(new Set());
  const [gerando, setGerando] = useState(false);

  const fetchKeys = async () => {
    const { data, error } = await supabase
      .from('api_keys')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      toast.error('Erro ao carregar chaves API');
      console.error(error);
    } else {
      setApiKeys(data || []);
    }
    setLoading(false);
  };

  useEffect(() => { fetchKeys(); }, []);

  const criarChave = async () => {
    if (!novoNome.trim()) {
      toast.error('Informe um nome para a chave');
      return;
    }
    setGerando(true);
    const chave = gerarChaveAPI();
    
    const { error } = await supabase
      .from('api_keys')
      .insert({ nome: novoNome.trim(), chave });

    if (error) {
      toast.error('Erro ao criar chave API');
      console.error(error);
    } else {
      toast.success('Chave API criada com sucesso!');
      setNovoNome('');
      setDialogOpen(false);
      fetchKeys();
      // Show key immediately after creation
      setTimeout(() => {
        setVisibleKeys(prev => new Set([...prev, chave]));
      }, 500);
    }
    setGerando(false);
  };

  const toggleAtivo = async (id: string, ativo: boolean) => {
    const { error } = await supabase
      .from('api_keys')
      .update({ ativo: !ativo })
      .eq('id', id);

    if (error) {
      toast.error('Erro ao atualizar chave');
    } else {
      toast.success(ativo ? 'Chave desativada' : 'Chave ativada');
      fetchKeys();
    }
  };

  const deletarChave = async (id: string) => {
    const { error } = await supabase
      .from('api_keys')
      .delete()
      .eq('id', id);

    if (error) {
      toast.error('Erro ao excluir chave');
    } else {
      toast.success('Chave excluída');
      fetchKeys();
    }
  };

  const copiar = (chave: string) => {
    navigator.clipboard.writeText(chave);
    toast.success('Chave copiada para a área de transferência');
  };

  const toggleVisibilidade = (chave: string) => {
    setVisibleKeys(prev => {
      const next = new Set(prev);
      if (next.has(chave)) next.delete(chave); else next.add(chave);
      return next;
    });
  };

  const mascarar = (chave: string) => {
    return chave.substring(0, 12) + '••••••••••••••••••••' + chave.substring(chave.length - 4);
  };

  if (role !== 'admin') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Shield className="h-12 w-12 text-muted-foreground mb-4" />
        <p className="text-muted-foreground">Acesso restrito a administradores</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Configurações</h1>
        <p className="text-muted-foreground">Gerencie chaves de acesso à API do sistema</p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              Chaves de API
            </CardTitle>
            <CardDescription>
              Chaves com acesso total ao sistema via API REST. Sem expiração.
            </CardDescription>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Gerar Nova Chave
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Gerar Nova Chave API</DialogTitle>
                <DialogDescription>
                  A chave será gerada automaticamente com acesso total ao sistema.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div>
                  <Label>Nome da chave</Label>
                  <Input
                    placeholder="Ex: Integração ERP, App Mobile..."
                    value={novoNome}
                    onChange={e => setNovoNome(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && criarChave()}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Escolha um nome descritivo para identificar onde esta chave será usada.
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
                <Button onClick={criarChave} disabled={gerando}>
                  {gerando ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Key className="h-4 w-4 mr-2" />}
                  Gerar Chave
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : apiKeys.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Key className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>Nenhuma chave API criada</p>
              <p className="text-sm">Clique em "Gerar Nova Chave" para começar</p>
            </div>
          ) : (
            <div className="space-y-3">
              {apiKeys.map(key => (
                <div
                  key={key.id}
                  className={`flex items-center gap-4 p-4 rounded-lg border transition-colors ${
                    key.ativo ? 'bg-card' : 'bg-muted/50 opacity-60'
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium">{key.nome}</span>
                      <Badge variant={key.ativo ? 'default' : 'secondary'}>
                        {key.ativo ? 'Ativa' : 'Inativa'}
                      </Badge>
                      <Badge variant="outline">Sem expiração</Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <code className="text-xs bg-muted px-2 py-1 rounded font-mono">
                        {visibleKeys.has(key.chave) ? key.chave : mascarar(key.chave)}
                      </code>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => toggleVisibilidade(key.chave)}
                      >
                        {visibleKeys.has(key.chave) ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => copiar(key.chave)}
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Criada em {new Date(key.created_at).toLocaleDateString('pt-BR')}
                      {key.ultimo_uso_at && ` • Último uso: ${new Date(key.ultimo_uso_at).toLocaleDateString('pt-BR')}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toggleAtivo(key.id, key.ativo)}
                    >
                      {key.ativo ? 'Desativar' : 'Ativar'}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive"
                      onClick={() => deletarChave(key.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="mt-6 p-4 rounded-lg bg-muted/50 border">
            <h4 className="font-medium text-sm mb-2">Como usar a API</h4>
            <p className="text-xs text-muted-foreground mb-2">
              Envie a chave no header <code className="bg-background px-1 rounded">x-api-key</code> em todas as requisições:
            </p>
            <pre className="text-xs bg-background p-3 rounded overflow-x-auto">
{`curl -X GET "https://yimrllhmdbuabvryvirn.supabase.co/functions/v1/external-api?tabela=produtos" \\
  -H "x-api-key: SUA_CHAVE_AQUI"`}
            </pre>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}