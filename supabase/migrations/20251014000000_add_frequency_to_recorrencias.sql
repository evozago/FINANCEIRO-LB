-- Adiciona colunas para suportar frequências de recorrência mais flexíveis e espelhar campos de contas_pagar
ALTER TABLE public.recorrencias
ADD COLUMN numero_nota TEXT,
ADD COLUMN chave_nfe TEXT,
ADD COLUMN num_parcelas INTEGER DEFAULT 1 CHECK (num_parcelas >= 1),
ADD COLUMN referencia TEXT,
ADD COLUMN data_emissao DATE,
ADD COLUMN codigo_boleto TEXT;

-- Renomear valor_esperado_centavos para valor_total_centavos para consistência
ALTER TABLE public.recorrencias
RENAME COLUMN valor_esperado_centavos TO valor_total_centavos;

ALTER TABLE public.recorrencias
ADD COLUMN tipo_frequencia TEXT DEFAULT 'mensal' CHECK (tipo_frequencia IN ('diaria', 'semanal', 'quinzenal', 'mensal'));

ALTER TABLE public.recorrencias
ADD COLUMN intervalo_frequencia INTEGER DEFAULT 1 CHECK (intervalo_frequencia >= 1);

ALTER TABLE public.recorrencias
ADD COLUMN dias_semana INTEGER[];

-- Adiciona coluna para registrar a última data de geração
ALTER TABLE public.recorrencias
ADD COLUMN ultimo_gerado_em DATE;

