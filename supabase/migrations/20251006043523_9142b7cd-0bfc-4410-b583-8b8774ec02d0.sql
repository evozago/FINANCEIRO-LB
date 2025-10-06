-- MÓDULO 3: COMPRAS - Melhorias estruturais
-- Ajustar tabela compras_pedidos conforme especificação

-- Renomear colunas para seguir convenção solicitada
ALTER TABLE compras_pedidos 
  RENAME COLUMN numero TO numero_pedido;

ALTER TABLE compras_pedidos
  RENAME COLUMN qtd_pecas_total TO quantidade_pecas;

ALTER TABLE compras_pedidos
  RENAME COLUMN qtd_referencias TO quantidade_referencias;

-- Adicionar campos faltantes
ALTER TABLE compras_pedidos
  ADD COLUMN IF NOT EXISTS valor_medio_peca_centavos INTEGER GENERATED ALWAYS AS (
    CASE 
      WHEN quantidade_pecas > 0 THEN valor_liquido_centavos / quantidade_pecas
      ELSE 0
    END
  ) STORED;

COMMENT ON COLUMN compras_pedidos.numero_pedido IS 'Número do pedido (alfanumérico)';
COMMENT ON COLUMN compras_pedidos.quantidade_pecas IS 'Total de peças no pedido';
COMMENT ON COLUMN compras_pedidos.quantidade_referencias IS 'Total de referências no pedido';
COMMENT ON COLUMN compras_pedidos.valor_medio_peca_centavos IS 'Valor médio por peça (calculado automaticamente)';

-- Criar tabela para anexos de pedidos de compra
CREATE TABLE IF NOT EXISTS compras_pedido_anexos_new (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  pedido_id BIGINT NOT NULL REFERENCES compras_pedidos(id) ON DELETE CASCADE,
  tipo_anexo TEXT NOT NULL CHECK (tipo_anexo IN ('PDF', 'XML', 'Foto', 'Link', 'Outro')),
  url_anexo TEXT NOT NULL,
  descricao TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE compras_pedido_anexos_new IS 'Anexos vinculados aos pedidos de compra';
COMMENT ON COLUMN compras_pedido_anexos_new.tipo_anexo IS 'Tipo do anexo: PDF, XML, Foto, Link, Outro';
COMMENT ON COLUMN compras_pedido_anexos_new.url_anexo IS 'Caminho ou URL do arquivo';

-- Migrar dados da tabela antiga se existir
INSERT INTO compras_pedido_anexos_new (pedido_id, tipo_anexo, url_anexo, descricao, created_at, updated_at)
SELECT 
  pedido_id,
  CASE 
    WHEN mime_type LIKE '%pdf%' THEN 'PDF'
    WHEN mime_type LIKE '%xml%' THEN 'XML'
    WHEN mime_type LIKE 'image%' THEN 'Foto'
    ELSE 'Outro'
  END as tipo_anexo,
  arquivo_path as url_anexo,
  descricao,
  uploaded_at as created_at,
  uploaded_at as updated_at
FROM compras_pedido_anexos
WHERE NOT EXISTS (SELECT 1 FROM compras_pedido_anexos_new);

-- Remover tabela antiga e renomear nova
DROP TABLE IF EXISTS compras_pedido_anexos CASCADE;
ALTER TABLE compras_pedido_anexos_new RENAME TO compras_pedido_anexos;

-- Habilitar RLS
ALTER TABLE compras_pedido_anexos ENABLE ROW LEVEL SECURITY;

-- Criar políticas RLS para anexos
CREATE POLICY "Admins can manage compras_pedido_anexos" 
ON compras_pedido_anexos 
FOR ALL 
USING (is_admin());

CREATE POLICY "Authenticated can view compras_pedido_anexos" 
ON compras_pedido_anexos 
FOR SELECT 
USING (auth.role() = 'authenticated');

-- Trigger para updated_at
CREATE TRIGGER update_compras_pedido_anexos_updated_at
  BEFORE UPDATE ON compras_pedido_anexos
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();