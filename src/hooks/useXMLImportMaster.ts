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
  duplicatas: {
    numero: string;
    valor: number;
    vencimento: string | null;
  }[];
}

interface ProcessResult {
  success: boolean;
  message: string;
  fileName?: string;
  xmlData?: XMLData;
}

export function useXMLImport() {
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const { toast } = useToast();

  // Parser XML baseado na estratégia do financeirolb
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

      // Extrair dados da nota fiscal - EXATAMENTE como no financeirolb
      const nfeElement = xmlDoc.querySelector('infNFe') || xmlDoc.querySelector('NFe');
      if (!nfeElement) {
        throw new Error('Estrutura de NFe não encontrada');
      }

      // Extrair número da NFe usando múltiplos seletores - ESTRATÉGIA FINANCEIROLB
      let nfeNumber = '';
      const possibleSelectors = [
        'ide nNF',
        'nNF', 
        'infNFe ide nNF',
        'NFe infNFe ide nNF'
      ];
      
      for (const selector of possibleSelectors) {
        const element = xmlDoc.querySelector(selector);
        if (element && element.textContent?.trim()) {
          nfeNumber = element.textContent.trim();
          console.log(`Número NFe encontrado usando seletor "${selector}": ${nfeNumber}`);
          break;
        }
      }

      // Extrair chave de acesso - ESTRATÉGIA FINANCEIROLB
      let chaveAcesso = '';
      const chaveSelectors = [
        'infNFe[Id]',
        'NFe infNFe[Id]',
        'nfeProc NFe infNFe[Id]'
      ];
      
      for (const selector of chaveSelectors) {
        const element = xmlDoc.querySelector(selector);
        if (element) {
          const idAttr = element.getAttribute('Id');
          if (idAttr) {
            chaveAcesso = idAttr.replace('NFe', '').trim();
            console.log(`Chave de acesso encontrada: ${chaveAcesso}`);
            break;
          }
        }
      }

      // Se não tem número mas tem chave, extrair da chave - ESTRATÉGIA FINANCEIROLB
      if (!nfeNumber && chaveAcesso) {
        nfeNumber = chaveAcesso.substring(25, 34);
        console.log(`Número NFe extraído da chave de acesso: ${nfeNumber}`);
      }

      // Se ainda não tem número, tentar extrair do nome do arquivo - ESTRATÉGIA FINANCEIROLB
      if (!nfeNumber && file.name) {
        const fileNumberMatch = file.name.match(/(\d{8,9})/);
        if (fileNumberMatch) {
          nfeNumber = fileNumberMatch[1];
          console.log(`Número NFe extraído do nome do arquivo: ${nfeNumber}`);
        }
      }

      console.log(`NFe processando: ${file.name} - Número: "${nfeNumber}", Chave: "${chaveAcesso}"`);

      // Validar se conseguiu extrair dados mínimos necessários - ESTRATÉGIA FINANCEIROLB
      if (!nfeNumber && !chaveAcesso) {
        throw new Error('Não foi possível extrair número da NFe nem chave de acesso');
      }

      // Extrair dados do fornecedor - ESTRATÉGIA FINANCEIROLB
      const emit = xmlDoc.querySelector('emit');
      if (!emit) {
        throw new Error('Dados do fornecedor não encontrados');
      }

      const cnpjEmitente = emit.querySelector('CNPJ')?.textContent || '';
      const razaoSocialEmitente = emit.querySelector('xNome')?.textContent || 'Fornecedor não identificado';
      const nomeFantasiaEmitente = emit.querySelector('xFant')?.textContent || null;

      if (!cnpjEmitente || !razaoSocialEmitente) {
        throw new Error('CNPJ ou razão social do emitente não encontrados');
      }

      // Extrair valor total - ESTRATÉGIA FINANCEIROLB
      const totalElement = xmlDoc.querySelector('vNF');
      const valorTotal = parseFloat(totalElement?.textContent || '0');
      
      if (isNaN(valorTotal) || valorTotal <= 0) {
        throw new Error('Valor total inválido');
      }

      // Extrair data de emissão - ESTRATÉGIA FINANCEIROLB
      const dataEmissao = xmlDoc.querySelector('dhEmi')?.textContent?.split('T')[0] || 
                         new Date().toISOString().split('T')[0];

      // Extrair duplicatas - ESTRATÉGIA FINANCEIROLB
      const duplicatas: { numero: string; valor: number; vencimento: string | null }[] = [];
      const duplicatasXML = xmlDoc.querySelectorAll('dup');
      
      if (duplicatasXML.length > 0) {
        duplicatasXML.forEach((dup, index) => {
          const valorParcela = parseFloat(dup.querySelector('vDup')?.textContent || '0');
          const vencimentoParcela = dup.querySelector('dVenc')?.textContent || null;
          
          if (valorParcela > 0) {
            duplicatas.push({
              numero: (index + 1).toString(),
              valor: valorParcela,
              vencimento: vencimentoParcela
            });
          }
        });
      } else {
        // Se não há duplicatas, criar parcela única - ESTRATÉGIA FINANCEIROLB
        duplicatas.push({
          numero: '1',
          valor: valorTotal,
          vencimento: null
        });
      }

      return {
        numeroNFe: nfeNumber,
        chaveAcesso,
        cnpjEmitente,
        razaoSocialEmitente,
        nomeFantasiaEmitente,
        valorTotal,
        dataEmissao,
        duplicatas
      };

    } catch (error) {
      console.error('Erro ao processar XML:', error);
      throw error;
    }
  };

  // Verificação de duplicatas - busca pelo campo numero_nota
  const verificarDuplicata = async (xmlData: XMLData): Promise<{ isDuplicate: boolean; reason: string }> => {
    try {
      const chaveOuNumero = xmlData.chaveAcesso || xmlData.numeroNFe;
      if (chaveOuNumero) {
        const { data: existing, error } = await supabase
          .from('contas_pagar')
          .select('id')
          .eq('numero_nota', chaveOuNumero)
          .limit(1);
        
        if (!error && existing && existing.length > 0) {
          return {
            isDuplicate: true,
            reason: `chave/número ${chaveOuNumero.substring(0, 15)}...`
          };
        }
      }

      return { isDuplicate: false, reason: '' };
    } catch (error) {
      console.error('Erro ao verificar duplicata:', error);
      return { isDuplicate: false, reason: '' };
    }
  };

  // Buscar ou criar fornecedor - ADAPTADO DA ESTRATÉGIA FINANCEIROLB
  const buscarOuCriarFornecedor = async (xmlData: XMLData): Promise<number | null> => {
    try {
      // Primeiro tentar encontrar fornecedor existente - ESTRATÉGIA FINANCEIROLB
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
        console.log(`Fornecedor existente encontrado: ${existingFornecedor.id}`);
        return existingFornecedor.id;
      }

      // Criar novo fornecedor - ESTRATÉGIA FINANCEIROLB
      console.log(`Criando novo fornecedor para: ${xmlData.razaoSocialEmitente}`);
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
      
      if (!newFornecedor || !newFornecedor.id) {
        console.error('ID do fornecedor não retornado');
        return null;
      }
      
      console.log(`Novo fornecedor criado: ${newFornecedor.id}`);
      return newFornecedor.id;

    } catch (error) {
      console.error('Erro ao buscar/criar fornecedor:', error);
      return null;
    }
  };

  // Criar contas a pagar com parcelas
  const criarContasPagar = async (xmlData: XMLData, fornecedorId: number | null): Promise<boolean> => {
    try {
      const numParcelas = xmlData.duplicatas.length || 1;
      const valorTotal = Math.round(xmlData.valorTotal * 100);

      // 1. Criar UMA conta_pagar
      const { data: contaCriada, error: insertError } = await supabase
        .from('contas_pagar')
        .insert([{
          valor_total_centavos: valorTotal,
          fornecedor_id: fornecedorId,
          num_parcelas: numParcelas,
          categoria_id: null,
          filial_id: null,
          descricao: `NFe ${xmlData.numeroNFe || 'sem número'} - ${xmlData.razaoSocialEmitente}`,
          referencia: `NFe ${xmlData.numeroNFe || 'sem número'}`,
          numero_nota: xmlData.chaveAcesso || xmlData.numeroNFe
        }])
        .select('id')
        .single();

      if (insertError || !contaCriada) {
        console.error('Erro ao inserir conta:', insertError);
        return false;
      }

      // 2. Criar parcelas em contas_pagar_parcelas
      const parcelas = xmlData.duplicatas.length > 0
        ? xmlData.duplicatas.map((parcela, i) => {
            let vencimento = parcela.vencimento || xmlData.dataEmissao;
            if (!vencimento) {
              const dataVenc = new Date(xmlData.dataEmissao);
              dataVenc.setDate(dataVenc.getDate() + 30 * (i + 1));
              vencimento = dataVenc.toISOString().split('T')[0];
            }
            return {
              conta_id: contaCriada.id,
              numero_parcela: i + 1,
              valor_centavos: Math.round(parcela.valor * 100),
              vencimento,
              pago: false
            };
          })
        : [{
            conta_id: contaCriada.id,
            numero_parcela: 1,
            valor_centavos: valorTotal,
            vencimento: xmlData.dataEmissao || new Date().toISOString().split('T')[0],
            pago: false
          }];

      const { error: parcelasError } = await supabase
        .from('contas_pagar_parcelas')
        .insert(parcelas);

      if (parcelasError) {
        console.error('Erro ao inserir parcelas:', parcelasError);
        // Conta foi criada mas parcelas falharam - ainda retorna true
      }

      console.log(`NFe ${xmlData.numeroNFe || 'sem número'} importada: 1 conta + ${parcelas.length} parcela(s)`);
      return true;

    } catch (error) {
      console.error('Erro ao criar contas a pagar:', error);
      return false;
    }
  };

  // Processar um arquivo XML - ESTRATÉGIA FINANCEIROLB
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

      // 2. Verificar duplicata - ESTRATÉGIA FINANCEIROLB
      const { isDuplicate, reason } = await verificarDuplicata(xmlData);
      if (isDuplicate) {
        return {
          success: false,
          message: `⚠️ NFe ${xmlData.numeroNFe || 'sem número'} já foi importada anteriormente (${reason})`,
          fileName: file.name,
          xmlData
        };
      }

      // 3. Buscar ou criar fornecedor - ESTRATÉGIA FINANCEIROLB
      const fornecedorId = await buscarOuCriarFornecedor(xmlData);
      // Continuar mesmo se não conseguir criar fornecedor (como no financeirolb)

      // 4. Criar contas a pagar - ESTRATÉGIA FINANCEIROLB
      const contasCriadas = await criarContasPagar(xmlData, fornecedorId);
      if (!contasCriadas) {
        return {
          success: false,
          message: 'Falha ao criar contas a pagar',
          fileName: file.name,
          xmlData
        };
      }

      return {
        success: true,
        message: `✅ NFe ${xmlData.numeroNFe || 'sem número'} importada com sucesso - R$ ${xmlData.valorTotal.toFixed(2)} (${xmlData.duplicatas.length} ${xmlData.duplicatas.length === 1 ? 'conta' : 'parcelas'})`,
        fileName: file.name,
        xmlData
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

  // Importar múltiplos arquivos - ESTRATÉGIA FINANCEIROLB
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
        
        // Pequena pausa para não sobrecarregar - ESTRATÉGIA FINANCEIROLB
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Mostrar resumo - ESTRATÉGIA FINANCEIROLB
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
