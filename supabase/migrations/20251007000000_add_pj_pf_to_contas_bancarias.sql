ALTER TABLE public.contas_bancarias
ADD COLUMN pj_id INT NULL,
ADD COLUMN pf_id INT NULL;

ALTER TABLE public.contas_bancarias
ADD CONSTRAINT fk_pj
FOREIGN KEY (pj_id) REFERENCES public.pessoas_juridicas(id) ON DELETE SET NULL;

ALTER TABLE public.contas_bancarias
ADD CONSTRAINT fk_pf
FOREIGN KEY (pf_id) REFERENCES public.pessoas_fisicas(id) ON DELETE SET NULL;
