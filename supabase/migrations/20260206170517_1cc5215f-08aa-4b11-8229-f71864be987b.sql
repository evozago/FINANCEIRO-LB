-- Tabela para registro de entrada de notas fiscais (chaves NFe)
CREATE TABLE public.entradas_nfe (
  id SERIAL PRIMARY KEY,
  chave_nfe VARCHAR(44) NOT NULL UNIQUE,
  data_entrada TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Índice para busca rápida por chave
CREATE INDEX idx_entradas_nfe_chave ON public.entradas_nfe(chave_nfe);

-- Índice para ordenação por data
CREATE INDEX idx_entradas_nfe_data ON public.entradas_nfe(data_entrada DESC);

-- Comentário na tabela
COMMENT ON TABLE public.entradas_nfe IS 'Registro de entrada de notas fiscais via chave NFe (bipagem)';