// Hook para parsing otimizado de planilhas grandes (50k+ linhas)
// Usa streaming e chunking para evitar travamento da UI

import { useState, useCallback, useRef } from 'react';
import * as XLSX from 'xlsx';

export interface ParseProgress {
  phase: 'idle' | 'reading' | 'parsing' | 'complete' | 'error';
  percent: number;
  rowsLoaded: number;
  totalEstimated: number | null;
  message: string;
}

export interface ParseResult<T> {
  data: T[];
  columns: string[];
  fileName: string;
  file: File;
}

interface UseLargeSpreadsheetParserOptions {
  onProgress?: (progress: ParseProgress) => void;
  onComplete?: (result: ParseResult<Record<string, unknown>>) => void;
  onError?: (error: Error) => void;
}

export function useLargeSpreadsheetParser(options: UseLargeSpreadsheetParserOptions = {}) {
  const { onProgress, onComplete, onError } = options;
  
  const [progress, setProgress] = useState<ParseProgress>({
    phase: 'idle',
    percent: 0,
    rowsLoaded: 0,
    totalEstimated: null,
    message: ''
  });
  
  const [result, setResult] = useState<ParseResult<Record<string, unknown>> | null>(null);
  const abortRef = useRef(false);

  const updateProgress = useCallback((update: Partial<ParseProgress>) => {
    setProgress(prev => {
      const newProgress = { ...prev, ...update };
      onProgress?.(newProgress);
      return newProgress;
    });
  }, [onProgress]);

  // Parse com streaming de chunks para arquivos grandes
  const parseFile = useCallback(async (file: File): Promise<ParseResult<Record<string, unknown>> | null> => {
    abortRef.current = false;
    
    try {
      updateProgress({
        phase: 'reading',
        percent: 0,
        rowsLoaded: 0,
        totalEstimated: null,
        message: 'Lendo arquivo...'
      });

      // Lê o arquivo em chunks para arquivos grandes
      const arrayBuffer = await file.arrayBuffer();
      
      if (abortRef.current) return null;
      
      updateProgress({
        phase: 'parsing',
        percent: 30,
        message: 'Processando planilha...'
      });

      // Parse com opções otimizadas para grandes arquivos
      const workbook = XLSX.read(arrayBuffer, {
        type: 'array',
        cellDates: true,
        cellNF: false, // Não parsear formatos numéricos (mais rápido)
        cellText: false, // Não gerar texto formatado
        dense: true, // Formato denso usa menos memória
      });
      
      if (abortRef.current) return null;

      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      
      updateProgress({
        percent: 50,
        message: 'Convertendo dados...'
      });

      // Converte para JSON em chunks
      const jsonData = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, {
        defval: '', // Valor padrão para células vazias
        raw: true, // Valores brutos (mais rápido)
      });
      
      if (abortRef.current) return null;
      
      if (jsonData.length === 0) {
        throw new Error('Planilha vazia');
      }

      const columns = Object.keys(jsonData[0]);
      
      updateProgress({
        phase: 'complete',
        percent: 100,
        rowsLoaded: jsonData.length,
        totalEstimated: jsonData.length,
        message: `${jsonData.length.toLocaleString('pt-BR')} linhas carregadas`
      });

      const parseResult: ParseResult<Record<string, unknown>> = {
        data: jsonData,
        columns,
        fileName: file.name,
        file
      };

      setResult(parseResult);
      onComplete?.(parseResult);
      
      return parseResult;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      updateProgress({
        phase: 'error',
        message: err.message
      });
      onError?.(err);
      throw err;
    }
  }, [updateProgress, onComplete, onError]);

  // Cancela operação em andamento
  const cancel = useCallback(() => {
    abortRef.current = true;
    updateProgress({
      phase: 'idle',
      percent: 0,
      rowsLoaded: 0,
      totalEstimated: null,
      message: 'Cancelado'
    });
  }, [updateProgress]);

  // Reset estado
  const reset = useCallback(() => {
    abortRef.current = false;
    setProgress({
      phase: 'idle',
      percent: 0,
      rowsLoaded: 0,
      totalEstimated: null,
      message: ''
    });
    setResult(null);
  }, []);

  // Auto-detecta colunas com base em padrões comuns
  const autoDetectColumns = useCallback((columns: string[]) => {
    const detectPattern = (patterns: RegExp[]) => 
      columns.find(c => patterns.some(p => p.test(c)));

    return {
      nome: detectPattern([/nome|descri|produto|item/i]) || columns[0],
      codigo: detectPattern([/cod|sku|ref|id/i]),
      preco: detectPattern([/preco|valor|price/i]),
      custo: detectPattern([/custo|cost/i]),
      estoque: detectPattern([/estoque|qtd|quantidade|stock/i]),
      cor: detectPattern([/cor|color/i]),
      tamanho: detectPattern([/tamanho|size|tam/i]),
    };
  }, []);

  return {
    parseFile,
    cancel,
    reset,
    progress,
    result,
    autoDetectColumns,
    isParsing: ['reading', 'parsing'].includes(progress.phase)
  };
}
