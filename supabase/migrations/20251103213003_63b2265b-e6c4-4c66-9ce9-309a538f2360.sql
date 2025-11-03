-- Adicionar campos para cálculo de vale transporte por dias úteis
ALTER TABLE public.categorias_financeiras
ADD COLUMN IF NOT EXISTS calcula_por_dias_uteis BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS valor_por_dia_centavos INTEGER DEFAULT 0;

-- Comentários para documentação
COMMENT ON COLUMN public.categorias_financeiras.calcula_por_dias_uteis IS 'Indica se esta categoria calcula valores baseado em dias úteis trabalhados (ex: vale transporte)';
COMMENT ON COLUMN public.categorias_financeiras.valor_por_dia_centavos IS 'Valor em centavos por dia útil (usado quando calcula_por_dias_uteis = true)';