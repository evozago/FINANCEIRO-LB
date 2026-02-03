-- Adicionar campo de termos de exclusão às regras
ALTER TABLE public.regras_classificacao
ADD COLUMN IF NOT EXISTS termos_exclusao text[] DEFAULT '{}';

-- Adicionar comentário explicativo
COMMENT ON COLUMN public.regras_classificacao.termos_exclusao IS 'Termos que devem NÃO existir no nome do produto para a regra aplicar';