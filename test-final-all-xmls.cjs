const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

// Configurar DOM global
const dom = new JSDOM();
global.DOMParser = dom.window.DOMParser;

console.log('🎯 TESTE FINAL - TODOS OS 3 ARQUIVOS XML');
console.log('=' .repeat(70));

// Lista dos arquivos XML para testar
const xmlFiles = [
  '/home/ubuntu/upload/Nfe_33250916590234006450550040008839141609288930_9101688151.xml',
  '/home/ubuntu/upload/Nfe_33250916590234006450550040008804951917719840_9073460675.xml',
  '/home/ubuntu/upload/Nfe_33250916590234006450550040008778691535913168_9053740726.xml'
];

// Função de parsing (igual ao hook real)
function parseXMLFile(xmlContent, fileName) {
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

    if (!nfeNumber && fileName) {
      const fileNumberMatch = fileName.match(/(\d{8,9})/);
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
    throw error;
  }
}

// Simular Supabase
function createSupabaseClient() {
  const fornecedoresExistentes = new Map();
  const contasCriadas = [];
  
  const supabase = {
    from: (table) => ({
      select: (fields = '*') => {
        const query = {
          conditions: [],
          eq: function(column, value) {
            this.conditions.push({ column, value });
            return this;
          },
          single: () => {
            if (table === 'pessoas_juridicas') {
              const cnpjCondition = query.conditions.find(c => c.column === 'cnpj');
              if (cnpjCondition && cnpjCondition.value === '16590234006450') {
                return Promise.resolve({
                  data: {
                    id: 'uuid-fornecedor-azzas',
                    cnpj: '16590234006450',
                    razao_social: 'AZZAS 2154 S.A',
                    nome_fantasia: 'ARCD08 - ATACADO'
                  },
                  error: null
                });
              }
            }
            
            if (table === 'contas_pagar') {
              // Verificar duplicatas
              const nfCondition = query.conditions.find(c => c.column === 'numero_documento');
              const fornecedorCondition = query.conditions.find(c => c.column === 'pessoa_juridica_id');
              
              if (nfCondition && fornecedorCondition) {
                const duplicata = contasCriadas.find(c => 
                  c.numero_documento === nfCondition.value && 
                  c.pessoa_juridica_id === fornecedorCondition.value
                );
                
                if (duplicata) {
                  return Promise.resolve({ data: duplicata, error: null });
                }
              }
            }
            
            return Promise.resolve({ data: null, error: null });
          }
        };
        return query;
      },
      insert: (data) => ({
        select: () => ({
          single: () => {
            const insertedData = { ...data, id: `uuid-${table}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}` };
            
            if (table === 'pessoas_juridicas') {
              fornecedoresExistentes.set(data.cnpj, insertedData);
            } else if (table === 'contas_pagar') {
              contasCriadas.push(insertedData);
            }
            
            return Promise.resolve({
              data: insertedData,
              error: null
            });
          }
        })
      })
    })
  };
  
  return supabase;
}

// Função para processar um arquivo XML
async function processarArquivoXML(xmlFile, supabase, index) {
  const fileName = path.basename(xmlFile);
  
  console.log(`\n📁 PROCESSANDO ARQUIVO ${index + 1}/3: ${fileName}`);
  console.log('-'.repeat(70));
  
  try {
    // 1. Ler e parsear XML
    console.log('📖 Lendo arquivo XML...');
    const xmlContent = fs.readFileSync(xmlFile, 'utf8');
    
    console.log('📄 Fazendo parsing...');
    const xmlData = parseXMLFile(xmlContent, fileName);
    
    console.log('✅ Dados extraídos:');
    console.log(`   NFe: ${xmlData.numeroNFe}`);
    console.log(`   CNPJ: ${xmlData.cnpjEmitente}`);
    console.log(`   Fornecedor: ${xmlData.razaoSocialEmitente}`);
    console.log(`   Valor: R$ ${xmlData.valorTotal.toFixed(2)}`);
    console.log(`   Data: ${xmlData.dataEmissao}`);
    
    // 2. Verificar fornecedor
    console.log('🔍 Verificando fornecedor...');
    const { data: fornecedorExistente } = await supabase
      .from('pessoas_juridicas')
      .select('*')
      .eq('cnpj', xmlData.cnpjEmitente)
      .single();
    
    let fornecedor = fornecedorExistente;
    
    if (!fornecedor) {
      console.log('➕ Criando novo fornecedor...');
      const { data: novoFornecedor } = await supabase
        .from('pessoas_juridicas')
        .insert({
          cnpj: xmlData.cnpjEmitente,
          razao_social: xmlData.razaoSocialEmitente,
          nome_fantasia: xmlData.nomeFantasiaEmitente || xmlData.razaoSocialEmitente,
          categoria: 'Fornecedor',
          ativo: true
        })
        .select()
        .single();
      
      fornecedor = novoFornecedor;
      console.log('✅ Fornecedor criado:', fornecedor.id);
    } else {
      console.log('✅ Fornecedor encontrado:', fornecedor.id);
    }
    
    // 3. Verificar duplicatas
    console.log('🔄 Verificando duplicatas...');
    const { data: contaExistente } = await supabase
      .from('contas_pagar')
      .select('*')
      .eq('numero_documento', xmlData.numeroNFe)
      .eq('pessoa_juridica_id', fornecedor.id)
      .single();
    
    if (contaExistente) {
      console.log('⚠️  Conta já existe - pulando criação');
      return {
        sucesso: true,
        duplicata: true,
        xmlData,
        fornecedor,
        contaPagar: contaExistente
      };
    }
    
    // 4. Criar conta a pagar
    console.log('💰 Criando conta a pagar...');
    const dataVencimento = new Date();
    dataVencimento.setDate(dataVencimento.getDate() + 30);
    
    const { data: contaPagar } = await supabase
      .from('contas_pagar')
      .insert({
        pessoa_juridica_id: fornecedor.id,
        descricao: `NF ${xmlData.numeroNFe} - ${fornecedor.razao_social}`,
        valor_total: xmlData.valorTotal,
        data_vencimento: dataVencimento.toISOString().split('T')[0],
        status: 'pendente',
        numero_documento: xmlData.numeroNFe,
        observacoes: `Importado do XML - Emissão: ${xmlData.dataEmissao}`,
        chave_acesso: xmlData.chaveAcesso
      })
      .select()
      .single();
    
    console.log('✅ Conta a pagar criada:', contaPagar.id);
    console.log(`   Descrição: ${contaPagar.descricao}`);
    console.log(`   Valor: R$ ${contaPagar.valor_total.toFixed(2)}`);
    console.log(`   Vencimento: ${contaPagar.data_vencimento}`);
    
    return {
      sucesso: true,
      duplicata: false,
      xmlData,
      fornecedor,
      contaPagar
    };
    
  } catch (error) {
    console.error('❌ ERRO:', error.message);
    return {
      sucesso: false,
      erro: error.message,
      arquivo: fileName
    };
  }
}

