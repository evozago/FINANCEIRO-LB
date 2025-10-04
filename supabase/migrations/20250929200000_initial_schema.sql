-- Módulo de Cadastros (Core)

CREATE TABLE "cargos" (
  "id" bigserial PRIMARY KEY,
  "nome" text UNIQUE NOT NULL,
  "created_at" timestamptz DEFAULT now()
);

CREATE TABLE "pessoas_juridicas" (
  "id" bigserial PRIMARY KEY,
  "razao_social" text NOT NULL,
  "nome_fantasia" text,
  "cnpj" text UNIQUE,
  "insc_estadual" text,
  "celular" text,
  "email" text,
  "endereco" text,
  "fundacao" date,
  "created_at" timestamptz DEFAULT now(),
  "updated_at" timestamptz DEFAULT now()
);

CREATE TABLE "filiais" (
  "id" bigserial PRIMARY KEY,
  "pj_id" bigint NOT NULL REFERENCES "pessoas_juridicas"("id") ON DELETE CASCADE,
  "nome" text UNIQUE NOT NULL,
  "created_at" timestamptz DEFAULT now()
);

CREATE TABLE "pessoas_fisicas" (
  "id" bigserial PRIMARY KEY,
  "nome_completo" text NOT NULL,
  "cpf" text NOT NULL UNIQUE,
  "celular" text,
  "email" text,
  "endereco" text,
  "nascimento" date,
  "num_cadastro_folha" text NOT NULL,
  "filial_id" bigint REFERENCES "filiais"("id") ON DELETE SET NULL,
  "cargo_id" bigint REFERENCES "cargos"("id") ON DELETE SET NULL,
  "created_at" timestamptz DEFAULT now(),
  "updated_at" timestamptz DEFAULT now()
);

CREATE TABLE "salarios" (
  "id" bigserial PRIMARY KEY,
  "pf_id" bigint NOT NULL REFERENCES "pessoas_fisicas"("id") ON DELETE CASCADE,
  "salario_base_centavos" int NOT NULL CHECK (salario_base_centavos >= 0),
  "meta_centavos" int NOT NULL DEFAULT 0 CHECK (meta_centavos >= 0),
  "comissao_percentual" numeric(5,2) NOT NULL DEFAULT 0,
  "vigencia_inicio" date NOT NULL,
  "vigencia_fim" date,
  "created_at" timestamptz DEFAULT now()
);

CREATE TABLE "marcas" (
  "id" bigserial PRIMARY KEY,
  "nome" text UNIQUE NOT NULL,
  "created_at" timestamptz DEFAULT now(),
  "updated_at" timestamptz DEFAULT now()
);

CREATE TABLE "pj_marcas" (
  "pj_id" bigint NOT NULL REFERENCES "pessoas_juridicas"("id") ON DELETE CASCADE,
  "marca_id" bigint NOT NULL REFERENCES "marcas"("id") ON DELETE CASCADE,
  PRIMARY KEY ("pj_id", "marca_id")
);

CREATE TABLE "pj_representantes" (
  "pj_id" bigint NOT NULL REFERENCES "pessoas_juridicas"("id") ON DELETE CASCADE,
  "pf_id" bigint NOT NULL REFERENCES "pessoas_fisicas"("id") ON DELETE CASCADE,
  PRIMARY KEY ("pj_id", "pf_id")
);

-- Módulo Financeiro

CREATE TABLE "categorias_financeiras" (
  "id" bigserial PRIMARY KEY,
  "nome" text UNIQUE NOT NULL,
  "tipo" text CHECK (tipo IN ('materia_prima','consumo_interno','revenda','servico','outros')) DEFAULT 'outros',
  "created_at" timestamptz DEFAULT now(),
  "updated_at" timestamptz DEFAULT now()
);

CREATE TABLE "contas_bancarias" (
  "id" bigserial PRIMARY KEY,
  "pj_id" bigint NOT NULL REFERENCES "pessoas_juridicas"("id"),
  "nome_conta" text,
  "banco" text,
  "agencia" text,
  "numero_conta" text,
  "ativa" boolean DEFAULT true,
  "saldo_atual_centavos" int DEFAULT 0,
  "created_at" timestamptz DEFAULT now(),
  "updated_at" timestamptz DEFAULT now()
);

