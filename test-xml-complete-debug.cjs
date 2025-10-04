const fs = require('fs');
const { JSDOM } = require('jsdom');

// Simular DOMParser
global.DOMParser = new JSDOM().window.DOMParser;

// Simular dados do Supabase para teste
const mockSupabase = {
  from: (table) => ({
    select: (fields) => {
      const baseQuery = {
        limit: (n) => ({
          then: (callback) => {
            console.log(`🔍 MOCK: Consultando ${table} (limit ${n})`);
            
            if (table === 'categorias_financeiras') {
              return callback({ 
                data: [{ id: 1, nome: 'Despesas Gerais' }], 
                error: null 
              });
            }
            
            if (table === 'filiais') {
              return callback({ 
                data: [{ id: 1, nome: 'Matriz' }], 
                error: null 
              });
            }
            
            return callback({ data: [], error: null });
          }
        }),
        eq: (field, value) => ({
          limit: (n) => ({
            then: (callback) => {
              console.log(`🔍 MOCK: Consultando ${table} onde ${field} = ${value}`);
              
              // Simular dados existentes
              if (table === 'contas_pagar' && field === 'chave_nfe') {
                return callback({ data: [], error: null }); // Não é duplicata
              }
              
              if (table === 'pessoas_juridicas' && field === 'cnpj') {
                return callback({ data: [], error: null }); // Fornecedor não existe
              }
              
              return callback({ data: [], error: null });
            }
          }),
          maybeSingle: () => ({
            then: (callback) => {
              console.log(`🔍 MOCK: Consultando ${table} (single) onde ${field} = ${value}`);
              return callback({ data: null, error: null }); // Não encontrado
            }
          })
        })
      };
      
      return baseQuery;
    },
    insert: (data) => ({
      select: (fields) => ({
        single: () => ({
          then: (callback) => {
            console.log(`➕ MOCK: Inserindo em ${table}:`, data);
            
            if (table === 'pessoas_juridicas') {
              return callback({ 
                data: { id: 999, ...data }, 
                error: null 
              });
            }
            
            if (table === 'contas_pagar') {
              return callback({ 
                data: { id: 888, ...data }, 
                error: null 
              });
            }
            
            return callback({ data: { id: 777 }, error: null });
          }
        })
      })
    })
  })
};

// Parser XML (copiado da versão debug)
const parseXMLFile = async (xmlContent, fileName) => {
  try {
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
        console.log(`✅ Número NFe encontrado usando seletor "${selector}": ${nfeNumber}`);
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
          console.log(`✅ Chave de acesso encontrada: ${chaveAcesso}`);
          break;
        }
      }
    }

    if (!nfeNumber && chaveAcesso) {
      nfeNumber = chaveAcesso.substring(25, 34);
      console.log(`✅ Número extraído da chave: ${nfeNumber}`);
    }

    if (!nfeNumber && fileName) {
      const fileNumberMatch = fileName.match(/(\d{8,9})/);
      if (fileNumberMatch) {
        nfeNumber = fileNumberMatch[1];
        console.log(`✅ Número extraído do nome do arquivo: ${nfeNumber}`);
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

    console.log(`✅ XML parseado: NFe ${nfeNumber}, Valor: R$ ${valorTotal}, Fornecedor: ${razaoSocialEmitente}`);

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
    console.error('❌ Erro ao processar XML:', error);
    throw error;
  }
};

// Verificação de duplicatas
const verificarDuplicata = async (xmlData) => {
  try {
    if (!xmlData.chaveAcesso) {
      console.log('⚠️ Sem chave de acesso, não pode verificar duplicata');
      return false;
    }

    console.log(`🔍 Verificando duplicata para chave: ${xmlData.chaveAcesso}`);

    return new Promise((resolve) => {
      mockSupabase
        .from('contas_pagar')
        .select('id')
        .eq('chave_nfe', xmlData.chaveAcesso)
        .limit(1)
        .then(({ data, error }) => {
          if (error) {
            console.error('❌ Erro ao verificar duplicata:', error);
            resolve(false);
            return;
          }

          const isDuplicate = data && data.length > 0;
          console.log(`${isDuplicate ? '⚠️ Duplicata encontrada' : '✅ Não é duplicata'}`);
          resolve(isDuplicate);
        });
    });
  } catch (error) {
    console.error('❌ Erro ao verificar duplicata:', error);
    return false;
  }
};

