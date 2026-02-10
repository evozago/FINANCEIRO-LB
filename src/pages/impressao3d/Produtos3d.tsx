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
import { Switch } from '@/components/ui/switch';
import { Plus, Package, Pencil, Trash2, Calculator } from 'lucide-react';
import { toast } from 'sonner';

interface ProdutoForm {
  sku: string;
  nome_marketplace: string;
  nome_interno: string;
  perfil_impressao: string;
  categoria: string;
  material_id: number | null;
  impressora_id: number | null;
  peso_gramas: number;
  tempo_impressao_min: number;
  mao_de_obra_centavos: number;
  embalagem_centavos: number;
  ativo: boolean;
}

const emptyForm: ProdutoForm = {
  sku: '', nome_marketplace: '', nome_interno: '', perfil_impressao: '', categoria: '',
  material_id: null, impressora_id: null, peso_gramas: 0, tempo_impressao_min: 0,
  mao_de_obra_centavos: 500, embalagem_centavos: 200, ativo: true,
};

function calcularCustos(produto: any, material: any, impressora: any, parametros: any) {
  const custoKwh = parametros?.custo_kwh || 0.85;
  const pesoG = produto.peso_gramas || 0;
  const precoKgCentavos = material?.preco_kg_centavos || 0;
  const custoMaterial = (pesoG / 1000) * (precoKgCentavos / 100);
  
  const potenciaW = impressora?.potencia_watts || parametros?.potencia_impressora_w || 200;
  const tempoH = (produto.tempo_impressao_min || 0) / 60;
  const custoEnergia = (potenciaW / 1000) * tempoH * custoKwh;
  
  const custoImpr = impressora?.custo_aquisicao_centavos ? impressora.custo_aquisicao_centavos / 100 : (parametros?.custo_impressora || 3000);
  const vidaUtil = impressora?.vida_util_horas || parametros?.vida_util_impressora_h || 5000;
  const depreciacao = (custoImpr / vidaUtil) * tempoH;
  
  const maoDeObra = (produto.mao_de_obra_centavos || 0) / 100;
  const embalagem = (produto.embalagem_centavos || 0) / 100;
  
  const custoTotal = custoMaterial + custoEnergia + depreciacao + maoDeObra + embalagem;
  
  return { custoMaterial, custoEnergia, depreciacao, maoDeObra, embalagem, custoTotal };
}

