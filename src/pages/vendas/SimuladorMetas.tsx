import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Calculator, TrendingUp, Target } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface ProjecaoFilial {
  nome: string;
  vendasAtual: number;
  crescimento: number;
  projecao: number;
  metaSugerida: number;
}

const meses = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

export function SimuladorMetas() {
  const [percentualCrescimento, setPercentualCrescimento] = useState<string>('10');
  const [filiaisMock] = useState([
    { id: 1, nome: 'Filial Principal', vendasAtual: 150000 },
    { id: 2, nome: 'Filial Norte', vendasAtual: 80000 },
    { id: 3, nome: 'Filial Sul', vendasAtual: 120000 },
  ]);
  const [projecoes, setProjecoes] = useState<ProjecaoFilial[]>([]);
  const [mostrarResultado, setMostrarResultado] = useState(false);

  const calcularProjecoes = () => {
    const crescimento = parseFloat(percentualCrescimento) / 100;
    
    const novasProjecoes = filiaisMock.map(filial => {
      const projecao = filial.vendasAtual * (1 + crescimento);
      const metaSugerida = Math.ceil(projecao / 1000) * 1000; // Arredondar para cima em milhares

      return {
        nome: filial.nome,
        vendasAtual: filial.vendasAtual,
        crescimento: parseFloat(percentualCrescimento),
        projecao,
        metaSugerida,
      };
    });

    setProjecoes(novasProjecoes);
    setMostrarResultado(true);
  };

  const formatCurrency = (centavos: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(centavos / 100);
  };

  const getTotalAtual = () => {
    return filiaisMock.reduce((sum, f) => sum + f.vendasAtual, 0);
  };

  const getTotalProjecao = () => {
    return projecoes.reduce((sum, p) => sum + p.projecao, 0);
  };

  const getTotalMeta = () => {
    return projecoes.reduce((sum, p) => sum + p.metaSugerida, 0);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Simulador de Metas</h1>
        <p className="text-muted-foreground">
          Projete cenários futuros e defina metas baseadas em crescimento esperado
        </p>
      </div>

      {/* Configuração da Simulação */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Calculator className="h-5 w-5" />
            <span>Configurar Simulação</span>
          </CardTitle>
          <CardDescription>
            Defina o percentual de crescimento esperado para projetar as vendas
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="crescimento">Crescimento Esperado (%)</Label>
              <Input
                id="crescimento"
                type="number"
                step="0.1"
                value={percentualCrescimento}
                onChange={(e) => setPercentualCrescimento(e.target.value)}
                placeholder="Ex: 10"
              />
            </div>
            <div className="flex items-end">
              <Button onClick={calcularProjecoes} className="w-full">
                <Target className="h-4 w-4 mr-2" />
                Calcular Projeções
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Vendas Atuais */}
      <Card>
        <CardHeader>
          <CardTitle>Vendas Atuais (Base)</CardTitle>
          <CardDescription>
            Valores de vendas do mês atual sendo usado como base para projeção
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Filial</TableHead>
                <TableHead className="text-right">Vendas Atuais</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filiaisMock.map((filial) => (
                <TableRow key={filial.id}>
                  <TableCell className="font-medium">{filial.nome}</TableCell>
                  <TableCell className="text-right font-mono">
                    {formatCurrency(filial.vendasAtual)}
                  </TableCell>
                </TableRow>
              ))}
              <TableRow className="bg-muted/50 font-bold">
                <TableCell>TOTAL</TableCell>
                <TableCell className="text-right font-mono">
                  {formatCurrency(getTotalAtual())}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Resultados da Projeção */}
      {mostrarResultado && projecoes.length > 0 && (
        <>
          <Card className="border-primary">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                <span>Projeções e Metas Sugeridas</span>
                <Badge className="bg-primary">
                  +{percentualCrescimento}% de crescimento
                </Badge>
              </CardTitle>
              <CardDescription>
                Metas sugeridas com base no crescimento projetado
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Filial</TableHead>
                    <TableHead className="text-right">Vendas Atuais</TableHead>
                    <TableHead className="text-right">Projeção</TableHead>
                    <TableHead className="text-right">Meta Sugerida</TableHead>
                    <TableHead className="text-right">Aumento</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {projecoes.map((projecao) => (
                    <TableRow key={projecao.nome}>
                      <TableCell className="font-medium">{projecao.nome}</TableCell>
                      <TableCell className="text-right font-mono">
                        {formatCurrency(projecao.vendasAtual)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-muted-foreground">
                        {formatCurrency(projecao.projecao)}
                      </TableCell>
                      <TableCell className="text-right font-mono font-bold text-primary">
                        {formatCurrency(projecao.metaSugerida)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge className="bg-green-100 text-green-800">
                          +{formatCurrency(projecao.metaSugerida - projecao.vendasAtual)}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="bg-muted/50 font-bold">
                    <TableCell>TOTAL</TableCell>
                    <TableCell className="text-right font-mono">
                      {formatCurrency(getTotalAtual())}
                    </TableCell>
                    <TableCell className="text-right font-mono text-muted-foreground">
                      {formatCurrency(getTotalProjecao())}
                    </TableCell>
                    <TableCell className="text-right font-mono text-primary">
                      {formatCurrency(getTotalMeta())}
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge className="bg-green-100 text-green-800">
                        +{formatCurrency(getTotalMeta() - getTotalAtual())}
                      </Badge>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Insights */}
          <Card className="bg-blue-50 border-blue-200">
            <CardHeader>
              <CardTitle className="text-blue-900">💡 Insights da Simulação</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p>
                <strong>Crescimento Total:</strong> Com {percentualCrescimento}% de crescimento, 
                o faturamento total aumentaria de {formatCurrency(getTotalAtual())} para{' '}
                {formatCurrency(getTotalProjecao())}.
              </p>
              <p>
                <strong>Meta Sugerida:</strong> A meta arredondada sugerida é de{' '}
                {formatCurrency(getTotalMeta())}, um aumento de{' '}
                {formatCurrency(getTotalMeta() - getTotalAtual())} ({' '}
                {(((getTotalMeta() - getTotalAtual()) / getTotalAtual()) * 100).toFixed(1)}%
                ).
              </p>
              <p>
                <strong>Dica:</strong> Use estas projeções como guia para definir metas realistas
                e motivadoras para sua equipe de vendas.
              </p>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
