/**
 * Hook para usar o Web Worker de parsing de planilhas
 * Move o processamento pesado para uma thread separada
 */
import { useState, useCallback, useRef, useEffect } from 'react';
import type { SpreadsheetWorkerMessage, SpreadsheetWorkerResponse } from '@/workers/spreadsheet.worker';

export interface SpreadsheetParseProgress {
  phase: 'idle' | 'parsing' | 'complete' | 'error';
  percent: number;
  message: string;
  rowCount?: number;
}

export interface SpreadsheetParseResult {
  data: Record<string, unknown>[];
  columns: string[];
  rowCount: number;
}

interface UseSpreadsheetWorkerOptions {
  onComplete?: (result: SpreadsheetParseResult) => void;
  onError?: (error: Error) => void;
  onProgress?: (progress: SpreadsheetParseProgress) => void;
}

export function useSpreadsheetWorker(options: UseSpreadsheetWorkerOptions = {}) {
  const { onComplete, onError, onProgress } = options;

  const [progress, setProgress] = useState<SpreadsheetParseProgress>({
    phase: 'idle',
    percent: 0,
    message: '',
  });

  const workerRef = useRef<Worker | null>(null);
  const abortedRef = useRef(false);

  // Cria o worker uma única vez
  useEffect(() => {
    workerRef.current = new Worker(
      new URL('@/workers/spreadsheet.worker.ts', import.meta.url),
      { type: 'module' }
    );

    workerRef.current.onmessage = (event: MessageEvent<SpreadsheetWorkerResponse>) => {
      if (abortedRef.current) return;
      
      const { type, payload } = event.data;

      switch (type) {
        case 'PROGRESS': {
          const newProgress: SpreadsheetParseProgress = {
            phase: 'parsing',
            percent: payload.percent || 0,
            message: payload.message || '',
            rowCount: payload.rowCount,
          };
          setProgress(newProgress);
          onProgress?.(newProgress);
          break;
        }
        case 'COMPLETE': {
          const newProgress: SpreadsheetParseProgress = {
            phase: 'complete',
            percent: 100,
            message: payload.message || 'Concluído',
            rowCount: payload.rowCount,
          };
          setProgress(newProgress);
          onProgress?.(newProgress);
          
          if (payload.data && payload.columns) {
            onComplete?.({
              data: payload.data,
              columns: payload.columns,
              rowCount: payload.rowCount || 0,
            });
          }
          break;
        }
        case 'ERROR': {
          const newProgress: SpreadsheetParseProgress = {
            phase: 'error',
            percent: 0,
            message: payload.error || 'Erro desconhecido',
          };
          setProgress(newProgress);
          onProgress?.(newProgress);
          onError?.(new Error(payload.error || 'Erro ao processar arquivo'));
          break;
        }
      }
    };

    workerRef.current.onerror = (error) => {
      const newProgress: SpreadsheetParseProgress = {
        phase: 'error',
        percent: 0,
        message: error.message || 'Erro no worker',
      };
      setProgress(newProgress);
      onError?.(new Error(error.message || 'Erro no worker'));
    };

    return () => {
      workerRef.current?.terminate();
      workerRef.current = null;
    };
  }, [onComplete, onError, onProgress]);

  // Parseia um arquivo
  const parseFile = useCallback(async (
    file: File,
    fileType: 'xlsx' | 'xls' | 'csv' | 'xml'
  ): Promise<SpreadsheetParseResult | null> => {
    if (!workerRef.current) {
      throw new Error('Worker não disponível');
    }

    abortedRef.current = false;
    
    setProgress({
      phase: 'parsing',
      percent: 0,
      message: 'Lendo arquivo...',
    });

    return new Promise((resolve, reject) => {
      const handleMessage = (event: MessageEvent<SpreadsheetWorkerResponse>) => {
        if (abortedRef.current) {
          resolve(null);
          return;
        }
        
        const { type, payload } = event.data;
        
        if (type === 'COMPLETE' && payload.data && payload.columns) {
          workerRef.current?.removeEventListener('message', handleMessage);
          resolve({
            data: payload.data,
            columns: payload.columns,
            rowCount: payload.rowCount || 0,
          });
        } else if (type === 'ERROR') {
          workerRef.current?.removeEventListener('message', handleMessage);
          reject(new Error(payload.error || 'Erro ao processar'));
        }
      };

      workerRef.current!.addEventListener('message', handleMessage);

      // Lê o arquivo como ArrayBuffer e envia para o worker
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
  }, []);

  // Cancela o processamento
  const cancel = useCallback(() => {
    abortedRef.current = true;
    if (workerRef.current) {
      const message: SpreadsheetWorkerMessage = { type: 'CANCEL' };
      workerRef.current.postMessage(message);
    }
    setProgress({ phase: 'idle', percent: 0, message: 'Cancelado' });
  }, []);

  // Reset
  const reset = useCallback(() => {
    abortedRef.current = true;
    setProgress({ phase: 'idle', percent: 0, message: '' });
  }, []);

  return {
    parseFile,
    cancel,
    reset,
    progress,
    isParsing: progress.phase === 'parsing',
  };
}