CREATE TABLE "formas_pagamento" (
    "id" bigserial PRIMARY KEY,
    "nome" text UNIQUE NOT NULL
);

CREATE TABLE "bandeiras_cartao" (
    "id" bigserial PRIMARY KEY,
    "nome" text UNIQUE NOT NULL
);

CREATE TABLE "taxas_bandeira" (
    "id" bigserial PRIMARY KEY,
    "conta_id" bigint NOT NULL REFERENCES "contas_bancarias"("id") ON DELETE CASCADE,
    "bandeira_id" bigint NOT NULL REFERENCES "bandeiras_cartao"("id") ON DELETE CASCADE,
    "percentual" numeric(6,3) NOT NULL
);

CREATE TABLE "contas_pagar" (
  "id" bigserial PRIMARY KEY,
  "fornecedor_id" bigint NOT NULL REFERENCES "pessoas_juridicas"("id"),
  "categoria_id" bigint NOT NULL REFERENCES "categorias_financeiras"("id"),
  "filial_id" bigint NOT NULL REFERENCES "filiais"("id"),
  "descricao" text,
  "numero_nota" text,
  "chave_nfe" text,
  "valor_total_centavos" int NOT NULL CHECK (valor_total_centavos >= 0),
  "num_parcelas" int NOT NULL CHECK (num_parcelas >= 1),
  "referencia" text,
  "created_at" timestamptz DEFAULT now(),
  "updated_at" timestamptz DEFAULT now()
);

CREATE TABLE "contas_pagar_parcelas" (
  "id" bigserial PRIMARY KEY,
  "conta_id" bigint NOT NULL REFERENCES "contas_pagar"("id") ON DELETE CASCADE,
  "parcela_num" int NOT NULL CHECK (parcela_num >= 1),
  "valor_parcela_centavos" int NOT NULL CHECK (valor_parcela_centavos >= 0),
  "vencimento" date NOT NULL,
  "pago" boolean DEFAULT false,
  "pago_em" date,
  "forma_pagamento_id" bigint REFERENCES "formas_pagamento"("id"),
  "conta_bancaria_id" bigint REFERENCES "contas_bancarias"("id"),
  "valor_pago_centavos" int,
  "observacao" text,
  "created_at" timestamptz DEFAULT now(),
  "updated_at" timestamptz DEFAULT now(),
  UNIQUE ("conta_id", "parcela_num")
);

CREATE TABLE "recorrencias" (
  "id" bigserial PRIMARY KEY,
  "nome" text NOT NULL,
  "fornecedor_id" bigint REFERENCES "pessoas_juridicas"("id"),
  "filial_id" bigint NOT NULL REFERENCES "filiais"("id"),
  "categoria_id" bigint NOT NULL REFERENCES "categorias_financeiras"("id"),
  "valor_esperado_centavos" int NOT NULL DEFAULT 0,
  "dia_fechamento" int CHECK (dia_fechamento BETWEEN 1 AND 31),
  "dia_vencimento" int CHECK (dia_vencimento BETWEEN 1 AND 31),
  "sem_data_final" boolean DEFAULT true,
  "livre" boolean DEFAULT false,
  "ativa" boolean DEFAULT true,
  "created_at" timestamptz DEFAULT now(),
  "updated_at" timestamptz DEFAULT now()
);

CREATE TABLE "contas_movimentacoes" (
  "id" bigserial PRIMARY KEY,
  "conta_bancaria_id" bigint NOT NULL REFERENCES "contas_bancarias"("id"),
  "tipo" text NOT NULL CHECK (tipo IN ('debito','credito')),
  "valor_centavos" int NOT NULL CHECK (valor_centavos > 0),
  "origem" text CHECK (origem IN ('parcela','ajuste','importacao')) DEFAULT 'parcela',
  "parcela_id" bigint REFERENCES "contas_pagar_parcelas"("id") ON DELETE SET NULL,
  "descricao" text,
  "created_at" timestamptz DEFAULT now()
);

