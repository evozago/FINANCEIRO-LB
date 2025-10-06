import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  DollarSign, 
  TrendingUp, 
  CreditCard, 
  AlertTriangle,
  Calendar,
  Target,
  CheckCircle2,
  Clock,
  FileText,
  Upload,
  Plus
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface DashboardMetrics {
  vencendo_hoje_valor: number;
  vencendo_hoje_qtd: number;
  pagas_hoje_valor: number;
  pagas_hoje_qtd: number;
  vence_ate_fim_mes_valor: number;
  vence_ate_fim_mes_qtd: number;
  vencidas_valor: number;
  vencidas_qtd: number;
  pendentes_nao_recorrentes_valor: number;
  pendentes_nao_recorrentes_qtd: number;
  total_vendas_mes: number;
  valor_vendas_mes: number;
  ticket_medio_mes: number;
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
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    vencendo_hoje_valor: 0,
    vencendo_hoje_qtd: 0,
    pagas_hoje_valor: 0,
    pagas_hoje_qtd: 0,
    vence_ate_fim_mes_valor: 0,
    vence_ate_fim_mes_qtd: 0,
    vencidas_valor: 0,
    vencidas_qtd: 0,
    pendentes_nao_recorrentes_valor: 0,
    pendentes_nao_recorrentes_qtd: 0,
    total_vendas_mes: 0,
    valor_vendas_mes: 0,
    ticket_medio_mes: 0,
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
      const hoje = new Date().toISOString().split('T')[0];
      const fimMes = new Date();
      fimMes.setMonth(fimMes.getMonth() + 1);
      fimMes.setDate(0);
      const fimMesStr = fimMes.toISOString().split('T')[0];

      // Buscar todas as parcelas não pagas
      const { data: parcelasNaoPagas, error: naoPagasError } = await supabase
        .from('contas_pagar_parcelas')
        .select('id, valor_parcela_centavos, vencimento, conta_id')
        .eq('pago', false);

      if (naoPagasError) throw naoPagasError;

      // Buscar parcelas pagas hoje
      const { data: parcelasPagasHoje, error: pagasHojeError } = await supabase
        .from('contas_pagar_parcelas')
        .select('id, valor_pago_centavos')
        .eq('pago', true)
        .eq('pago_em', hoje);

      if (pagasHojeError) throw pagasHojeError;

      // Calcular métricas
      const vencendoHoje = parcelasNaoPagas?.filter(p => p.vencimento === hoje) || [];
      const vencidas = parcelasNaoPagas?.filter(p => p.vencimento < hoje) || [];
      const venceAteFimMes = parcelasNaoPagas?.filter(p => 
        p.vencimento > hoje && p.vencimento <= fimMesStr
      ) || [];

      // Buscar contas não recorrentes (sem referência ou referência null)
      const { data: contasNaoRecorrentes } = await supabase
        .from('contas_pagar')
        .select('id')
        .is('referencia', null);

      const idsContasNaoRecorrentes = new Set(contasNaoRecorrentes?.map(c => c.id) || []);

      // Filtrar parcelas não pagas de contas não recorrentes
      const pendentesNaoRec = parcelasNaoPagas?.filter(p => idsContasNaoRecorrentes.has(p.conta_id)) || [];

      setMetrics(prev => ({
        ...prev,
        vencendo_hoje_valor: vencendoHoje.reduce((sum, p) => sum + (p.valor_parcela_centavos || 0), 0),
        vencendo_hoje_qtd: vencendoHoje.length,
        pagas_hoje_valor: (parcelasPagasHoje || []).reduce((sum, p) => sum + (p.valor_pago_centavos || 0), 0),
        pagas_hoje_qtd: parcelasPagasHoje?.length || 0,
        vence_ate_fim_mes_valor: venceAteFimMes.reduce((sum, p) => sum + (p.valor_parcela_centavos || 0), 0),
        vence_ate_fim_mes_qtd: venceAteFimMes.length,
        vencidas_valor: vencidas.reduce((sum, p) => sum + (p.valor_parcela_centavos || 0), 0),
        vencidas_qtd: vencidas.length,
        pendentes_nao_recorrentes_valor: pendentesNaoRec.reduce((sum, p) => sum + (p.valor_parcela_centavos || 0), 0),
        pendentes_nao_recorrentes_qtd: pendentesNaoRec.length,
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

  const fetchContasVencendo = async () => {
    try {
      const hoje = new Date();
      const proximosDias = new Date();
      proximosDias.setDate(hoje.getDate() + 7);

      const { data, error } = await supabase
        .from('contas_pagar_parcelas')
        .select(`
          id,
          valor_parcela_centavos,
          vencimento,
          contas_pagar!inner(
            id,
            descricao,
            pessoas_juridicas!fornecedor_id(razao_social, nome_fantasia)
          )
        `)
        .eq('pago', false)
        .gte('vencimento', hoje.toISOString().split('T')[0])
        .lte('vencimento', proximosDias.toISOString().split('T')[0])
        .order('vencimento')
        .limit(5);

      if (error) throw error;
      
      const formattedData = data?.map(item => ({
        conta_id: item.contas_pagar?.id || 0,
        descricao: item.contas_pagar?.descricao || '',
        fornecedor: item.contas_pagar?.pessoas_juridicas?.razao_social || 
                   item.contas_pagar?.pessoas_juridicas?.nome_fantasia || 'Não informado',
        valor_em_aberto: item.valor_parcela_centavos,
        proximo_vencimento: item.vencimento
      })) || [];
      
      setContasVencendo(formattedData);
    } catch (error) {
      console.error('Erro ao buscar contas vencendo:', error);
    }
  };

  const fetchVendedorasPerformance = async () => {
    try {
      const hoje = new Date();
      const ano = hoje.getFullYear();
      const mes = hoje.getMonth() + 1;

      const { data: vendas, error } = await supabase
        .from('vendas_diarias')
        .select(`
          vendedora_pf_id,
          valor_liquido_centavos,
          pessoas_fisicas(nome_completo)
        `)
        .gte('data', `${ano}-${mes.toString().padStart(2, '0')}-01`)
        .lte('data', `${ano}-${mes.toString().padStart(2, '0')}-31`);

      if (error) throw error;
      
      const vendedorasMap = new Map();
      vendas?.forEach(venda => {
        const vendedoraId = venda.vendedora_pf_id;
        const nome = venda.pessoas_fisicas?.nome_completo || 'Não informado';
        
        if (!vendedorasMap.has(vendedoraId)) {
          vendedorasMap.set(vendedoraId, {
            vendedora_nome: nome,
            valor_liquido_total: 0,
            percentual_meta: 0,
            meta_ajustada: 100000
          });
        }
        
        const vendedora = vendedorasMap.get(vendedoraId);
        vendedora.valor_liquido_total += venda.valor_liquido_centavos;
        vendedora.percentual_meta = (vendedora.valor_liquido_total / vendedora.meta_ajustada) * 100;
      });
      
      const performance = Array.from(vendedorasMap.values())
        .sort((a, b) => b.percentual_meta - a.percentual_meta)
        .slice(0, 5);
      
      setVendedorasPerformance(performance);
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
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Gestão financeira e controle de pagamentos
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => navigate('/compras/importar-xml')}>
            <Upload className="h-4 w-4 mr-2" />
            Importar XML
          </Button>
          <Button onClick={() => navigate('/financeiro/contas-pagar')}>
            <Plus className="h-4 w-4 mr-2" />
            Nova Conta
          </Button>
        </div>
      </div>

      {/* Resumo Financeiro - Situação Atual */}
      <Card>
        <CardHeader>
          <CardTitle>Resumo Financeiro - Situação Atual</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {/* Vencendo Hoje */}
            <Card className="border-[hsl(var(--warning))] bg-[hsl(var(--warning))]/10">
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-[hsl(var(--warning-foreground))]">
                      Vencendo Hoje
                    </p>
                    <p className="text-2xl font-bold text-[hsl(var(--warning-foreground))]">
                      {formatCurrency(metrics.vencendo_hoje_valor)}
                    </p>
                    <p className="text-xs text-[hsl(var(--warning-foreground))]/70">
                      {metrics.vencendo_hoje_qtd} títulos
                    </p>
                  </div>
                  <Clock className="h-8 w-8 text-[hsl(var(--warning))]" />
                </div>
              </CardContent>
            </Card>

            {/* Pagas Hoje */}
            <Card className="border-[hsl(var(--success))] bg-[hsl(var(--success))]/10">
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-[hsl(var(--success-foreground))]">
                      Pagas Hoje
                    </p>
                    <p className="text-2xl font-bold text-[hsl(var(--success-foreground))]">
                      {formatCurrency(metrics.pagas_hoje_valor)}
                    </p>
                    <p className="text-xs text-[hsl(var(--success-foreground))]/70">
                      {metrics.pagas_hoje_qtd} títulos
                    </p>
                  </div>
                  <CheckCircle2 className="h-8 w-8 text-[hsl(var(--success))]" />
                </div>
              </CardContent>
            </Card>

            {/* Vence até Fim do Mês */}
            <Card className="border-[hsl(var(--info))] bg-[hsl(var(--info))]/10">
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-[hsl(var(--info-foreground))]">
                      Vence até Fim do Mês
                    </p>
                    <p className="text-2xl font-bold text-[hsl(var(--info-foreground))]">
                      {formatCurrency(metrics.vence_ate_fim_mes_valor)}
                    </p>
                    <p className="text-xs text-[hsl(var(--info-foreground))]/70">
                      {metrics.vence_ate_fim_mes_qtd} títulos
                    </p>
                  </div>
                  <Calendar className="h-8 w-8 text-[hsl(var(--info))]" />
                </div>
              </CardContent>
            </Card>

            {/* Vencidas */}
            <Card className="border-[hsl(var(--destructive))] bg-[hsl(var(--destructive))]/10">
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-[hsl(var(--destructive-foreground))]">
                      Vencidas
                    </p>
                    <p className="text-2xl font-bold text-[hsl(var(--destructive-foreground))]">
                      {formatCurrency(metrics.vencidas_valor)}
                    </p>
                    <p className="text-xs text-[hsl(var(--destructive-foreground))]/70">
                      {metrics.vencidas_qtd} títulos
                    </p>
                  </div>
                  <AlertTriangle className="h-8 w-8 text-[hsl(var(--destructive))]" />
                </div>
              </CardContent>
            </Card>

            {/* Pendentes Não Recorrentes */}
            <Card className="border-[hsl(var(--purple))] bg-[hsl(var(--purple))]/10">
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-[hsl(var(--purple-foreground))]">
                      Pendentes Não Recorrentes
                    </p>
                    <p className="text-2xl font-bold text-[hsl(var(--purple-foreground))]">
                      {formatCurrency(metrics.pendentes_nao_recorrentes_valor)}
                    </p>
                    <p className="text-xs text-[hsl(var(--purple-foreground))]/70">
                      {metrics.pendentes_nao_recorrentes_qtd} títulos
                    </p>
                  </div>
                  <FileText className="h-8 w-8 text-[hsl(var(--purple))]" />
                </div>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>

      {/* Métricas de Vendas */}
      <div className="grid gap-4 md:grid-cols-3">
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
            <CardTitle className="text-sm font-medium">Total em Contas</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metrics.vencendo_hoje_qtd + metrics.vence_ate_fim_mes_qtd + metrics.vencidas_qtd}
            </div>
            <p className="text-xs text-muted-foreground">
              Parcelas em aberto
            </p>
          </CardContent>
        </Card>
      </div>

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
