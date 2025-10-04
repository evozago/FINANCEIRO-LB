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
  cnpjDestinatario: string;
  razaoSocialDestinatario: string;
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

  // Parser XML (mantido - já funciona 100%)
  const parseXMLFile = async (file: File): Promise<XMLData | null> => {
    try {
      const xmlContent = await file.text();
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlContent, 'text/xml');
      
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

      if (!nfeNumber && chaveAcesso) {
        nfeNumber = chaveAcesso.substring(25, 34);
      }

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

      // Extrair dados do destinatário (nossa empresa/filial)
      const dest = xmlDoc.querySelector('dest');
      if (!dest) {
        throw new Error('Dados do destinatário não encontrados');
      }

      const cnpjDestinatario = dest.querySelector('CNPJ')?.textContent || '';
      const razaoSocialDestinatario = dest.querySelector('xNome')?.textContent || '';
      
      if (!cnpjDestinatario) {
        throw new Error('CNPJ do destinatário não encontrado');
      }

      // Extrair data de emissão
      const dataEmissao = xmlDoc.querySelector('dhEmi')?.textContent?.split('T')[0] || 
                         new Date().toISOString().split('T')[0];

      console.log(`✅ XML parseado: NFe ${nfeNumber}, Valor: R$ ${valorTotal}`);
      console.log(`📤 Fornecedor: ${razaoSocialEmitente} (${cnpjEmitente})`);
      console.log(`📥 Destinatário: ${razaoSocialDestinatario} (${cnpjDestinatario})`);

      return {
        numeroNFe: nfeNumber,
        chaveAcesso,
        cnpjEmitente,
        razaoSocialEmitente,
        nomeFantasiaEmitente,
        valorTotal,
        dataEmissao,
        cnpjDestinatario,
        razaoSocialDestinatario
      };

    } catch (error) {
      console.error('❌ Erro ao processar XML:', error);
      throw error;
    }
  };

  // Verificação de duplicatas
  const verificarDuplicata = async (xmlData: XMLData): Promise<boolean> => {
    try {
      if (!xmlData.chaveAcesso) {
        console.log('⚠️ Sem chave de acesso, não pode verificar duplicata');
        return false;
      }

      console.log(`🔍 Verificando duplicata para chave: ${xmlData.chaveAcesso}`);

      const { data: existing, error } = await supabase
        .from('contas_pagar')
        .select('id')
        .eq('chave_nfe', xmlData.chaveAcesso)
        .limit(1);
      
      if (error) {
        console.error('❌ Erro ao verificar duplicata:', error);
        return false;
      }

      const isDuplicate = existing && existing.length > 0;
      console.log(`${isDuplicate ? '⚠️ Duplicata encontrada' : '✅ Não é duplicata'}`);
      
      return isDuplicate;
    } catch (error) {
      console.error('❌ Erro ao verificar duplicata:', error);
      return false;
    }
  };

  // Buscar ou criar fornecedor com logs detalhados
  const buscarOuCriarFornecedor = async (xmlData: XMLData): Promise<number> => {
    try {
      console.log(`🔍 Buscando fornecedor com CNPJ: ${xmlData.cnpjEmitente}`);

      // Primeiro tentar encontrar fornecedor existente
      const { data: existingFornecedor, error: selectError } = await supabase
        .from('pessoas_juridicas')
        .select('id')
        .eq('cnpj', xmlData.cnpjEmitente)
        .maybeSingle();
      
      if (selectError) {
        console.error('❌ Erro ao buscar fornecedor:', selectError);
        throw new Error(`Erro ao buscar fornecedor: ${selectError.message}`);
      }
      
      if (existingFornecedor) {
        console.log(`✅ Fornecedor existente encontrado: ID ${existingFornecedor.id}`);
        return existingFornecedor.id;
      }

      // Criar novo fornecedor
      console.log(`➕ Criando novo fornecedor: ${xmlData.razaoSocialEmitente}`);
      
      const { data: newFornecedor, error: fornecedorError } = await supabase
        .from('pessoas_juridicas')
        .insert({
          razao_social: xmlData.razaoSocialEmitente,
          nome_fantasia: xmlData.nomeFantasiaEmitente,
          cnpj: xmlData.cnpjEmitente
        })
        .select('id')
        .single();
      
      if (fornecedorError) {
        console.error('❌ Erro ao criar fornecedor:', fornecedorError);
        throw new Error(`Erro ao criar fornecedor: ${fornecedorError.message}`);
      }
      
      if (!newFornecedor || !newFornecedor.id) {
        throw new Error('ID do fornecedor não retornado');
      }
      
      console.log(`✅ Novo fornecedor criado: ID ${newFornecedor.id}`);
      return newFornecedor.id;

    } catch (error) {
      console.error('❌ Erro crítico ao buscar/criar fornecedor:', error);
      throw error;
    }
  };

  // Buscar filial baseada no CNPJ do destinatário do XML
  const buscarFilialPorCNPJ = async (xmlData: XMLData): Promise<number> => {
    try {
      console.log(`🔍 Buscando filial para CNPJ: ${xmlData.cnpjDestinatario}...`);
      
      // Buscar filial através do JOIN com pessoas_juridicas pelo CNPJ
      const { data: filialEncontrada, error: filialError } = await supabase
        .from('filiais')
        .select(`
          id, 
          nome,
          pessoas_juridicas!inner(
            id,
            cnpj,
            razao_social
          )
        `)
        .eq('pessoas_juridicas.cnpj', xmlData.cnpjDestinatario)
        .single();

      if (filialError) {
        if (filialError.code === 'PGRST116') {
          throw new Error(`Filial não encontrada para CNPJ ${xmlData.cnpjDestinatario}. A empresa destinatária deve estar cadastrada no sistema antes de importar XMLs.`);
        }
        console.error('❌ Erro ao buscar filial:', filialError);
        throw new Error(`Erro ao buscar filial: ${filialError.message}`);
      }

      if (!filialEncontrada) {
        throw new Error(`Filial não encontrada para CNPJ ${xmlData.cnpjDestinatario}. Verifique se a empresa está cadastrada no sistema.`);
      }

      console.log(`✅ Filial encontrada: ID ${filialEncontrada.id} (${filialEncontrada.nome})`);
      console.log(`📋 Empresa: ${(filialEncontrada.pessoas_juridicas as any).razao_social}`);

      return filialEncontrada.id;
    } catch (error) {
      console.error('❌ Erro ao buscar filial:', error);
      throw error;
    }
  };

  // Buscar categoria padrão
  const buscarCategoriaPadrao = async (): Promise<number> => {
    try {
      console.log('🔍 Buscando categoria padrão...');
      const { data: categorias, error: catError } = await supabase
        .from('categorias_financeiras')
        .select('id, nome')
        .limit(1);

      if (catError) {
        console.error('❌ Erro ao buscar categoria:', catError);
        throw new Error(`Erro ao buscar categoria: ${catError.message}`);
      }

      if (!categorias || categorias.length === 0) {
        throw new Error('Nenhuma categoria encontrada no sistema');
      }

      console.log(`✅ Categoria encontrada: ID ${categorias[0].id} (${categorias[0].nome})`);
      return categorias[0].id;
    } catch (error) {
      console.error('❌ Erro ao buscar categoria padrão:', error);
      throw error;
    }
  };

  // Criar conta principal com logs detalhados
  const criarContaPrincipal = async (xmlData: XMLData, fornecedorId: number): Promise<boolean> => {
    try {
      console.log('📝 Iniciando criação da conta a pagar...');

      const categoriaId = await buscarCategoriaPadrao();
      const filialId = await buscarFilialPorCNPJ(xmlData);

      const contaData = {
        fornecedor_id: fornecedorId,
        categoria_id: categoriaId,
        filial_id: filialId,
        descricao: `NFe ${xmlData.numeroNFe || 'sem número'} - ${xmlData.razaoSocialEmitente}`,
        numero_nota: xmlData.numeroNFe,
        chave_nfe: xmlData.chaveAcesso,
        valor_total_centavos: Math.round(xmlData.valorTotal * 100),
        num_parcelas: 1,
        referencia: `Importado de XML em ${new Date().toLocaleDateString('pt-BR')}`
      };

      console.log('📝 Dados da conta a ser criada:', contaData);

      const { data: contaCriada, error: contaError } = await supabase
        .from('contas_pagar')
        .insert(contaData)
        .select('id')
        .single();
      
      if (contaError) {
        console.error('❌ Erro ao criar conta principal:', contaError);
        throw new Error(`Erro ao criar conta: ${contaError.message}`);
      }

      if (!contaCriada || !contaCriada.id) {
        throw new Error('ID da conta não retornado');
      }

      console.log(`✅ Conta a pagar criada com sucesso: ID ${contaCriada.id}`);
      return true;

    } catch (error) {
      console.error('❌ Erro ao criar conta principal:', error);
      throw error;
    }
  };

  // Processar um arquivo XML
  const processFile = async (file: File): Promise<ProcessResult> => {
    try {
      console.log(`\n🚀 Processando arquivo: ${file.name}`);
      
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

      // 4. Criar conta principal
      await criarContaPrincipal(xmlData, fornecedorId);

      const successMessage = `✅ NFe ${xmlData.numeroNFe || 'sem número'} importada com sucesso - R$ ${xmlData.valorTotal.toFixed(2)}`;
      console.log(successMessage);

      return {
        success: true,
        message: successMessage,
        fileName: file.name
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      console.error(`❌ Erro ao processar ${file.name}:`, errorMessage);
      
      return {
        success: false,
        message: errorMessage,
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
      console.log(`\n📁 Iniciando importação de ${files.length} arquivo(s)`);

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

      console.log(`\n📊 Resumo da importação:`);
      console.log(`✅ Sucessos: ${totalImported}`);
      console.log(`⚠️ Avisos: ${warnings.length}`);
      console.log(`❌ Erros: ${errors.length}`);

      // Mostrar resumo
      if (totalImported > 0) {
        toast({
          title: "Importação concluída",
          description: `${totalImported} arquivo(s) importado(s) com sucesso.`,
        });
      }

      if (warnings.length > 0) {
        console.log('⚠️ Avisos:', warnings);
      }

      if (errors.length > 0) {
        toast({
          title: "Alguns arquivos falharam",
          description: `${errors.length} arquivo(s) não puderam ser importados.`,
          variant: "destructive",
        });
        console.error('❌ Erros:', errors);
      }

    } catch (error) {
      console.error('❌ Erro na importação:', error);
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
