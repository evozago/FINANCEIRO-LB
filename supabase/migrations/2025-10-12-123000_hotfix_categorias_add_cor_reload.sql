-- HOTFIX: garante a coluna 'cor' e força reload do schema do PostgREST

-- 1) Adiciona 'cor' se não existir
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'categorias_financeiras'
      AND column_name  = 'cor'
  ) THEN
    ALTER TABLE public.categorias_financeiras
      ADD COLUMN cor varchar(7) NOT NULL DEFAULT '#E2E8F0';
  END IF;
END $$;

-- 2) (Opcional) Ajuste de dados existentes
UPDATE public.categorias_financeiras
SET cor = COALESCE(cor, '#E2E8F0');

-- 3) Força o PostgREST a recarregar o schema cache
DO $$
BEGIN
  PERFORM pg_notify('pgrst', 'reload schema');
EXCEPTION
  WHEN undefined_object THEN
    -- Em alguns ambientes o canal 'pgrst' pode não estar disponível; ignore.
    NULL;
END $$;
