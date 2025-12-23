import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Schema do Google AI Studio para Structured Output - atualizado conforme solicitado
const RESPONSE_SCHEMA = {
  type: "OBJECT",
  required: ["intencao", "contas_pagar"],
  properties: {
    intencao: {
      type: "STRING",
      enum: ["CRIAR_CONTA", "DAR_BAIXA", "CRIAR_E_PAGAR"],
    },
    contas_pagar: {
      type: "OBJECT",
      required: ["descricao", "valor_total_centavos"],
      properties: {
        descricao: { type: "STRING" },
        valor_total_centavos: { type: "INTEGER" },
        juros_centavos: { type: "INTEGER" },
        desconto_centavos: { type: "INTEGER" },
        valor_final_centavos: { type: "INTEGER" },
        num_parcelas: { type: "INTEGER" },
        numero_nota: { type: "STRING" },
        chave_nfe: { type: "STRING" },
        data_emissao: { type: "STRING" },
        data_pagamento: { type: "STRING" },
        fornecedor_nome_sugerido: { type: "STRING" },
        categoria_sugerida: { type: "STRING" },
        referencia: { type: "STRING" },
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
    observacao_ia: { type: "STRING" },
  },
};

// Base system instruction
const BASE_SYSTEM_INSTRUCTION = `Você é o Diretor Financeiro IA da empresa. Sua tarefa é analisar Áudio, Imagem ou PDF e decidir a intenção:

INTENÇÕES:
- "CRIAR_CONTA": Se for um boleto, fatura ou ordem de voz para pagar no futuro.
- "DAR_BAIXA": Se for um comprovante de transferência/Pix ou voz dizendo que algo foi pago.
- "CRIAR_E_PAGAR": Se for um comprovante de algo que não estava no sistema.

REGRAS FINANCEIRAS:
1. Extraia o valor principal, juros e descontos separadamente.
2. Valor Final = Valor Original + Juros - Desconto. Armazene em valor_final_centavos.
3. Se for voz e o usuário disser "Paguei hoje", use a data atual em data_pagamento.
4. Identifique o fornecedor pelo logotipo, nome no documento ou menção no áudio.
5. Valores SEMPRE em centavos (R$ 100,00 = 10000). Datas em YYYY-MM-DD.
6. Use observacao_ia para explicar sua análise ou alertar sobre algo importante.
7. Em fornecedor_nome_sugerido, coloque o nome da empresa/pessoa que receberá o pagamento.
8. Em categoria_sugerida, sugira uma categoria (ex: "Telefonia", "Aluguel", "Fornecedor").

IMPORTANTE: Retorne APENAS JSON válido.`;

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
  let instruction = BASE_SYSTEM_INSTRUCTION;

  if (businessRules.length > 0) {
    const rulesSection = `

===== REGRAS DE NEGÓCIO PERSONALIZADAS =====
ATENÇÃO: Estas regras são específicas desta empresa e DEVEM ser aplicadas:

${businessRules.map((r, i) => `${i + 1}. ${r}`).join('\n')}

=============================================
`;
    instruction = rulesSection + instruction;
  }

  return instruction;
}

interface RequestBody {
  prompt?: string;
  image_base64?: string;
  image_mime_type?: string;
  pdf_base64?: string;
  audio_base64?: string;
  audio_mime_type?: string;
  num_parcelas?: number;
  primeira_data_vencimento?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body: RequestBody = await req.json();
    const { 
      prompt, 
      image_base64, 
      image_mime_type, 
      pdf_base64, 
      audio_base64, 
      audio_mime_type,
      num_parcelas, 
      primeira_data_vencimento 
    } = body;

    // Ler API Key dos Secrets do Supabase
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY não configurada nos Secrets do Supabase");
    }

    // Fetch business knowledge from database (Cérebro da IA)
    console.log("🧠 Carregando cérebro da IA (ia_conhecimento)...");
    const businessRules = await fetchBusinessKnowledge();
    const systemInstruction = buildSystemInstruction(businessRules);
    console.log("📋 System Instruction construída com", businessRules.length, "regras de negócio");

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

    // Adicionar áudio se fornecido (multimodal)
    if (audio_base64 && audio_mime_type) {
      console.log(`🎤 Processando áudio (${audio_mime_type}), tamanho: ${(audio_base64.length / 1024).toFixed(1)}KB`);
      parts.push({
        inline_data: {
          mime_type: audio_mime_type,
          data: audio_base64
        }
      });
    }

    // Se não há conteúdo, usar prompt padrão
    if (parts.length === 0) {
      parts.push({ text: prompt || "Extraia os dados financeiros do documento." });
    }

    // Adicionar data atual para contexto
    const hoje = new Date().toISOString().split('T')[0];
    parts.push({ text: `Data de hoje: ${hoje}` });

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

    console.log("🚀 Enviando para Gemini 3 Flash Preview (Multimodal: Imagem/PDF/Áudio)...");

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

    // Extrair o texto da resposta
    const resultText = data.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
    console.log("📝 JSON extraído:", resultText.substring(0, 500));

    // Parse do JSON estruturado
    const geminiResponse = JSON.parse(resultText);
    
    console.log("🎯 Intenção detectada:", geminiResponse.intencao);
    console.log("💰 Valor:", geminiResponse.contas_pagar?.valor_total_centavos);
    console.log("🏢 Fornecedor:", geminiResponse.contas_pagar?.fornecedor_nome_sugerido);

    // Mapear para formato esperado pelo frontend
    const formattedResponse = {
      intencao: geminiResponse.intencao || "CRIAR_CONTA",
      conta_pagar: {
        descricao: geminiResponse.contas_pagar?.descricao || null,
        numero_nota: geminiResponse.contas_pagar?.numero_nota || null,
        chave_nfe: geminiResponse.contas_pagar?.chave_nfe || null,
        valor_total_centavos: geminiResponse.contas_pagar?.valor_total_centavos || 0,
        juros_centavos: geminiResponse.contas_pagar?.juros_centavos || 0,
        desconto_centavos: geminiResponse.contas_pagar?.desconto_centavos || 0,
        valor_final_centavos: geminiResponse.contas_pagar?.valor_final_centavos || geminiResponse.contas_pagar?.valor_total_centavos || 0,
        data_emissao: geminiResponse.contas_pagar?.data_emissao || null,
        data_pagamento: geminiResponse.contas_pagar?.data_pagamento || null,
        referencia: geminiResponse.contas_pagar?.referencia || null,
        fornecedor_nome_sugerido: geminiResponse.contas_pagar?.fornecedor_nome_sugerido || null,
        categoria_sugerida: geminiResponse.contas_pagar?.categoria_sugerida || null,
        num_parcelas: geminiResponse.contas_pagar?.num_parcelas || 1,
      },
      parcelas: geminiResponse.contas_pagar_parcelas || [],
      observacao_ia: geminiResponse.observacao_ia || null,
      confianca: 95,
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
