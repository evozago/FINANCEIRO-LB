import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Download, Upload, FileJson, CheckCircle, XCircle, AlertCircle, Loader2, FileDown, FileUp, X } from 'lucide-react';
import { format } from 'date-fns';

interface ExportImportFinanceiroProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete?: () => void;
}

interface ExportOptions {
  contas_pagar: boolean;
  parcelas: boolean;
  contas_bancarias: boolean;
  recorrencias: boolean;
  categorias: boolean;
  filiais: boolean;
  fornecedores_pj: boolean;
  fornecedores_pf: boolean;
  formas_pagamento: boolean;
}

interface ImportResult {
  tabela: string;
  total: number;
  inseridos: number;
  atualizados: number;
  erros: number;
  detalhes: string[];
}

interface FinanceiroExportData {
  versao: string;
  exportado_em: string;
  categorias_financeiras?: any[];
  filiais?: any[];
  pessoas_juridicas?: any[];
  pessoas_fisicas?: any[];
  contas_bancarias?: any[];
  formas_pagamento?: any[];
  recorrencias?: any[];
  contas_pagar?: any[];
  contas_pagar_parcelas?: any[];
}

export function ExportImportFinanceiro({ isOpen, onClose, onComplete }: ExportImportFinanceiroProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<'export' | 'import'>('export');
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [importProgress, setImportProgress] = useState(0);
  const [importResults, setImportResults] = useState<ImportResult[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<FinanceiroExportData | null>(null);

  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    contas_pagar: true,
    parcelas: true,
    contas_bancarias: true,
    recorrencias: true,
    categorias: true,
    filiais: true,
    fornecedores_pj: true,
    fornecedores_pf: true,
    formas_pagamento: true,
  });

  const toggleOption = (key: keyof ExportOptions) => {
    setExportOptions(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // ============= EXPORTAÇÃO =============
  const handleExport = async () => {
    setExporting(true);
    setExportProgress(0);

    try {
      const exportData: FinanceiroExportData = {
        versao: '1.0',
        exportado_em: new Date().toISOString(),
      };

      const totalSteps = Object.values(exportOptions).filter(Boolean).length;
      let currentStep = 0;

      // Categorias Financeiras
      if (exportOptions.categorias) {
        const { data } = await supabase.from('categorias_financeiras').select('*').order('id');
        exportData.categorias_financeiras = data || [];
        currentStep++;
        setExportProgress((currentStep / totalSteps) * 100);
      }

      // Filiais
      if (exportOptions.filiais) {
        const { data } = await supabase.from('filiais').select('*').order('id');
        exportData.filiais = data || [];
        currentStep++;
        setExportProgress((currentStep / totalSteps) * 100);
      }

      // Fornecedores PJ
      if (exportOptions.fornecedores_pj) {
        const { data } = await supabase.from('pessoas_juridicas').select('*').order('id');
        exportData.pessoas_juridicas = data || [];
        currentStep++;
        setExportProgress((currentStep / totalSteps) * 100);
      }

      // Fornecedores PF
      if (exportOptions.fornecedores_pf) {
        const { data } = await supabase.from('pessoas_fisicas').select('*').order('id');
        exportData.pessoas_fisicas = data || [];
        currentStep++;
        setExportProgress((currentStep / totalSteps) * 100);
      }

      // Contas Bancárias
      if (exportOptions.contas_bancarias) {
        const { data } = await supabase.from('contas_bancarias').select('*').order('id');
        exportData.contas_bancarias = data || [];
        currentStep++;
        setExportProgress((currentStep / totalSteps) * 100);
      }

      // Formas de Pagamento
      if (exportOptions.formas_pagamento) {
        const { data } = await supabase.from('formas_pagamento').select('*').order('id');
        exportData.formas_pagamento = data || [];
        currentStep++;
        setExportProgress((currentStep / totalSteps) * 100);
      }

      // Recorrências
      if (exportOptions.recorrencias) {
        const { data } = await supabase.from('recorrencias').select('*').order('id');
        exportData.recorrencias = data || [];
        currentStep++;
        setExportProgress((currentStep / totalSteps) * 100);
      }

      // Contas a Pagar
      if (exportOptions.contas_pagar) {
        const { data } = await supabase.from('contas_pagar').select('*').order('id');
        exportData.contas_pagar = data || [];
        currentStep++;
        setExportProgress((currentStep / totalSteps) * 100);
      }

      // Parcelas
      if (exportOptions.parcelas) {
        const { data } = await supabase.from('contas_pagar_parcelas').select('*').order('id');
        exportData.contas_pagar_parcelas = data || [];
        currentStep++;
        setExportProgress((currentStep / totalSteps) * 100);
      }

      // Gerar arquivo JSON
      const jsonString = JSON.stringify(exportData, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `financeiro_backup_${format(new Date(), 'yyyy-MM-dd_HH-mm')}.json`;
      a.click();
      URL.revokeObjectURL(url);

      toast({
        title: 'Exportação concluída!',
        description: `Arquivo gerado com sucesso.`,
      });

    } catch (error) {
      console.error('Erro na exportação:', error);
      toast({
        title: 'Erro na exportação',
        description: 'Ocorreu um erro ao exportar os dados.',
        variant: 'destructive',
      });
    } finally {
      setExporting(false);
      setExportProgress(100);
    }
  };

  // ============= IMPORTAÇÃO =============
  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.json')) {
      toast({
        title: 'Arquivo inválido',
        description: 'Por favor, selecione um arquivo JSON.',
        variant: 'destructive',
      });
      return;
    }

    setSelectedFile(file);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string) as FinanceiroExportData;
        setPreviewData(data);
      } catch (error) {
        toast({
          title: 'Arquivo inválido',
          description: 'Não foi possível ler o arquivo JSON.',
          variant: 'destructive',
        });
      }
    };
    reader.readAsText(file);
  }, [toast]);

  // Helper function para importar dados de uma tabela específica
  const importTableData = async (
    tableName: string,
    data: any[],
    uniqueField: string,
    label: string
  ): Promise<ImportResult> => {
    const result: ImportResult = {
      tabela: label,
      total: data.length,
      inseridos: 0,
      atualizados: 0,
      erros: 0,
      detalhes: [],
    };

    // Type assertion para contornar limitações de inferência do Supabase
    const table = supabase.from(tableName as any);

    for (const item of data) {
      try {
        // Remover campos que não devem ser inseridos diretamente
        const { created_at, updated_at, ...cleanItem } = item;
        
        // Verificar duplicidade baseado no campo único
        let existingRecord: { id: number } | null = null;
        
        if (uniqueField === 'chave_nfe' && cleanItem.chave_nfe) {
          const { data: existing } = await table
            .select('id')
            .eq('chave_nfe', cleanItem.chave_nfe)
            .maybeSingle();
          existingRecord = existing as unknown as { id: number } | null;
        } else if (uniqueField === 'cnpj' && cleanItem.cnpj) {
          const { data: existing } = await table
            .select('id')
            .eq('cnpj', cleanItem.cnpj)
            .maybeSingle();
          existingRecord = existing as unknown as { id: number } | null;
        } else if (uniqueField === 'cpf' && cleanItem.cpf) {
          const { data: existing } = await table
            .select('id')
            .eq('cpf', cleanItem.cpf)
            .maybeSingle();
          existingRecord = existing as unknown as { id: number } | null;
        } else if (uniqueField === 'nome' && cleanItem.nome) {
          const { data: existing } = await table
            .select('id')
            .eq('nome', cleanItem.nome)
            .maybeSingle();
          existingRecord = existing as unknown as { id: number } | null;
        } else if (uniqueField === 'id') {
          const { data: existing } = await table
            .select('id')
            .eq('id', cleanItem.id)
            .maybeSingle();
          existingRecord = existing as unknown as { id: number } | null;
        }

        if (existingRecord) {
          // Atualizar registro existente
          const { error: updateError } = await supabase
            .from(tableName as any)
            .update(cleanItem)
            .eq('id', existingRecord.id);
          
          if (updateError) {
            result.erros++;
            result.detalhes.push(`Erro ao atualizar ID ${cleanItem.id}: ${updateError.message}`);
          } else {
            result.atualizados++;
          }
        } else {
          // Inserir novo registro (sem o ID para deixar o banco gerar, exceto para algumas tabelas)
          let insertItem = cleanItem;
          
          // Para algumas tabelas, removemos o ID para deixar o banco gerar
          if (!['contas_pagar_parcelas', 'contas_pagar'].includes(tableName)) {
            const { id, ...withoutId } = cleanItem;
            insertItem = withoutId;
          }

          const { error: insertError } = await supabase
            .from(tableName as any)
            .insert(insertItem);
          
          if (insertError) {
            // Se o erro for de conflito, considerar como já existente
            if (insertError.message.includes('duplicate') || insertError.message.includes('unique')) {
              result.atualizados++;
              result.detalhes.push(`Registro já existe, pulando: ${JSON.stringify(cleanItem).slice(0, 50)}...`);
            } else {
              result.erros++;
              result.detalhes.push(`Erro ao inserir: ${insertError.message}`);
            }
          } else {
            result.inseridos++;
          }
        }
      } catch (itemError: any) {
        result.erros++;
        result.detalhes.push(`Erro inesperado: ${itemError.message}`);
      }
    }

    return result;
  };

  const handleImport = async () => {
    if (!previewData) return;

    setImporting(true);
    setImportProgress(0);
    setImportResults([]);

    const results: ImportResult[] = [];

    try {
      type TableConfig = {
        key: 'categorias_financeiras' | 'filiais' | 'pessoas_juridicas' | 'pessoas_fisicas' | 
             'contas_bancarias' | 'formas_pagamento' | 'recorrencias' | 'contas_pagar' | 'contas_pagar_parcelas';
        label: string;
        uniqueField: string;
      };

      const tables: TableConfig[] = [
        { key: 'categorias_financeiras', label: 'Categorias Financeiras', uniqueField: 'id' },
        { key: 'filiais', label: 'Filiais', uniqueField: 'id' },
        { key: 'pessoas_juridicas', label: 'Pessoas Jurídicas (Fornecedores)', uniqueField: 'cnpj' },
        { key: 'pessoas_fisicas', label: 'Pessoas Físicas', uniqueField: 'cpf' },
        { key: 'contas_bancarias', label: 'Contas Bancárias', uniqueField: 'id' },
        { key: 'formas_pagamento', label: 'Formas de Pagamento', uniqueField: 'nome' },
        { key: 'recorrencias', label: 'Recorrências', uniqueField: 'id' },
        { key: 'contas_pagar', label: 'Contas a Pagar', uniqueField: 'chave_nfe' },
        { key: 'contas_pagar_parcelas', label: 'Parcelas', uniqueField: 'id' },
      ];

      const existingTables = tables.filter(t => {
        const tableData = previewData[t.key as keyof FinanceiroExportData];
        return tableData && Array.isArray(tableData) && tableData.length > 0;
      });

      for (let i = 0; i < existingTables.length; i++) {
        const table = existingTables[i];
        const data = previewData[table.key as keyof FinanceiroExportData] as any[];
        
        const result = await importTableData(table.key, data, table.uniqueField, table.label);
        results.push(result);
        setImportProgress(((i + 1) / existingTables.length) * 100);
      }

      setImportResults(results);

      const totalInseridos = results.reduce((acc, r) => acc + r.inseridos, 0);
      const totalAtualizados = results.reduce((acc, r) => acc + r.atualizados, 0);
      const totalErros = results.reduce((acc, r) => acc + r.erros, 0);

      toast({
        title: 'Importação concluída!',
        description: `${totalInseridos} inseridos, ${totalAtualizados} atualizados, ${totalErros} erros.`,
        variant: totalErros > 0 ? 'destructive' : 'default',
      });

      if (onComplete) onComplete();

    } catch (error) {
      console.error('Erro na importação:', error);
      toast({
        title: 'Erro na importação',
        description: 'Ocorreu um erro ao importar os dados.',
        variant: 'destructive',
      });
    } finally {
      setImporting(false);
    }
  };

  const resetImport = () => {
    setSelectedFile(null);
    setPreviewData(null);
    setImportResults([]);
    setImportProgress(0);
  };

  const getPreviewStats = () => {
    if (!previewData) return null;

    return {
      categorias: previewData.categorias_financeiras?.length || 0,
      filiais: previewData.filiais?.length || 0,
      fornecedoresPJ: previewData.pessoas_juridicas?.length || 0,
      fornecedoresPF: previewData.pessoas_fisicas?.length || 0,
      contasBancarias: previewData.contas_bancarias?.length || 0,
      formasPagamento: previewData.formas_pagamento?.length || 0,
      recorrencias: previewData.recorrencias?.length || 0,
      contasPagar: previewData.contas_pagar?.length || 0,
      parcelas: previewData.contas_pagar_parcelas?.length || 0,
    };
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileJson className="h-5 w-5" />
            Exportar / Importar Dados Financeiros
          </DialogTitle>
          <DialogDescription>
            Exporte ou importe os dados do módulo financeiro. A importação não duplica registros, apenas atualiza se já existirem.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'export' | 'import')} className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="export" className="flex items-center gap-2">
              <FileDown className="h-4 w-4" />
              Exportar
            </TabsTrigger>
            <TabsTrigger value="import" className="flex items-center gap-2">
              <FileUp className="h-4 w-4" />
              Importar
            </TabsTrigger>
          </TabsList>

          {/* ABA EXPORTAR */}
          <TabsContent value="export" className="flex-1 overflow-auto mt-4">
            <div className="space-y-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Selecione o que exportar:</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <Checkbox checked={exportOptions.categorias} onCheckedChange={() => toggleOption('categorias')} />
                      <span className="text-sm">Categorias Financeiras</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <Checkbox checked={exportOptions.filiais} onCheckedChange={() => toggleOption('filiais')} />
                      <span className="text-sm">Filiais</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <Checkbox checked={exportOptions.fornecedores_pj} onCheckedChange={() => toggleOption('fornecedores_pj')} />
                      <span className="text-sm">Fornecedores (PJ)</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <Checkbox checked={exportOptions.fornecedores_pf} onCheckedChange={() => toggleOption('fornecedores_pf')} />
                      <span className="text-sm">Fornecedores (PF)</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <Checkbox checked={exportOptions.contas_bancarias} onCheckedChange={() => toggleOption('contas_bancarias')} />
                      <span className="text-sm">Contas Bancárias</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <Checkbox checked={exportOptions.formas_pagamento} onCheckedChange={() => toggleOption('formas_pagamento')} />
                      <span className="text-sm">Formas de Pagamento</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <Checkbox checked={exportOptions.recorrencias} onCheckedChange={() => toggleOption('recorrencias')} />
                      <span className="text-sm">Recorrências</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <Checkbox checked={exportOptions.contas_pagar} onCheckedChange={() => toggleOption('contas_pagar')} />
                      <span className="text-sm">Contas a Pagar</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <Checkbox checked={exportOptions.parcelas} onCheckedChange={() => toggleOption('parcelas')} />
                      <span className="text-sm">Parcelas</span>
                    </label>
                  </div>
                </CardContent>
              </Card>

              {exporting && (
                <div className="space-y-2">
                  <Label>Progresso da exportação:</Label>
                  <Progress value={exportProgress} />
                  <p className="text-sm text-muted-foreground text-center">{Math.round(exportProgress)}%</p>
                </div>
              )}
            </div>
          </TabsContent>

          {/* ABA IMPORTAR */}
          <TabsContent value="import" className="flex-1 overflow-auto mt-4">
            <div className="space-y-4">
              {!previewData ? (
                <Card>
                  <CardContent className="pt-6">
                    <label className="flex flex-col items-center justify-center gap-4 p-8 border-2 border-dashed rounded-lg cursor-pointer hover:border-primary transition-colors">
                      <Upload className="h-10 w-10 text-muted-foreground" />
                      <div className="text-center">
                        <p className="font-medium">Clique para selecionar o arquivo JSON</p>
                        <p className="text-sm text-muted-foreground">ou arraste e solte aqui</p>
                      </div>
                      <input
                        type="file"
                        accept=".json"
                        onChange={handleFileSelect}
                        className="hidden"
                      />
                    </label>
                  </CardContent>
                </Card>
              ) : (
                <>
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm flex items-center justify-between">
                        <span>Arquivo: {selectedFile?.name}</span>
                        <Button variant="ghost" size="sm" onClick={resetImport}>
                          <X className="h-4 w-4 mr-1" />
                          Trocar arquivo
                        </Button>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-sm text-muted-foreground mb-3">
                        Exportado em: {previewData.exportado_em ? format(new Date(previewData.exportado_em), 'dd/MM/yyyy HH:mm') : 'N/A'}
                      </div>
                      
                      <div className="grid grid-cols-3 gap-2">
                        {getPreviewStats() && Object.entries({
                          'Categorias': getPreviewStats()!.categorias,
                          'Filiais': getPreviewStats()!.filiais,
                          'Fornec. PJ': getPreviewStats()!.fornecedoresPJ,
                          'Fornec. PF': getPreviewStats()!.fornecedoresPF,
                          'Contas Banc.': getPreviewStats()!.contasBancarias,
                          'Formas Pag.': getPreviewStats()!.formasPagamento,
                          'Recorrências': getPreviewStats()!.recorrencias,
                          'Contas Pagar': getPreviewStats()!.contasPagar,
                          'Parcelas': getPreviewStats()!.parcelas,
                        }).map(([label, count]) => (
                          <div key={label} className="flex items-center justify-between p-2 bg-muted rounded">
                            <span className="text-xs">{label}</span>
                            <Badge variant={count > 0 ? "default" : "secondary"}>
                              {count}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  {importing && (
                    <div className="space-y-2">
                      <Label>Progresso da importação:</Label>
                      <Progress value={importProgress} />
                      <p className="text-sm text-muted-foreground text-center">{Math.round(importProgress)}%</p>
                    </div>
                  )}

                  {importResults.length > 0 && (
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm">Resultado da Importação:</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ScrollArea className="h-48">
                          <div className="space-y-2">
                            {importResults.map((result, idx) => (
                              <div key={idx} className="p-3 bg-muted rounded-lg">
                                <div className="flex items-center justify-between mb-1">
                                  <span className="font-medium text-sm">{result.tabela}</span>
                                  <div className="flex gap-2">
                                    {result.inseridos > 0 && (
                                      <Badge variant="default" className="text-xs">
                                        <CheckCircle className="h-3 w-3 mr-1" />
                                        {result.inseridos} inseridos
                                      </Badge>
                                    )}
                                    {result.atualizados > 0 && (
                                      <Badge variant="secondary" className="text-xs">
                                        <AlertCircle className="h-3 w-3 mr-1" />
                                        {result.atualizados} atualizados
                                      </Badge>
                                    )}
                                    {result.erros > 0 && (
                                      <Badge variant="destructive" className="text-xs">
                                        <XCircle className="h-3 w-3 mr-1" />
                                        {result.erros} erros
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                                {result.detalhes.length > 0 && (
                                  <div className="text-xs text-muted-foreground mt-1">
                                    {result.detalhes.slice(0, 3).map((d, i) => (
                                      <div key={i}>{d}</div>
                                    ))}
                                    {result.detalhes.length > 3 && (
                                      <div>... e mais {result.detalhes.length - 3} mensagens</div>
                                    )}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </ScrollArea>
                      </CardContent>
                    </Card>
                  )}
                </>
              )}
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={onClose}>
            Fechar
          </Button>
          
          {activeTab === 'export' && (
            <Button onClick={handleExport} disabled={exporting || !Object.values(exportOptions).some(Boolean)}>
              {exporting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Exportando...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Exportar JSON
                </>
              )}
            </Button>
          )}

          {activeTab === 'import' && previewData && (
            <Button onClick={handleImport} disabled={importing}>
              {importing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Importando...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Importar Dados
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
