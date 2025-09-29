-- Habilitar extensões necessárias
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ============= SISTEMA FINANCEIRO - ESTRUTURA COMPLETA =============

-- Criação de tipos ENUM
CREATE TYPE public.app_role AS ENUM ('admin', 'user', 'rh');
CREATE TYPE public.tipo_categoria AS ENUM ('materia_prima', 'consumo_interno', 'revenda', 'servico', 'outros');
CREATE TYPE public.tipo_movimentacao AS ENUM ('debito', 'credito');
CREATE TYPE public.origem_movimentacao AS ENUM ('parcela', 'ajuste', 'importacao');
CREATE TYPE public.status_pedido AS ENUM ('aberto', 'parcial', 'recebido', 'cancelado');
CREATE TYPE public.tipo_link AS ENUM ('pedido', 'foto', 'outro');

-- ============= MÓDULO CADASTROS =============

-- Tabela de profiles (mapeia auth.users)
CREATE TABLE public.profiles (
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    role public.app_role DEFAULT 'user' NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Função para verificar se é admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE user_id = auth.uid() AND role = 'admin'
    );
$$;

-- Cargos
CREATE TABLE public.cargos (
    id BIGSERIAL PRIMARY KEY,
    nome TEXT UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Pessoas jurídicas
CREATE TABLE public.pessoas_juridicas (
    id BIGSERIAL PRIMARY KEY,
    razao_social TEXT NOT NULL,
    nome_fantasia TEXT,
    cnpj TEXT UNIQUE,
    insc_estadual TEXT,
    celular TEXT,
    email TEXT,
    endereco TEXT,
    fundacao DATE,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Filiais
CREATE TABLE public.filiais (
    id BIGSERIAL PRIMARY KEY,
    pj_id BIGINT NOT NULL REFERENCES public.pessoas_juridicas(id) ON DELETE CASCADE,
    nome TEXT UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Pessoas físicas
CREATE TABLE public.pessoas_fisicas (
    id BIGSERIAL PRIMARY KEY,
    nome_completo TEXT NOT NULL,
    cpf TEXT NOT NULL UNIQUE,
    celular TEXT,
    email TEXT,
    endereco TEXT,
    nascimento DATE,
    num_cadastro_folha TEXT NOT NULL,
    filial_id BIGINT REFERENCES public.filiais(id) ON DELETE SET NULL,
    cargo_id BIGINT REFERENCES public.cargos(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Salários
CREATE TABLE public.salarios (
    id BIGSERIAL PRIMARY KEY,
    pf_id BIGINT NOT NULL REFERENCES public.pessoas_fisicas(id) ON DELETE CASCADE,
    salario_base_centavos INTEGER NOT NULL CHECK (salario_base_centavos >= 0),
    meta_centavos INTEGER NOT NULL DEFAULT 0 CHECK (meta_centavos >= 0),
    comissao_percentual NUMERIC(5,2) NOT NULL DEFAULT 0,
    vigencia_inicio DATE NOT NULL,
    vigencia_fim DATE,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Marcas
CREATE TABLE public.marcas (
    id BIGSERIAL PRIMARY KEY,
    nome TEXT UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Relação N:N PJ <-> Marcas
CREATE TABLE public.pj_marcas (
    pj_id BIGINT NOT NULL REFERENCES public.pessoas_juridicas(id) ON DELETE CASCADE,
    marca_id BIGINT NOT NULL REFERENCES public.marcas(id) ON DELETE CASCADE,
    PRIMARY KEY (pj_id, marca_id)
);

-- Relação N:N PJ <-> Representantes (PF)
CREATE TABLE public.pj_representantes (
    pj_id BIGINT NOT NULL REFERENCES public.pessoas_juridicas(id) ON DELETE CASCADE,
    pf_id BIGINT NOT NULL REFERENCES public.pessoas_fisicas(id) ON DELETE CASCADE,
    PRIMARY KEY (pj_id, pf_id)
);

-- ============= MÓDULO FINANCEIRO =============

-- Categorias financeiras
CREATE TABLE public.categorias_financeiras (
    id BIGSERIAL PRIMARY KEY,
    nome TEXT UNIQUE NOT NULL,
    tipo public.tipo_categoria DEFAULT 'outros' NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Formas de pagamento
CREATE TABLE public.formas_pagamento (
    id BIGSERIAL PRIMARY KEY,
    nome TEXT UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Bandeiras de cartão
CREATE TABLE public.bandeiras_cartao (
    id BIGSERIAL PRIMARY KEY,
    nome TEXT UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Contas bancárias
CREATE TABLE public.contas_bancarias (
    id BIGSERIAL PRIMARY KEY,
    pj_id BIGINT NOT NULL REFERENCES public.pessoas_juridicas(id) ON DELETE CASCADE,
    nome_conta TEXT NOT NULL,
    banco TEXT,
    agencia TEXT,
    numero_conta TEXT,
    ativa BOOLEAN DEFAULT TRUE NOT NULL,
    saldo_atual_centavos INTEGER DEFAULT 0 NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Taxas por bandeira
CREATE TABLE public.taxas_bandeira (
    id BIGSERIAL PRIMARY KEY,
    conta_id BIGINT NOT NULL REFERENCES public.contas_bancarias(id) ON DELETE CASCADE,
    bandeira_id BIGINT NOT NULL REFERENCES public.bandeiras_cartao(id) ON DELETE CASCADE,
    percentual NUMERIC(6,3) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Contas a pagar (título)
CREATE TABLE public.contas_pagar (
    id BIGSERIAL PRIMARY KEY,
    fornecedor_id BIGINT NOT NULL REFERENCES public.pessoas_juridicas(id),
    categoria_id BIGINT NOT NULL REFERENCES public.categorias_financeiras(id),
    filial_id BIGINT NOT NULL REFERENCES public.filiais(id),
    descricao TEXT,
    numero_nota TEXT,
    chave_nfe TEXT,
    valor_total_centavos INTEGER NOT NULL CHECK (valor_total_centavos >= 0),
    num_parcelas INTEGER NOT NULL CHECK (num_parcelas >= 1),
    referencia TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Parcelas das contas a pagar
CREATE TABLE public.contas_pagar_parcelas (
    id BIGSERIAL PRIMARY KEY,
    conta_id BIGINT NOT NULL REFERENCES public.contas_pagar(id) ON DELETE CASCADE,
    parcela_num INTEGER NOT NULL CHECK (parcela_num >= 1),
    valor_parcela_centavos INTEGER NOT NULL CHECK (valor_parcela_centavos >= 0),
    vencimento DATE NOT NULL,
    pago BOOLEAN DEFAULT FALSE NOT NULL,
    pago_em DATE,
    forma_pagamento_id BIGINT REFERENCES public.formas_pagamento(id),
    conta_bancaria_id BIGINT REFERENCES public.contas_bancarias(id),
    valor_pago_centavos INTEGER,
    observacao TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    UNIQUE (conta_id, parcela_num)
);

-- Recorrências
CREATE TABLE public.recorrencias (
    id BIGSERIAL PRIMARY KEY,
    nome TEXT NOT NULL,
    fornecedor_id BIGINT REFERENCES public.pessoas_juridicas(id),
    filial_id BIGINT NOT NULL REFERENCES public.filiais(id),
    categoria_id BIGINT NOT NULL REFERENCES public.categorias_financeiras(id),
    valor_esperado_centavos INTEGER NOT NULL DEFAULT 0,
    dia_fechamento INTEGER CHECK (dia_fechamento BETWEEN 1 AND 31),
    dia_vencimento INTEGER CHECK (dia_vencimento BETWEEN 1 AND 31),
    sem_data_final BOOLEAN DEFAULT TRUE NOT NULL,
    livre BOOLEAN DEFAULT FALSE NOT NULL,
    ativa BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Movimentações das contas
CREATE TABLE public.contas_movimentacoes (
    id BIGSERIAL PRIMARY KEY,
    conta_bancaria_id BIGINT NOT NULL REFERENCES public.contas_bancarias(id),
    tipo public.tipo_movimentacao NOT NULL,
    valor_centavos INTEGER NOT NULL CHECK (valor_centavos > 0),
    origem public.origem_movimentacao DEFAULT 'parcela' NOT NULL,
    parcela_id BIGINT REFERENCES public.contas_pagar_parcelas(id) ON DELETE SET NULL,
    descricao TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Fechamento de caixa
CREATE TABLE public.fechamento_caixa (
    id BIGSERIAL PRIMARY KEY,
    data_fechamento DATE NOT NULL UNIQUE,
    filial_id BIGINT REFERENCES public.filiais(id),
    valor_sistema_pix INTEGER DEFAULT 0,
    valor_conferido_pix INTEGER DEFAULT 0,
    diferenca_pix INTEGER DEFAULT 0,
    valor_sistema_credito INTEGER DEFAULT 0,
    valor_conferido_credito INTEGER DEFAULT 0,
    diferenca_credito INTEGER DEFAULT 0,
    valor_sistema_debito INTEGER DEFAULT 0,
    valor_conferido_debito INTEGER DEFAULT 0,
    diferenca_debito INTEGER DEFAULT 0,
    valor_sistema_dinheiro INTEGER DEFAULT 0,
    valor_conferido_dinheiro INTEGER DEFAULT 0,
    diferenca_dinheiro INTEGER DEFAULT 0,
    valor_sistema_boleto INTEGER DEFAULT 0,
    valor_conferido_boleto INTEGER DEFAULT 0,
    diferenca_boleto INTEGER DEFAULT 0,
    observacao TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ============= MÓDULO COMPRAS =============

-- Pedidos de compra
CREATE TABLE public.compras_pedidos (
    id BIGSERIAL PRIMARY KEY,
    numero TEXT UNIQUE NOT NULL,
    data_pedido DATE NOT NULL,
    previsao_entrega DATE,
    fornecedor_id BIGINT NOT NULL REFERENCES public.pessoas_juridicas(id),
    marca_id BIGINT REFERENCES public.marcas(id),
    representante_pf_id BIGINT REFERENCES public.pessoas_fisicas(id),
    qtd_pecas_total INTEGER DEFAULT 0,
    qtd_referencias INTEGER DEFAULT 0,
    valor_bruto_centavos INTEGER DEFAULT 0,
    desconto_percentual NUMERIC(5,2) DEFAULT 0,
    desconto_valor_centavos INTEGER DEFAULT 0,
    valor_liquido_centavos INTEGER DEFAULT 0,
    preco_medio_centavos INTEGER DEFAULT 0,
    status public.status_pedido DEFAULT 'aberto' NOT NULL,
    observacoes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Itens do pedido de compra
CREATE TABLE public.compras_pedido_itens (
    id BIGSERIAL PRIMARY KEY,
    pedido_id BIGINT NOT NULL REFERENCES public.compras_pedidos(id) ON DELETE CASCADE,
    referencia TEXT NOT NULL,
    descricao TEXT,
    qtd_pecas INTEGER NOT NULL CHECK (qtd_pecas > 0),
    preco_unit_centavos INTEGER NOT NULL CHECK (preco_unit_centavos >= 0),
    subtotal_centavos INTEGER GENERATED ALWAYS AS (qtd_pecas * preco_unit_centavos) STORED,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Links relacionados aos pedidos
CREATE TABLE public.compras_pedido_links (
    id BIGSERIAL PRIMARY KEY,
    pedido_id BIGINT NOT NULL REFERENCES public.compras_pedidos(id) ON DELETE CASCADE,
    tipo public.tipo_link NOT NULL,
    url TEXT NOT NULL,
    descricao TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Anexos dos pedidos
CREATE TABLE public.compras_pedido_anexos (
    id BIGSERIAL PRIMARY KEY,
    pedido_id BIGINT NOT NULL REFERENCES public.compras_pedidos(id) ON DELETE CASCADE,
    arquivo_path TEXT NOT NULL,
    mime_type TEXT,
    descricao TEXT,
    uploaded_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ============= MÓDULO GESTÃO DE VENDAS =============

-- Vendas diárias
CREATE TABLE public.vendas_diarias (
    id BIGSERIAL PRIMARY KEY,
    data DATE NOT NULL,
    filial_id BIGINT REFERENCES public.filiais(id),
    vendedora_pf_id BIGINT REFERENCES public.pessoas_fisicas(id),
    valor_bruto_centavos INTEGER NOT NULL DEFAULT 0,
    desconto_centavos INTEGER NOT NULL DEFAULT 0,
    valor_liquido_centavos INTEGER NOT NULL DEFAULT 0,
    qtd_itens INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Metas das vendedoras
CREATE TABLE public.metas_vendedoras (
    id BIGSERIAL PRIMARY KEY,
    vendedora_pf_id BIGINT NOT NULL REFERENCES public.pessoas_fisicas(id),
    ano INTEGER NOT NULL,
    mes INTEGER NOT NULL CHECK (mes BETWEEN 1 AND 12),
    meta_centavos INTEGER NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    UNIQUE (vendedora_pf_id, ano, mes)
);

-- Férias das vendedoras
CREATE TABLE public.ferias_vendedoras (
    id BIGSERIAL PRIMARY KEY,
    vendedora_pf_id BIGINT NOT NULL REFERENCES public.pessoas_fisicas(id),
    inicio DATE NOT NULL,
    fim DATE NOT NULL,
    observacao TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ============= ÍNDICES =============

-- Índices para busca e performance (sem trigram por enquanto)
CREATE INDEX idx_pessoas_juridicas_nome_fantasia ON public.pessoas_juridicas (nome_fantasia);
CREATE INDEX idx_pessoas_fisicas_nome_completo ON public.pessoas_fisicas (nome_completo);
CREATE INDEX idx_contas_pagar_parcelas_vencimento ON public.contas_pagar_parcelas (vencimento);
CREATE INDEX idx_contas_pagar_parcelas_pago ON public.contas_pagar_parcelas (pago);
CREATE INDEX idx_salarios_pf_vigencia ON public.salarios (pf_id, vigencia_inicio);
CREATE INDEX idx_vendas_diarias_data_filial ON public.vendas_diarias (data, filial_id);
CREATE INDEX idx_vendas_diarias_vendedora ON public.vendas_diarias (vendedora_pf_id, data);

-- ============= TRIGGERS E FUNÇÕES =============

-- Função para atualizar updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_pessoas_juridicas_updated_at BEFORE UPDATE ON public.pessoas_juridicas FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_pessoas_fisicas_updated_at BEFORE UPDATE ON public.pessoas_fisicas FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_marcas_updated_at BEFORE UPDATE ON public.marcas FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_categorias_financeiras_updated_at BEFORE UPDATE ON public.categorias_financeiras FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_contas_bancarias_updated_at BEFORE UPDATE ON public.contas_bancarias FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_contas_pagar_updated_at BEFORE UPDATE ON public.contas_pagar FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_contas_pagar_parcelas_updated_at BEFORE UPDATE ON public.contas_pagar_parcelas FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_recorrencias_updated_at BEFORE UPDATE ON public.recorrencias FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_compras_pedidos_updated_at BEFORE UPDATE ON public.compras_pedidos FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_compras_pedido_itens_updated_at BEFORE UPDATE ON public.compras_pedido_itens FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger para criar profile quando usuário é criado
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
    INSERT INTO public.profiles (user_id, email, role)
    VALUES (NEW.id, NEW.email, 'user');
    RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Função para atualizar saldo das contas
CREATE OR REPLACE FUNCTION public.atualiza_saldo_conta()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        UPDATE public.contas_bancarias 
        SET saldo_atual_centavos = saldo_atual_centavos + 
            CASE WHEN NEW.tipo = 'credito' 
                 THEN NEW.valor_centavos 
                 ELSE -NEW.valor_centavos 
            END
        WHERE id = NEW.conta_bancaria_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE public.contas_bancarias 
        SET saldo_atual_centavos = saldo_atual_centavos - 
            CASE WHEN OLD.tipo = 'credito' 
                 THEN OLD.valor_centavos 
                 ELSE -OLD.valor_centavos 
            END
        WHERE id = OLD.conta_bancaria_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_atualiza_saldo_conta
    AFTER INSERT OR UPDATE OR DELETE ON public.contas_movimentacoes
    FOR EACH ROW EXECUTE FUNCTION public.atualiza_saldo_conta();