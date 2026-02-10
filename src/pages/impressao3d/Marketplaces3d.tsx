import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Store, DollarSign, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

export default function Marketplaces3d() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState({ nome: '', taxa_percentual: 0, comissao_fixa_centavos: 0, frete_subsidiado: false, margem_desejada_percentual: 30 });

  const { data: mktps = [] } = useQuery({
    queryKey: ['print3d-marketplaces'],
    queryFn: async () => { const { data } = await supabase.from('print3d_marketplaces').select('*').order('nome'); return data || []; },
  });

  const { data: produtos = [] } = useQuery({
    queryKey: ['print3d-produtos-pricing'],
    queryFn: async () => {
      const { data } = await supabase.from('print3d_produtos').select('*, print3d_materiais(*), print3d_impressoras(*)').eq('ativo', true).order('nome_marketplace');
      return data || [];
    },
  });

  const { data: parametrosRaw = [] } = useQuery({
    queryKey: ['print3d-parametros'],
    queryFn: async () => { const { data } = await supabase.from('print3d_parametros').select('*'); return data || []; },
  });

  const parametros = parametrosRaw.reduce((acc: any, p: any) => ({ ...acc, [p.chave]: p.valor }), {});

  const save = useMutation({
    mutationFn: async () => {
      if (editId) { await supabase.from('print3d_marketplaces').update(form).eq('id', editId); }
      else { await supabase.from('print3d_marketplaces').insert(form); }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['print3d-marketplaces'] }); setOpen(false); setEditId(null); toast.success('Marketplace salvo!'); },
    onError: (e: any) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: number) => { await supabase.from('print3d_marketplaces').delete().eq('id', id); },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['print3d-marketplaces'] }); toast.success('Removido!'); },
  });

  function calcCustoTotal(p: any) {
    const custoKwh = parametros?.custo_kwh || 0.85;
    const pesoG = p.peso_gramas || 0;
    const precoKg = (p.print3d_materiais?.preco_kg_centavos || 0) / 100;
    const custoMat = (pesoG / 1000) * precoKg;
    const potW = p.print3d_impressoras?.potencia_watts || 200;
    const tempoH = (p.tempo_impressao_min || 0) / 60;
    const custoEnergia = (potW / 1000) * tempoH * custoKwh;
    const custoImpr = (p.print3d_impressoras?.custo_aquisicao_centavos || 300000) / 100;
    const vidaUtil = p.print3d_impressoras?.vida_util_horas || 5000;
    const deprec = (custoImpr / vidaUtil) * tempoH;
    const mdo = (p.mao_de_obra_centavos || 0) / 100;
    const emb = (p.embalagem_centavos || 0) / 100;
    return custoMat + custoEnergia + deprec + mdo + emb;
  }

  function calcPreco(custoTotal: number, mktp: any) {
    const taxa = mktp.taxa_percentual || 0;
    const comissaoFixa = (mktp.comissao_fixa_centavos || 0) / 100;
    const margem = mktp.margem_desejada_percentual || 30;
    const imposto = parametros?.imposto_percentual || 6;
    const precoMinimo = (custoTotal + comissaoFixa) / (1 - (taxa + imposto) / 100);
    const precoSugerido = (custoTotal + comissaoFixa) / (1 - (taxa + imposto + margem) / 100);
    return { precoMinimo, precoSugerido };
  }

  const [selectedMktp, setSelectedMktp] = useState<string>('');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Store className="h-6 w-6" /> Marketplaces</h1>
          <p className="text-muted-foreground">Configuração de taxas e precificação automática</p>
        </div>
        <Dialog open={open} onOpenChange={v => { setOpen(v); if (!v) { setEditId(null); setForm({ nome: '', taxa_percentual: 0, comissao_fixa_centavos: 0, frete_subsidiado: false, margem_desejada_percentual: 30 }); } }}>
          <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" /> Novo Marketplace</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{editId ? 'Editar' : 'Novo'} Marketplace</DialogTitle></DialogHeader>
            <form onSubmit={e => { e.preventDefault(); save.mutate(); }} className="space-y-4">
              <div><Label>Nome *</Label><Input required value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Taxa (%)</Label><Input type="number" step="0.1" value={form.taxa_percentual} onChange={e => setForm(f => ({ ...f, taxa_percentual: Number(e.target.value) }))} /></div>
                <div><Label>Comissão Fixa (R$)</Label><Input type="number" step="0.01" value={(form.comissao_fixa_centavos / 100).toFixed(2)} onChange={e => setForm(f => ({ ...f, comissao_fixa_centavos: Math.round(Number(e.target.value) * 100) }))} /></div>
              </div>
              <div><Label>Margem Desejada (%)</Label><Input type="number" step="0.1" value={form.margem_desejada_percentual} onChange={e => setForm(f => ({ ...f, margem_desejada_percentual: Number(e.target.value) }))} /></div>
              <div className="flex items-center gap-2"><Switch checked={form.frete_subsidiado} onCheckedChange={v => setForm(f => ({ ...f, frete_subsidiado: v }))} /><Label>Frete subsidiado</Label></div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                <Button type="submit" disabled={save.isPending}>Salvar</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Marketplace list */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Marketplace</TableHead><TableHead>Taxa</TableHead><TableHead>Comissão Fixa</TableHead><TableHead>Margem</TableHead><TableHead>Frete Sub.</TableHead><TableHead className="w-24">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {mktps.map((m: any) => (
              <TableRow key={m.id}>
                <TableCell className="font-medium">{m.nome}</TableCell>
                <TableCell>{m.taxa_percentual}%</TableCell>
                <TableCell>R$ {(m.comissao_fixa_centavos / 100).toFixed(2)}</TableCell>
                <TableCell>{m.margem_desejada_percentual}%</TableCell>
                <TableCell>{m.frete_subsidiado ? '✅' : '❌'}</TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" onClick={() => { setEditId(m.id); setForm({ nome: m.nome, taxa_percentual: m.taxa_percentual, comissao_fixa_centavos: m.comissao_fixa_centavos, frete_subsidiado: m.frete_subsidiado, margem_desejada_percentual: m.margem_desejada_percentual }); setOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" className="text-destructive" onClick={() => { if (confirm('Remover?')) del.mutate(m.id); }}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {/* Pricing Simulator */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><DollarSign className="h-5 w-5" /> Simulador de Preços</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <Label>Selecione o Marketplace</Label>
            <Select value={selectedMktp} onValueChange={setSelectedMktp}>
              <SelectTrigger className="w-64"><SelectValue placeholder="Escolha um marketplace" /></SelectTrigger>
              <SelectContent>{mktps.map((m: any) => <SelectItem key={m.id} value={m.id.toString()}>{m.nome}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          {selectedMktp && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Produto</TableHead><TableHead>Custo Prod.</TableHead><TableHead>Preço Mínimo</TableHead><TableHead>Preço Sugerido</TableHead><TableHead>Margem</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {produtos.map((p: any) => {
                  const custoTotal = calcCustoTotal(p);
                  const mktp = mktps.find((m: any) => m.id === Number(selectedMktp));
                  if (!mktp) return null;
                  const { precoMinimo, precoSugerido } = calcPreco(custoTotal, mktp);
                  return (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{p.nome_marketplace}</TableCell>
                      <TableCell>R$ {custoTotal.toFixed(2)}</TableCell>
                      <TableCell className="text-amber-600 font-medium">R$ {precoMinimo.toFixed(2)}</TableCell>
                      <TableCell className="text-emerald-600 font-bold">R$ {precoSugerido.toFixed(2)}</TableCell>
                      <TableCell>{mktp.margem_desejada_percentual}%</TableCell>
                    </TableRow>
                  );
                })}
                {produtos.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-4">Cadastre produtos primeiro</TableCell></TableRow>}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
