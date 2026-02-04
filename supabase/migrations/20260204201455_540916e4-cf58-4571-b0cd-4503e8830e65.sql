-- Create storage bucket for spreadsheets
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('planilhas-importacao', 'planilhas-importacao', false, 104857600)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for planilhas-importacao bucket
CREATE POLICY "Allow public upload to planilhas-importacao"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'planilhas-importacao');

CREATE POLICY "Allow public read from planilhas-importacao"
ON storage.objects FOR SELECT
USING (bucket_id = 'planilhas-importacao');

CREATE POLICY "Allow public delete from planilhas-importacao"
ON storage.objects FOR DELETE
USING (bucket_id = 'planilhas-importacao');