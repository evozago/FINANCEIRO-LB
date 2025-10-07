-- Script seguro para adicionar colunas pj_id e pf_id à tabela contas_bancarias

-- Adicionar coluna pj_id se não existir
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'contas_bancarias' 
                   AND column_name = 'pj_id') THEN
        ALTER TABLE public.contas_bancarias ADD COLUMN pj_id INT NULL;
    END IF;
END $$;

-- Adicionar coluna pf_id se não existir
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'contas_bancarias' 
                   AND column_name = 'pf_id') THEN
        ALTER TABLE public.contas_bancarias ADD COLUMN pf_id INT NULL;
    END IF;
END $$;

-- Adicionar constraint para pj_id se não existir
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                   WHERE constraint_name = 'fk_pj' 
                   AND table_name = 'contas_bancarias') THEN
        ALTER TABLE public.contas_bancarias
        ADD CONSTRAINT fk_pj
        FOREIGN KEY (pj_id) REFERENCES public.pessoas_juridicas(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Adicionar constraint para pf_id se não existir
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                   WHERE constraint_name = 'fk_pf' 
                   AND table_name = 'contas_bancarias') THEN
        ALTER TABLE public.contas_bancarias
        ADD CONSTRAINT fk_pf
        FOREIGN KEY (pf_id) REFERENCES public.pessoas_fisicas(id) ON DELETE SET NULL;
    END IF;
END $$;
