-- Views para Análises e Relatórios

-- View para vendas mensais por filial
CREATE OR REPLACE VIEW vendas_mensal AS
SELECT 
    extract(year from data) as ano,
    extract(month from data) as mes,
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

-- View para vendas mensais por vendedora
CREATE OR REPLACE VIEW vendedoras_mensal AS
SELECT 
    extract(year from vd.data) as ano,
    extract(month from vd.data) as mes,
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

-- View para vendedoras com metas ajustadas por férias
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

-- View para crescimento Year over Year por filial
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

-- View para contas a pagar em aberto
CREATE OR REPLACE VIEW contas_pagar_abertas AS
SELECT 
    cp.id as conta_id,
    cp.descricao,
    cp.numero_nota,
    cp.valor_total_centavos,
    cp.num_parcelas,
    cp.referencia,
    pj.nome_fantasia as fornecedor,
    cf.nome as categoria,
    f.nome as filial,
    count(cpp.id) as total_parcelas,
    count(CASE WHEN cpp.pago = true THEN 1 END) as parcelas_pagas,
    count(CASE WHEN cpp.pago = false THEN 1 END) as parcelas_abertas,
    sum(CASE WHEN cpp.pago = false THEN cpp.valor_parcela_centavos ELSE 0 END) as valor_em_aberto,
    min(CASE WHEN cpp.pago = false THEN cpp.vencimento END) as proximo_vencimento,
    CASE 
        WHEN count(CASE WHEN cpp.pago = true THEN 1 END) = 0 THEN 'Em Aberto'
        WHEN count(CASE WHEN cpp.pago = false THEN 1 END) = 0 THEN 'Pago'
        ELSE 'Parcialmente Pago'
    END as status_pagamento
FROM contas_pagar cp
JOIN pessoas_juridicas pj ON cp.fornecedor_id = pj.id
JOIN categorias_financeiras cf ON cp.categoria_id = cf.id
JOIN filiais f ON cp.filial_id = f.id
LEFT JOIN contas_pagar_parcelas cpp ON cp.id = cpp.conta_id
GROUP BY 
    cp.id, cp.descricao, cp.numero_nota, cp.valor_total_centavos, 
    cp.num_parcelas, cp.referencia, pj.nome_fantasia, cf.nome, f.nome
HAVING count(CASE WHEN cpp.pago = false THEN 1 END) > 0;

-- View para fluxo de caixa
CREATE OR REPLACE VIEW fluxo_caixa AS
SELECT 
    date_trunc('month', cm.created_at) as mes,
    cb.nome_conta,
    cb.banco,
    sum(CASE WHEN cm.tipo = 'credito' THEN cm.valor_centavos ELSE 0 END) as entradas,
    sum(CASE WHEN cm.tipo = 'debito' THEN cm.valor_centavos ELSE 0 END) as saidas,
    sum(CASE WHEN cm.tipo = 'credito' THEN cm.valor_centavos ELSE -cm.valor_centavos END) as saldo_periodo
FROM contas_movimentacoes cm
JOIN contas_bancarias cb ON cm.conta_bancaria_id = cb.id
GROUP BY 
    date_trunc('month', cm.created_at),
    cb.id,
    cb.nome_conta,
    cb.banco
ORDER BY mes DESC, cb.nome_conta;

-- View para análise de fornecedores
CREATE OR REPLACE VIEW analise_fornecedores AS
SELECT 
    pj.id,
    pj.nome_fantasia,
    pj.razao_social,
    pj.cnpj,
    count(DISTINCT cp.id) as total_titulos,
    sum(cp.valor_total_centavos) as valor_total_comprado,
    avg(cp.valor_total_centavos) as ticket_medio,
    count(DISTINCT cpp.id) as total_parcelas,
    count(CASE WHEN cpp.pago = true THEN 1 END) as parcelas_pagas,
    count(CASE WHEN cpp.pago = false THEN 1 END) as parcelas_abertas,
    sum(CASE WHEN cpp.pago = false THEN cpp.valor_parcela_centavos ELSE 0 END) as valor_em_aberto,
    min(cp.created_at) as primeira_compra,
    max(cp.created_at) as ultima_compra
FROM pessoas_juridicas pj
LEFT JOIN contas_pagar cp ON pj.id = cp.fornecedor_id
LEFT JOIN contas_pagar_parcelas cpp ON cp.id = cpp.conta_id
GROUP BY pj.id, pj.nome_fantasia, pj.razao_social, pj.cnpj
HAVING count(DISTINCT cp.id) > 0
ORDER BY valor_total_comprado DESC;

-- View para pedidos de compra com totais
CREATE OR REPLACE VIEW pedidos_compra_resumo AS
SELECT 
    cp.id,
    cp.numero,
    cp.data_pedido,
    cp.previsao_entrega,
    cp.status,
    pj.nome_fantasia as fornecedor,
    m.nome as marca,
    pf.nome_completo as representante,
    count(cpi.id) as total_itens,
    sum(cpi.qtd_pecas) as qtd_pecas_total_calculada,
    sum(cpi.subtotal_centavos) as valor_bruto_calculado,
    cp.qtd_pecas_total,
    cp.qtd_referencias,
    cp.valor_bruto_centavos,
    cp.desconto_percentual,
    cp.desconto_valor_centavos,
    cp.valor_liquido_centavos,
    cp.preco_medio_centavos
FROM compras_pedidos cp
LEFT JOIN pessoas_juridicas pj ON cp.fornecedor_id = pj.id
LEFT JOIN marcas m ON cp.marca_id = m.id
LEFT JOIN pessoas_fisicas pf ON cp.representante_pf_id = pf.id
LEFT JOIN compras_pedido_itens cpi ON cp.id = cpi.pedido_id
GROUP BY 
    cp.id, cp.numero, cp.data_pedido, cp.previsao_entrega, cp.status,
    pj.nome_fantasia, m.nome, pf.nome_completo,
    cp.qtd_pecas_total, cp.qtd_referencias, cp.valor_bruto_centavos,
    cp.desconto_percentual, cp.desconto_valor_centavos, 
    cp.valor_liquido_centavos, cp.preco_medio_centavos;
