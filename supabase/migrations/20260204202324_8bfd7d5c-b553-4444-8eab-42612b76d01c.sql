-- Adicionar colunas para armazenar dados originais completos da planilha
ALTER TABLE public.sessoes_importacao
ADD COLUMN IF NOT EXISTS colunas_originais TEXT[] DEFAULT NULL,
ADD COLUMN IF NOT EXISTS dados_originais JSONB DEFAULT NULL;

-- Comentário explicativo
COMMENT ON COLUMN public.sessoes_importacao.colunas_originais IS 'Nomes de todas as colunas originais da planilha importada';
COMMENT ON COLUMN public.sessoes_importacao.dados_originais IS 'Todos os dados originais da planilha em formato JSON (preserva todas as colunas)';