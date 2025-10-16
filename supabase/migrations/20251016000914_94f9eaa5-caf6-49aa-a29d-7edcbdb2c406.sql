-- Primeiro, limpar categoria_id inválida (id=3 não existe em categorias_financeiras)
UPDATE public.pessoas_juridicas
SET categoria_id = NULL
WHERE categoria_id = 3;

-- Remover a foreign key antiga que aponta para categorias_pj
ALTER TABLE public.pessoas_juridicas
DROP CONSTRAINT IF EXISTS fk_categoria_pj;

-- Adicionar nova foreign key apontando para categorias_financeiras
ALTER TABLE public.pessoas_juridicas
ADD CONSTRAINT fk_categoria_financeira
FOREIGN KEY (categoria_id) REFERENCES public.categorias_financeiras(id) ON DELETE SET NULL;