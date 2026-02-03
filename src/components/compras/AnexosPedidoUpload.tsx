import { useState, useEffect, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { 
  Plus, Paperclip, Trash2, ExternalLink, FileText, 
  Image as ImageIcon, Download, Eye, Upload, File,
  FileSpreadsheet, X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Progress } from '@/components/ui/progress';

interface Anexo {
  id: number;
  tipo_anexo: string;
  url_anexo: string;
  descricao?: string;
  nome_arquivo?: string;
  tamanho_bytes?: number;
  storage_path?: string;
  created_at: string;
}

interface AnexosPedidoUploadProps {
  pedidoId: number;
  readOnly?: boolean;
}

const ACCEPTED_TYPES = {
  'application/pdf': ['.pdf'],
  'text/xml': ['.xml'],
  'application/xml': ['.xml'],
  'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp'],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
  'application/vnd.ms-excel': ['.xls'],
  'text/csv': ['.csv'],
};

export function AnexosPedidoUpload({ pedidoId, readOnly = false }: AnexosPedidoUploadProps) {
  const [anexos, setAnexos] = useState<Anexo[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewType, setPreviewType] = useState<string>('');
  const { toast } = useToast();

  useEffect(() => {
    if (pedidoId) {
      fetchAnexos();
    }
  }, [pedidoId]);

  const fetchAnexos = async () => {
    try {
      const { data, error } = await supabase
        .from('compras_pedido_anexos')
        .select('*')
        .eq('pedido_id', pedidoId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAnexos((data || []) as Anexo[]);
    } catch (error) {
      console.error('Erro ao buscar anexos:', error);
    }
  };

  const getFileType = (file: File): string => {
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext === 'pdf') return 'PDF';
    if (ext === 'xml') return 'XML';
    if (['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext || '')) return 'Imagem';
    if (['xlsx', 'xls', 'csv'].includes(ext || '')) return 'Planilha';
    return 'Outro';
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;

    setUploading(true);
    setUploadProgress(0);

    try {
      const totalFiles = acceptedFiles.length;
      let uploaded = 0;

      for (const file of acceptedFiles) {
        // Generate unique file path
        const timestamp = Date.now();
        const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
        const storagePath = `pedidos/${pedidoId}/${timestamp}_${sanitizedName}`;

        // Upload to storage
        const { error: uploadError } = await supabase.storage
          .from('compras-anexos')
          .upload(storagePath, file);

        if (uploadError) throw uploadError;

        // Get public URL
        const { data: urlData } = supabase.storage
          .from('compras-anexos')
          .getPublicUrl(storagePath);

        // Save to database
        const { error: dbError } = await supabase
          .from('compras_pedido_anexos')
          .insert([{
            pedido_id: pedidoId,
            tipo_anexo: getFileType(file),
            url_anexo: urlData.publicUrl,
            nome_arquivo: file.name,
            tamanho_bytes: file.size,
            storage_path: storagePath,
          }]);

        if (dbError) throw dbError;

        uploaded++;
        setUploadProgress((uploaded / totalFiles) * 100);
      }

      toast({
        title: 'Sucesso',
        description: `${totalFiles} arquivo(s) enviado(s) com sucesso.`,
      });

      fetchAnexos();
    } catch (error) {
      console.error('Erro ao fazer upload:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível enviar o(s) arquivo(s).',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  }, [pedidoId, toast]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED_TYPES,
    disabled: uploading || readOnly,
  });

  const handleDelete = async (anexo: Anexo) => {
    if (!confirm('Tem certeza que deseja excluir este anexo?')) return;

    try {
      // Delete from storage if has storage_path
      if (anexo.storage_path) {
        await supabase.storage
          .from('compras-anexos')
          .remove([anexo.storage_path]);
      }

      // Delete from database
      const { error } = await supabase
        .from('compras_pedido_anexos')
        .delete()
        .eq('id', anexo.id);

      if (error) throw error;

      toast({
        title: 'Sucesso',
        description: 'Anexo excluído com sucesso.',
      });
      fetchAnexos();
    } catch (error) {
      console.error('Erro ao excluir anexo:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível excluir o anexo.',
        variant: 'destructive',
      });
    }
  };

  const handlePreview = (anexo: Anexo) => {
    setPreviewUrl(anexo.url_anexo);
    setPreviewType(anexo.tipo_anexo);
  };

  const handleDownload = async (anexo: Anexo) => {
    try {
      const response = await fetch(anexo.url_anexo);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = anexo.nome_arquivo || 'download';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      window.open(anexo.url_anexo, '_blank');
    }
  };

  const getTypeIcon = (tipo: string) => {
    switch (tipo) {
      case 'PDF':
        return <FileText className="h-4 w-4 text-destructive" />;
      case 'XML':
        return <FileText className="h-4 w-4 text-primary" />;
      case 'Imagem':
        return <ImageIcon className="h-4 w-4 text-secondary-foreground" />;
      case 'Planilha':
        return <FileSpreadsheet className="h-4 w-4 text-primary" />;
      default:
        return <File className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getTypeBadgeVariant = (tipo: string): "destructive" | "default" | "secondary" | "outline" => {
    switch (tipo) {
      case 'PDF':
        return 'destructive';
      case 'XML':
        return 'default';
      case 'Imagem':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Paperclip className="h-5 w-5" />
            Anexos do Pedido
          </CardTitle>
          <CardDescription>
            PDF, Imagens, XML, Excel - Arraste e solte ou clique para enviar
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Dropzone */}
          {!readOnly && (
            <div
              {...getRootProps()}
              className={`
                border-2 border-dashed rounded-lg p-6 text-center cursor-pointer
                transition-colors duration-200
                ${isDragActive 
                  ? 'border-primary bg-primary/5' 
                  : 'border-muted-foreground/25 hover:border-primary/50'
                }
                ${uploading ? 'opacity-50 cursor-not-allowed' : ''}
              `}
            >
              <input {...getInputProps()} />
              <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              {isDragActive ? (
                <p className="text-primary font-medium">Solte os arquivos aqui...</p>
              ) : (
                <>
                  <p className="font-medium">Arraste arquivos ou clique para selecionar</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    PDF, Imagens, XML, Excel (XLSX, XLS, CSV)
                  </p>
                </>
              )}
            </div>
          )}

          {/* Upload Progress */}
          {uploading && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Enviando...</span>
                <span>{Math.round(uploadProgress)}%</span>
              </div>
              <Progress value={uploadProgress} />
            </div>
          )}

          {/* Lista de Anexos */}
          <div className="space-y-2">
            {anexos.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Nenhum anexo adicionado
              </p>
            ) : (
              anexos.map((anexo) => (
                <div
                  key={anexo.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    {getTypeIcon(anexo.tipo_anexo)}
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Badge variant={getTypeBadgeVariant(anexo.tipo_anexo)}>
                          {anexo.tipo_anexo}
                        </Badge>
                        <span className="text-sm font-medium truncate">
                          {anexo.nome_arquivo || anexo.descricao || 'Arquivo'}
                        </span>
                      </div>
                      {anexo.tamanho_bytes && (
                        <span className="text-xs text-muted-foreground">
                          {formatFileSize(anexo.tamanho_bytes)}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    {/* Visualizar */}
                    {(anexo.tipo_anexo === 'Imagem' || anexo.tipo_anexo === 'PDF') && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handlePreview(anexo)}
                        title="Visualizar"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    )}
                    
                    {/* Abrir em nova aba */}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => window.open(anexo.url_anexo, '_blank')}
                      title="Abrir"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                    
                    {/* Download */}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDownload(anexo)}
                      title="Baixar"
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    
                    {/* Excluir */}
                    {!readOnly && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(anexo)}
                        title="Excluir"
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Preview Dialog */}
      <Dialog open={!!previewUrl} onOpenChange={() => setPreviewUrl(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              Visualização
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setPreviewUrl(null)}
              >
                <X className="h-4 w-4" />
              </Button>
            </DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center overflow-auto max-h-[70vh]">
            {previewType === 'Imagem' ? (
              <img 
                src={previewUrl || ''} 
                alt="Preview" 
                className="max-w-full max-h-full object-contain"
              />
            ) : previewType === 'PDF' ? (
              <iframe
                src={previewUrl || ''}
                className="w-full h-[70vh]"
                title="PDF Preview"
              />
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
