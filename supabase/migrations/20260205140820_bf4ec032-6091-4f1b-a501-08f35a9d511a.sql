-- Adicionar coluna para armazenar condições compostas em formato JSON
-- Estrutura: [{ tipo, termos, operador: 'AND'|'OR', obrigatorio: boolean }]
ALTER TABLE public.regras_classificacao
ADD COLUMN IF NOT EXISTS condicoes JSONB DEFAULT NULL;

-- Comentário explicativo
COMMENT ON COLUMN public.regras_classificacao.condicoes IS 'Array de condições compostas: [{tipo, termos, operador, obrigatorio}]. Se preenchido, substitui a lógica simples de termos.';