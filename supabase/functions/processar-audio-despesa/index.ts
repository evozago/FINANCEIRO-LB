import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

// AQUI ESTÁ O TEXTO QUE VOCÊ PERGUNTOU
// Nós guardamos ele nessa variável para enviar junto com o áudio do usuário
const SYSTEM_PROMPT = `
Você é um assistente financeiro de IA especializado em estruturar dados para inserção em banco de dados.
Sua tarefa é analisar o texto transcrito de um áudio e extrair informações para uma conta a pagar.

O sistema possui as seguintes entidades importantes:
1. Empresas (Centros de Custo): Temos filiais/empresas cadastradas. Tente identificar para qual empresa é a despesa.
2. Fornecedores: Podem ser Pessoa Física (PF) ou Jurídica (PJ).
3. Categorias: Classifique a despesa na categoria mais lógica (ex: Alimentação, Transporte, Impostos, Fornecedores, Pessoal).

ENTRADA: Um texto em linguagem natural (ex: "Nota da vivo de 200 reais para a loja matriz vencendo hoje").

SAÍDA: Retorne APENAS um JSON estrito (sem markdown) com este formato:
{
  "descricao": "string (resumo claro da despesa)",
  "valor_total": number (float, ex: 150.50),
  "data_vencimento": "YYYY-MM-DD" (se não for citada data, assuma a data de hoje),
  "nome_fornecedor_sugerido": "string (nome extraído do áudio para busca)",
  "nome_empresa_sugerida": "string (nome da empresa citada, ou null se não citado)",
  "nome_categoria_sugerida": "string (sugira uma categoria baseada no contexto)",
  "observacoes": "string (qualquer detalhe extra mencionado)"
}
`;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Isso permite que o seu site (frontend) chame essa função sem erro de segurança
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { textoTranscrito } = await req.json()
    
    // Pega a chave que você salvou no painel do Supabase
    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY')
    if (!GEMINI_API_KEY) throw new Error('Chave Gemini não configurada')

    // Aqui a gente junta a sua INSTRUÇÃO (System Prompt) com o PEDIDO DO USUÁRIO
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [{
            // Veja aqui: Enviamos o prompt do sistema + o que você falou no microfone
            text: `${SYSTEM_PROMPT}\n\nTEXTO DO USUÁRIO PARA PROCESSAR: "${textoTranscrito}"`
          }]
        }]
      })
    })

    const data = await response.json()

    // Tratamento para garantir que pegamos apenas o JSON limpo da resposta
    let rawJson = data.candidates?.[0]?.content?.parts?.[0]?.text
    if (!rawJson) throw new Error('O Gemini não retornou texto válido.')

    // Remove formatações caso a IA mande ```json ... ```
    rawJson = rawJson.replace(/```json/g, '').replace(/```/g, '').trim()
    
    const structuredData = JSON.parse(rawJson)

    return new Response(JSON.stringify(structuredData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    console.error(error)
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
