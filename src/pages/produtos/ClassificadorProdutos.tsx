import { useState, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useDropzone } from 'react-dropzone';
import * as XLSX from 'xlsx';
import { Button } from '@/components/ui/button';
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
  Loader2,
  ArrowRight,
  ArrowLeft,
  Tags,
  Settings2,
  BarChart3,
  XCircle,
  Clock,
  Zap,
  Database,
  AlertCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { type RegraClassificacao, type AtributoCustomizado } from '@/lib/classificador';
import { Link } from 'react-router-dom';
import { useLargeSpreadsheetParser } from '@/hooks/useLargeSpreadsheetParser';
import { useClassificadorWorker, type ProdutoClassificado, type ProdutoImportado } from '@/hooks/useClassificadorWorker';

interface MapeamentoColunas {
  nome: string;
  codigo?: string;
  preco?: string;
  custo?: string;
  estoque?: string;
  cor?: string;
  tamanho?: string;
}

type Etapa = 'upload' | 'mapeamento' | 'classificacao' | 'resultado';

// Componente de progresso detalhado
function ProgressoDetalhado({ 
  progress, 
  parseProgress,
  saveProgress,
  onCancel 
}: { 
  progress: ReturnType<typeof useClassificadorWorker>['progress'];
  parseProgress?: { percent: number; message: string };
  saveProgress?: { percent: number; saved: number; total: number };
  onCancel: () => void;
}) {
  const isProcessing = ['classifying', 'saving'].includes(progress.phase) || parseProgress?.percent !== 100;
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Loader2 className="h-5 w-5 animate-spin" />
          Processando Planilha Grande
        </CardTitle>
        <CardDescription>
          Otimizado para arquivos com mais de 50.000 linhas
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Métricas em tempo real */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-3 bg-muted rounded-lg">
            <div className="text-2xl font-bold text-primary">
              {progress.processed.toLocaleString('pt-BR')}
            </div>
            <div className="text-xs text-muted-foreground flex items-center justify-center gap-1">
              <Database className="h-3 w-3" />
              Processados
            </div>
          </div>
          <div className="text-center p-3 bg-muted rounded-lg">
            <div className="text-2xl font-bold">
              {progress.total.toLocaleString('pt-BR')}
            </div>
            <div className="text-xs text-muted-foreground">Total</div>
          </div>
          <div className="text-center p-3 bg-muted rounded-lg">
            <div className="text-2xl font-bold text-primary flex items-center justify-center gap-1">
              <Zap className="h-5 w-5" />
              {progress.itemsPerSecond}
            </div>
            <div className="text-xs text-muted-foreground">items/seg</div>
          </div>
          <div className="text-center p-3 bg-muted rounded-lg">
            <div className="text-2xl font-bold text-accent-foreground flex items-center justify-center gap-1">
              <Clock className="h-4 w-4" />
              {progress.estimatedTimeRemaining || '—'}
            </div>
            <div className="text-xs text-muted-foreground">Tempo restante</div>
          </div>
        </div>

        {/* Barra de progresso principal */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Classificação</span>
            <span className="font-medium">{progress.percent}%</span>
          </div>
          <Progress value={progress.percent} className="h-3" />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Lote {progress.batchesComplete} de {progress.totalBatches}</span>
            <span>Lote atual: {progress.currentBatchProgress}%</span>
          </div>
        </div>

        {/* Progresso de salvamento (se ativo) */}
        {saveProgress && saveProgress.percent < 100 && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="flex items-center gap-1">
                <Database className="h-4 w-4" />
                Salvando no banco
              </span>
              <span className="font-medium">{saveProgress.percent}%</span>
            </div>
            <Progress value={saveProgress.percent} className="h-2" />
            <div className="text-xs text-muted-foreground text-right">
              {saveProgress.saved.toLocaleString('pt-BR')} de {saveProgress.total.toLocaleString('pt-BR')}
            </div>
          </div>
        )}

        {/* Botão de cancelar */}
        {isProcessing && (
          <div className="flex justify-center">
            <Button variant="outline" onClick={onCancel} className="gap-2">
              <XCircle className="h-4 w-4" />
              Cancelar Processamento
            </Button>
          </div>
        )}

        {/* Status por fase */}
        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Badge variant={progress.phase === 'classifying' ? 'default' : 'outline'}>
            Classificando
          </Badge>
          <ArrowRight className="h-4 w-4" />
          <Badge variant={progress.phase === 'saving' ? 'default' : 'outline'}>
            Salvando
          </Badge>
          <ArrowRight className="h-4 w-4" />
          <Badge variant={progress.phase === 'complete' ? 'default' : 'outline'}>
            Completo
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}

