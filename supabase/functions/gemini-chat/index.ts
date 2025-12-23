import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Schema JSON exato para Structured Output do Gemini 3
const RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    conta_pagar: {
      type: "object",
      properties: {
        descricao: { type: "string", description: "Descrição do documento/serviço" },
        numero_nota: { type: "string", nullable: true, description: "Número da nota/fatura/boleto" },
        chave_nfe: { type: "string", nullable: true, description: "Chave NFe (44 dígitos)" },
        valor_total_centavos: { type: "integer", description: "Valor total em CENTAVOS (R$ 150,00 = 15000)" },
        data_emissao: { type: "string", nullable: true, description: "Data de emissão no formato YYYY-MM-DD" },
        referencia: { type: "string", nullable: true, description: "Código de barras/linha digitável" },
        fornecedor_nome_sugerido: { type: "string", description: "Nome do fornecedor/empresa emissora" },
        categoria_sugerida: { type: "string", description: "Categoria financeira sugerida (ex: Energia, Internet, Aluguel)" }
      },
      required: ["descricao", "valor_total_centavos", "fornecedor_nome_sugerido", "categoria_sugerida"]
    },
    parcelas: {
      type: "array",
      items: {
        type: "object",
        properties: {
          parcela_num: { type: "integer", description: "Número da parcela (1, 2, 3...)" },
          valor_parcela_centavos: { type: "integer", description: "Valor da parcela em CENTAVOS" },
          vencimento: { type: "string", description: "Data de vencimento no formato YYYY-MM-DD" }
        },
        required: ["parcela_num", "valor_parcela_centavos", "vencimento"]
      }
    },
    confianca: { type: "integer", description: "Nível de confiança da extração (0 a 100)" },
    observacoes: { type: "string", nullable: true, description: "Informações adicionais encontradas" }
  },
  required: ["conta_pagar", "parcelas", "confianca"]
};

const SYSTEM_INSTRUCTION = `Você é um extrator especializado de dados financeiros de documentos brasileiros (boletos, notas fiscais, faturas, comprovantes).

INSTRUÇÕES:
1. Analise cuidadosamente o documento (texto, imagem ou PDF)
2. Extraia TODOS os dados financeiros relevantes
3. SEMPRE converta valores para CENTAVOS (R$ 150,00 = 15000)
4. Datas SEMPRE no formato YYYY-MM-DD
5. Se houver múltiplas parcelas, liste todas com suas datas de vencimento
6. Se não encontrar um campo, use null
7. O campo confianca deve refletir a qualidade da extração (0-100)

ATENÇÃO ESPECIAL:
- Em boletos, procure: beneficiário, valor, vencimento, código de barras
- Em notas fiscais: emitente, CNPJ, número da nota, chave de acesso, produtos, total
- Em faturas: empresa, valor, referência do mês, vencimento

CATEGORIAS COMUNS: Energia, Água, Internet, Telefonia, Aluguel, Condomínio, Material de Escritório, Serviços, Impostos, Seguros, Manutenção, Combustível, Frete, Marketing`;

interface RequestBody {
  prompt?: string;
  image_base64?: string;
  image_mime_type?: string;
  pdf_base64?: string;
  num_parcelas?: number;
  primeira_data_vencimento?: string;
}

interface ContaPagar {
  descricao: string;
  numero_nota: string | null;
  chave_nfe: string | null;
  valor_total_centavos: number;
  data_emissao: string | null;
  referencia: string | null;
  fornecedor_nome_sugerido: string;
  categoria_sugerida: string;
}

interface Parcela {
  parcela_num: number;
  valor_parcela_centavos: number;
  vencimento: string;
}

