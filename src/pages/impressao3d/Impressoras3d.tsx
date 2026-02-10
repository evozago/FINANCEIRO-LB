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
import { Plus, Printer, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

export default function Impressoras3d() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState({ nome: '', modelo: '', potencia_watts: 200, custo_aquisicao_centavos: 0, vida_util_horas: 5000 });

  const { data: items = [] } = useQuery({
    queryKey: ['print3d-impressoras-all'],
    queryFn: async () => { const { data } = await supabase.from('print3d_impressoras').select('*').order('nome'); return data || []; },
  });

  const save = useMutation({
    mutationFn: async () => {
      if (editId) { await supabase.from('print3d_impressoras').update(form).eq('id', editId); }
      else { await supabase.from('print3d_impressoras').insert(form); }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['print3d-impressoras-all'] }); setOpen(false); setEditId(null); toast.success('Impressora salva!'); },
    onError: (e: any) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: number) => { await supabase.from('print3d_impressoras').delete().eq('id', id); },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['print3d-impressoras-all'] }); toast.success('Removida!'); },
  });

  const depreciacao = (form.custo_aquisicao_centavos / 100) / (form.vida_util_horas || 1);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Printer className="h-6 w-6" /> Impressoras</h1>
          <p className="text-muted-foreground">Máquinas e cálculo de depreciação</p>
        </div>
        <Dialog open={open} onOpenChange={v => { setOpen(v); if (!v) { setEditId(null); setForm({ nome: '', modelo: '', potencia_watts: 200, custo_aquisicao_centavos: 0, vida_util_horas: 5000 }); } }}>
          <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" /> Nova Impressora</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{editId ? 'Editar' : 'Nova'} Impressora</DialogTitle></DialogHeader>
            <form onSubmit={e => { e.preventDefault(); save.mutate(); }} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Nome *</Label><Input required value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} placeholder="Ender 3 V3" /></div>
                <div><Label>Modelo</Label><Input value={form.modelo} onChange={e => setForm(f => ({ ...f, modelo: e.target.value }))} /></div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div><Label>Potência (W)</Label><Input type="number" value={form.potencia_watts} onChange={e => setForm(f => ({ ...f, potencia_watts: Number(e.target.value) }))} /></div>
                <div><Label>Custo Aquisição (R$)</Label><Input type="number" step="0.01" value={(form.custo_aquisicao_centavos / 100).toFixed(2)} onChange={e => setForm(f => ({ ...f, custo_aquisicao_centavos: Math.round(Number(e.target.value) * 100) }))} /></div>
                <div><Label>Vida Útil (h)</Label><Input type="number" value={form.vida_util_horas} onChange={e => setForm(f => ({ ...f, vida_util_horas: Number(e.target.value) }))} /></div>
              </div>
              <Card className="bg-muted/50 p-4">
                <p className="text-sm text-muted-foreground">Depreciação por hora: <strong className="text-primary">R$ {depreciacao.toFixed(4)}</strong></p>
              </Card>
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
              <TableHead>Nome</TableHead><TableHead>Modelo</TableHead><TableHead>Potência</TableHead><TableHead>Custo</TableHead><TableHead>Vida Útil</TableHead><TableHead>Deprec./h</TableHead><TableHead>Status</TableHead><TableHead className="w-24">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((i: any) => (
              <TableRow key={i.id}>
                <TableCell className="font-medium">{i.nome}</TableCell>
                <TableCell>{i.modelo || '-'}</TableCell>
                <TableCell>{i.potencia_watts}W</TableCell>
                <TableCell>R$ {(i.custo_aquisicao_centavos / 100).toFixed(2)}</TableCell>
                <TableCell>{i.vida_util_horas}h</TableCell>
                <TableCell className="text-primary font-medium">R$ {((i.custo_aquisicao_centavos / 100) / (i.vida_util_horas || 1)).toFixed(4)}</TableCell>
                <TableCell><Badge variant={i.ativo ? 'default' : 'secondary'}>{i.ativo ? 'Ativa' : 'Inativa'}</Badge></TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" onClick={() => { setEditId(i.id); setForm({ nome: i.nome, modelo: i.modelo || '', potencia_watts: i.potencia_watts, custo_aquisicao_centavos: i.custo_aquisicao_centavos, vida_util_horas: i.vida_util_horas }); setOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" className="text-destructive" onClick={() => { if (confirm('Remover?')) del.mutate(i.id); }}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {items.length === 0 && <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">Nenhuma impressora cadastrada</TableCell></TableRow>}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
