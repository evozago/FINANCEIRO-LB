import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Brain, Plus, Trash2, Sparkles, BookOpen, Lightbulb } from 'lucide-react';

interface Conhecimento {
  id: number;
  regra: string;
  descricao: string | null;
  ativa: boolean;
  created_at: string;
}

export default function CerebroIA() {
  const [conhecimentos, setConhecimentos] = useState<Conhecimento[]>([]);
  const [loading, setLoading] = useState(true);
  const [novaRegra, setNovaRegra] = useState('');
  const [novaDescricao, setNovaDescricao] = useState('');
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    fetchConhecimentos();
  }, []);

  const fetchConhecimentos = async () => {
    try {
      const { data, error } = await supabase
        .from('ia_conhecimento')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setConhecimentos(data || []);
    } catch (error) {
      console.error('Erro ao buscar conhecimentos:', error);
      toast.error('Erro ao carregar conhecimentos da IA');
    } finally {
      setLoading(false);
    }
  };

  const adicionarRegra = async () => {
    if (!novaRegra.trim()) {
      toast.error('Digite uma regra válida');
      return;
    }

    setSalvando(true);
    try {
      const { error } = await supabase
        .from('ia_conhecimento')
        .insert({
          regra: novaRegra.trim(),
          descricao: novaDescricao.trim() || null,
        });

      if (error) throw error;

      toast.success('Regra adicionada com sucesso!');
      setNovaRegra('');
      setNovaDescricao('');
      fetchConhecimentos();
    } catch (error) {
      console.error('Erro ao adicionar regra:', error);
      toast.error('Erro ao adicionar regra');
    } finally {
      setSalvando(false);
    }
  };

  const toggleAtiva = async (id: number, ativa: boolean) => {
    try {
      const { error } = await supabase
        .from('ia_conhecimento')
        .update({ ativa: !ativa })
        .eq('id', id);

      if (error) throw error;

      setConhecimentos(prev => 
        prev.map(c => c.id === id ? { ...c, ativa: !ativa } : c)
      );
      
      toast.success(ativa ? 'Regra desativada' : 'Regra ativada');
    } catch (error) {
      console.error('Erro ao atualizar regra:', error);
      toast.error('Erro ao atualizar regra');
    }
  };

  const excluirRegra = async (id: number) => {
    if (!confirm('Tem certeza que deseja excluir esta regra?')) return;

    try {
      const { error } = await supabase
        .from('ia_conhecimento')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setConhecimentos(prev => prev.filter(c => c.id !== id));
      toast.success('Regra excluída');
    } catch (error) {
      console.error('Erro ao excluir regra:', error);
      toast.error('Erro ao excluir regra');
    }
  };

  const regrasAtivas = conhecimentos.filter(c => c.ativa).length;

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
          <Brain className="h-6 w-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Cérebro da IA</h1>
          <p className="text-muted-foreground">
            Ensine regras personalizadas para a IA processar seus documentos
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <BookOpen className="h-8 w-8 text-primary" />
              <div>
                <p className="text-2xl font-bold">{conhecimentos.length}</p>
                <p className="text-sm text-muted-foreground">Total de regras</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <Sparkles className="h-8 w-8 text-green-500" />
              <div>
                <p className="text-2xl font-bold">{regrasAtivas}</p>
                <p className="text-sm text-muted-foreground">Regras ativas</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <Lightbulb className="h-8 w-8 text-yellow-500" />
              <div>
                <p className="text-2xl font-bold">{conhecimentos.length - regrasAtivas}</p>
                <p className="text-sm text-muted-foreground">Regras inativas</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Adicionar nova regra */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Adicionar Nova Regra
          </CardTitle>
          <CardDescription>
            Ensine algo novo para a IA. Ela usará essas regras ao processar documentos.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Regra *</label>
            <Textarea
              placeholder="Ex: O fornecedor ACME sempre tem 2% de desconto para pagamento antecipado"
              value={novaRegra}
              onChange={(e) => setNovaRegra(e.target.value)}
              rows={2}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Descrição (opcional)</label>
            <Input
              placeholder="Ex: Acordo comercial vigente desde 2024"
              value={novaDescricao}
              onChange={(e) => setNovaDescricao(e.target.value)}
            />
          </div>
          <Button onClick={adicionarRegra} disabled={salvando || !novaRegra.trim()}>
            {salvando ? 'Salvando...' : 'Adicionar Regra'}
          </Button>
        </CardContent>
      </Card>

      {/* Lista de regras */}
      <Card>
        <CardHeader>
          <CardTitle>Regras Cadastradas</CardTitle>
          <CardDescription>
            A IA considera todas as regras ativas ao processar documentos
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              Carregando...
            </div>
          ) : conhecimentos.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhuma regra cadastrada ainda. Adicione sua primeira regra acima.
            </div>
          ) : (
            <div className="space-y-3">
              {conhecimentos.map((c) => (
                <div
                  key={c.id}
                  className={`flex items-start gap-4 p-4 rounded-lg border transition-colors ${
                    c.ativa ? 'bg-background' : 'bg-muted/50 opacity-60'
                  }`}
                >
                  <Switch
                    checked={c.ativa}
                    onCheckedChange={() => toggleAtiva(c.id, c.ativa)}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-medium">{c.regra}</p>
                      {c.ativa ? (
                        <Badge variant="default" className="text-xs">Ativa</Badge>
                      ) : (
                        <Badge variant="secondary" className="text-xs">Inativa</Badge>
                      )}
                    </div>
                    {c.descricao && (
                      <p className="text-sm text-muted-foreground">{c.descricao}</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      Criada em {new Date(c.created_at).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => excluirRegra(c.id)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Info */}
      <Card className="border-blue-200 bg-blue-50/50 dark:bg-blue-950/20 dark:border-blue-800">
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <Brain className="h-6 w-6 text-blue-500 shrink-0 mt-0.5" />
            <div className="space-y-2 text-sm">
              <p className="font-medium text-blue-900 dark:text-blue-100">
                Como funciona?
              </p>
              <ul className="list-disc list-inside space-y-1 text-blue-800 dark:text-blue-200">
                <li>Todas as regras ativas são enviadas para a IA em cada processamento</li>
                <li>A IA prioriza suas regras sobre o comportamento padrão</li>
                <li>Você pode desativar regras temporariamente sem excluí-las</li>
                <li>Use regras específicas como descontos de fornecedores, padrões de vencimento, etc.</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
