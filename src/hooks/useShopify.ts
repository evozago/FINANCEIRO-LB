import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface ShopifyProduct {
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

export interface ShopifyLocation {
  id: number;
  name: string;
  active: boolean;
}

export interface InventoryLevel {
  inventory_item_id: number;
  location_id: number;
  available: number;
  updated_at: string;
}

interface ShopifyApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export function useShopify() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const callShopifyApi = useCallback(async <T>(action: string, params: Record<string, unknown> = {}): Promise<T | null> => {
    setLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke<ShopifyApiResponse<T>>('shopify-api', {
        body: { action, ...params },
      });

      if (fnError) {
        throw new Error(fnError.message);
      }

      if (!data?.success) {
        throw new Error(data?.error || 'Erro desconhecido na API do Shopify');
      }

      return data.data ?? null;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao conectar com Shopify';
      setError(message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const getProducts = useCallback(async (limit = 50, pageInfo?: string) => {
    return callShopifyApi<{ products: ShopifyProduct[]; count: number }>('get_products', { limit, page_info: pageInfo });
  }, [callShopifyApi]);

  const getProduct = useCallback(async (productId: number) => {
    return callShopifyApi<ShopifyProduct>('get_product', { product_id: productId });
  }, [callShopifyApi]);

  const getLocations = useCallback(async () => {
    return callShopifyApi<ShopifyLocation[]>('get_locations');
  }, [callShopifyApi]);

  const getInventoryLevels = useCallback(async (inventoryItemIds: number[], locationIds?: number[]) => {
    return callShopifyApi<InventoryLevel[]>('get_inventory_levels', {
      inventory_item_ids: inventoryItemIds,
      location_ids: locationIds,
    });
  }, [callShopifyApi]);

  const updateInventory = useCallback(async (inventoryItemId: number, locationId: number, available: number) => {
    return callShopifyApi<InventoryLevel>('update_inventory', {
      inventory_item_id: inventoryItemId,
      location_id: locationId,
      available,
    });
  }, [callShopifyApi]);

  const adjustInventory = useCallback(async (inventoryItemId: number, locationId: number, adjustment: number) => {
    return callShopifyApi<InventoryLevel>('adjust_inventory', {
      inventory_item_id: inventoryItemId,
      location_id: locationId,
      adjustment,
    });
  }, [callShopifyApi]);

  const getProductsCount = useCallback(async () => {
    return callShopifyApi<{ count: number }>('get_products_count');
  }, [callShopifyApi]);

  return {
    loading,
    error,
    getProducts,
    getProduct,
    getLocations,
    getInventoryLevels,
    updateInventory,
    adjustInventory,
    getProductsCount,
  };
}
