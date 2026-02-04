/**
 * Hook para parsing de múltiplos arquivos de produtos (XLSX, XLS, CSV, XML)
 * Usa Web Worker para evitar travamento da UI em arquivos grandes
 */
import { useState, useCallback, useRef, useEffect } from 'react';
import type { ArquivoImportacao } from '@/components/produtos/ImportadorProdutosUpload';
import type { MapeamentoColunasProduto } from '@/components/produtos/ImportadorProdutosMapeamento';
import type { SpreadsheetWorkerMessage, SpreadsheetWorkerResponse } from '@/workers/spreadsheet.worker';

export interface MultiFileParseProgress {
  phase: 'idle' | 'parsing' | 'merging' | 'complete' | 'error';
  percent: number;
  message: string;
  currentFile?: string;
}

export interface MultiFileParseResult {
  data: Record<string, unknown>[];
  columns: string[];
  arquivos: ArquivoImportacao[];
  arquivosCombinados: File[];
}

interface UseMultiFileProdutosParserOptions {
  onComplete?: (result: MultiFileParseResult) => void;
  onError?: (error: Error) => void;
}

export function useMultiFileProdutosParser(options: UseMultiFileProdutosParserOptions = {}) {
  const { onComplete, onError } = options;

  const [progress, setProgress] = useState<MultiFileParseProgress>({
    phase: 'idle',
    percent: 0,
    message: '',
  });

  const [arquivos, setArquivos] = useState<ArquivoImportacao[]>([]);
  const [dados, setDados] = useState<Record<string, unknown>[]>([]);
  const [colunas, setColunas] = useState<string[]>([]);
  const [arquivosOriginais, setArquivosOriginais] = useState<File[]>([]);
  
  const abortRef = useRef(false);
  const workerRef = useRef<Worker | null>(null);

  // Cria o worker uma vez
  useEffect(() => {
    workerRef.current = new Worker(
      new URL('@/workers/spreadsheet.worker.ts', import.meta.url),
      { type: 'module' }
    );

    return () => {
      workerRef.current?.terminate();
      workerRef.current = null;
    };
  }, []);

  // Detecta tipo do arquivo
  const detectFileType = (file: File): ArquivoImportacao['tipo'] => {
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext === 'xlsx') return 'xlsx';
    if (ext === 'xls') return 'xls';
    if (ext === 'csv') return 'csv';
    if (ext === 'xml') return 'xml';
    return 'xlsx';
  };

  // Parseia um arquivo usando o Web Worker
  const parseFileWithWorker = (file: File, fileType: ArquivoImportacao['tipo']): Promise<{ data: Record<string, unknown>[]; columns: string[] }> => {
    return new Promise((resolve, reject) => {
      if (!workerRef.current) {
        reject(new Error('Worker não disponível'));
        return;
      }

      const handleMessage = (event: MessageEvent<SpreadsheetWorkerResponse>) => {
        if (abortRef.current) {
          workerRef.current?.removeEventListener('message', handleMessage);
          reject(new Error('Cancelado'));
          return;
        }

        const { type, payload } = event.data;

        if (type === 'PROGRESS') {
          // Atualiza progresso parcial do arquivo
          setProgress((prev) => ({
            ...prev,
            message: payload.message || prev.message,
          }));
        } else if (type === 'COMPLETE') {
          workerRef.current?.removeEventListener('message', handleMessage);
          resolve({
            data: payload.data || [],
            columns: payload.columns || [],
          });
        } else if (type === 'ERROR') {
          workerRef.current?.removeEventListener('message', handleMessage);
          reject(new Error(payload.error || 'Erro ao processar'));
        }
      };

      workerRef.current.addEventListener('message', handleMessage);

      // Lê o arquivo e envia para o worker
      file.arrayBuffer().then((arrayBuffer) => {
        const message: SpreadsheetWorkerMessage = {
          type: 'PARSE_FILE',
          payload: {
            arrayBuffer,
            fileName: file.name,
            fileType,
          },
        };
        workerRef.current!.postMessage(message, [arrayBuffer]);
      }).catch(reject);
    });
  };

  // Adiciona arquivos
  const addFiles = useCallback((files: File[]) => {
    const novosArquivos: ArquivoImportacao[] = files.map((file) => ({
      file,
      nome: file.name,
      tamanho: file.size,
      tipo: detectFileType(file),
      status: 'pending',
    }));
    
    setArquivos((prev) => [...prev, ...novosArquivos]);
    setArquivosOriginais((prev) => [...prev, ...files]);
  }, []);

  // Remove arquivo
  const removeFile = useCallback((index: number) => {
    setArquivos((prev) => prev.filter((_, i) => i !== index));
    setArquivosOriginais((prev) => prev.filter((_, i) => i !== index));
  }, []);

  // Processa todos os arquivos usando Web Worker
  const parseAllFiles = useCallback(async () => {
    if (arquivos.length === 0) return;
    
    abortRef.current = false;
    
    try {
      setProgress({ phase: 'parsing', percent: 0, message: 'Iniciando processamento...' });
      
      const todosOsDados: Record<string, unknown>[] = [];
      let colunasBase: string[] = [];
      
      const arquivosAtualizados = [...arquivos];
      
      for (let i = 0; i < arquivos.length; i++) {
        if (abortRef.current) return;
        
        const arquivo = arquivos[i];
        arquivosAtualizados[i] = { ...arquivo, status: 'parsing' };
        setArquivos([...arquivosAtualizados]);
        
        const percentBase = Math.round((i / arquivos.length) * 80);
        setProgress({
          phase: 'parsing',
          percent: percentBase,
          message: `Processando ${arquivo.nome}...`,
          currentFile: arquivo.nome,
        });
        
        try {
          // Usa o Web Worker para parsing
          const result = await parseFileWithWorker(arquivo.file, arquivo.tipo);
          
          // Primeira planilha define as colunas base
          if (colunasBase.length === 0 && result.columns.length > 0) {
            colunasBase = result.columns;
          }
          
          // Adiciona marcador de origem
          result.data.forEach((row) => {
            row.__origem_arquivo = arquivo.nome;
          });
          
          todosOsDados.push(...result.data);
          
          arquivosAtualizados[i] = { ...arquivo, status: 'done', linhas: result.data.length };
          setArquivos([...arquivosAtualizados]);
          
        } catch (err) {
          if (abortRef.current) return;
          
          arquivosAtualizados[i] = { 
            ...arquivo, 
            status: 'error', 
            erro: err instanceof Error ? err.message : 'Erro ao processar' 
          };
          setArquivos([...arquivosAtualizados]);
        }
      }
      
      if (abortRef.current) return;
      
      setProgress({ phase: 'merging', percent: 90, message: 'Mesclando dados...' });
      
      // Mescla colunas de todos os arquivos (em chunks para não travar)
      if (todosOsDados.length > 0) {
        const todasColunas = new Set<string>();
        const CHUNK = 5000;
        
        for (let i = 0; i < todosOsDados.length; i += CHUNK) {
          if (abortRef.current) return;
          
          const chunk = todosOsDados.slice(i, i + CHUNK);
          chunk.forEach((row) => {
            Object.keys(row).forEach((col) => {
              if (!col.startsWith('__')) todasColunas.add(col);
            });
          });
          
          // Yield à UI
          await new Promise((r) => setTimeout(r, 0));
        }
        
        colunasBase = Array.from(todasColunas);
      }
      
      // Yield antes de setar dados grandes
      await new Promise((r) => setTimeout(r, 0));
      setDados(todosOsDados);
      setColunas(colunasBase);
      
      setProgress({
        phase: 'complete',
        percent: 100,
        message: `${todosOsDados.length.toLocaleString('pt-BR')} produtos carregados`,
      });
      
      const result: MultiFileParseResult = {
        data: todosOsDados,
        columns: colunasBase,
        arquivos: arquivosAtualizados,
        arquivosCombinados: arquivosOriginais,
      };
      
      onComplete?.(result);
      return result;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      setProgress({ phase: 'error', percent: 0, message: err.message });
      onError?.(err);
      throw err;
    }
  }, [arquivos, arquivosOriginais, onComplete, onError]);

  // Calcula estatísticas de grade
  const calcularEstatisticasGrade = useCallback((
    dados: Record<string, unknown>[],
    mapeamento: MapeamentoColunasProduto
  ) => {
    if (!mapeamento.referencia || dados.length === 0) return null;
    
    const referencias = new Map<string, number>();
    dados.forEach((row) => {
      const ref = String(row[mapeamento.referencia!] || '').trim();
      if (ref) {
        referencias.set(ref, (referencias.get(ref) || 0) + 1);
      }
    });
    
    const produtosUnicos = referencias.size;
    const produtosComVariacao = Array.from(referencias.values()).filter((c) => c > 1).length;
    const totalVariacoes = Array.from(referencias.values()).reduce((a, b) => a + b, 0);
    const mediaVariacoes = produtosUnicos > 0 ? totalVariacoes / produtosUnicos : 0;
    
    return {
      totalLinhas: dados.length,
      produtosUnicos,
      produtosComVariacao,
      mediaVariacoes,
    };
  }, []);

  // Auto-detecta colunas
  const autoDetectColumns = useCallback((columns: string[]): MapeamentoColunasProduto => {
    const detect = (patterns: RegExp[]) =>
      columns.find((c) => patterns.some((p) => p.test(c.toLowerCase())));

    return {
      nome: detect([/^nome$/, /descri/, /produto/, /^item$/, /xprod/i]) || columns[0],
      codigo: detect([/^cod/, /^sku$/, /^id$/, /cprod/i]),
      referencia: detect([/refer/, /^ref$/, /grade/, /pai/, /parent/i]),
      preco: detect([/preco/, /valor/, /price/, /vuncom/i]),
      custo: detect([/custo/, /cost/i]),
      estoque: detect([/estoque/, /^qtd$/, /quantidade/, /stock/, /qcom/i]),
      cor: detect([/^cor$/, /color/i]),
      tamanho: detect([/tamanho/, /^size$/, /^tam$/i]),
    };
  }, []);

  // Reset
  const reset = useCallback(() => {
    abortRef.current = true;
    setProgress({ phase: 'idle', percent: 0, message: '' });
    setArquivos([]);
    setDados([]);
    setColunas([]);
    setArquivosOriginais([]);
  }, []);

  // Cancel
  const cancel = useCallback(() => {
    abortRef.current = true;
    if (workerRef.current) {
      const message: SpreadsheetWorkerMessage = { type: 'CANCEL' };
      workerRef.current.postMessage(message);
    }
    setProgress({ phase: 'idle', percent: 0, message: 'Cancelado' });
  }, []);

  return {
    // Actions
    addFiles,
    removeFile,
    parseAllFiles,
    reset,
    cancel,
    autoDetectColumns,
    calcularEstatisticasGrade,
    
    // State
    arquivos,
    dados,
    colunas,
    progress,
    arquivosOriginais,
    
    // Computed
    isParsing: ['parsing', 'merging'].includes(progress.phase),
    totalLinhas: dados.length,
  };
}
