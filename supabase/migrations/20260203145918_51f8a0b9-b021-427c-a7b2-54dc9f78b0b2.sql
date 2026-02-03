-- Função para atualizar timestamps (se não existir)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Tabela de categorias de produtos (centralizada)
CREATE TABLE public.categorias_produtos (
  id SERIAL PRIMARY KEY,
  nome TEXT NOT NULL,
  descricao TEXT,
  cor TEXT DEFAULT '#6366f1',
  categoria_pai_id INTEGER REFERENCES public.categorias_produtos(id) ON DELETE SET NULL,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Índices
CREATE INDEX idx_categorias_produtos_nome ON public.categorias_produtos(nome);
CREATE INDEX idx_categorias_produtos_pai ON public.categorias_produtos(categoria_pai_id);

-- RLS
ALTER TABLE public.categorias_produtos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Acesso público categorias_produtos"
ON public.categorias_produtos FOR ALL
USING (true) WITH CHECK (true);

-- Trigger para updated_at
CREATE TRIGGER update_categorias_produtos_updated_at
BEFORE UPDATE ON public.categorias_produtos
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Dados iniciais
INSERT INTO public.categorias_produtos (nome, descricao, cor) VALUES
  ('Vestuário', 'Roupas e acessórios de moda', '#ec4899'),
  ('Calçados', 'Sapatos, tênis e sandálias', '#f97316'),
  ('Acessórios', 'Bolsas, cintos e bijuterias', '#8b5cf6'),
  ('Infantil', 'Produtos para crianças', '#06b6d4');