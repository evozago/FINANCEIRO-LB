import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
  "nome_empresa_sugerida": "string (nome da empresa citada, ou string vazia se não citado)",
  "nome_categoria_sugerida": "string (sugira uma categoria baseada no contexto)",
  "observacoes": "string (qualquer detalhe extra mencionado)"
}
`;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Schema de Structured Output (estilo Google AI Studio) para reduzir falhas de parsing
const RESPONSE_SCHEMA = {
  type: "OBJECT",
  required: [
    "descricao",
    "valor_total",
    "data_vencimento",
    "nome_fornecedor_sugerido",
    "nome_empresa_sugerida",
    "nome_categoria_sugerida",
    "observacoes",
  ],
  properties: {
    descricao: { type: "STRING" },
    valor_total: { type: "NUMBER" },
    data_vencimento: { type: "STRING" },
    nome_fornecedor_sugerido: { type: "STRING" },
    nome_empresa_sugerida: { type: "STRING" },
    nome_categoria_sugerida: { type: "STRING" },
    observacoes: { type: "STRING" },
  },
};

function extractJsonFromText(text: string) {
  const cleaned = text
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("Não foi possível localizar um JSON na resposta da IA.");
    return JSON.parse(match[0]);
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const textoTranscrito = typeof body?.textoTranscrito === "string" ? body.textoTranscrito.trim() : "";

    if (!textoTranscrito) {
      return new Response(JSON.stringify({ error: "textoTranscrito é obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY não configurada nos Secrets do Supabase");
    }

    console.log("🎙️ processar-audio-despesa: texto recebido:", textoTranscrito);

    const requestBody = {
      contents: [
        {
          role: "user",
          parts: [{ text: `TEXTO DO USUÁRIO PARA PROCESSAR: "${textoTranscrito}"` }],
        },
      ],
      systemInstruction: {
        parts: [{ text: SYSTEM_PROMPT }],
      },
      generationConfig: {
        temperature: 0,
        topP: 0,
        responseMimeType: "application/json",
        responseSchema: RESPONSE_SCHEMA,
      },
    };

    // Usar o mesmo modelo que já está funcionando na função gemini-chat
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${GEMINI_API_KEY}`;

    const resp = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    });

    if (!resp.ok) {
      const t = await resp.text().catch(() => "");
      console.error("❌ Gemini HTTP error:", resp.status, t);
      return new Response(
        JSON.stringify({ error: `Erro Gemini (${resp.status})`, details: t || null }),
        {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const data = await resp.json();

    if (data?.error?.message) {
      console.error("❌ Gemini API error:", data.error);
      return new Response(JSON.stringify({ error: data.error.message }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const resultText = (data?.candidates?.[0]?.content?.parts ?? [])
      .map((p: any) => (typeof p?.text === "string" ? p.text : ""))
      .join("")
      .trim();

    if (!resultText) {
      const blockReason = data?.promptFeedback?.blockReason;
      if (blockReason) {
        console.warn("⚠️ Gemini bloqueou o conteúdo:", blockReason);
        return new Response(JSON.stringify({ error: "Conteúdo bloqueado pela IA", reason: blockReason }), {
          status: 422,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error("O Gemini não retornou texto válido.");
    }

    const structuredData = extractJsonFromText(resultText);

    return new Response(JSON.stringify(structuredData), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("💥 processar-audio-despesa error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erro desconhecido" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
