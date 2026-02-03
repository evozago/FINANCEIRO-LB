// Hook para processamento de classificação com Web Worker
// Otimizado para planilhas com 50k+ linhas

import { useState, useCallback, useRef, useEffect } from 'react';
import type { RegraClassificacao, AtributoCustomizado, ResultadoClassificacao } from '@/lib/classificador';

export interface ClassificacaoProgress {
  phase: 'idle' | 'parsing' | 'classifying' | 'saving' | 'complete' | 'error' | 'cancelled';
  processed: number;
  total: number;
  percent: number;
  batchesComplete: number;
  totalBatches: number;
  estimatedTimeRemaining: string | null;
  itemsPerSecond: number;
  currentBatchProgress: number;
}

export interface ProdutoImportado {
  id?: number;
  codigo?: string;
  nome: string;
  preco?: number;
  custo?: number;
  estoque?: number;
  cor?: string;
  tamanho?: string;
  [key: string]: unknown;
}

export interface ProdutoClassificado {
  produto: ProdutoImportado;
  resultado: ResultadoClassificacao;
}

interface UseClassificadorWorkerOptions {
  batchSize?: number; // Tamanho do lote para processamento (padrão: 500)
  dbBatchSize?: number; // Tamanho do lote para inserção no banco (padrão: 100)
  onBatchComplete?: (batch: ProdutoClassificado[], batchIndex: number) => Promise<void>;
  onComplete?: (stats: { total: number; classificados: number; confiancaMedia: number }) => void;
  onError?: (error: Error) => void;
}

