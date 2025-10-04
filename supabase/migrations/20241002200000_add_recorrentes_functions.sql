-- Função para gerar contas recorrentes automaticamente

-- Função para gerar contas a pagar baseadas nas recorrências ativas
CREATE OR REPLACE FUNCTION gerar_contas_recorrentes(
  p_mes int DEFAULT EXTRACT(MONTH FROM CURRENT_DATE),
  p_ano int DEFAULT EXTRACT(YEAR FROM CURRENT_DATE)
)
RETURNS TABLE (
  recorrencia_id bigint,
  conta_id bigint,
  nome text,
  valor_centavos int,
  status text
) 
LANGUAGE plpgsql
AS $$
DECLARE
  rec_record RECORD;
  conta_existente_id bigint;
  nova_conta_id bigint;
  data_vencimento date;
  descricao_conta text;
BEGIN
  -- Loop através de todas as recorrências ativas
  FOR rec_record IN 
    SELECT r.*, pj.razao_social, cf.nome as categoria_nome, f.nome as filial_nome
    FROM recorrencias r
    LEFT JOIN pessoas_juridicas pj ON r.fornecedor_id = pj.id
    LEFT JOIN categorias_financeiras cf ON r.categoria_id = cf.id
    LEFT JOIN filiais f ON r.filial_id = f.id
    WHERE r.ativa = true
  LOOP
    -- Criar descrição da conta
    descricao_conta := rec_record.nome || ' - ' || LPAD(p_mes::text, 2, '0') || '/' || p_ano::text;
    
    -- Verificar se já existe conta para este mês/ano
    SELECT id INTO conta_existente_id
    FROM contas_pagar 
    WHERE descricao = descricao_conta
      AND EXTRACT(MONTH FROM created_at) = p_mes
      AND EXTRACT(YEAR FROM created_at) = p_ano
    LIMIT 1;
    
    IF conta_existente_id IS NULL THEN
      -- Calcular data de vencimento
      BEGIN
        data_vencimento := make_date(p_ano, p_mes, rec_record.dia_vencimento);
      EXCEPTION WHEN OTHERS THEN
        -- Se o dia não existe no mês (ex: 31 em fevereiro), usar último dia do mês
        data_vencimento := (make_date(p_ano, p_mes, 1) + interval '1 month - 1 day')::date;
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
        'REC-' || rec_record.id || '-' || LPAD(p_mes::text, 2, '0') || p_ano::text
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
      
      -- Retornar resultado
      recorrencia_id := rec_record.id;
      conta_id := nova_conta_id;
      nome := rec_record.nome;
      valor_centavos := rec_record.valor_esperado_centavos;
      status := 'CRIADA';
      
      RETURN NEXT;
    ELSE
      -- Conta já existe
      recorrencia_id := rec_record.id;
      conta_id := conta_existente_id;
      nome := rec_record.nome;
      valor_centavos := rec_record.valor_esperado_centavos;
      status := 'JA_EXISTE';
      
      RETURN NEXT;
    END IF;
  END LOOP;
  
  RETURN;
END;
$$;

-- Função para obter próximas contas a vencer (recorrentes)
CREATE OR REPLACE FUNCTION proximas_contas_recorrentes(dias_antecedencia int DEFAULT 7)
RETURNS TABLE (
  recorrencia_id bigint,
  nome text,
  valor_esperado_centavos int,
  dia_vencimento int,
  fornecedor text,
  categoria text,
  filial text,
  proxima_geracao date,
  dias_restantes int
) 
LANGUAGE plpgsql
AS $$
DECLARE
  hoje date := CURRENT_DATE;
  mes_atual int := EXTRACT(MONTH FROM hoje);
  ano_atual int := EXTRACT(YEAR FROM hoje);
BEGIN
  RETURN QUERY
  SELECT 
    r.id,
    r.nome,
    r.valor_esperado_centavos,
    r.dia_vencimento,
    COALESCE(pj.nome_fantasia, pj.razao_social, 'Não definido') as fornecedor,
    cf.nome as categoria,
    f.nome as filial,
    CASE 
      WHEN r.dia_vencimento >= EXTRACT(DAY FROM hoje) THEN
        make_date(ano_atual, mes_atual, r.dia_vencimento)
      ELSE
        CASE 
          WHEN mes_atual = 12 THEN make_date(ano_atual + 1, 1, r.dia_vencimento)
          ELSE make_date(ano_atual, mes_atual + 1, r.dia_vencimento)
        END
    END as proxima_geracao,
    CASE 
      WHEN r.dia_vencimento >= EXTRACT(DAY FROM hoje) THEN
        make_date(ano_atual, mes_atual, r.dia_vencimento) - hoje
      ELSE
        CASE 
          WHEN mes_atual = 12 THEN make_date(ano_atual + 1, 1, r.dia_vencimento) - hoje
          ELSE make_date(ano_atual, mes_atual + 1, r.dia_vencimento) - hoje
        END
    END as dias_restantes
  FROM recorrencias r
  LEFT JOIN pessoas_juridicas pj ON r.fornecedor_id = pj.id
  LEFT JOIN categorias_financeiras cf ON r.categoria_id = cf.id
  LEFT JOIN filiais f ON r.filial_id = f.id
  WHERE r.ativa = true
    AND (
      (r.dia_vencimento >= EXTRACT(DAY FROM hoje) AND r.dia_vencimento - EXTRACT(DAY FROM hoje) <= dias_antecedencia)
      OR 
      (r.dia_vencimento < EXTRACT(DAY FROM hoje) AND (
        CASE 
          WHEN mes_atual = 12 THEN make_date(ano_atual + 1, 1, r.dia_vencimento) - hoje
          ELSE make_date(ano_atual, mes_atual + 1, r.dia_vencimento) - hoje
        END
      ) <= dias_antecedencia)
    )
  ORDER BY proxima_geracao;
END;
$$;

-- Função para verificar contas recorrentes vencidas (não geradas)
CREATE OR REPLACE FUNCTION contas_recorrentes_vencidas()
RETURNS TABLE (
  recorrencia_id bigint,
  nome text,
  valor_esperado_centavos int,
  dia_vencimento int,
  meses_atrasados int,
  ultimo_mes_gerado text
) 
LANGUAGE plpgsql
AS $$
DECLARE
  hoje date := CURRENT_DATE;
  mes_atual int := EXTRACT(MONTH FROM hoje);
  ano_atual int := EXTRACT(YEAR FROM hoje);
BEGIN
  RETURN QUERY
  SELECT 
    r.id,
    r.nome,
    r.valor_esperado_centavos,
    r.dia_vencimento,
    0 as meses_atrasados, -- Simplificado por enquanto
    'N/A' as ultimo_mes_gerado
  FROM recorrencias r
  WHERE r.ativa = true
    AND r.dia_vencimento < EXTRACT(DAY FROM hoje)
    AND NOT EXISTS (
      SELECT 1 FROM contas_pagar cp 
      WHERE cp.descricao LIKE r.nome || ' - ' || LPAD(mes_atual::text, 2, '0') || '/' || ano_atual::text
    );
END;
$$;

-- Comentários para documentação
COMMENT ON FUNCTION gerar_contas_recorrentes(int, int) IS 'Gera contas a pagar baseadas nas recorrências ativas para um mês/ano específico';
COMMENT ON FUNCTION proximas_contas_recorrentes(int) IS 'Retorna contas recorrentes que precisam ser geradas nos próximos N dias';
COMMENT ON FUNCTION contas_recorrentes_vencidas() IS 'Retorna contas recorrentes que deveriam ter sido geradas mas não foram';
