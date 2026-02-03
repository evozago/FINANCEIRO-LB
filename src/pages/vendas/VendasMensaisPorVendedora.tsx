import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { TrendingUp, Users, ShoppingCart } from 'lucide-react';
import { usePersistentState } from '@/hooks/usePersistentState';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { StatsCard } from '@/components/ui/stats-card';

interface VendasVendedora {
  vendedora_id: number;
  vendedora_nome: string;
  filial_nome: string;
  total_vendas: number;
  valor_total: number;
  ticket_medio: number;
}

export function VendasMensaisPorVendedora() {
  const navigate = useNavigate();
  const [vendas, setVendas] = useState<VendasVendedora[]>([]);
  const [selectedMes, setSelectedMes] = usePersistentState<number>('vendas-mensais-mes', new Date().getMonth() + 1);
  const [selectedAno, setSelectedAno] = usePersistentState<number>('vendas-mensais-ano', new Date().getFullYear());
  const [searchTerm, setSearchTerm] = usePersistentState('vendas-mensais-search', '');
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchVendasMensais();
  }, [selectedMes, selectedAno]);

  const fetchVendasMensais = async () => {
    try {
      setLoading(true);

      // Calcular datas do período
      const inicioMes = `${selectedAno}-${String(selectedMes).padStart(2, '0')}-01`;
      const proximoMes = selectedMes === 12 ? 1 : selectedMes + 1;
      const proximoAno = selectedMes === 12 ? selectedAno + 1 : selectedAno;
      const fimMes = `${proximoAno}-${String(proximoMes).padStart(2, '0')}-01`;

      // Buscar vendas do mês usando a tabela vendas
      const { data: vendasData, error } = await supabase
        .from('vendas')
        .select(`
          id,
          vendedora_id,
          filial_id,
          valor_centavos,
          data_venda,
          vendedoras(id, nome),
          filiais(nome)
        `)
        .gte('data_venda', inicioMes)
        .lt('data_venda', fimMes);

      if (error) throw error;

      // Agrupar por vendedora
      const vendasAgrupadas = (vendasData || []).reduce((acc: Record<number, VendasVendedora>, venda) => {
        const vendedoraId = venda.vendedora_id;
        if (!vendedoraId) return acc;

        if (!acc[vendedoraId]) {
          acc[vendedoraId] = {
            vendedora_id: vendedoraId,
            vendedora_nome: (venda.vendedoras as { nome: string } | null)?.nome || 'Sem nome',
            filial_nome: (venda.filiais as { nome: string } | null)?.nome || 'Sem filial',
            total_vendas: 0,
            valor_total: 0,
            ticket_medio: 0,
          };
        }

        acc[vendedoraId].total_vendas += 1;
        acc[vendedoraId].valor_total += venda.valor_centavos || 0;
        
        return acc;
      }, {});

      // Converter para array e calcular médias
      const vendasArray = Object.values(vendasAgrupadas).map((v) => ({
        ...v,
        ticket_medio: v.total_vendas > 0 ? v.valor_total / v.total_vendas : 0,
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

  const formatCurrency = (centavos: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(centavos / 100);
  };

  const filteredVendas = vendas.filter(venda =>
    venda.vendedora_nome.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totais = filteredVendas.reduce((acc, venda) => ({
    total_vendas: acc.total_vendas + venda.total_vendas,
    valor_total: acc.valor_total + venda.valor_total,
  }), { total_vendas: 0, valor_total: 0 });

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
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <StatsCard
          title="Vendedoras Ativas"
          value={vendas.length.toString()}
          icon={Users}
          variant="info"
        />
        <StatsCard
          title="Total de Vendas"
          value={totais.total_vendas.toString()}
          icon={ShoppingCart}
          variant="default"
        />
        <StatsCard
          title="Valor Total"
          value={formatCurrency(totais.valor_total)}
          icon={TrendingUp}
          variant="success"
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
          {loading ? (
            <p className="text-center text-muted-foreground py-8">Carregando...</p>
          ) : filteredVendas.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Nenhuma venda encontrada no período.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vendedor(a)</TableHead>
                  <TableHead>Filial</TableHead>
                  <TableHead className="text-center">Qtd Vendas</TableHead>
                  <TableHead className="text-right">Ticket Médio</TableHead>
                  <TableHead className="text-right">Total Período</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredVendas.map((venda) => (
                  <TableRow key={venda.vendedora_id}>
                    <TableCell className="font-medium">
                      <span className="text-primary hover:underline cursor-pointer">
                        {venda.vendedora_nome}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{venda.filial_nome}</Badge>
                    </TableCell>
                    <TableCell className="text-center">{venda.total_vendas}</TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(venda.ticket_medio)}
                    </TableCell>
                    <TableCell className="text-right font-bold text-primary">
                      {formatCurrency(venda.valor_total)}
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
