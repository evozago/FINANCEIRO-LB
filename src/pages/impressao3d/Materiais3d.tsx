import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Plus, Boxes, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

export default function Materiais3d() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState({ nome: '', tipo: 'PLA', marca: '', cor: '', peso_kg: 1, preco_kg_centavos: 0 });

  const { data: materiais = [] } = useQuery({
    queryKey: ['print3d-materiais-all'],
    queryFn: async () => { const { data } = await supabase.from('print3d_materiais').select('*').order('nome'); return data || []; },
  });

  const save = useMutation({
    mutationFn: async () => {
      const payload = { ...form };
      if (editId) { await supabase.from('print3d_materiais').update(payload).eq('id', editId); }
      else { await supabase.from('print3d_materiais').insert(payload); }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['print3d-materiais-all'] }); setOpen(false); setEditId(null); toast.success('Material salvo!'); },
    onError: (e: any) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: number) => { await supabase.from('print3d_materiais').delete().eq('id', id); },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['print3d-materiais-all'] }); toast.success('Removido!'); },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Boxes className="h-6 w-6" /> Materiais</h1>
          <p className="text-muted-foreground">Filamentos e materiais de impressão</p>
        </div>
        <Dialog open={open} onOpenChange={v => { setOpen(v); if (!v) { setEditId(null); setForm({ nome: '', tipo: 'PLA', marca: '', cor: '', peso_kg: 1, preco_kg_centavos: 0 }); } }}>
          <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" /> Novo Material</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{editId ? 'Editar' : 'Novo'} Material</DialogTitle></DialogHeader>
            <form onSubmit={e => { e.preventDefault(); save.mutate(); }} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Nome *</Label><Input required value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} placeholder="PLA Branco eSUN" /></div>
                <div><Label>Tipo</Label><Input value={form.tipo} onChange={e => setForm(f => ({ ...f, tipo: e.target.value }))} placeholder="PLA, PETG, ABS" /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Marca</Label><Input value={form.marca} onChange={e => setForm(f => ({ ...f, marca: e.target.value }))} /></div>
                <div><Label>Cor</Label><Input value={form.cor} onChange={e => setForm(f => ({ ...f, cor: e.target.value }))} /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Peso do rolo (kg)</Label><Input type="number" step="0.1" value={form.peso_kg} onChange={e => setForm(f => ({ ...f, peso_kg: Number(e.target.value) }))} /></div>
                <div><Label>Preço por kg (R$)</Label><Input type="number" step="0.01" value={(form.preco_kg_centavos / 100).toFixed(2)} onChange={e => setForm(f => ({ ...f, preco_kg_centavos: Math.round(Number(e.target.value) * 100) }))} /></div>
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                <Button type="submit" disabled={save.isPending}>Salvar</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead><TableHead>Tipo</TableHead><TableHead>Marca</TableHead><TableHead>Cor</TableHead><TableHead>Preço/kg</TableHead><TableHead>Status</TableHead><TableHead className="w-24">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {materiais.map((m: any) => (
              <TableRow key={m.id}>
                <TableCell className="font-medium">{m.nome}</TableCell>
                <TableCell><Badge variant="outline">{m.tipo}</Badge></TableCell>
                <TableCell>{m.marca || '-'}</TableCell>
                <TableCell>{m.cor || '-'}</TableCell>
                <TableCell>R$ {(m.preco_kg_centavos / 100).toFixed(2)}</TableCell>
                <TableCell><Badge variant={m.ativo ? 'default' : 'secondary'}>{m.ativo ? 'Ativo' : 'Inativo'}</Badge></TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" onClick={() => { setEditId(m.id); setForm({ nome: m.nome, tipo: m.tipo, marca: m.marca || '', cor: m.cor || '', peso_kg: m.peso_kg, preco_kg_centavos: m.preco_kg_centavos }); setOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" className="text-destructive" onClick={() => { if (confirm('Remover?')) del.mutate(m.id); }}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {materiais.length === 0 && <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">Nenhum material cadastrado</TableCell></TableRow>}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
