import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface ShopifyProduct {
  id: number;
  title: string;
  handle: string;
  status: string;
  vendor: string;
  product_type: string;
  created_at: string;
  updated_at: string;
  images: Array<{ src: string }>;
  variants: Array<{
    id: number;
    title: string;
    price: string;
    sku: string;
    inventory_quantity: number;
    inventory_item_id: number;
  }>;
}

interface ShopifyLocation {
  id: number;
  name: string;
  active: boolean;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SHOPIFY_STORE_DOMAIN = Deno.env.get('SHOPIFY_STORE_DOMAIN');
    const SHOPIFY_ADMIN_API_TOKEN = Deno.env.get('SHOPIFY_ADMIN_API_TOKEN');

    if (!SHOPIFY_STORE_DOMAIN) {
      throw new Error('SHOPIFY_STORE_DOMAIN não configurado');
    }
    if (!SHOPIFY_ADMIN_API_TOKEN) {
      throw new Error('SHOPIFY_ADMIN_API_TOKEN não configurado');
    }

    // Normaliza o domínio (remove https:// e trailing slash se existir)
    const storeDomain = SHOPIFY_STORE_DOMAIN
      .replace(/^https?:\/\//, '')
      .replace(/\/$/, '');

    const baseUrl = `https://${storeDomain}/admin/api/2024-01`;

    const { action, ...params } = await req.json();

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
        console.error(`Shopify API error: ${response.status}`, errorText);
        throw new Error(`Shopify API error: ${response.status} - ${errorText}`);
      }

      return response.json();
    };

    let result: unknown;

    switch (action) {
      case 'get_products': {
        const limit = params.limit || 50;
        const pageInfo = params.page_info || '';
        
        let url = `/products.json?limit=${limit}&status=active`;
        if (pageInfo) {
          url = `/products.json?limit=${limit}&page_info=${pageInfo}`;
        }
        
        const data = await shopifyFetch(url);
        result = {
          products: data.products as ShopifyProduct[],
          count: data.products?.length || 0,
        };
        break;
      }

      case 'get_product': {
        const { product_id } = params;
        if (!product_id) throw new Error('product_id é obrigatório');
        
        const data = await shopifyFetch(`/products/${product_id}.json`);
        result = data.product as ShopifyProduct;
        break;
      }

      case 'get_inventory_levels': {
        const { inventory_item_ids, location_ids } = params;
        
        let url = '/inventory_levels.json?';
        if (inventory_item_ids?.length) {
          url += `inventory_item_ids=${inventory_item_ids.join(',')}`;
        }
        if (location_ids?.length) {
          url += `&location_ids=${location_ids.join(',')}`;
        }
        
        const data = await shopifyFetch(url);
        result = data.inventory_levels;
        break;
      }

      case 'get_locations': {
        const data = await shopifyFetch('/locations.json');
        result = data.locations as ShopifyLocation[];
        break;
      }

      case 'update_inventory': {
        const { inventory_item_id, location_id, available } = params;
        
        if (!inventory_item_id || !location_id || available === undefined) {
          throw new Error('inventory_item_id, location_id e available são obrigatórios');
        }

        const data = await shopifyFetch('/inventory_levels/set.json', {
          method: 'POST',
          body: JSON.stringify({
            location_id,
            inventory_item_id,
            available: parseInt(available, 10),
          }),
        });
        
        result = data.inventory_level;
        break;
      }

      case 'adjust_inventory': {
        const { inventory_item_id, location_id, adjustment } = params;
        
        if (!inventory_item_id || !location_id || adjustment === undefined) {
          throw new Error('inventory_item_id, location_id e adjustment são obrigatórios');
        }

        const data = await shopifyFetch('/inventory_levels/adjust.json', {
          method: 'POST',
          body: JSON.stringify({
            location_id,
            inventory_item_id,
            available_adjustment: parseInt(adjustment, 10),
          }),
        });
        
        result = data.inventory_level;
        break;
      }

      case 'get_products_count': {
        const data = await shopifyFetch('/products/count.json');
        result = { count: data.count };
        break;
      }

      default:
        throw new Error(`Ação desconhecida: ${action}`);
    }

    return new Response(JSON.stringify({ success: true, data: result }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Shopify API Error:', error);
    const message = error instanceof Error ? error.message : 'Erro desconhecido';
    
    return new Response(JSON.stringify({ success: false, error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
