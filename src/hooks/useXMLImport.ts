import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface XMLData {
  numeroNota: string;
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

interface ProcessResult {
  success: boolean;
  message: string;
  contaId?: number;
  fornecedorId?: number;
  fornecedorCriado?: boolean;
  fileName?: string;
}

export function useXMLImport() {
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const { toast } = useToast();

  const parseXMLFile = async (file: File): Promise<XMLData | null> => {
    try {
      const text = await file.text();
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(text, 'text/xml');
      
      // Verificar se há erros de parsing
      const parseError = xmlDoc.querySelector('parsererror');
      if (parseError) {
        throw new Error('Erro ao fazer parse do XML');
      }

      // Tentar diferentes estruturas de XML (NFe, NFCe, etc.)
      let infNFe = xmlDoc.querySelector('infNFe');
      let emit = xmlDoc.querySelector('emit');
      let total = xmlDoc.querySelector('total ICMSTot');
      let ide = xmlDoc.querySelector('ide');
      let cobr = xmlDoc.querySelector('cobr');

      // Se não encontrou, tentar estrutura alternativa
      if (!infNFe) {
        infNFe = xmlDoc.querySelector('infNFCe');
      }

      if (!emit || !total || !ide) {
        throw new Error('XML não contém estrutura de NFe/NFCe válida');
      }

      // Dados do emissor
      const cnpjEmissor = emit.querySelector('CNPJ')?.textContent || 
                         emit.querySelector('CPF')?.textContent || '';
      const razaoSocialEmissor = emit.querySelector('xNome')?.textContent || '';
      const nomeFantasiaEmissor = emit.querySelector('xFant')?.textContent || '';

      // Dados da nota
      const numeroNota = ide.querySelector('nNF')?.textContent || 
                        ide.querySelector('nNFCe')?.textContent || '';
      
      let dataEmissao = ide.querySelector('dhEmi')?.textContent?.split('T')[0] || '';
      if (!dataEmissao) {
        dataEmissao = ide.querySelector('dEmi')?.textContent || '';
      }
      
      // Valor total
      const valorTotalStr = total.querySelector('vNF')?.textContent || 
                           total.querySelector('vProd')?.textContent || '0';
      const valorTotal = Math.round(parseFloat(valorTotalStr) * 100); // Converter para centavos

      // Extrair parcelas se existirem
      const parcelas: XMLData['parcelas'] = [];
      const duplicatas = cobr?.querySelectorAll('dup');
      
      if (duplicatas && duplicatas.length > 0) {
        duplicatas.forEach((dup, index) => {
          const valorDup = Math.round(parseFloat(dup.querySelector('vDup')?.textContent || '0') * 100);
          const vencimentoDup = dup.querySelector('dVenc')?.textContent || '';
          
          parcelas.push({
            numero: index + 1,
            valor: valorDup,
            vencimento: vencimentoDup
          });
        });
      } else {
        // Se não há parcelas definidas, criar uma única parcela com vencimento em 30 dias
        const dataVencimento = new Date();
        dataVencimento.setDate(dataVencimento.getDate() + 30);
        
        parcelas.push({
          numero: 1,
          valor: valorTotal,
          vencimento: dataVencimento.toISOString().split('T')[0]
        });
      }

      return {
        numeroNota,
        cnpjEmissor,
        razaoSocialEmissor,
        nomeFantasiaEmissor,
        valorTotal,
        dataEmissao,
        parcelas
      };
    } catch (error) {
      console.error('Erro ao processar XML:', error);
      throw error;
    }
  };

  const findOrCreateFornecedor = async (xmlData: XMLData): Promise<{ id: number; created: boolean }> => {
    try {
      // Primeiro, tentar encontrar fornecedor existente pelo CNPJ/CPF
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

      // Se não encontrou pelo CNPJ, tentar pela razão social
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

      // Se não encontrou, criar novo fornecedor
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

  const createContaPagar = async (xmlData: XMLData, fornecedorId: number): Promise<number> => {
    try {
      // Criar conta a pagar principal
      const { data: conta, error: contaError } = await supabase
        .from('contas_pagar')
        .insert({
          descricao: `NF ${xmlData.numeroNota} - ${xmlData.razaoSocialEmissor}`,
          numero_nf: xmlData.numeroNota,
          fornecedor_id: fornecedorId,
          valor_total_centavos: xmlData.valorTotal,
          data_emissao: xmlData.dataEmissao || null,
          qtd_parcelas: xmlData.parcelas?.length || 1,
        })
        .select('id')
        .single();

      if (contaError) throw contaError;

      // Criar parcelas
      if (xmlData.parcelas && xmlData.parcelas.length > 0) {
        const parcelasData = xmlData.parcelas.map(parcela => ({
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

  const processFile = async (file: File): Promise<ProcessResult> => {
    try {
      const xmlData = await parseXMLFile(file);
      
      if (!xmlData) {
        return {
          success: false,
          message: `Erro ao processar XML: estrutura inválida`,
          fileName: file.name,
        };
      }

      // Verificar se a nota já foi importada
      if (xmlData.numeroNota) {
        const { data: existingConta } = await supabase
          .from('contas_pagar')
          .select('id')
          .eq('numero_nf', xmlData.numeroNota)
          .maybeSingle();

        if (existingConta) {
          return {
            success: false,
            message: `NF ${xmlData.numeroNota} já foi importada anteriormente`,
            fileName: file.name,
          };
        }
      }

      const fornecedor = await findOrCreateFornecedor(xmlData);
      const contaId = await createContaPagar(xmlData, fornecedor.id);

      return {
        success: true,
        message: `NF ${xmlData.numeroNota} importada com sucesso`,
        contaId,
        fornecedorId: fornecedor.id,
        fornecedorCriado: fornecedor.created,
        fileName: file.name,
      };
    } catch (error) {
      return {
        success: false,
        message: `Erro ao processar ${file.name}: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
        fileName: file.name,
      };
    }
  };

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

      const successCount = results.filter(r => r.success).length;
      const errorCount = results.filter(r => !r.success).length;

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

  return {
    importFiles,
    processing,
    progress,
  };
}
