import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

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
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { textoTranscrito } = await req.json()
    
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY')
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY não configurada')

    console.log('Processando texto:', textoTranscrito)

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: `TEXTO DO USUÁRIO PARA PROCESSAR: "${textoTranscrito}"` }
        ],
      })
    })

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Limite de requisições excedido. Tente novamente em alguns segundos.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: 'Créditos insuficientes. Adicione créditos ao workspace.' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      const errorText = await response.text()
      console.error('Erro do gateway:', response.status, errorText)
      throw new Error(`Erro do gateway AI: ${response.status}`)
    }

    const data = await response.json()
    console.log('Resposta do gateway:', JSON.stringify(data))

    let rawJson = data.choices?.[0]?.message?.content
    if (!rawJson) throw new Error('A IA não retornou texto válido.')

    // Remove formatações caso a IA mande ```json ... ```
    rawJson = rawJson.replace(/```json/g, '').replace(/```/g, '').trim()
    
    const structuredData = JSON.parse(rawJson)
    console.log('Dados estruturados:', JSON.stringify(structuredData))

    return new Response(JSON.stringify(structuredData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    console.error('Erro:', error)
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Erro desconhecido' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
