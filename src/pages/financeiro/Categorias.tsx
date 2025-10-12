import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Plus, FolderOpen, ChevronRight, ChevronDown,
  Trash2, SquarePen, ArchiveRestore, Archive, ArrowRightLeft
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from "@/components/ui/dialog";

type Categoria = {
  id: number;
  nome: string;
  tipo: "despesa" | "receita" | "transferencia";
  parent_id: number | null;
  ordem: number | null;
  archived: boolean;
  slug: string | null;
  cor: string | null;
};

type TreeNode = Categoria & { children: TreeNode[] };

const TIPOS: Array<{ value: Categoria["tipo"]; label: string }> = [
  { value: "despesa", label: "Despesa" },
  { value: "receita", label: "Receita" },
  { value: "transferencia", label: "Transferência" },
];

function Categorias() {
  const { toast } = useToast();

  // loading + dados
  const [loading, setLoading] = useState(true);
  const [categorias, setCategorias] = useState<Categoria[]>([]);

  // árvore/ux
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});
  const [showArchived, setShowArchived] = useState(false);
  const [search, setSearch] = useState("");

  // form
  const [editing, setEditing] = useState<Categoria | null>(null);
  const [form, setForm] = useState<Partial<Categoria>>({
    nome: "", tipo: "despesa", parent_id: null, ordem: 0, archived: false, cor: "#E2E8F0",
  });

  // mover (dialog rápido para trocar pai)
  const [moveOpen, setMoveOpen] = useState(false);
  const [moveNode, setMoveNode] = useState<Categoria | null>(null);
  const [moveParentId, setMoveParentId] = useState<string>("null");
  const [savingMove, setSavingMove] = useState(false);

  // ===== utils =====
  const resetForm = () => {
    setEditing(null);
    setForm({ nome: "", tipo: "despesa", parent_id: null, ordem: 0, archived: false, cor: "#E2E8F0" });
  };

  const toggleExpand = (id: number) => setExpanded((e) => ({ ...e, [id]: !e[id] }));

  // checa se B é descendente de A (para evitar loop ao mover)
  const isDescendant = (aId: number, bId: number, map: Map<number, TreeNode>): boolean => {
    const b = map.get(bId);
    if (!b) return false;
    const parent = b.parent_id;
    if (parent == null) return false;
    if (parent === aId) return true;
    return isDescendant(aId, parent, map);
  };

  // ===== fetch com fallback para ausência de "ordem" =====
  const fetchCategorias = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("categorias_financeiras")
        .select("*")
        .order("ordem", { ascending: true })
        .order("nome", { ascending: true });
      if (error) throw error;
      setCategorias((data || []) as Categoria[]);
    } catch (err: any) {
      const isColMissing =
        err?.code === "42703" ||
        (typeof err?.message === "string" &&
          err.message.toLowerCase().includes("column") &&
          err.message.includes("ordem"));
      if (isColMissing) {
        try {
          const { data, error } = await supabase
            .from("categorias_financeiras")
            .select("*")
            .order("nome", { ascending: true });
          if (error) throw error;
          setCategorias((data || []) as Categoria[]);
        } catch (inner) {
          console.error(inner);
          toast({ title: "Erro", description: "Não foi possível carregar categorias.", variant: "destructive" });
        }
      } else {
        console.error(err);
        toast({ title: "Erro", description: "Não foi possível carregar categorias.", variant: "destructive" });
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchCategorias(); }, []);

  // ===== monta árvore =====
  const tree = useMemo<TreeNode[]>(() => {
    const map = new Map<number, TreeNode>();
    const roots: TreeNode[] = [];
    (categorias || []).forEach((c) => map.set(c.id, { ...c, children: [] }));
    (categorias || []).forEach((c) => {
      const node = map.get(c.id)!;
      if (c.parent_id && map.has(c.parent_id)) map.get(c.parent_id)!.children.push(node);
      else roots.push(node);
    });
    const sortNodes = (nodes: TreeNode[]) => {
      nodes.sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0) || a.nome.localeCompare(b.nome));
      nodes.forEach((n) => sortNodes(n.children));
    };
    sortNodes(roots);
    return roots;
  }, [categorias]);

  // ===== filtro visual =====
  const filteredTree = useMemo<TreeNode[]>(() => {
    const term = search.trim().toLowerCase();
    const showNode = (n: TreeNode) => (showArchived || !n.archived);
    if (!term) {
      const filterArchived = (nodes: TreeNode[]): TreeNode[] =>
        nodes.filter(showNode).map((n) => ({ ...n, children: filterArchived(n.children) }));
      return filterArchived(tree);
    }
    const match = (n: TreeNode) => n.nome.toLowerCase().includes(term) && showNode(n);
    const recurse = (nodes: TreeNode[]): TreeNode[] =>
      nodes.map((n) => ({ ...n, children: recurse(n.children) }))
        .filter((n) => {
          if (match(n)) return true;
          const anyChild = (x: TreeNode): boolean => x.children.some((c) => match(c) || anyChild(c));
          return anyChild(n);
        });
    return recurse(tree);
  }, [tree, search, showArchived]);

  // ===== salvar / editar / excluir / arquivar =====
  const handleSave = async () => {
    if (!form.nome || !form.tipo) {
      toast({ title: "Atenção", description: "Preencha ao menos Nome e Tipo.", variant: "destructive" });
      return;
    }
    try {
      if (editing) {
        const { error } = await supabase.from("categorias_financeiras")
          .update({
            nome: form.nome,
            tipo: form.tipo,
            parent_id: form.parent_id ?? null,
            ordem: form.ordem ?? 0,
            archived: !!form.archived,
            cor: form.cor ?? "#E2E8F0",
          })
          .eq("id", editing.id);
        if (error) throw error;
        toast({ title: "Sucesso", description: "Categoria atualizada." });
      } else {
        const { error } = await supabase.from("categorias_financeiras")
          .insert([{
            nome: form.nome,
            tipo: form.tipo,
            parent_id: form.parent_id ?? null,
            ordem: form.ordem ?? 0,
            archived: !!form.archived,
            cor: form.cor ?? "#E2E8F0",
          }]);
        if (error) throw error;
        toast({ title: "Sucesso", description: "Categoria criada." });
      }
      await fetchCategorias();
      resetForm();
    } catch (err: any) {
      console.error(err);
      toast({ title: "Erro ao salvar", description: err?.message || "Falha ao salvar categoria.", variant: "destructive" });
    }
  };

  const handleEdit = (c: Categoria, asChildOf?: number | null) => {
    setEditing(c);
    setForm({
      nome: c.nome,
      tipo: c.tipo,
      parent_id: typeof asChildOf === "number" ? asChildOf : c.parent_id,
      ordem: c.ordem ?? 0,
      archived: c.archived,
      cor: c.cor ?? "#E2E8F0",
    });
  };

  const handleNewRoot = () => { resetForm(); };

  const canDelete = async (id: number) => {
    try {
      const { data, error } = await supabase.rpc("can_delete_categoria", { p_id: id });
      if (!error && typeof data === "boolean") return data;
    } catch {}
    const [{ count: filhos }, { count: uso }] = await Promise.all([
      supabase.from("categorias_financeiras").select("*", { count: "exact", head: true }).eq("parent_id", id),
      supabase.from("contas_pagar").select("*", { count: "exact", head: true }).eq("categoria_id", id),
    ]);
    return (filhos || 0) === 0 && (uso || 0) === 0;
  };

  const handleDelete = async (c: Categoria) => {
    const allowed = await canDelete(c.id);
    if (!allowed) {
      toast({ title: "Não é possível excluir", description: "Possui subcategorias ou está em uso em contas a pagar.", variant: "destructive" });
      return;
    }
    if (!confirm(`Excluir "${c.nome}"?`)) return;
    try {
      const { error } = await supabase.from("categorias_financeiras").delete().eq("id", c.id);
      if (error) throw error;
      if (editing?.id === c.id) resetForm();
      toast({ title: "Excluída", description: `Categoria "${c.nome}" foi excluída.` });
      fetchCategorias();
    } catch (err: any) {
      console.error(err);
      toast({ title: "Erro ao excluir", description: err?.message || "Falha ao excluir categoria.", variant: "destructive" });
    }
  };

  const toggleArchive = async (c: Categoria) => {
    try {
      const { error } = await supabase.from("categorias_financeiras")
        .update({ archived: !c.archived }).eq("id", c.id);
      if (error) throw error;
      toast({ title: c.archived ? "Ativada" : "Arquivada", description: `"${c.nome}" ${c.archived ? "reativada" : "arquivada"}.` });
      fetchCategorias();
    } catch (err: any) {
      console.error(err);
      toast({ title: "Erro", description: err?.message || "Falha ao alterar status.", variant: "destructive" });
    }
  };

  // ===== mover (dialog) =====
  const openMove = (c: Categoria) => {
    setMoveNode(c);
    setMoveParentId(c.parent_id == null ? "null" : String(c.parent_id));
    setMoveOpen(true);
  };

  const confirmMove = async () => {
    if (!moveNode) return;
    const newParentId = moveParentId === "null" ? null : parseInt(moveParentId, 10);

    // valida: não mover para si mesmo/descendente
    const map = new Map<number, TreeNode>();
    (categorias || []).forEach((c) => map.set(c.id, { ...(c as any), children: [] }));
    (categorias || []).forEach((c) => {
      const node = map.get(c.id)!;
      if (c.parent_id && map.has(c.parent_id)) map.get(c.parent_id)!.children.push(node);
    });

    if (newParentId === moveNode.id) {
      toast({ title: "Não é possível mover", description: "Categoria pai não pode ser ela mesma.", variant: "destructive" });
      return;
    }
    if (newParentId != null && isDescendant(moveNode.id, newParentId, map)) {
      toast({ title: "Não é possível mover", description: "Não mova para um descendente da própria categoria.", variant: "destructive" });
      return;
    }

    try {
      setSavingMove(true);
      const { error } = await supabase.from("categorias_financeiras")
        .update({ parent_id: newParentId }).eq("id", moveNode.id);
      if (error) throw error;
      toast({ title: "Movida", description: `"${moveNode.nome}" foi movida com sucesso.` });
      setMoveOpen(false);
      setMoveNode(null);
      await fetchCategorias();
      if (editing && editing.id === moveNode.id) {
        // mantém o form coerente
        setForm((f) => ({ ...f, parent_id: newParentId }));
      }
    } catch (err: any) {
      console.error(err);
      toast({ title: "Erro ao mover", description: err?.message || "Falha ao mover categoria.", variant: "destructive" });
    } finally {
      setSavingMove(false);
    }
  };

  // ===== nó da árvore =====
  const NodeRow: React.FC<{ n: TreeNode; level: number }> = ({ n, level }) => {
    const hasChildren = n.children.length > 0;
    const open = expanded[n.id] ?? true;
    if (!showArchived && n.archived) return null;

    return (
      <div className="py-1">
        <div className="flex items-center gap-2">
          <div className="flex items-center" style={{ paddingLeft: level * 16 }}>
            {hasChildren ? (
              <Button variant="ghost" size="icon" onClick={() => toggleExpand(n.id)} title={open ? "Recolher" : "Expandir"}>
                {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </Button>
            ) : <span style={{ width: 40 }} />}
            <FolderOpen className="h-4 w-4 text-primary mr-2" />
            <span className={`font-medium ${n.archived ? "line-through text-muted-foreground" : ""}`}>{n.nome}</span>
            <Badge variant="outline" className="ml-2">{n.tipo}</Badge>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => openMove(n)} title="Mover (trocar categoria pai)">
              <ArrowRightLeft className="h-4 w-4 mr-1" /> Mover
            </Button>
            <Button variant="outline" size="sm" onClick={() => handleEdit(n)} title="Editar">
              <SquarePen className="h-4 w-4 mr-1" /> Editar
            </Button>
            <Button variant="outline" size="sm" onClick={() => toggleArchive(n)} title={n.archived ? "Ativar" : "Arquivar"}>
              {n.archived ? <ArchiveRestore className="h-4 w-4 mr-1" /> : <Archive className="h-4 w-4 mr-1" />}
              {n.archived ? "Ativar" : "Arquivar"}
            </Button>
            <Button variant="outline" size="sm" onClick={() => handleDelete(n)} title="Excluir">
              <Trash2 className="h-4 w-4 mr-1" /> Excluir
            </Button>
          </div>
        </div>

        {hasChildren && open && (
          <div className="mt-1">
            {n.children.map((c) => <NodeRow key={c.id} n={c} level={level + 1} />)}
          </div>
        )}
      </div>
    );
  };

  // ===== UI =====
  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <h1 className="text-3xl font-bold">Categorias Financeiras</h1>
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Categorias Financeiras</h1>
          <p className="text-muted-foreground">Organize suas categorias em árvore de forma simples.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={handleNewRoot}>
            <Plus className="h-4 w-4 mr-2" />
            Nova (raiz)
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Árvore */}
        <Card>
          <CardHeader>
            <CardTitle>Estrutura</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
              <div className="relative flex-1 max-w-md">
                <Input
                  placeholder="Buscar por nome..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="showArchived"
                  checked={showArchived}
                  onCheckedChange={(v) => setShowArchived(!!v)}
                />
                <Label htmlFor="showArchived">Mostrar arquivadas</Label>
              </div>
            </div>

            <Separator className="mb-3" />

            {filteredTree.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma categoria encontrada.</p>
            ) : (
              <div className="space-y-1">
                {filteredTree.map((n) => <NodeRow key={n.id} n={n} level={0} />)}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Formulário */}
        <Card>
          <CardHeader>
            <CardTitle>{editing ? `Editar: ${editing.nome}` : "Nova Categoria"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-3">
              <div>
                <Label>Nome</Label>
                <Input
                  value={form.nome || ""}
                  onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
                  placeholder="Ex.: Despesas Operacionais"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <Label>Tipo</Label>
                  <Select
                    value={(form.tipo as string) || "despesa"}
                    onValueChange={(v) => setForm((f) => ({ ...f, tipo: v as Categoria["tipo"] }))}
                  >
                    <SelectTrigger><SelectValue placeholder="Tipo" /></SelectTrigger>
                    <SelectContent>
                      {TIPOS.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Ordem</Label>
                  <Input
                    type="number"
                    value={String(form.ordem ?? 0)}
                    onChange={(e) => setForm((f) => ({ ...f, ordem: parseInt(e.target.value || "0", 10) }))}
                  />
                </div>

                <div>
                  <Label>Cor (hex)</Label>
                  <Input
                    value={form.cor || "#E2E8F0"}
                    onChange={(e) => setForm((f) => ({ ...f, cor: e.target.value }))}
                    placeholder="#E2E8F0"
                  />
                </div>
              </div>

              <div>
                <Label>Categoria Pai</Label>
                <Select
                  value={form.parent_id !== null && form.parent_id !== undefined ? String(form.parent_id) : "null"}
                  onValueChange={(v) => setForm((f) => ({ ...f, parent_id: v === "null" ? null : parseInt(v, 10) }))}
                >
                  <SelectTrigger><SelectValue placeholder="(raiz)" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="null">(raiz)</SelectItem>
                    {categorias.map((c) => (
                      <SelectItem key={c.id} value={String(c.id)} disabled={editing?.id === c.id}>
                        {c.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  Para <strong>editar o “Categoria Pai”</strong>, basta escolher aqui um novo pai e clicar em <em>{editing ? "Salvar alterações" : "Criar categoria"}</em>.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Checkbox
                  id="archived"
                  checked={!!form.archived}
                  onCheckedChange={(v) => setForm((f) => ({ ...f, archived: !!v }))}
                />
                <Label htmlFor="archived">Arquivada</Label>
              </div>

              <div className="flex justify-end gap-2">
                {editing && <Button variant="outline" onClick={resetForm}>Cancelar</Button>}
                <Button onClick={handleSave}>{editing ? "Salvar alterações" : "Criar categoria"}</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Dialog Mover */}
      <Dialog open={moveOpen} onOpenChange={setMoveOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mover categoria</DialogTitle>
            <DialogDescription>
              Selecione um novo “Categoria Pai” para <strong>{moveNode?.nome}</strong>.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label>Novo pai</Label>
            <Select value={moveParentId} onValueChange={setMoveParentId}>
              <SelectTrigger><SelectValue placeholder="(raiz)" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="null">(raiz)</SelectItem>
                {categorias.map((c) => (
                  <SelectItem
                    key={c.id}
                    value={String(c.id)}
                    disabled={c.id === moveNode?.id} // não pode ser o próprio
                  >
                    {c.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Dica: não é permitido mover para dentro de si mesma ou de um descendente.
            </p>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setMoveOpen(false)}>Cancelar</Button>
            <Button onClick={confirmMove} disabled={savingMove}>
              {savingMove ? "Movendo..." : "Confirmar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export { Categorias }; // para compatibilizar com imports existentes
export default Categorias;
