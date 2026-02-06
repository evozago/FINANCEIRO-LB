-- Adicionar coluna pj_vinculada_id à tabela marcas para vincular com pessoas_juridicas
ALTER TABLE public.marcas 
ADD COLUMN pj_vinculada_id INTEGER REFERENCES public.pessoas_juridicas(id) ON DELETE SET NULL;

-- Criar índice para otimizar buscas por empresa vinculada
CREATE INDEX idx_marcas_pj_vinculada ON public.marcas(pj_vinculada_id);

-- Comentário para documentação
COMMENT ON COLUMN public.marcas.pj_vinculada_id IS 'Referência à empresa/fornecedor vinculada à marca';