interface GeminiResponse {
  conta_pagar: ContaPagar;
  parcelas: Parcela[];
  confianca: number;
  observacoes: string | null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body: RequestBody = await req.json();
    const { prompt, image_base64, image_mime_type, pdf_base64, num_parcelas, primeira_data_vencimento } = body;

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY não configurada");
    }

    // Construir as parts do request
    const parts: any[] = [];

    // Adicionar texto se fornecido
    if (prompt) {
      parts.push({ text: `Documento/Descrição: ${prompt}` });
    }

    // Adicionar contexto de parcelas se fornecido
    if (num_parcelas && num_parcelas > 1) {
      parts.push({ 
        text: `DIVIDIR EM ${num_parcelas} PARCELAS IGUAIS. Primeira parcela vence em: ${primeira_data_vencimento || 'calcular 30 dias a partir da data de emissão'}. Parcelas subsequentes a cada 30 dias.` 
      });
    }

    // Adicionar imagem se fornecida
    if (image_base64 && image_mime_type) {
      console.log(`📷 Processando imagem (${image_mime_type}), tamanho: ${(image_base64.length / 1024).toFixed(1)}KB`);
      parts.push({
        inline_data: {
          mime_type: image_mime_type,
          data: image_base64
        }
      });
    }

    // Adicionar PDF se fornecido
    if (pdf_base64) {
      console.log(`📄 Processando PDF, tamanho: ${(pdf_base64.length / 1024).toFixed(1)}KB`);
      parts.push({
        inline_data: {
          mime_type: "application/pdf",
          data: pdf_base64
        }
      });
    }

    // Validar que há conteúdo para processar
    if (parts.length === 0) {
      throw new Error("Envie ao menos um prompt, imagem ou PDF para análise");
    }

    // Gemini 3 Flash Preview com Structured Output e Thinking High
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${GEMINI_API_KEY}`;

    console.log("🚀 Enviando para Gemini 3 Flash Preview (Structured Output + Thinking High)...");

    const requestBody = {
      contents: [{ 
        role: "user",
        parts 
      }],
      systemInstruction: {
        parts: [{ text: SYSTEM_INSTRUCTION }]
      },
      generationConfig: {
        temperature: 0.1,
        topP: 0.8,
        maxOutputTokens: 4096,
        responseMimeType: "application/json",
        responseSchema: RESPONSE_SCHEMA,
        thinkingConfig: {
          thinkingBudget: 2048 // Thinking Level High para cálculos precisos
        }
      }
    };

    console.log("📤 Request body:", JSON.stringify(requestBody, null, 2).substring(0, 1000));

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error("❌ Erro Gemini API:", response.status, errorData);
      
      // Se Gemini 3 não estiver disponível, fallback para 2.5 Flash
      if (response.status === 404 || errorData.includes("not found")) {
        console.log("⚠️ Gemini 3 Flash Preview não disponível, tentando Gemini 2.5 Flash...");
        const fallbackUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;
        
        const fallbackResponse = await fetch(fallbackUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ role: "user", parts }],
            systemInstruction: { parts: [{ text: SYSTEM_INSTRUCTION }] },
            generationConfig: {
              temperature: 0.1,
              topP: 0.8,
              maxOutputTokens: 4096,
              responseMimeType: "application/json",
              responseSchema: RESPONSE_SCHEMA
            }
          }),
        });
        
        if (!fallbackResponse.ok) {
          const fallbackError = await fallbackResponse.text();
          throw new Error(`Erro na API Gemini: ${fallbackError}`);
        }
        
        const fallbackData = await fallbackResponse.json();
        return processGeminiResponse(fallbackData, corsHeaders);
      }
      
      throw new Error(`Erro na API Gemini (${response.status}): ${errorData}`);
    }

    const data = await response.json();
    return processGeminiResponse(data, corsHeaders);

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

function processGeminiResponse(data: any, corsHeaders: Record<string, string>): Response {
  console.log("✅ Resposta recebida do Gemini");

  let resultText = data.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
  
  // Limpar markdown code blocks se houver
  resultText = resultText
    .replace(/```json\s*/gi, "")
    .replace(/```\s*/g, "")
    .trim();

  console.log("📝 JSON recebido:", resultText.substring(0, 500));

  let jsonResponse: GeminiResponse;
  try {
    jsonResponse = JSON.parse(resultText);
    
    // Validações de segurança
    if (!jsonResponse.conta_pagar) {
      throw new Error("Campo conta_pagar ausente");
    }
    
    // Garantir valor_total_centavos é número inteiro
    if (typeof jsonResponse.conta_pagar.valor_total_centavos !== 'number') {
      jsonResponse.conta_pagar.valor_total_centavos = 
        Math.round(parseFloat(String(jsonResponse.conta_pagar.valor_total_centavos).replace(/[^\d.,]/g, '').replace(',', '.')) * 100) || 0;
    }
    
    // Garantir parcelas existe e é array
    if (!jsonResponse.parcelas || !Array.isArray(jsonResponse.parcelas) || jsonResponse.parcelas.length === 0) {
      const hoje = new Date().toISOString().split('T')[0];
      jsonResponse.parcelas = [{
        parcela_num: 1,
        valor_parcela_centavos: jsonResponse.conta_pagar.valor_total_centavos,
        vencimento: jsonResponse.conta_pagar.data_emissao || hoje
      }];
    }
    
    // Validar cada parcela
    jsonResponse.parcelas = jsonResponse.parcelas.map((p, idx) => ({
      parcela_num: p.parcela_num || idx + 1,
      valor_parcela_centavos: typeof p.valor_parcela_centavos === 'number' 
        ? p.valor_parcela_centavos 
        : Math.round(parseFloat(String(p.valor_parcela_centavos).replace(/[^\d.,]/g, '').replace(',', '.')) * 100) || 0,
      vencimento: p.vencimento || new Date().toISOString().split('T')[0]
    }));
    
    // Garantir confianca é número
    if (typeof jsonResponse.confianca !== 'number') {
      jsonResponse.confianca = 50;
    }

    console.log("✅ JSON validado com sucesso - Confiança:", jsonResponse.confianca, "%");

  } catch (parseError) {
    console.error("❌ Erro ao parsear JSON:", parseError);
    return new Response(JSON.stringify({ 
      error: "Falha ao estruturar resposta",
      raw: resultText,
      parseError: parseError instanceof Error ? parseError.message : 'Erro desconhecido'
    }), {
      status: 422,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify(jsonResponse), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
