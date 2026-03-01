
-- Criar tabela ia_conhecimento para o Cérebro da IA
CREATE TABLE public.ia_conhecimento (
  id SERIAL PRIMARY KEY,
  titulo TEXT NOT NULL,
  conteudo TEXT NOT NULL,
  tipo TEXT NOT NULL DEFAULT 'regra',
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ia_conhecimento ENABLE ROW LEVEL SECURITY;

-- Políticas - qualquer usuário autenticado pode gerenciar
CREATE POLICY "Authenticated users can view ia_conhecimento"
  ON public.ia_conhecimento FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert ia_conhecimento"
  ON public.ia_conhecimento FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update ia_conhecimento"
  ON public.ia_conhecimento FOR UPDATE
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete ia_conhecimento"
  ON public.ia_conhecimento FOR DELETE
  USING (auth.uid() IS NOT NULL);
