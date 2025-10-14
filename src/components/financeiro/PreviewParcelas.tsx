import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { CurrencyInput } from '@/components/ui/currency-input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface Parcela {
  numero: number;
  valor_centavos: number;
  vencimento: string;
}

interface PreviewParcelasProps {
  valorTotal: number;
  numParcelas: number;
  dataInicial: string;
  onChange: (parcelas: Parcela[]) => void;
}

export function PreviewParcelas({ valorTotal, numParcelas, dataInicial, onChange }: PreviewParcelasProps) {
  const [parcelas, setParcelas] = useState<Parcela[]>([]);
  const [intervaloTipo, setIntervaloTipo] = useState<'mensal' | 'quinzenal' | 'semanal' | 'dias'>('mensal');
  const [intervaloDias, setIntervaloDias] = useState(30);

  // Recalcular parcelas quando mudarem os parâmetros
  useEffect(() => {
    if (numParcelas > 0 && valorTotal > 0 && dataInicial) {
      gerarParcelas();
    }
  }, [numParcelas, valorTotal, dataInicial, intervaloTipo, intervaloDias]);

  // Notificar mudanças
  useEffect(() => {
    onChange(parcelas);
  }, [parcelas]);

  const gerarParcelas = () => {
    const valorParcela = Math.floor(valorTotal / numParcelas);
    const valorRestante = valorTotal - (valorParcela * numParcelas);
    const baseDate = new Date(dataInicial);

    const novasParcelas: Parcela[] = [];

    for (let i = 1; i <= numParcelas; i++) {
      const vencimento = new Date(baseDate);
      
      // Calcular data de vencimento baseado no tipo de intervalo
      if (intervaloTipo === 'mensal') {
        vencimento.setMonth(vencimento.getMonth() + (i - 1));
      } else if (intervaloTipo === 'quinzenal') {
        vencimento.setDate(vencimento.getDate() + ((i - 1) * 15));
      } else if (intervaloTipo === 'semanal') {
        vencimento.setDate(vencimento.getDate() + ((i - 1) * 7));
      } else if (intervaloTipo === 'dias') {
        vencimento.setDate(vencimento.getDate() + ((i - 1) * intervaloDias));
      }

      novasParcelas.push({
        numero: i,
        valor_centavos: i === numParcelas ? valorParcela + valorRestante : valorParcela,
        vencimento: vencimento.toISOString().split('T')[0]
      });
    }

    setParcelas(novasParcelas);
  };

  const atualizarParcela = (index: number, campo: 'valor_centavos' | 'vencimento', valor: any) => {
    const novasParcelas = [...parcelas];
    novasParcelas[index] = {
      ...novasParcelas[index],
      [campo]: valor
    };
    setParcelas(novasParcelas);
  };

  const distribuirDiferenca = () => {
    const totalAtual = parcelas.reduce((sum, p) => sum + p.valor_centavos, 0);
    const diferenca = valorTotal - totalAtual;
    
    if (diferenca !== 0 && parcelas.length > 0) {
      const novasParcelas = [...parcelas];
      novasParcelas[parcelas.length - 1].valor_centavos += diferenca;
      setParcelas(novasParcelas);
    }
  };

  const formatCurrency = (centavos: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(centavos / 100);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('pt-BR');
  };

  const totalParcelas = parcelas.reduce((sum, p) => sum + p.valor_centavos, 0);
  const diferenca = valorTotal - totalParcelas;
  const temDiferenca = diferenca !== 0;

  if (numParcelas === 0 || valorTotal === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Pré-visualização das Parcelas</span>
          <Badge variant={temDiferenca ? "destructive" : "secondary"}>
            Total: {formatCurrency(totalParcelas)} {temDiferenca && `(diferença: ${formatCurrency(diferenca)})`}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Configuração de Intervalo */}
        <div className="grid grid-cols-2 gap-4">
          <div className="grid gap-2">
            <Label>Intervalo entre Parcelas</Label>
            <Select value={intervaloTipo} onValueChange={(v: any) => setIntervaloTipo(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="mensal">Mensal (30 dias)</SelectItem>
                <SelectItem value="quinzenal">Quinzenal (15 dias)</SelectItem>
                <SelectItem value="semanal">Semanal (7 dias)</SelectItem>
                <SelectItem value="dias">Personalizado (dias)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {intervaloTipo === 'dias' && (
            <div className="grid gap-2">
              <Label>Dias entre Parcelas</Label>
              <Input
                type="number"
                min="1"
                value={intervaloDias}
                onChange={(e) => setIntervaloDias(parseInt(e.target.value) || 30)}
              />
            </div>
          )}

          <div className="col-span-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={gerarParcelas}
              className="w-full"
            >
              Recalcular Parcelas
            </Button>
          </div>
        </div>

        {temDiferenca && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between">
              <span>
                A soma das parcelas ({formatCurrency(totalParcelas)}) não corresponde ao valor total ({formatCurrency(valorTotal)})
              </span>
              <Button size="sm" variant="outline" onClick={distribuirDiferenca}>
                Ajustar Última Parcela
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Tabela de Parcelas Editáveis */}
        <div className="border rounded-md max-h-[400px] overflow-y-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-20">Nº</TableHead>
                <TableHead>Vencimento</TableHead>
                <TableHead>Valor</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {parcelas.map((parcela, index) => (
                <TableRow key={parcela.numero}>
                  <TableCell className="font-medium">
                    <Badge variant="outline">{parcela.numero}/{numParcelas}</Badge>
                  </TableCell>
                  <TableCell>
                    <Input
                      type="date"
                      value={parcela.vencimento}
                      onChange={(e) => atualizarParcela(index, 'vencimento', e.target.value)}
                      className="w-full"
                    />
                  </TableCell>
                  <TableCell>
                    <CurrencyInput
                      value={parcela.valor_centavos}
                      onValueChange={(value) => atualizarParcela(index, 'valor_centavos', value)}
                      className="w-full"
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Resumo */}
        <div className="flex justify-between items-center pt-4 border-t">
          <div className="text-sm text-muted-foreground">
            {numParcelas} parcela{numParcelas > 1 ? 's' : ''} de {formatCurrency(Math.floor(valorTotal / numParcelas))} em média
          </div>
          <div className="text-right">
            <div className="text-sm text-muted-foreground">Total das Parcelas</div>
            <div className="text-xl font-bold">{formatCurrency(totalParcelas)}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
