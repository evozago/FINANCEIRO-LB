-- Inserir dados iniciais nas tabelas de catálogo

INSERT INTO "formas_pagamento" ("nome") VALUES
(
    'pix'
),
(
    'credito'
),
(
    'debito'
),
(
    'boleto'
),
(
    'dinheiro'
);

INSERT INTO "bandeiras_cartao" ("nome") VALUES
(
    'Visa'
),
(
    'Mastercard'
),
(
    'American Express'
),
(
    'Elo'
),
(
    'Hipercard'
);

INSERT INTO "categorias_financeiras" ("nome", "tipo") VALUES
(
    'Matéria-prima',
    'materia_prima'
),
(
    'Consumo Interno',
    'consumo_interno'
),
(
    'Revenda',
    'revenda'
),
(
    'Serviço',
    'servico'
),
(
    'Outros',
    'outros'
);

