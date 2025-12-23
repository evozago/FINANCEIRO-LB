-- Create table for AI knowledge/rules
CREATE TABLE public.ia_conhecimento (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    regra TEXT NOT NULL,
    descricao TEXT,
    ativa BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ia_conhecimento ENABLE ROW LEVEL SECURITY;

-- Policies for admins
CREATE POLICY "Admins can manage ia_conhecimento"
ON public.ia_conhecimento
FOR ALL
USING (is_admin());

-- Policies for authenticated users to view
CREATE POLICY "Authenticated can view ia_conhecimento"
ON public.ia_conhecimento
FOR SELECT
USING (auth.role() = 'authenticated');

-- Trigger for updated_at
CREATE TRIGGER update_ia_conhecimento_updated_at
BEFORE UPDATE ON public.ia_conhecimento
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

-- Add some initial examples
INSERT INTO public.ia_conhecimento (regra, descricao) VALUES
('Fornecedores de roupas geralmente têm vencimento em 30/60/90 dias', 'Padrão de parcelamento do setor'),
('Contas de energia elétrica vencem todo dia 10', 'Padrão de concessionárias');