import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_INSTRUCTION = `Você é um robô de extração de dados financeiros. Leia a imagem e extraia os dados para as tabelas contas_pagar e contas_pagar_parcelas. Retorne APENAS JSON. Valores em centavos. Datas em YYYY-MM-DD.

SCHEMA OBRIGATÓRIO:
{
  "conta_pagar": {
    "descricao": "string - Descrição do documento/serviço",
    "numero_nota": "string ou null - Número da nota/fatura/boleto",
    "chave_nfe": "string ou null - Chave NFe (44 dígitos)",
    "valor_total_centavos": "integer - Valor total em CENTAVOS (R$ 150,00 = 15000)",
    "data_emissao": "string ou null - Data de emissão no formato YYYY-MM-DD",
    "referencia": "string ou null - Código de barras/linha digitável",
    "fornecedor_nome_sugerido": "string - Nome do fornecedor/empresa emissora",
    "categoria_sugerida": "string - Categoria financeira (Energia, Internet, Aluguel, etc)"
  },
  "parcelas": [
    {
      "parcela_num": "integer - Número da parcela (1, 2, 3...)",
      "valor_parcela_centavos": "integer - Valor da parcela em CENTAVOS",
      "vencimento": "string - Data de vencimento YYYY-MM-DD"
    }
  ],
  "confianca": "integer - Nível de confiança 0 a 100",
  "observacoes": "string ou null - Informações adicionais"
}

ATENÇÃO:
- Em boletos: beneficiário, valor, vencimento, código de barras
- Em notas fiscais: emitente, CNPJ, número da nota, chave de acesso, total
- Em faturas: empresa, valor, referência do mês, vencimento
- CATEGORIAS: Energia, Água, Internet, Telefonia, Aluguel, Condomínio, Material, Serviços, Impostos, Seguros, Manutenção, Combustível, Frete, Marketing`;

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
      throw new Error("GEMINI_API_KEY não configurada nos Secrets do Supabase");
    }

    // Construir as parts do conteúdo
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

    // Configuração conforme Google AI Studio - gemini-3-flash-preview
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${GEMINI_API_KEY}`;

    console.log("🚀 Enviando para Gemini 3 Flash Preview (Temperature 0, Thinking HIGH)...");

    // Request body seguindo exatamente o código do AI Studio
    const requestBody = {
      contents: [{
        role: "user",
        parts
      }],
      systemInstruction: {
        parts: [{ text: SYSTEM_INSTRUCTION }]
      },
      generationConfig: {
        temperature: 0,
        topP: 0,
        maxOutputTokens: 8192,
        responseMimeType: "application/json",
        thinkingConfig: {
          thinkingLevel: "HIGH"
        }
      }
    };

    console.log("📤 Modelo: gemini-3-flash-preview | Temperature: 0 | Thinking: HIGH");

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

    // Extrair texto da resposta
    let resultText = data.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
    
    // Limpar possíveis markdown code blocks
    resultText = resultText
      .replace(/```json\s*/gi, "")
      .replace(/```\s*/g, "")
      .trim();

    console.log("📝 JSON recebido:", resultText.substring(0, 500));

    // Parsear e validar JSON
    let jsonResponse: GeminiResponse;
    try {
      jsonResponse = JSON.parse(resultText);
      
      // Validações de segurança
      if (!jsonResponse.conta_pagar) {
        throw new Error("Campo conta_pagar ausente");
      }
      
      // Garantir valor_total_centavos é número inteiro
      if (typeof jsonResponse.conta_pagar.valor_total_centavos !== 'number') {
        const valorStr = String(jsonResponse.conta_pagar.valor_total_centavos).replace(/[^\d.,]/g, '').replace(',', '.');
        jsonResponse.conta_pagar.valor_total_centavos = Math.round(parseFloat(valorStr) * 100) || 0;
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

      console.log("✅ JSON validado - Confiança:", jsonResponse.confianca, "%");

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
