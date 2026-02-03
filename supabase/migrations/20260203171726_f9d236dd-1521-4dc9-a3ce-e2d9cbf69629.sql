-- Adicionar novas colunas à tabela produtos
ALTER TABLE public.produtos
ADD COLUMN IF NOT EXISTS estoque integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS custo_unitario_centavos integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS valor_venda_centavos integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS variacao_1 text,
ADD COLUMN IF NOT EXISTS variacao_2 text;

-- Índices para otimização
CREATE INDEX IF NOT EXISTS idx_produtos_estoque ON public.produtos(estoque);
CREATE INDEX IF NOT EXISTS idx_produtos_custo ON public.produtos(custo_unitario_centavos);
CREATE INDEX IF NOT EXISTS idx_produtos_valor_venda ON public.produtos(valor_venda_centavos);

COMMENT ON COLUMN public.produtos.estoque IS 'Quantidade em estoque';
COMMENT ON COLUMN public.produtos.custo_unitario_centavos IS 'Custo unitário em centavos';
COMMENT ON COLUMN public.produtos.valor_venda_centavos IS 'Valor de venda em centavos';
COMMENT ON COLUMN public.produtos.variacao_1 IS 'Variação 1 - Cor';
COMMENT ON COLUMN public.produtos.variacao_2 IS 'Variação 2 - Tamanho';