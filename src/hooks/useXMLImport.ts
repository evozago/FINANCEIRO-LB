// Este hook implementa toda a lógica de importação de XML para o sistema FINANCEIRO‑LB.
// Ele faz o parse do arquivo XML, extrai dados da nota fiscal, verifica duplicidade,
// cria ou encontra o fornecedor e grava as contas a pagar e suas parcelas
// nas tabelas `contas_pagar` e `contas_pagar_parcelas` via Supabase.

import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

// Estrutura de dados interna para armazenar informações extraídas do XML
interface XMLData {
  numeroNota: string;
  chaveAcesso: string;
  cnpjEmissor: string;
  razaoSocialEmissor: string;
  nomeFantasiaEmissor?: string;
  valorTotal: number;
  dataEmissao: string;
  parcelas?: {
    numero: number;
    valor: number;
    vencimento: string;
  }[];
}

// Estrutura de retorno de cada processamento
interface ProcessResult {
  success: boolean;
  message: string;
  contaId?: number;
  fornecedorId?: number;
  fornecedorCriado?: boolean;
  fileName?: string;
}

// Hook principal utilizado pela página de importação
export function useXMLImport() {
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const { toast } = useToast();

  // Converte o conteúdo de um arquivo XML em um objeto de dados
  const parseXMLFile = async (file: File): Promise<XMLData | null> => {
    try {
      const xmlContent = await file.text();
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlContent, 'text/xml');

      // Verificar se há erros de parsing
      const parserError = xmlDoc.querySelector('parsererror');
      if (parserError) {
        throw new Error('XML inválido');
      }

      // Extrair dados da nota fiscal
      const nfeElement = xmlDoc.querySelector('infNFe') || xmlDoc.querySelector('NFe');
      if (!nfeElement) {
        throw new Error('Estrutura de NFe não encontrada');
      }

      // Extrair número da NFe usando múltiplos seletores
      let nfeNumber = '';
      const possibleSelectors = ['ide nNF', 'nNF', 'infNFe ide nNF', 'NFe infNFe ide nNF'];
      for (const selector of possibleSelectors) {
        const element = xmlDoc.querySelector(selector);
        if (element && element.textContent?.trim()) {
          nfeNumber = element.textContent.trim();
          break;
        }
      }

      // Extrair chave de acesso
      let chaveAcesso = '';
      const chaveSelectors = ['infNFe[Id]', 'chNFe'];
      for (const selector of chaveSelectors) {
        if (selector === 'infNFe[Id]') {
          const element = xmlDoc.querySelector(selector);
          if (element) {
            const id = element.getAttribute('Id');
            if (id && id.startsWith('NFe')) {
              chaveAcesso = id.replace('NFe', '');
              break;
            }
          }
        } else {
          const element = xmlDoc.querySelector(selector);
          if (element && element.textContent?.trim()) {
            chaveAcesso = element.textContent.trim();
            break;
          }
        }
      }

      // Se não encontrou número da NFe, tentar extrair dos dígitos 26–34 da chave
      if (!nfeNumber && chaveAcesso && chaveAcesso.length >= 44) {
        nfeNumber = chaveAcesso.substring(25, 34);
      }

      // Extrair dados do fornecedor
      const emit = xmlDoc.querySelector('emit');
      if (!emit) {
        throw new Error('Dados do fornecedor não encontrados');
      }
      const cnpjEmissor = emit.querySelector('CNPJ')?.textContent || '';
      const razaoSocialEmissor = emit.querySelector('xNome')?.textContent || 'Fornecedor não identificado';
      const nomeFantasiaEmissor = emit.querySelector('xFant')?.textContent || '';

      // Extrair valor total (vNF) e converter para centavos
      const totalElement = xmlDoc.querySelector('vNF');
      const valorTotal = Math.round(parseFloat(totalElement?.textContent || '0') * 100);

      // Extrair data de emissão (dhEmi) e manter apenas a data (AAAA‑MM‑DD)
      const dataEmissao = xmlDoc.querySelector('dhEmi')?.textContent?.split('T')[0] || new Date().toISOString().split('T')[0];

      // Extrair parcelas (dup) se existirem
      const parcelas: XMLData['parcelas'] = [];
      const duplicatas = xmlDoc.querySelectorAll('dup');
      if (duplicatas && duplicatas.length > 0) {
        duplicatas.forEach((dup, index) => {
          const valorDup = Math.round(parseFloat(dup.querySelector('vDup')?.textContent || '0') * 100);
          let vencimentoDup = dup.querySelector('dVenc')?.textContent;
          // Se não há vencimento, usa a data de emissão
          if (!vencimentoDup) {
            vencimentoDup = dataEmissao;
          }
          parcelas.push({
            numero: index + 1,
            valor: valorDup,
            vencimento: vencimentoDup,
          });
        });
      } else {
        // Caso não haja duplicatas, cria uma parcela única
        parcelas.push({
          numero: 1,
          valor: valorTotal,
          vencimento: dataEmissao,
        });
      }

      return {
        numeroNota: nfeNumber,
        chaveAcesso,
        cnpjEmissor,
        razaoSocialEmissor,
        nomeFantasiaEmissor,
        valorTotal,
        dataEmissao,
        parcelas,
      };
    } catch (error) {
      console.error('Erro ao processar XML:', error);
      throw error;
    }
  };

  // Encontra um fornecedor existente ou cria um novo com base no CNPJ/razão social
  const findOrCreateFornecedor = async (xmlData: XMLData): Promise<{ id: number; created: boolean }> => {
    try {
      // Busca por CNPJ
      if (xmlData.cnpjEmissor) {
        const { data: existingFornecedor } = await supabase
          .from('pessoas_juridicas')
          .select('id')
          .eq('cnpj', xmlData.cnpjEmissor)
          .maybeSingle();
        if (existingFornecedor) {
          return { id: existingFornecedor.id, created: false };
        }
      }
      // Busca por razão social
      if (xmlData.razaoSocialEmissor) {
        const { data: existingByName } = await supabase
          .from('pessoas_juridicas')
          .select('id')
          .eq('razao_social', xmlData.razaoSocialEmissor)
          .maybeSingle();
        if (existingByName) {
          return { id: existingByName.id, created: false };
        }
      }
      // Cria novo fornecedor
      const { data: newFornecedor, error } = await supabase
        .from('pessoas_juridicas')
        .insert({
          razao_social: xmlData.razaoSocialEmissor || 'Fornecedor Importado',
          nome_fantasia: xmlData.nomeFantasiaEmissor || xmlData.razaoSocialEmissor,
          cnpj: xmlData.cnpjEmissor || null,
        })
        .select('id')
        .single();
      if (error) throw error;
      return { id: newFornecedor.id, created: true };
    } catch (error) {
      console.error('Erro ao criar/encontrar fornecedor:', error);
      throw error;
    }
  };

  // Cria a conta a pagar principal e suas parcelas
  const createContaPagar = async (xmlData: XMLData, fornecedorId: number): Promise<number> => {
    try {
      const descricaoCompleta = `NF ${xmlData.numeroNota || 'sem número'} - ${xmlData.razaoSocialEmissor}${
        xmlData.chaveAcesso ? '. Chave: ' + xmlData.chaveAcesso : ''}`;
      // Insere conta
      const { data: conta, error: contaError } = await supabase
        .from('contas_pagar')
        .insert({
          descricao: descricaoCompleta,
          numero_nf: xmlData.numeroNota || (xmlData.chaveAcesso?.slice(-8) || 'sem_numero'),
          fornecedor_id: fornecedorId,
          valor_total_centavos: xmlData.valorTotal,
          data_emissao: xmlData.dataEmissao || null,
          qtd_parcelas: xmlData.parcelas?.length || 1,
          categoria_id: null,
          filial_id: null,
        })
        .select('id')
        .single();
      if (contaError) throw contaError;
      // Insere parcelas
      if (xmlData.parcelas && xmlData.parcelas.length > 0) {
        const parcelasData = xmlData.parcelas.map((parcela) => ({
          conta_id: conta.id,
          numero_parcela: parcela.numero,
          valor_parcela_centavos: parcela.valor,
          vencimento: parcela.vencimento,
          pago: false,
        }));
        const { error: parcelasError } = await supabase
          .from('contas_pagar_parcelas')
          .insert(parcelasData);
        if (parcelasError) throw parcelasError;
      }
      return conta.id;
    } catch (error) {
      console.error('Erro ao criar conta a pagar:', error);
      throw error;
    }
  };

  // Processa um único arquivo: parseia, verifica duplicidade, cria fornecedor e conta
  const processFile = async (file: File): Promise<ProcessResult> => {
    try {
      const xmlData = await parseXMLFile(file);
      if (!xmlData) {
        return { success: false, message: `Erro ao processar XML: estrutura inválida`, fileName: file.name };
      }
      // Validar dados mínimos
      if (!xmlData.numeroNota && !xmlData.chaveAcesso) {
        return {
          success: false,
          message: `${file.name}: Não foi possível extrair número da NFe nem chave de acesso`,
          fileName: file.name,
        };
      }
      // Verificar duplicidade por número
      let isDuplicate = false;
      let duplicateReason = '';
      if (xmlData.numeroNota) {
        const { data: existingByNumber } = await supabase
          .from('contas_pagar')
          .select('id, numero_nf')
          .eq('numero_nf', xmlData.numeroNota)
          .limit(1);
        if (existingByNumber && existingByNumber.length > 0) {
          isDuplicate = true;
          duplicateReason = `número da NFe ${xmlData.numeroNota}`;
        }
      }
      // Verificar duplicidade por chave
      if (!isDuplicate && xmlData.chaveAcesso) {
        const { data: existingByKey } = await supabase
          .from('contas_pagar')
          .select('id, descricao')
          .ilike('descricao', `%${xmlData.chaveAcesso}%`)
          .limit(1);
        if (existingByKey && existingByKey.length > 0) {
          isDuplicate = true;
          duplicateReason = `chave de acesso ${xmlData.chaveAcesso.substring(0, 10)}...`;
        }
      }
      if (isDuplicate) {
        return {
          success: false,
          message: `⚠️ NFe ${xmlData.numeroNota || 'sem número'} já foi importada anteriormente (${duplicateReason})`,
          fileName: file.name,
        };
      }
      // Cria fornecedor e conta
      const fornecedor = await findOrCreateFornecedor(xmlData);
      const contaId = await createContaPagar(xmlData, fornecedor.id);
      return {
        success: true,
        message: `NF ${xmlData.numeroNota || 'sem número'} importada com sucesso`,
        contaId,
        fornecedorId: fornecedor.id,
        fornecedorCriado: fornecedor.created,
        fileName: file.name,
      };
    } catch (error: any) {
      return {
        success: false,
        message: `Erro ao processar ${file.name}: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
        fileName: file.name,
      };
    }
  };

  // Importa vários arquivos sequencialmente, atualizando a barra de progresso
  const importFiles = async (files: File[]): Promise<ProcessResult[]> => {
    if (files.length === 0) {
      throw new Error('Nenhum arquivo selecionado');
    }
    setProcessing(true);
    setProgress(0);
    const results: ProcessResult[] = [];
    try {
      for (let i = 0; i < files.length; i++) {
        const result = await processFile(files[i]);
        results.push(result);
        setProgress(((i + 1) / files.length) * 100);
      }
      const successCount = results.filter((r) => r.success).length;
      const errorCount = results.filter((r) => !r.success).length;
      toast({
        title: 'Importação Concluída',
        description: `${successCount} arquivo(s) importado(s) com sucesso. ${errorCount} erro(s).`,
        variant: successCount > 0 ? 'default' : 'destructive',
      });
      return results;
    } finally {
      setProcessing(false);
    }
  };

  return { importFiles, processing, progress };
}
