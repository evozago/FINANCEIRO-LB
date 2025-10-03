const fs = require('fs');
const { JSDOM } = require('jsdom');

// Testar com os novos XMLs fornecidos
const xmlFiles = [
  '/home/ubuntu/upload/Nfe_26250918720877000112550010000011811968293586_9107357977.xml',
  '/home/ubuntu/upload/Nfe_26250918720877000112550010000011791993296986_9068773656.xml'
];

console.log('🧪 TESTANDO NOVA VERSÃO DO PARSER XML\n');

function parseXMLContent(xmlContent) {
  try {
    const dom = new JSDOM();
    const parser = new dom.window.DOMParser();
    const xmlDoc = parser.parseFromString(xmlContent, 'text/xml');

    // Verificar se há erros de parsing
    const parserError = xmlDoc.querySelector('parsererror');
    if (parserError) {
      throw new Error('XML inválido: ' + parserError.textContent);
    }

    console.log('📄 Estrutura XML detectada:');
    
    // Identificar namespace e estrutura
    const nfeProc = xmlDoc.querySelector('nfeProc');
    const nfe = xmlDoc.querySelector('NFe, nfe');
    const infNFe = xmlDoc.querySelector('infNFe');
    
    console.log('   - nfeProc:', !!nfeProc);
    console.log('   - NFe:', !!nfe);
    console.log('   - infNFe:', !!infNFe);

    if (!infNFe) {
      throw new Error('Elemento infNFe não encontrado');
    }

    // Função auxiliar para buscar texto com múltiplos seletores
    const getTextContent = (selectors, context = xmlDoc) => {
      for (const selector of selectors) {
        const elements = context.querySelectorAll(selector);
        for (const element of elements) {
          if (element && element.textContent && element.textContent.trim()) {
            console.log(`   ✅ Encontrado "${selector}": ${element.textContent.trim()}`);
            return element.textContent.trim();
          }
        }
      }
      console.log(`   ❌ Não encontrado: ${selectors.join(', ')}`);
      return null;
    };

    console.log('\n🔍 Extraindo dados da NFe:');

    // 1. Extrair chave de acesso (do atributo Id)
    const infNFeElement = xmlDoc.querySelector('infNFe[Id]');
    let chaveAcesso = null;
    if (infNFeElement) {
      const idAttr = infNFeElement.getAttribute('Id');
      if (idAttr) {
        chaveAcesso = idAttr.replace('NFe', '').trim();
        console.log(`   ✅ Chave de acesso: ${chaveAcesso}`);
      }
    }

    // 2. Extrair número da NFe
    const numeroNFe = getTextContent([
      'ide nNF',
      'infNFe ide nNF',
      'NFe infNFe ide nNF',
      'nfeProc NFe infNFe ide nNF'
    ]);

    // 3. Extrair dados do emitente
    console.log('\n🏢 Dados do emitente:');
    const cnpjEmitente = getTextContent([
      'emit CNPJ',
      'infNFe emit CNPJ',
      'NFe infNFe emit CNPJ',
      'nfeProc NFe infNFe emit CNPJ'
    ]);

    const razaoSocialEmitente = getTextContent([
      'emit xNome',
      'infNFe emit xNome',
      'NFe infNFe emit xNome',
      'nfeProc NFe infNFe emit xNome'
    ]);

    const nomeFantasiaEmitente = getTextContent([
      'emit xFant',
      'infNFe emit xFant',
      'NFe infNFe emit xFant',
      'nfeProc NFe infNFe emit xFant'
    ]);

    // 4. Extrair valor total
    console.log('\n💰 Valores:');
    const valorTotal = getTextContent([
      'total ICMSTot vNF',
      'infNFe total ICMSTot vNF',
      'NFe infNFe total ICMSTot vNF',
      'nfeProc NFe infNFe total ICMSTot vNF'
    ]);

    // 5. Extrair data de emissão
    console.log('\n📅 Datas:');
    const dataEmissao = getTextContent([
      'ide dhEmi',
      'infNFe ide dhEmi',
      'NFe infNFe ide dhEmi',
      'nfeProc NFe infNFe ide dhEmi'
    ]);

    // 6. Extrair parcelas/duplicatas
    console.log('\n💳 Parcelas/Duplicatas:');
    const duplicatas = [];
    
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
        console.log(`   ✅ Encontradas ${dupElements.length} duplicatas via "${selector}"`);
        duplicatasEncontradas = true;
        
        dupElements.forEach((dup, index) => {
          const numeroParcela = dup.querySelector('nDup')?.textContent || (index + 1).toString();
          const valorParcela = dup.querySelector('vDup')?.textContent;
          const vencimentoParcela = dup.querySelector('dVenc')?.textContent;
          
          if (valorParcela) {
            duplicatas.push({
              numero: numeroParcela,
              valor: parseFloat(valorParcela),
              vencimento: vencimentoParcela
            });
            console.log(`      ${index + 1}. Parcela ${numeroParcela}: R$ ${valorParcela} - Venc: ${vencimentoParcela || 'À vista'}`);
          }
        });
        break;
      }
    }

    // Se não encontrou duplicatas, criar uma única parcela
    if (!duplicatasEncontradas && valorTotal) {
      console.log('   ⚠️  Nenhuma duplicata encontrada, criando parcela única');
      duplicatas.push({
        numero: '1',
        valor: parseFloat(valorTotal),
        vencimento: null
      });
    }

    // Montar resultado
    const xmlData = {
      chaveAcesso,
      numeroNFe,
      cnpjEmitente,
      razaoSocialEmitente,
      nomeFantasiaEmitente,
      valorTotal: valorTotal ? parseFloat(valorTotal) : 0,
      dataEmissao,
      duplicatas
    };

    return xmlData;

  } catch (error) {
    console.error('❌ Erro ao processar XML:', error.message);
    return null;
  }
}

