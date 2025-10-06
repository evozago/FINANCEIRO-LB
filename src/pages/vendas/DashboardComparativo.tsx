import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, TrendingDown, Calendar, DollarSign } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { CrescimentoYoY, VendasMensal } from '@/lib/supabase-views';

interface DadosTrimestre {
  trimestre: string;
  ano_atual: number;
  ano_anterior: number;
  crescimento: number;
}

const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

export function DashboardComparativo() {
  const [crescimentoData, setCrescimentoData] = useState<CrescimentoYoY[]>([]);
  const [vendasData, setVendasData] = useState<VendasMensal[]>([]);
  const [anoSelecionado, setAnoSelecionado] = useState<number>(new Date().getFullYear());
  const [filialSelecionada, setFilialSelecionada] = useState<string>('todas');
  const [filiais, setFiliais] = useState<{ id: number; nome: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchFiliais();
    fetchDados();
  }, [anoSelecionado, filialSelecionada]);

  const fetchFiliais = async () => {
    try {
      const { data, error } = await supabase
        .from('filiais')
        .select('id, nome')
        .order('nome');

      if (error) throw error;
      setFiliais(data || []);
    } catch (error) {
      console.error('Erro ao buscar filiais:', error);
    }
  };

  const fetchDados = async () => {
    setLoading(true);
    try {
      let queryCrescimento = supabase
        .from('crescimento_yoy')
        .select('*')
        .eq('ano', anoSelecionado);

      let queryVendas = supabase
        .from('vendas_mensal')
        .select('*')
        .in('ano', [anoSelecionado, anoSelecionado - 1]);

      if (filialSelecionada !== 'todas') {
        queryCrescimento = queryCrescimento.eq('filial_id', parseInt(filialSelecionada));
        queryVendas = queryVendas.eq('filial_id', parseInt(filialSelecionada));
      }

      const [{ data: crescimento, error: errorCrescimento }, { data: vendas, error: errorVendas }] = await Promise.all([
        queryCrescimento,
        queryVendas,
      ]);

      if (errorCrescimento) throw errorCrescimento;
      if (errorVendas) throw errorVendas;

      setCrescimentoData(crescimento || []);
      setVendasData(vendas || []);
    } catch (error) {
      console.error('Erro ao buscar dados:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os dados.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value / 100);
  };

  const calcularDadosTrimestre = (): DadosTrimestre[] => {
    const trimestres: DadosTrimestre[] = [];
    
    for (let t = 1; t <= 4; t++) {
      const mesesTrimestre = [(t - 1) * 3 + 1, (t - 1) * 3 + 2, (t - 1) * 3 + 3];
      
      const vendasAtual = vendasData
        .filter(v => v.ano === anoSelecionado && mesesTrimestre.includes(v.mes))
        .reduce((sum, v) => sum + (v.valor_liquido_total || 0), 0);
      
      const vendasAnterior = vendasData
        .filter(v => v.ano === anoSelecionado - 1 && mesesTrimestre.includes(v.mes))
        .reduce((sum, v) => sum + (v.valor_liquido_total || 0), 0);
      
      const crescimento = vendasAnterior > 0 ? ((vendasAtual - vendasAnterior) / vendasAnterior) * 100 : 0;
      
      trimestres.push({
        trimestre: `T${t}`,
        ano_atual: vendasAtual,
        ano_anterior: vendasAnterior,
        crescimento,
      });
    }
    
    return trimestres;
  };

  const calcularDadosSemestre = () => {
    const semestres = [];
    
    for (let s = 1; s <= 2; s++) {
      const mesesSemestre = s === 1 ? [1, 2, 3, 4, 5, 6] : [7, 8, 9, 10, 11, 12];
      
      const vendasAtual = vendasData
        .filter(v => v.ano === anoSelecionado && mesesSemestre.includes(v.mes))
        .reduce((sum, v) => sum + (v.valor_liquido_total || 0), 0);
      
      const vendasAnterior = vendasData
        .filter(v => v.ano === anoSelecionado - 1 && mesesSemestre.includes(v.mes))
        .reduce((sum, v) => sum + (v.valor_liquido_total || 0), 0);
      
      const crescimento = vendasAnterior > 0 ? ((vendasAtual - vendasAnterior) / vendasAnterior) * 100 : 0;
      
      semestres.push({
        semestre: `S${s}`,
        ano_atual: vendasAtual,
        ano_anterior: vendasAnterior,
        crescimento,
      });
    }
    
    return semestres;
  };

  const prepararDadosGrafico = () => {
    const dadosPorMes = MESES.map((mes, index) => {
      const mesNum = index + 1;
      
      const vendasAtual = vendasData
        .filter(v => v.ano === anoSelecionado && v.mes === mesNum)
        .reduce((sum, v) => sum + (v.valor_liquido_total || 0), 0);
      
      const vendasAnterior = vendasData
        .filter(v => v.ano === anoSelecionado - 1 && v.mes === mesNum)
        .reduce((sum, v) => sum + (v.valor_liquido_total || 0), 0);
      
      return {
        mes,
        [`${anoSelecionado}`]: vendasAtual / 100,
        [`${anoSelecionado - 1}`]: vendasAnterior / 100,
      };
    });
    
    return dadosPorMes;
  };

  const calcularTotais = () => {
    const totalAtual = vendasData
      .filter(v => v.ano === anoSelecionado)
      .reduce((sum, v) => sum + (v.valor_liquido_total || 0), 0);
    
    const totalAnterior = vendasData
      .filter(v => v.ano === anoSelecionado - 1)
      .reduce((sum, v) => sum + (v.valor_liquido_total || 0), 0);
    
    const crescimento = totalAnterior > 0 ? ((totalAtual - totalAnterior) / totalAnterior) * 100 : 0;
    
    return { totalAtual, totalAnterior, crescimento };
  };

  const dadosGrafico = prepararDadosGrafico();
  const dadosTrimestre = calcularDadosTrimestre();
  const dadosSemestre = calcularDadosSemestre();
  const totais = calcularTotais();

  if (loading) {
    return <div className="flex items-center justify-center h-64">Carregando...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard Comparativo Anual</h1>
          <p className="text-muted-foreground">
            Análise comparativa de vendas ano a ano
          </p>
        </div>
        <div className="flex gap-4">
          <Select value={anoSelecionado.toString()} onValueChange={(value) => setAnoSelecionado(parseInt(value))}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[2025, 2024, 2023, 2022].map((ano) => (
                <SelectItem key={ano} value={ano.toString()}>
                  {ano}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filialSelecionada} onValueChange={setFilialSelecionada}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Todas as filiais" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas as filiais</SelectItem>
              {filiais.map((filial) => (
                <SelectItem key={filial.id} value={filial.id.toString()}>
                  {filial.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Cards de Resumo */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total {anoSelecionado}</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totais.totalAtual)}</div>
            <p className="text-xs text-muted-foreground">
              Vendas no ano atual
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total {anoSelecionado - 1}</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totais.totalAnterior)}</div>
            <p className="text-xs text-muted-foreground">
              Vendas no ano anterior
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Crescimento YoY</CardTitle>
            {totais.crescimento >= 0 ? (
              <TrendingUp className="h-4 w-4 text-green-500" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-500" />
            )}
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${totais.crescimento >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              {totais.crescimento.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">
              Variação ano a ano
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Gráfico de Evolução Mensal */}
      <Card>
        <CardHeader>
          <CardTitle>Evolução Mensal de Vendas</CardTitle>
          <CardDescription>
            Comparação mês a mês entre {anoSelecionado} e {anoSelecionado - 1}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={350}>
            <LineChart data={dadosGrafico}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="mes" />
              <YAxis tickFormatter={(value) => `R$ ${(value / 1000).toFixed(0)}k`} />
              <Tooltip 
                formatter={(value: number) => formatCurrency(value * 100)}
                labelStyle={{ color: 'hsl(var(--foreground))' }}
              />
              <Legend />
              <Line 
                type="monotone" 
                dataKey={`${anoSelecionado}`} 
                stroke="hsl(var(--primary))" 
                strokeWidth={2}
                name={anoSelecionado.toString()}
              />
              <Line 
                type="monotone" 
                dataKey={`${anoSelecionado - 1}`} 
                stroke="hsl(var(--muted-foreground))" 
                strokeWidth={2}
                strokeDasharray="5 5"
                name={`${anoSelecionado - 1}`}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Análise Trimestral */}
      <Card>
        <CardHeader>
          <CardTitle>Análise Trimestral</CardTitle>
          <CardDescription>
            Desempenho por trimestre
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={dadosTrimestre}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="trimestre" />
              <YAxis tickFormatter={(value) => `R$ ${(value / 100000).toFixed(0)}k`} />
              <Tooltip 
                formatter={(value: number) => formatCurrency(value)}
                labelStyle={{ color: 'hsl(var(--foreground))' }}
              />
              <Legend />
              <Bar dataKey="ano_atual" fill="hsl(var(--primary))" name={anoSelecionado.toString()} />
              <Bar dataKey="ano_anterior" fill="hsl(var(--muted-foreground))" name={`${anoSelecionado - 1}`} />
            </BarChart>
          </ResponsiveContainer>
          <div className="grid grid-cols-4 gap-4 mt-6">
            {dadosTrimestre.map((trimestre) => (
              <div key={trimestre.trimestre} className="text-center">
                <div className="text-sm font-medium text-muted-foreground">{trimestre.trimestre}</div>
                <Badge 
                  variant={trimestre.crescimento >= 0 ? 'default' : 'destructive'}
                  className="mt-2"
                >
                  {trimestre.crescimento >= 0 ? '+' : ''}{trimestre.crescimento.toFixed(1)}%
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Análise Semestral */}
      <Card>
        <CardHeader>
          <CardTitle>Análise Semestral</CardTitle>
          <CardDescription>
            Desempenho por semestre
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-6">
            {dadosSemestre.map((semestre) => (
              <div key={semestre.semestre} className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">{semestre.semestre}</h3>
                  <Badge 
                    variant={semestre.crescimento >= 0 ? 'default' : 'destructive'}
                  >
                    {semestre.crescimento >= 0 ? '+' : ''}{semestre.crescimento.toFixed(1)}%
                  </Badge>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">{anoSelecionado}:</span>
                    <span className="font-semibold">{formatCurrency(semestre.ano_atual)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">{anoSelecionado - 1}:</span>
                    <span className="font-semibold">{formatCurrency(semestre.ano_anterior)}</span>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t">
                    <span className="text-sm font-medium">Diferença:</span>
                    <span className={`font-bold ${semestre.crescimento >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {formatCurrency(semestre.ano_atual - semestre.ano_anterior)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
