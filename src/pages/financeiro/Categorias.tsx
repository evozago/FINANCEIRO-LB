import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Plus, FolderOpen, ChevronRight, ChevronDown, Trash2, SquarePen,
  ArchiveRestore, Archive, GripVertical
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

// dnd-kit
import {
  DndContext,
  DragEndEvent,
  closestCenter,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

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

// --- Sortable item (apenas a linha do nó, sem filhos) ---
function SortableRow(props: {
  id: number;
  children: React.ReactNode;
}) {
  const { id, children } = props;
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };
  return (
    <div ref={setNodeRef} style={style} className="py-1">
      <div className="flex items-center gap-2">
        <span
          className="cursor-grab active:cursor-grabbing text-muted-foreground"
          {...attributes}
          {...listeners}
          title="Arraste para reordenar entre irmãos"
        >
          <GripVertical className="h-4 w-4" />
        </span>
        {children}
      </div>
    </div>
  );
}

export default function Categorias() {
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});
  const [showArchived, setShowArchived] = useState(false);
  const [search, setSearch] = useState("");

  // Form
  const [editing, setEditing] = useState<Categoria | null>(null);
  const [form, setForm] = useState<Partial<Categoria>>({
    nome: "",
    tipo: "despesa",
    parent_id: null,
    ordem: 0,
    archived: false,
    cor: "#E2E8F0",
  });

  const resetForm = () => {
    setEditing(null);
    setForm({
      nome: "",
      tipo: "despesa",
      parent_id: null,
      ordem: 0,
      archived: false,
      cor: "#E2E8F0",
    });
  };

  const fetchCategorias = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("categorias_financeiras")
        .select("*")
        .order("parent_id", { ascending: true })
        .order("ordem", { ascending: true })
        .order("nome", { ascending: true });

      if (error) throw error;
      setCategorias((data || []) as Categoria[]);
    } catch (err) {
      console.error(err);
      toast({ title: "Erro", description: "Não foi possível carregar categorias.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategorias();
  }, []);

  // Monta árvore
  const tree = useMemo<TreeNode[]>(() => {
    const map = new Map<number, TreeNode>();
    const roots: TreeNode[] = [];
    (categorias || []).forEach((c) => map.set(c.id, { ...c, children: [] }));
    (categorias || []).forEach((c) => {
      const node = map.get(c.id)!;
      if (c.parent_id && map.has(c.parent_id)) {
        map.get(c.parent_id)!.children.push(node);
      } else {
        roots.push(node);
      }
    });
    const sortNodes = (nodes: TreeNode[]) => {
      nodes.sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0) || a.nome.localeCompare(b.nome));
      nodes.forEach((n) => sortNodes(n.children));
    };
    sortNodes(roots);
    return roots;
  }, [categorias]);

  // Filtro por nome + arquivadas
  const filteredTree = useMemo<TreeNode[]>(() => {
    const term = search.trim().toLowerCase();
    const match = (n: TreeNode) =>
      n.nome.toLowerCase().includes(term) && (showArchived || !n.archived);

    if (!term && showArchived) return tree;
    if (!term && !showArchived) {
      const filterArchived = (nodes: TreeNode[]): TreeNode[] =>
        nodes
          .filter((n) => !n.archived)
          .map((n) => ({ ...n, children: filterArchived(n.children) }));
      return filterArchived(tree);
    }
    const recurse = (nodes: TreeNode[]): TreeNode[] =>
      nodes
        .map((n) => ({ ...n, children: recurse(n.children) }))
        .filter((n) => {
          if (match(n)) return true;
          const anyChild = (x: TreeNode): boolean => x.children.some((c) => match(c) || anyChild(c));
          return anyChild(n);
        });
    return recurse(tree);
  }, [tree, search, showArchived]);

  const toggleExpand = (id: number) => setExpanded((e) => ({ ...e, [id]: !e[id] }));

  // ---------- Form Ações ----------
  const handleSave = async () => {
    if (!form.nome || !form.tipo) {
      toast({ title: "Atenção", description: "Preencha ao menos Nome e Tipo.", variant: "destructive" });
      return;
    }
    try {
      if (editing) {
        const { error } = await supabase
          .from("categorias_financeiras")
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
        const { error } = await supabase.from("categorias_financeiras").insert([{
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

  const handleNewRoot = () => {
    resetForm();
  };

  const handleNewChild = (parentId: number) => {
    resetForm();
    setForm((f) => ({ ...f, parent_id: parentId }));
  };

  const canDelete = async (id: number) => {
    const { data, error } = await supabase.rpc("can_delete_categoria", { p_id: id });
    if (!error && typeof data === "boolean") return data;

    const [{ count: filhos }, { count: uso }] = await Promise.all([
      supabase.from("categorias_financeiras").select("*", { count: "exact", head: true }).eq("parent_id", id),
      supabase.from("contas_pagar").select("*", { count: "exact", head: true }).eq("categoria_id", id),
    ]);
    return (filhos || 0) === 0 && (uso || 0) === 0;
  };

  const handleDelete = async (c: Categoria) => {
    try {
      const allowed = await canDelete(c.id);
      if (!allowed) {
        toast({ title: "Não é possível excluir", description: "Categoria possui subcategorias ou está em uso.", variant: "destructive" });
        return;
      }
      if (!confirm(`Excluir "${c.nome}"?`)) return;

      const { error } = await supabase.from("categorias_financeiras").delete().eq("id", c.id);
      if (error) throw error;

      toast({ title: "Excluída", description: `Categoria "${c.nome}" foi excluída.` });
      if (editing?.id === c.id) resetForm();
      await fetchCategorias();
    } catch (err: any) {
      console.error(err);
      toast({ title: "Erro ao excluir", description: err?.message || "Falha ao excluir categoria.", variant: "destructive" });
    }
  };

  const toggleArchive = async (c: Categoria) => {
    try {
      const { error } = await supabase
        .from("categorias_financeiras")
        .update({ archived: !c.archived })
        .eq("id", c.id);
      if (error) throw error;
      toast({ title: c.archived ? "Ativada" : "Arquivada", description: `"${c.nome}" ${c.archived ? "reativada" : "arquivada"}.` });
      await fetchCategorias();
    } catch (err: any) {
      console.error(err);
      toast({ title: "Erro", description: err?.message || "Falha ao alterar status.", variant: "destructive" });
    }
  };

  // ---------- Drag & Drop (reordena entre IRMÃOS) ----------
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 8 } })
  );

  // Util: retorna todos irmãos (não filtrado) de um nó
  const siblingsOf = (nodeId: number): Categoria[] => {
    const node = categorias.find(c => c.id === nodeId);
    const parentId = node?.parent_id ?? null;
    return categorias
      .filter(c => (c.parent_id ?? null) === parentId)
      .sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0) || a.nome.localeCompare(b.nome));
  };

  // Persiste uma ordem para um grupo de irmãos
  const persistOrder = async (siblings: Categoria[]) => {
    // Reatribui 0..N
    const withOrder = siblings.map((s, i) => ({ id: s.id, ordem: i, parent_id: s.parent_id }));
    // Atualiza um por um (compat mais ampla)
    await Promise.all(
      withOrder.map(row =>
        supabase.from("categorias_financeiras").update({ ordem: row.ordem }).eq("id", row.id)
      )
    );
  };

  const onDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!active?.id || !over?.id) return;

    const aId = Number(active.id);
    const bId = Number(over.id);

    const a = categorias.find(c => c.id === aId);
    const b = categorias.find(c => c.id === bId);
    if (!a || !b) return;

    // Só permite reorder se forem irmãos
    const aParent = a.parent_id ?? null;
    const bParent = b.parent_id ?? null;
    if (aParent !== bParent) {
      toast({
        title: "Mover entre pais",
        description: "Para mover para outro pai, edite no formulário (campo 'Categoria Pai').",
      });
      return;
    }

    const sibs = siblingsOf(aId);
    const ids = sibs.map(s => s.id);
    const from = ids.indexOf(aId);
    const to = ids.indexOf(bId);
    if (from < 0 || to < 0 || from === to) return;

    // Reordena no client
    const reordered = [...sibs];
    const [moved] = reordered.splice(from, 1);
    reordered.splice(to, 0, moved);

    try {
      await persistOrder(reordered);
      await fetchCategorias();
    } catch (err: any) {
      console.error(err);
      toast({ title: "Erro ao reordenar", description: err?.message || "Falha ao gravar ordem.", variant: "destructive" });
    }
  };

  // ---------- UI: NodeRow e listas por nível ----------
  const NodeHeader: React.FC<{ n: TreeNode; level: number }> = ({ n, level }) => {
    const hasChildren = n.children.length > 0;
    const open = expanded[n.id] ?? true;

    if (!showArchived && n.archived) return null;

    return (
      <>
        <div className="flex items-center gap-2 w-full" style={{ paddingLeft: level * 16 }}>
          {hasChildren ? (
            <Button variant="ghost" size="icon" onClick={() => toggleExpand(n.id)} title={open ? "Recolher" : "Expandir"}>
              {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </Button>
          ) : <span style={{ width: 40 }} />}

          <FolderOpen className="h-4 w-4 text-primary mr-2" />
          <span className={`font-medium ${n.archived ? "line-through text-muted-foreground" : ""}`}>{n.nome}</span>
          <Badge variant="outline" className="ml-2">{n.tipo}</Badge>
          {n.archived && <Badge variant="secondary" className="ml-1">arquivada</Badge>}

          <div className="ml-auto flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => handleNewChild(n.id)} title="Nova subcategoria">
              <Plus className="h-4 w-4 mr-1" /> Filho
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
      </>
    );
  };

  // Lista por nível com SortableContext (reordenar irmãos)
  const NodeList: React.FC<{ nodes: TreeNode[]; level: number }> = ({ nodes, level }) => {
    if (nodes.length === 0) return null;

    const items = nodes.map(n => n.id);

    return (
      <SortableContext items={items} strategy={verticalListSortingStrategy}>
        {nodes.map((n) => (
          <div key={n.id}>
            <SortableRow id={n.id}>
              <NodeHeader n={n} level={level} />
            </SortableRow>
            {(expanded[n.id] ?? true) && n.children.length > 0 && (
              <div className="ml-8">
                <NodeList nodes={n.children} level={level + 1} />
              </div>
            )}
          </div>
        ))}
      </SortableContext>
    );
  };

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
          <p className="text-muted-foreground">Organize suas categorias com drag & drop (reordenar irmãos) e formulário para mover de pai.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={handleNewRoot}>
            <Plus className="h-4 w-4 mr-2" />
            Nova (raiz)
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ÁRVORE */}
        <Card>
          <CardHeader>
            <CardTitle>Estrutura</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 mb-3">
              <Input
                placeholder="Buscar por nome..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="max-w-sm"
              />
              <div className="flex items-center gap-2">
                <Checkbox id="showArchived" checked={showArchived} onCheckedChange={(v) => setShowArchived(!!v)} />
                <Label htmlFor="showArchived">Mostrar arquivadas</Label>
              </div>
            </div>

            <Separator className="mb-3" />

            {filteredTree.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma categoria encontrada.</p>
            ) : (
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
                <NodeList nodes={filteredTree} level={0} />
              </DndContext>
            )}
          </CardContent>
        </Card>

        {/* FORM */}
        <Card>
          <CardHeader>
            <CardTitle>{editing ? `Editar: ${editing.nome}` : "Nova Categoria"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
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
                    {TIPOS.map((t) => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Ordem</Label>
                <Input
                  type="number"
                  value={String(form.ordem ?? 0)}
                  onChange={(e) => setForm((f) => ({ ...f, ordem: parseInt(e.target.value || "0") }))}
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
                onValueChange={(v) => setForm((f) => ({ ...f, parent_id: v === "null" ? null : parseInt(v) }))}
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
              {editing && (
                <Button variant="outline" onClick={resetForm}>
