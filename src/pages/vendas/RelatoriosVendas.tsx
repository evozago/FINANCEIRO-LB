import { useState, useEffect } from 'react';
import { Calendar, TrendingUp, Users, Target, Download, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { DatePicker } from '@/components/ui/date-picker';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { VendasMensal, VendedorasMensal, VendedorasMensalComMeta } from '@/lib/supabase-views';

interface VendaMensal {
  ano: number;
  mes: number;
  filial_id?: number;
  filial_nome?: string;
  total_vendas: number;
  valor_bruto_total: number;
  desconto_total: number;
  valor_liquido_total: number;
  qtd_itens_total: number;
  ticket_medio: number;
}

interface VendedoraMensal {
  ano: number;
  mes: number;
  vendedora_pf_id: number;
  vendedora_nome: string;
  filial_id?: number;
  filial_nome?: string;
  total_vendas: number;
  valor_bruto_total: number;
  desconto_total: number;
  valor_liquido_total: number;
  qtd_itens_total: number;
  ticket_medio: number;
}

interface VendedoraComMeta {
  ano: number;
  mes: number;
  vendedora_pf_id: number;
  vendedora_nome: string;
  filial_id?: number;
  filial_nome?: string;
  total_vendas: number;
  valor_liquido_total: number;
  meta_centavos?: number;
  dias_no_mes: number;
  dias_ferias: number;
  dias_uteis: number;
  meta_ajustada_centavos?: number;
  percentual_meta?: number;
}

interface Filial {
  id: number;
  nome: string;
}

export function RelatoriosVendas() {
  const [vendasMensais, setVendasMensais] = useState<VendasMensal[]>([]);
  const [vendedorasMensais, setVendedorasMensais] = useState<VendedorasMensal[]>([]);
  const [vendedorasComMeta, setVendedorasComMeta] = useState<VendedorasMensalComMeta[]>([]);
  const [filiais, setFiliais] = useState<Filial[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedFilial, setSelectedFilial] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<'vendas' | 'vendedoras' | 'metas'>('vendas');
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchFiliais();
  }, []);

  useEffect(() => {
    if (activeTab === 'vendas') {
      fetchVendasMensais();
    } else if (activeTab === 'vendedoras') {
      fetchVendedorasMensais();
    } else if (activeTab === 'metas') {
      fetchVendedorasComMeta();
    }
  }, [selectedDate, selectedFilial, activeTab]);

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

  const fetchVendasMensais = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('vendas_mensal')
        .select('*')
        .eq('ano', selectedDate.getFullYear())
        .eq('mes', selectedDate.getMonth() + 1);

      if (selectedFilial !== 'all') {
        query = query.eq('filial_id', parseInt(selectedFilial));
      }

      const { data, error } = await query.order('valor_liquido_total', { ascending: false });

      if (error) throw error;
      setVendasMensais((data || []) as VendasMensal[]);
    } catch (error) {
      console.error('Erro ao buscar vendas mensais:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar as vendas mensais.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchVendedorasMensais = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('vendedoras_mensal')
        .select('*')
        .eq('ano', selectedDate.getFullYear())
        .eq('mes', selectedDate.getMonth() + 1);

      if (selectedFilial !== 'all') {
        query = query.eq('filial_id', parseInt(selectedFilial));
      }

      const { data, error } = await query.order('valor_liquido_total', { ascending: false });

      if (error) throw error;
      setVendedorasMensais((data || []) as VendedorasMensal[]);
    } catch (error) {
      console.error('Erro ao buscar vendedoras mensais:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar as vendedoras mensais.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchVendedorasComMeta = async () => {
    try {
      setLoading(true);
      // @ts-ignore - Supabase types issue
      let query = supabase
        // @ts-ignore
        .from('vendedoras_mensal_com_meta')
        .select('*')
        .eq('ano', selectedDate.getFullYear())
        .eq('mes', selectedDate.getMonth() + 1);

      if (selectedFilial !== 'all') {
        query = query.eq('filial_id', parseInt(selectedFilial));
      }

      const { data, error } = await query.order('percentual_meta', { ascending: false });

      if (error) throw error;
      setVendedorasComMeta((data || []) as any);
    } catch (error) {
      console.error('Erro ao buscar vendedoras com meta:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar as vendedoras com meta.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (centavos: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(centavos / 100);
  };

  const exportToCSV = (data: any[], filename: string) => {
    if (data.length === 0) {
      toast({
        title: 'Aviso',
        description: 'Não há dados para exportar.',
        variant: 'destructive',
      });
      return;
    }

    const headers = Object.keys(data[0]).join(',');
    const rows = data.map(row => 
      Object.values(row).map(value => 
        typeof value === 'string' ? `"${value}"` : value
      ).join(',')
    );

    const csv = [headers, ...rows].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}_${selectedDate.getFullYear()}_${(selectedDate.getMonth() + 1).toString().padStart(2, '0')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const getPerformanceBadge = (percentual?: number) => {
    if (!percentual) return <Badge variant="secondary">Sem meta</Badge>;
    
    if (percentual >= 100) return <Badge className="bg-green-500">Atingiu meta</Badge>;
    if (percentual >= 80) return <Badge className="bg-yellow-500">Próximo da meta</Badge>;
    return <Badge variant="destructive">Abaixo da meta</Badge>;
  };

  const calculateTotals = () => {
    if (activeTab === 'vendas') {
      const totalVendas = vendasMensais.reduce((sum, v) => sum + v.total_vendas, 0);
      const totalValor = vendasMensais.reduce((sum, v) => sum + v.valor_liquido_total, 0);
      const ticketMedio = totalVendas > 0 ? totalValor / totalVendas : 0;
      return { totalVendas, totalValor, ticketMedio };
    } else if (activeTab === 'vendedoras') {
      const totalVendas = vendedorasMensais.reduce((sum, v) => sum + v.total_vendas, 0);
      const totalValor = vendedorasMensais.reduce((sum, v) => sum + v.valor_liquido_total, 0);
      const ticketMedio = totalVendas > 0 ? totalValor / totalVendas : 0;
      return { totalVendas, totalValor, ticketMedio };
    } else {
      const totalVendas = vendedorasComMeta.reduce((sum, v) => sum + v.total_vendas, 0);
      const totalValor = vendedorasComMeta.reduce((sum, v) => sum + v.valor_liquido_total, 0);
      const totalMeta = vendedorasComMeta.reduce((sum, v) => sum + (v.meta_ajustada_centavos || 0), 0);
      const percentualGeral = totalMeta > 0 ? (totalValor / totalMeta) * 100 : 0;
      return { totalVendas, totalValor, totalMeta, percentualGeral };
    }
  };

  const totals = calculateTotals();

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Relatórios de Vendas</h1>
          <p className="text-muted-foreground">
            Análises detalhadas de performance de vendas
          </p>
        </div>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Calendar className="h-5 w-5" />
            <span>Filtros</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-4">
            <div>
              <label className="text-sm font-medium">Mês/Ano</label>
              <DatePicker
                date={selectedDate}
                onSelect={(date) => setSelectedDate(date || new Date())}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Filial</label>
              <Select value={selectedFilial} onValueChange={setSelectedFilial}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as filiais</SelectItem>
                  {filiais.map((filial) => (
                    <SelectItem key={filial.id} value={filial.id.toString()}>
                      {filial.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <div className="flex space-x-2">
        <Button
          variant={activeTab === 'vendas' ? 'default' : 'outline'}
          onClick={() => setActiveTab('vendas')}
        >
          <BarChart3 className="mr-2 h-4 w-4" />
          Vendas por Filial
        </Button>
        <Button
          variant={activeTab === 'vendedoras' ? 'default' : 'outline'}
          onClick={() => setActiveTab('vendedoras')}
        >
          <Users className="mr-2 h-4 w-4" />
          Vendedoras
        </Button>
        <Button
          variant={activeTab === 'metas' ? 'default' : 'outline'}
          onClick={() => setActiveTab('metas')}
        >
          <Target className="mr-2 h-4 w-4" />
          Metas vs Realizado
        </Button>
      </div>

      {/* Resumo */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Vendas</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totals.totalVendas}</div>
            <p className="text-xs text-muted-foreground">
              Vendas no período
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valor Total</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totals.totalValor)}</div>
            <p className="text-xs text-muted-foreground">
              Faturamento líquido
            </p>
          </CardContent>
        </Card>

        {activeTab === 'metas' ? (
          <>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Meta Total</CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(totals.totalMeta || 0)}</div>
                <p className="text-xs text-muted-foreground">
                  Meta ajustada
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">% da Meta</CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${(totals.percentualGeral || 0) >= 100 ? 'text-green-600' : 'text-red-600'}`}>
                  {(totals.percentualGeral || 0).toFixed(1)}%
                </div>
                <p className="text-xs text-muted-foreground">
                  Performance geral
                </p>
              </CardContent>
            </Card>
          </>
        ) : (
          <Card className="md:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Ticket Médio</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(totals.ticketMedio || 0)}</div>
              <p className="text-xs text-muted-foreground">
                Valor médio por venda
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Tabelas */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>
                {activeTab === 'vendas' && 'Vendas por Filial'}
                {activeTab === 'vendedoras' && 'Performance das Vendedoras'}
                {activeTab === 'metas' && 'Metas vs Realizado'}
              </CardTitle>
              <CardDescription>
                {activeTab === 'vendas' && `${vendasMensais.length} filial(is) com vendas`}
                {activeTab === 'vendedoras' && `${vendedorasMensais.length} vendedora(s) ativa(s)`}
                {activeTab === 'metas' && `${vendedorasComMeta.length} vendedora(s) com meta`}
              </CardDescription>
            </div>
            <Button 
              variant="outline" 
              onClick={() => {
                if (activeTab === 'vendas') exportToCSV(vendasMensais, 'vendas_filial');
                else if (activeTab === 'vendedoras') exportToCSV(vendedorasMensais, 'vendedoras');
                else exportToCSV(vendedorasComMeta, 'metas_vendedoras');
              }}
            >
              <Download className="h-4 w-4 mr-2" />
              Exportar
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div>Carregando...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  {activeTab === 'vendas' && (
                    <>
                      <TableHead>Filial</TableHead>
                      <TableHead>Vendas</TableHead>
                      <TableHead>Valor Bruto</TableHead>
                      <TableHead>Desconto</TableHead>
                      <TableHead>Valor Líquido</TableHead>
                      <TableHead>Ticket Médio</TableHead>
                    </>
                  )}
                  {activeTab === 'vendedoras' && (
                    <>
                      <TableHead>Vendedora</TableHead>
                      <TableHead>Filial</TableHead>
                      <TableHead>Vendas</TableHead>
                      <TableHead>Valor Líquido</TableHead>
                      <TableHead>Ticket Médio</TableHead>
                    </>
                  )}
                  {activeTab === 'metas' && (
                    <>
                      <TableHead>Vendedora</TableHead>
                      <TableHead>Filial</TableHead>
                      <TableHead>Realizado</TableHead>
                      <TableHead>Meta Ajustada</TableHead>
                      <TableHead>% Meta</TableHead>
                      <TableHead>Status</TableHead>
                    </>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {activeTab === 'vendas' && vendasMensais.map((venda, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">
                      {venda.filial_nome || 'Não informado'}
                    </TableCell>
                    <TableCell>{venda.total_vendas}</TableCell>
                    <TableCell>{formatCurrency(venda.valor_bruto_total)}</TableCell>
                    <TableCell className="text-red-600">
                      {formatCurrency(venda.desconto_total)}
                    </TableCell>
                    <TableCell className="font-medium">
                      {formatCurrency(venda.valor_liquido_total)}
                    </TableCell>
                    <TableCell>{formatCurrency(venda.ticket_medio)}</TableCell>
                  </TableRow>
                ))}

                {activeTab === 'vendedoras' && vendedorasMensais.map((vendedora, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">
                      {vendedora.vendedora_nome}
                    </TableCell>
                    <TableCell>{vendedora.filial_nome || 'Não informado'}</TableCell>
                    <TableCell>{vendedora.total_vendas}</TableCell>
                    <TableCell className="font-medium">
                      {formatCurrency(vendedora.valor_liquido_total)}
                    </TableCell>
                    <TableCell>{formatCurrency(vendedora.ticket_medio)}</TableCell>
                  </TableRow>
                ))}

                {activeTab === 'metas' && vendedorasComMeta.map((vendedora, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">
                      {vendedora.vendedora_nome}
                    </TableCell>
                    <TableCell>{vendedora.filial_nome || 'Não informado'}</TableCell>
                    <TableCell className="font-medium">
                      {formatCurrency(vendedora.valor_liquido_total)}
                    </TableCell>
                    <TableCell>
                      {vendedora.meta_ajustada_centavos ? 
                        formatCurrency(vendedora.meta_ajustada_centavos) : 
                        'Sem meta'
                      }
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <span className={`font-medium ${(vendedora.percentual_meta || 0) >= 100 ? 'text-green-600' : 'text-red-600'}`}>
                          {vendedora.percentual_meta ? `${vendedora.percentual_meta.toFixed(1)}%` : 'N/A'}
                        </span>
                        {vendedora.percentual_meta && (
                          <Progress 
                            value={Math.min(vendedora.percentual_meta, 100)} 
                            className="w-20"
                          />
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {getPerformanceBadge(vendedora.percentual_meta)}
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
