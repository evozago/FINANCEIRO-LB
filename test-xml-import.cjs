/**
 * Script de teste para simular importação de XML
 * Testa toda a lógica de parsing e importação
 */

const fs = require('fs');
const path = require('path');

// Simular DOMParser para Node.js
const { JSDOM } = require('jsdom');
const dom = new JSDOM();
global.DOMParser = dom.window.DOMParser;

// Função de parsing XML baseada no nosso hook
const parseXMLFile = async (filePath) => {
  try {
    const xmlContent = fs.readFileSync(filePath, 'utf8');
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlContent, 'text/xml');
    
    // Verificar se há erros de parsing
    const parserError = xmlDoc.querySelector('parsererror');
    if (parserError) {
      throw new Error('XML inválido');
    }

    console.log(`\n=== Processando: ${path.basename(filePath)} ===`);

    // Extrair dados da nota fiscal
    const nfeElement = xmlDoc.querySelector('infNFe') || xmlDoc.querySelector('NFe');
    if (!nfeElement) {
      throw new Error('Estrutura de NFe não encontrada');
    }

    // Extrair número da NFe usando múltiplos seletores
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
        console.log(`✅ Número NFe encontrado usando seletor "${selector}": ${nfeNumber}`);
        break;
      }
    }
    
    // Extrair chave de acesso
    let chaveAcesso = '';
    const chaveSelectors = [
      'infNFe[Id]',
      'chNFe'
    ];
    
    for (const selector of chaveSelectors) {
      if (selector === 'infNFe[Id]') {
        const element = xmlDoc.querySelector(selector);
        if (element) {
          const id = element.getAttribute('Id');
          if (id && id.startsWith('NFe')) {
            chaveAcesso = id.replace('NFe', '');
            console.log(`✅ Chave de acesso encontrada no atributo Id: ${chaveAcesso}`);
            break;
          }
        }
      } else {
        const element = xmlDoc.querySelector(selector);
        if (element && element.textContent?.trim()) {
          chaveAcesso = element.textContent.trim();
          console.log(`✅ Chave de acesso encontrada usando seletor "${selector}": ${chaveAcesso}`);
          break;
        }
      }
    }
    
    // Se não encontrou número da NFe, tentar extrair dos últimos 9 dígitos da chave
    if (!nfeNumber && chaveAcesso && chaveAcesso.length >= 44) {
      nfeNumber = chaveAcesso.substring(25, 34);
      console.log(`✅ Número NFe extraído da chave de acesso: ${nfeNumber}`);
    }

    // Extrair dados do fornecedor
    const emit = xmlDoc.querySelector('emit');
    if (!emit) {
      throw new Error('Dados do fornecedor não encontrados');
    }

    const cnpjEmissor = emit.querySelector('CNPJ')?.textContent || '';
    const razaoSocialEmissor = emit.querySelector('xNome')?.textContent || 'Fornecedor não identificado';
    const nomeFantasiaEmissor = emit.querySelector('xFant')?.textContent || '';

    console.log(`✅ Fornecedor: ${razaoSocialEmissor}`);
    console.log(`✅ CNPJ: ${cnpjEmissor}`);
    console.log(`✅ Nome Fantasia: ${nomeFantasiaEmissor || 'N/A'}`);

    // Extrair valor total
    const totalElement = xmlDoc.querySelector('vNF');
    const valorTotal = Math.round(parseFloat(totalElement?.textContent || '0') * 100);
    console.log(`✅ Valor Total: R$ ${(valorTotal / 100).toFixed(2)}`);
    
    // Extrair data de emissão da NFe
    const dataEmissao = xmlDoc.querySelector('dhEmi')?.textContent?.split('T')[0] || 
                       new Date().toISOString().split('T')[0];
    console.log(`✅ Data Emissão: ${dataEmissao}`);

    // Extrair parcelas se existirem
    const parcelas = [];
    const duplicatas = xmlDoc.querySelectorAll('dup');
    
    if (duplicatas && duplicatas.length > 0) {
      console.log(`✅ Encontradas ${duplicatas.length} parcelas:`);
      duplicatas.forEach((dup, index) => {
        const valorDup = Math.round(parseFloat(dup.querySelector('vDup')?.textContent || '0') * 100);
        let vencimentoDup = dup.querySelector('dVenc')?.textContent;
        
        if (!vencimentoDup) {
          vencimentoDup = dataEmissao;
        }
        
        parcelas.push({
          numero: index + 1,
          valor: valorDup,
          vencimento: vencimentoDup
        });
        
        console.log(`   Parcela ${index + 1}: R$ ${(valorDup / 100).toFixed(2)} - Venc: ${vencimentoDup}`);
      });
    } else {
      console.log(`✅ Nenhuma parcela específica encontrada, criando parcela única`);
      parcelas.push({
        numero: 1,
        valor: valorTotal,
        vencimento: dataEmissao
      });
      console.log(`   Parcela única: R$ ${(valorTotal / 100).toFixed(2)} - Venc: ${dataEmissao}`);
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
      arquivo: path.basename(filePath)
    };
  } catch (error) {
    console.error(`❌ Erro ao processar ${path.basename(filePath)}:`, error.message);
    throw error;
  }
};

// Função principal de teste
async function testXMLImport() {
  console.log('🚀 Iniciando teste de importação XML...\n');
  
  const xmlFiles = [
    '/home/ubuntu/Downloads/Nfe_42250918650225000400550010008187671820640029_9110058860.xml',
    '/home/ubuntu/Downloads/Nfe_42250918650225000400550010008151971993572656_9046348925.xml'
  ];
  
  const results = [];
  
  for (const filePath of xmlFiles) {
    try {
      if (!fs.existsSync(filePath)) {
        console.log(`❌ Arquivo não encontrado: ${filePath}`);
        continue;
      }
      
      const xmlData = await parseXMLFile(filePath);
      results.push({ success: true, data: xmlData });
      
      console.log(`✅ Processamento concluído com sucesso!\n`);
      
    } catch (error) {
      results.push({ success: false, error: error.message, file: path.basename(filePath) });
      console.log(`❌ Falha no processamento\n`);
    }
  }
  
  // Resumo final
  console.log('\n📊 RESUMO DOS RESULTADOS:');
  console.log('========================');
  
  const sucessos = results.filter(r => r.success);
  const erros = results.filter(r => !r.success);
  
  console.log(`✅ Sucessos: ${sucessos.length}`);
  console.log(`❌ Erros: ${erros.length}`);
  
  if (sucessos.length > 0) {
    console.log('\n🎉 Dados extraídos com sucesso:');
    sucessos.forEach((result, index) => {
      const data = result.data;
      console.log(`\n${index + 1}. ${data.arquivo}:`);
      console.log(`   NFe: ${data.numeroNota}`);
      console.log(`   Fornecedor: ${data.razaoSocialEmissor}`);
      console.log(`   CNPJ: ${data.cnpjEmissor}`);
      console.log(`   Valor: R$ ${(data.valorTotal / 100).toFixed(2)}`);
      console.log(`   Parcelas: ${data.parcelas.length}`);
    });
  }
  
  if (erros.length > 0) {
    console.log('\n❌ Erros encontrados:');
    erros.forEach((result, index) => {
      console.log(`${index + 1}. ${result.file}: ${result.error}`);
    });
  }
  
  console.log('\n🏁 Teste concluído!');
}

// Executar teste
testXMLImport().catch(console.error);
