/**
 * Componente de Mapeamento de Colunas para Importador de Produtos
 * Com suporte a detecção de grade por referência
 */
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Info, Grid3X3 } from 'lucide-react';

export interface MapeamentoColunasProduto {
  nome: string;
  codigo?: string;
  referencia?: string; // Nova: para identificar grade
  preco?: string;
  custo?: string;
  estoque?: string;
  cor?: string;
  tamanho?: string;
}

interface ImportadorProdutosMapeamentoProps {
  colunas: string[];
  mapeamento: MapeamentoColunasProduto;
  onMapeamentoChange: (m: MapeamentoColunasProduto) => void;
  dadosPrevia: Record<string, unknown>[];
  estatisticasGrade?: {
    totalLinhas: number;
    produtosUnicos: number;
    produtosComVariacao: number;
    mediaVariacoes: number;
  };
}

export function ImportadorProdutosMapeamento({
  colunas,
  mapeamento,
  onMapeamentoChange,
  dadosPrevia,
  estatisticasGrade,
}: ImportadorProdutosMapeamentoProps) {
  const campos: Array<{
    key: keyof MapeamentoColunasProduto;
    label: string;
    required?: boolean;
    description?: string;
  }> = [
    { key: 'nome', label: 'Nome do Produto', required: true },
    { key: 'codigo', label: 'Código/SKU', description: 'Código único do item' },
    { key: 'referencia', label: 'Referência (Grade)', description: 'Campo que identifica variações do mesmo produto' },
    { key: 'preco', label: 'Preço de Venda' },
    { key: 'custo', label: 'Custo' },
    { key: 'estoque', label: 'Quantidade em Estoque' },
    { key: 'cor', label: 'Cor' },
    { key: 'tamanho', label: 'Tamanho' },
  ];

  return (
    <div className="space-y-6">
      {/* Estatísticas de Grade */}
      {estatisticasGrade && mapeamento.referencia && (
        <Card className="border-primary/30 bg-primary/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Grid3X3 className="h-4 w-4" />
              Produtos com Grade Detectados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold">{estatisticasGrade.totalLinhas.toLocaleString('pt-BR')}</div>
                <div className="text-xs text-muted-foreground">Total de linhas</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-primary">{estatisticasGrade.produtosUnicos.toLocaleString('pt-BR')}</div>
                <div className="text-xs text-muted-foreground">Produtos únicos</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-accent-foreground">{estatisticasGrade.produtosComVariacao.toLocaleString('pt-BR')}</div>
                <div className="text-xs text-muted-foreground">Com variações</div>
              </div>
              <div>
                <div className="text-2xl font-bold">{estatisticasGrade.mediaVariacoes.toFixed(1)}</div>
                <div className="text-xs text-muted-foreground">Média variações</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Mapeamento de colunas */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {campos.map(({ key, label, required, description }) => (
          <div key={key}>
            <Label className="flex items-center gap-1">
              {label}
              {required && <span className="text-destructive">*</span>}
              {key === 'referencia' && (
                <Badge variant="outline" className="ml-1 text-xs">
                  <Grid3X3 className="h-3 w-3 mr-1" />
                  Grade
                </Badge>
              )}
            </Label>
            {description && (
              <p className="text-xs text-muted-foreground mb-1">{description}</p>
            )}
            <Select
              value={mapeamento[key] || 'none'}
              onValueChange={(v) => onMapeamentoChange({ ...mapeamento, [key]: v === 'none' ? undefined : v })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nenhum</SelectItem>
                {colunas.map(col => (
                  <SelectItem key={col} value={col}>{col}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ))}
      </div>

      {/* Dica sobre referência */}
      {!mapeamento.referencia && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50 text-sm">
          <Info className="h-4 w-4 text-muted-foreground mt-0.5" />
          <div>
            <span className="font-medium">Dica:</span> Se sua planilha contém produtos com grade (variações de cor/tamanho), 
            selecione a coluna <strong>Referência</strong> que identifica o produto pai. 
            Linhas com a mesma referência serão agrupadas como variações do mesmo produto.
          </div>
        </div>
      )}

      {/* Prévia dos dados */}
      <div>
        <h4 className="font-medium mb-2">Prévia dos dados (primeiras 5 linhas)</h4>
        <div className="border rounded-lg overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                {mapeamento.referencia && <TableHead>Referência</TableHead>}
                {mapeamento.codigo && <TableHead>Código</TableHead>}
                <TableHead>Nome</TableHead>
                {mapeamento.cor && <TableHead>Cor</TableHead>}
                {mapeamento.tamanho && <TableHead>Tamanho</TableHead>}
                {mapeamento.preco && <TableHead>Preço</TableHead>}
                {mapeamento.estoque && <TableHead>Estoque</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {dadosPrevia.slice(0, 5).map((row, idx) => (
                <TableRow key={idx}>
                  {mapeamento.referencia && (
                    <TableCell className="font-mono text-xs">
                      {String(row[mapeamento.referencia] || '')}
                    </TableCell>
                  )}
                  {mapeamento.codigo && (
                    <TableCell className="font-mono text-xs">
                      {String(row[mapeamento.codigo] || '')}
                    </TableCell>
                  )}
                  <TableCell className="font-medium max-w-[200px] truncate">
                    {String(row[mapeamento.nome] || '')}
                  </TableCell>
                  {mapeamento.cor && (
                    <TableCell>{String(row[mapeamento.cor] || '')}</TableCell>
                  )}
                  {mapeamento.tamanho && (
                    <TableCell>{String(row[mapeamento.tamanho] || '')}</TableCell>
                  )}
                  {mapeamento.preco && (
                    <TableCell>{String(row[mapeamento.preco] || '')}</TableCell>
                  )}
                  {mapeamento.estoque && (
                    <TableCell>{String(row[mapeamento.estoque] || '')}</TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
