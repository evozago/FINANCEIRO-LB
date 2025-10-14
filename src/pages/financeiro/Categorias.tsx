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

const SWATCHES = ["#E2E8F0","#FDE68A","#FCA5A5","#BFDBFE","#D1FAE5","#F5D0FE","#E9D5FF","#F3F4F6","#FCD34D","#86EFAC"];

// Erros de schema cache (PostgREST)
const hasSchemaCacheErrFor = (field: string, err: any) => {
  const msg = String(err?.message || "").toLowerCase();
  return err?.code === "PGRST204" || (msg.includes(field) && msg.includes("schema"));
};
const isOrdemMissing = (err: any) => {
  const msg = String(err?.message || "").toLowerCase();
  return err?.code === "42703" || (msg.includes("column") && msg.includes("ordem"));
};

function Categorias() {
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});
  const [showArchived, setShowArchived] = useState(false);
  const [search, setSearch] = useState("");

  const [editing, setEditing] = useState<Categoria | null>(null);
  const [form, setForm] = useState<Partial<Categoria>>({
    nome: "",
    tipo: "despesa",
    parent_id: null,
    ordem: 0,
    archived: false,
    cor: "#E2E8F0",
  });

  const [moveOpen, setMoveOpen] = useState(false);
  const [moveNode, setMoveNode] = useState<Categoria | null>(null);
  const [moveParentId, setMoveParentId] = useState<string>("null");
  const [savingMove, setSavingMove] = useState(false);

  const toggleExpand = (id: number) => setExpanded((e) => ({ ...e, [id]: !e[id] }));

  // ===== Fetch (fallback quando 'ordem' não existe ainda)
  const fetchCategorias = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("categorias_financeiras")
        .select("*")
        .order("ordem", { ascending: true })
        .order("nome", { ascending: true });
      if (error) throw error;
      setCategorias((data || []) as any);
    } catch (err: any) {
      if (isOrdemMissing(err)) {
        try {
          const { data, error } = await supabase
            .from("categorias_financeiras")
            .select("*")
            .order("nome", { ascending: true });
          if (error) throw error;
          setCategorias((data || []) as any);
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

  // ===== árvore
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

  // ===== filtro
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

  // ===== salvar (com returning:'minimal' e fallbacks)
  const handleSave = async () => {
    if (!form.nome || !form.tipo) {
      toast({ title: "Atenção", description: "Preencha ao menos Nome e Tipo.", variant: "destructive" });
      return;
    }

    const payloadFull = {
      nome: form.nome,
      tipo: form.tipo,
      parent_id: form.parent_id ?? null,
      ordem: form.ordem ?? 0,
      archived: !!form.archived,
      cor: form.cor ?? "#E2E8F0",
    };

    const { archived, ...payloadNoArchived } = payloadFull as any;
    const { cor, ...payloadNoCor } = payloadFull as any;
    const { cor: _c, archived: _a, ...payloadSemCorSemArchived } = payloadFull as any;

    const trySave = async (body: any) => {
      if (editing) {
        // returning:'minimal' evita que o supabase-js gere ?columns=... com colunas novas
        const { error } = await supabase
          .from("categorias_financeiras")
          .update(body)
          .eq("id", editing.id);
        if (error) throw error;
        toast({ title: "Sucesso", description: "Categoria atualizada." });
      } else {
        const { error } = await supabase
          .from("categorias_financeiras")
          .insert([body]);
        if (error) throw error;
        toast({ title: "Sucesso", description: "Categoria criada." });
      }
      await fetchCategorias();
      resetForm();
    };

    try {
      await trySave(payloadFull);
    } catch (err: any) {
      if (hasSchemaCacheErrFor("cor", err)) {
        try {
          await trySave(payloadNoCor);
          toast({ title: "Gravado sem 'cor' (fallback)", description: "Após o reload de schema, salve novamente para gravar a cor." });
          return;
        } catch (inner1: any) {
          if (hasSchemaCacheErrFor("archived", inner1)) {
            try {
              await trySave(payloadNoArchived);
              toast({ title: "Gravado sem 'archived' (fallback)", description: "Schema ainda não enxergava a coluna." });
              return;
            } catch (inner2: any) {
              if (hasSchemaCacheErrFor("cor", inner2) || hasSchemaCacheErrFor("archived", inner2)) {
                try {
                  await trySave(payloadSemCorSemArchived);
                  toast({ title: "Gravado (fallback máximo)", description: "Sem 'cor' e 'archived' por cache de schema." });
                  return;
                } catch (inner3: any) {
                  console.error(inner3);
                  toast({ title: "Erro ao salvar", description: inner3?.message || "Falha ao salvar.", variant: "destructive" });
                }
              } else {
                console.error(inner2);
                toast({ title: "Erro ao salvar", description: inner2?.message || "Falha ao salvar.", variant: "destructive" });
              }
            }
          } else {
            console.error(inner1);
            toast({ title: "Erro ao salvar", description: inner1?.message || "Falha ao salvar.", variant: "destructive" });
          }
        }
      } else if (hasSchemaCacheErrFor("archived", err)) {
        try {
          await trySave(payloadNoArchived);
          toast({ title: "Gravado sem 'archived' (fallback)", description: "Schema ainda não enxergava a coluna." });
        } catch (innerB: any) {
          if (hasSchemaCacheErrFor("cor", innerB)) {
            try {
              await trySave(payloadNoCor);
              toast({ title: "Gravado sem 'cor' (fallback)", description: "Atualize o schema para usar o campo de cor." });
            } catch (innerC: any) {
              if (hasSchemaCacheErrFor("cor", innerC) || hasSchemaCacheErrFor("archived", innerC)) {
                try {
                  await trySave(payloadSemCorSemArchived);
                  toast({ title: "Gravado (fallback máximo)", description: "Sem 'cor' e 'archived' por cache de schema." });
                } catch (innerD: any) {
                  console.error(innerD);
                  toast({ title: "Erro ao salvar", description: innerD?.message || "Falha ao salvar.", variant: "destructive" });
                }
              } else {
                console.error(innerC);
                toast({ title: "Erro ao salvar", description: innerC?.message || "Falha ao salvar.", variant: "destructive" });
              }
            }
          } else {
            console.error(innerB);
            toast({ title: "Erro ao salvar", description: innerB?.message || "Falha ao salvar.", variant: "destructive" });
          }
        }
      } else {
        console.error(err);
        toast({ title: "Erro ao salvar", description: err?.message || "Falha ao salvar.", variant: "destructive" });
      }
    }
  };

  const resetForm = () => {
    setEditing(null);
    setForm({ nome: "", tipo: "despesa", parent_id: null, ordem: 0, archived: false, cor: "#E2E8F0" });
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

  // ===== exclusão / arquivar / mover (iguais ao anterior)
  const canDelete = async (id: number) => {
    try {
      const { data, error } = await supabase.rpc("can_delete_categoria" as any, { p_id: id });
      if (!error && typeof data === "boolean") return data;
    } catch {}
    const [{ count: filhos }, { count: uso }] = await Promise.all([
      supabase.from("categorias_financeiras").select("*", { count: "exact", head: true }).eq("categoria_pai_id", id),
      supabase.from("contas_pagar").select("*", { count: "exact", head: true }).eq("categoria_id", id),
    ]);
    return (filhos || 0) === 0 && (uso || 0) === 0;
  };

  const handleDelete = async (c: Categoria) => {
    const allowed = await canDelete(c.id);
    if (!allowed) {
      toast({ title: "Não é possível excluir", description: "Possui subcategorias ou está em uso.", variant: "destructive" });
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
      toast({ title: "Erro ao excluir", description: err?.message || "Falha ao excluir.", variant: "destructive" });
    }
  };

  const toggleArchive = async (c: Categoria) => {
    try {
      const { error } = await supabase.from("categorias_financeiras").update({ archived: !(c as any).archived } as any).eq("id", c.id);
    if (error) throw error;
      toast({ title: (c as any).archived ? "Ativada" : "Arquivada", description: `"${c.nome}" ${(c as any).archived ? "reativada" : "arquivada"}.` });
      fetchCategorias();
    } catch (err: any) {
      if (hasSchemaCacheErrFor("archived", err)) {
        toast({ title: "Atualize o schema", description: "Rode a migration/notify para 'archived'.", variant: "destructive" });
      } else {
        console.error(err);
        toast({ title: "Erro", description: err?.message || "Falha ao alterar status.", variant: "destructive" });
      }
    }
  };

  const openMove = (c: Categoria) => {
    setMoveNode(c);
    setMoveParentId(c.parent_id == null ? "null" : String(c.parent_id));
    setMoveOpen(true);
  };

  const isDescendant = (aId: number, bId: number, map: Map<number, TreeNode>): boolean => {
    const b = map.get(bId);
    if (!b) return false;
    const parent = b.parent_id;
    if (parent == null) return false;
    if (parent === aId) return true;
    return isDescendant(aId, parent, map);
  };

  const confirmMove = async () => {
    if (!moveNode) return;
    const newParentId = moveParentId === "null" ? null : parseInt(moveParentId, 10);
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
      const { error } = await supabase.from("categorias_financeiras").update({ categoria_pai_id: newParentId } as any).eq("id", moveNode.id);
      if (error) throw error;
      toast({ title: "Movida", description: `"${moveNode.nome}" foi movida com sucesso.` });
      setMoveOpen(false);
      setMoveNode(null);
      await fetchCategorias();
      if (editing && editing.id === moveNode.id) setForm((f) => ({ ...f, parent_id: newParentId }));
    } catch (err: any) {
      console.error(err);
      toast({ title: "Erro ao mover", description: err?.message || "Falha ao mover.", variant: "destructive" });
    } finally {
      setSavingMove(false);
    }
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
          <p className="text-muted-foreground">Organize suas categorias em árvore de forma simples.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => { setEditing(null); setForm({ nome:"",tipo:"despesa",parent_id:null,ordem:0,archived:false,cor:"#E2E8F0" }); }}>
            <Plus className="h-4 w-4 mr-2" />
            Nova (raiz)
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Árvore - ocupa 2 colunas */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Estrutura de Categorias</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
              <div className="relative flex-1 max-w-md">
                <Input 
                  placeholder="Buscar por nome..." 
                  value={search} 
                  onChange={(e) => setSearch(e.target.value)} 
                  className="h-10"
                />
              </div>
              <div className="flex items-center gap-2">
                <Checkbox id="showArchived" checked={showArchived} onCheckedChange={(v) => setShowArchived(!!v)} />
                <Label htmlFor="showArchived" className="cursor-pointer">Mostrar arquivadas</Label>
              </div>
            </div>
            <Separator className="mb-4" />
            {filteredTree.length === 0 ? (
              <div className="text-center py-12">
                <FolderOpen className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                <p className="text-sm text-muted-foreground">Nenhuma categoria encontrada.</p>
              </div>
            ) : (
              <div className="space-y-1">
                {filteredTree.map((n) => (
                  <NodeRow key={n.id} n={n} level={0}
                    NodeRow={NodeRow} expanded={expanded} toggleExpand={toggleExpand}
                    handleEdit={handleEdit} toggleArchive={toggleArchive}
                    handleDelete={handleDelete} openMove={(c) => { setMoveNode(c); setMoveParentId(c.parent_id == null ? "null" : String(c.parent_id)); setMoveOpen(true); }}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Formulário - ocupa 1 coluna */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {editing ? (
                <>
                  <SquarePen className="h-5 w-5" />
                  Editar Categoria
                </>
              ) : (
                <>
                  <Plus className="h-5 w-5" />
                  Nova Categoria
                </>
              )}
            </CardTitle>
            {editing && (
              <p className="text-sm text-muted-foreground mt-1">
                Editando: <strong>{editing.nome}</strong>
              </p>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-4">
              <div>
                <Label htmlFor="categoria-nome">Nome da Categoria</Label>
                <Input 
                  id="categoria-nome"
                  value={form.nome || ""} 
                  onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))} 
                  placeholder="Ex.: Despesas Operacionais" 
                  className="mt-1.5"
                />
              </div>

              <div>
                <Label htmlFor="categoria-tipo">Tipo</Label>
                <Select value={(form.tipo as string) || "despesa"} onValueChange={(v) => setForm((f) => ({ ...f, tipo: v as Categoria["tipo"] }))}>
                  <SelectTrigger id="categoria-tipo" className="mt-1.5">
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    {TIPOS.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        <Badge variant={t.value === "despesa" ? "destructive" : t.value === "receita" ? "default" : "secondary"} className="mr-2">
                          {t.label}
                        </Badge>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
                      <SelectItem key={c.id} value={String(c.id)} disabled={editing?.id === c.id}>{c.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  Para <strong>editar o “Categoria Pai”</strong>, escolha aqui um novo pai e clique em <em>{editing ? "Salvar alterações" : "Criar categoria"}</em>.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Checkbox 
                  id="archived" 
                  checked={!!form.archived} 
                  onCheckedChange={(v) => setForm((f) => ({ ...f, archived: !!v }))} 
                />
                <Label htmlFor="archived" className="cursor-pointer">
                  Categoria arquivada
                </Label>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                {editing && (
                  <Button 
                    variant="outline" 
                    onClick={() => { 
                      setEditing(null); 
                      setForm({ nome:"",tipo:"despesa",parent_id:null,ordem:0,archived:false,cor:"#E2E8F0" }); 
                    }}
                  >
                    Cancelar
                  </Button>
                )}
                <Button onClick={handleSave}>
                  {editing ? "Salvar Alterações" : "Criar Categoria"}
                </Button>
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
            <DialogDescription>Selecione um novo “Categoria Pai” para <strong>{moveNode?.nome}</strong>.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Novo pai</Label>
            <Select value={moveParentId} onValueChange={setMoveParentId}>
              <SelectTrigger><SelectValue placeholder="(raiz)" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="null">(raiz)</SelectItem>
                {categorias.map((c) => (
                  <SelectItem key={c.id} value={String(c.id)} disabled={c.id === moveNode?.id}>{c.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">Dica: não é permitido mover para si mesma ou para um descendente.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMoveOpen(false)}>Cancelar</Button>
            <Button onClick={confirmMove} disabled={savingMove}>{savingMove ? "Movendo..." : "Confirmar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

const NodeRow: React.FC<{
  n: TreeNode;
  level: number;
  NodeRow: any;
  expanded: Record<number, boolean>;
  toggleExpand: (id: number) => void;
  handleEdit: (c: Categoria) => void;
  toggleArchive: (c: Categoria) => void;
  handleDelete: (c: Categoria) => void;
  openMove: (c: Categoria) => void;
}> = ({ n, level, NodeRow, expanded, toggleExpand, handleEdit, toggleArchive, handleDelete, openMove }) => {
  const hasChildren = n.children.length > 0;
  const open = expanded[n.id] ?? true;
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
          <Button variant="outline" size="sm" onClick={() => openMove(n)} title="Mover"><ArrowRightLeft className="h-4 w-4 mr-1" /> Mover</Button>
          <Button variant="outline" size="sm" onClick={() => handleEdit(n)} title="Editar"><SquarePen className="h-4 w-4 mr-1" /> Editar</Button>
          <Button variant="outline" size="sm" onClick={() => toggleArchive(n)} title={n.archived ? "Ativar" : "Arquivar"}>
            {n.archived ? <ArchiveRestore className="h-4 w-4 mr-1" /> : <Archive className="h-4 w-4 mr-1" />}
            {n.archived ? "Ativar" : "Arquivar"}
          </Button>
          <Button variant="outline" size="sm" onClick={() => handleDelete(n)} title="Excluir"><Trash2 className="h-4 w-4 mr-1" /> Excluir</Button>
        </div>
      </div>
      {hasChildren && open && (
        <div className="mt-1">
          {n.children.map((c) => (
            <NodeRow key={c.id} n={c} level={level + 1}
              NodeRow={NodeRow} expanded={expanded} toggleExpand={toggleExpand}
              handleEdit={handleEdit} toggleArchive={toggleArchive}
              handleDelete={handleDelete} openMove={openMove}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export { Categorias };
export default Categorias;
