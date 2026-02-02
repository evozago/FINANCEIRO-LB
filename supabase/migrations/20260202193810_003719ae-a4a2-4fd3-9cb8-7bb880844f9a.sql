-- ==============================================
-- ECOSSISTEMA LOJA - ESTRUTURA COMPLETA
-- ==============================================

-- Filiais
CREATE TABLE public.filiais (
  id SERIAL PRIMARY KEY,
  nome TEXT NOT NULL,
  cnpj TEXT,
  endereco TEXT,
  telefone TEXT,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Cargos
CREATE TABLE public.cargos (
  id SERIAL PRIMARY KEY,
  nome TEXT NOT NULL,
  descricao TEXT,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Pessoas Físicas
CREATE TABLE public.pessoas_fisicas (
  id SERIAL PRIMARY KEY,
  nome TEXT NOT NULL,
  cpf TEXT UNIQUE,
  rg TEXT,
  email TEXT,
  telefone TEXT,
  endereco TEXT,
  data_nascimento DATE,
  cargo_id INTEGER REFERENCES public.cargos(id),
  filial_id INTEGER REFERENCES public.filiais(id),
  salario_centavos INTEGER DEFAULT 0,
  data_admissao DATE,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Pessoas Jurídicas (Fornecedores/Clientes)
CREATE TABLE public.pessoas_juridicas (
  id SERIAL PRIMARY KEY,
  razao_social TEXT NOT NULL,
  nome_fantasia TEXT,
  cnpj TEXT UNIQUE,
  ie TEXT,
  email TEXT,
  telefone TEXT,
  endereco TEXT,
  cidade TEXT,
  estado TEXT,
  cep TEXT,
  tipo TEXT DEFAULT 'fornecedor', -- 'fornecedor', 'cliente', 'ambos'
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Marcas
CREATE TABLE public.marcas (
  id SERIAL PRIMARY KEY,
  nome TEXT NOT NULL,
  descricao TEXT,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Categorias Financeiras
CREATE TABLE public.categorias_financeiras (
  id SERIAL PRIMARY KEY,
  nome TEXT NOT NULL,
  tipo TEXT DEFAULT 'despesa', -- 'despesa', 'receita'
  cor TEXT,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Contas Bancárias
CREATE TABLE public.contas_bancarias (
  id SERIAL PRIMARY KEY,
  nome TEXT NOT NULL,
  banco TEXT,
  agencia TEXT,
  conta TEXT,
  tipo TEXT DEFAULT 'corrente', -- 'corrente', 'poupanca', 'caixa'
  saldo_inicial_centavos INTEGER DEFAULT 0,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Formas de Pagamento
CREATE TABLE public.formas_pagamento (
  id SERIAL PRIMARY KEY,
  nome TEXT NOT NULL,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Contas a Pagar
CREATE TABLE public.contas_pagar (
  id SERIAL PRIMARY KEY,
  descricao TEXT,
  valor_total_centavos INTEGER NOT NULL,
  num_parcelas INTEGER DEFAULT 1,
  fornecedor_id INTEGER REFERENCES public.pessoas_juridicas(id),
  pessoa_fisica_id INTEGER REFERENCES public.pessoas_fisicas(id),
  categoria_id INTEGER REFERENCES public.categorias_financeiras(id),
  filial_id INTEGER REFERENCES public.filiais(id),
  numero_nota TEXT,
  referencia TEXT,
  observacoes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Parcelas das Contas a Pagar
CREATE TABLE public.contas_pagar_parcelas (
  id SERIAL PRIMARY KEY,
  conta_id INTEGER REFERENCES public.contas_pagar(id) ON DELETE CASCADE,
  numero_parcela INTEGER NOT NULL,
  valor_centavos INTEGER NOT NULL,
  vencimento DATE NOT NULL,
  pago BOOLEAN DEFAULT false,
  data_pagamento DATE,
  conta_bancaria_id INTEGER REFERENCES public.contas_bancarias(id),
  forma_pagamento_id INTEGER REFERENCES public.formas_pagamento(id),
  observacoes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Contas Recorrentes
CREATE TABLE public.contas_recorrentes (
  id SERIAL PRIMARY KEY,
  descricao TEXT NOT NULL,
  valor_centavos INTEGER NOT NULL,
  dia_vencimento INTEGER DEFAULT 1,
  fornecedor_id INTEGER REFERENCES public.pessoas_juridicas(id),
  pessoa_fisica_id INTEGER REFERENCES public.pessoas_fisicas(id),
  categoria_id INTEGER REFERENCES public.categorias_financeiras(id),
  filial_id INTEGER REFERENCES public.filiais(id),
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Folha de Pagamento
CREATE TABLE public.folha_pagamento_lancamentos (
  id SERIAL PRIMARY KEY,
  pessoa_fisica_id INTEGER REFERENCES public.pessoas_fisicas(id) ON DELETE CASCADE,
  mes INTEGER NOT NULL,
  ano INTEGER NOT NULL,
  salario_centavos INTEGER DEFAULT 0,
  adiantamento_centavos INTEGER DEFAULT 0,
  vale_transporte_centavos INTEGER DEFAULT 0,
  descontos_centavos INTEGER DEFAULT 0,
  observacoes TEXT,
  conta_pagar_id INTEGER REFERENCES public.contas_pagar(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(pessoa_fisica_id, mes, ano)
);

-- Pedidos de Compra
CREATE TABLE public.compras_pedidos (
  id SERIAL PRIMARY KEY,
  fornecedor_id INTEGER REFERENCES public.pessoas_juridicas(id),
  filial_id INTEGER REFERENCES public.filiais(id),
  numero_pedido TEXT,
  data_pedido DATE DEFAULT CURRENT_DATE,
  data_entrega DATE,
  status TEXT DEFAULT 'pendente', -- 'pendente', 'aprovado', 'recebido', 'cancelado'
  valor_total_centavos INTEGER DEFAULT 0,
  observacoes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Itens do Pedido de Compra
CREATE TABLE public.compras_pedido_itens (
  id SERIAL PRIMARY KEY,
  pedido_id INTEGER REFERENCES public.compras_pedidos(id) ON DELETE CASCADE,
  descricao TEXT NOT NULL,
  quantidade DECIMAL(10,2) DEFAULT 1,
  valor_unitario_centavos INTEGER DEFAULT 0,
  valor_total_centavos INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Anexos do Pedido
CREATE TABLE public.compras_pedido_anexos (
  id SERIAL PRIMARY KEY,
  pedido_id INTEGER REFERENCES public.compras_pedidos(id) ON DELETE CASCADE,
  tipo_anexo TEXT NOT NULL, -- 'PDF', 'XML', 'Foto', 'Link', 'Outro'
  url_anexo TEXT NOT NULL,
  descricao TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Vendedoras
CREATE TABLE public.vendedoras (
  id SERIAL PRIMARY KEY,
  pessoa_fisica_id INTEGER REFERENCES public.pessoas_fisicas(id),
  nome TEXT NOT NULL,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Vendas
CREATE TABLE public.vendas (
  id SERIAL PRIMARY KEY,
  vendedora_id INTEGER REFERENCES public.vendedoras(id),
  filial_id INTEGER REFERENCES public.filiais(id),
  data_venda DATE DEFAULT CURRENT_DATE,
  valor_centavos INTEGER DEFAULT 0,
  forma_pagamento_id INTEGER REFERENCES public.formas_pagamento(id),
  observacoes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Metas de Vendas
CREATE TABLE public.metas_vendas (
  id SERIAL PRIMARY KEY,
  vendedora_id INTEGER REFERENCES public.vendedoras(id),
  filial_id INTEGER REFERENCES public.filiais(id),
  mes INTEGER NOT NULL,
  ano INTEGER NOT NULL,
  valor_meta_centavos INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(vendedora_id, filial_id, mes, ano)
);

-- Fechamentos de Caixa
CREATE TABLE public.fechamentos_caixa (
  id SERIAL PRIMARY KEY,
  filial_id INTEGER REFERENCES public.filiais(id),
  data_fechamento DATE NOT NULL,
  valor_dinheiro_centavos INTEGER DEFAULT 0,
  valor_cartao_centavos INTEGER DEFAULT 0,
  valor_pix_centavos INTEGER DEFAULT 0,
  valor_outros_centavos INTEGER DEFAULT 0,
  observacoes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.filiais ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cargos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pessoas_fisicas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pessoas_juridicas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marcas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categorias_financeiras ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contas_bancarias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.formas_pagamento ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contas_pagar ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contas_pagar_parcelas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contas_recorrentes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.folha_pagamento_lancamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compras_pedidos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compras_pedido_itens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compras_pedido_anexos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendedoras ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.metas_vendas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fechamentos_caixa ENABLE ROW LEVEL SECURITY;

-- Políticas públicas (para uso sem autenticação por enquanto)
-- Filiais
CREATE POLICY "Acesso público filiais" ON public.filiais FOR ALL USING (true) WITH CHECK (true);

-- Cargos
CREATE POLICY "Acesso público cargos" ON public.cargos FOR ALL USING (true) WITH CHECK (true);

-- Pessoas Físicas
CREATE POLICY "Acesso público pessoas_fisicas" ON public.pessoas_fisicas FOR ALL USING (true) WITH CHECK (true);

-- Pessoas Jurídicas
CREATE POLICY "Acesso público pessoas_juridicas" ON public.pessoas_juridicas FOR ALL USING (true) WITH CHECK (true);

-- Marcas
CREATE POLICY "Acesso público marcas" ON public.marcas FOR ALL USING (true) WITH CHECK (true);

-- Categorias Financeiras
CREATE POLICY "Acesso público categorias_financeiras" ON public.categorias_financeiras FOR ALL USING (true) WITH CHECK (true);

-- Contas Bancárias
CREATE POLICY "Acesso público contas_bancarias" ON public.contas_bancarias FOR ALL USING (true) WITH CHECK (true);

-- Formas de Pagamento
CREATE POLICY "Acesso público formas_pagamento" ON public.formas_pagamento FOR ALL USING (true) WITH CHECK (true);

-- Contas a Pagar
CREATE POLICY "Acesso público contas_pagar" ON public.contas_pagar FOR ALL USING (true) WITH CHECK (true);

-- Parcelas
CREATE POLICY "Acesso público contas_pagar_parcelas" ON public.contas_pagar_parcelas FOR ALL USING (true) WITH CHECK (true);

-- Contas Recorrentes
CREATE POLICY "Acesso público contas_recorrentes" ON public.contas_recorrentes FOR ALL USING (true) WITH CHECK (true);

-- Folha de Pagamento
CREATE POLICY "Acesso público folha_pagamento" ON public.folha_pagamento_lancamentos FOR ALL USING (true) WITH CHECK (true);

-- Pedidos de Compra
CREATE POLICY "Acesso público compras_pedidos" ON public.compras_pedidos FOR ALL USING (true) WITH CHECK (true);

-- Itens do Pedido
CREATE POLICY "Acesso público compras_pedido_itens" ON public.compras_pedido_itens FOR ALL USING (true) WITH CHECK (true);

-- Anexos do Pedido
CREATE POLICY "Acesso público compras_pedido_anexos" ON public.compras_pedido_anexos FOR ALL USING (true) WITH CHECK (true);

-- Vendedoras
CREATE POLICY "Acesso público vendedoras" ON public.vendedoras FOR ALL USING (true) WITH CHECK (true);

-- Vendas
CREATE POLICY "Acesso público vendas" ON public.vendas FOR ALL USING (true) WITH CHECK (true);

-- Metas de Vendas
CREATE POLICY "Acesso público metas_vendas" ON public.metas_vendas FOR ALL USING (true) WITH CHECK (true);

-- Fechamentos de Caixa
CREATE POLICY "Acesso público fechamentos_caixa" ON public.fechamentos_caixa FOR ALL USING (true) WITH CHECK (true);

-- Dados iniciais
INSERT INTO public.formas_pagamento (nome) VALUES 
  ('Dinheiro'),
  ('Cartão de Crédito'),
  ('Cartão de Débito'),
  ('PIX'),
  ('Boleto'),
  ('Transferência');

INSERT INTO public.categorias_financeiras (nome, tipo) VALUES 
  ('Fornecedores', 'despesa'),
  ('Funcionários', 'despesa'),
  ('Impostos', 'despesa'),
  ('Aluguel', 'despesa'),
  ('Energia', 'despesa'),
  ('Água', 'despesa'),
  ('Internet/Telefone', 'despesa'),
  ('Material de Escritório', 'despesa'),
  ('Marketing', 'despesa'),
  ('Outros', 'despesa'),
  ('Vendas', 'receita'),
  ('Serviços', 'receita');