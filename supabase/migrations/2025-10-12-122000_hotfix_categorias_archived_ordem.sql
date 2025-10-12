-- HOTFIX: garante colunas usadas pelo frontend e força reload do schema do PostgREST

-- 1) Adiciona 'archived' se não existir
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'categorias_financeiras' AND column_name = 'archived'
  ) THEN
    ALTER TABLE public.categorias_financeiras
      ADD COLUMN archived boolean NOT NULL DEFAULT false;
    CREATE INDEX IF NOT EXISTS idx_categorias_archived ON public.categorias_financeiras(archived);
  END IF;
END $$;

-- 2) Adiciona 'ordem' se não existir (para ordenação estável)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'categorias_financeiras' AND column_name = 'ordem'
  ) THEN
    ALTER TABLE public.categorias_financeiras
      ADD COLUMN ordem int DEFAULT 0;
    CREATE INDEX IF NOT EXISTS idx_categorias_ordem ON public.categorias_financeiras(ordem);
  END IF;
END $$;

-- 3) Força o PostgREST a recarregar o schema (Supabase)
--    Isto dispara a atualização de cache do schema sem precisar reiniciar serviços.
DO $$
BEGIN
  PERFORM pg_notify('pgrst', 'reload schema');
EXCEPTION
  WHEN undefined_object THEN
    -- Em algumas versões/ambientes a notificação pode estar indisponível; ignore.
    NULL;
END $$;
