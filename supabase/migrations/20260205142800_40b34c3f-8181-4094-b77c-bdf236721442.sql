-- Tabela para tipos de produto (Blusa, Calça, Vestido, Bolsa, Sapato, etc)
CREATE TABLE public.tipos_produto (
  id SERIAL PRIMARY KEY,
  nome TEXT NOT NULL,
  codigo TEXT NOT NULL UNIQUE, -- B = Blusa, C = Calça, V = Vestido, etc
  categoria TEXT DEFAULT 'vestuario', -- vestuario, acessorios, calcados
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela para gêneros/público
CREATE TABLE public.generos_produto (
  id SERIAL PRIMARY KEY,
  nome TEXT NOT NULL,
  codigo TEXT NOT NULL UNIQUE, -- F = Feminino, M = Masculino
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela para faixas etárias
CREATE TABLE public.faixas_etarias_produto (
  id SERIAL PRIMARY KEY,
  nome TEXT NOT NULL,
  codigo TEXT NOT NULL UNIQUE, -- A = Adulto, T = Teen, K = Kids, B = Baby
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela principal de referências (produto base/modelo)
CREATE TABLE public.referencias_produto (
  id SERIAL PRIMARY KEY,
  codigo_completo TEXT NOT NULL UNIQUE, -- 2602BFA001 (gerado automaticamente)
  ano INTEGER NOT NULL,
  mes INTEGER NOT NULL,
  tipo_id INTEGER REFERENCES public.tipos_produto(id),
  genero_id INTEGER REFERENCES public.generos_produto(id),
  faixa_etaria_id INTEGER REFERENCES public.faixas_etarias_produto(id),
  marca_id INTEGER REFERENCES public.marcas(id),
  sequencial INTEGER NOT NULL, -- 001, 002, 003...
  descricao TEXT,
  colecao TEXT, -- Verão 2026, Inverno 2026
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela para variações (SKUs individuais)
CREATE TABLE public.variacoes_referencia (
  id SERIAL PRIMARY KEY,
  referencia_id INTEGER REFERENCES public.referencias_produto(id) ON DELETE CASCADE,
  codigo_variacao TEXT NOT NULL UNIQUE, -- 2602BFA001-01, 2602BFA001-02
  sufixo_sequencial INTEGER NOT NULL, -- 01, 02, 03
  cor TEXT,
  tamanho TEXT,
  codigo_barras TEXT,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Histórico de códigos gerados (controle de sequencial)
CREATE TABLE public.sequencial_referencias (
  id SERIAL PRIMARY KEY,
  ano INTEGER NOT NULL,
  mes INTEGER NOT NULL,
  tipo_id INTEGER REFERENCES public.tipos_produto(id),
  genero_id INTEGER REFERENCES public.generos_produto(id),
  faixa_etaria_id INTEGER REFERENCES public.faixas_etarias_produto(id),
  ultimo_sequencial INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(ano, mes, tipo_id, genero_id, faixa_etaria_id)
);

-- Habilitar RLS
ALTER TABLE public.tipos_produto ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.generos_produto ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.faixas_etarias_produto ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referencias_produto ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.variacoes_referencia ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sequencial_referencias ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Acesso público tipos_produto" ON public.tipos_produto FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Acesso público generos_produto" ON public.generos_produto FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Acesso público faixas_etarias_produto" ON public.faixas_etarias_produto FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Acesso público referencias_produto" ON public.referencias_produto FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Acesso público variacoes_referencia" ON public.variacoes_referencia FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Acesso público sequencial_referencias" ON public.sequencial_referencias FOR ALL USING (true) WITH CHECK (true);

-- Dados iniciais - Tipos de Produto
INSERT INTO public.tipos_produto (nome, codigo, categoria) VALUES
-- Vestuário
('Blusa', 'B', 'vestuario'),
('Calça', 'C', 'vestuario'),
('Vestido', 'V', 'vestuario'),
('Saia', 'S', 'vestuario'),
('Short', 'H', 'vestuario'),
('Conjunto', 'J', 'vestuario'),
('Jaqueta', 'Q', 'vestuario'),
('Casaco', 'K', 'vestuario'),
('Camisa', 'M', 'vestuario'),
('Regata', 'R', 'vestuario'),
('Cropped', 'P', 'vestuario'),
('Macacão', 'A', 'vestuario'),
('Body', 'Y', 'vestuario'),
('Biquíni', 'I', 'vestuario'),
('Maiô', 'O', 'vestuario'),
-- Acessórios
('Bolsa', 'L', 'acessorios'),
('Cinto', 'T', 'acessorios'),
('Chapéu', 'U', 'acessorios'),
('Bijuteria', 'X', 'acessorios'),
('Óculos', 'G', 'acessorios'),
-- Calçados
('Sapato', 'Z', 'calcados'),
('Sandália', 'D', 'calcados'),
('Tênis', 'N', 'calcados'),
('Bota', 'E', 'calcados');

-- Dados iniciais - Gêneros
INSERT INTO public.generos_produto (nome, codigo) VALUES
('Feminino', 'F'),
('Masculino', 'M'),
('Unissex', 'U');

-- Dados iniciais - Faixas Etárias
INSERT INTO public.faixas_etarias_produto (nome, codigo) VALUES
('Adulto', 'A'),
('Teen', 'T'),
('Kids', 'K'),
('Baby', 'B');

-- Trigger para updated_at
CREATE TRIGGER update_referencias_produto_updated_at
BEFORE UPDATE ON public.referencias_produto
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_sequencial_referencias_updated_at
BEFORE UPDATE ON public.sequencial_referencias
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();