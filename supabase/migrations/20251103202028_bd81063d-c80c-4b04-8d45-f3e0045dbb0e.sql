-- Adicionar suporte para Pessoa Física em contas recorrentes
ALTER TABLE public.contas_recorrentes 
ADD COLUMN IF NOT EXISTS fornecedor_pf_id BIGINT REFERENCES public.pessoas_fisicas(id) ON DELETE SET NULL;

-- Criar tabela para lançamentos de folha de pagamento
CREATE TABLE IF NOT EXISTS public.folha_pagamento_lancamentos (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  pessoa_fisica_id BIGINT NOT NULL REFERENCES public.pessoas_fisicas(id) ON DELETE CASCADE,
  mes INTEGER NOT NULL CHECK (mes >= 1 AND mes <= 12),
  ano INTEGER NOT NULL CHECK (ano >= 2020),
  salario_centavos INTEGER NOT NULL DEFAULT 0,
  adiantamento_centavos INTEGER NOT NULL DEFAULT 0,
  vale_transporte_centavos INTEGER NOT NULL DEFAULT 0,
  descontos_centavos INTEGER NOT NULL DEFAULT 0,
  observacoes TEXT,
  conta_pagar_id BIGINT REFERENCES public.contas_pagar(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (pessoa_fisica_id, mes, ano)
);

-- Habilitar RLS
ALTER TABLE public.folha_pagamento_lancamentos ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Admins can manage folha_pagamento_lancamentos"
ON public.folha_pagamento_lancamentos
FOR ALL
USING (is_admin());

CREATE POLICY "Authenticated can view folha_pagamento_lancamentos"
ON public.folha_pagamento_lancamentos
FOR SELECT
USING (auth.role() = 'authenticated');

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_folha_pagamento_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_folha_pagamento_lancamentos_updated_at
  BEFORE UPDATE ON public.folha_pagamento_lancamentos
  FOR EACH ROW
  EXECUTE FUNCTION update_folha_pagamento_updated_at();