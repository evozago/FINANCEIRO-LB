-- Adicionar coluna para especificar quais campos pesquisar na regra
ALTER TABLE public.regras_classificacao
ADD COLUMN campos_pesquisa text[] DEFAULT ARRAY['nome']::text[];

-- Comentário explicativo
COMMENT ON COLUMN public.regras_classificacao.campos_pesquisa IS 'Campos onde a regra deve pesquisar: nome, variacao_1 (cor), variacao_2 (tamanho), codigo, etc.';