-- Corrigir problema de tipos de dados nas views

-- Remover views existentes que estão causando conflito
DROP VIEW IF EXISTS vendas_mensal CASCADE;
DROP VIEW IF EXISTS vendedoras_mensal CASCADE;
DROP VIEW IF EXISTS vendedoras_mensal_com_meta CASCADE;
DROP VIEW IF EXISTS crescimento_yoy CASCADE;

-- Recriar view vendas_mensal com tipos corretos
CREATE OR REPLACE VIEW vendas_mensal AS
SELECT 
    CAST(extract(year from data) AS integer) as ano,
    CAST(extract(month from data) AS integer) as mes,
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

-- Recriar view vendedoras_mensal com tipos corretos
CREATE OR REPLACE VIEW vendedoras_mensal AS
SELECT 
    CAST(extract(year from vd.data) AS integer) as ano,
    CAST(extract(month from vd.data) AS integer) as mes,
    vd.vendedora_pf_id,
    pf.nome_completo as vendedora_nome,
    vd.filial_id,
    f.nome as filial_nome,
    count(*) as total_vendas,
    sum(vd.valor_bruto_centavos) as valor_bruto_total,
    sum(vd.desconto_centavos) as desconto_total,
    sum(vd.valor_liquido_centavos) as valor_liquido_total,
    sum(vd.qtd_itens) as qtd_itens_total,
    avg(vd.valor_liquido_centavos) as ticket_medio
FROM vendas_diarias vd
LEFT JOIN pessoas_fisicas pf ON vd.vendedora_pf_id = pf.id
LEFT JOIN filiais f ON vd.filial_id = f.id
GROUP BY 
    extract(year from vd.data),
    extract(month from vd.data),
    vd.vendedora_pf_id,
    pf.nome_completo,
    vd.filial_id,
    f.nome;

-- Recriar view vendedoras_mensal_com_meta com tipos corretos
CREATE OR REPLACE VIEW vendedoras_mensal_com_meta AS
SELECT 
    vm.*,
    mv.meta_centavos as meta_original,
    days_in_month(vm.ano, vm.mes) as dias_no_mes,
    ferias_dias_no_mes(vm.vendedora_pf_id, vm.ano, vm.mes) as dias_ferias,
    (days_in_month(vm.ano, vm.mes) - ferias_dias_no_mes(vm.vendedora_pf_id, vm.ano, vm.mes)) as dias_trabalhados,
    floor(
        coalesce(mv.meta_centavos, 0) * 
        (days_in_month(vm.ano, vm.mes) - ferias_dias_no_mes(vm.vendedora_pf_id, vm.ano, vm.mes))::numeric / 
        days_in_month(vm.ano, vm.mes)::numeric
    ) as meta_ajustada,
    CASE 
        WHEN floor(
            coalesce(mv.meta_centavos, 0) * 
            (days_in_month(vm.ano, vm.mes) - ferias_dias_no_mes(vm.vendedora_pf_id, vm.ano, vm.mes))::numeric / 
            days_in_month(vm.ano, vm.mes)::numeric
        ) > 0 THEN
            round(
                (vm.valor_liquido_total::numeric / 
                floor(
                    coalesce(mv.meta_centavos, 0) * 
                    (days_in_month(vm.ano, vm.mes) - ferias_dias_no_mes(vm.vendedora_pf_id, vm.ano, vm.mes))::numeric / 
                    days_in_month(vm.ano, vm.mes)::numeric
                )) * 100, 2
            )
        ELSE 0
    END as percentual_meta
FROM vendedoras_mensal vm
LEFT JOIN metas_vendedoras mv ON (
    vm.vendedora_pf_id = mv.vendedora_pf_id 
    AND vm.ano = mv.ano 
    AND vm.mes = mv.mes
);

-- Recriar view crescimento_yoy com tipos corretos
CREATE OR REPLACE VIEW crescimento_yoy AS
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
