// supabase/functions/processar-audio-despesa/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { textoTranscrito } = await req.json()
    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY')

    if (!GEMINI_API_KEY) throw new Error('Chave Gemini não configurada')

    // 1. Chamada para o Gemini Flash (Rápido e Barato)
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `[SYSTEM PROMPT AQUI - Cole o texto do passo 1 acima]\n\nTEXTO DO USUÁRIO: "${textoTranscrito}"`
          }]
        }]
      })
    })

    const data = await response.json()
    // Extrai o texto do JSON do Gemini
    let rawJson = data.candidates[0].content.parts[0].text
    // Limpa marcadores de markdown se houver
    rawJson = rawJson.replace(/```json/g, '').replace(/```/g, '').trim()
    
    const structuredData = JSON.parse(rawJson)

    return new Response(JSON.stringify(structuredData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
