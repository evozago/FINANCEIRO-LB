
-- Table to store generated API keys
CREATE TABLE public.api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  chave TEXT NOT NULL UNIQUE,
  ativo BOOLEAN NOT NULL DEFAULT true,
  criado_por uuid REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ultimo_uso_at TIMESTAMPTZ
);

ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

-- Only admins can manage API keys
CREATE POLICY "Admins can manage api_keys"
  ON public.api_keys
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
