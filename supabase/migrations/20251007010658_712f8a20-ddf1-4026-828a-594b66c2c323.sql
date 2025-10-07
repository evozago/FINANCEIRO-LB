-- Adicionar campo categoria_pai para criar hierarquia de subcategorias
ALTER TABLE categorias_financeiras 
ADD COLUMN categoria_pai_id bigint REFERENCES categorias_financeiras(id) ON DELETE SET NULL;

-- Criar índice para melhorar performance de consultas hierárquicas
CREATE INDEX idx_categorias_pai ON categorias_financeiras(categoria_pai_id);

-- Adicionar comentário para documentação
COMMENT ON COLUMN categorias_financeiras.categoria_pai_id IS 'ID da categoria pai. NULL para categorias principais, preenchido para subcategorias';