export function useClassificadorWorker(options: UseClassificadorWorkerOptions = {}) {
  const {
    batchSize = 500, // Lotes maiores = menos overhead, mas mais memória
    dbBatchSize = 100,
    onBatchComplete,
    onComplete,
    onError
  } = options;

  const [progress, setProgress] = useState<ClassificacaoProgress>({
    phase: 'idle',
    processed: 0,
    total: 0,
    percent: 0,
    batchesComplete: 0,
    totalBatches: 0,
    estimatedTimeRemaining: null,
    itemsPerSecond: 0,
    currentBatchProgress: 0
  });

  const [resultados, setResultados] = useState<ProdutoClassificado[]>([]);
  const workerRef = useRef<Worker | null>(null);
  const startTimeRef = useRef<number>(0);
  const processedCountRef = useRef<number>(0);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Cleanup worker on unmount
  useEffect(() => {
    return () => {
      if (workerRef.current) {
        workerRef.current.terminate();
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // Calcula tempo restante estimado
  const calcularTempoRestante = useCallback((processed: number, total: number): string | null => {
    if (processed === 0) return null;
    
    const elapsed = (Date.now() - startTimeRef.current) / 1000;
    const rate = processed / elapsed;
    const remaining = total - processed;
    const secondsRemaining = remaining / rate;
    
    if (secondsRemaining < 60) {
      return `${Math.round(secondsRemaining)}s`;
    } else if (secondsRemaining < 3600) {
      return `${Math.round(secondsRemaining / 60)}min`;
    } else {
      return `${Math.round(secondsRemaining / 3600)}h ${Math.round((secondsRemaining % 3600) / 60)}min`;
    }
  }, []);

  // Processa classificação sem Web Worker (fallback mais simples e confiável para Vite)
  const processarClassificacaoMainThread = useCallback(async (
    produtos: ProdutoImportado[],
    regras: RegraClassificacao[],
    atributos: AtributoCustomizado[]
  ) => {
    const { classificarLote } = await import('@/lib/classificador');
    
    startTimeRef.current = Date.now();
    processedCountRef.current = 0;
    
    const totalBatches = Math.ceil(produtos.length / batchSize);
    const todosResultados: ProdutoClassificado[] = [];
    
    setProgress(prev => ({
      ...prev,
      phase: 'classifying',
      total: produtos.length,
      totalBatches
    }));

    for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
      // Verifica cancelamento
      if (abortControllerRef.current?.signal.aborted) {
        setProgress(prev => ({ ...prev, phase: 'cancelled' }));
        return [];
      }

      const start = batchIndex * batchSize;
      const end = Math.min(start + batchSize, produtos.length);
      const batch = produtos.slice(start, end);
      
      // Processa em micro-lotes para não travar a UI
      const MICRO_BATCH = 50;
      const batchResultados: ProdutoClassificado[] = [];
      
      for (let i = 0; i < batch.length; i += MICRO_BATCH) {
        if (abortControllerRef.current?.signal.aborted) break;
        
        const microBatch = batch.slice(i, i + MICRO_BATCH);
        const classificados = classificarLote(microBatch, regras, atributos);
        batchResultados.push(...classificados);
        
        // Atualiza progresso
        processedCountRef.current = start + i + microBatch.length;
        const elapsed = (Date.now() - startTimeRef.current) / 1000;
        const rate = processedCountRef.current / elapsed;
        
        setProgress({
          phase: 'classifying',
          processed: processedCountRef.current,
          total: produtos.length,
          percent: Math.round((processedCountRef.current / produtos.length) * 100),
          batchesComplete: batchIndex,
          totalBatches,
          estimatedTimeRemaining: calcularTempoRestante(processedCountRef.current, produtos.length),
          itemsPerSecond: Math.round(rate),
          currentBatchProgress: Math.round(((i + microBatch.length) / batch.length) * 100)
        });
        
        // Yield para a UI
        await new Promise(r => setTimeout(r, 0));
      }
      
      todosResultados.push(...batchResultados);
      
      // Callback de batch completo (para streaming de save)
      if (onBatchComplete) {
        await onBatchComplete(batchResultados, batchIndex);
      }
      
      setProgress(prev => ({
        ...prev,
        batchesComplete: batchIndex + 1
      }));
    }

    return todosResultados;
  }, [batchSize, onBatchComplete, calcularTempoRestante]);

  // Função principal de classificação
  const classificar = useCallback(async (
    produtos: ProdutoImportado[],
    regras: RegraClassificacao[],
    atributos: AtributoCustomizado[]
  ): Promise<ProdutoClassificado[]> => {
    abortControllerRef.current = new AbortController();
    
    try {
      setProgress({
        phase: 'classifying',
        processed: 0,
        total: produtos.length,
        percent: 0,
        batchesComplete: 0,
        totalBatches: Math.ceil(produtos.length / batchSize),
        estimatedTimeRemaining: null,
        itemsPerSecond: 0,
        currentBatchProgress: 0
      });
      setResultados([]);

      const results = await processarClassificacaoMainThread(produtos, regras, atributos);
      
      if (abortControllerRef.current?.signal.aborted) {
        return [];
      }

      setResultados(results);
      
      const classificados = results.filter(r => r.resultado.confianca > 0).length;
      const confiancaMedia = results.length > 0
        ? results.reduce((acc, r) => acc + r.resultado.confianca, 0) / results.length
        : 0;

      setProgress(prev => ({
        ...prev,
        phase: 'complete',
        processed: results.length,
        percent: 100
      }));

      onComplete?.({
        total: results.length,
        classificados,
        confiancaMedia
      });

      return results;
    } catch (error) {
      setProgress(prev => ({ ...prev, phase: 'error' }));
      onError?.(error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }, [batchSize, processarClassificacaoMainThread, onComplete, onError]);

  // Cancela processamento
  const cancelar = useCallback(() => {
    abortControllerRef.current?.abort();
    if (workerRef.current) {
      workerRef.current.postMessage({ type: 'CANCEL' });
    }
    setProgress(prev => ({ ...prev, phase: 'cancelled' }));
  }, []);

  // Reset
  const reset = useCallback(() => {
    setProgress({
      phase: 'idle',
      processed: 0,
      total: 0,
      percent: 0,
      batchesComplete: 0,
      totalBatches: 0,
      estimatedTimeRemaining: null,
      itemsPerSecond: 0,
      currentBatchProgress: 0
    });
    setResultados([]);
  }, []);

  return {
    classificar,
    cancelar,
    reset,
    progress,
    resultados,
    isProcessing: ['parsing', 'classifying', 'saving'].includes(progress.phase)
  };
}
