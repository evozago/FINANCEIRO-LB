import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useDropzone } from 'react-dropzone';
import * as XLSX from 'xlsx';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Upload,
  FileSpreadsheet,
  Play,
  Download,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowRight,
  Tags,
  Settings2,
  BarChart3,
} from 'lucide-react';
import { toast } from 'sonner';
import { classificarLote, type RegraClassificacao, type AtributoCustomizado } from '@/lib/classificador';
import { Link } from 'react-router-dom';

interface ProdutoImportado {
  id?: number;
  codigo?: string;
  nome: string;
  preco?: number;
  [key: string]: unknown;
}

interface MapeamentoColunas {
  nome: string;
  codigo?: string;
  preco?: string;
}

type Etapa = 'upload' | 'mapeamento' | 'classificacao' | 'resultado';

export default function ClassificadorProdutos() {
  const queryClient = useQueryClient();
  const [etapa, setEtapa] = useState<Etapa>('upload');
  const [arquivoNome, setArquivoNome] = useState('');
  const [dadosPlanilha, setDadosPlanilha] = useState<Record<string, unknown>[]>([]);
  const [colunas, setColunas] = useState<string[]>([]);
  const [mapeamento, setMapeamento] = useState<MapeamentoColunas>({ nome: '' });
  const [produtosClassificados, setProdutosClassificados] = useState<Array<{
    produto: ProdutoImportado;
    resultado: ReturnType<typeof classificarLote>[0]['resultado'];
  }>>([]);
  const [progresso, setProgresso] = useState(0);
  const [classificando, setClassificando] = useState(false);
  const [sessaoId, setSessaoId] = useState<number | null>(null);

  // Buscar regras
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

  // Processar arquivo
  const processarArquivo = useCallback((file: File) => {
    setArquivoNome(file.name);
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet);

        if (jsonData.length === 0) {
          toast.error('Planilha vazia');
          return;
        }

        const cols = Object.keys(jsonData[0]);
        setColunas(cols);
        setDadosPlanilha(jsonData);

        // Auto-detectar colunas
        const nomeCol = cols.find(c => 
          /nome|descri|produto|item/i.test(c)
        );
        const codigoCol = cols.find(c => 
          /cod|sku|ref|id/i.test(c)
        );
        const precoCol = cols.find(c => 
          /preco|valor|price|custo/i.test(c)
        );

        setMapeamento({
          nome: nomeCol || cols[0],
          codigo: codigoCol,
          preco: precoCol,
        });

        setEtapa('mapeamento');
        toast.success(`${jsonData.length} produtos encontrados`);
      } catch (err) {
        console.error(err);
        toast.error('Erro ao ler arquivo');
      }
    };

    reader.readAsBinaryString(file);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (files) => files[0] && processarArquivo(files[0]),
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
      'text/csv': ['.csv'],
    },
    multiple: false,
  });

  // Executar classificação
  const executarClassificacao = async () => {
    if (!mapeamento.nome) {
      toast.error('Selecione a coluna de nome do produto');
      return;
    }

    setClassificando(true);
    setProgresso(0);

    try {
      // Criar sessão de importação
      const { data: sessao, error: sessaoError } = await supabase
        .from('sessoes_importacao')
        .insert({
          nome: arquivoNome.replace(/\.[^/.]+$/, ''),
          nome_arquivo: arquivoNome,
          total_produtos: dadosPlanilha.length,
          mapeamento_colunas: mapeamento,
        })
        .select()
        .single();

      if (sessaoError) throw sessaoError;
      setSessaoId(sessao.id);

      // Preparar produtos
      const produtos: ProdutoImportado[] = dadosPlanilha.map(row => ({
        nome: String(row[mapeamento.nome] || ''),
        codigo: mapeamento.codigo ? String(row[mapeamento.codigo] || '') : undefined,
        preco: mapeamento.preco ? Number(row[mapeamento.preco]) || 0 : undefined,
      }));

      // Classificar em lotes para não travar a UI
      const batchSize = 100;
      const resultados: typeof produtosClassificados = [];
      
      for (let i = 0; i < produtos.length; i += batchSize) {
        const batch = produtos.slice(i, i + batchSize);
        const classificados = classificarLote(batch, regras, atributos);
        resultados.push(...classificados);
        setProgresso(Math.round(((i + batch.length) / produtos.length) * 100));
        
        // Yield para UI
        await new Promise(r => setTimeout(r, 10));
      }

      setProdutosClassificados(resultados);

      // Salvar no banco
      const produtosParaSalvar = resultados.map(({ produto, resultado }) => ({
        nome: produto.nome,
        nome_original: produto.nome,
        codigo: produto.codigo || null,
        preco_centavos: produto.preco ? Math.round(produto.preco * 100) : 0,
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
        sessao_id: sessao.id,
      }));

      // Inserir em lotes
      for (let i = 0; i < produtosParaSalvar.length; i += 100) {
        const batch = produtosParaSalvar.slice(i, i + 100);
        const { error } = await supabase.from('produtos').insert(batch);
        if (error) console.error('Erro ao salvar batch:', error);
      }

      // Atualizar estatísticas da sessão
      const classificados = resultados.filter(r => r.resultado.confianca > 0).length;
      const confiancaMedia = resultados.reduce((acc, r) => acc + r.resultado.confianca, 0) / resultados.length;

      await supabase
        .from('sessoes_importacao')
        .update({
          classificados,
          confianca_media: confiancaMedia,
        })
        .eq('id', sessao.id);

      queryClient.invalidateQueries({ queryKey: ['sessoes-importacao'] });
      queryClient.invalidateQueries({ queryKey: ['produtos'] });

      setEtapa('resultado');
      toast.success(`${classificados} de ${resultados.length} produtos classificados!`);
    } catch (err) {
      console.error(err);
      toast.error('Erro durante classificação');
    } finally {
      setClassificando(false);
    }
  };

  // Exportar para Excel
  const exportarExcel = () => {
    const dados = produtosClassificados.map(({ produto, resultado }) => ({
      'Código': produto.codigo || '',
      'Nome Original': produto.nome,
      'Categoria': resultado.categoria || '',
      'Subcategoria': resultado.subcategoria || '',
      'Gênero': resultado.genero || '',
      'Faixa Etária': resultado.faixa_etaria || '',
      'Marca': resultado.marca || '',
      'Tamanho': resultado.tamanho || '',
      'Cor': resultado.cor || '',
      'Material': resultado.material || '',
      'Confiança (%)': resultado.confianca,
      'Regras Aplicadas': resultado.regras_aplicadas.join(', '),
    }));

    const ws = XLSX.utils.json_to_sheet(dados);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Produtos Classificados');
    XLSX.writeFile(wb, `produtos_classificados_${new Date().toISOString().split('T')[0]}.xlsx`);
    toast.success('Arquivo exportado!');
  };

  // Estatísticas
  const stats = {
    total: produtosClassificados.length,
    classificados: produtosClassificados.filter(p => p.resultado.confianca > 0).length,
    altaConfianca: produtosClassificados.filter(p => p.resultado.confianca >= 70).length,
    confiancaMedia: produtosClassificados.length > 0
      ? Math.round(produtosClassificados.reduce((a, p) => a + p.resultado.confianca, 0) / produtosClassificados.length)
      : 0,
  };

  const resetar = () => {
    setEtapa('upload');
    setArquivoNome('');
    setDadosPlanilha([]);
    setColunas([]);
    setMapeamento({ nome: '' });
    setProdutosClassificados([]);
    setProgresso(0);
    setSessaoId(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Tags className="h-6 w-6" />
            Classificador de Produtos
          </h1>
          <p className="text-muted-foreground">
            Importe planilhas e classifique produtos automaticamente
          </p>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link to="/produtos/regras">
              <Settings2 className="h-4 w-4 mr-2" />
              Regras
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link to="/produtos/dashboard">
              <BarChart3 className="h-4 w-4 mr-2" />
              Dashboard
            </Link>
          </Button>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center justify-center gap-2">
        {(['upload', 'mapeamento', 'classificacao', 'resultado'] as const).map((step, idx) => (
          <div key={step} className="flex items-center">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
              etapa === step ? 'bg-primary text-primary-foreground' :
              ['upload', 'mapeamento', 'classificacao', 'resultado'].indexOf(etapa) > idx
                ? 'bg-green-500 text-white' : 'bg-muted text-muted-foreground'
            }`}>
              {['upload', 'mapeamento', 'classificacao', 'resultado'].indexOf(etapa) > idx ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : idx + 1}
            </div>
            {idx < 3 && <ArrowRight className="h-4 w-4 mx-2 text-muted-foreground" />}
          </div>
        ))}
      </div>

      {/* Etapa 1: Upload */}
      {etapa === 'upload' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Upload de Planilha
            </CardTitle>
            <CardDescription>
              Arraste um arquivo Excel (.xlsx, .xls) ou CSV com seus produtos
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors ${
                isDragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50'
              }`}
            >
              <input {...getInputProps()} />
              <FileSpreadsheet className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-lg font-medium mb-1">
                {isDragActive ? 'Solte o arquivo aqui' : 'Arraste sua planilha ou clique para selecionar'}
              </p>
              <p className="text-sm text-muted-foreground">
                Suporta .xlsx, .xls e .csv
              </p>
            </div>

            <div className="mt-6 flex items-center gap-4">
              <Badge variant="outline">{regras.length} regras ativas</Badge>
              <Badge variant="outline">{atributos.length} atributos configurados</Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Etapa 2: Mapeamento */}
      {etapa === 'mapeamento' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5" />
              Mapeamento de Colunas
            </CardTitle>
            <CardDescription>
              {arquivoNome} • {dadosPlanilha.length} produtos encontrados
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <Label>Nome do Produto *</Label>
                <Select
                  value={mapeamento.nome}
                  onValueChange={(v) => setMapeamento({ ...mapeamento, nome: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {colunas.map(col => (
                      <SelectItem key={col} value={col}>{col}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Código (opcional)</Label>
                <Select
                  value={mapeamento.codigo || 'none'}
                  onValueChange={(v) => setMapeamento({ ...mapeamento, codigo: v === 'none' ? undefined : v })}
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
              <div>
                <Label>Preço (opcional)</Label>
                <Select
                  value={mapeamento.preco || 'none'}
                  onValueChange={(v) => setMapeamento({ ...mapeamento, preco: v === 'none' ? undefined : v })}
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
            </div>

            {/* Preview */}
            <div>
              <h4 className="font-medium mb-2">Prévia (5 primeiros)</h4>
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {mapeamento.codigo && <TableHead>Código</TableHead>}
                      <TableHead>Nome</TableHead>
                      {mapeamento.preco && <TableHead>Preço</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dadosPlanilha.slice(0, 5).map((row, idx) => (
                      <TableRow key={idx}>
                        {mapeamento.codigo && <TableCell>{String(row[mapeamento.codigo] || '')}</TableCell>}
                        <TableCell className="font-medium">{String(row[mapeamento.nome] || '')}</TableCell>
                        {mapeamento.preco && <TableCell>{String(row[mapeamento.preco] || '')}</TableCell>}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={resetar}>Cancelar</Button>
              <Button onClick={() => { setEtapa('classificacao'); executarClassificacao(); }}>
                <Play className="h-4 w-4 mr-2" />
                Classificar Produtos
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Etapa 3: Classificando */}
      {etapa === 'classificacao' && classificando && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin" />
              Classificando Produtos...
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Progress value={progresso} />
            <p className="text-center text-muted-foreground">
              {progresso}% concluído
            </p>
          </CardContent>
        </Card>
      )}

      {/* Etapa 4: Resultado */}
      {etapa === 'resultado' && (
        <>
          {/* Stats */}
          <div className="grid gap-4 sm:grid-cols-4">
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">{stats.total}</div>
                <p className="text-sm text-muted-foreground">Total de produtos</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-green-600">{stats.classificados}</div>
                <p className="text-sm text-muted-foreground">Classificados</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-blue-600">{stats.altaConfianca}</div>
                <p className="text-sm text-muted-foreground">Alta confiança (≥70%)</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">{stats.confiancaMedia}%</div>
                <p className="text-sm text-muted-foreground">Confiança média</p>
              </CardContent>
            </Card>
          </div>

          {/* Ações */}
          <div className="flex gap-2">
            <Button onClick={exportarExcel}>
              <Download className="h-4 w-4 mr-2" />
              Exportar Excel
            </Button>
            <Button variant="outline" onClick={resetar}>
              Nova Importação
            </Button>
            <Button variant="outline" asChild>
              <Link to="/produtos/lista">Ver Todos os Produtos</Link>
            </Button>
          </div>

          {/* Tabela de resultados */}
          <Card>
            <CardHeader>
              <CardTitle>Produtos Classificados</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="todos">
                <TabsList>
                  <TabsTrigger value="todos">Todos ({stats.total})</TabsTrigger>
                  <TabsTrigger value="alta">Alta Confiança ({stats.altaConfianca})</TabsTrigger>
                  <TabsTrigger value="baixa">Baixa Confiança ({stats.total - stats.altaConfianca})</TabsTrigger>
                </TabsList>

                <TabsContent value="todos" className="mt-4">
                  <TabelaProdutos produtos={produtosClassificados} />
                </TabsContent>
                <TabsContent value="alta" className="mt-4">
                  <TabelaProdutos produtos={produtosClassificados.filter(p => p.resultado.confianca >= 70)} />
                </TabsContent>
                <TabsContent value="baixa" className="mt-4">
                  <TabelaProdutos produtos={produtosClassificados.filter(p => p.resultado.confianca < 70)} />
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

// Componente de tabela reutilizável
function TabelaProdutos({ produtos }: { produtos: typeof ClassificadorProdutos extends () => infer R ? never : Array<{
  produto: ProdutoImportado;
  resultado: ReturnType<typeof classificarLote>[0]['resultado'];
}> }) {
  if (produtos.length === 0) {
    return <p className="text-center text-muted-foreground py-8">Nenhum produto nesta categoria</p>;
  }

  return (
    <div className="border rounded-lg overflow-auto max-h-[500px]">
      <Table>
        <TableHeader className="sticky top-0 bg-background">
          <TableRow>
            <TableHead>Nome</TableHead>
            <TableHead>Categoria</TableHead>
            <TableHead>Gênero</TableHead>
            <TableHead>Tamanho</TableHead>
            <TableHead>Cor</TableHead>
            <TableHead>Confiança</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {produtos.slice(0, 100).map(({ produto, resultado }, idx) => (
            <TableRow key={idx}>
              <TableCell className="font-medium max-w-[300px] truncate">{produto.nome}</TableCell>
              <TableCell>
                {resultado.categoria && (
                  <Badge variant="outline">{resultado.categoria}</Badge>
                )}
                {resultado.subcategoria && (
                  <span className="text-xs text-muted-foreground ml-1">{resultado.subcategoria}</span>
                )}
              </TableCell>
              <TableCell>{resultado.genero || '—'}</TableCell>
              <TableCell>{resultado.tamanho || '—'}</TableCell>
              <TableCell>{resultado.cor || '—'}</TableCell>
              <TableCell>
                <Badge variant={resultado.confianca >= 70 ? 'default' : resultado.confianca > 0 ? 'secondary' : 'outline'}>
                  {resultado.confianca}%
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {produtos.length > 100 && (
        <p className="text-center text-sm text-muted-foreground py-2">
          Mostrando 100 de {produtos.length} produtos
        </p>
      )}
    </div>
  );
}
