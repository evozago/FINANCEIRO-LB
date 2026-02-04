/**
 * Web Worker para parsing de planilhas grandes (50k+ linhas)
 * Move o parsing pesado do XLSX para thread separada
 */
import * as XLSX from 'xlsx';

export interface SpreadsheetWorkerMessage {
  type: 'PARSE_FILE' | 'CANCEL';
  payload?: {
    arrayBuffer: ArrayBuffer;
    fileName: string;
    fileType: 'xlsx' | 'xls' | 'csv' | 'xml';
  };
}

export interface SpreadsheetWorkerResponse {
  type: 'PROGRESS' | 'COMPLETE' | 'ERROR';
  payload: {
    percent?: number;
    message?: string;
    data?: Record<string, unknown>[];
    columns?: string[];
    error?: string;
    rowCount?: number;
  };
}

let cancelRequested = false;

// Parse de XML (NFe ou lista de produtos)
function parseXML(text: string): Record<string, unknown>[] {
  const parser = new DOMParser();
  const doc = parser.parseFromString(text, 'text/xml');
  
  // Detecta se é NFe
  const nfeNodes = doc.querySelectorAll('det');
  if (nfeNodes.length > 0) {
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

  // Parse genérico
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
}

// Parse de planilha Excel/CSV
function parseSpreadsheet(arrayBuffer: ArrayBuffer): Record<string, unknown>[] {
  const workbook = XLSX.read(arrayBuffer, {
    type: 'array',
    cellDates: true,
    cellNF: false,
    cellText: false,
    dense: true,
  });

  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  
  return XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, {
    defval: '',
    raw: true,
  });
}

// Handler principal
self.onmessage = async (event: MessageEvent<SpreadsheetWorkerMessage>) => {
  const { type, payload } = event.data;
  
  if (type === 'CANCEL') {
    cancelRequested = true;
    return;
  }
  
  if (type === 'PARSE_FILE' && payload) {
    cancelRequested = false;
    
    try {
      self.postMessage({
        type: 'PROGRESS',
        payload: { percent: 10, message: 'Lendo arquivo...' }
      } as SpreadsheetWorkerResponse);

      let data: Record<string, unknown>[];
      
      if (payload.fileType === 'xml') {
        const decoder = new TextDecoder('utf-8');
        const text = decoder.decode(payload.arrayBuffer);
        data = parseXML(text);
      } else {
        self.postMessage({
          type: 'PROGRESS',
          payload: { percent: 30, message: 'Processando planilha...' }
        } as SpreadsheetWorkerResponse);
        
        data = parseSpreadsheet(payload.arrayBuffer);
      }
      
      if (cancelRequested) {
        return;
      }
      
      self.postMessage({
        type: 'PROGRESS',
        payload: { percent: 80, message: 'Finalizando...', rowCount: data.length }
      } as SpreadsheetWorkerResponse);

      // Extrai colunas
      const columns = data.length > 0 ? Object.keys(data[0]) : [];
      
      self.postMessage({
        type: 'COMPLETE',
        payload: {
          percent: 100,
          data,
          columns,
          rowCount: data.length,
          message: `${data.length.toLocaleString('pt-BR')} linhas processadas`
        }
      } as SpreadsheetWorkerResponse);
      
    } catch (error) {
      self.postMessage({
        type: 'ERROR',
        payload: {
          error: error instanceof Error ? error.message : String(error)
        }
      } as SpreadsheetWorkerResponse);
    }
  }
};

export {};
