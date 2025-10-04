-- Corrigir problema da view vendas_mensal
-- Primeiro, remover a view existente para poder recriá-la com os tipos corretos

DROP VIEW IF EXISTS vendas_mensal;

-- Recriar a view com os tipos corretos
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
    f.nome
ORDER BY ano DESC, mes DESC;
