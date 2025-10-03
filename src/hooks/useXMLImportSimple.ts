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

  // Função para extrair texto com múltiplos seletores
  const getTextContent = (selectors: string[], xmlDoc: Document): string | null => {
    for (const selector of selectors) {
      const elements = xmlDoc.querySelectorAll(selector);
      for (const element of elements) {
        if (element && element.textContent && element.textContent.trim()) {
          return element.textContent.trim();
        }
      }
    }
    return null;
  };

  // Parser XML simplificado e robusto
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

      // Verificar se existe infNFe
      const infNFe = xmlDoc.querySelector('infNFe');
      if (!infNFe) {
        throw new Error('Estrutura de NFe não encontrada no XML');
      }

      // 1. Extrair chave de acesso (do atributo Id)
      const infNFeElement = xmlDoc.querySelector('infNFe[Id]');
      let chaveAcesso = '';
      if (infNFeElement) {
        const idAttr = infNFeElement.getAttribute('Id');
        if (idAttr) {
          chaveAcesso = idAttr.replace('NFe', '').trim();
        }
      }

      // 2. Extrair número da NFe
      const numeroNFe = getTextContent([
        'ide nNF',
        'infNFe ide nNF',
        'NFe infNFe ide nNF',
        'nfeProc NFe infNFe ide nNF'
      ], xmlDoc);

      if (!numeroNFe) {
        throw new Error('Número da NFe não encontrado');
      }

      // 3. Extrair dados do emitente
      const cnpjEmitente = getTextContent([
        'emit CNPJ',
        'infNFe emit CNPJ',
        'NFe infNFe emit CNPJ',
        'nfeProc NFe infNFe emit CNPJ'
      ], xmlDoc);

      const razaoSocialEmitente = getTextContent([
        'emit xNome',
        'infNFe emit xNome',
        'NFe infNFe emit xNome',
        'nfeProc NFe infNFe emit xNome'
      ], xmlDoc);

      const nomeFantasiaEmitente = getTextContent([
        'emit xFant',
        'infNFe emit xFant',
        'NFe infNFe emit xFant',
        'nfeProc NFe infNFe emit xFant'
      ], xmlDoc);

      if (!cnpjEmitente || !razaoSocialEmitente) {
        throw new Error('Dados do emitente não encontrados');
      }

      // 4. Extrair valor total
      const valorTotalStr = getTextContent([
        'total ICMSTot vNF',
        'infNFe total ICMSTot vNF',
        'NFe infNFe total ICMSTot vNF',
        'nfeProc NFe infNFe total ICMSTot vNF'
      ], xmlDoc);

      if (!valorTotalStr) {
        throw new Error('Valor total da NFe não encontrado');
      }

      const valorTotal = parseFloat(valorTotalStr);
      if (isNaN(valorTotal) || valorTotal <= 0) {
        throw new Error('Valor total inválido');
      }

      // 5. Extrair data de emissão
      const dataEmissao = getTextContent([
        'ide dhEmi',
        'infNFe ide dhEmi',
        'NFe infNFe ide dhEmi',
        'nfeProc NFe infNFe ide dhEmi'
      ], xmlDoc) || '';

      // 6. Extrair parcelas/duplicatas
      const duplicatas: { numero: string; valor: number; vencimento: string | null }[] = [];
      
      // Buscar duplicatas em diferentes estruturas
      const dupSelectors = [
        'cobr dup',
        'infNFe cobr dup',
        'NFe infNFe cobr dup',
        'nfeProc NFe infNFe cobr dup'
      ];

      let duplicatasEncontradas = false;
      for (const selector of dupSelectors) {
        const dupElements = xmlDoc.querySelectorAll(selector);
        if (dupElements.length > 0) {
          duplicatasEncontradas = true;
          
          dupElements.forEach((dup, index) => {
            const numeroParcela = dup.querySelector('nDup')?.textContent || (index + 1).toString();
            const valorParcelaStr = dup.querySelector('vDup')?.textContent;
            const vencimentoParcela = dup.querySelector('dVenc')?.textContent || null;
            
            if (valorParcelaStr) {
              const valorParcela = parseFloat(valorParcelaStr);
              if (!isNaN(valorParcela) && valorParcela > 0) {
                duplicatas.push({
                  numero: numeroParcela,
                  valor: valorParcela,
                  vencimento: vencimentoParcela
                });
              }
            }
          });
          break;
        }
      }

      // Se não encontrou duplicatas, criar uma única parcela
      if (!duplicatasEncontradas) {
        duplicatas.push({
          numero: '1',
          valor: valorTotal,
          vencimento: null
        });
      }

      return {
        numeroNFe,
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

  // Verificar se a conta já existe (versão simplificada)
  const verificarDuplicata = async (xmlData: XMLData): Promise<boolean> => {
    try {
      // Verificar por número da NFe
      const { data: contas, error } = await supabase
        .from('contas_pagar')
        .select('id')
        .ilike('descricao', `%NFe ${xmlData.numeroNFe}%`)
        .limit(1);

      if (error) {
        console.error('Erro ao verificar duplicata:', error);
        return false;
      }

      return contas && contas.length > 0;
    } catch (error) {
      console.error('Erro ao verificar duplicata:', error);
      return false;
    }
  };

  // Buscar ou criar fornecedor (versão simplificada)
  const buscarOuCriarFornecedor = async (xmlData: XMLData): Promise<number | null> => {
    try {
      // Buscar fornecedor existente por CNPJ
      const { data: fornecedorExistente, error: errorBusca } = await supabase
        .from('pessoas_juridicas')
        .select('id')
        .eq('cnpj', xmlData.cnpjEmitente)
        .maybeSingle();

      if (errorBusca) {
        console.error('Erro ao buscar fornecedor:', errorBusca);
      }

      if (fornecedorExistente) {
        return fornecedorExistente.id;
      }

      // Criar novo fornecedor
      const novoFornecedor = {
        cnpj: xmlData.cnpjEmitente,
        razao_social: xmlData.razaoSocialEmitente,
        nome_fantasia: xmlData.nomeFantasiaEmitente || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { data: fornecedorCriado, error: errorCriacao } = await supabase
        .from('pessoas_juridicas')
        .insert(novoFornecedor)
        .select('id')
        .single();

      if (errorCriacao) {
        console.error('Erro ao criar fornecedor:', errorCriacao);
        return null;
      }

      return fornecedorCriado?.id || null;

    } catch (error) {
      console.error('Erro ao buscar/criar fornecedor:', error);
      return null;
    }
  };

  // Criar conta a pagar (versão simplificada - apenas conta principal)
  const criarContaPagar = async (xmlData: XMLData, fornecedorId: number): Promise<boolean> => {
    try {
      const descricao = xmlData.chaveAcesso 
        ? `NFe ${xmlData.numeroNFe} - ${xmlData.razaoSocialEmitente}`
        : `NFe ${xmlData.numeroNFe} - ${xmlData.razaoSocialEmitente}`;

      // Calcular data de emissão (usar como vencimento quando não há parcelas)
      let dataEmissao = new Date();
      if (xmlData.dataEmissao) {
        try {
          dataEmissao = new Date(xmlData.dataEmissao);
        } catch {
          dataEmissao = new Date(); // Fallback para hoje
        }
      }

      // Se não há parcelas, usar data de emissão como vencimento
      // Se há parcelas, usar a primeira data de vencimento
      let dataVencimento = dataEmissao;
      if (xmlData.duplicatas.length > 0 && xmlData.duplicatas[0].vencimento) {
        try {
          dataVencimento = new Date(xmlData.duplicatas[0].vencimento);
        } catch {
          dataVencimento = dataEmissao; // Fallback para data de emissão
        }
      }

      const novaConta = {
        descricao,
        fornecedor_id: fornecedorId,
        categoria_id: 1, // Categoria padrão
        filial_id: 3, // Filial Lui Bambini
        valor_total_centavos: Math.round(xmlData.valorTotal * 100),
        numero_nf: xmlData.numeroNFe,
        chave_nfe: xmlData.chaveAcesso,
        data_emissao: dataEmissao.toISOString().split('T')[0],
        num_parcelas: xmlData.duplicatas.length,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { data: contaCriada, error } = await supabase
        .from('contas_pagar')
        .insert(novaConta)
        .select('id')
        .single();

      if (error) {
        console.error('Erro ao criar conta a pagar:', error);
        return false;
      }

      // Criar parcelas individuais
      if (contaCriada && contaCriada.id) {
        console.log('✅ Conta criada, criando parcelas...');
        
        for (let i = 0; i < xmlData.duplicatas.length; i++) {
          const duplicata = xmlData.duplicatas[i];
          
          // Calcular data de vencimento da parcela
          let vencimentoParcela = dataVencimento;
          if (duplicata.vencimento) {
            try {
              vencimentoParcela = new Date(duplicata.vencimento);
            } catch {
              // Se data inválida, usar data de emissão + dias
              vencimentoParcela = new Date(dataEmissao);
              vencimentoParcela.setDate(vencimentoParcela.getDate() + (i * 30)); // 30 dias entre parcelas
            }
          } else {
            // Se não há vencimento, usar data de emissão + dias
            vencimentoParcela = new Date(dataEmissao);
            vencimentoParcela.setDate(vencimentoParcela.getDate() + (i * 30));
          }
          
          const novaParcela = {
            conta_id: contaCriada.id,
            numero_parcela: i + 1,
            parcela_num: i + 1,
            valor_parcela_centavos: Math.round(duplicata.valor * 100),
            vencimento: vencimentoParcela.toISOString().split('T')[0],
            pago: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };
          
          const { error: errorParcela } = await supabase
            .from('contas_pagar_parcelas')
            .insert(novaParcela);
          
          if (errorParcela) {
            console.error(`Erro ao criar parcela ${i + 1}:`, errorParcela);
          } else {
            console.log(`✅ Parcela ${i + 1}/${xmlData.duplicatas.length} criada - R$ ${duplicata.valor.toFixed(2)}`);
          }
        }
      }

      return !!contaCriada;

    } catch (error) {
      console.error('Erro ao criar conta a pagar:', error);
      return false;
    }
  };

  // Processar um arquivo XML
  const processFile = async (file: File): Promise<ProcessResult> => {
    try {
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
      const isDuplicata = await verificarDuplicata(xmlData);
      if (isDuplicata) {
        return {
          success: false,
          message: `NFe ${xmlData.numeroNFe} já foi importada anteriormente`,
          fileName: file.name,
          xmlData
        };
      }

      // 3. Buscar ou criar fornecedor
      const fornecedorId = await buscarOuCriarFornecedor(xmlData);
      if (!fornecedorId) {
        return {
          success: false,
          message: 'Falha ao criar/encontrar fornecedor',
          fileName: file.name,
          xmlData
        };
      }

      // 4. Criar conta a pagar
      const contaCriada = await criarContaPagar(xmlData, fornecedorId);
      if (!contaCriada) {
        return {
          success: false,
          message: 'Falha ao criar conta a pagar',
          fileName: file.name,
          xmlData
        };
      }

      return {
        success: true,
        message: `NFe ${xmlData.numeroNFe} importada com sucesso - R$ ${xmlData.valorTotal.toFixed(2)}`,
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
    
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setProgress(((i + 1) / files.length) * 100);
        
        const result = await processFile(file);
        results.push(result);
        
        // Pequena pausa para não sobrecarregar
        await new Promise(resolve => setTimeout(resolve, 200));
      }

      // Mostrar resumo
      const sucessos = results.filter(r => r.success).length;
      const erros = results.filter(r => !r.success).length;

      if (sucessos > 0) {
        toast({
          title: "Importação concluída",
          description: `${sucessos} arquivo(s) importado(s) com sucesso.`,
        });
      }

      if (erros > 0) {
        toast({
          title: "Alguns arquivos falharam",
          description: `${erros} arquivo(s) não puderam ser importados. Verifique os detalhes.`,
          variant: "destructive",
        });
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
