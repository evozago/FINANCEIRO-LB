-- ============= CORREÇÃO DE SEGURANÇA - RLS E POLÍTICAS =============

-- Habilitar RLS em todas as tabelas
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cargos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pessoas_juridicas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.filiais ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pessoas_fisicas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.salarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marcas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pj_marcas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pj_representantes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categorias_financeiras ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.formas_pagamento ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bandeiras_cartao ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contas_bancarias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.taxas_bandeira ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contas_pagar ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contas_pagar_parcelas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recorrencias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contas_movimentacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fechamento_caixa ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compras_pedidos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compras_pedido_itens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compras_pedido_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compras_pedido_anexos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendas_diarias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.metas_vendedoras ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ferias_vendedoras ENABLE ROW LEVEL SECURITY;

-- ============= POLÍTICAS DE SEGURANÇA =============

-- Profiles - usuários podem ver e editar seu próprio perfil
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT USING (public.is_admin());
CREATE POLICY "Admins can update all profiles" ON public.profiles FOR UPDATE USING (public.is_admin());

-- Catálogos - leitura authenticated, escrita admin
-- Cargos
CREATE POLICY "Authenticated can view cargos" ON public.cargos FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Admins can manage cargos" ON public.cargos FOR ALL USING (public.is_admin());

-- Marcas
CREATE POLICY "Authenticated can view marcas" ON public.marcas FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Admins can manage marcas" ON public.marcas FOR ALL USING (public.is_admin());

-- Categorias financeiras
CREATE POLICY "Authenticated can view categorias_financeiras" ON public.categorias_financeiras FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Admins can manage categorias_financeiras" ON public.categorias_financeiras FOR ALL USING (public.is_admin());

-- Formas de pagamento
CREATE POLICY "Authenticated can view formas_pagamento" ON public.formas_pagamento FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Admins can manage formas_pagamento" ON public.formas_pagamento FOR ALL USING (public.is_admin());

-- Bandeiras de cartão
CREATE POLICY "Authenticated can view bandeiras_cartao" ON public.bandeiras_cartao FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Admins can manage bandeiras_cartao" ON public.bandeiras_cartao FOR ALL USING (public.is_admin());

-- Pessoas jurídicas - leitura authenticated, escrita admin
CREATE POLICY "Authenticated can view pessoas_juridicas" ON public.pessoas_juridicas FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Admins can manage pessoas_juridicas" ON public.pessoas_juridicas FOR ALL USING (public.is_admin());

-- Filiais - leitura authenticated, escrita admin
CREATE POLICY "Authenticated can view filiais" ON public.filiais FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Admins can manage filiais" ON public.filiais FOR ALL USING (public.is_admin());

-- Relações N:N - leitura authenticated, escrita admin
CREATE POLICY "Authenticated can view pj_marcas" ON public.pj_marcas FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Admins can manage pj_marcas" ON public.pj_marcas FOR ALL USING (public.is_admin());

CREATE POLICY "Authenticated can view pj_representantes" ON public.pj_representantes FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Admins can manage pj_representantes" ON public.pj_representantes FOR ALL USING (public.is_admin());

-- Dados sensíveis - apenas admin
-- Pessoas físicas
CREATE POLICY "Admins can view pessoas_fisicas" ON public.pessoas_fisicas FOR SELECT USING (public.is_admin());
CREATE POLICY "Admins can manage pessoas_fisicas" ON public.pessoas_fisicas FOR ALL USING (public.is_admin());

-- Salários
CREATE POLICY "Admins can view salarios" ON public.salarios FOR SELECT USING (public.is_admin());
CREATE POLICY "Admins can manage salarios" ON public.salarios FOR ALL USING (public.is_admin());

-- Financeiro - escrita restrita a admin
CREATE POLICY "Authenticated can view contas_bancarias" ON public.contas_bancarias FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Admins can manage contas_bancarias" ON public.contas_bancarias FOR ALL USING (public.is_admin());

CREATE POLICY "Authenticated can view taxas_bandeira" ON public.taxas_bandeira FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Admins can manage taxas_bandeira" ON public.taxas_bandeira FOR ALL USING (public.is_admin());

CREATE POLICY "Authenticated can view contas_pagar" ON public.contas_pagar FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Admins can manage contas_pagar" ON public.contas_pagar FOR ALL USING (public.is_admin());

CREATE POLICY "Authenticated can view contas_pagar_parcelas" ON public.contas_pagar_parcelas FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Admins can manage contas_pagar_parcelas" ON public.contas_pagar_parcelas FOR ALL USING (public.is_admin());

CREATE POLICY "Authenticated can view recorrencias" ON public.recorrencias FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Admins can manage recorrencias" ON public.recorrencias FOR ALL USING (public.is_admin());

CREATE POLICY "Authenticated can view contas_movimentacoes" ON public.contas_movimentacoes FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Admins can manage contas_movimentacoes" ON public.contas_movimentacoes FOR ALL USING (public.is_admin());

CREATE POLICY "Authenticated can view fechamento_caixa" ON public.fechamento_caixa FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Admins can manage fechamento_caixa" ON public.fechamento_caixa FOR ALL USING (public.is_admin());

-- Compras - leitura authenticated, escrita admin
CREATE POLICY "Authenticated can view compras_pedidos" ON public.compras_pedidos FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Admins can manage compras_pedidos" ON public.compras_pedidos FOR ALL USING (public.is_admin());

CREATE POLICY "Authenticated can view compras_pedido_itens" ON public.compras_pedido_itens FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Admins can manage compras_pedido_itens" ON public.compras_pedido_itens FOR ALL USING (public.is_admin());

CREATE POLICY "Authenticated can view compras_pedido_links" ON public.compras_pedido_links FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Admins can manage compras_pedido_links" ON public.compras_pedido_links FOR ALL USING (public.is_admin());

CREATE POLICY "Authenticated can view compras_pedido_anexos" ON public.compras_pedido_anexos FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Admins can manage compras_pedido_anexos" ON public.compras_pedido_anexos FOR ALL USING (public.is_admin());

-- Vendas - leitura authenticated, escrita admin
CREATE POLICY "Authenticated can view vendas_diarias" ON public.vendas_diarias FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Admins can manage vendas_diarias" ON public.vendas_diarias FOR ALL USING (public.is_admin());

CREATE POLICY "Authenticated can view metas_vendedoras" ON public.metas_vendedoras FOR SELECT USING (auth.role() = 'authenticated');  
CREATE POLICY "Admins can manage metas_vendedoras" ON public.metas_vendedoras FOR ALL USING (public.is_admin());

CREATE POLICY "Authenticated can view ferias_vendedoras" ON public.ferias_vendedoras FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Admins can manage ferias_vendedoras" ON public.ferias_vendedoras FOR ALL USING (public.is_admin());

-- ============= CORREÇÃO DE FUNÇÕES COM SEARCH_PATH =============

-- Corrigir função update_updated_at_column
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

-- Corrigir função handle_new_user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER 
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.profiles (user_id, email, role)
    VALUES (NEW.id, NEW.email, 'user');
    RETURN NEW;
END;
$$;