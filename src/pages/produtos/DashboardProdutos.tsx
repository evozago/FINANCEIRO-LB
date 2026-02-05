import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  BarChart3,
  Package,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  ArrowLeft,
  FileSpreadsheet,
  Trash2,
  RefreshCw,
  Loader2,
  Eye,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
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
} from 'recharts';
import { classificarProduto, type RegraClassificacao, type AtributoCustomizado } from '@/lib/classificador';

const COLORS = ['#ec4899', '#f97316', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#6366f1'];

export default function DashboardProdutos() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [sessaoParaExcluir, setSessaoParaExcluir] = useState<number | null>(null);
  const [reclassificando, setReclassificando] = useState<number | null>(null);
  const [progressoReclassificacao, setProgressoReclassificacao] = useState(0);

  // Buscar regras para reclassificação
  const { data: regras = [] } = useQuery({
    queryKey: ['regras-classificacao'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('regras_classificacao')
        .select('*')
        .eq('ativo', true)
        .order('ordem');
      if (error) throw error;
      return data as RegraClassificacao[];
    },
  });

  // Buscar atributos
  const { data: atributos = [] } = useQuery({
    queryKey: ['atributos-customizados'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('atributos_customizados')
        .select('*')
        .eq('ativo', true);
      if (error) throw error;
      return data as AtributoCustomizado[];
    },
  });

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

  // Distribuição por confiança
  const { data: porConfianca = [] } = useQuery({
    queryKey: ['produtos-por-confianca'],
    queryFn: async () => {
      const { data } = await supabase.from('produtos').select('confianca');
      
      const faixas = {
        'Alta (≥70%)': 0,
        'Média (40-69%)': 0,
        'Baixa (1-39%)': 0,
        'Não classificado (0%)': 0,
      };
      
      data?.forEach(p => {
        const conf = p.confianca || 0;
        if (conf >= 70) faixas['Alta (≥70%)']++;
        else if (conf >= 40) faixas['Média (40-69%)']++;
        else if (conf > 0) faixas['Baixa (1-39%)']++;
        else faixas['Não classificado (0%)']++;
      });
      
      return Object.entries(faixas)
        .map(([name, value]) => ({ name, value }))
        .filter(f => f.value > 0);
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

  // Sessões de importação
  const { data: sessoes = [], refetch: refetchSessoes } = useQuery({
    queryKey: ['sessoes-importacao'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sessoes_importacao')
        .select('*')
        .order('created_at', { ascending: false });
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

  // Excluir sessão
  const excluirSessaoMutation = useMutation({
    mutationFn: async (sessaoId: number) => {
      // Excluir produtos da sessão
      await supabase.from('produtos').delete().eq('sessao_id', sessaoId);
      
      // Buscar sessão para pegar path do arquivo
      const { data: sessao } = await supabase
        .from('sessoes_importacao')
        .select('arquivo_storage_path')
        .eq('id', sessaoId)
        .single();
      
      // Excluir arquivo do storage se existir
      if (sessao?.arquivo_storage_path) {
        await supabase.storage.from('planilhas-importacao').remove([sessao.arquivo_storage_path]);
      }
      
      // Excluir sessão
      const { error } = await supabase.from('sessoes_importacao').delete().eq('id', sessaoId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessoes-importacao'] });
      queryClient.invalidateQueries({ queryKey: ['produtos-stats'] });
      queryClient.invalidateQueries({ queryKey: ['produtos-por-categoria'] });
      queryClient.invalidateQueries({ queryKey: ['produtos-por-confianca'] });
      toast.success('Sessão excluída com sucesso!');
      setSessaoParaExcluir(null);
    },
    onError: () => toast.error('Erro ao excluir sessão'),
  });

  // Reclassificar produtos de uma sessão
  const reclassificarSessao = async (sessaoId: number) => {
    setReclassificando(sessaoId);
    setProgressoReclassificacao(0);

    try {
      // Buscar produtos da sessão
      const { data: produtos, error } = await supabase
        .from('produtos')
        .select('id, nome')
        .eq('sessao_id', sessaoId);

      if (error) throw error;
      if (!produtos || produtos.length === 0) {
        toast.error('Nenhum produto encontrado nesta sessão');
        return;
      }

      let classificados = 0;
      let totalConfianca = 0;

      // Reclassificar em lotes
      const batchSize = 50;
      for (let i = 0; i < produtos.length; i += batchSize) {
        const batch = produtos.slice(i, i + batchSize);
        
        for (const produto of batch) {
          const resultado = classificarProduto(produto, regras, atributos);
          
          await supabase
            .from('produtos')
            .update({
              categoria_id: resultado.categoria_id,
              subcategoria: resultado.subcategoria,
              marca: resultado.marca,
              genero: resultado.genero,
              faixa_etaria: resultado.faixa_etaria,
              tamanho: resultado.tamanho,
              cor: resultado.cor,
              material: resultado.material,
              estilo: resultado.estilo,
              atributos_extras: resultado.atributos_extras,
              confianca: resultado.confianca,
              classificado: resultado.confianca > 0,
            })
            .eq('id', produto.id);

          if (resultado.confianca > 0) classificados++;
          totalConfianca += resultado.confianca;
        }
        
        setProgressoReclassificacao(Math.round(((i + batch.length) / produtos.length) * 100));
        await new Promise(r => setTimeout(r, 10));
      }

      // Atualizar estatísticas da sessão
      const confiancaMedia = produtos.length > 0 ? totalConfianca / produtos.length : 0;
      await supabase
        .from('sessoes_importacao')
        .update({ classificados, confianca_media: confiancaMedia })
        .eq('id', sessaoId);

      queryClient.invalidateQueries({ queryKey: ['sessoes-importacao'] });
      queryClient.invalidateQueries({ queryKey: ['produtos-stats'] });
      queryClient.invalidateQueries({ queryKey: ['produtos-por-categoria'] });
      queryClient.invalidateQueries({ queryKey: ['produtos-por-confianca'] });
      
      toast.success(`${classificados} de ${produtos.length} produtos reclassificados!`);
    } catch (err) {
      console.error(err);
      toast.error('Erro ao reclassificar produtos');
    } finally {
      setReclassificando(null);
      setProgressoReclassificacao(0);
    }
  };

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
            Histórico de importações e estatísticas de classificação
          </p>
        </div>
        
        <Button asChild>
          <Link to="/produtos/classificador">
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            Nova Importação
          </Link>
        </Button>
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

      {/* Histórico de Importações */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Histórico de Importações
          </CardTitle>
          <CardDescription>
            Clique em uma sessão para reclassificar com as regras atuais
          </CardDescription>
        </CardHeader>
        <CardContent>
          {sessoes.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FileSpreadsheet className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium mb-2">Nenhuma importação realizada</p>
              <p className="text-sm">Faça upload de uma planilha para começar a classificar produtos</p>
              <Button asChild className="mt-4">
                <Link to="/produtos/classificador">Importar Planilha</Link>
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome da Sessão</TableHead>
                  <TableHead>Arquivo</TableHead>
                  <TableHead className="text-center">Total</TableHead>
                  <TableHead className="text-center">Classificados</TableHead>
                  <TableHead className="text-center">Confiança</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sessoes.map((sessao) => (
                  <TableRow key={sessao.id} className="group">
                    <TableCell className="font-medium">{sessao.nome}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {sessao.nome_arquivo || '—'}
                    </TableCell>
                    <TableCell className="text-center">{sessao.total_produtos}</TableCell>
                    <TableCell className="text-center">
                      <Badge 
                        variant={sessao.classificados === sessao.total_produtos ? 'default' : 'secondary'}
                      >
                        {sessao.classificados}/{sessao.total_produtos}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant={
                        Number(sessao.confianca_media) >= 70 ? 'default' :
                        Number(sessao.confianca_media) >= 40 ? 'secondary' : 'outline'
                      }>
                        {Number(sessao.confianca_media).toFixed(0)}%
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(sessao.created_at!).toLocaleDateString('pt-BR')}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-1 justify-end">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => navigate(`/produtos/lista?sessao=${sessao.id}`)}
                          title="Ver produtos"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => reclassificarSessao(sessao.id)}
                          disabled={reclassificando === sessao.id}
                          title="Reclassificar com regras atuais"
                        >
                          {reclassificando === sessao.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <RefreshCw className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setSessaoParaExcluir(sessao.id)}
                          className="text-destructive hover:text-destructive"
                          title="Excluir sessão"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      {reclassificando === sessao.id && (
                        <div className="mt-2">
                          <Progress value={progressoReclassificacao} className="h-1" />
                          <span className="text-xs text-muted-foreground">{progressoReclassificacao}%</span>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Charts Row */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Por Categoria */}
        <Card>
          <CardHeader>
            <CardTitle>Distribuição por Categoria</CardTitle>
          </CardHeader>
          <CardContent>
            {porCategoria.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={porCategoria} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" width={100} fontSize={12} />
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

        {/* Por Confiança */}
        <Card>
          <CardHeader>
            <CardTitle>Distribuição por Confiança</CardTitle>
          </CardHeader>
          <CardContent>
            {porConfianca.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={porConfianca}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ name, percent }) => `${name.split(' ')[0]} (${(percent * 100).toFixed(0)}%)`}
                  >
                    {porConfianca.map((_, index) => (
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

      {/* Segunda linha */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Por Gênero */}
        <Card>
          <CardHeader>
            <CardTitle>Distribuição por Gênero</CardTitle>
          </CardHeader>
          <CardContent>
            {porGenero.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={porGenero}>
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

      {/* Dialog de confirmação de exclusão */}
      <AlertDialog open={sessaoParaExcluir !== null} onOpenChange={() => setSessaoParaExcluir(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir sessão de importação?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação irá excluir permanentemente a sessão e todos os produtos importados nela.
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => sessaoParaExcluir && excluirSessaoMutation.mutate(sessaoParaExcluir)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
