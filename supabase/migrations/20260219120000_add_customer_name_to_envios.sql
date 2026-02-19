-- Adiciona campo customer_name para armazenar o nome do cliente (faturamento/Shopify)
-- separado do dest_nome (nome do destinatário de entrega)
ALTER TABLE envios ADD COLUMN IF NOT EXISTS customer_name TEXT;

-- Índice para melhorar performance na busca por nome do cliente
CREATE INDEX IF NOT EXISTS idx_envios_customer_name ON envios (customer_name);
