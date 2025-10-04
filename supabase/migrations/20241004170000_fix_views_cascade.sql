-- Corrigir problema das views com dependências
-- Primeiro, remover todas as views que dependem de vendas_mensal

-- Remover view que depende de vendas_mensal
DROP VIEW IF EXISTS crescimento_yoy;

-- Remover a view principal
DROP VIEW IF EXISTS vendas_mensal;

-- Recriar a view vendas_mensal com tipos corretos
CREATE VIEW vendas_mensal AS
SELECT 
    CAST(extract(year from data) as integer) as ano,
    CAST(extract(month from data) as integer) as mes,
    filial_id,
    f.nome as filial_nome,
    count(*) as total_vendas,
    sum(valor_bruto_centavos) as valor_bruto_total,
    sum(desconto_centavos) as desconto_total,
    sum(valor_liquido_centavos) as valor_liquido_total,
    sum(qtd_itens) as qtd_itens_total,
    avg(valor_liquido_centavos) as ticket_medio
FROM vendas_diarias vd
LEFT JOIN filiais f ON vd.filial_id = f.id
GROUP BY 
    extract(year from data),
    extract(month from data),
    filial_id,
    f.nome;

-- Recriar a view crescimento_yoy que depende de vendas_mensal
CREATE VIEW crescimento_yoy AS
SELECT 
    atual.ano,
    atual.mes,
    atual.filial_id,
    atual.filial_nome,
    atual.valor_liquido_total as valor_atual,
    anterior.valor_liquido_total as valor_anterior,
    CASE 
        WHEN anterior.valor_liquido_total > 0 THEN
            round(
                ((atual.valor_liquido_total - anterior.valor_liquido_total)::numeric / 
                anterior.valor_liquido_total::numeric) * 100, 2
            )
        ELSE NULL
    END as crescimento_percentual,
    (atual.valor_liquido_total - coalesce(anterior.valor_liquido_total, 0)) as crescimento_absoluto
FROM vendas_mensal atual
LEFT JOIN vendas_mensal anterior ON (
    atual.filial_id = anterior.filial_id 
    AND atual.mes = anterior.mes 
    AND atual.ano = anterior.ano + 1
);
