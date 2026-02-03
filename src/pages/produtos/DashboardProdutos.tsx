import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  BarChart3,
  Package,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  ArrowLeft,
  FileSpreadsheet,
  Trash2,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

const COLORS = ['#ec4899', '#f97316', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#6366f1'];

export default function DashboardProdutos() {
  // Estatísticas gerais
  const { data: stats } = useQuery({
    queryKey: ['produtos-stats'],
    queryFn: async () => {
      const { count: total } = await supabase.from('produtos').select('*', { count: 'exact', head: true });
      const { count: classificados } = await supabase.from('produtos').select('*', { count: 'exact', head: true }).eq('classificado', true);
      const { data: avgConf } = await supabase.from('produtos').select('confianca');
      const confiancaMedia = avgConf && avgConf.length > 0
        ? Math.round(avgConf.reduce((a, p) => a + (p.confianca || 0), 0) / avgConf.length)
        : 0;

      return {
        total: total || 0,
        classificados: classificados || 0,
        naoClassificados: (total || 0) - (classificados || 0),
        confiancaMedia,
      };
    },
  });

  // Distribuição por categoria
  const { data: porCategoria = [] } = useQuery({
    queryKey: ['produtos-por-categoria'],
    queryFn: async () => {
      const { data } = await supabase
        .from('produtos')
        .select('categoria_id, categorias_produtos(nome)')
        .not('categoria_id', 'is', null);

      const counts: Record<string, number> = {};
      data?.forEach(p => {
        const cat = (p.categorias_produtos as { nome: string } | null)?.nome || 'Sem categoria';
        counts[cat] = (counts[cat] || 0) + 1;
      });

      return Object.entries(counts)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 8);
    },
  });

  // Distribuição por gênero
  const { data: porGenero = [] } = useQuery({
    queryKey: ['produtos-por-genero'],
    queryFn: async () => {
      const { data } = await supabase.from('produtos').select('genero').not('genero', 'is', null);
      const counts: Record<string, number> = {};
      data?.forEach(p => {
        if (p.genero) counts[p.genero] = (counts[p.genero] || 0) + 1;
      });
      return Object.entries(counts).map(([name, value]) => ({ name, value }));
    },
  });

  // Distribuição por faixa etária
  const { data: porFaixaEtaria = [] } = useQuery({
    queryKey: ['produtos-por-faixa-etaria'],
    queryFn: async () => {
      const { data } = await supabase.from('produtos').select('faixa_etaria').not('faixa_etaria', 'is', null);
      const counts: Record<string, number> = {};
      data?.forEach(p => {
        if (p.faixa_etaria) counts[p.faixa_etaria] = (counts[p.faixa_etaria] || 0) + 1;
      });
      return Object.entries(counts).map(([name, value]) => ({ name, value }));
    },
  });

  // Sessões de importação
  const { data: sessoes = [] } = useQuery({
    queryKey: ['sessoes-importacao'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sessoes_importacao')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);
      if (error) throw error;
      return data;
    },
  });

  // Top marcas
  const { data: topMarcas = [] } = useQuery({
    queryKey: ['produtos-top-marcas'],
    queryFn: async () => {
      const { data } = await supabase.from('produtos').select('marca').not('marca', 'is', null);
      const counts: Record<string, number> = {};
      data?.forEach(p => {
        if (p.marca) counts[p.marca] = (counts[p.marca] || 0) + 1;
      });
      return Object.entries(counts)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 5);
    },
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Button variant="ghost" size="icon" asChild>
              <Link to="/produtos/classificador">
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <BarChart3 className="h-6 w-6" />
              Dashboard de Produtos
            </h1>
          </div>
          <p className="text-muted-foreground ml-10">
            Visualize estatísticas dos produtos classificados
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Package className="h-5 w-5 text-primary" />
              </div>
              <div>
                <div className="text-2xl font-bold">{stats?.total || 0}</div>
                <p className="text-sm text-muted-foreground">Total de Produtos</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/10 rounded-lg">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <div className="text-2xl font-bold text-green-600">{stats?.classificados || 0}</div>
                <p className="text-sm text-muted-foreground">Classificados</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-500/10 rounded-lg">
                <AlertCircle className="h-5 w-5 text-orange-500" />
              </div>
              <div>
                <div className="text-2xl font-bold text-orange-600">{stats?.naoClassificados || 0}</div>
                <p className="text-sm text-muted-foreground">Não Classificados</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <TrendingUp className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <div className="text-2xl font-bold text-blue-600">{stats?.confiancaMedia || 0}%</div>
                <p className="text-sm text-muted-foreground">Confiança Média</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Por Categoria */}
        <Card>
          <CardHeader>
            <CardTitle>Produtos por Categoria</CardTitle>
          </CardHeader>
          <CardContent>
            {porCategoria.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={porCategoria} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" width={100} />
                  <Tooltip />
                  <Bar dataKey="value" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                Nenhum dado disponível
              </div>
            )}
          </CardContent>
        </Card>

        {/* Por Gênero */}
        <Card>
          <CardHeader>
            <CardTitle>Distribuição por Gênero</CardTitle>
          </CardHeader>
          <CardContent>
            {porGenero.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={porGenero}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                  >
                    {porGenero.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                Nenhum dado disponível
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Segunda linha de charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Por Faixa Etária */}
        <Card>
          <CardHeader>
            <CardTitle>Por Faixa Etária</CardTitle>
          </CardHeader>
          <CardContent>
            {porFaixaEtaria.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={porFaixaEtaria}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                Nenhum dado disponível
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Marcas */}
        <Card>
          <CardHeader>
            <CardTitle>Top 5 Marcas</CardTitle>
          </CardHeader>
          <CardContent>
            {topMarcas.length > 0 ? (
              <div className="space-y-3">
                {topMarcas.map((marca, idx) => (
                  <div key={marca.name} className="flex items-center gap-3">
                    <span className="w-6 text-sm font-medium text-muted-foreground">{idx + 1}.</span>
                    <div className="flex-1">
                      <div className="flex justify-between mb-1">
                        <span className="font-medium">{marca.name}</span>
                        <span className="text-sm text-muted-foreground">{marca.value}</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full"
                          style={{ width: `${(marca.value / topMarcas[0].value) * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                Nenhum dado disponível
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Sessões de Importação */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Histórico de Importações
          </CardTitle>
          <CardDescription>Últimas 10 sessões de importação</CardDescription>
        </CardHeader>
        <CardContent>
          {sessoes.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Nenhuma importação realizada ainda
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Arquivo</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Classificados</TableHead>
                  <TableHead>Confiança</TableHead>
                  <TableHead>Data</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sessoes.map((sessao) => (
                  <TableRow key={sessao.id}>
                    <TableCell className="font-medium">{sessao.nome}</TableCell>
                    <TableCell className="text-muted-foreground">{sessao.nome_arquivo}</TableCell>
                    <TableCell>{sessao.total_produtos}</TableCell>
                    <TableCell>
                      <Badge variant={sessao.classificados === sessao.total_produtos ? 'default' : 'secondary'}>
                        {sessao.classificados}/{sessao.total_produtos}
                      </Badge>
                    </TableCell>
                    <TableCell>{Number(sessao.confianca_media).toFixed(0)}%</TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(sessao.created_at!).toLocaleDateString('pt-BR')}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
