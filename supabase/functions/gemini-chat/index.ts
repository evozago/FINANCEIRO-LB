import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Schema oficial do Google AI Studio para Structured Output
const RESPONSE_SCHEMA = {
  type: "OBJECT",
  required: ["intencao"],
  properties: {
    intencao: {
      type: "STRING",
      enum: ["CRIAR_CONTA", "DAR_BAIXA"]
    },
    contas_pagar: {
      type: "OBJECT",
      required: ["descricao", "valor_total_centavos", "num_parcelas"],
      properties: {
        descricao: { type: "STRING" },
        valor_total_centavos: { type: "INTEGER" },
        num_parcelas: { type: "INTEGER" },
        numero_nota: { type: "STRING" },
        chave_nfe: { type: "STRING" },
        data_emissao: { type: "STRING" },
        referencia: { type: "STRING" },
        fornecedor_nome_sugerido: { type: "STRING" },
        categoria_sugerida: { type: "STRING" },
      },
    },
    contas_pagar_parcelas: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        required: ["parcela_num", "valor_parcela_centavos", "vencimento"],
        properties: {
          parcela_num: { type: "INTEGER" },
          valor_parcela_centavos: { type: "INTEGER" },
          vencimento: { type: "STRING" },
        },
      },
    },
    // Campos específicos para DAR_BAIXA (comprovante de pagamento)
    pagamento: {
      type: "OBJECT",
      properties: {
        data_pagamento: { type: "STRING" },
        valor_pago_centavos: { type: "INTEGER" },
        juros_centavos: { type: "INTEGER" },
        desconto_centavos: { type: "INTEGER" },
        multa_centavos: { type: "INTEGER" },
        forma_pagamento_sugerida: { type: "STRING" },
        numero_documento_referencia: { type: "STRING" },
        codigo_barras: { type: "STRING" },
      },
    },
  },
};

// Base system instruction
const BASE_SYSTEM_INSTRUCTION = `Você é um robô de extração de dados financeiros. 

PRIMEIRO, identifique a INTENÇÃO do documento:
- "CRIAR_CONTA": Se é um boleto, nota fiscal, fatura ou conta A PAGAR (documento que gera uma obrigação de pagamento)
- "DAR_BAIXA": Se é um COMPROVANTE de pagamento já realizado (PIX, transferência, recibo)

REGRAS:
1. Para CRIAR_CONTA: Preencha contas_pagar e contas_pagar_parcelas
2. Para DAR_BAIXA: Preencha pagamento com os dados do comprovante. Também preencha contas_pagar com o que conseguir identificar (descrição, fornecedor, valor original se disponível)
3. Em pagamento.juros_centavos: valor de juros/mora cobrados
4. Em pagamento.desconto_centavos: valor de desconto concedido
5. Em pagamento.multa_centavos: valor de multa cobrada
6. Valores sempre em centavos. Datas em YYYY-MM-DD.
7. Em numero_documento_referencia: extraia o número do boleto/título/nota que aparece no comprovante

Retorne APENAS JSON.`;

// Function to fetch business knowledge from database
async function fetchBusinessKnowledge(): Promise<string[]> {
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.log("⚠️ Supabase credentials not found, skipping knowledge fetch");
      return [];
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const { data, error } = await supabase
      .from('ia_conhecimento')
      .select('regra')
      .eq('ativa', true);

    if (error) {
      console.error("❌ Error fetching knowledge:", error);
      return [];
    }

    console.log(`📚 Loaded ${data?.length || 0} business rules from ia_conhecimento`);
    return data?.map(r => r.regra) || [];
  } catch (error) {
    console.error("❌ Error in fetchBusinessKnowledge:", error);
    return [];
  }
}

// Build complete system instruction with business knowledge
function buildSystemInstruction(businessRules: string[]): string {
  if (businessRules.length === 0) {
    return BASE_SYSTEM_INSTRUCTION;
  }

  const rulesSection = `
===== CONTEXTO DE NEGÓCIO DA EMPRESA =====
IMPORTANTE: As regras abaixo são específicas desta empresa e DEVEM ser priorizadas sobre comportamentos padrão.

${businessRules.map((r, i) => `${i + 1}. ${r}`).join('\n')}

===========================================
`;

  return rulesSection + "\n" + BASE_SYSTEM_INSTRUCTION;
}

interface RequestBody {
  prompt?: string;
  image_base64?: string;
  image_mime_type?: string;
  pdf_base64?: string;
  num_parcelas?: number;
  primeira_data_vencimento?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body: RequestBody = await req.json();
    const { prompt, image_base64, image_mime_type, pdf_base64, num_parcelas, primeira_data_vencimento } = body;