// Função para formatar moeda
function formatCurrency(value) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

// Função para formatar CNPJ
function formatCNPJ(cnpj) {
  if (!cnpj) return 'N/A';
  return cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
}

// Processar arquivos
async function testNewParser() {
  console.log(`📁 Processando ${xmlFiles.length} arquivo(s) XML:\n`);

  for (let i = 0; i < xmlFiles.length; i++) {
    const xmlFile = xmlFiles[i];
    console.log(`\n${'='.repeat(60)}`);
    console.log(`📄 ARQUIVO ${i + 1}: ${xmlFile.split('/').pop()}`);
    console.log(`${'='.repeat(60)}`);

    try {
      if (!fs.existsSync(xmlFile)) {
        console.log(`❌ Arquivo não encontrado: ${xmlFile}`);
        continue;
      }

      const xmlContent = fs.readFileSync(xmlFile, 'utf8');
      console.log(`📊 Tamanho do arquivo: ${xmlContent.length} caracteres`);
      
      const xmlData = parseXMLContent(xmlContent);

      if (!xmlData) {
        console.log(`❌ Falha ao processar o arquivo`);
        continue;
      }

      // Exibir resultado final
      console.log('\n📋 RESULTADO FINAL:');
      console.log('==================');
      console.log(`✅ NFe: ${xmlData.numeroNFe || 'N/A'}`);
      console.log(`✅ Chave: ${xmlData.chaveAcesso || 'N/A'}`);
      console.log(`✅ Fornecedor: ${xmlData.razaoSocialEmitente || 'N/A'}`);
      console.log(`✅ Nome Fantasia: ${xmlData.nomeFantasiaEmitente || 'N/A'}`);
      console.log(`✅ CNPJ: ${formatCNPJ(xmlData.cnpjEmitente) || 'N/A'}`);
      console.log(`✅ Valor Total: ${formatCurrency(xmlData.valorTotal) || 'N/A'}`);
      console.log(`✅ Data Emissão: ${xmlData.dataEmissao || 'N/A'}`);
      console.log(`✅ Parcelas: ${xmlData.duplicatas.length}`);

      if (xmlData.duplicatas.length > 0) {
        xmlData.duplicatas.forEach((dup, index) => {
          console.log(`   ${index + 1}. ${formatCurrency(dup.valor)} - Venc: ${dup.vencimento || 'À vista'}`);
        });
      }

      // Validar dados essenciais
      const dadosCompletos = xmlData.numeroNFe && xmlData.cnpjEmitente && xmlData.valorTotal > 0;
      console.log(`\n🎯 Status: ${dadosCompletos ? '✅ DADOS COMPLETOS' : '❌ DADOS INCOMPLETOS'}`);

    } catch (error) {
      console.log(`❌ Erro ao processar: ${error.message}`);
    }
  }

  console.log('\n🎉 TESTE CONCLUÍDO!');
}

// Executar teste
testNewParser().catch(console.error);
