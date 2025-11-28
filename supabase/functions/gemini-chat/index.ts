import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SYSTEM_PROMPT = `
Você é um assistente financeiro de IA.
Sua tarefa é analisar o texto e extrair dados para uma conta a pagar.
Retorne APENAS um JSON estrito com chaves: descricao, valor_total, data_vencimento, nome_fornecedor_sugerido, nome_empresa_sugerida, nome_categoria_sugerida.
Se não encontrar valor, retorne 0.
`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { prompt } = await req.json()
    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY')

    if (!GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY não configurada no Supabase')
    }

    // URL Exata e Manual para evitar erros de biblioteca
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;

    console.log("Enviando prompt para Gemini...");

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `${SYSTEM_PROMPT}\n\nTexto do usuário: ${prompt}`
          }]
        }]
      })
    })

    if (!response.ok) {
      const errorData = await response.text();
      console.error("Erro Google:", errorData);
      throw new Error(`Erro na API do Gemini (${response.status}): ${errorData}`);
    }

    const data = await response.json()
    
    // Tratamento para limpar o JSON caso venha com markdown
    let resultText = data.candidates?.[0]?.content?.parts?.[0]?.text || "{}"
    resultText = resultText.replace(/```json/g, '').replace(/```/g, '').trim()

    // Tenta fazer o parse para garantir que é JSON válido
    let jsonResponse;
    try {
      jsonResponse = JSON.parse(resultText);
    } catch (e) {
      // Se falhar, retorna o texto cru num campo 'raw'
      jsonResponse = { raw: resultText, error: "Falha ao estruturar JSON" }
    }

    return new Response(JSON.stringify(jsonResponse), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    console.error("Erro Edge Function:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Erro desconhecido' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