CREATE TABLE "fechamento_caixa" (
  "id" bigserial PRIMARY KEY,
  "data_fechamento" date NOT NULL UNIQUE,
  "filial_id" bigint REFERENCES "filiais"("id"),
  "valor_sistema_pix" int,
  "valor_conferido_pix" int,
  "diferenca_pix" int,
  "valor_sistema_credito" int,
  "valor_conferido_credito" int,
  "diferenca_credito" int,
  "valor_sistema_debito" int,
  "valor_conferido_debito" int,
  "diferenca_debito" int,
  "valor_sistema_dinheiro" int,
  "valor_conferido_dinheiro" int,
  "diferenca_dinheiro" int,
  "valor_sistema_boleto" int,
  "valor_conferido_boleto" int,
  "diferenca_boleto" int,
  "observacao" text,
  "created_at" timestamptz DEFAULT now()
);

-- Módulo Compras (Pedidos)

CREATE TABLE "compras_pedidos" (
  "id" bigserial PRIMARY KEY,
  "numero" text UNIQUE,
  "data_pedido" date,
  "previsao_entrega" date,
  "fornecedor_id" bigint REFERENCES "pessoas_juridicas"("id"),
  "marca_id" bigint REFERENCES "marcas"("id"),
  "representante_pf_id" bigint REFERENCES "pessoas_fisicas"("id"),
  "qtd_pecas_total" int,
  "qtd_referencias" int,
  "valor_bruto_centavos" int,
  "desconto_percentual" numeric(5,2),
  "desconto_valor_centavos" int,
  "valor_liquido_centavos" int,
  "preco_medio_centavos" int,
  "status" text CHECK (status IN ('aberto','parcial','recebido','cancelado')),
  "observacoes" text,
  "created_at" timestamptz DEFAULT now(),
  "updated_at" timestamptz DEFAULT now()
);

CREATE TABLE "compras_pedido_itens" (
  "id" bigserial PRIMARY KEY,
  "pedido_id" bigint NOT NULL REFERENCES "compras_pedidos"("id") ON DELETE CASCADE,
  "referencia" text,
  "descricao" text,
  "qtd_pecas" int CHECK (qtd_pecas > 0),
  "preco_unit_centavos" int CHECK (preco_unit_centavos >= 0),
  "subtotal_centavos" int GENERATED ALWAYS AS (qtd_pecas * preco_unit_centavos) STORED
);

CREATE TABLE "compras_pedido_links" (
  "id" bigserial PRIMARY KEY,
  "pedido_id" bigint NOT NULL REFERENCES "compras_pedidos"("id") ON DELETE CASCADE,
  "tipo" text CHECK (tipo IN ('pedido','foto','outro')),
  "url" text NOT NULL,
  "descricao" text
);

CREATE TABLE "compras_pedido_anexos" (
  "id" bigserial PRIMARY KEY,
  "pedido_id" bigint NOT NULL REFERENCES "compras_pedidos"("id") ON DELETE CASCADE,
  "arquivo_path" text,
  "mime_type" text,
  "descricao" text,
  "uploaded_at" timestamptz DEFAULT now()
);

-- Módulo Gestão de Vendas

CREATE TABLE "vendas_diarias" (
  "id" bigserial PRIMARY KEY,
  "data" date NOT NULL,
  "filial_id" bigint REFERENCES "filiais"("id"),
  "vendedora_pf_id" bigint REFERENCES "pessoas_fisicas"("id"),
  "valor_bruto_centavos" int,
  "desconto_centavos" int,
  "valor_liquido_centavos" int,
  "qtd_itens" int,
  "created_at" timestamptz DEFAULT now()
);

CREATE TABLE "metas_vendedoras" (
  "id" bigserial PRIMARY KEY,
  "vendedora_pf_id" bigint NOT NULL REFERENCES "pessoas_fisicas"("id"),
  "ano" int NOT NULL,
  "mes" int NOT NULL CHECK (mes BETWEEN 1 AND 12),
  "meta_centavos" int,
  UNIQUE ("vendedora_pf_id", "ano", "mes")
);

CREATE TABLE "ferias_vendedoras" (
  "id" bigserial PRIMARY KEY,
  "vendedora_pf_id" bigint NOT NULL REFERENCES "pessoas_fisicas"("id"),
  "inicio" date NOT NULL,
  "fim" date NOT NULL,
  "observacao" text
);

