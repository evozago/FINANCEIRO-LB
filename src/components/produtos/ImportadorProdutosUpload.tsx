/**
 * Componente de Upload para Importador de Produtos
 * Suporta múltiplos arquivos XLSX, XLS, CSV e XML
 */
import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { FileSpreadsheet, Upload, FileCode2, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

export interface ArquivoImportacao {
  file: File;
  nome: string;
  tamanho: number;
  tipo: 'xlsx' | 'xls' | 'csv' | 'xml';
  status: 'pending' | 'parsing' | 'done' | 'error';
  linhas?: number;
  erro?: string;
}

interface ImportadorProdutosUploadProps {
  arquivos: ArquivoImportacao[];
  onAddFiles: (files: File[]) => void;
  onRemoveFile: (index: number) => void;
  isParsing: boolean;
  parseProgress?: { percent: number; message: string };
}

export function ImportadorProdutosUpload({
  arquivos,
  onAddFiles,
  onRemoveFile,
  isParsing,
  parseProgress,
}: ImportadorProdutosUploadProps) {
  const onDrop = useCallback((acceptedFiles: File[]) => {
    onAddFiles(acceptedFiles);
  }, [onAddFiles]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
      'text/csv': ['.csv'],
      'text/xml': ['.xml'],
      'application/xml': ['.xml'],
    },
    multiple: true,
    disabled: isParsing,
  });

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getTipoIcon = (tipo: ArquivoImportacao['tipo']) => {
    if (tipo === 'xml') return <FileCode2 className="h-4 w-4" />;
    return <FileSpreadsheet className="h-4 w-4" />;
  };

  const getTipoBadge = (tipo: ArquivoImportacao['tipo']) => {
    const colors: Record<ArquivoImportacao['tipo'], string> = {
      xlsx: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
      xls: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
      csv: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
      xml: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
    };
    return <Badge className={colors[tipo]}>{tipo.toUpperCase()}</Badge>;
  };

  const totalLinhas = arquivos.reduce((acc, a) => acc + (a.linhas || 0), 0);
  const totalTamanho = arquivos.reduce((acc, a) => acc + a.tamanho, 0);

  return (
    <div className="space-y-4">
      {/* Dropzone */}
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
          isDragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50'
        } ${isParsing ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <input {...getInputProps()} />
        <Upload className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
        <p className="text-lg font-medium mb-1">
          {isDragActive ? 'Solte os arquivos aqui' : 'Arraste planilhas ou clique para selecionar'}
        </p>
        <p className="text-sm text-muted-foreground">
          Suporta .xlsx, .xls, .csv e .xml • Múltiplos arquivos • Até 100MB por arquivo
        </p>
      </div>

      {/* Progress de parsing */}
      {isParsing && parseProgress && (
        <div className="space-y-2 p-4 bg-muted/50 rounded-lg">
          <div className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm font-medium">{parseProgress.message}</span>
          </div>
          <Progress value={parseProgress.percent} />
        </div>
      )}

      {/* Lista de arquivos */}
      {arquivos.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>{arquivos.length} arquivo(s)</span>
            <span>{totalLinhas > 0 ? `${totalLinhas.toLocaleString('pt-BR')} linhas • ` : ''}{formatFileSize(totalTamanho)}</span>
          </div>

          <div className="divide-y rounded-lg border">
            {arquivos.map((arquivo, idx) => (
              <div key={idx} className="flex items-center gap-3 p-3">
                <div className="flex-shrink-0 text-muted-foreground">
                  {getTipoIcon(arquivo.tipo)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{arquivo.nome}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{formatFileSize(arquivo.tamanho)}</span>
                    {arquivo.linhas !== undefined && (
                      <span>• {arquivo.linhas.toLocaleString('pt-BR')} linhas</span>
                    )}
                    {arquivo.erro && (
                      <span className="text-destructive">{arquivo.erro}</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {getTipoBadge(arquivo.tipo)}
                  {arquivo.status === 'parsing' && <Loader2 className="h-4 w-4 animate-spin" />}
                  {arquivo.status === 'done' && <Badge variant="secondary">✓</Badge>}
                  {arquivo.status === 'error' && <Badge variant="destructive">Erro</Badge>}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => onRemoveFile(idx)}
                    disabled={isParsing}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
