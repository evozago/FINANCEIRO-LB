-- Adicionar campo para contas recorrentes "livres" (sem limite de geração)
ALTER TABLE recorrencias 
ADD COLUMN IF NOT EXISTS livre boolean NOT NULL DEFAULT false;

-- Adicionar campo para dia de vencimento padrão em contas livres
ALTER TABLE recorrencias 
ADD COLUMN IF NOT EXISTS dia_vencimento_livre integer;

COMMENT ON COLUMN recorrencias.livre IS 'Indica se a conta pode ser gerada múltiplas vezes sem restrição de período';
COMMENT ON COLUMN recorrencias.dia_vencimento_livre IS 'Dia padrão de vencimento para contas livres (null = dia atual)';