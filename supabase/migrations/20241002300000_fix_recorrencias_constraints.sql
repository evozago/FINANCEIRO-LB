-- Corrigir constraints da tabela recorrencias para maior flexibilidade

-- Tornar categoria_id opcional (pode ser definida na hora da geração)
ALTER TABLE "recorrencias" 
ALTER COLUMN "categoria_id" DROP NOT NULL;

-- Adicionar comentários para documentação
COMMENT ON TABLE "recorrencias" IS 'Tabela para gerenciar contas que se repetem periodicamente (mensalmente)';
COMMENT ON COLUMN "recorrencias"."nome" IS 'Nome descritivo da conta recorrente (ex: Aluguel, Energia)';
COMMENT ON COLUMN "recorrencias"."fornecedor_id" IS 'Fornecedor associado à conta (opcional)';
COMMENT ON COLUMN "recorrencias"."filial_id" IS 'Filial responsável pela conta (obrigatório)';
COMMENT ON COLUMN "recorrencias"."categoria_id" IS 'Categoria financeira da conta (opcional, pode ser definida na geração)';
COMMENT ON COLUMN "recorrencias"."valor_esperado_centavos" IS 'Valor esperado da conta em centavos';
COMMENT ON COLUMN "recorrencias"."dia_fechamento" IS 'Dia do mês para fechamento da conta (opcional)';
COMMENT ON COLUMN "recorrencias"."dia_vencimento" IS 'Dia do mês para vencimento da conta';
COMMENT ON COLUMN "recorrencias"."sem_data_final" IS 'Se true, a conta se repete indefinidamente';
COMMENT ON COLUMN "recorrencias"."livre" IS 'Se true, o valor pode variar a cada geração';
COMMENT ON COLUMN "recorrencias"."ativa" IS 'Se true, a conta será gerada automaticamente';

-- Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS "idx_recorrencias_ativa" ON "recorrencias" ("ativa");
CREATE INDEX IF NOT EXISTS "idx_recorrencias_filial" ON "recorrencias" ("filial_id");
CREATE INDEX IF NOT EXISTS "idx_recorrencias_fornecedor" ON "recorrencias" ("fornecedor_id");
CREATE INDEX IF NOT EXISTS "idx_recorrencias_categoria" ON "recorrencias" ("categoria_id");

-- Função simplificada para gerar contas do mês atual
CREATE OR REPLACE FUNCTION gerar_contas_mes_atual()
RETURNS TABLE (
  recorrencia_id bigint,
  conta_id bigint,
  nome text,
  valor_centavos int,
  status text,
  mensagem text
) 
LANGUAGE plpgsql
AS $$
DECLARE
  rec_record RECORD;
  conta_existente_id bigint;
  nova_conta_id bigint;
  data_vencimento date;
  descricao_conta text;
  mes_atual int := EXTRACT(MONTH FROM CURRENT_DATE);
  ano_atual int := EXTRACT(YEAR FROM CURRENT_DATE);
BEGIN
  -- Loop através de todas as recorrências ativas
  FOR rec_record IN 
    SELECT * FROM recorrencias WHERE ativa = true ORDER BY nome
  LOOP
    -- Criar descrição da conta
    descricao_conta := rec_record.nome || ' - ' || LPAD(mes_atual::text, 2, '0') || '/' || ano_atual::text;
    
    -- Verificar se já existe conta para este mês/ano
    SELECT id INTO conta_existente_id
    FROM contas_pagar 
    WHERE descricao = descricao_conta
    LIMIT 1;
    
    IF conta_existente_id IS NULL THEN
      -- Calcular data de vencimento
      BEGIN
        data_vencimento := make_date(ano_atual, mes_atual, rec_record.dia_vencimento);
      EXCEPTION WHEN OTHERS THEN
        -- Se o dia não existe no mês (ex: 31 em fevereiro), usar último dia do mês
        data_vencimento := (make_date(ano_atual, mes_atual, 1) + interval '1 month - 1 day')::date;
      END;
      
      -- Criar nova conta a pagar
      INSERT INTO contas_pagar (
        descricao,
        valor_total_centavos,
        fornecedor_id,
        categoria_id,
        filial_id,
        num_parcelas,
        referencia
      ) VALUES (
        descricao_conta,
        rec_record.valor_esperado_centavos,
        rec_record.fornecedor_id,
        rec_record.categoria_id,
        rec_record.filial_id,
        1,
        'REC-' || rec_record.id || '-' || LPAD(mes_atual::text, 2, '0') || ano_atual::text
      ) RETURNING id INTO nova_conta_id;
      
      -- Criar parcela única
      INSERT INTO contas_pagar_parcelas (
        conta_id,
        numero_parcela,
        valor_parcela_centavos,
        vencimento,
        pago
      ) VALUES (
        nova_conta_id,
        1,
        rec_record.valor_esperado_centavos,
        data_vencimento,
        false
      );
      
      -- Retornar resultado de sucesso
      recorrencia_id := rec_record.id;
      conta_id := nova_conta_id;
      nome := rec_record.nome;
      valor_centavos := rec_record.valor_esperado_centavos;
      status := 'CRIADA';
      mensagem := 'Conta criada com sucesso';
      
      RETURN NEXT;
    ELSE
      -- Conta já existe
      recorrencia_id := rec_record.id;
      conta_id := conta_existente_id;
      nome := rec_record.nome;
      valor_centavos := rec_record.valor_esperado_centavos;
      status := 'JA_EXISTE';
      mensagem := 'Conta já foi gerada para este mês';
      
      RETURN NEXT;
    END IF;
  END LOOP;
  
  RETURN;
END;
$$;

-- Comentário para a função
COMMENT ON FUNCTION gerar_contas_mes_atual() IS 'Gera automaticamente todas as contas recorrentes ativas para o mês atual';
