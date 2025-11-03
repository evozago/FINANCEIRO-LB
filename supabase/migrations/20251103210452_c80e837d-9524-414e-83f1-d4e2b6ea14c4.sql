-- Adicionar coluna fornecedor_pf_id na tabela recorrencias
ALTER TABLE public.recorrencias
ADD COLUMN IF NOT EXISTS fornecedor_pf_id BIGINT REFERENCES public.pessoas_fisicas(id) ON DELETE SET NULL;

-- Criar índice para melhorar performance
CREATE INDEX IF NOT EXISTS idx_recorrencias_fornecedor_pf_id 
ON public.recorrencias(fornecedor_pf_id);