import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Brain, Plus, Trash2, Save, Loader2, Lightbulb, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

interface Conhecimento {
  id: number;
  titulo: string;
  conteudo: string;
  tipo: string;
  ativo: boolean;
  created_at: string;
}

const CerebroIA = () => {
  const [conhecimentos, setConhecimentos] = useState<Conhecimento[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({ titulo: "", conteudo: "", tipo: "regra" });
  const { toast } = useToast();

  const fetchConhecimentos = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("ia_conhecimento" as any)
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Erro ao carregar conhecimentos:", error);
      toast({ title: "Erro", description: "Não foi possível carregar os conhecimentos", variant: "destructive" });
    } else {
      setConhecimentos((data as any[]) || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchConhecimentos();
  }, []);

  const handleSave = async () => {
    if (!form.titulo.trim() || !form.conteudo.trim()) {
      toast({ title: "Erro", description: "Título e conteúdo são obrigatórios", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      if (editingId) {
        const { error } = await supabase
          .from("ia_conhecimento" as any)
          .update({ titulo: form.titulo, conteudo: form.conteudo, tipo: form.tipo, updated_at: new Date().toISOString() } as any)
          .eq("id", editingId);
        if (error) throw error;
        toast({ title: "Sucesso", description: "Conhecimento atualizado" });
      } else {
        const { error } = await supabase
          .from("ia_conhecimento" as any)
          .insert({ titulo: form.titulo, conteudo: form.conteudo, tipo: form.tipo } as any);
        if (error) throw error;
        toast({ title: "Sucesso", description: "Conhecimento adicionado" });
      }

      setForm({ titulo: "", conteudo: "", tipo: "regra" });
      setEditingId(null);
      setDialogOpen(false);
      fetchConhecimentos();
    } catch (error: any) {
      toast({ title: "Erro", description: error.message || "Erro ao salvar", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (id: number, ativo: boolean) => {
    const { error } = await supabase
      .from("ia_conhecimento" as any)
      .update({ ativo: !ativo } as any)
      .eq("id", id);

    if (error) {
      toast({ title: "Erro", description: "Erro ao alterar status", variant: "destructive" });
    } else {
      setConhecimentos(prev => prev.map(c => c.id === id ? { ...c, ativo: !ativo } : c));
    }
  };

  const handleDelete = async (id: number) => {
    const { error } = await supabase
      .from("ia_conhecimento" as any)
      .delete()
      .eq("id", id);

    if (error) {
      toast({ title: "Erro", description: "Erro ao excluir", variant: "destructive" });
    } else {
      toast({ title: "Excluído", description: "Conhecimento removido" });
      setConhecimentos(prev => prev.filter(c => c.id !== id));
    }
  };

  const handleEdit = (c: Conhecimento) => {
    setEditingId(c.id);
    setForm({ titulo: c.titulo, conteudo: c.conteudo, tipo: c.tipo });
    setDialogOpen(true);
  };

  const handleNew = () => {
    setEditingId(null);
    setForm({ titulo: "", conteudo: "", tipo: "regra" });
    setDialogOpen(true);
  };

  const tipoLabel: Record<string, string> = {
    regra: "Regra de Negócio",
    contexto: "Contexto",
    instrucao: "Instrução",
  };

  const ativos = conhecimentos.filter(c => c.ativo).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Brain className="h-7 w-7 text-primary" />
            Cérebro da IA
          </h1>
          <p className="text-muted-foreground mt-1">
            Ensine regras de negócio para a IA aplicar automaticamente ao processar documentos
          </p>
        </div>
        <Button onClick={handleNew}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Conhecimento
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{conhecimentos.length}</div>
            <p className="text-sm text-muted-foreground">Total de regras</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-600">{ativos}</div>
            <p className="text-sm text-muted-foreground">Regras ativas</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-muted-foreground">{conhecimentos.length - ativos}</div>
            <p className="text-sm text-muted-foreground">Regras inativas</p>
          </CardContent>
        </Card>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : conhecimentos.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Lightbulb className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhum conhecimento cadastrado</h3>
            <p className="text-muted-foreground mb-4 max-w-md">
              Adicione regras como "Fornecedor X sempre tem 1% de desconto" ou "Conta de luz vai para categoria Utilidades"
            </p>
            <Button onClick={handleNew}>
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Primeiro Conhecimento
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {conhecimentos.map(c => (
            <Card key={c.id} className={`transition-opacity ${!c.ativo ? "opacity-50" : ""}`}>
              <CardContent className="flex items-center gap-4 py-4">
                <Switch checked={c.ativo} onCheckedChange={() => handleToggle(c.id, c.ativo)} />
                <div className="flex-1 min-w-0 cursor-pointer" onClick={() => handleEdit(c)}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold truncate">{c.titulo}</span>
                    <Badge variant="secondary" className="text-xs">{tipoLabel[c.tipo] || c.tipo}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground truncate">{c.conteudo}</p>
                </div>
                <Button variant="ghost" size="icon" onClick={() => handleDelete(c.id)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? "Editar Conhecimento" : "Novo Conhecimento"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Título</Label>
              <Input
                placeholder="Ex: Desconto Fornecedor X"
                value={form.titulo}
                onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))}
              />
            </div>
            <div>
              <Label>Tipo</Label>
              <select
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={form.tipo}
                onChange={e => setForm(f => ({ ...f, tipo: e.target.value }))}
              >
                <option value="regra">Regra de Negócio</option>
                <option value="contexto">Contexto</option>
                <option value="instrucao">Instrução</option>
              </select>
            </div>
            <div>
              <Label>Conteúdo / Regra</Label>
              <Textarea
                placeholder="Ex: Quando o fornecedor for 'Vivo', sempre aplicar 1% de desconto e categorizar como 'Telecomunicações'"
                value={form.conteudo}
                onChange={e => setForm(f => ({ ...f, conteudo: e.target.value }))}
                className="min-h-[120px]"
              />
            </div>
            <Button onClick={handleSave} disabled={saving} className="w-full">
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
              {editingId ? "Atualizar" : "Salvar"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CerebroIA;