export default function ClassificadorProdutos() {
  const queryClient = useQueryClient();
  const [etapa, setEtapa] = useState<Etapa>('upload');
  const [arquivoNome, setArquivoNome] = useState('');
  const [arquivoOriginal, setArquivoOriginal] = useState<File | null>(null);
  const [dadosPlanilha, setDadosPlanilha] = useState<Record<string, unknown>[]>([]);
  const [colunas, setColunas] = useState<string[]>([]);
  const [mapeamento, setMapeamento] = useState<MapeamentoColunas>({ nome: '', codigo: '', preco: '', custo: '', estoque: '', cor: '', tamanho: '' });
  const [produtosClassificados, setProdutosClassificados] = useState<ProdutoClassificado[]>([]);
  const [sessaoId, setSessaoId] = useState<number | null>(null);
  const [saveProgress, setSaveProgress] = useState<{ percent: number; saved: number; total: number } | null>(null);

  // Hooks otimizados para grandes arquivos
  const spreadsheetParser = useLargeSpreadsheetParser({
    onComplete: (result) => {
      setDadosPlanilha(result.data);
      setColunas(result.columns);
      setArquivoNome(result.fileName);
      setArquivoOriginal(result.file);
      
      // Auto-detectar mapeamento
      const detected = spreadsheetParser.autoDetectColumns(result.columns);
      setMapeamento({
        nome: detected.nome,
        codigo: detected.codigo,
        preco: detected.preco,
        custo: detected.custo,
        estoque: detected.estoque,
        cor: detected.cor,
        tamanho: detected.tamanho,
      });
      
      setEtapa('mapeamento');
      toast.success(`${result.data.length.toLocaleString('pt-BR')} produtos encontrados`);
    },
    onError: (error) => {
      toast.error(`Erro ao ler arquivo: ${error.message}`);
    }
  });

  const classificadorWorker = useClassificadorWorker({
    batchSize: 500, // Processa 500 por vez
    dbBatchSize: 100, // Salva 100 por vez no banco
    onComplete: async (stats) => {
      // Atualiza estatísticas da sessão
      if (sessaoId) {
        await supabase
          .from('sessoes_importacao')
          .update({
            classificados: stats.classificados,
            confianca_media: stats.confiancaMedia,
          })
          .eq('id', sessaoId);
      }

      queryClient.invalidateQueries({ queryKey: ['sessoes-importacao'] });
      queryClient.invalidateQueries({ queryKey: ['produtos'] });

      setEtapa('resultado');
      toast.success(`${stats.classificados.toLocaleString('pt-BR')} de ${stats.total.toLocaleString('pt-BR')} produtos classificados!`);
    },
    onError: (error) => {
      toast.error(`Erro durante classificação: ${error.message}`);
    }
  });

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

  // Processar arquivo com hook otimizado
  const processarArquivo = useCallback((file: File) => {
    spreadsheetParser.parseFile(file);
  }, [spreadsheetParser]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (files) => files[0] && processarArquivo(files[0]),
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
      'text/csv': ['.csv'],
    },
    multiple: false,
  });

  // Executar classificação otimizada
  const executarClassificacao = async () => {
    if (!mapeamento.nome) {
      toast.error('Selecione a coluna de nome do produto');
      return;
    }

    setEtapa('classificacao');
    setSaveProgress(null);

    try {
      // Upload do arquivo original para o storage
      let arquivoStoragePath: string | null = null;
      if (arquivoOriginal) {
        const timestamp = Date.now();
        const fileName = `${timestamp}_${arquivoNome}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('planilhas-importacao')
          .upload(fileName, arquivoOriginal);
        
        if (uploadError) {
          console.warn('Não foi possível salvar o arquivo original:', uploadError);
        } else {
          arquivoStoragePath = uploadData.path;
        }
      }

      // Criar sessão de importação
      const { data: sessao, error: sessaoError } = await supabase
        .from('sessoes_importacao')
        .insert([{
          nome: arquivoNome.replace(/\.[^/.]+$/, ''),
          nome_arquivo: arquivoNome,
          total_produtos: dadosPlanilha.length,
          mapeamento_colunas: JSON.parse(JSON.stringify(mapeamento)),
          arquivo_storage_path: arquivoStoragePath,
          arquivo_mime_type: arquivoOriginal?.type || null,
          arquivo_tamanho_bytes: arquivoOriginal?.size || null,
        }])
        .select()
        .single();

      if (sessaoError) throw sessaoError;
      setSessaoId(sessao.id);

      // Preparar produtos para classificação
      const produtos: ProdutoImportado[] = dadosPlanilha.map(row => ({
        nome: String(row[mapeamento.nome] || ''),
        codigo: mapeamento.codigo ? String(row[mapeamento.codigo] || '') : undefined,
        preco: mapeamento.preco ? Number(row[mapeamento.preco]) || 0 : undefined,
        custo: mapeamento.custo ? Number(row[mapeamento.custo]) || 0 : undefined,
        estoque: mapeamento.estoque ? Number(row[mapeamento.estoque]) || 0 : undefined,
        cor: mapeamento.cor ? String(row[mapeamento.cor] || '') : undefined,
        tamanho: mapeamento.tamanho ? String(row[mapeamento.tamanho] || '') : undefined,
      }));

      // Executar classificação com worker
      const resultados = await classificadorWorker.classificar(produtos, regras, atributos);
      
      if (resultados.length === 0) {
        toast.warning('Classificação cancelada');
        setEtapa('mapeamento');
        return;
      }

      setProdutosClassificados(resultados);

      // Salvar no banco em lotes otimizados
      const DB_BATCH_SIZE = 100;
      const totalBatches = Math.ceil(resultados.length / DB_BATCH_SIZE);
      let savedCount = 0;

      setSaveProgress({ percent: 0, saved: 0, total: resultados.length });

      for (let i = 0; i < resultados.length; i += DB_BATCH_SIZE) {
        const batch = resultados.slice(i, i + DB_BATCH_SIZE);
        
        const produtosParaSalvar = batch.map(({ produto, resultado }) => ({
          nome: produto.nome,
          nome_original: produto.nome,
          codigo: produto.codigo || null,
          preco_centavos: produto.preco ? Math.round(produto.preco * 100) : 0,
          custo_unitario_centavos: produto.custo ? Math.round(produto.custo * 100) : 0,
          valor_venda_centavos: produto.preco ? Math.round(produto.preco * 100) : 0,
          estoque: produto.estoque || 0,
          variacao_1: produto.cor || resultado.cor || null,
          variacao_2: produto.tamanho || resultado.tamanho || null,
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

        const { error } = await supabase.from('produtos').insert(produtosParaSalvar);
        if (error) console.error('Erro ao salvar batch:', error);

        savedCount += batch.length;
        setSaveProgress({
          percent: Math.round((savedCount / resultados.length) * 100),
          saved: savedCount,
          total: resultados.length
        });

        // Yield para UI
        await new Promise(r => setTimeout(r, 0));
      }

      setSaveProgress({ percent: 100, saved: resultados.length, total: resultados.length });

    } catch (err) {
      console.error(err);
      toast.error('Erro durante classificação');
      setEtapa('mapeamento');
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
    setArquivoOriginal(null);
    setDadosPlanilha([]);
    setColunas([]);
    setMapeamento({ nome: '', codigo: '', preco: '', custo: '', estoque: '', cor: '', tamanho: '' });
    setProdutosClassificados([]);
    setSessaoId(null);
    setSaveProgress(null);
    spreadsheetParser.reset();
    classificadorWorker.reset();
  };

  const cancelarProcessamento = () => {
    classificadorWorker.cancelar();
    spreadsheetParser.cancel();
    setEtapa('mapeamento');
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
            <Badge variant="outline" className="ml-2">
              <Zap className="h-3 w-3 mr-1" />
              Otimizado para 50k+ linhas
            </Badge>
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
                Suporta .xlsx, .xls e .csv • Otimizado para arquivos grandes (50k+ linhas)
              </p>
            </div>

            {/* Progress de parsing */}
            {spreadsheetParser.isParsing && (
              <div className="mt-4 space-y-2">
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm">{spreadsheetParser.progress.message}</span>
                </div>
                <Progress value={spreadsheetParser.progress.percent} />
              </div>
            )}

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
              {arquivoNome} • {dadosPlanilha.length.toLocaleString('pt-BR')} produtos encontrados
              {dadosPlanilha.length > 10000 && (
                <Badge variant="secondary" className="ml-2">
                  <AlertCircle className="h-3 w-3 mr-1" />
                  Arquivo grande - processamento otimizado
                </Badge>
              )}
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

            <div className="flex gap-2 justify-between">
              <Button variant="outline" onClick={() => setEtapa('upload')}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Voltar
              </Button>
              <div className="flex gap-2">
                <Button variant="ghost" onClick={resetar}>Cancelar</Button>
                <Button onClick={executarClassificacao}>
                  <Play className="h-4 w-4 mr-2" />
                  Classificar {dadosPlanilha.length.toLocaleString('pt-BR')} Produtos
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Etapa 3: Classificando (UI otimizada) */}
      {etapa === 'classificacao' && classificadorWorker.isProcessing && (
        <ProgressoDetalhado 
          progress={classificadorWorker.progress}
          parseProgress={spreadsheetParser.progress.phase !== 'idle' ? spreadsheetParser.progress : undefined}
          saveProgress={saveProgress || undefined}
          onCancel={cancelarProcessamento}
        />
      )}

      {/* Etapa 4: Resultado */}
      {etapa === 'resultado' && (
        <>
          {/* Stats */}
          <div className="grid gap-4 sm:grid-cols-4">
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">{stats.total.toLocaleString('pt-BR')}</div>
                <p className="text-sm text-muted-foreground">Total de produtos</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-primary">{stats.classificados.toLocaleString('pt-BR')}</div>
                <p className="text-sm text-muted-foreground">Classificados</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-accent-foreground">{stats.altaConfianca.toLocaleString('pt-BR')}</div>
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
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" onClick={() => setEtapa('mapeamento')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar ao Mapeamento
            </Button>
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
                  <TabsTrigger value="todos">Todos ({stats.total.toLocaleString('pt-BR')})</TabsTrigger>
                  <TabsTrigger value="alta">Alta Confiança ({stats.altaConfianca.toLocaleString('pt-BR')})</TabsTrigger>
                  <TabsTrigger value="baixa">Baixa Confiança ({(stats.total - stats.altaConfianca).toLocaleString('pt-BR')})</TabsTrigger>
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

// Componente de tabela reutilizável com virtualização implícita (mostra apenas 100)
function TabelaProdutos({ produtos }: { produtos: ProdutoClassificado[] }) {
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 100;
  
  const totalPages = Math.ceil(produtos.length / PAGE_SIZE);
  const paginatedProdutos = produtos.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  if (produtos.length === 0) {
    return <p className="text-center text-muted-foreground py-8">Nenhum produto nesta categoria</p>;
  }

  return (
    <div className="space-y-4">
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
            {paginatedProdutos.map(({ produto, resultado }, idx) => (
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
      </div>
      
      {/* Paginação */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Mostrando {(page * PAGE_SIZE + 1).toLocaleString('pt-BR')} - {Math.min((page + 1) * PAGE_SIZE, produtos.length).toLocaleString('pt-BR')} de {produtos.length.toLocaleString('pt-BR')} produtos
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <span className="flex items-center px-3 text-sm">
              Página {page + 1} de {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
            >
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
