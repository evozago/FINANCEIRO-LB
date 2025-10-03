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
            console.log(`➕ MOCK: Inserindo em ${table}:`, JSON.stringify(data, null, 2));
            
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

// Parser XML (versão completa com logs)
const parseXMLFile = async (xmlContent, fileName) => {
  try {
    console.log(`\n🚀 INICIANDO PARSE DO XML: ${fileName}`);
    
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlContent, 'text/xml');
    
    const parserError = xmlDoc.querySelector('parsererror');
    if (parserError) {
      throw new Error('XML inválido ou corrompido');
    }

    console.log('✅ XML parseado sem erros');

    // Extrair número da NFe
    let nfeNumber = '';
    const possibleSelectors = ['ide nNF', 'nNF', 'infNFe ide nNF', 'NFe infNFe ide nNF'];
    
    console.log('🔍 Procurando número da NFe...');
    for (const selector of possibleSelectors) {
      const element = xmlDoc.querySelector(selector);
      if (element && element.textContent?.trim()) {
        nfeNumber = element.textContent.trim();
        console.log(`✅ Número NFe encontrado usando seletor "${selector}": ${nfeNumber}`);
        break;
      } else {
        console.log(`❌ Seletor "${selector}" não encontrou resultado`);
      }
    }

    // Extrair chave de acesso
    let chaveAcesso = '';
    const chaveSelectors = ['infNFe[Id]', 'NFe infNFe[Id]', 'nfeProc NFe infNFe[Id]'];
    
    console.log('🔍 Procurando chave de acesso...');
    for (const selector of chaveSelectors) {
      const element = xmlDoc.querySelector(selector);
      if (element) {
        const idAttr = element.getAttribute('Id');
        if (idAttr) {
          chaveAcesso = idAttr.replace('NFe', '').trim();
          console.log(`✅ Chave de acesso encontrada usando seletor "${selector}": ${chaveAcesso}`);
          break;
        } else {
          console.log(`❌ Seletor "${selector}" encontrou elemento mas sem atributo Id`);
        }
      } else {
        console.log(`❌ Seletor "${selector}" não encontrou elemento`);
      }
    }

    // Fallbacks para número
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
    console.log('🔍 Procurando dados do fornecedor...');
    const emit = xmlDoc.querySelector('emit');
    if (!emit) {
      throw new Error('Elemento <emit> não encontrado no XML');
    }

    const cnpjElement = emit.querySelector('CNPJ');
    const cnpjEmitente = cnpjElement?.textContent || '';
    console.log(`${cnpjElement ? '✅' : '❌'} CNPJ: ${cnpjEmitente || 'não encontrado'}`);

    const nomeElement = emit.querySelector('xNome');
    const razaoSocialEmitente = nomeElement?.textContent || 'Fornecedor não identificado';
    console.log(`${nomeElement ? '✅' : '❌'} Razão Social: ${razaoSocialEmitente}`);

    const fantElement = emit.querySelector('xFant');
    const nomeFantasiaEmitente = fantElement?.textContent || null;
    console.log(`${fantElement ? '✅' : '⚠️'} Nome Fantasia: ${nomeFantasiaEmitente || 'não informado'}`);

    // Extrair valor total
    console.log('🔍 Procurando valor total...');
    const totalElement = xmlDoc.querySelector('vNF');
    const valorTotal = parseFloat(totalElement?.textContent || '0');
    console.log(`${totalElement ? '✅' : '❌'} Valor Total: R$ ${valorTotal} (${totalElement?.textContent || 'elemento não encontrado'})`);
    
    if (isNaN(valorTotal) || valorTotal <= 0) {
      throw new Error(`Valor total inválido: ${valorTotal}`);
    }

    // Extrair data de emissão
    console.log('🔍 Procurando data de emissão...');
    const dataElement = xmlDoc.querySelector('dhEmi');
    const dataEmissao = dataElement?.textContent?.split('T')[0] || new Date().toISOString().split('T')[0];
    console.log(`${dataElement ? '✅' : '⚠️'} Data Emissão: ${dataEmissao} (${dataElement?.textContent || 'usando data atual'})`);

    const xmlData = {
      numeroNFe: nfeNumber,
      chaveAcesso,
      cnpjEmitente,
      razaoSocialEmitente,
      nomeFantasiaEmitente,
      valorTotal,
      dataEmissao
    };

    console.log('\n📋 RESUMO DOS DADOS EXTRAÍDOS:');
    console.log(`   📄 Número NFe: ${xmlData.numeroNFe || 'NÃO ENCONTRADO'}`);
    console.log(`   🔑 Chave: ${xmlData.chaveAcesso || 'NÃO ENCONTRADA'}`);
    console.log(`   🏢 Fornecedor: ${xmlData.razaoSocialEmitente}`);
    console.log(`   📋 CNPJ: ${xmlData.cnpjEmitente || 'NÃO ENCONTRADO'}`);
    console.log(`   💰 Valor: R$ ${xmlData.valorTotal}`);
    console.log(`   📅 Data: ${xmlData.dataEmissao}`);

    return xmlData;

  } catch (error) {
    console.error('❌ ERRO NO PARSE XML:', error.message);
    throw error;
  }
};

