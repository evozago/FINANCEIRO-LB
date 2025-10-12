-- Seed de Categorias Financeiras (idempotente via slug)
-- Requer: coluna 'slug' única (migration de refactor)

INSERT INTO public.categorias_financeiras (nome, tipo, parent_id, ordem, archived, slug, cor)
VALUES
  ('Despesas Operacionais',  'despesa',       NULL, 10, false, 'despesas-operacionais',  '#FDE68A'),
  ('Fornecedores',           'despesa',       NULL, 20, false, 'fornecedores',            '#FCA5A5'),
  ('Impostos',               'despesa',       NULL, 30, false, 'impostos',                '#F5D0FE'),
  ('Folha de Pagamento',     'despesa',       NULL, 40, false, 'folha-pagamento',         '#BFDBFE'),
  ('Marketing',              'despesa',       NULL, 50, false, 'marketing',               '#D1FAE5'),
  ('Sistemas e Ferramentas', 'despesa',       NULL, 60, false, 'sistemas-ferramentas',    '#E5E7EB'),
  ('Logística & Fretes',     'despesa',       NULL, 70, false, 'logistica-fretes',        '#E9D5FF'),
  ('Receitas',               'receita',       NULL, 80, false, 'receitas',                '#BBF7D0'),
  ('Transferências',         'transferencia', NULL, 90, false, 'transferencias',          '#F3F4F6')
ON CONFLICT (slug) DO UPDATE SET
  nome = EXCLUDED.nome, tipo = EXCLUDED.tipo, ordem = EXCLUDED.ordem, archived = EXCLUDED.archived, cor = EXCLUDED.cor;

INSERT INTO public.categorias_financeiras (nome, tipo, parent_id, ordem, archived, slug, cor)
SELECT x.nome, 'despesa', p.id, x.ordem, false, x.slug, x.cor
FROM (
  VALUES
    ('Aluguel',           10, 'despesas-op-aluguel',           '#FDE68A'),
    ('Energia Elétrica',  20, 'despesas-op-energia',           '#FDE68A'),
    ('Água',              30, 'despesas-op-agua',              '#FDE68A'),
    ('Internet/Telefonia',40, 'despesas-op-internet',          '#FDE68A'),
    ('Manutenção',        50, 'despesas-op-manutencao',        '#FDE68A'),
    ('Material/Embalagens',60,'despesas-op-embalagens',        '#FDE68A'),
    ('Limpeza/Descartáveis',70,'despesas-op-limpeza',          '#FDE68A'),
    ('Serviços Terceiros',80,'despesas-op-terceiros',          '#FDE68A'),
    ('Tarifas Bancárias', 90, 'despesas-op-tarifas-bancarias', '#FDE68A')
) AS x(nome, ordem, slug, cor)
JOIN public.categorias_financeiras p ON p.slug = 'despesas-operacionais'
ON CONFLICT (slug) DO UPDATE SET
  nome = EXCLUDED.nome, ordem = EXCLUDED.ordem, archived = EXCLUDED.archived, cor = EXCLUDED.cor, parent_id = EXCLUDED.parent_id;

INSERT INTO public.categorias_financeiras (nome, tipo, parent_id, ordem, archived, slug, cor)
SELECT x.nome, 'despesa', p.id, x.ordem, false, x.slug, '#FCA5A5'
FROM (
  VALUES
    ('Tex Cotton',          10, 'fornecedor-tex-cotton'),
    ('Digital Kids',        20, 'fornecedor-digital-kids'),
    ('Confeccoes Jojo',     30, 'fornecedor-confeccoes-jojo'),
    ('Charpey',             40, 'fornecedor-charpey'),
    ('Outros Fornecedores', 90, 'fornecedor-outros')
) AS x(nome, ordem, slug)
JOIN public.categorias_financeiras p ON p.slug = 'fornecedores'
ON CONFLICT (slug) DO UPDATE SET
  nome = EXCLUDED.nome, ordem = EXCLUDED.ordem, archived = EXCLUDED.archived, parent_id = EXCLUDED.parent_id;

INSERT INTO public.categorias_financeiras (nome, tipo, parent_id, ordem, archived, slug, cor)
SELECT x.nome, 'despesa', p.id, x.ordem, false, x.slug, '#F5D0FE'
FROM (
  VALUES
    ('Simples Nacional', 10, 'imposto-simples-nacional'),
    ('ICMS ST',          20, 'imposto-icms-st'),
    ('ISS/Serviços',     30, 'imposto-iss'),
    ('Taxas Municipais', 40, 'imposto-taxas-municipais'),
    ('Contabilidade',    50, 'imposto-contabilidade')
) AS x(nome, ordem, slug)
JOIN public.categorias_financeiras p ON p.slug = 'impostos'
ON CONFLICT (slug) DO UPDATE SET
  nome = EXCLUDED.nome, ordem = EXCLUDED.ordem, archived = EXCLUDED.archived, parent_id = EXCLUDED.parent_id;

