-- Adicionar campos necessários para importação de XML

-- Adicionar campos opcionais na tabela contas_pagar para suportar importação XML
ALTER TABLE "contas_pagar"
ADD COLUMN IF NOT EXISTS "numero_nf" text,
ADD COLUMN IF NOT EXISTS "data_emissao" date,
ADD COLUMN IF NOT EXISTS "qtd_parcelas" int DEFAULT 1;

-- Tornar campos obrigatórios opcionais para flexibilidade na importação
ALTER TABLE "contas_pagar"
ALTER COLUMN "categoria_id" DROP NOT NULL,
ALTER COLUMN "filial_id" DROP NOT NULL,
ALTER COLUMN "num_parcelas" DROP NOT NULL;

-- Adicionar campo para número da parcela na tabela de parcelas
ALTER TABLE "contas_pagar_parcelas"
ADD COLUMN IF NOT EXISTS "numero_parcela" int DEFAULT 1;

-- Remover constraint única antiga se existir e criar nova
ALTER TABLE "contas_pagar_parcelas"
DROP CONSTRAINT IF EXISTS "contas_pagar_parcelas_conta_id_parcela_num_key";

-- Adicionar nova constraint única
-- Criar a constraint única apenas se ela não existir para evitar erro 42P07
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'contas_pagar_parcelas_conta_id_numero_parcela_key'
  ) THEN
    ALTER TABLE "contas_pagar_parcelas"
    ADD CONSTRAINT "contas_pagar_parcelas_conta_id_numero_parcela_key" UNIQUE ("conta_id", "numero_parcela");
  END IF;
END $$;

-- Comentários para documentação
COMMENT ON COLUMN "contas_pagar"."numero_nf" IS 'Número da nota fiscal extraído do XML';
COMMENT ON COLUMN "contas_pagar"."data_emissao" IS 'Data de emissão da nota fiscal';
COMMENT ON COLUMN "contas_pagar"."qtd_parcelas" IS 'Quantidade de parcelas da conta';
COMMENT ON COLUMN "contas_pagar_parcelas"."numero_parcela" IS 'Número sequencial da parcela';