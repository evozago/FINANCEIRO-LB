-- ============================================
-- CLASSIFICADOR DE PRODUTOS - SCHEMA COMPLETO
-- ============================================

-- Tabela de sessões de importação (cada upload de planilha)
CREATE TABLE public.sessoes_importacao (
  id SERIAL PRIMARY KEY,
  nome TEXT NOT NULL,
  nome_arquivo TEXT,
  total_produtos INTEGER DEFAULT 0,
  classificados INTEGER DEFAULT 0,
  confianca_media NUMERIC(5,2) DEFAULT 0,
  mapeamento_colunas JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tabela de produtos importados/classificados
CREATE TABLE public.produtos (
  id SERIAL PRIMARY KEY,
  codigo TEXT,
  nome TEXT NOT NULL,
  nome_original TEXT,
  preco_centavos INTEGER DEFAULT 0,
  categoria_id INTEGER REFERENCES public.categorias_produtos(id) ON DELETE SET NULL,
  subcategoria TEXT,
  marca TEXT,
  genero TEXT,
  faixa_etaria TEXT,
  tamanho TEXT,
  cor TEXT,
  material TEXT,
  estilo TEXT,
  atributos_extras JSONB DEFAULT '{}',
  confianca INTEGER DEFAULT 0,
  classificado BOOLEAN DEFAULT false,
  sessao_id INTEGER REFERENCES public.sessoes_importacao(id) ON DELETE CASCADE,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tabela de regras de classificação
CREATE TABLE public.regras_classificacao (
  id SERIAL PRIMARY KEY,
  nome TEXT NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('contains', 'exact', 'startsWith', 'containsAll', 'notContains')),
  termos TEXT[] NOT NULL,
  campo_destino TEXT NOT NULL,
  valor_destino TEXT NOT NULL,
  categoria_id INTEGER REFERENCES public.categorias_produtos(id) ON DELETE SET NULL,
  pontuacao INTEGER DEFAULT 100,
  genero_automatico TEXT,
  ativo BOOLEAN DEFAULT true,
  ordem INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tabela de atributos customizados
CREATE TABLE public.atributos_customizados (
  id SERIAL PRIMARY KEY,
  nome TEXT NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('lista', 'regras')),
  valores TEXT[],
  configuracao JSONB DEFAULT '{}',
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Índices
CREATE INDEX idx_produtos_sessao ON public.produtos(sessao_id);
CREATE INDEX idx_produtos_categoria ON public.produtos(categoria_id);
CREATE INDEX idx_produtos_classificado ON public.produtos(classificado);
CREATE INDEX idx_produtos_nome ON public.produtos USING gin(to_tsvector('portuguese', nome));
CREATE INDEX idx_regras_tipo ON public.regras_classificacao(tipo);
CREATE INDEX idx_regras_campo ON public.regras_classificacao(campo_destino);

-- RLS
ALTER TABLE public.sessoes_importacao ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.produtos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.regras_classificacao ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.atributos_customizados ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Acesso público sessoes_importacao" ON public.sessoes_importacao FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Acesso público produtos" ON public.produtos FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Acesso público regras_classificacao" ON public.regras_classificacao FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Acesso público atributos_customizados" ON public.atributos_customizados FOR ALL USING (true) WITH CHECK (true);

-- Triggers updated_at
CREATE TRIGGER update_sessoes_importacao_updated_at BEFORE UPDATE ON public.sessoes_importacao FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_produtos_updated_at BEFORE UPDATE ON public.produtos FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Regras iniciais de classificação
INSERT INTO public.regras_classificacao (nome, tipo, termos, campo_destino, valor_destino, pontuacao, genero_automatico, ordem) VALUES
  ('Vestido', 'contains', ARRAY['VESTIDO'], 'categoria', 'Vestido', 100, 'FEMININO', 1),
  ('Vestido Festa', 'containsAll', ARRAY['VESTIDO', 'FESTA'], 'subcategoria', 'Vestido Festa', 600, 'FEMININO', 2),
  ('Vestido Longo', 'containsAll', ARRAY['VESTIDO', 'LONGO'], 'subcategoria', 'Vestido Longo', 600, 'FEMININO', 3),
  ('Calça', 'contains', ARRAY['CALCA', 'CALÇA'], 'categoria', 'Calça', 100, NULL, 4),
  ('Calça Jeans', 'containsAll', ARRAY['CALCA', 'JEANS'], 'subcategoria', 'Calça Jeans', 600, NULL, 5),
  ('Camiseta', 'contains', ARRAY['CAMISETA', 'CAMISA'], 'categoria', 'Camiseta', 100, NULL, 6),
  ('Blusa', 'contains', ARRAY['BLUSA'], 'categoria', 'Blusa', 100, NULL, 7),
  ('Shorts', 'contains', ARRAY['SHORTS', 'SHORT'], 'categoria', 'Shorts', 100, NULL, 8),
  ('Bermuda', 'contains', ARRAY['BERMUDA'], 'categoria', 'Bermuda', 100, NULL, 9),
  ('Saia', 'contains', ARRAY['SAIA'], 'categoria', 'Saia', 100, 'FEMININO', 10),
  ('Conjunto', 'contains', ARRAY['CONJUNTO', 'KIT'], 'categoria', 'Conjunto', 100, NULL, 11),
  ('Tênis', 'contains', ARRAY['TENIS', 'TÊNIS'], 'categoria', 'Tênis', 100, NULL, 12),
  ('Sandália', 'contains', ARRAY['SANDALIA', 'SANDÁLIA'], 'categoria', 'Sandália', 100, NULL, 13),
  ('Gênero Feminino', 'contains', ARRAY['FEMININO', 'FEMININA', 'MULHER', 'MENINA', 'DAMA'], 'genero', 'FEMININO', 200, NULL, 20),
  ('Gênero Masculino', 'contains', ARRAY['MASCULINO', 'MASCULINA', 'HOMEM', 'MENINO'], 'genero', 'MASCULINO', 200, NULL, 21),
  ('Bebê', 'contains', ARRAY['BEBE', 'BEBÊ', 'RN', 'BABY', 'RECEM'], 'faixa_etaria', 'BEBE', 200, NULL, 30),
  ('Infantil', 'contains', ARRAY['INFANTIL', 'KIDS', 'CRIANCA', 'CRIANÇA'], 'faixa_etaria', 'INFANTIL', 200, NULL, 31),
  ('Juvenil', 'contains', ARRAY['JUVENIL', 'TEEN', 'ADOLESCENTE'], 'faixa_etaria', 'JUVENIL', 200, NULL, 32);

-- Atributos customizados iniciais
INSERT INTO public.atributos_customizados (nome, tipo, valores) VALUES
  ('Cores', 'lista', ARRAY['PRETO', 'BRANCO', 'AZUL', 'VERMELHO', 'VERDE', 'AMARELO', 'ROSA', 'ROXO', 'LARANJA', 'MARROM', 'CINZA', 'BEGE', 'PINK', 'NUDE']),
  ('Tamanhos', 'lista', ARRAY['PP', 'P', 'M', 'G', 'GG', 'XG', 'XXG', '34', '36', '38', '40', '42', '44', '46', '48', '50']),
  ('Materiais', 'lista', ARRAY['ALGODAO', 'ALGODÃO', 'JEANS', 'MOLETOM', 'MALHA', 'SEDA', 'LINHO', 'VISCOSE', 'POLIESTER', 'TRICOT', 'COURO']);