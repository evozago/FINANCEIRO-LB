import { createClient } from '@supabase/supabase-js';

// Configuração do Supabase
const supabaseUrl = 'https://ykqfxjqvqvqvqvqvqvqv.supabase.co';
const supabaseKey = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlrcWZ4anF2cXZxdnF2cXZxdnF2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mjc2MjE0MDAsImV4cCI6MjA0MzE5NzQwMH0.example';

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('🧪 Iniciando testes de operações CRUD...\n');

// Teste 1: Pessoas Físicas
async function testPessoasFisicas() {
  console.log('📝 Testando Pessoas Físicas...');
  
  try {
    // Criar uma pessoa física
    const { data: novaPessoa, error: createError } = await supabase
      .from('pessoas_fisicas')
      .insert([{
        nome_completo: 'João Silva Teste',
        cpf: '123.456.789-00',
        email: 'joao.teste@email.com',
        celular: '(11) 99999-9999'
      }])
      .select()
      .single();

    if (createError) {
      console.log('❌ Erro ao criar pessoa física:', createError.message);
      return false;
    }

    console.log('✅ Pessoa física criada:', novaPessoa.nome_completo);

    // Buscar a pessoa criada
    const { data: pessoaBuscada, error: readError } = await supabase
      .from('pessoas_fisicas')
      .select('*')
      .eq('id', novaPessoa.id)
      .single();

    if (readError) {
      console.log('❌ Erro ao buscar pessoa física:', readError.message);
      return false;
    }

    console.log('✅ Pessoa física encontrada:', pessoaBuscada.nome_completo);

    // Atualizar a pessoa
    const { error: updateError } = await supabase
      .from('pessoas_fisicas')
      .update({ celular: '(11) 88888-8888' })
      .eq('id', novaPessoa.id);

    if (updateError) {
      console.log('❌ Erro ao atualizar pessoa física:', updateError.message);
      return false;
    }

    console.log('✅ Pessoa física atualizada');

    // Deletar a pessoa
    const { error: deleteError } = await supabase
      .from('pessoas_fisicas')
      .delete()
      .eq('id', novaPessoa.id);

    if (deleteError) {
      console.log('❌ Erro ao deletar pessoa física:', deleteError.message);
      return false;
    }

    console.log('✅ Pessoa física deletada');
    return true;

  } catch (error) {
    console.log('❌ Erro geral no teste de Pessoas Físicas:', error.message);
    return false;
  }
}

// Teste 2: Pessoas Jurídicas
async function testPessoasJuridicas() {
  console.log('\n📝 Testando Pessoas Jurídicas...');
  
  try {
    // Criar uma pessoa jurídica
    const { data: novaPessoa, error: createError } = await supabase
      .from('pessoas_juridicas')
      .insert([{
        razao_social: 'Empresa Teste LTDA',
        nome_fantasia: 'Teste Corp',
        cnpj: '12.345.678/0001-90',
        email: 'contato@teste.com'
      }])
      .select()
      .single();

    if (createError) {
      console.log('❌ Erro ao criar pessoa jurídica:', createError.message);
      return false;
    }

    console.log('✅ Pessoa jurídica criada:', novaPessoa.razao_social);

    // Buscar a pessoa criada
    const { data: pessoaBuscada, error: readError } = await supabase
      .from('pessoas_juridicas')
      .select('*')
      .eq('id', novaPessoa.id)
      .single();

    if (readError) {
      console.log('❌ Erro ao buscar pessoa jurídica:', readError.message);
      return false;
    }

    console.log('✅ Pessoa jurídica encontrada:', pessoaBuscada.razao_social);

    // Atualizar a pessoa
    const { error: updateError } = await supabase
      .from('pessoas_juridicas')
      .update({ celular: '(11) 77777-7777' })
      .eq('id', novaPessoa.id);

    if (updateError) {
      console.log('❌ Erro ao atualizar pessoa jurídica:', updateError.message);
      return false;
    }

    console.log('✅ Pessoa jurídica atualizada');

    // Deletar a pessoa
    const { error: deleteError } = await supabase
      .from('pessoas_juridicas')
      .delete()
      .eq('id', novaPessoa.id);

    if (deleteError) {
      console.log('❌ Erro ao deletar pessoa jurídica:', deleteError.message);
      return false;
    }

    console.log('✅ Pessoa jurídica deletada');
    return true;

  } catch (error) {
    console.log('❌ Erro geral no teste de Pessoas Jurídicas:', error.message);
    return false;
  }
}

// Teste 3: Marcas
async function testMarcas() {
  console.log('\n📝 Testando Marcas...');
  
  try {
    // Criar uma marca
    const { data: novaMarca, error: createError } = await supabase
      .from('marcas')
      .insert([{
        nome: 'Marca Teste',
        descricao: 'Uma marca para testes'
      }])
      .select()
      .single();

    if (createError) {
      console.log('❌ Erro ao criar marca:', createError.message);
      return false;
    }

    console.log('✅ Marca criada:', novaMarca.nome);

    // Buscar a marca criada
    const { data: marcaBuscada, error: readError } = await supabase
      .from('marcas')
      .select('*')
      .eq('id', novaMarca.id)
      .single();

    if (readError) {
      console.log('❌ Erro ao buscar marca:', readError.message);
      return false;
    }

    console.log('✅ Marca encontrada:', marcaBuscada.nome);

    // Atualizar a marca
    const { error: updateError } = await supabase
      .from('marcas')
      .update({ descricao: 'Descrição atualizada' })
      .eq('id', novaMarca.id);

    if (updateError) {
      console.log('❌ Erro ao atualizar marca:', updateError.message);
      return false;
    }

    console.log('✅ Marca atualizada');

    // Deletar a marca
    const { error: deleteError } = await supabase
      .from('marcas')
      .delete()
      .eq('id', novaMarca.id);

    if (deleteError) {
      console.log('❌ Erro ao deletar marca:', deleteError.message);
      return false;
    }

    console.log('✅ Marca deletada');
    return true;

  } catch (error) {
    console.log('❌ Erro geral no teste de Marcas:', error.message);
    return false;
  }
}

// Executar todos os testes
async function runAllTests() {
  const results = [];
  
  results.push(await testPessoasFisicas());
  results.push(await testPessoasJuridicas());
  results.push(await testMarcas());
  
  const passedTests = results.filter(result => result).length;
  const totalTests = results.length;
  
  console.log(`\n📊 Resultado dos testes: ${passedTests}/${totalTests} passaram`);
  
  if (passedTests === totalTests) {
    console.log('🎉 Todos os testes de CRUD passaram com sucesso!');
  } else {
    console.log('⚠️  Alguns testes falharam. Verifique as configurações do banco.');
  }
}

runAllTests().catch(console.error);
