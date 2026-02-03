-- Criar bucket para armazenar planilhas originais
INSERT INTO storage.buckets (id, name, public)
VALUES ('planilhas-importacao', 'planilhas-importacao', false)
ON CONFLICT (id) DO NOTHING;

-- Política para acesso público de leitura (para download posterior)
CREATE POLICY "Acesso público planilhas leitura"
ON storage.objects FOR SELECT
USING (bucket_id = 'planilhas-importacao');

-- Política para upload
CREATE POLICY "Acesso público planilhas upload"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'planilhas-importacao');

-- Política para delete
CREATE POLICY "Acesso público planilhas delete"
ON storage.objects FOR DELETE
USING (bucket_id = 'planilhas-importacao');

-- Adicionar coluna para armazenar caminho do arquivo no storage
ALTER TABLE sessoes_importacao 
ADD COLUMN IF NOT EXISTS arquivo_storage_path TEXT,
ADD COLUMN IF NOT EXISTS arquivo_mime_type TEXT,
ADD COLUMN IF NOT EXISTS arquivo_tamanho_bytes BIGINT;