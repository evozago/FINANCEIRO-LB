CREATE EXTENSION IF NOT EXISTS unaccent;

CREATE OR REPLACE FUNCTION public.to_slug(txt text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT lower(regexp_replace(regexp_replace(unaccent(coalesce(txt,'')),'[^a-zA-Z0-9]+','-','g'),'-{2,}','-','g'))::text;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='categorias_financeiras' AND column_name='parent_id'
  ) THEN
    ALTER TABLE public.categorias_financeiras
      ADD COLUMN parent_id int REFERENCES public.categorias_financeiras(id) ON DELETE SET NULL;
    CREATE INDEX IF NOT EXISTS idx_categorias_parent ON public.categorias_financeiras(parent_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='categorias_financeiras' AND column_name='ordem'
  ) THEN
    ALTER TABLE public.categorias_financeiras
      ADD COLUMN ordem int DEFAULT 0;
    CREATE INDEX IF NOT EXISTS idx_categorias_ordem ON public.categorias_financeiras(ordem);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='categorias_financeiras' AND column_name='archived'
  ) THEN
    ALTER TABLE public.categorias_financeiras
      ADD COLUMN archived boolean NOT NULL DEFAULT false;
    CREATE INDEX IF NOT EXISTS idx_categorias_archived ON public.categorias_financeiras(archived);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='categorias_financeiras' AND column_name='slug'
  ) THEN
    ALTER TABLE public.categorias_financeiras ADD COLUMN slug text;
    CREATE UNIQUE INDEX IF NOT EXISTS ux_categorias_slug ON public.categorias_financeiras(slug);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='categorias_financeiras' AND column_name='tipo'
  ) THEN
    ALTER TABLE public.categorias_financeiras
      ADD COLUMN tipo text NOT NULL DEFAULT 'despesa'
      CHECK (tipo IN ('despesa','receita','transferencia'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='categorias_financeiras' AND column_name='cor'
  ) THEN
    ALTER TABLE public.categorias_financeiras
      ADD COLUMN cor varchar(7) NOT NULL DEFAULT '#E2E8F0';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='categorias_financeiras' AND column_name='created_at'
  ) THEN
    ALTER TABLE public.categorias_financeiras
      ADD COLUMN created_at timestamptz NOT NULL DEFAULT now();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='categorias_financeiras' AND column_name='updated_at'
  ) THEN
    ALTER TABLE public.categorias_financeiras
      ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now();
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tg_categorias_updated_at ON public.categorias_financeiras;
CREATE TRIGGER tg_categorias_updated_at
BEFORE UPDATE ON public.categorias_financeiras
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.set_categoria_slug()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.slug IS NULL OR length(trim(NEW.slug))=0 THEN
    NEW.slug := public.to_slug(NEW.nome);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tg_categorias_slug ON public.categorias_financeiras;
CREATE TRIGGER tg_categorias_slug
BEFORE INSERT OR UPDATE OF nome, slug ON public.categorias_financeiras
FOR EACH ROW EXECUTE FUNCTION public.set_categoria_slug();

CREATE OR REPLACE VIEW public.vw_categorias_tree AS
WITH RECURSIVE t AS (
  SELECT
    c.id,
    c.nome,
    c.tipo,
    c.parent_id,
    c.ordem,
    c.archived,
    c.slug,
    0 AS depth,
    lpad(c.id::text, 10, '0') AS path
  FROM public.categorias_financeiras c
  WHERE c.parent_id IS NULL
  UNION ALL
  SELECT
    ch.id,
    ch.nome,
    ch.tipo,
    ch.parent_id,
    ch.ordem,
    ch.archived,
    ch.slug,
    t.depth + 1,
    t.path || '>' || lpad(ch.id::text,10,'0')
  FROM public.categorias_financeiras ch
  JOIN t ON ch.parent_id = t.id
)
SELECT * FROM t
ORDER BY path;

CREATE OR REPLACE FUNCTION public.can_delete_categoria(p_id int)
RETURNS boolean
LANGUAGE plpgsql
AS $$
DECLARE
  tem_filho int;
  em_uso int;
BEGIN
  SELECT count(*) INTO tem_filho FROM public.categorias_financeiras WHERE parent_id = p_id;
  SELECT count(*) INTO em_uso FROM public.contas_pagar WHERE categoria_id = p_id;
  RETURN (tem_filho = 0 AND em_uso = 0);
END;
$$;
