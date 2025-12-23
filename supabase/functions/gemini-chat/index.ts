import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `Você é um extrator de dados de documentos financeiros (boletos, notas fiscais, faturas, comprovantes).
Analise o documento (texto ou imagem) e extraia os dados para criar uma conta a pagar.

RETORNE APENAS um JSON válido com esta estrutura exata:

{
  "conta_pagar": {
    "descricao": "string - descrição do documento/serviço",
    "numero_nota": "string ou null - número da nota/fatura/boleto",
    "chave_nfe": "string ou null - chave NFe se houver (44 dígitos)",
    "valor_total_centavos": número inteiro em CENTAVOS (ex: R$ 150,00 = 15000),
    "data_emissao": "YYYY-MM-DD ou null",
    "referencia": "string ou null - código de barras/linha digitável",
    "fornecedor_nome_sugerido": "string - nome do fornecedor/empresa emissora",
    "categoria_sugerida": "string - categoria financeira sugerida (ex: Energia, Internet, Aluguel, Material)"
  },
  "parcelas": [
    {
      "parcela_num": 1,
      "valor_parcela_centavos": número inteiro em CENTAVOS,
      "vencimento": "YYYY-MM-DD"
    }
  ],
  "confianca": número de 0 a 100 indicando certeza da extração,
  "observacoes": "string ou null - informações adicionais encontradas"
}

REGRAS OBRIGATÓRIAS:
- Valores SEMPRE em centavos (número inteiro, ex: R$ 150,00 = 15000)
- Datas SEMPRE no formato YYYY-MM-DD
- Se houver múltiplas parcelas no documento, liste todas com seus vencimentos
- Se não encontrar um campo, use null (não invente dados)
- O JSON deve ser válido e parseable
- NÃO inclua markdown, apenas o JSON puro`;

interface RequestBody {
  prompt?: string;
  image_base64?: string;
  image_mime_type?: string;
  pdf_base64?: string;
  num_parcelas?: number;
  primeira_data_vencimento?: string;
}

interface ContaPagar {
  descricao: string | null;
  numero_nota: string | null;
  chave_nfe: string | null;
  valor_total_centavos: number;
  data_emissao: string | null;
  referencia: string | null;
  fornecedor_nome_sugerido: string | null;
  categoria_sugerida: string | null;
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
    const parts: any[] = [{ text: SYSTEM_PROMPT }];

    // Adicionar texto se fornecido
    if (prompt) {
      parts.push({ text: `\n\nTexto/Descrição adicional: ${prompt}` });
    }

    // Adicionar contexto de parcelas se fornecido
    if (num_parcelas && num_parcelas > 1) {
      parts.push({ 
        text: `\n\nDIVIDIR EM ${num_parcelas} PARCELAS IGUAIS. Primeira parcela vence em: ${primeira_data_vencimento || 'calcular 30 dias a partir da data de emissão'}. Parcelas subsequentes a cada 30 dias.` 
      });
    }

    // Adicionar imagem se fornecida
    if (image_base64 && image_mime_type) {
      console.log(`📷 Processando imagem (${image_mime_type}), tamanho base64: ${image_base64.length} chars`);
      parts.push({
        inline_data: {
          mime_type: image_mime_type,
          data: image_base64
        }
      });
    }

    // Adicionar PDF se fornecido (Gemini suporta application/pdf)
    if (pdf_base64) {
      console.log(`📄 Processando PDF, tamanho base64: ${pdf_base64.length} chars`);
      parts.push({
        inline_data: {
          mime_type: "application/pdf",
          data: pdf_base64
        }
      });
    }

    // Validar que há conteúdo para processar
    if (parts.length === 1) {
      throw new Error("Envie ao menos um prompt, imagem ou PDF para análise");
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;

    console.log("🚀 Enviando para Gemini 2.5 Flash (multimodal)...");

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts }],
        generationConfig: {
          temperature: 0.1,
          topP: 0.8,
          maxOutputTokens: 2048,
        }
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error("❌ Erro Gemini API:", response.status, errorData);
      throw new Error(`Erro na API Gemini (${response.status}): ${errorData}`);
    }

    const data = await response.json();
    console.log("✅ Resposta recebida do Gemini");

    let resultText = data.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
    
    // Limpar markdown code blocks
    resultText = resultText
      .replace(/```json\s*/gi, "")
      .replace(/```\s*/g, "")
      .trim();

    console.log("📝 Texto extraído:", resultText.substring(0, 500));

    let jsonResponse: GeminiResponse;
    try {
      jsonResponse = JSON.parse(resultText);
      
      // Validações de schema
      if (!jsonResponse.conta_pagar) {
        throw new Error("Campo conta_pagar ausente");
      }
      
      // Garantir valor_total_centavos é número
      if (typeof jsonResponse.conta_pagar.valor_total_centavos !== 'number') {
        jsonResponse.conta_pagar.valor_total_centavos = 
          parseInt(String(jsonResponse.conta_pagar.valor_total_centavos).replace(/\D/g, '')) || 0;
      }
      
      // Garantir parcelas existe e é array
      if (!jsonResponse.parcelas || !Array.isArray(jsonResponse.parcelas)) {
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
          : parseInt(String(p.valor_parcela_centavos).replace(/\D/g, '')) || 0,
        vencimento: p.vencimento || new Date().toISOString().split('T')[0]
      }));
      
      // Garantir confianca é número
      if (typeof jsonResponse.confianca !== 'number') {
        jsonResponse.confianca = 50;
      }

      console.log("✅ JSON validado com sucesso");

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
