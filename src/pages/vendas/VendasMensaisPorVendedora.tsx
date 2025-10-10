import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, TrendingUp, Users, ShoppingCart, ArrowUpDown } from 'lucide-react';
import { usePersistentState } from '@/hooks/usePersistentState';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { StatsCard } from '@/components/ui/stats-card';

interface VendasVendedora {
  vendedora_pf_id: number;
  vendedora_nome: string;
  filial_nome: string;
  total_vendas: number;
  qtd_itens_total: number;
  valor_liquido_total: number;
  ticket_medio: number;
  clientes_atendidos?: number;
  media_produtos_por_atendimento?: number;
}

interface ComparativoAnual {
  mes: number;
  ano: number;
  ano_anterior?: number;
  valor_atual: number;
  valor_anterior: number;
  crescimento_percentual: number;
}

export function VendasMensaisPorVendedora() {
  const navigate = useNavigate();
  const [vendas, setVendas] = useState<VendasVendedora[]>([]);
  const [comparativo, setComparativo] = useState<ComparativoAnual[]>([]);
  const [selectedMes, setSelectedMes] = usePersistentState<number>('vendas-mensais-mes', new Date().getMonth() + 1);
  const [selectedAno, setSelectedAno] = usePersistentState<number>('vendas-mensais-ano', new Date().getFullYear());
  const [searchTerm, setSearchTerm] = usePersistentState('vendas-mensais-search', '');
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchVendasMensais();
    fetchComparativoAnual();
  }, [selectedMes, selectedAno]);

  const fetchVendasMensais = async () => {
    try {
      setLoading(true);

      // Buscar vendas do mês usando vendas_diarias
      const { data: vendasData, error } = await supabase
        .from('vendas_diarias')
        .select(`
          vendedora_pf_id,
          valor_liquido_centavos,
          qtd_itens,
          filial_id,
          pessoas_fisicas!vendedora_pf_id(nome_completo),
          filiais(nome)
        `)
        .gte('data', `${selectedAno}-${String(selectedMes).padStart(2, '0')}-01`)
        .lt('data', `${selectedAno}-${String(selectedMes + 1).padStart(2, '0')}-01`);

      if (error) throw error;

      // Agrupar por vendedora
      const vendasAgrupadas = (vendasData || []).reduce((acc: any, venda: any) => {
        const vendedoraId = venda.vendedora_pf_id;
        if (!vendedoraId) return acc;

        if (!acc[vendedoraId]) {
          acc[vendedoraId] = {
            vendedora_pf_id: vendedoraId,
            vendedora_nome: venda.pessoas_fisicas?.nome_completo || 'Sem nome',
            filial_nome: venda.filiais?.nome || 'Sem filial',
            total_vendas: 0,
            qtd_itens_total: 0,
            valor_liquido_total: 0,
            clientes_atendidos: new Set(),
          };
        }

        acc[vendedoraId].total_vendas += 1;
        acc[vendedoraId].qtd_itens_total += venda.qtd_itens || 0;
        acc[vendedoraId].valor_liquido_total += venda.valor_liquido_centavos || 0;
        acc[vendedoraId].clientes_atendidos.add(venda.data); // Usando data como proxy para clientes únicos
        
        return acc;
      }, {});

      // Converter para array e calcular médias
      const vendasArray = Object.values(vendasAgrupadas).map((v: any) => ({
        ...v,
        clientes_atendidos: v.clientes_atendidos.size,
        ticket_medio: v.total_vendas > 0 ? v.valor_liquido_total / v.total_vendas : 0,
        media_produtos_por_atendimento: v.total_vendas > 0 ? v.qtd_itens_total / v.total_vendas : 0,
      }));

      setVendas(vendasArray);
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

  const fetchComparativoAnual = async () => {
    try {
      // Buscar vendas do ano atual
      const { data: vendasAtual, error: erroAtual } = await supabase
        .from('vendas_diarias')
        .select('data, valor_liquido_centavos')
        .gte('data', `${selectedAno}-01-01`)
        .lt('data', `${selectedAno + 1}-01-01`);

      // Buscar vendas do ano anterior
      const { data: vendasAnterior, error: erroAnterior } = await supabase
        .from('vendas_diarias')
        .select('data, valor_liquido_centavos')
        .gte('data', `${selectedAno - 1}-01-01`)
        .lt('data', `${selectedAno}-01-01`);

      if (erroAtual) throw erroAtual;

      // Agrupar por mês
      const comparativoMes: any = {};

      (vendasAtual || []).forEach((venda: any) => {
        const mes = new Date(venda.data).getMonth() + 1;
        if (!comparativoMes[mes]) {
          comparativoMes[mes] = { mes, ano: selectedAno, valor_atual: 0, valor_anterior: 0 };
        }
        comparativoMes[mes].valor_atual += venda.valor_liquido_centavos || 0;
      });

      (vendasAnterior || []).forEach((venda: any) => {
        const mes = new Date(venda.data).getMonth() + 1;
        if (!comparativoMes[mes]) {
          comparativoMes[mes] = { mes, ano: selectedAno, valor_atual: 0, valor_anterior: 0 };
        }
        comparativoMes[mes].valor_anterior += venda.valor_liquido_centavos || 0;
      });

      // Calcular crescimento
      const comparativoArray = Object.values(comparativoMes).map((c: any) => ({
        ...c,
        ano_anterior: selectedAno - 1,
        crescimento_percentual: c.valor_anterior > 0 
          ? ((c.valor_atual - c.valor_anterior) / c.valor_anterior) * 100 
          : 0,
      }));

      setComparativo(comparativoArray.sort((a: any, b: any) => a.mes - b.mes));
    } catch (error) {
      console.error('Erro ao buscar comparativo anual:', error);
    }
  };

  const formatCurrency = (centavos: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(centavos / 100);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(num);
  };

  const filteredVendas = vendas.filter(venda =>
    venda.vendedora_nome.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totais = filteredVendas.reduce((acc, venda) => ({
    total_vendas: acc.total_vendas + venda.total_vendas,
    qtd_itens_total: acc.qtd_itens_total + venda.qtd_itens_total,
    valor_liquido_total: acc.valor_liquido_total + venda.valor_liquido_total,
    clientes_atendidos: acc.clientes_atendidos + (venda.clientes_atendidos || 0),
  }), { total_vendas: 0, qtd_itens_total: 0, valor_liquido_total: 0, clientes_atendidos: 0 });

  const meses = [
    { value: 1, label: 'Janeiro' },
    { value: 2, label: 'Fevereiro' },
    { value: 3, label: 'Março' },
    { value: 4, label: 'Abril' },
    { value: 5, label: 'Maio' },
    { value: 6, label: 'Junho' },
    { value: 7, label: 'Julho' },
    { value: 8, label: 'Agosto' },
    { value: 9, label: 'Setembro' },
    { value: 10, label: 'Outubro' },
    { value: 11, label: 'Novembro' },
    { value: 12, label: 'Dezembro' },
  ];

  const anos = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Vendas Mensais por Vendedora</h1>
          <p className="text-muted-foreground">
            Acompanhe o desempenho individual de cada vendedora no período
          </p>
        </div>
      </div>

      {/* Filtros de Período */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros de Período</CardTitle>
          <CardDescription>Selecione o mês e ano para visualizar</CardDescription>
        </CardHeader>
        <CardContent className="flex gap-4">
          <div className="flex-1">
            <Select value={selectedMes.toString()} onValueChange={(value) => setSelectedMes(parseInt(value))}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o mês" />
              </SelectTrigger>
              <SelectContent>
                {meses.map((mes) => (
                  <SelectItem key={mes.value} value={mes.value.toString()}>
                    {mes.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1">
            <Select value={selectedAno.toString()} onValueChange={(value) => setSelectedAno(parseInt(value))}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o ano" />
              </SelectTrigger>
              <SelectContent>
                {anos.map((ano) => (
                  <SelectItem key={ano} value={ano.toString()}>
                    {ano}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Cards de Resumo */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Total de Vendas"
          value={totais.total_vendas.toString()}
          icon={ShoppingCart}
          variant="default"
        />
        <StatsCard
          title="Clientes Atendidos"
          value={totais.clientes_atendidos.toString()}
          icon={Users}
          variant="info"
        />
        <StatsCard
          title="Produtos Vendidos"
          value={totais.qtd_itens_total.toString()}
          icon={TrendingUp}
          variant="success"
        />
        <StatsCard
          title="Valor Total"
          value={formatCurrency(totais.valor_liquido_total)}
          icon={TrendingUp}
          variant="warning"
        />
      </div>

      {/* Tabela de Vendas por Vendedora */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Desempenho por Vendedora</CardTitle>
              <CardDescription>
                {meses.find(m => m.value === selectedMes)?.label} de {selectedAno} - {vendas.length} vendedora(s)
              </CardDescription>
            </div>
            <Input
              placeholder="Buscar vendedora..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Vendedor(a)</TableHead>
                <TableHead>Filial</TableHead>
                <TableHead className="text-center">Clientes Atendidos</TableHead>
                <TableHead className="text-center">Qtd Vendas</TableHead>
                <TableHead className="text-center">Produtos Vendidos</TableHead>
                <TableHead className="text-center">Média Produtos/Venda</TableHead>
                <TableHead className="text-right">Ticket Médio</TableHead>
                <TableHead className="text-right">Total Período</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredVendas.map((venda) => (
                <TableRow key={venda.vendedora_pf_id}>
                  <TableCell className="font-medium">
                    <span
                      className="text-primary hover:underline cursor-pointer"
                      onClick={() => navigate(`/cadastros/pessoas-fisicas/${venda.vendedora_pf_id}`)}
                    >
                      {venda.vendedora_nome}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{venda.filial_nome}</Badge>
                  </TableCell>
                  <TableCell className="text-center">{venda.clientes_atendidos || 0}</TableCell>
                  <TableCell className="text-center">{venda.total_vendas}</TableCell>
                  <TableCell className="text-center">{venda.qtd_itens_total}</TableCell>
                  <TableCell className="text-center">
                    {formatNumber(venda.media_produtos_por_atendimento || 0)}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(venda.ticket_medio)}
                  </TableCell>
                  <TableCell className="text-right font-bold text-primary">
                    {formatCurrency(venda.valor_liquido_total)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Comparativo Anual */}
      <Card>
        <CardHeader>
          <CardTitle>Comparativo Ano a Ano</CardTitle>
          <CardDescription>
            Crescimento mês a mês comparando {selectedAno} vs {selectedAno - 1}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Mês</TableHead>
                <TableHead className="text-right">Valor {selectedAno - 1}</TableHead>
                <TableHead className="text-right">Valor {selectedAno}</TableHead>
                <TableHead className="text-right">Crescimento</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {comparativo.map((comp) => (
                <TableRow key={comp.mes}>
                  <TableCell className="font-medium">
                    {meses.find(m => m.value === comp.mes)?.label}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(comp.valor_anterior)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(comp.valor_atual)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge variant={comp.crescimento_percentual >= 0 ? 'default' : 'destructive'}>
                      {comp.crescimento_percentual >= 0 ? '↑' : '↓'} {Math.abs(comp.crescimento_percentual).toFixed(2)}%
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
