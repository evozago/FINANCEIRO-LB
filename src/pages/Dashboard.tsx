import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  Users, 
  CreditCard, 
  ShoppingCart,
  AlertTriangle,
  Calendar,
  Target
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface DashboardMetrics {
  total_contas_abertas: number;
  valor_total_em_aberto: number;
  contas_vencendo_hoje: number;
  contas_vencidas: number;
  total_vendas_mes: number;
  valor_vendas_mes: number;
  ticket_medio_mes: number;
  total_pessoas_fisicas: number;
  total_pessoas_juridicas: number;
  total_filiais: number;
}

interface ContaVencendo {
  conta_id: number;
  descricao: string;
  fornecedor: string;
  valor_em_aberto: number;
  proximo_vencimento: string;
}

interface VendedoraPerformance {
  vendedora_nome: string;
  valor_liquido_total: number;
  percentual_meta: number;
  meta_ajustada: number;
}

export function Dashboard() {
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    total_contas_abertas: 0,
    valor_total_em_aberto: 0,
    contas_vencendo_hoje: 0,
    contas_vencidas: 0,
    total_vendas_mes: 0,
    valor_vendas_mes: 0,
    ticket_medio_mes: 0,
    total_pessoas_fisicas: 0,
    total_pessoas_juridicas: 0,
    total_filiais: 0,
  });
  const [contasVencendo, setContasVencendo] = useState<ContaVencendo[]>([]);
  const [vendedorasPerformance, setVendedorasPerformance] = useState<VendedoraPerformance[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      await Promise.all([
        fetchContasMetrics(),
        fetchVendasMetrics(),
        fetchCadastrosMetrics(),
        fetchContasVencendo(),
        fetchVendedorasPerformance(),
      ]);
    } catch (error) {
      console.error('Erro ao carregar dashboard:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os dados do dashboard.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchContasMetrics = async () => {
    try {
      // Total de contas em aberto
      const { data: contasAbertas, error: contasError } = await supabase
        .from('contas_pagar_abertas')
        .select('conta_id, valor_em_aberto, proximo_vencimento');

      if (contasError) throw contasError;

      const hoje = new Date().toISOString().split('T')[0];
      const contasVencendoHoje = contasAbertas?.filter(conta => 
        conta.proximo_vencimento === hoje
      ).length || 0;

      const contasVencidas = contasAbertas?.filter(conta => 
        conta.proximo_vencimento < hoje
      ).length || 0;

      const valorTotalEmAberto = contasAbertas?.reduce((sum, conta) => 
        sum + (conta.valor_em_aberto || 0), 0
      ) || 0;

      setMetrics(prev => ({
        ...prev,
        total_contas_abertas: contasAbertas?.length || 0,
        valor_total_em_aberto: valorTotalEmAberto,
        contas_vencendo_hoje: contasVencendoHoje,
        contas_vencidas: contasVencidas,
      }));
    } catch (error) {
      console.error('Erro ao buscar métricas de contas:', error);
    }
  };

  const fetchVendasMetrics = async () => {
    try {
      const hoje = new Date();
      const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
      const fimMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);

      const { data: vendas, error } = await supabase
        .from('vendas_diarias')
        .select('valor_liquido_centavos, qtd_itens')
        .gte('data', inicioMes.toISOString().split('T')[0])
        .lte('data', fimMes.toISOString().split('T')[0]);

      if (error) throw error;

      const totalVendas = vendas?.length || 0;
      const valorVendasMes = vendas?.reduce((sum, venda) => 
        sum + venda.valor_liquido_centavos, 0
      ) || 0;
      const ticketMedio = totalVendas > 0 ? valorVendasMes / totalVendas : 0;

      setMetrics(prev => ({
        ...prev,
        total_vendas_mes: totalVendas,
        valor_vendas_mes: valorVendasMes,
        ticket_medio_mes: ticketMedio,
      }));
    } catch (error) {
      console.error('Erro ao buscar métricas de vendas:', error);
    }
  };

  const fetchCadastrosMetrics = async () => {
    try {
      const [pessoasFisicas, pessoasJuridicas, filiais] = await Promise.all([
        supabase.from('pessoas_fisicas').select('id', { count: 'exact', head: true }),
        supabase.from('pessoas_juridicas').select('id', { count: 'exact', head: true }),
        supabase.from('filiais').select('id', { count: 'exact', head: true }),
      ]);

      setMetrics(prev => ({
        ...prev,
        total_pessoas_fisicas: pessoasFisicas.count || 0,
        total_pessoas_juridicas: pessoasJuridicas.count || 0,
        total_filiais: filiais.count || 0,
      }));
    } catch (error) {
      console.error('Erro ao buscar métricas de cadastros:', error);
    }
  };

  const fetchContasVencendo = async () => {
    try {
      const hoje = new Date();
      const proximosDias = new Date();
      proximosDias.setDate(hoje.getDate() + 7);

      const { data, error } = await supabase
        .from('contas_pagar_abertas')
        .select('conta_id, descricao, fornecedor, valor_em_aberto, proximo_vencimento')
        .gte('proximo_vencimento', hoje.toISOString().split('T')[0])
        .lte('proximo_vencimento', proximosDias.toISOString().split('T')[0])
        .order('proximo_vencimento')
        .limit(5);

      if (error) throw error;
      setContasVencendo(data || []);
    } catch (error) {
      console.error('Erro ao buscar contas vencendo:', error);
    }
  };

  const fetchVendedorasPerformance = async () => {
    try {
      const hoje = new Date();
      const ano = hoje.getFullYear();
      const mes = hoje.getMonth() + 1;

      const { data, error } = await supabase
        .from('vendedoras_mensal_com_meta')
        .select('vendedora_nome, valor_liquido_total, percentual_meta, meta_ajustada')
        .eq('ano', ano)
        .eq('mes', mes)
        .order('percentual_meta', { ascending: false })
        .limit(5);

      if (error) throw error;
      setVendedorasPerformance(data || []);
    } catch (error) {
      console.error('Erro ao buscar performance das vendedoras:', error);
    }
  };

  const formatCurrency = (centavos: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(centavos / 100);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64">Carregando...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Visão geral do sistema financeiro
        </p>
      </div>

      {/* Métricas Principais */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Contas em Aberto</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.total_contas_abertas}</div>
            <p className="text-xs text-muted-foreground">
              {formatCurrency(metrics.valor_total_em_aberto)} em aberto
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Vendas do Mês</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.total_vendas_mes}</div>
            <p className="text-xs text-muted-foreground">
              {formatCurrency(metrics.valor_vendas_mes)} faturado
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ticket Médio</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(metrics.ticket_medio_mes)}</div>
            <p className="text-xs text-muted-foreground">
              Média por venda
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cadastros</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.total_pessoas_fisicas + metrics.total_pessoas_juridicas}</div>
            <p className="text-xs text-muted-foreground">
              {metrics.total_filiais} filiais ativas
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Alertas */}
      {(metrics.contas_vencidas > 0 || metrics.contas_vencendo_hoje > 0) && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-red-700">
              <AlertTriangle className="h-5 w-5" />
              <span>Alertas Financeiros</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {metrics.contas_vencidas > 0 && (
                <div className="flex items-center space-x-2">
                  <Badge variant="destructive">{metrics.contas_vencidas}</Badge>
                  <span className="text-sm">conta(s) vencida(s)</span>
                </div>
              )}
              {metrics.contas_vencendo_hoje > 0 && (
                <div className="flex items-center space-x-2">
                  <Badge variant="secondary">{metrics.contas_vencendo_hoje}</Badge>
                  <span className="text-sm">conta(s) vencendo hoje</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        {/* Contas Vencendo */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Calendar className="h-5 w-5" />
              <span>Próximos Vencimentos</span>
            </CardTitle>
            <CardDescription>
              Contas que vencem nos próximos 7 dias
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {contasVencendo.length > 0 ? (
                contasVencendo.map((conta) => (
                  <div key={conta.conta_id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex-1">
                      <div className="font-medium text-sm">{conta.descricao}</div>
                      <div className="text-xs text-muted-foreground">{conta.fornecedor}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium text-sm">{formatCurrency(conta.valor_em_aberto)}</div>
                      <div className="text-xs text-muted-foreground">{formatDate(conta.proximo_vencimento)}</div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Nenhuma conta vencendo nos próximos dias
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Performance das Vendedoras */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Target className="h-5 w-5" />
              <span>Performance de Vendas</span>
            </CardTitle>
            <CardDescription>
              Top 5 vendedoras do mês atual
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {vendedorasPerformance.length > 0 ? (
                vendedorasPerformance.map((vendedora, index) => (
                  <div key={vendedora.vendedora_nome} className="flex items-center space-x-3">
                    <div className="flex-shrink-0 w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                      <span className="text-sm font-medium">{index + 1}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">{vendedora.vendedora_nome}</div>
                      <div className="flex items-center space-x-2">
                        <Progress 
                          value={Math.min(vendedora.percentual_meta, 100)} 
                          className="flex-1 h-2"
                        />
                        <span className="text-xs font-medium w-12 text-right">
                          {vendedora.percentual_meta.toFixed(0)}%
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium">{formatCurrency(vendedora.valor_liquido_total)}</div>
                      <div className="text-xs text-muted-foreground">
                        Meta: {formatCurrency(vendedora.meta_ajustada)}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Nenhuma venda registrada este mês
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