INSERT INTO public.categorias_financeiras (nome, tipo, parent_id, ordem, archived, slug, cor)
SELECT x.nome, 'despesa', p.id, x.ordem, false, x.slug, '#BFDBFE'
FROM (
  VALUES
    ('Salários',         10, 'folha-salarios'),
    ('Comissões',        20, 'folha-comissoes'),
    ('Encargos/INSS',    30, 'folha-encargos'),
    ('Benefícios',       40, 'folha-beneficios'),
    ('Pró-Labore',       50, 'folha-prolabore')
) AS x(nome, ordem, slug)
JOIN public.categorias_financeiras p ON p.slug = 'folha-pagamento'
ON CONFLICT (slug) DO UPDATE SET
  nome = EXCLUDED.nome, ordem = EXCLUDED.ordem, archived = EXCLUDED.archived, parent_id = EXCLUDED.parent_id;

INSERT INTO public.categorias_financeiras (nome, tipo, parent_id, ordem, archived, slug, cor)
SELECT x.nome, 'despesa', p.id, x.ordem, false, x.slug, '#D1FAE5'
FROM (
  VALUES
    ('Tráfego Pago',     10, 'mkt-trafego-pago'),
    ('Redes Sociais',    20, 'mkt-redes-sociais'),
    ('Brindes/Promo',    30, 'mkt-brindes-promo'),
    ('Fotografia/Design',40, 'mkt-foto-design')
) AS x(nome, ordem, slug)
JOIN public.categorias_financeiras p ON p.slug = 'marketing'
ON CONFLICT (slug) DO UPDATE SET
  nome = EXCLUDED.nome, ordem = EXCLUDED.ordem, archived = EXCLUDED.archived, parent_id = EXCLUDED.parent_id;

INSERT INTO public.categorias_financeiras (nome, tipo, parent_id, ordem, archived, slug, cor)
SELECT x.nome, 'despesa', p.id, x.ordem, false, x.slug, '#E5E7EB'
FROM (
  VALUES
    ('Shopify',          10, 'sist-shopify'),
    ('Vercel',           20, 'sist-vercel'),
    ('Supabase',         30, 'sist-supabase'),
    ('Lovable.dev',      40, 'sist-lovable'),
    ('Google Workspace', 50, 'sist-google-workspace'),
    ('Outros Sistemas',  90, 'sist-outros')
) AS x(nome, ordem, slug)
JOIN public.categorias_financeiras p ON p.slug = 'sistemas-ferramentas'
ON CONFLICT (slug) DO UPDATE SET
  nome = EXCLUDED.nome, ordem = EXCLUDED.ordem, archived = EXCLUDED.archived, parent_id = EXCLUDED.parent_id;

INSERT INTO public.categorias_financeiras (nome, tipo, parent_id, ordem, archived, slug, cor)
SELECT x.nome, 'despesa', p.id, x.ordem, false, x.slug, '#E9D5FF'
FROM (
  VALUES
    ('Correios',         10, 'log-correios'),
    ('Jadlog',           20, 'log-jadlog'),
    ('Transportadoras',  30, 'log-transportadoras'),
    ('Motoboy',          40, 'log-motoboy'),
    ('Embalagens/Frete', 50, 'log-embalagens-frete')
) AS x(nome, ordem, slug)
JOIN public.categorias_financeiras p ON p.slug = 'logistica-fretes'
ON CONFLICT (slug) DO UPDATE SET
  nome = EXCLUDED.nome, ordem = EXCLUDED.ordem, archived = EXCLUDED.archived, parent_id = EXCLUDED.parent_id;

INSERT INTO public.categorias_financeiras (nome, tipo, parent_id, ordem, archived, slug, cor)
SELECT x.nome, 'receita', p.id, x.ordem, false, x.slug, '#BBF7D0'
FROM (
  VALUES
    ('Vendas Loja Física',        10, 'rec-vendas-loja-fisica'),
    ('Vendas Loja Online',        20, 'rec-vendas-shopify'),
    ('Frete Cobrado do Cliente',  30, 'rec-frete-cobrado'),
    ('Outras Receitas',           90, 'rec-outras')
) AS x(nome, ordem, slug)
JOIN public.categorias_financeiras p ON p.slug = 'receitas'
ON CONFLICT (slug) DO UPDATE SET
  nome = EXCLUDED.nome, ordem = EXCLUDED.ordem, archived = EXCLUDED.archived, parent_id = EXCLUDED.parent_id;

INSERT INTO public.categorias_financeiras (nome, tipo, parent_id, ordem, archived, slug, cor)
SELECT x.nome, 'transferencia', p.id, x.ordem, false, x.slug, '#F3F4F6'
FROM (
  VALUES
    ('Entre Contas Bancárias', 10, 'trans-entre-contas'),
    ('Saque',                  20, 'trans-saque'),
    ('Depósito',               30, 'trans-deposito'),
    ('Ajustes/Estornos',       40, 'trans-ajustes')
) AS x(nome, ordem, slug)
JOIN public.categorias_financeiras p ON p.slug = 'transferencias'
ON CONFLICT (slug) DO UPDATE SET
  nome = EXCLUDED.nome, ordem = EXCLUDED.ordem, archived = EXCLUDED.archived, parent_id = EXCLUDED.parent_id;
