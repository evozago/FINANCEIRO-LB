/**
 * Hook para parsing de múltiplos arquivos de produtos (XLSX, XLS, CSV, XML)
 * Unifica todos os dados em uma única lista com detecção de grade por referência
 */
import { useState, useCallback, useRef } from 'react';
import * as XLSX from 'xlsx';
import type { ArquivoImportacao } from '@/components/produtos/ImportadorProdutosUpload';
import type { MapeamentoColunasProduto } from '@/components/produtos/ImportadorProdutosMapeamento';

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

  // Detecta tipo do arquivo
  const detectFileType = (file: File): ArquivoImportacao['tipo'] => {
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext === 'xlsx') return 'xlsx';
    if (ext === 'xls') return 'xls';
    if (ext === 'csv') return 'csv';
    if (ext === 'xml') return 'xml';
    return 'xlsx';
  };

  // Parse de arquivo XML (NFe ou lista de produtos)
  const parseXML = async (file: File): Promise<Record<string, unknown>[]> => {
    const text = await file.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(text, 'text/xml');
    
    // Detecta se é NFe ou lista genérica
    const nfeNodes = doc.querySelectorAll('det');
    if (nfeNodes.length > 0) {
      // É uma NFe - extrai os produtos
      const produtos: Record<string, unknown>[] = [];
      nfeNodes.forEach((det) => {
        const prod = det.querySelector('prod');
        if (prod) {
          produtos.push({
            codigo: prod.querySelector('cProd')?.textContent || '',
            nome: prod.querySelector('xProd')?.textContent || '',
            ncm: prod.querySelector('NCM')?.textContent || '',
            cfop: prod.querySelector('CFOP')?.textContent || '',
            unidade: prod.querySelector('uCom')?.textContent || '',
            quantidade: parseFloat(prod.querySelector('qCom')?.textContent || '0'),
            preco: parseFloat(prod.querySelector('vUnCom')?.textContent || '0'),
            total: parseFloat(prod.querySelector('vProd')?.textContent || '0'),
          });
        }
      });
      return produtos;
    }

    // Tenta parse genérico de lista de produtos
    const productNodes = doc.querySelectorAll('produto, item, product');
    if (productNodes.length > 0) {
      return Array.from(productNodes).map((node) => {
        const obj: Record<string, unknown> = {};
        Array.from(node.children).forEach((child) => {
          obj[child.tagName] = child.textContent;
        });
        return obj;
      });
    }

    throw new Error('Formato XML não reconhecido');
  };

  // Parse de arquivo Excel/CSV com processamento assíncrono para arquivos grandes
  const parseSpreadsheet = async (
    file: File,
    onProgress?: (percent: number) => void
  ): Promise<Record<string, unknown>[]> => {
    // Yield antes de começar operação pesada
    await new Promise((r) => setTimeout(r, 0));
    
    const arrayBuffer = await file.arrayBuffer();
    
    // Yield após leitura do arquivo
    await new Promise((r) => setTimeout(r, 0));
    onProgress?.(20);
    
    const workbook = XLSX.read(arrayBuffer, {
      type: 'array',
      cellDates: true,
      cellNF: false,
      cellText: false,
      dense: true,
    });
    
    // Yield após parsing do workbook
    await new Promise((r) => setTimeout(r, 0));
    onProgress?.(50);

    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    // Yield antes de conversão para JSON
    await new Promise((r) => setTimeout(r, 0));
    onProgress?.(70);
    
    const allData = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, {
      defval: '',
      raw: true,
    });
    
    // Para arquivos grandes, processar em chunks para dar yield à UI
    const CHUNK_SIZE = 5000;
    if (allData.length > CHUNK_SIZE) {
      const results: Record<string, unknown>[] = [];
      for (let i = 0; i < allData.length; i += CHUNK_SIZE) {
        if (abortRef.current) break;
        
        const chunk = allData.slice(i, i + CHUNK_SIZE);
        results.push(...chunk);
        
        const chunkProgress = 70 + Math.round((i / allData.length) * 30);
        onProgress?.(chunkProgress);
        
        // Yield à UI thread a cada chunk
        await new Promise((r) => setTimeout(r, 0));
      }
      onProgress?.(100);
      return results;
    }
    
    onProgress?.(100);
    return allData;
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

  // Processa todos os arquivos
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
        
        setProgress({
          phase: 'parsing',
          percent: Math.round((i / arquivos.length) * 80),
          message: `Processando ${arquivo.nome}...`,
          currentFile: arquivo.nome,
        });
        
        try {
          let dados: Record<string, unknown>[];
          
          if (arquivo.tipo === 'xml') {
            dados = await parseXML(arquivo.file);
          } else {
            dados = await parseSpreadsheet(arquivo.file, (filePercent) => {
              const overallPercent = Math.round(
                ((i + filePercent / 100) / arquivos.length) * 80
              );
              setProgress({
                phase: 'parsing',
                percent: overallPercent,
                message: `Processando ${arquivo.nome}... ${filePercent}%`,
                currentFile: arquivo.nome,
              });
            });
          }
          
          // Primeira planilha define as colunas base
          if (colunasBase.length === 0 && dados.length > 0) {
            colunasBase = Object.keys(dados[0]);
          }
          
          // Adiciona marcador de origem
          dados.forEach((row) => {
            row.__origem_arquivo = arquivo.nome;
          });
          
          todosOsDados.push(...dados);
          
          arquivosAtualizados[i] = { ...arquivo, status: 'done', linhas: dados.length };
          setArquivos([...arquivosAtualizados]);
        } catch (err) {
          arquivosAtualizados[i] = { 
            ...arquivo, 
            status: 'error', 
            erro: err instanceof Error ? err.message : 'Erro ao processar' 
          };
          setArquivos([...arquivosAtualizados]);
        }
        
        // Yield para UI
        await new Promise((r) => setTimeout(r, 0));
      }
      
      if (abortRef.current) return;
      
      setProgress({ phase: 'merging', percent: 90, message: 'Mesclando dados...' });
      
      // Mescla colunas de todos os arquivos (processamento em chunks para arquivos grandes)
      if (todosOsDados.length > 0) {
        const todasColunas = new Set<string>();
        const MERGE_CHUNK = 5000;
        
        for (let i = 0; i < todosOsDados.length; i += MERGE_CHUNK) {
          if (abortRef.current) return;
          
          const chunk = todosOsDados.slice(i, i + MERGE_CHUNK);
          chunk.forEach((row) => {
            Object.keys(row).forEach((col) => {
              if (!col.startsWith('__')) todasColunas.add(col);
            });
          });
          
          const mergePercent = 90 + Math.round((i / todosOsDados.length) * 8);
          setProgress({ 
            phase: 'merging', 
            percent: mergePercent, 
            message: `Mesclando dados... ${Math.round((i / todosOsDados.length) * 100)}%`
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
