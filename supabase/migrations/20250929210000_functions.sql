-- Funções e Triggers para o Sistema Financeiro

-- Função para gerar número NF-like
CREATE OR REPLACE FUNCTION gen_numero_nf_like(categoria_id bigint)
RETURNS text AS $$
DECLARE
    categoria_nome text;
    timestamp_part text;
    random_part text;
BEGIN
    -- Buscar nome da categoria
    SELECT nome INTO categoria_nome FROM categorias_financeiras WHERE id = categoria_id;
    
    -- Se não encontrar categoria, usar 'GERAL'
    IF categoria_nome IS NULL THEN
        categoria_nome := 'GERAL';
    END IF;
    
    -- Gerar timestamp no formato YYYYMMDDHHMMSS
    timestamp_part := to_char(now(), 'YYYYMMDDHH24MISS');
    
    -- Gerar parte aleatória de 4 dígitos
    random_part := lpad(floor(random() * 10000)::text, 4, '0');
    
    -- Retornar formato: CATEGORIA-YYYYMMDDHHMMSS-RAND
    RETURN upper(categoria_nome) || '-' || timestamp_part || '-' || random_part;
END;
$$ LANGUAGE plpgsql;

-- Função para gerar parcelas de uma conta a pagar
CREATE OR REPLACE FUNCTION gera_parcelas_conta(conta_id bigint)
RETURNS void AS $$
DECLARE
    conta_record record;
    valor_parcela int;
    valor_restante int;
    i int;
BEGIN
    -- Buscar dados da conta
    SELECT valor_total_centavos, num_parcelas 
    INTO conta_record 
    FROM contas_pagar 
    WHERE id = conta_id;
    
    -- Calcular valor base da parcela
    valor_parcela := floor(conta_record.valor_total_centavos / conta_record.num_parcelas);
    valor_restante := conta_record.valor_total_centavos - (valor_parcela * conta_record.num_parcelas);
    
    -- Gerar parcelas
    FOR i IN 1..conta_record.num_parcelas LOOP
        INSERT INTO contas_pagar_parcelas (
            conta_id,
            parcela_num,
            valor_parcela_centavos,
            vencimento
        ) VALUES (
            conta_id,
            i,
            CASE 
                WHEN i = conta_record.num_parcelas THEN valor_parcela + valor_restante
                ELSE valor_parcela
            END,
            current_date + (i * interval '30 days')
        );
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Função para pagar uma parcela
CREATE OR REPLACE FUNCTION pagar_parcela(
    parcela_id bigint,
    conta_bancaria_id bigint,
    forma_pagamento_id bigint,
    valor_pago_centavos int,
    observacao_param text DEFAULT NULL
)
RETURNS void AS $$
BEGIN
    -- Atualizar a parcela como paga
    UPDATE contas_pagar_parcelas 
    SET 
        pago = true,
        pago_em = current_date,
        forma_pagamento_id = pagar_parcela.forma_pagamento_id,
        conta_bancaria_id = pagar_parcela.conta_bancaria_id,
        valor_pago_centavos = pagar_parcela.valor_pago_centavos,
        observacao = observacao_param,
        updated_at = now()
    WHERE id = parcela_id;
    
    -- Criar movimentação de débito na conta bancária
    INSERT INTO contas_movimentacoes (
        conta_bancaria_id,
        tipo,
        valor_centavos,
        origem,
        parcela_id,
        descricao
    ) VALUES (
        pagar_parcela.conta_bancaria_id,
        'debito',
        pagar_parcela.valor_pago_centavos,
        'parcela',
        pagar_parcela.parcela_id,
        'Pagamento de parcela - ID: ' || parcela_id
    );
END;
$$ LANGUAGE plpgsql;

-- Função para atualizar saldo da conta bancária
CREATE OR REPLACE FUNCTION atualiza_saldo_conta()
RETURNS trigger AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        -- Atualizar saldo baseado no tipo de movimentação
        UPDATE contas_bancarias 
        SET saldo_atual_centavos = saldo_atual_centavos + 
            CASE 
                WHEN NEW.tipo = 'credito' THEN NEW.valor_centavos
                WHEN NEW.tipo = 'debito' THEN -NEW.valor_centavos
            END
        WHERE id = NEW.conta_bancaria_id;
        
        RETURN NEW;
    END IF;
    
    IF TG_OP = 'UPDATE' THEN
        -- Reverter movimentação antiga
        UPDATE contas_bancarias 
        SET saldo_atual_centavos = saldo_atual_centavos - 
            CASE 
                WHEN OLD.tipo = 'credito' THEN OLD.valor_centavos
                WHEN OLD.tipo = 'debito' THEN -OLD.valor_centavos
            END
        WHERE id = OLD.conta_bancaria_id;
        
        -- Aplicar nova movimentação
        UPDATE contas_bancarias 
        SET saldo_atual_centavos = saldo_atual_centavos + 
            CASE 
                WHEN NEW.tipo = 'credito' THEN NEW.valor_centavos
                WHEN NEW.tipo = 'debito' THEN -NEW.valor_centavos
            END
        WHERE id = NEW.conta_bancaria_id;
        
        RETURN NEW;
    END IF;
    
    IF TG_OP = 'DELETE' THEN
        -- Reverter movimentação
        UPDATE contas_bancarias 
        SET saldo_atual_centavos = saldo_atual_centavos - 
            CASE 
                WHEN OLD.tipo = 'credito' THEN OLD.valor_centavos
                WHEN OLD.tipo = 'debito' THEN -OLD.valor_centavos
            END
        WHERE id = OLD.conta_bancaria_id;
        
        RETURN OLD;
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualizar saldo automaticamente
DROP TRIGGER IF EXISTS trigger_atualiza_saldo_conta ON contas_movimentacoes;
CREATE TRIGGER trigger_atualiza_saldo_conta
    AFTER INSERT OR UPDATE OR DELETE ON contas_movimentacoes
    FOR EACH ROW EXECUTE FUNCTION atualiza_saldo_conta();

