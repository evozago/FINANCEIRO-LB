-- HOTFIX: garante a coluna 'cor' e força reload do schema do PostgREST

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'categorias_financeiras'
      AND column_name  = 'cor'
  ) THEN
    ALTER TABLE public.categorias_financeiras
      ADD COLUMN cor varchar(7) NOT NULL DEFAULT '#E2E8F0';
  END IF;
END $$;

-- reindex opcional (não obrigatório):
-- CREATE INDEX IF NOT EXISTS idx_categorias_cor ON public.categorias_financeiras(cor);

-- força o PostgREST a recarregar o schema cache
DO $$
BEGIN
  PERFORM pg_notify('pgrst', 'reload schema');
EXCEPTION
  WHEN undefined_object THEN
    -- ambientes sem canal pgrst: ignorar
    NULL;
END $$;
