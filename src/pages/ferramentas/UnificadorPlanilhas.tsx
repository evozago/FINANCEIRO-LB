import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import * as XLSX from 'xlsx';
import { 
  FileSpreadsheet, 
  Upload, 
  Trash2, 
  Download, 
  Merge, 
  CheckCircle2,
  AlertCircle,
  Loader2,
  FileUp,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface UploadedFile {
  id: string;
  file: File;
  name: string;
  size: number;
  rows: number;
  columns: string[];
  data: Record<string, unknown>[];
  status: 'pending' | 'parsed' | 'error';
  error?: string;
}

interface MergeProgress {
  phase: 'idle' | 'parsing' | 'merging' | 'generating' | 'complete';
  percent: number;
  message: string;
}

export default function UnificadorPlanilhas() {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [progress, setProgress] = useState<MergeProgress>({ phase: 'idle', percent: 0, message: '' });
  const [mergedData, setMergedData] = useState<Record<string, unknown>[] | null>(null);
  const [mergedColumns, setMergedColumns] = useState<string[]>([]);
  const [outputFormat, setOutputFormat] = useState<'xlsx' | 'csv'>('xlsx');

  const parseFile = async (file: File): Promise<Omit<UploadedFile, 'id' | 'file' | 'status'>> => {
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, {
      type: 'array',
      cellDates: true,
      dense: true,
    });
    
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, {
      defval: '',
      raw: true,
    });

    if (jsonData.length === 0) {
      throw new Error('Planilha vazia');
    }

    const columns = Object.keys(jsonData[0]);

    return {
      name: file.name,
      size: file.size,
      rows: jsonData.length,
      columns,
      data: jsonData,
    };
  };

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const newFiles: UploadedFile[] = [];

    for (const file of acceptedFiles) {
      const id = `${file.name}-${Date.now()}-${Math.random()}`;
      
      try {
        setProgress({ phase: 'parsing', percent: 0, message: `Lendo ${file.name}...` });
        
        const parsed = await parseFile(file);
        newFiles.push({
          id,
          file,
          ...parsed,
          status: 'parsed',
        });
      } catch (error) {
        newFiles.push({
          id,
          file,
          name: file.name,
          size: file.size,
          rows: 0,
          columns: [],
          data: [],
          status: 'error',
          error: error instanceof Error ? error.message : 'Erro ao ler arquivo',
        });
      }
    }

    setFiles(prev => [...prev, ...newFiles]);
    setProgress({ phase: 'idle', percent: 0, message: '' });
    setMergedData(null);

    const successCount = newFiles.filter(f => f.status === 'parsed').length;
    if (successCount > 0) {
      toast.success(`${successCount} arquivo(s) carregado(s) com sucesso`);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
      'text/csv': ['.csv'],
    },
    maxSize: 100 * 1024 * 1024, // 100MB
  });

  const removeFile = (id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id));
    setMergedData(null);
  };

  const clearAll = () => {
    setFiles([]);
    setMergedData(null);
    setMergedColumns([]);
  };

  const mergePlanilhas = async () => {
    const validFiles = files.filter(f => f.status === 'parsed');
    
    if (validFiles.length < 2) {
      toast.error('Adicione pelo menos 2 planilhas para unificar');
      return;
    }

    setProgress({ phase: 'merging', percent: 0, message: 'Unificando planilhas...' });

    try {
      // Use first file's columns as master
      const masterColumns = validFiles[0].columns;
      const allData: Record<string, unknown>[] = [];

      for (let i = 0; i < validFiles.length; i++) {
        const file = validFiles[i];
        const percent = Math.round(((i + 1) / validFiles.length) * 100);
        
        setProgress({ 
          phase: 'merging', 
          percent, 
          message: `Processando ${file.name} (${i + 1}/${validFiles.length})...` 
        });

        // Map data to master columns structure
        for (const row of file.data) {
          const mappedRow: Record<string, unknown> = {};
          
          for (const col of masterColumns) {
            // Try to find matching column (case-insensitive)
            const matchingKey = Object.keys(row).find(
              k => k.toLowerCase().trim() === col.toLowerCase().trim()
            );
            mappedRow[col] = matchingKey ? row[matchingKey] : '';
          }
          
          allData.push(mappedRow);
        }

        // Small delay for UI responsiveness
        await new Promise(resolve => setTimeout(resolve, 0));
      }

      setMergedColumns(masterColumns);
      setMergedData(allData);
      setProgress({ phase: 'complete', percent: 100, message: `${allData.length.toLocaleString('pt-BR')} linhas unificadas` });
      
      toast.success(`Planilhas unificadas! Total: ${allData.length.toLocaleString('pt-BR')} linhas`);
    } catch (error) {
      setProgress({ phase: 'idle', percent: 0, message: '' });
      toast.error('Erro ao unificar planilhas');
    }
  };

  const downloadMerged = () => {
    if (!mergedData || mergedData.length === 0) return;

    setProgress({ phase: 'generating', percent: 50, message: 'Gerando arquivo...' });

    try {
      const worksheet = XLSX.utils.json_to_sheet(mergedData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Unificado');

      const fileName = `planilha_unificada_${new Date().toISOString().split('T')[0]}.${outputFormat}`;
      
      if (outputFormat === 'csv') {
        XLSX.writeFile(workbook, fileName, { bookType: 'csv' });
      } else {
        XLSX.writeFile(workbook, fileName, { bookType: 'xlsx' });
      }

      setProgress({ phase: 'complete', percent: 100, message: 'Download concluído!' });
      toast.success('Arquivo baixado com sucesso!');
    } catch (error) {
      toast.error('Erro ao gerar arquivo');
      setProgress({ phase: 'idle', percent: 0, message: '' });
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const totalRows = files.filter(f => f.status === 'parsed').reduce((acc, f) => acc + f.rows, 0);
  const totalSize = files.reduce((acc, f) => acc + f.size, 0);
  const validFilesCount = files.filter(f => f.status === 'parsed').length;

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-gradient-to-br from-teal-500 to-teal-600 rounded-lg shadow-lg">
            <FileSpreadsheet className="h-6 w-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold">Unificador de Planilhas</h1>
        </div>
        <p className="text-muted-foreground">
          Faça upload de múltiplas planilhas (XLSX, CSV) e unifique-as em um único arquivo
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Upload Area */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Upload de Arquivos
            </CardTitle>
            <CardDescription>
              Arraste planilhas ou clique para selecionar (máx. 100MB por arquivo)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div
              {...getRootProps()}
              className={`
                border-2 border-dashed rounded-xl p-8 text-center cursor-pointer
                transition-all duration-200
                ${isDragActive 
                  ? 'border-primary bg-primary/5 scale-[1.02]' 
                  : 'border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50'
                }
              `}
            >
              <input {...getInputProps()} />
              <FileUp className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              {isDragActive ? (
                <p className="text-primary font-medium">Solte os arquivos aqui...</p>
              ) : (
                <>
                  <p className="font-medium mb-1">Arraste arquivos aqui ou clique para selecionar</p>
                  <p className="text-sm text-muted-foreground">
                    Suporta .xlsx, .xls e .csv
                  </p>
                </>
              )}
            </div>

            {/* Files List */}
            {files.length > 0 && (
              <div className="mt-6 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium">Arquivos ({files.length})</h3>
                  <Button variant="ghost" size="sm" onClick={clearAll}>
                    <Trash2 className="h-4 w-4 mr-1" />
                    Limpar tudo
                  </Button>
                </div>

                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  {files.map((file) => (
                    <div 
                      key={file.id}
                      className={`
                        flex items-center gap-3 p-3 rounded-lg border
                        ${file.status === 'error' ? 'bg-destructive/5 border-destructive/30' : 'bg-muted/30'}
                      `}
                    >
                      <FileSpreadsheet className={`h-8 w-8 ${file.status === 'error' ? 'text-destructive' : 'text-teal-500'}`} />
                      
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{file.name}</p>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <span>{formatFileSize(file.size)}</span>
                          {file.status === 'parsed' && (
                            <>
                              <span>•</span>
                              <span>{file.rows.toLocaleString('pt-BR')} linhas</span>
                              <span>•</span>
                              <span>{file.columns.length} colunas</span>
                            </>
                          )}
                        </div>
                      </div>

                      {file.status === 'parsed' && (
                        <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
                      )}
                      {file.status === 'error' && (
                        <Badge variant="destructive" className="flex-shrink-0">
                          <AlertCircle className="h-3 w-3 mr-1" />
                          Erro
                        </Badge>
                      )}

                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeFile(file.id)}
                        className="flex-shrink-0"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Stats & Actions */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Resumo</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-3 bg-muted/50 rounded-lg">
                  <p className="text-2xl font-bold text-teal-600">{validFilesCount}</p>
                  <p className="text-xs text-muted-foreground">Arquivos válidos</p>
                </div>
                <div className="text-center p-3 bg-muted/50 rounded-lg">
                  <p className="text-2xl font-bold text-blue-600">{totalRows.toLocaleString('pt-BR')}</p>
                  <p className="text-xs text-muted-foreground">Total de linhas</p>
                </div>
              </div>

              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <p className="text-lg font-bold">{formatFileSize(totalSize)}</p>
                <p className="text-xs text-muted-foreground">Tamanho total</p>
              </div>

              {progress.phase !== 'idle' && (
                <div className="space-y-2">
                  <Progress value={progress.percent} className="h-2" />
                  <p className="text-sm text-center text-muted-foreground">
                    {progress.message}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Ações</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button 
                className="w-full" 
                onClick={mergePlanilhas}
                disabled={validFilesCount < 2 || progress.phase === 'merging'}
              >
                {progress.phase === 'merging' ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Merge className="h-4 w-4 mr-2" />
                )}
                Unificar Planilhas
              </Button>

              {mergedData && (
                <>
                  <div className="flex gap-2">
                    <Select value={outputFormat} onValueChange={(v) => setOutputFormat(v as 'xlsx' | 'csv')}>
                      <SelectTrigger className="w-24">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="xlsx">XLSX</SelectItem>
                        <SelectItem value="csv">CSV</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button 
                      variant="outline" 
                      className="flex-1"
                      onClick={downloadMerged}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Baixar
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Preview */}
      {mergedData && mergedData.length > 0 && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              Prévia do Resultado
            </CardTitle>
            <CardDescription>
              {mergedData.length.toLocaleString('pt-BR')} linhas • {mergedColumns.length} colunas
              (mostrando primeiras 100 linhas)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12 text-center">#</TableHead>
                    {mergedColumns.slice(0, 8).map((col) => (
                      <TableHead key={col} className="min-w-[120px]">
                        {col}
                      </TableHead>
                    ))}
                    {mergedColumns.length > 8 && (
                      <TableHead className="text-muted-foreground">
                        +{mergedColumns.length - 8} colunas
                      </TableHead>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mergedData.slice(0, 100).map((row, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="text-center text-muted-foreground text-xs">
                        {idx + 1}
                      </TableCell>
                      {mergedColumns.slice(0, 8).map((col) => (
                        <TableCell key={col} className="max-w-[200px] truncate">
                          {String(row[col] ?? '')}
                        </TableCell>
                      ))}
                      {mergedColumns.length > 8 && (
                        <TableCell className="text-muted-foreground text-xs">...</TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