-- Função para aplicar recorrência em um mês específico
CREATE OR REPLACE FUNCTION aplicar_recorrencia_mes(
    recorrencia_id bigint,
    ano int,
    mes int
)
RETURNS void AS $$
DECLARE
    rec_record record;
    titulo_id bigint;
    data_vencimento date;
BEGIN
    -- Buscar dados da recorrência
    SELECT * INTO rec_record FROM recorrencias WHERE id = recorrencia_id AND ativa = true;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Recorrência não encontrada ou inativa';
    END IF;
    
    -- Calcular data de vencimento
    data_vencimento := make_date(ano, mes, rec_record.dia_vencimento);
    
    -- Verificar se já existe título para este mês
    IF EXISTS (
        SELECT 1 FROM contas_pagar 
        WHERE referencia = rec_record.nome || '-' || ano || '-' || lpad(mes::text, 2, '0')
    ) THEN
        RAISE NOTICE 'Título já existe para este mês';
        RETURN;
    END IF;
    
    -- Criar título
    INSERT INTO contas_pagar (
        fornecedor_id,
        categoria_id,
        filial_id,
        descricao,
        valor_total_centavos,
        num_parcelas,
        referencia
    ) VALUES (
        rec_record.fornecedor_id,
        rec_record.categoria_id,
        rec_record.filial_id,
        'Recorrência: ' || rec_record.nome,
        rec_record.valor_esperado_centavos,
        1,
        rec_record.nome || '-' || ano || '-' || lpad(mes::text, 2, '0')
    ) RETURNING id INTO titulo_id;
    
    -- Criar parcela única
    INSERT INTO contas_pagar_parcelas (
        conta_id,
        parcela_num,
        valor_parcela_centavos,
        vencimento
    ) VALUES (
        titulo_id,
        1,
        rec_record.valor_esperado_centavos,
        data_vencimento
    );
END;
$$ LANGUAGE plpgsql;

-- Função para gerar número de nota automaticamente
CREATE OR REPLACE FUNCTION auto_numero_nota()
RETURNS trigger AS $$
BEGIN
    -- Se não há número de nota nem chave NFe, gerar número automático
    IF NEW.numero_nota IS NULL AND NEW.chave_nfe IS NULL THEN
        NEW.numero_nota := gen_numero_nf_like(NEW.categoria_id);
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para gerar número de nota automaticamente
DROP TRIGGER IF EXISTS trigger_auto_numero_nota ON contas_pagar;
CREATE TRIGGER trigger_auto_numero_nota
    BEFORE INSERT ON contas_pagar
    FOR EACH ROW EXECUTE FUNCTION auto_numero_nota();

-- Função para calcular dias no mês
CREATE OR REPLACE FUNCTION days_in_month(ano int, mes int)
RETURNS int AS $$
BEGIN
    RETURN extract(days from (make_date(ano, mes, 1) + interval '1 month - 1 day'));
END;
$$ LANGUAGE plpgsql;

-- Função para calcular dias de férias no mês
CREATE OR REPLACE FUNCTION ferias_dias_no_mes(pf_id bigint, ano int, mes int)
RETURNS int AS $$
DECLARE
    inicio_mes date;
    fim_mes date;
    total_dias int := 0;
    ferias_record record;
BEGIN
    inicio_mes := make_date(ano, mes, 1);
    fim_mes := inicio_mes + interval '1 month - 1 day';
    
    FOR ferias_record IN 
        SELECT inicio, fim 
        FROM ferias_vendedoras 
        WHERE vendedora_pf_id = pf_id
        AND (
            (inicio <= fim_mes AND fim >= inicio_mes)
        )
    LOOP
        -- Calcular interseção das férias com o mês
        total_dias := total_dias + (
            extract(days from (
                least(ferias_record.fim, fim_mes) - 
                greatest(ferias_record.inicio, inicio_mes) + 
                interval '1 day'
            ))::int
        );
    END LOOP;
    
    RETURN total_dias;
END;
$$ LANGUAGE plpgsql;