// Buscar ou criar fornecedor
const buscarOuCriarFornecedor = async (xmlData) => {
  try {
    console.log(`🔍 Buscando fornecedor com CNPJ: ${xmlData.cnpjEmitente}`);

    return new Promise((resolve, reject) => {
      // Primeiro tentar encontrar fornecedor existente
      mockSupabase
        .from('pessoas_juridicas')
        .select('id')
        .eq('cnpj', xmlData.cnpjEmitente)
        .maybeSingle()
        .then(({ data: existingFornecedor, error: selectError }) => {
          if (selectError) {
            console.error('❌ Erro ao buscar fornecedor:', selectError);
            reject(new Error(`Erro ao buscar fornecedor: ${selectError.message}`));
            return;
          }
          
          if (existingFornecedor) {
            console.log(`✅ Fornecedor existente encontrado: ID ${existingFornecedor.id}`);
            resolve(existingFornecedor.id);
            return;
          }

          // Criar novo fornecedor
          console.log(`➕ Criando novo fornecedor: ${xmlData.razaoSocialEmitente}`);
          
          mockSupabase
            .from('pessoas_juridicas')
            .insert({
              razao_social: xmlData.razaoSocialEmitente,
              nome_fantasia: xmlData.nomeFantasiaEmitente,
              cnpj: xmlData.cnpjEmitente
            })
            .select('id')
            .single()
            .then(({ data: newFornecedor, error: fornecedorError }) => {
              if (fornecedorError) {
                console.error('❌ Erro ao criar fornecedor:', fornecedorError);
                reject(new Error(`Erro ao criar fornecedor: ${fornecedorError.message}`));
                return;
              }
              
              if (!newFornecedor || !newFornecedor.id) {
                reject(new Error('ID do fornecedor não retornado'));
                return;
              }
              
              console.log(`✅ Novo fornecedor criado: ID ${newFornecedor.id}`);
              resolve(newFornecedor.id);
            });
        });
    });
  } catch (error) {
    console.error('❌ Erro crítico ao buscar/criar fornecedor:', error);
    throw error;
  }
};

// Buscar categoria e filial padrão
const buscarDadosPadrao = async () => {
  try {
    console.log('🔍 Buscando categoria padrão...');
    console.log('🔍 Buscando filial padrão...');

    return new Promise((resolve, reject) => {
      Promise.all([
        new Promise((res) => {
          mockSupabase
            .from('categorias_financeiras')
            .select('id, nome')
            .limit(1)
            .then(({ data: categorias, error: catError }) => {
              res({ categorias, catError });
            });
        }),
        new Promise((res) => {
          mockSupabase
            .from('filiais')
            .select('id, nome')
            .limit(1)
            .then(({ data: filiais, error: filError }) => {
              res({ filiais, filError });
            });
        })
      ]).then(([catResult, filResult]) => {
        if (catResult.catError) {
          console.error('❌ Erro ao buscar categoria:', catResult.catError);
          reject(new Error(`Erro ao buscar categoria: ${catResult.catError.message}`));
          return;
        }

        if (filResult.filError) {
          console.error('❌ Erro ao buscar filial:', filResult.filError);
          reject(new Error(`Erro ao buscar filial: ${filResult.filError.message}`));
          return;
        }

        const categoriaId = catResult.categorias && catResult.categorias.length > 0 ? catResult.categorias[0].id : null;
        const filialId = filResult.filiais && filResult.filiais.length > 0 ? filResult.filiais[0].id : null;

        if (!categoriaId) {
          reject(new Error('Nenhuma categoria encontrada no sistema'));
          return;
        }

        if (!filialId) {
          reject(new Error('Nenhuma filial encontrada no sistema'));
          return;
        }

        console.log(`✅ Categoria encontrada: ID ${categoriaId} (${catResult.categorias[0].nome || 'sem nome'})`);
        console.log(`✅ Filial encontrada: ID ${filialId} (${filResult.filiais[0].nome || 'sem nome'})`);

        resolve({ categoriaId, filialId });
      });
    });
  } catch (error) {
    console.error('❌ Erro ao buscar dados padrão:', error);
    throw error;
  }
};

