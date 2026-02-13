import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SHOPIFY_STORE_DOMAIN = Deno.env.get('SHOPIFY_STORE_DOMAIN');
    const SHOPIFY_ADMIN_API_TOKEN = Deno.env.get('SHOPIFY_ADMIN_API_TOKEN');

    if (!SHOPIFY_STORE_DOMAIN || !SHOPIFY_ADMIN_API_TOKEN) {
      throw new Error('Credenciais Shopify não configuradas');
    }

    const storeDomain = SHOPIFY_STORE_DOMAIN.replace(/^https?:\/\//, '').replace(/\/$/, '');
    const baseUrl = `https://${storeDomain}/admin/api/2024-01`;

    const shopifyFetch = async (endpoint: string, options: RequestInit = {}) => {
      const response = await fetch(`${baseUrl}${endpoint}`, {
        ...options,
        headers: {
          'X-Shopify-Access-Token': SHOPIFY_ADMIN_API_TOKEN,
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Shopify API error: ${response.status} - ${errorText}`);
      }
      return response.json();
    };

    const { action, ...params } = await req.json();
    let result: unknown;

    switch (action) {
      // List orders (for the shipping dashboard)
      case 'get_orders': {
        const status = params.fulfillment_status || 'unfulfilled';
        const limit = params.limit || 50;
        const data = await shopifyFetch(`/orders.json?status=any&fulfillment_status=${status}&limit=${limit}`);
        result = data.orders;
        break;
      }

      // Get single order
      case 'get_order': {
        const { order_id } = params;
        if (!order_id) throw new Error('order_id é obrigatório');
        const data = await shopifyFetch(`/orders/${order_id}.json`);
        result = data.order;
        break;
      }

      // Create fulfillment with tracking
      case 'create_fulfillment': {
        const { order_id, tracking_number, tracking_company, tracking_url, line_items } = params;
        if (!order_id) throw new Error('order_id é obrigatório');

        // First get fulfillment orders
        const foData = await shopifyFetch(`/orders/${order_id}/fulfillment_orders.json`);
        const fulfillmentOrders = foData.fulfillment_orders || [];
        
        if (fulfillmentOrders.length === 0) {
          throw new Error('Nenhum fulfillment order encontrado');
        }

        // Get the open fulfillment order
        const openFO = fulfillmentOrders.find((fo: { status: string }) => fo.status === 'open') || fulfillmentOrders[0];

        const fulfillmentBody: Record<string, unknown> = {
          fulfillment: {
            line_items_by_fulfillment_order: [{
              fulfillment_order_id: openFO.id,
            }],
            tracking_info: {
              number: tracking_number || '',
              company: tracking_company || 'Total Express',
              url: tracking_url || '',
            },
            notify_customer: true,
          },
        };

        const data = await shopifyFetch('/fulfillments.json', {
          method: 'POST',
          body: JSON.stringify(fulfillmentBody),
        });
        result = data.fulfillment;
        break;
      }

      // Update tracking on existing fulfillment
      case 'update_tracking': {
        const { fulfillment_id, tracking_number, tracking_company, tracking_url } = params;
        if (!fulfillment_id) throw new Error('fulfillment_id é obrigatório');

        const data = await shopifyFetch(`/fulfillments/${fulfillment_id}/update_tracking.json`, {
          method: 'POST',
          body: JSON.stringify({
            fulfillment: {
              notify_customer: true,
              tracking_info: {
                number: tracking_number || '',
                company: tracking_company || 'Total Express',
                url: tracking_url || '',
              },
            },
          }),
        });
        result = data.fulfillment;
        break;
      }

      default:
        throw new Error(`Ação desconhecida: ${action}`);
    }

    return new Response(JSON.stringify({ success: true, data: result }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Shopify Fulfillment Error:', error);
    const message = error instanceof Error ? error.message : 'Erro desconhecido';
    return new Response(JSON.stringify({ success: false, error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
