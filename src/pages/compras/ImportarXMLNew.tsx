/**
 * Página de importação de XML para contas a pagar
 * Versão melhorada com drag-and-drop e interface robusta
 */

import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileText, AlertCircle, CheckCircle, X, Download, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { useXMLImport } from '@/hooks/useXMLImportSimple';

interface ProcessResult {
  success: boolean;
  message: string;
  fileName: string;
  contaId?: number;
  fornecedorId?: number;
  fornecedorCriado?: boolean;
}

export default function ImportarXMLNew() {
  const [files, setFiles] = useState<File[]>([]);
  const [results, setResults] = useState<ProcessResult[]>([]);
  const [showResults, setShowResults] = useState(false);
  const { importFiles, processing, progress } = useXMLImport();

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setFiles(prev => [...prev, ...acceptedFiles]);
    setResults([]);
    setShowResults(false);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 
      'application/xml': ['.xml'], 
      'text/xml': ['.xml'] 
    },
    multiple: true,
    disabled: processing,
  });

  const removeFile = (index: number) => {
    setFiles(files.filter((_, i) => i !== index));
  };

  const handleImport = async () => {
    if (files.length === 0) return;

    try {
      const processResults = await importFiles(files);
      setResults(processResults as any);
      setShowResults(true);
    } catch (error) {
      console.error('Erro na importação:', error);
    }
  };

  const clearAll = () => {
    setFiles([]);
    setResults([]);
    setShowResults(false);
  };

  const formatCurrency = (centavos: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(centavos / 100);
  };

  const getFileIcon = (fileName: string) => {
    return <FileText className="h-8 w-8 text-blue-500" />;
  };

  const successCount = results.filter(r => r.success).length;
  const errorCount = results.filter(r => !r.success).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Importar XML</h1>
        <p className="text-muted-foreground">
          Importe notas fiscais XML para criar contas a pagar automaticamente
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Área de Upload */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Selecionar Arquivos XML
            </CardTitle>
            <CardDescription>
              Selecione um ou mais arquivos XML de notas fiscais para importação
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Dropzone */}
            <div
              {...getRootProps()}
              className={cn(
                'border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors',
                isDragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25',
                processing && 'pointer-events-none opacity-50'
              )}
            >
              <input {...getInputProps()} />
              
              <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              
              {isDragActive ? (
                <p className="text-primary font-medium">
                  Solte os arquivos aqui...
                </p>
              ) : (
                <div className="space-y-2">
                  <p className="font-medium">
                    Clique ou arraste arquivos aqui
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Suporte para múltiplos arquivos .xml
                  </p>
                </div>
              )}
            </div>

            {/* Arquivos selecionados */}
            {files.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">Arquivos Selecionados ({files.length}):</h4>
                  <Button variant="outline" size="sm" onClick={clearAll}>
                    <X className="h-4 w-4 mr-2" />
                    Limpar
                  </Button>
                </div>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {files.map((file, index) => (
                    <div key={index} className="flex items-center gap-3 p-2 bg-muted/50 rounded">
                      {getFileIcon(file.name)}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{file.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {(file.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                      <Badge variant="outline">XML</Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFile(index)}
                        disabled={processing}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Progresso do upload */}
            {processing && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Processando...</span>
                  <span className="text-sm text-muted-foreground">{Math.round(progress)}%</span>
                </div>
                <Progress value={progress} />
              </div>
            )}

            {/* Botões de ação */}
            <div className="flex gap-2">
              <Button 
                onClick={handleImport} 
                disabled={files.length === 0 || processing}
                className="flex-1"
              >
                {processing ? 'Importando...' : `Importar ${files.length} arquivo${files.length > 1 ? 's' : ''}`}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Como Funciona */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Info className="h-5 w-5" />
              Como Funciona
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-medium mb-2">📄 Dados Extraídos do XML:</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Número da nota fiscal</li>
                <li>• CNPJ e razão social do emissor</li>
                <li>• Chave de acesso da NFe</li>
                <li>• Valor total da nota</li>
                <li>• Data de emissão</li>
                <li>• Parcelas e vencimentos (se disponíveis)</li>
              </ul>
            </div>

            <div>
              <h4 className="font-medium mb-2">⚙️ Processamento Automático:</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Verifica duplicatas por número e chave</li>
                <li>• Cria fornecedor automaticamente se necessário</li>
                <li>• Gera conta a pagar com todas as parcelas</li>
                <li>• Vincula com o fornecedor correspondente</li>
              </ul>
            </div>

            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Importante:</strong> O sistema detecta automaticamente notas já importadas 
                para evitar duplicações.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>

      {/* Modal de Resultados */}
      <Dialog open={showResults} onOpenChange={setShowResults}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              Resultado da Importação
            </DialogTitle>
            <DialogDescription>
              {successCount > 0 && errorCount === 0 && 
                `✅ Todos os ${successCount} arquivo${successCount > 1 ? 's foram importados' : ' foi importado'} com sucesso!`
              }
              {successCount > 0 && errorCount > 0 && 
                `⚠️ ${successCount} arquivo${successCount > 1 ? 's importados' : ' importado'} com sucesso, ${errorCount} com erro${errorCount > 1 ? 's' : ''}.`
              }
              {successCount === 0 && errorCount > 0 && 
                `❌ Nenhum arquivo foi importado. ${errorCount} erro${errorCount > 1 ? 's encontrados' : ' encontrado'}.`
              }
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 max-h-96 overflow-y-auto">
            {results.map((result, index) => (
              <div key={index} className={cn(
                "flex items-start gap-3 p-3 rounded-lg border",
                result.success ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"
              )}>
                {result.success ? (
                  <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{result.fileName}</p>
                  <p className="text-sm text-muted-foreground">{result.message}</p>
                  {result.fornecedorCriado && (
                    <p className="text-xs text-blue-600 mt-1">
                      ✨ Novo fornecedor criado automaticamente
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-end">
            <Button onClick={() => setShowResults(false)}>
              Fechar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
