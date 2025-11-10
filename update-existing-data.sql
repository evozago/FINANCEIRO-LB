-- Script para padronizar dados existentes no banco
-- Execute este script manualmente no Supabase SQL Editor

-- Atualizar Pessoas Físicas - nomes em MAIÚSCULAS
UPDATE pessoas_fisicas
SET nome_completo = UPPER(nome_completo),
    email = LOWER(email)
WHERE nome_completo IS NOT NULL;

-- Atualizar Pessoas Jurídicas - razão social e nome fantasia em MAIÚSCULAS
UPDATE pessoas_juridicas
SET razao_social = UPPER(razao_social),
    nome_fantasia = UPPER(nome_fantasia),
    email = LOWER(email)
WHERE razao_social IS NOT NULL;

-- Atualizar Cargos - primeira letra maiúscula em cada palavra
UPDATE cargos
SET nome = INITCAP(nome)
WHERE nome IS NOT NULL;

-- Atualizar Marcas - primeira letra maiúscula em cada palavra
UPDATE marcas
SET nome = INITCAP(nome)
WHERE nome IS NOT NULL;

-- Atualizar Categorias Financeiras - primeira letra maiúscula em cada palavra
UPDATE categorias_financeiras
SET nome = INITCAP(nome)
WHERE nome IS NOT NULL;
