-- Adiciona coluna 'ordem' se não existir (para ordenação estável)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'categorias_financeiras'
      AND column_name  = 'ordem'
  ) THEN
    ALTER TABLE public.categorias_financeiras
      ADD COLUMN ordem int DEFAULT 0;
    CREATE INDEX IF NOT EXISTS idx_categorias_ordem ON public.categorias_financeiras(ordem);
  END IF;
END $$;