export default function Produtos3d() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<ProdutoForm>(emptyForm);

  const { data: produtos = [] } = useQuery({
    queryKey: ['print3d-produtos'],
    queryFn: async () => {
      const { data } = await supabase.from('print3d_produtos').select('*, print3d_materiais(*), print3d_impressoras(*)').order('created_at', { ascending: false });
      return data || [];
    },
  });

  const { data: materiais = [] } = useQuery({
    queryKey: ['print3d-materiais'],
    queryFn: async () => { const { data } = await supabase.from('print3d_materiais').select('*').eq('ativo', true); return data || []; },
  });

  const { data: impressoras = [] } = useQuery({
    queryKey: ['print3d-impressoras'],
    queryFn: async () => { const { data } = await supabase.from('print3d_impressoras').select('*').eq('ativo', true); return data || []; },
  });

  const { data: parametrosRaw = [] } = useQuery({
    queryKey: ['print3d-parametros'],
    queryFn: async () => { const { data } = await supabase.from('print3d_parametros').select('*'); return data || []; },
  });

  const parametros = parametrosRaw.reduce((acc: any, p: any) => ({ ...acc, [p.chave]: p.valor }), {});

  const saveMutation = useMutation({
    mutationFn: async (data: ProdutoForm) => {
      if (editId) {
        const { error } = await supabase.from('print3d_produtos').update(data).eq('id', editId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('print3d_produtos').insert(data);
        if (error) throw error;
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['print3d-produtos'] }); setOpen(false); setEditId(null); setForm(emptyForm); toast.success('Produto salvo!'); },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => { const { error } = await supabase.from('print3d_produtos').delete().eq('id', id); if (error) throw error; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['print3d-produtos'] }); toast.success('Produto removido!'); },
  });

  const openEdit = (p: any) => {
    setEditId(p.id);
    setForm({
      sku: p.sku || '', nome_marketplace: p.nome_marketplace, nome_interno: p.nome_interno || '',
      perfil_impressao: p.perfil_impressao || '', categoria: p.categoria || '',
      material_id: p.material_id, impressora_id: p.impressora_id,
      peso_gramas: p.peso_gramas, tempo_impressao_min: p.tempo_impressao_min,
      mao_de_obra_centavos: p.mao_de_obra_centavos, embalagem_centavos: p.embalagem_centavos,
      ativo: p.ativo,
    });
    setOpen(true);
  };

  const selectedMaterial = materiais.find((m: any) => m.id === form.material_id);
  const selectedImpressora = impressoras.find((i: any) => i.id === form.impressora_id);
  const custos = calcularCustos(form, selectedMaterial, selectedImpressora, parametros);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Package className="h-6 w-6" /> Produtos 3D</h1>
          <p className="text-muted-foreground">Cadastro com cálculo automático de custos</p>
        </div>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setEditId(null); setForm(emptyForm); } }}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" /> Novo Produto</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editId ? 'Editar' : 'Novo'} Produto</DialogTitle>
            </DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); saveMutation.mutate(form); }} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><Label>SKU</Label><Input value={form.sku} onChange={e => setForm(f => ({ ...f, sku: e.target.value }))} placeholder="SKU-001" /></div>
                <div><Label>Categoria</Label><Input value={form.categoria} onChange={e => setForm(f => ({ ...f, categoria: e.target.value }))} placeholder="Decoração" /></div>
              </div>
              <div><Label>Nome no Marketplace *</Label><Input required value={form.nome_marketplace} onChange={e => setForm(f => ({ ...f, nome_marketplace: e.target.value }))} /></div>
              <div><Label>Nome Interno</Label><Input value={form.nome_interno} onChange={e => setForm(f => ({ ...f, nome_interno: e.target.value }))} /></div>
              <div><Label>Perfil de Impressão</Label><Input value={form.perfil_impressao} onChange={e => setForm(f => ({ ...f, perfil_impressao: e.target.value }))} placeholder="0.2mm, 15% infill" /></div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Material</Label>
                  <Select value={form.material_id?.toString() || ''} onValueChange={v => setForm(f => ({ ...f, material_id: Number(v) }))}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>{materiais.map((m: any) => <SelectItem key={m.id} value={m.id.toString()}>{m.nome} - {m.cor || m.tipo}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Impressora</Label>
                  <Select value={form.impressora_id?.toString() || ''} onValueChange={v => setForm(f => ({ ...f, impressora_id: Number(v) }))}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>{impressoras.map((i: any) => <SelectItem key={i.id} value={i.id.toString()}>{i.nome}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div><Label>Peso (g)</Label><Input type="number" step="0.1" value={form.peso_gramas} onChange={e => setForm(f => ({ ...f, peso_gramas: Number(e.target.value) }))} /></div>
                <div><Label>Tempo de Impressão (min)</Label><Input type="number" value={form.tempo_impressao_min} onChange={e => setForm(f => ({ ...f, tempo_impressao_min: Number(e.target.value) }))} /></div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div><Label>Mão de Obra (R$)</Label><Input type="number" step="0.01" value={(form.mao_de_obra_centavos / 100).toFixed(2)} onChange={e => setForm(f => ({ ...f, mao_de_obra_centavos: Math.round(Number(e.target.value) * 100) }))} /></div>
                <div><Label>Embalagem (R$)</Label><Input type="number" step="0.01" value={(form.embalagem_centavos / 100).toFixed(2)} onChange={e => setForm(f => ({ ...f, embalagem_centavos: Math.round(Number(e.target.value) * 100) }))} /></div>
              </div>

              {/* Cost Preview */}
              <Card className="bg-muted/50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2"><Calculator className="h-4 w-4" /> Custos Calculados</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-3 gap-3 text-sm">
                  <div><span className="text-muted-foreground">Material:</span> <strong>R$ {custos.custoMaterial.toFixed(2)}</strong></div>
                  <div><span className="text-muted-foreground">Energia:</span> <strong>R$ {custos.custoEnergia.toFixed(2)}</strong></div>
                  <div><span className="text-muted-foreground">Depreciação:</span> <strong>R$ {custos.depreciacao.toFixed(2)}</strong></div>
                  <div><span className="text-muted-foreground">Mão de obra:</span> <strong>R$ {custos.maoDeObra.toFixed(2)}</strong></div>
                  <div><span className="text-muted-foreground">Embalagem:</span> <strong>R$ {custos.embalagem.toFixed(2)}</strong></div>
                  <div className="col-span-3 pt-2 border-t">
                    <span className="text-base font-bold text-primary">Custo Total: R$ {custos.custoTotal.toFixed(2)}</span>
                  </div>
                </CardContent>
              </Card>

              <div className="flex items-center gap-2">
                <Switch checked={form.ativo} onCheckedChange={v => setForm(f => ({ ...f, ativo: v }))} />
                <Label>Ativo</Label>
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                <Button type="submit" disabled={saveMutation.isPending}>{saveMutation.isPending ? 'Salvando...' : 'Salvar'}</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>SKU</TableHead>
              <TableHead>Nome Marketplace</TableHead>
              <TableHead>Material</TableHead>
              <TableHead>Peso</TableHead>
              <TableHead>Tempo</TableHead>
              <TableHead>Custo Total</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-24">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {produtos.map((p: any) => {
              const c = calcularCustos(p, p.print3d_materiais, p.print3d_impressoras, parametros);
              return (
                <TableRow key={p.id}>
                  <TableCell className="font-mono text-xs">{p.sku || '-'}</TableCell>
                  <TableCell className="font-medium">{p.nome_marketplace}</TableCell>
                  <TableCell>{p.print3d_materiais?.nome || '-'}</TableCell>
                  <TableCell>{p.peso_gramas}g</TableCell>
                  <TableCell>{p.tempo_impressao_min}min</TableCell>
                  <TableCell className="font-bold text-primary">R$ {c.custoTotal.toFixed(2)}</TableCell>
                  <TableCell><Badge variant={p.ativo ? 'default' : 'secondary'}>{p.ativo ? 'Ativo' : 'Inativo'}</Badge></TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" onClick={() => openEdit(p)}><Pencil className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" className="text-destructive" onClick={() => { if (confirm('Remover?')) deleteMutation.mutate(p.id); }}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
            {produtos.length === 0 && (
              <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">Nenhum produto cadastrado</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
