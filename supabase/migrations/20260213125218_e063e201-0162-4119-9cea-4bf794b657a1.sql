
-- Tabela de envios (shipping/fulfillment)
CREATE TABLE public.envios (
  id SERIAL PRIMARY KEY,
  shopify_order_id BIGINT,
  shopify_order_name TEXT,
  shopify_fulfillment_id BIGINT,
  
  -- Dados do destinatário
  dest_nome TEXT NOT NULL,
  dest_cpf_cnpj TEXT,
  dest_endereco TEXT,
  dest_numero TEXT,
  dest_complemento TEXT,
  dest_bairro TEXT,
  dest_cidade TEXT,
  dest_estado TEXT,
  dest_cep TEXT NOT NULL,
  dest_email TEXT,
  dest_telefone TEXT,
  
  -- Dados do envio
  awb TEXT,
  num_protocolo TEXT,
  cod_remessa TEXT,
  tipo_servico INTEGER DEFAULT 1,
  volumes INTEGER DEFAULT 1,
  peso_kg NUMERIC(5,2),
  valor_declarado_centavos INTEGER DEFAULT 0,
  
  -- Rastreamento
  status TEXT DEFAULT 'pendente',
  status_detalhe TEXT,
  ultimo_tracking_at TIMESTAMPTZ,
  tracking_historico JSONB DEFAULT '[]'::jsonb,
  
  -- Etiqueta
  etiqueta_url TEXT,
  etiqueta_gerada BOOLEAN DEFAULT false,
  
  -- Frete
  valor_frete_centavos INTEGER DEFAULT 0,
  prazo_entrega_dias INTEGER,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE public.envios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Acesso público envios" ON public.envios
  FOR ALL USING (true) WITH CHECK (true);

-- Trigger de updated_at
CREATE TRIGGER update_envios_updated_at
  BEFORE UPDATE ON public.envios
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Index para busca
CREATE INDEX idx_envios_status ON public.envios(status);
CREATE INDEX idx_envios_awb ON public.envios(awb);
CREATE INDEX idx_envios_shopify_order ON public.envios(shopify_order_id);
