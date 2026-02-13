import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const FRETE_ENDPOINT = 'https://edi.totalexpress.com.br/webservice_calculo_frete_v2.php';

function basicAuth(user: string, password: string): string {
  return 'Basic ' + btoa(`${user}:${password}`);
}

function parseXml(xmlText: string): Document {
  return new DOMParser().parseFromString(xmlText, 'text/xml');
}

function getTagText(doc: Document, tagName: string): string {
  const el = doc.getElementsByTagName(tagName)[0];
  return el?.textContent || '';
}

async function calcularFreteSoap(cepDestino: string, pesoKg: number, valorCentavos: number, tipoServico: string) {
  const user = Deno.env.get('TOTAL_EXPRESS_USER')!;
  const password = Deno.env.get('TOTAL_EXPRESS_PASSWORD')!;

  const soapBody = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xmlns:xsd="http://www.w3.org/2001/XMLSchema"
  xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"
  xmlns:urn="urn:calcularFrete">
  <soapenv:Header/>
  <soapenv:Body>
    <urn:calcularFrete soapenv:encodingStyle="http://schemas.xmlsoap.org/soap/encoding/">
      <calcularFreteRequest xsi:type="web:calcularFreteRequest"
        xmlns:web="http://edi.totalexpress.com.br/soap/webservice_calculo_frete.total">
        <TipoServico xsi:type="xsd:string">${tipoServico}</TipoServico>
        <CepDestino xsi:type="xsd:nonNegativeInteger">${cepDestino}</CepDestino>
        <Peso xsi:type="xsd:string">${pesoKg.toFixed(2).replace('.', ',')}</Peso>
        <ValorDeclarado xsi:type="xsd:string">${(valorCentavos / 100).toFixed(2).replace('.', ',')}</ValorDeclarado>
        <TipoEntrega xsi:type="xsd:nonNegativeInteger">0</TipoEntrega>
      </calcularFreteRequest>
    </urn:calcularFrete>
  </soapenv:Body>
</soapenv:Envelope>`;

  const response = await fetch(FRETE_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'text/xml; charset=utf-8',
      'Authorization': basicAuth(user, password),
      'User-Agent': 'LovableApp/1.0',
    },
    body: soapBody,
  });

  const xmlText = await response.text();
  const doc = parseXml(xmlText);
  const codigoProc = getTagText(doc, 'CodigoProc');

  if (codigoProc !== '1') return null;

  const prazo = parseInt(getTagText(doc, 'Prazo')) || 0;
  const valorServico = parseFloat(getTagText(doc, 'ValorServico').replace(',', '.')) || 0;

  return { prazo, valor: valorServico };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const user = Deno.env.get('TOTAL_EXPRESS_USER');
    const password = Deno.env.get('TOTAL_EXPRESS_PASSWORD');
    if (!user || !password) {
      throw new Error('Credenciais Total Express não configuradas');
    }

    // Shopify Carrier Service sends POST with rate request
    const body = await req.json();

    // Check if this is a Shopify carrier service callback
    if (body.rate) {
      const { rate } = body;
      const destPostalCode = (rate.destination?.postal_code || '').replace(/\D/g, '');
      
      if (!destPostalCode || destPostalCode.length !== 8) {
        return new Response(JSON.stringify({ rates: [] }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Calculate total weight in kg
      const totalGrams = rate.items?.reduce((acc: number, item: { grams: number; quantity: number }) => 
        acc + (item.grams || 500) * (item.quantity || 1), 0) || 500;
      const totalKg = Math.max(0.3, totalGrams / 1000);

      // Calculate total value in centavos
      const totalValue = rate.items?.reduce((acc: number, item: { price: number; quantity: number }) => 
        acc + (item.price || 0) * (item.quantity || 1), 0) || 0;

      // Try both STD and EXP
      const [stdResult, expResult] = await Promise.allSettled([
        calcularFreteSoap(destPostalCode, totalKg, totalValue, 'STD'),
        calcularFreteSoap(destPostalCode, totalKg, totalValue, 'EXP'),
      ]);

      const rates: Array<{
        service_name: string;
        service_code: string;
        total_price: string;
        currency: string;
        min_delivery_date: string;
        max_delivery_date: string;
      }> = [];

      const now = new Date();

      if (stdResult.status === 'fulfilled' && stdResult.value) {
        const delivery = new Date(now);
        delivery.setDate(delivery.getDate() + stdResult.value.prazo);
        rates.push({
          service_name: `Total Express Standard (${stdResult.value.prazo} dias úteis)`,
          service_code: 'total_express_std',
          total_price: Math.round(stdResult.value.valor * 100).toString(),
          currency: 'BRL',
          min_delivery_date: delivery.toISOString().split('T')[0],
          max_delivery_date: delivery.toISOString().split('T')[0],
        });
      }

      if (expResult.status === 'fulfilled' && expResult.value) {
        const delivery = new Date(now);
        delivery.setDate(delivery.getDate() + expResult.value.prazo);
        rates.push({
          service_name: `Total Express Expresso (${expResult.value.prazo} dias úteis)`,
          service_code: 'total_express_exp',
          total_price: Math.round(expResult.value.valor * 100).toString(),
          currency: 'BRL',
          min_delivery_date: delivery.toISOString().split('T')[0],
          max_delivery_date: delivery.toISOString().split('T')[0],
        });
      }

      return new Response(JSON.stringify({ rates }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Direct call from dashboard for testing
    if (body.action === 'test') {
      const result = await calcularFreteSoap(
        (body.cep_destino || '').replace(/\D/g, ''),
        body.peso || 0.5,
        body.valor || 10000,
        body.tipo_servico || 'STD'
      );
      return new Response(JSON.stringify({ success: true, data: result }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Register this as carrier service on Shopify
    if (body.action === 'register_carrier_service') {
      const SHOPIFY_STORE_DOMAIN = Deno.env.get('SHOPIFY_STORE_DOMAIN');
      const SHOPIFY_ADMIN_API_TOKEN = Deno.env.get('SHOPIFY_ADMIN_API_TOKEN');
      if (!SHOPIFY_STORE_DOMAIN || !SHOPIFY_ADMIN_API_TOKEN) {
        throw new Error('Credenciais Shopify não configuradas');
      }

      const storeDomain = SHOPIFY_STORE_DOMAIN.replace(/^https?:\/\//, '').replace(/\/$/, '');
      const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
      const callbackUrl = `${SUPABASE_URL}/functions/v1/carrier-service`;

      const response = await fetch(`https://${storeDomain}/admin/api/2024-01/carrier_services.json`, {
        method: 'POST',
        headers: {
          'X-Shopify-Access-Token': SHOPIFY_ADMIN_API_TOKEN,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          carrier_service: {
            name: 'Total Express',
            callback_url: callbackUrl,
            service_discovery: true,
            format: 'json',
          },
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(`Erro Shopify: ${response.status} - ${JSON.stringify(data)}`);
      }

      return new Response(JSON.stringify({ success: true, data: data.carrier_service }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Ação não reconhecida' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Carrier Service Error:', error);
    const message = error instanceof Error ? error.message : 'Erro desconhecido';
    return new Response(JSON.stringify({ success: false, error: message, rates: [] }), {
      status: 200, // Shopify expects 200 even on errors
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
