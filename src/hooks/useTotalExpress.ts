import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export function useTotalExpress() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const callApi = useCallback(async <T>(functionName: string, body: Record<string, unknown>): Promise<T | null> => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fnError } = await supabase.functions.invoke<ApiResponse<T>>(functionName, { body });
      if (fnError) throw new Error(fnError.message);
      if (!data?.success) throw new Error(data?.error || 'Erro desconhecido');
      return data.data ?? null;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro na comunicação';
      setError(msg);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const calcularFrete = useCallback((params: {
    cep_destino: string;
    peso: number;
    valor_declarado: number;
    tipo_servico?: string;
    altura?: number;
    largura?: number;
    profundidade?: number;
  }) => callApi<{
    prazo_dias: number;
    valor_centavos: number;
    valor_formatado: string;
    rota: string;
    tipo_servico: string;
  }>('total-express-proxy', { action: 'calcular_frete', ...params }), [callApi]);

  const registrarColeta = useCallback((params: Record<string, unknown>) => 
    callApi<{
      codigo_proc: number;
      num_protocolo: string;
      itens_processados: number;
      awb: string;
    }>('total-express-proxy', { action: 'registrar_coleta', ...params }), [callApi]);

  const rastrearPorPedido = useCallback((pedidos: string[]) =>
    callApi<unknown>('total-express-proxy', { action: 'rastrear_pedido', pedidos }), [callApi]);

  const rastrearPorAwb = useCallback((awbs: string[]) =>
    callApi<unknown>('total-express-proxy', { action: 'rastrear_awb', awbs }), [callApi]);

  const rastrearEAtualizar = useCallback((awbs: string[]) =>
    callApi<{ updated: number; details: Array<{ awb: string; status: string; status_detalhe: string }> }>('total-express-proxy', { action: 'rastrear_e_atualizar', awbs }), [callApi]);

  const smartLabel = useCallback((params: Record<string, unknown>) =>
    callApi<unknown>('total-express-proxy', { action: 'smart_label', ...params }), [callApi]);

  const getOrders = useCallback((fulfillmentStatus?: string) =>
    callApi<unknown[]>('shopify-fulfillment', { action: 'get_orders', fulfillment_status: fulfillmentStatus }), [callApi]);

  const importOrders = useCallback((fulfillmentStatus?: string) =>
    callApi<{ total_orders: number; already_imported: number; new_imported: number }>('shopify-fulfillment', { action: 'import_orders', fulfillment_status: fulfillmentStatus || 'any' }), [callApi]);

  const createFulfillment = useCallback((params: Record<string, unknown>) =>
    callApi<unknown>('shopify-fulfillment', { action: 'create_fulfillment', ...params }), [callApi]);

  const updateTracking = useCallback((params: Record<string, unknown>) =>
    callApi<unknown>('shopify-fulfillment', { action: 'update_tracking', ...params }), [callApi]);

  const syncTracking = useCallback((orderIds: number[]) =>
    callApi<{ synced: number; details: Array<{ order_id: number; awb: string | null; fulfillment_id: number | null }> }>('shopify-fulfillment', { action: 'sync_tracking', order_ids: orderIds }), [callApi]);

  const registerCarrierService = useCallback(() =>
    callApi<unknown>('carrier-service', { action: 'register_carrier_service' }), [callApi]);

  const testCarrierService = useCallback((params: { cep_destino: string; peso?: number; valor?: number }) =>
    callApi<unknown>('carrier-service', { action: 'test', ...params }), [callApi]);

  return {
    loading,
    error,
    calcularFrete,
    registrarColeta,
    rastrearPorPedido,
    rastrearPorAwb,
    rastrearEAtualizar,
    smartLabel,
    getOrders,
    importOrders,
    createFulfillment,
    updateTracking,
    syncTracking,
    registerCarrierService,
    testCarrierService,
  };
}
