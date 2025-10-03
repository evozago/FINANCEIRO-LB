const fs = require('fs');
const path = require('path');

// Simulação do processo de importação XML como se fosse na tela
console.log('🚀 INICIANDO SIMULAÇÃO DE IMPORTAÇÃO XML NA TELA');
console.log('=' .repeat(60));

// Arquivos XML para testar
const xmlFiles = [
  '/home/ubuntu/upload/Nfe_33250916590234006450550040008839141609288930_9101688151.xml',
  '/home/ubuntu/upload/Nfe_33250916590234006450550040008804951917719840_9073460675.xml',
  '/home/ubuntu/upload/Nfe_33250916590234006450550040008778691535913168_9053740726.xml'
];

// Função para simular o parser XML (baseado no sistema atual)
function parseXMLContent(xmlContent) {
  console.log('📄 Analisando conteúdo XML...');
  
  try {
    // Extrair dados básicos do XML
    const cnpjEmitMatch = xmlContent.match(/<emit>.*?<CNPJ>(\d+)<\/CNPJ>.*?<xNome>([^<]+)<\/xNome>/s);
    const valorTotalMatch = xmlContent.match(/<total>.*?<ICMSTot>.*?<vNF>([^<]+)<\/vNF>/s);
    const dataEmissaoMatch = xmlContent.match(/<dhEmi>([^<]+)<\/dhEmi>/);
    const numeroNFMatch = xmlContent.match(/<nNF>(\d+)<\/nNF>/);
    
    if (!cnpjEmitMatch) {
      throw new Error('CNPJ do emitente não encontrado no XML');
    }
    
    const dadosXML = {
      cnpjEmitente: cnpjEmitMatch[1],
      nomeEmitente: cnpjEmitMatch[2],
      valorTotal: valorTotalMatch ? parseFloat(valorTotalMatch[1]) : 0,
      dataEmissao: dataEmissaoMatch ? dataEmissaoMatch[1] : null,
      numeroNF: numeroNFMatch ? numeroNFMatch[1] : null
    };
    
    console.log('✅ Dados extraídos do XML:');
    console.log(`   - CNPJ Emitente: ${dadosXML.cnpjEmitente}`);
    console.log(`   - Nome Emitente: ${dadosXML.nomeEmitente}`);
    console.log(`   - Valor Total: R$ ${dadosXML.valorTotal.toFixed(2)}`);
    console.log(`   - Data Emissão: ${dadosXML.dataEmissao}`);
    console.log(`   - Número NF: ${dadosXML.numeroNF}`);
    
    return dadosXML;
  } catch (error) {
    console.error('❌ Erro ao analisar XML:', error.message);
    return null;
  }
}

// Função para simular verificação de fornecedor existente
function verificarFornecedorExistente(cnpj) {
  console.log(`🔍 Verificando se fornecedor com CNPJ ${cnpj} já existe...`);
  
  // Simulação - na prática isso consultaria o banco
  const fornecedoresExistentes = [
    '16590234006450', // Este CNPJ já existe no sistema
  ];
  
  const existe = fornecedoresExistentes.includes(cnpj);
  
  if (existe) {
    console.log('✅ Fornecedor já existe no sistema');
    return { id: 'uuid-fornecedor-existente', nome: 'AZZAS 2154 S.A' };
  } else {
    console.log('ℹ️  Fornecedor não encontrado - será criado automaticamente');
    return null;
  }
}

// Função para simular criação de fornecedor
function criarFornecedor(dadosXML) {
  console.log('➕ Criando novo fornecedor...');
  
  const novoFornecedor = {
    id: `uuid-${Date.now()}`,
    cnpj: dadosXML.cnpjEmitente,
    razao_social: dadosXML.nomeEmitente,
    nome_fantasia: dadosXML.nomeEmitente,
    categoria: 'Fornecedor',
    ativo: true,
    created_at: new Date().toISOString()
  };
  
  console.log('✅ Fornecedor criado com sucesso:');
  console.log(`   - ID: ${novoFornecedor.id}`);
  console.log(`   - CNPJ: ${novoFornecedor.cnpj}`);
  console.log(`   - Razão Social: ${novoFornecedor.razao_social}`);
  
  return novoFornecedor;
}

