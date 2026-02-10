import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Wrench, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

export default function Estoque3d() {
  const qc = useQueryClient();

  const { data: items = [] } = useQuery({
    queryKey: ['print3d-estoque'],
    queryFn: async () => {
      const { data: produtos } = await supabase.from('print3d_produtos').select('id, nome_marketplace, sku').eq('ativo', true).order('nome_marketplace');
      const { data: estoque } = await supabase.from('print3d_estoque').select('*');
      const estoqueMap = (estoque || []).reduce((acc: any, e: any) => ({ ...acc, [e.produto_id]: e }), {});
      return (produtos || []).map((p: any) => ({ ...p, estoque: estoqueMap[p.id] || null }));
    },
  });

  const upsert = useMutation({
    mutationFn: async ({ produto_id, field, value }: { produto_id: number; field: string; value: number }) => {
      const { data: existing } = await supabase.from('print3d_estoque').select('id').eq('produto_id', produto_id).maybeSingle();
      if (existing) {
        await supabase.from('print3d_estoque').update({ [field]: value }).eq('id', existing.id);
      } else {
        await supabase.from('print3d_estoque').insert({ produto_id, [field]: value });
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['print3d-estoque'] }); toast.success('Atualizado!'); },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><Wrench className="h-6 w-6" /> Estoque & Produção</h1>
        <p className="text-muted-foreground">Controle de quantidade e pontos de reposição</p>
      </div>
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Produto</TableHead><TableHead>SKU</TableHead><TableHead>Qtd Pronta</TableHead><TableHead>Em Produção</TableHead><TableHead>Ponto Repos.</TableHead><TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((p: any) => {
              const e = p.estoque;
              const qtdPronta = e?.qtd_pronta || 0;
              const pontoRepos = e?.ponto_reposicao || 5;
              const baixo = qtdPronta <= pontoRepos;
              return (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.nome_marketplace}</TableCell>
                  <TableCell className="font-mono text-xs">{p.sku || '-'}</TableCell>
                  <TableCell>
                    <Input type="number" className="w-20 h-8" defaultValue={qtdPronta}
                      onBlur={ev => { const v = Number(ev.target.value); if (v !== qtdPronta) upsert.mutate({ produto_id: p.id, field: 'qtd_pronta', value: v }); }} />
                  </TableCell>
                  <TableCell>
                    <Input type="number" className="w-20 h-8" defaultValue={e?.qtd_em_producao || 0}
                      onBlur={ev => { const v = Number(ev.target.value); upsert.mutate({ produto_id: p.id, field: 'qtd_em_producao', value: v }); }} />
                  </TableCell>
                  <TableCell>
                    <Input type="number" className="w-20 h-8" defaultValue={pontoRepos}
                      onBlur={ev => { const v = Number(ev.target.value); upsert.mutate({ produto_id: p.id, field: 'ponto_reposicao', value: v }); }} />
                  </TableCell>
                  <TableCell>
                    {baixo ? (
                      <Badge variant="destructive" className="gap-1"><AlertTriangle className="h-3 w-3" /> Repor</Badge>
                    ) : (
                      <Badge variant="default">OK</Badge>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
            {items.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Cadastre produtos primeiro</TableCell></TableRow>}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
