import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    const graphqlUrl = `https://${storeDomain}/admin/api/2024-01/graphql.json`;

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

    const shopifyGraphQL = async (query: string, variables: Record<string, unknown> = {}) => {
      const response = await fetch(graphqlUrl, {
        method: 'POST',
        headers: {
          'X-Shopify-Access-Token': SHOPIFY_ADMIN_API_TOKEN,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query, variables }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Shopify GraphQL error: ${response.status} - ${errorText}`);
      }

      const json = await response.json();
      if (json.errors && json.errors.length > 0) {
        throw new Error(`Shopify GraphQL errors: ${JSON.stringify(json.errors)}`);
      }
      return json.data;
    };
    const { action, ...params } = await req.json();
    let result: unknown;

    switch (action) {
      case 'get_orders': {
        const status = params.fulfillment_status || 'unfulfilled';
        const limit = params.limit || 50;
        const data = await shopifyFetch(`/orders.json?status=any&fulfillment_status=${status}&limit=${limit}`);
        result = data.orders;
        break;
      }

      case 'get_order': {
        const { order_id } = params;
        if (!order_id) throw new Error('order_id é obrigatório');
        const data = await shopifyFetch(`/orders/${order_id}.json`);
        result = data.order;
        break;
      }

      case 'import_orders': {
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        const supabase = createClient(supabaseUrl, supabaseKey);

        const statuses = params.fulfillment_status || 'any';
        const limit = params.limit || 250;
        const data = await shopifyFetch(`/orders.json?status=any&fulfillment_status=${statuses}&limit=${limit}`);
        const allOrders = data.orders || [];

        const { data: existingEnvios } = await supabase
          .from('envios')
          .select('shopify_order_id')
          .not('shopify_order_id', 'is', null);
        
        const existingIds = new Set((existingEnvios || []).map((e: { shopify_order_id: number }) => e.shopify_order_id));

        const newEnvios: Array<Record<string, unknown>> = [];

        for (const order of allOrders) {
          if (existingIds.has(order.id)) continue;

          const shipping = (order.shipping_address as Record<string, string>) || {};
          const totalWeight = (order.line_items as Array<{ grams: number; quantity: number }>)?.reduce(
            (acc: number, item: { grams: number; quantity: number }) => acc + (item.grams || 0) * (item.quantity || 1), 0
          ) || 0;

          let status = 'pendente';
          if (order.fulfillment_status === 'fulfilled') status = 'entregue';
          else if (order.fulfillment_status === 'partial') status = 'em_transito';

          let awb = '';
          let fulfillmentId = null;
          const fulfillments = (order.fulfillments as Array<Record<string, unknown>>) || [];
          if (fulfillments.length > 0) {
            const lastFulfillment = fulfillments[fulfillments.length - 1];
            awb = (lastFulfillment.tracking_number as string) || '';
            fulfillmentId = lastFulfillment.id as number;
          }

          newEnvios.push({
            shopify_order_id: order.id,
            shopify_order_name: order.name || `#${order.order_number}`,
            shopify_fulfillment_id: fulfillmentId,
            dest_nome: shipping.name || (order.customer as Record<string, string>)?.first_name || 'Sem nome',
            dest_cpf_cnpj: '',
            dest_endereco: shipping.address1 || '',
            dest_numero: shipping.address2 || 'S/N',
            dest_complemento: '',
            dest_bairro: shipping.company || '',
            dest_cidade: shipping.city || '',
            dest_estado: shipping.province_code || '',
            dest_cep: (shipping.zip || '').replace(/\D/g, ''),
            dest_email: (order.email as string) || '',
            dest_telefone: shipping.phone || (order.phone as string) || '',
            peso_kg: totalWeight > 0 ? totalWeight / 1000 : null,
            valor_declarado_centavos: Math.round(parseFloat(order.total_price as string || '0') * 100),
            status,
            awb: awb || null,
            volumes: 1,
          });
        }

        if (newEnvios.length > 0) {
          const { error: insertError } = await supabase
            .from('envios')
            .insert(newEnvios);
          if (insertError) throw new Error(`Erro ao inserir envios: ${insertError.message}`);
        }

        result = {
          total_orders: allOrders.length,
          already_imported: existingIds.size,
          new_imported: newEnvios.length,
        };
        break;
      }

      case 'create_fulfillment': {
        const { order_id, tracking_number, tracking_company, tracking_url } = params;
        if (!order_id) throw new Error('order_id é obrigatório');

        // Get fulfillment orders via REST to find the GID
        const foData = await shopifyFetch(`/orders/${order_id}/fulfillment_orders.json`);
        const fulfillmentOrders = foData.fulfillment_orders || [];
        
        if (fulfillmentOrders.length === 0) {
          throw new Error('Nenhum fulfillment order encontrado');
        }

        const openFO = fulfillmentOrders.find((fo: { status: string }) => fo.status === 'open') || fulfillmentOrders[0];
        const fulfillmentOrderGid = `gid://shopify/FulfillmentOrder/${openFO.id}`;

        const awb = tracking_number || '';
        const trackingUrl = tracking_url || (awb ? `https://totalconecta.totalexpress.com.br/rastreamento/rastreamento/encomendas/${awb}` : '');

        const mutation = `
          mutation fulfillmentCreateV2($fulfillment: FulfillmentV2Input!) {
            fulfillmentCreateV2(fulfillment: $fulfillment) {
              fulfillment {
                id
                status
                trackingInfo {
                  company
                  number
                  url
                }
              }
              userErrors {
                field
                message
              }
            }
          }
        `;

        const variables = {
          fulfillment: {
            lineItemsByFulfillmentOrder: [{
              fulfillmentOrderId: fulfillmentOrderGid,
            }],
            trackingInfo: {
              company: tracking_company || 'Total Express',
              number: awb,
              url: trackingUrl,
            },
            notifyCustomer: true,
          },
        };

        const data = await shopifyGraphQL(mutation, variables);
        
        if (data.fulfillmentCreateV2.userErrors?.length > 0) {
          throw new Error(`Fulfillment errors: ${JSON.stringify(data.fulfillmentCreateV2.userErrors)}`);
        }

        result = data.fulfillmentCreateV2.fulfillment;
        break;
      }

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

      case 'sync_tracking': {
        // Re-fetch orders from Shopify and update local AWB/tracking data
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        const supabase = createClient(supabaseUrl, supabaseKey);

        const orderIds = params.order_ids as number[];
        if (!orderIds || orderIds.length === 0) throw new Error('order_ids é obrigatório');

        let synced = 0;
        const details: Array<{ order_id: number; awb: string | null; fulfillment_id: number | null }> = [];

        for (const orderId of orderIds) {
          try {
            const orderData = await shopifyFetch(`/orders/${orderId}.json`);
            const order = orderData.order;
            if (!order) continue;

            const fulfillments = (order.fulfillments as Array<Record<string, unknown>>) || [];
            let awb: string | null = null;
            let fulfillmentId: number | null = null;

            if (fulfillments.length > 0) {
              const lastFulfillment = fulfillments[fulfillments.length - 1];
              awb = (lastFulfillment.tracking_number as string) || null;
              fulfillmentId = lastFulfillment.id as number;
            }

            let status = 'pendente';
            if (order.fulfillment_status === 'fulfilled') status = 'entregue';
            else if (order.fulfillment_status === 'partial') status = 'em_transito';
            else if (awb) status = 'em_transito';

            const updateData: Record<string, unknown> = {
              shopify_fulfillment_id: fulfillmentId,
            };
            if (awb) updateData.awb = awb;
            if (status !== 'pendente') updateData.status = status;

            await supabase
              .from('envios')
              .update(updateData)
              .eq('shopify_order_id', orderId);

            details.push({ order_id: orderId, awb, fulfillment_id: fulfillmentId });
            synced++;
          } catch (e) {
            console.error(`Erro ao sincronizar pedido ${orderId}:`, e);
          }
        }

        result = { synced, details };
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