// Função para simular criação de conta a pagar
function criarContaPagar(dadosXML, fornecedor) {
  console.log('💰 Criando conta a pagar...');
  
  const dataVencimento = new Date();
  dataVencimento.setDate(dataVencimento.getDate() + 30); // 30 dias para vencimento
  
  const contaPagar = {
    id: `uuid-conta-${Date.now()}`,
    pessoa_juridica_id: fornecedor.id,
    descricao: `NF ${dadosXML.numeroNF} - ${fornecedor.razao_social || fornecedor.nome_fantasia}`,
    valor_total: dadosXML.valorTotal,
    data_vencimento: dataVencimento.toISOString().split('T')[0],
    status: 'pendente',
    numero_documento: dadosXML.numeroNF,
    observacoes: `Importado automaticamente do XML - Data emissão: ${dadosXML.dataEmissao}`,
    created_at: new Date().toISOString()
  };
  
  console.log('✅ Conta a pagar criada com sucesso:');
  console.log(`   - ID: ${contaPagar.id}`);
  console.log(`   - Descrição: ${contaPagar.descricao}`);
  console.log(`   - Valor: R$ ${contaPagar.valor_total.toFixed(2)}`);
  console.log(`   - Vencimento: ${contaPagar.data_vencimento}`);
  console.log(`   - Status: ${contaPagar.status}`);
  
  return contaPagar;
}

// Função principal de simulação
async function simularImportacaoXML() {
  console.log('🎯 Simulando processo de importação XML como na tela do sistema\n');
  
  for (let i = 0; i < xmlFiles.length; i++) {
    const xmlFile = xmlFiles[i];
    const fileName = path.basename(xmlFile);
    
    console.log(`\n📁 PROCESSANDO ARQUIVO ${i + 1}/${xmlFiles.length}: ${fileName}`);
    console.log('-'.repeat(80));
    
    try {
      // Simular seleção de arquivo na tela
      console.log('📂 Arquivo selecionado pelo usuário');
      
      // Verificar se arquivo existe
      if (!fs.existsSync(xmlFile)) {
        console.error('❌ Arquivo não encontrado:', xmlFile);
        continue;
      }
      
      // Simular leitura do arquivo
      console.log('📖 Lendo conteúdo do arquivo...');
      const xmlContent = fs.readFileSync(xmlFile, 'utf8');
      
      // Simular validação do XML
      console.log('🔍 Validando formato XML...');
      if (!xmlContent.includes('<nfeProc') && !xmlContent.includes('<NFe')) {
        console.error('❌ Arquivo não é um XML de NFe válido');
        continue;
      }
      console.log('✅ XML válido detectado');
      
      // Simular parsing dos dados
      const dadosXML = parseXMLContent(xmlContent);
      if (!dadosXML) {
        console.error('❌ Falha ao extrair dados do XML');
        continue;
      }
      
      // Simular verificação de duplicatas
      console.log('🔄 Verificando duplicatas...');
      console.log('✅ Nenhuma duplicata encontrada');
      
      // Simular verificação/criação de fornecedor
      let fornecedor = verificarFornecedorExistente(dadosXML.cnpjEmitente);
      
      if (!fornecedor) {
        fornecedor = criarFornecedor(dadosXML);
      }
      
      // Simular criação da conta a pagar
      const contaPagar = criarContaPagar(dadosXML, fornecedor);
      
      // Simular feedback de sucesso
      console.log('\n🎉 IMPORTAÇÃO CONCLUÍDA COM SUCESSO!');
      console.log('✅ Resumo da operação:');
      console.log(`   - Arquivo processado: ${fileName}`);
      console.log(`   - Fornecedor: ${fornecedor.razao_social || fornecedor.nome_fantasia}`);
      console.log(`   - Valor importado: R$ ${dadosXML.valorTotal.toFixed(2)}`);
      console.log(`   - Conta a pagar criada: ${contaPagar.id}`);
      
    } catch (error) {
      console.error('❌ ERRO DURANTE A IMPORTAÇÃO:', error.message);
      console.log('💡 Verifique o arquivo e tente novamente');
    }
    
    // Simular pequena pausa entre arquivos
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('🏁 SIMULAÇÃO DE IMPORTAÇÃO CONCLUÍDA');
  console.log(`📊 Total de arquivos processados: ${xmlFiles.length}`);
  console.log('💡 Esta foi uma simulação do processo real de importação');
  console.log('🔧 Para testar com dados reais, use a interface do sistema');
}

// Executar simulação
simularImportacaoXML().catch(console.error);
