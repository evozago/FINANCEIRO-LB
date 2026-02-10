import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Settings } from 'lucide-react';
import { toast } from 'sonner';

export default function Parametros3d() {
  const qc = useQueryClient();

  const { data: parametros = [] } = useQuery({
    queryKey: ['print3d-parametros'],
    queryFn: async () => { const { data } = await supabase.from('print3d_parametros').select('*').order('chave'); return data || []; },
  });

  const update = useMutation({
    mutationFn: async ({ id, valor }: { id: number; valor: number }) => {
      await supabase.from('print3d_parametros').update({ valor, updated_at: new Date().toISOString() }).eq('id', id);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['print3d-parametros'] }); toast.success('Parâmetro atualizado!'); },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><Settings className="h-6 w-6" /> Parâmetros Gerais</h1>
        <p className="text-muted-foreground">Custos base usados nos cálculos automáticos</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {parametros.map((p: any) => (
          <Card key={p.id}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">{p.descricao || p.chave}</CardTitle>
              <CardDescription className="text-xs font-mono">{p.chave} ({p.unidade})</CardDescription>
            </CardHeader>
            <CardContent>
              <Input
                type="number"
                step="0.01"
                defaultValue={p.valor}
                onBlur={e => {
                  const v = Number(e.target.value);
                  if (v !== p.valor) update.mutate({ id: p.id, valor: v });
                }}
                className="text-lg font-bold"
              />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
