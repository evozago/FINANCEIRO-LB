import { Link } from 'react-router-dom';
import { 
  Printer, Package, Settings, Store, BarChart3, Boxes, 
  Wrench, ArrowRight 
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const sections = [
  { title: 'Produtos', desc: 'Cadastro e custos automáticos', icon: Package, href: '/impressao3d/produtos', color: 'bg-gradient-to-br from-violet-500 to-violet-600' },
  { title: 'Materiais', desc: 'Filamentos, cores e preços por kg', icon: Boxes, href: '/impressao3d/materiais', color: 'bg-gradient-to-br from-amber-500 to-amber-600' },
  { title: 'Impressoras', desc: 'Máquinas, potência e depreciação', icon: Printer, href: '/impressao3d/impressoras', color: 'bg-gradient-to-br from-cyan-500 to-cyan-600' },
  { title: 'Marketplaces', desc: 'Taxas, comissões e precificação', icon: Store, href: '/impressao3d/marketplaces', color: 'bg-gradient-to-br from-emerald-500 to-emerald-600' },
  { title: 'Estoque', desc: 'Controle de produção e reposição', icon: Wrench, href: '/impressao3d/estoque', color: 'bg-gradient-to-br from-orange-500 to-orange-600' },
  { title: 'Vendas', desc: 'Performance e lucro por canal', icon: BarChart3, href: '/impressao3d/vendas', color: 'bg-gradient-to-br from-pink-500 to-pink-600' },
  { title: 'Parâmetros', desc: 'Energia, impostos e custos base', icon: Settings, href: '/impressao3d/parametros', color: 'bg-gradient-to-br from-slate-500 to-slate-600' },
];

export default function Impressao3dHome() {
  const { data: stats } = useQuery({
    queryKey: ['print3d-stats'],
    queryFn: async () => {
      const [produtos, materiais, vendas] = await Promise.all([
        supabase.from('print3d_produtos').select('id', { count: 'exact', head: true }).eq('ativo', true),
        supabase.from('print3d_materiais').select('id', { count: 'exact', head: true }).eq('ativo', true),
        supabase.from('print3d_vendas').select('receita_centavos, custo_total_centavos'),
      ]);
      const receitaTotal = (vendas.data || []).reduce((s, v) => s + (v.receita_centavos || 0), 0);
      const custoTotal = (vendas.data || []).reduce((s, v) => s + (v.custo_total_centavos || 0), 0);
      return {
        produtos: produtos.count || 0,
        materiais: materiais.count || 0,
        receita: receitaTotal,
        lucro: receitaTotal - custoTotal,
      };
    },
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Printer className="h-8 w-8 text-violet-500" />
          Impressão 3D
        </h1>
        <p className="text-muted-foreground mt-1">Gestão completa do negócio de impressão 3D e marketplaces</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Produtos Ativos', value: stats?.produtos || 0 },
          { label: 'Materiais', value: stats?.materiais || 0 },
          { label: 'Receita Total', value: `R$ ${((stats?.receita || 0) / 100).toFixed(2)}` },
          { label: 'Lucro Total', value: `R$ ${((stats?.lucro || 0) / 100).toFixed(2)}` },
        ].map(s => (
          <Card key={s.label}>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">{s.label}</p>
              <p className="text-2xl font-bold">{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Sections Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {sections.map(s => (
          <Link key={s.title} to={s.href} className="group">
            <Card className="h-full transition-all duration-300 hover:shadow-xl hover:-translate-y-1 border-2 hover:border-primary/30">
              <CardHeader className="pb-3">
                <div className={`p-3 rounded-xl ${s.color} shadow-lg w-fit`}>
                  <s.icon className="h-6 w-6 text-white" />
                </div>
                <CardTitle className="text-lg mt-3 group-hover:text-primary transition-colors">{s.title}</CardTitle>
                <CardDescription>{s.desc}</CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex items-center text-sm text-primary font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                  Acessar <ArrowRight className="ml-1 h-4 w-4" />
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
