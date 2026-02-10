
-- ============================================================
-- MÓDULO IMPRESSÃO 3D - Totalmente isolado do ecossistema loja
-- ============================================================

-- 1. Parâmetros Gerais
CREATE TABLE public.print3d_parametros (
  id serial PRIMARY KEY,
  chave text NOT NULL UNIQUE,
  valor numeric NOT NULL DEFAULT 0,
  unidade text,
  descricao text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.print3d_parametros ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth users full access print3d_parametros" ON public.print3d_parametros FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Dados iniciais dos parâmetros
INSERT INTO public.print3d_parametros (chave, valor, unidade, descricao) VALUES
  ('custo_kwh', 0.85, 'R$/kWh', 'Custo da energia elétrica por kWh'),
  ('potencia_impressora_w', 200, 'W', 'Potência média da impressora em Watts'),
  ('vida_util_impressora_h', 5000, 'horas', 'Vida útil estimada da impressora em horas'),
  ('custo_impressora', 3000, 'R$', 'Custo de aquisição da impressora'),
  ('mao_de_obra_unidade', 5.00, 'R$/unidade', 'Custo de mão de obra por unidade'),
  ('embalagem_unidade', 2.00, 'R$/unidade', 'Custo de embalagem por unidade'),
  ('imposto_percentual', 6, '%', 'Percentual de impostos sobre venda');

-- 2. Materiais (filamentos)
CREATE TABLE public.print3d_materiais (
  id serial PRIMARY KEY,
  nome text NOT NULL,
  tipo text NOT NULL DEFAULT 'PLA',
  marca text,
  cor text,
  peso_kg numeric NOT NULL DEFAULT 1,
  preco_kg_centavos integer NOT NULL DEFAULT 0,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.print3d_materiais ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth users full access print3d_materiais" ON public.print3d_materiais FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 3. Impressoras
CREATE TABLE public.print3d_impressoras (
  id serial PRIMARY KEY,
  nome text NOT NULL,
  modelo text,
  potencia_watts numeric NOT NULL DEFAULT 200,
  custo_aquisicao_centavos integer NOT NULL DEFAULT 0,
  vida_util_horas numeric NOT NULL DEFAULT 5000,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.print3d_impressoras ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth users full access print3d_impressoras" ON public.print3d_impressoras FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 4. Produtos 3D
CREATE TABLE public.print3d_produtos (
  id serial PRIMARY KEY,
  sku text UNIQUE,
  nome_marketplace text NOT NULL,
  nome_interno text,
  perfil_impressao text,
  categoria text,
  material_id integer REFERENCES public.print3d_materiais(id),
  impressora_id integer REFERENCES public.print3d_impressoras(id),
  peso_gramas numeric NOT NULL DEFAULT 0,
  tempo_impressao_min numeric NOT NULL DEFAULT 0,
  custo_material_centavos integer GENERATED ALWAYS AS (
    CASE WHEN peso_gramas > 0 THEN ROUND(peso_gramas * 0)::integer ELSE 0 END
  ) STORED,
  mao_de_obra_centavos integer NOT NULL DEFAULT 500,
  embalagem_centavos integer NOT NULL DEFAULT 200,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.print3d_produtos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth users full access print3d_produtos" ON public.print3d_produtos FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TRIGGER update_print3d_produtos_updated_at
  BEFORE UPDATE ON public.print3d_produtos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5. Imagens do produto (por cor)
CREATE TABLE public.print3d_produto_imagens (
  id serial PRIMARY KEY,
  produto_id integer NOT NULL REFERENCES public.print3d_produtos(id) ON DELETE CASCADE,
  cor text,
  storage_path text NOT NULL,
  nome_arquivo text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.print3d_produto_imagens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth users full access print3d_produto_imagens" ON public.print3d_produto_imagens FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 6. Configurações de Marketplace
CREATE TABLE public.print3d_marketplaces (
  id serial PRIMARY KEY,
  nome text NOT NULL,
  taxa_percentual numeric NOT NULL DEFAULT 0,
  comissao_fixa_centavos integer NOT NULL DEFAULT 0,
  frete_subsidiado boolean NOT NULL DEFAULT false,
  margem_desejada_percentual numeric NOT NULL DEFAULT 30,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.print3d_marketplaces ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth users full access print3d_marketplaces" ON public.print3d_marketplaces FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Dados iniciais
INSERT INTO public.print3d_marketplaces (nome, taxa_percentual, comissao_fixa_centavos, margem_desejada_percentual) VALUES
  ('Mercado Livre', 16, 0, 30),
  ('Shopee', 20, 0, 30),
  ('Amazon', 15, 0, 30),
  ('Elo7', 12, 0, 30),
  ('Loja Própria', 0, 0, 40);

-- 7. Estoque e Produção
CREATE TABLE public.print3d_estoque (
  id serial PRIMARY KEY,
  produto_id integer NOT NULL REFERENCES public.print3d_produtos(id) ON DELETE CASCADE,
  qtd_pronta integer NOT NULL DEFAULT 0,
  qtd_em_producao integer NOT NULL DEFAULT 0,
  tempo_reposicao_dias numeric,
  ponto_reposicao integer NOT NULL DEFAULT 5,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.print3d_estoque ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth users full access print3d_estoque" ON public.print3d_estoque FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TRIGGER update_print3d_estoque_updated_at
  BEFORE UPDATE ON public.print3d_estoque
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 8. Vendas e Performance
CREATE TABLE public.print3d_vendas (
  id serial PRIMARY KEY,
  produto_id integer NOT NULL REFERENCES public.print3d_produtos(id),
  marketplace_id integer REFERENCES public.print3d_marketplaces(id),
  data_venda date NOT NULL DEFAULT CURRENT_DATE,
  quantidade integer NOT NULL DEFAULT 1,
  receita_centavos integer NOT NULL DEFAULT 0,
  custo_total_centavos integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.print3d_vendas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth users full access print3d_vendas" ON public.print3d_vendas FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Storage bucket para imagens de produtos 3D
INSERT INTO storage.buckets (id, name, public) VALUES ('print3d-produtos', 'print3d-produtos', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Auth upload print3d images" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'print3d-produtos');
CREATE POLICY "Public view print3d images" ON storage.objects FOR SELECT USING (bucket_id = 'print3d-produtos');
CREATE POLICY "Auth delete print3d images" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'print3d-produtos');

-- Adicionar módulo ao RBAC
INSERT INTO public.role_modulos (role, modulo) VALUES ('admin', 'impressao3d') ON CONFLICT DO NOTHING;
