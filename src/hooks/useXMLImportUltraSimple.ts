import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface XMLData {
  numeroNFe: string;
  chaveAcesso: string;
  cnpjEmitente: string;
  razaoSocialEmitente: string;
  nomeFantasiaEmitente?: string;
  valorTotal: number;
  dataEmissao: string;
}

interface ProcessResult {
  success: boolean;
  message: string;
  fileName?: string;
}

export function useXMLImport() {
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const { toast } = useToast();

  // Parser XML ultra-simplificado
  const parseXMLFile = async (file: File): Promise<XMLData | null> => {
    try {
      const xmlContent = await file.text();
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlContent, 'text/xml');
      
      // Verificar se há erros de parsing
      const parserError = xmlDoc.querySelector('parsererror');
      if (parserError) {
        throw new Error('XML inválido ou corrompido');
      }

      // Extrair número da NFe
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
      const chaveSelectors = ['infNFe[Id]', 'NFe infNFe[Id]', 'nfeProc NFe infNFe[Id]'];
      
      for (const selector of chaveSelectors) {
        const element = xmlDoc.querySelector(selector);
        if (element) {
          const idAttr = element.getAttribute('Id');
          if (idAttr) {
            chaveAcesso = idAttr.replace('NFe', '').trim();
            break;
          }
        }
      }

      // Se não tem número mas tem chave, extrair da chave
      if (!nfeNumber && chaveAcesso) {
        nfeNumber = chaveAcesso.substring(25, 34);
      }

      // Se ainda não tem número, tentar extrair do nome do arquivo
      if (!nfeNumber && file.name) {
        const fileNumberMatch = file.name.match(/(\d{8,9})/);
        if (fileNumberMatch) {
          nfeNumber = fileNumberMatch[1];
        }
      }

      // Extrair dados do fornecedor
      const emit = xmlDoc.querySelector('emit');
      if (!emit) {
        throw new Error('Dados do fornecedor não encontrados');
      }

      const cnpjEmitente = emit.querySelector('CNPJ')?.textContent || '';
      const razaoSocialEmitente = emit.querySelector('xNome')?.textContent || 'Fornecedor não identificado';
      const nomeFantasiaEmitente = emit.querySelector('xFant')?.textContent || null;

      // Extrair valor total
      const totalElement = xmlDoc.querySelector('vNF');
      const valorTotal = parseFloat(totalElement?.textContent || '0');
      
      if (isNaN(valorTotal) || valorTotal <= 0) {
        throw new Error('Valor total inválido');
      }

      // Extrair data de emissão
      const dataEmissao = xmlDoc.querySelector('dhEmi')?.textContent?.split('T')[0] || 
                         new Date().toISOString().split('T')[0];

      return {
        numeroNFe: nfeNumber,
        chaveAcesso,
        cnpjEmitente,
        razaoSocialEmitente,
        nomeFantasiaEmitente,
        valorTotal,
        dataEmissao
      };

    } catch (error) {
      console.error('Erro ao processar XML:', error);
      throw error;
    }
  };

  // Verificação de duplicatas APENAS por chave_nfe (campo que existe)
  const verificarDuplicata = async (xmlData: XMLData): Promise<boolean> => {
    try {
      if (!xmlData.chaveAcesso) {
        return false; // Se não tem chave, não pode verificar duplicata
      }

      const { data: existing, error } = await supabase
        .from('contas_pagar')
        .select('id')
        .eq('chave_nfe', xmlData.chaveAcesso)
        .limit(1);
      
      if (error) {
        console.error('Erro ao verificar duplicata:', error);
        return false;
      }

      return existing && existing.length > 0;
    } catch (error) {
      console.error('Erro ao verificar duplicata:', error);
      return false;
    }
  };

  // Buscar ou criar fornecedor
  const buscarOuCriarFornecedor = async (xmlData: XMLData): Promise<number | null> => {
    try {
      // Primeiro tentar encontrar fornecedor existente
      const { data: existingFornecedor, error: selectError } = await supabase
        .from('pessoas_juridicas')
        .select('id')
        .eq('cnpj', xmlData.cnpjEmitente)
        .maybeSingle();
      
      if (selectError) {
        console.error('Erro ao buscar fornecedor:', selectError);
        return null;
      }
      
      if (existingFornecedor) {
        return existingFornecedor.id;
      }

      // Criar novo fornecedor
      const { data: newFornecedor, error: fornecedorError } = await supabase
        .from('pessoas_juridicas')
        .insert({
          razao_social: xmlData.razaoSocialEmitente,
          nome_fantasia: xmlData.nomeFantasiaEmitente,
          cnpj: xmlData.cnpjEmitente,
          ativo: true
        })
        .select('id')
        .single();
      
      if (fornecedorError) {
        console.error('Erro ao criar fornecedor:', fornecedorError);
        return null;
      }
      
      return newFornecedor?.id || null;

    } catch (error) {
      console.error('Erro ao buscar/criar fornecedor:', error);
      return null;
    }
  };

  // Buscar categoria e filial padrão
  const buscarDadosPadrao = async () => {
    try {
      const { data: categorias } = await supabase
        .from('categorias_financeiras')
        .select('id')
        .limit(1);
      
      const { data: filiais } = await supabase
        .from('filiais')
        .select('id')
        .limit(1);

      return {
        categoriaId: categorias && categorias.length > 0 ? categorias[0].id : null,
        filialId: filiais && filiais.length > 0 ? filiais[0].id : null
      };
    } catch (error) {
      console.error('Erro ao buscar dados padrão:', error);
      return { categoriaId: null, filialId: null };
    }
  };

  // Criar conta APENAS na tabela principal (sem parcelas)
  const criarContaPrincipal = async (xmlData: XMLData, fornecedorId: number | null): Promise<boolean> => {
    try {
      const { categoriaId, filialId } = await buscarDadosPadrao();
      
      if (!categoriaId || !filialId) {
        console.error('Categoria ou filial não encontradas');
        return false;
      }

      // Criar APENAS a conta principal - SEM PARCELAS
      const { error: contaError } = await supabase
        .from('contas_pagar')
        .insert({
          fornecedor_id: fornecedorId,
          categoria_id: categoriaId,
          filial_id: filialId,
          descricao: `NFe ${xmlData.numeroNFe || 'sem número'} - ${xmlData.razaoSocialEmitente}`,
          numero_nota: xmlData.numeroNFe,
          chave_nfe: xmlData.chaveAcesso,
          valor_total_centavos: Math.round(xmlData.valorTotal * 100),
          num_parcelas: 1, // Sempre 1 parcela para simplificar
          referencia: `Importado de XML em ${new Date().toLocaleDateString('pt-BR')}`
        });
      
      if (contaError) {
        console.error('Erro ao criar conta principal:', contaError);
        return false;
      }

      return true;

    } catch (error) {
      console.error('Erro ao criar conta principal:', error);
      return false;
    }
  };

  // Processar um arquivo XML
  const processFile = async (file: File): Promise<ProcessResult> => {
    try {
      console.log(`Processando arquivo: ${file.name}`);
      
      // 1. Parse do XML
      const xmlData = await parseXMLFile(file);
      if (!xmlData) {
        return {
          success: false,
          message: 'Falha ao processar XML',
          fileName: file.name
        };
      }

      // 2. Verificar duplicata
      const isDuplicate = await verificarDuplicata(xmlData);
      if (isDuplicate) {
        return {
          success: false,
          message: `⚠️ NFe ${xmlData.numeroNFe || 'sem número'} já foi importada anteriormente`,
          fileName: file.name
        };
      }

      // 3. Buscar ou criar fornecedor
      const fornecedorId = await buscarOuCriarFornecedor(xmlData);

      // 4. Criar conta principal (sem parcelas)
      const contaCriada = await criarContaPrincipal(xmlData, fornecedorId);
      if (!contaCriada) {
        return {
          success: false,
          message: 'Falha ao criar conta a pagar',
          fileName: file.name
        };
      }

      return {
        success: true,
        message: `✅ NFe ${xmlData.numeroNFe || 'sem número'} importada com sucesso - R$ ${xmlData.valorTotal.toFixed(2)}`,
        fileName: file.name
      };

    } catch (error) {
      console.error('Erro ao processar arquivo:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Erro desconhecido',
        fileName: file.name
      };
    }
  };

  // Importar múltiplos arquivos
  const importFiles = async (files: File[]): Promise<ProcessResult[]> => {
    if (files.length === 0) {
      toast({
        title: "Nenhum arquivo selecionado",
        description: "Selecione pelo menos um arquivo XML para importar.",
        variant: "destructive",
      });
      return [];
    }

    setProcessing(true);
    setProgress(0);

    const results: ProcessResult[] = [];
    const errors: string[] = [];
    const warnings: string[] = [];
    let totalImported = 0;
    
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setProgress(((i + 1) / files.length) * 100);
        
        const result = await processFile(file);
        results.push(result);
        
        if (result.success) {
          totalImported++;
        } else {
          if (result.message.includes('⚠️')) {
            warnings.push(result.message);
          } else {
            errors.push(`❌ ${result.fileName}: ${result.message}`);
          }
        }
        
        // Pequena pausa para não sobrecarregar
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Mostrar resumo
      if (totalImported > 0) {
        toast({
          title: "Importação concluída",
          description: `${totalImported} arquivo(s) importado(s) com sucesso.`,
        });
      }

      if (warnings.length > 0) {
        console.log('Avisos:', warnings);
      }

      if (errors.length > 0) {
        toast({
          title: "Alguns arquivos falharam",
          description: `${errors.length} arquivo(s) não puderam ser importados.`,
          variant: "destructive",
        });
        console.error('Erros:', errors);
      }

    } catch (error) {
      console.error('Erro na importação:', error);
      toast({
        title: "Erro na importação",
        description: "Ocorreu um erro durante a importação dos arquivos.",
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
      setProgress(0);
    }

    return results;
  };

  return {
    importFiles,
    processing,
    progress
  };
}
