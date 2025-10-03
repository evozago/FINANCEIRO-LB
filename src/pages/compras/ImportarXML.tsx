// Página de importação de notas fiscais em formato XML.
// Usa o hook `useXMLImport` para processar múltiplos arquivos e apresentar os resultados
// ao usuário. Permite selecionar arquivos, acompanha progresso e mostra um resumo ao final.

import { useState, useRef } from 'react';
import { Upload, FileText, CheckCircle, AlertCircle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useXMLImport } from '@/hooks/useXMLImport';
import { useToast } from '@/hooks/use-toast';

interface ProcessResult {
  success: boolean;
  message: string;
  contaId?: number;
  fornecedorId?: number;
  fornecedorCriado?: boolean;
  fileName?: string;
}

export function ImportarXML() {
  const [files, setFiles] = useState<File[]>([]);
  const [results, setResults] = useState<ProcessResult[]>([]);
  const [showResults, setShowResults] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { importFiles, processing, progress } = useXMLImport();

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files || []);
    const xmlFiles = selectedFiles.filter((file) =>
      file.name.toLowerCase().endsWith('.xml') || file.type === 'text/xml' || file.type === 'application/xml'
    );
    if (xmlFiles.length !== selectedFiles.length) {
      toast({
        title: 'Aviso',
        description: 'Apenas arquivos XML são aceitos. Alguns arquivos foram ignorados.',
        variant: 'destructive',
      });
    }
    setFiles(xmlFiles);
    setResults([]);
    setShowResults(false);
  };

  const removeFile = (index: number) => {
    setFiles(files.filter((_, i) => i !== index));
  };

  const handleImport = async () => {
    if (files.length === 0) {
      toast({ title: 'Erro', description: 'Selecione pelo menos um arquivo XML.', variant: 'destructive' });
      return;
    }
    try {
      const processResults = await importFiles(files);
      setResults(processResults);
      setShowResults(true);
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive',
      });
    }
  };

  const formatCurrency = (centavos: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(centavos / 100);
  };

  return (
    <div className="space-y-6">
      {/* Cabeçalho da página */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Importar XML</h1>
        <p className="text-muted-foreground">Importe notas fiscais XML para criar contas a pagar automaticamente</p>
      </div>

      {/* Card de seleção de arquivos */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Upload className="h-5 w-5" />
            <span>Selecionar Arquivos XML</span>
          </CardTitle>
          <CardDescription>
            Selecione um ou mais arquivos XML de notas fiscais para importação
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-4">
            <Input
              ref={fileInputRef}
              type="file"
              accept=".xml,text/xml,application/xml"
              multiple
              onChange={handleFileSelect}
              className="hidden"
            />
            <Button onClick={() => fileInputRef.current?.click()} variant="outline" className="flex items-center space-x-2">
              <Upload className="h-4 w-4" />
              <span>Selecionar Arquivos</span>
            </Button>
            <span className="text-sm text-muted-foreground">{files.length} arquivo(s) selecionado(s)</span>
          </div>
          {files.length > 0 && (
            <div className="space-y-2">
              <Label>Arquivos Selecionados:</Label>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {files.map((file, index) => (
                  <div key={index} className="flex items-center justify-between p-2 border rounded">
                    <div className="flex items-center space-x-2">
                      <FileText className="h-4 w-4" />
                      <span className="text-sm">{file.name}</span>
                      <Badge variant="secondary" className="text-xs">
                        {(file.size / 1024).toFixed(1)} KB
                      </Badge>
                    </div>
                    <Button size="sm" variant="ghost" onClick={() => removeFile(index)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
          {processing && (
            <div className="space-y-2">
              <Label>Processando arquivos...</Label>
              <Progress value={progress} className="w-full" />
              <p className="text-sm text-muted-foreground">{progress.toFixed(0)}% concluído</p>
            </div>
          )}
          <div className="flex space-x-2">
            <Button onClick={handleImport} disabled={files.length === 0 || processing} className="flex items-center space-x-2">
              <Upload className="h-4 w-4" />
              <span>Importar XML</span>
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setFiles([]);
                setResults([]);
                setShowResults(false);
                if (fileInputRef.current) {
                  fileInputRef.current.value = '';
                }
              }}
              disabled={processing}
            >
              Limpar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Instruções */}
      <Card>
        <CardHeader>
          <CardTitle>Como Funciona</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Dados Extraídos do XML:</strong>
              <ul className="mt-2 space-y-1 text-sm">
                <li>• Número da nota fiscal</li>
                <li>• CNPJ e razão social do emissor</li>
                <li>• Valor total da nota</li>
                <li>• Data de emissão</li>
                <li>• Parcelas e vencimentos (se disponíveis)</li>
              </ul>
            </AlertDescription>
          </Alert>
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Processamento Automático:</strong>
              <ul className="mt-2 space-y-1 text-sm">
                <li>• Verifica se o fornecedor já existe pelo CNPJ</li>
                <li>• Cria novo fornecedor automaticamente se necessário</li>
                <li>• Gera conta a pagar com todas as parcelas</li>
                <li>• Vincula com o fornecedor correspondente</li>
              </ul>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Resultados da importação */}
      <Dialog open={showResults} onOpenChange={setShowResults}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Resultados da Importação</DialogTitle>
            <DialogDescription>Resumo do processamento dos arquivos XML</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="text-2xl font-bold text-green-600">{results.filter((r) => r.success).length}</div>
                  <p className="text-sm text-muted-foreground">Sucessos</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="text-2xl font-bold text-red-600">{results.filter((r) => !r.success).length}</div>
                  <p className="text-sm text-muted-foreground">Erros</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="text-2xl font-bold text-blue-600">{results.filter((r) => r.fornecedorCriado).length}</div>
                  <p className="text-sm text-muted-foreground">Fornecedores Criados</p>
                </CardContent>
              </Card>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Status</TableHead>
                  <TableHead>Mensagem</TableHead>
                  <TableHead>Conta ID</TableHead>
                  <TableHead>Fornecedor</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {results.map((result, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      {result.success ? (
                        <Badge className="bg-green-100 text-green-800">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Sucesso
                        </Badge>
                      ) : (
                        <Badge variant="destructive">
                          <AlertCircle className="h-3 w-3 mr-1" />
                          Erro
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="max-w-md">
                      <div className="truncate" title={result.message}>{result.message}</div>
                    </TableCell>
                    <TableCell>
                      {result.contaId && <Badge variant="outline">#{result.contaId}</Badge>}
                    </TableCell>
                    <TableCell>
                      {result.fornecedorId && (
                        <div className="flex items-center space-x-1">
                          <Badge variant="outline">#{result.fornecedorId}</Badge>
                          {result.fornecedorCriado && (
                            <Badge className="bg-blue-100 text-blue-800 text-xs">Novo</Badge>
                          )}
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
