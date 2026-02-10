
-- Fix: remove generated column and make it a regular computed-in-app column
ALTER TABLE public.print3d_produtos DROP COLUMN custo_material_centavos;