// Criar conta principal
const criarContaPrincipal = async (xmlData, fornecedorId) => {
  try {
    console.log('📝 Iniciando criação da conta a pagar...');

    const { categoriaId, filialId } = await buscarDadosPadrao();

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

    return new Promise((resolve, reject) => {
      mockSupabase
        .from('contas_pagar')
        .insert(contaData)
        .select('id')
        .single()
        .then(({ data: contaCriada, error: contaError }) => {
          if (contaError) {
            console.error('❌ Erro ao criar conta principal:', contaError);
            reject(new Error(`Erro ao criar conta: ${contaError.message}`));
            return;
          }

          if (!contaCriada || !contaCriada.id) {
            reject(new Error('ID da conta não retornado'));
            return;
          }

          console.log(`✅ Conta a pagar criada com sucesso: ID ${contaCriada.id}`);
          resolve(true);
        });
    });
  } catch (error) {
    console.error('❌ Erro ao criar conta principal:', error);
    throw error;
  }
};

// Processar um arquivo XML
const processFile = async (xmlContent, fileName) => {
  try {
    console.log(`\n🚀 Processando arquivo: ${fileName}`);
    
    // 1. Parse do XML
    const xmlData = await parseXMLFile(xmlContent, fileName);
    if (!xmlData) {
      return {
        success: false,
        message: 'Falha ao processar XML',
        fileName: fileName
      };
    }

    // 2. Verificar duplicata
    const isDuplicate = await verificarDuplicata(xmlData);
    if (isDuplicate) {
      return {
        success: false,
        message: `⚠️ NFe ${xmlData.numeroNFe || 'sem número'} já foi importada anteriormente`,
        fileName: fileName
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
      fileName: fileName
    };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    console.error(`❌ Erro ao processar ${fileName}:`, errorMessage);
    
    return {
      success: false,
      message: errorMessage,
      fileName: fileName
    };
  }
};

// Função principal de teste
async function testarImportacaoCompleta() {
  console.log('🧪 TESTE COMPLETO DA IMPORTAÇÃO XML COM LOGS DETALHADOS\n');

  const xmlFiles = [
    '/home/ubuntu/upload/Nfe_26250918720877000112550010000011811968293586_9107357977.xml',
    '/home/ubuntu/upload/Nfe_26250918720877000112550010000011791993296986_9068773656.xml'
  ];

  let totalSuccesses = 0;
  let totalErrors = 0;

  for (const filePath of xmlFiles) {
    try {
      if (!fs.existsSync(filePath)) {
        console.log(`⚠️ Arquivo não encontrado: ${filePath}`);
        continue;
      }

      const xmlContent = fs.readFileSync(filePath, 'utf8');
      const fileName = filePath.split('/').pop();
      
      const result = await processFile(xmlContent, fileName);
      
      if (result.success) {
        totalSuccesses++;
      } else {
        totalErrors++;
      }

    } catch (error) {
      console.error(`❌ Erro ao processar ${filePath}:`, error.message);
      totalErrors++;
    }
  }

  console.log(`\n📊 RESUMO FINAL DO TESTE:`);
  console.log(`✅ Sucessos: ${totalSuccesses}`);
  console.log(`❌ Erros: ${totalErrors}`);
  console.log(`🎯 Status: ${totalSuccesses > 0 ? 'FUNCIONAL' : 'COM PROBLEMAS'}`);
}

// Executar teste
testarImportacaoCompleta().catch(console.error);