    // Ler API Key dos Secrets do Supabase
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY não configurada nos Secrets do Supabase");
    }

    // Fetch business knowledge from database
    console.log("📚 Fetching business knowledge...");
    const businessRules = await fetchBusinessKnowledge();
    const systemInstruction = buildSystemInstruction(businessRules);

    // Construir as parts do request
    const parts: any[] = [];

    // Adicionar texto/prompt se fornecido
    if (prompt) {
      parts.push({ text: prompt });
    }

    // Adicionar contexto de parcelas se fornecido
    if (num_parcelas && num_parcelas > 1) {
      parts.push({ 
        text: `DIVIDIR EM ${num_parcelas} PARCELAS IGUAIS. Primeira parcela vence em: ${primeira_data_vencimento || 'calcular 30 dias a partir da data de emissão'}. Parcelas subsequentes a cada 30 dias.` 
      });
    }

    // Adicionar imagem se fornecida (multimodal)
    if (image_base64 && image_mime_type) {
      console.log(`📷 Processando imagem (${image_mime_type}), tamanho: ${(image_base64.length / 1024).toFixed(1)}KB`);
      parts.push({
        inline_data: {
          mime_type: image_mime_type,
          data: image_base64
        }
      });
    }

    // Adicionar PDF se fornecido (multimodal)
    if (pdf_base64) {
      console.log(`📄 Processando PDF, tamanho: ${(pdf_base64.length / 1024).toFixed(1)}KB`);
      parts.push({
        inline_data: {
          mime_type: "application/pdf",
          data: pdf_base64
        }
      });
    }

    // Se não há conteúdo, usar prompt padrão
    if (parts.length === 0) {
      parts.push({ text: prompt || "Extraia os dados financeiros do documento." });
    }

    // Configuração oficial do Google AI Studio
    const requestBody = {
      contents: [{ role: "user", parts }],
      systemInstruction: {
        parts: [{ text: systemInstruction }]
      },
      generationConfig: {
        temperature: 0,
        topP: 0,
        responseMimeType: "application/json",
        responseSchema: RESPONSE_SCHEMA,
        thinkingConfig: {
          thinkingLevel: "HIGH"
        }
      }
    };

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${GEMINI_API_KEY}`;

    console.log("🚀 Enviando para Gemini 3 Flash Preview (Temperature 0, Thinking HIGH)...");

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error("❌ Erro Gemini API:", response.status, errorData);
      throw new Error(`Erro na API Gemini (${response.status}): ${errorData}`);
    }

    const data = await response.json();
    console.log("✅ Resposta recebida do Gemini 3 Flash Preview");

    // Extrair o texto da resposta (já vem estruturado pelo responseSchema)
    const resultText = data.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
    console.log("📝 JSON extraído:", resultText.substring(0, 500));

    // Parse do JSON estruturado
    const geminiResponse = JSON.parse(resultText);
    
    console.log("🎯 Intenção detectada:", geminiResponse.intencao);

    // Mapear para formato esperado pelo frontend
    const formattedResponse = {
      intencao: geminiResponse.intencao || "CRIAR_CONTA",
      conta_pagar: {
        descricao: geminiResponse.contas_pagar?.descricao || null,
        numero_nota: geminiResponse.contas_pagar?.numero_nota || null,
        chave_nfe: geminiResponse.contas_pagar?.chave_nfe || null,
        valor_total_centavos: geminiResponse.contas_pagar?.valor_total_centavos || 0,
        data_emissao: geminiResponse.contas_pagar?.data_emissao || null,
        referencia: geminiResponse.contas_pagar?.referencia || null,
        fornecedor_nome_sugerido: geminiResponse.contas_pagar?.fornecedor_nome_sugerido || null,
        categoria_sugerida: geminiResponse.contas_pagar?.categoria_sugerida || null,
        num_parcelas: geminiResponse.contas_pagar?.num_parcelas || 1,
      },
      parcelas: geminiResponse.contas_pagar_parcelas || [],
      pagamento: geminiResponse.pagamento ? {
        data_pagamento: geminiResponse.pagamento.data_pagamento || null,
        valor_pago_centavos: geminiResponse.pagamento.valor_pago_centavos || 0,
        juros_centavos: geminiResponse.pagamento.juros_centavos || 0,
        desconto_centavos: geminiResponse.pagamento.desconto_centavos || 0,
        multa_centavos: geminiResponse.pagamento.multa_centavos || 0,
        forma_pagamento_sugerida: geminiResponse.pagamento.forma_pagamento_sugerida || null,
        numero_documento_referencia: geminiResponse.pagamento.numero_documento_referencia || null,
        codigo_barras: geminiResponse.pagamento.codigo_barras || null,
      } : null,
      confianca: 95,
      observacoes: null
    };

    console.log("✅ Resposta processada com sucesso");

    return new Response(JSON.stringify(formattedResponse), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("❌ Erro Edge Function:", error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Erro desconhecido' 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