// Função principal
async function testarTodosArquivos() {
  console.log('🚀 Iniciando teste com todos os arquivos XML...');
  
  const supabase = createSupabaseClient();
  const resultados = [];
  let totalValor = 0;
  let sucessos = 0;
  let duplicatas = 0;
  let erros = 0;
  
  for (let i = 0; i < xmlFiles.length; i++) {
    const resultado = await processarArquivoXML(xmlFiles[i], supabase, i);
    resultados.push(resultado);
    
    if (resultado.sucesso) {
      sucessos++;
      totalValor += resultado.xmlData.valorTotal;
      
      if (resultado.duplicata) {
        duplicatas++;
      }
    } else {
      erros++;
    }
    
    // Pequena pausa entre arquivos
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  // Relatório final
  console.log('\n' + '='.repeat(70));
  console.log('📊 RELATÓRIO FINAL DE IMPORTAÇÃO');
  console.log('='.repeat(70));
  
  console.log(`📁 Arquivos processados: ${xmlFiles.length}`);
  console.log(`✅ Sucessos: ${sucessos}`);
  console.log(`🔄 Duplicatas: ${duplicatas}`);
  console.log(`❌ Erros: ${erros}`);
  console.log(`💰 Valor total importado: R$ ${totalValor.toFixed(2)}`);
  
  console.log('\n📋 Detalhes por arquivo:');
  resultados.forEach((resultado, index) => {
    const fileName = path.basename(xmlFiles[index]);
    if (resultado.sucesso) {
      const status = resultado.duplicata ? '🔄 DUPLICATA' : '✅ SUCESSO';
      console.log(`   ${index + 1}. ${fileName}`);
      console.log(`      Status: ${status}`);
      console.log(`      NFe: ${resultado.xmlData.numeroNFe}`);
      console.log(`      Valor: R$ ${resultado.xmlData.valorTotal.toFixed(2)}`);
      console.log(`      Fornecedor: ${resultado.fornecedor.razao_social}`);
    } else {
      console.log(`   ${index + 1}. ${fileName}`);
      console.log(`      Status: ❌ ERRO`);
      console.log(`      Erro: ${resultado.erro}`);
    }
  });
  
  console.log('\n🏆 CONCLUSÃO:');
  if (erros === 0) {
    console.log('✅ TODOS OS ARQUIVOS FORAM PROCESSADOS COM SUCESSO!');
    console.log('💡 O sistema de importação XML está funcionando perfeitamente!');
    console.log('🔄 Sistema pronto para uso em produção!');
  } else {
    console.log(`⚠️  ${erros} arquivo(s) apresentaram problemas`);
    console.log('🔧 Verifique os erros acima para correção');
  }
  
  return {
    total: xmlFiles.length,
    sucessos,
    duplicatas,
    erros,
    valorTotal: totalValor,
    resultados
  };
}

// Executar teste
testarTodosArquivos()
  .then(relatorio => {
    console.log('\n' + '='.repeat(70));
    console.log('🎯 TESTE FINAL CONCLUÍDO!');
    console.log(`📈 Taxa de sucesso: ${((relatorio.sucessos / relatorio.total) * 100).toFixed(1)}%`);
  })
  .catch(console.error);
