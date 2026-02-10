import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Plus, BarChart3, Trash2, TrendingUp, TrendingDown } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

export default function Vendas3d() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ produto_id: '', marketplace_id: '', data_venda: new Date().toISOString().split('T')[0], quantidade: 1, receita_centavos: 0, custo_total_centavos: 0 });

  const { data: vendas = [] } = useQuery({
    queryKey: ['print3d-vendas'],
    queryFn: async () => {
      const { data } = await supabase.from('print3d_vendas').select('*, print3d_produtos(nome_marketplace), print3d_marketplaces(nome)').order('data_venda', { ascending: false }).limit(100);
      return data || [];
    },
  });

  const { data: produtos = [] } = useQuery({
    queryKey: ['print3d-produtos-select'],
    queryFn: async () => { const { data } = await supabase.from('print3d_produtos').select('id, nome_marketplace').eq('ativo', true).order('nome_marketplace'); return data || []; },
  });

  const { data: mktps = [] } = useQuery({
    queryKey: ['print3d-marketplaces'],
    queryFn: async () => { const { data } = await supabase.from('print3d_marketplaces').select('*').eq('ativo', true).order('nome'); return data || []; },
  });

  const save = useMutation({
    mutationFn: async () => {
      await supabase.from('print3d_vendas').insert({
        produto_id: Number(form.produto_id),
        marketplace_id: Number(form.marketplace_id),
        data_venda: form.data_venda,
        quantidade: form.quantidade,
        receita_centavos: form.receita_centavos,
        custo_total_centavos: form.custo_total_centavos,
      });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['print3d-vendas'] }); setOpen(false); toast.success('Venda registrada!'); },
    onError: (e: any) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: number) => { await supabase.from('print3d_vendas').delete().eq('id', id); },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['print3d-vendas'] }); toast.success('Removida!'); },
  });

  const totalReceita = vendas.reduce((s: number, v: any) => s + (v.receita_centavos || 0), 0);
  const totalCusto = vendas.reduce((s: number, v: any) => s + (v.custo_total_centavos || 0), 0);
  const totalLucro = totalReceita - totalCusto;
  const margemMedia = totalReceita > 0 ? ((totalLucro / totalReceita) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><BarChart3 className="h-6 w-6" /> Vendas & Performance</h1>
          <p className="text-muted-foreground">Acompanhe receita, custo e lucro por canal</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" /> Nova Venda</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Registrar Venda</DialogTitle></DialogHeader>
            <form onSubmit={e => { e.preventDefault(); save.mutate(); }} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Produto *</Label>
                  <Select value={form.produto_id} onValueChange={v => setForm(f => ({ ...f, produto_id: v }))}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>{produtos.map((p: any) => <SelectItem key={p.id} value={p.id.toString()}>{p.nome_marketplace}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Marketplace *</Label>
                  <Select value={form.marketplace_id} onValueChange={v => setForm(f => ({ ...f, marketplace_id: v }))}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>{mktps.map((m: any) => <SelectItem key={m.id} value={m.id.toString()}>{m.nome}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div><Label>Data</Label><Input type="date" value={form.data_venda} onChange={e => setForm(f => ({ ...f, data_venda: e.target.value }))} /></div>
                <div><Label>Quantidade</Label><Input type="number" min={1} value={form.quantidade} onChange={e => setForm(f => ({ ...f, quantidade: Number(e.target.value) }))} /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Receita (R$)</Label><Input type="number" step="0.01" value={(form.receita_centavos / 100).toFixed(2)} onChange={e => setForm(f => ({ ...f, receita_centavos: Math.round(Number(e.target.value) * 100) }))} /></div>
                <div><Label>Custo Total (R$)</Label><Input type="number" step="0.01" value={(form.custo_total_centavos / 100).toFixed(2)} onChange={e => setForm(f => ({ ...f, custo_total_centavos: Math.round(Number(e.target.value) * 100) }))} /></div>
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                <Button type="submit" disabled={save.isPending}>Salvar</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Receita</p><p className="text-xl font-bold text-emerald-600">R$ {(totalReceita / 100).toFixed(2)}</p></CardContent></Card>
        <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Custo</p><p className="text-xl font-bold text-amber-600">R$ {(totalCusto / 100).toFixed(2)}</p></CardContent></Card>
        <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Lucro</p><p className={`text-xl font-bold ${totalLucro >= 0 ? 'text-emerald-600' : 'text-destructive'}`}>R$ {(totalLucro / 100).toFixed(2)}</p></CardContent></Card>
        <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Margem Média</p><p className="text-xl font-bold">{margemMedia.toFixed(1)}%</p></CardContent></Card>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead><TableHead>Produto</TableHead><TableHead>Canal</TableHead><TableHead>Qtd</TableHead><TableHead>Receita</TableHead><TableHead>Custo</TableHead><TableHead>Lucro</TableHead><TableHead>Margem</TableHead><TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {vendas.map((v: any) => {
              const lucro = v.receita_centavos - v.custo_total_centavos;
              const margem = v.receita_centavos > 0 ? (lucro / v.receita_centavos) * 100 : 0;
              return (
                <TableRow key={v.id}>
                  <TableCell>{format(new Date(v.data_venda), 'dd/MM/yyyy')}</TableCell>
                  <TableCell className="font-medium">{v.print3d_produtos?.nome_marketplace || '-'}</TableCell>
                  <TableCell><Badge variant="outline">{v.print3d_marketplaces?.nome || '-'}</Badge></TableCell>
                  <TableCell>{v.quantidade}</TableCell>
                  <TableCell className="text-emerald-600">R$ {(v.receita_centavos / 100).toFixed(2)}</TableCell>
                  <TableCell>R$ {(v.custo_total_centavos / 100).toFixed(2)}</TableCell>
                  <TableCell className={lucro >= 0 ? 'text-emerald-600' : 'text-destructive'}>
                    <span className="flex items-center gap-1">
                      {lucro >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                      R$ {(lucro / 100).toFixed(2)}
                    </span>
                  </TableCell>
                  <TableCell>{margem.toFixed(1)}%</TableCell>
                  <TableCell><Button size="icon" variant="ghost" className="text-destructive" onClick={() => { if (confirm('Remover?')) del.mutate(v.id); }}><Trash2 className="h-4 w-4" /></Button></TableCell>
                </TableRow>
              );
            })}
            {vendas.length === 0 && <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-8">Nenhuma venda registrada</TableCell></TableRow>}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