// Função principal de teste
async function testarSegundoXML() {
  console.log('🧪 TESTE DO SEGUNDO XML COM LOGS DETALHADOS\n');

  const xmlFile = '/home/ubuntu/upload/Nfe_42250928888342000109550020002734621204033580_9066756101.xml';

  try {
    if (!fs.existsSync(xmlFile)) {
      console.log(`❌ Arquivo não encontrado: ${xmlFile}`);
      return;
    }

    console.log(`📁 Arquivo encontrado: ${xmlFile.split('/').pop()}`);
    console.log(`📏 Tamanho: ${fs.statSync(xmlFile).size} bytes`);

    const xmlContent = fs.readFileSync(xmlFile, 'utf8');
    const fileName = xmlFile.split('/').pop();
    
    console.log('📖 Conteúdo do arquivo lido com sucesso');
    console.log(`📝 Primeiros 200 caracteres: ${xmlContent.substring(0, 200)}...`);

    // Parse do XML
    const xmlData = await parseXMLFile(xmlContent, fileName);
    
    if (!xmlData) {
      console.log('❌ Falha no parse do XML');
      return;
    }

    console.log('\n🎯 PARSE CONCLUÍDO COM SUCESSO!');
    
    // Simular verificação de duplicata
    console.log('\n🔍 VERIFICANDO DUPLICATAS...');
    if (xmlData.chaveAcesso) {
      console.log(`🔍 MOCK: Consultando contas_pagar onde chave_nfe = ${xmlData.chaveAcesso}`);
      console.log('✅ Não é duplicata');
    } else {
      console.log('⚠️ Sem chave de acesso, não pode verificar duplicata');
    }

    // Simular criação de fornecedor
    console.log('\n👤 CRIANDO/BUSCANDO FORNECEDOR...');
    console.log(`🔍 MOCK: Buscando fornecedor com CNPJ: ${xmlData.cnpjEmitente}`);
    console.log('🔍 MOCK: Fornecedor não encontrado, criando novo...');
    console.log(`➕ MOCK: Criando fornecedor: ${xmlData.razaoSocialEmitente}`);
    console.log('✅ Fornecedor criado: ID 999');

    // Simular busca de categoria e filial
    console.log('\n🏷️ BUSCANDO CATEGORIA E FILIAL...');
    console.log('🔍 MOCK: Consultando categorias_financeiras (limit 1)');
    console.log('✅ Categoria encontrada: ID 1 (Despesas Gerais)');
    console.log('🔍 MOCK: Consultando filiais (limit 1)');
    console.log('✅ Filial encontrada: ID 1 (Matriz)');

    // Simular criação da conta
    console.log('\n💳 CRIANDO CONTA A PAGAR...');
    const contaData = {
      fornecedor_id: 999,
      categoria_id: 1,
      filial_id: 1,
      descricao: `NFe ${xmlData.numeroNFe || 'sem número'} - ${xmlData.razaoSocialEmitente}`,
      numero_nota: xmlData.numeroNFe,
      chave_nfe: xmlData.chaveAcesso,
      valor_total_centavos: Math.round(xmlData.valorTotal * 100),
      num_parcelas: 1,
      referencia: `Importado de XML em ${new Date().toLocaleDateString('pt-BR')}`
    };

    console.log('📝 Dados da conta a ser criada:');
    console.log(JSON.stringify(contaData, null, 2));
    
    console.log('➕ MOCK: Inserindo conta a pagar...');
    console.log('✅ Conta a pagar criada: ID 888');

    console.log('\n🎉 IMPORTAÇÃO CONCLUÍDA COM SUCESSO!');
    console.log(`✅ NFe ${xmlData.numeroNFe || 'sem número'} importada - R$ ${xmlData.valorTotal.toFixed(2)}`);

  } catch (error) {
    console.error(`❌ ERRO GERAL:`, error.message);
  }
}

// Executar teste
testarSegundoXML().catch(console.error);
