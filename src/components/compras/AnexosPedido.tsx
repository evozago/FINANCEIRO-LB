import { useState, useEffect } from 'react';
import { Plus, Paperclip, Trash2, ExternalLink, FileText, Image as ImageIcon, Link as LinkIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Anexo {
  id: number;
  tipo_anexo: 'PDF' | 'XML' | 'Foto' | 'Link' | 'Outro';
  url_anexo: string;
  descricao?: string;
  created_at: string;
}

interface AnexosPedidoProps {
  pedidoId: number;
}

export function AnexosPedido({ pedidoId }: AnexosPedidoProps) {
  const [anexos, setAnexos] = useState<Anexo[]>([]);
  const [novoAnexo, setNovoAnexo] = useState({
    tipo_anexo: 'Link' as 'PDF' | 'XML' | 'Foto' | 'Link' | 'Outro',
    url_anexo: '',
    descricao: '',
  });
  const [loading, setLoading] = useState(false);
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

  const handleAddAnexo = async () => {
    if (!novoAnexo.url_anexo.trim()) {
      toast({
        title: 'Erro',
        description: 'O campo URL é obrigatório.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setLoading(true);
      const { error } = await supabase
        .from('compras_pedido_anexos')
        .insert([
          {
            pedido_id: pedidoId,
            tipo_anexo: novoAnexo.tipo_anexo,
            url_anexo: novoAnexo.url_anexo,
            descricao: novoAnexo.descricao || null,
          },
        ]);

      if (error) throw error;

      toast({
        title: 'Sucesso',
        description: 'Anexo adicionado com sucesso.',
      });

      setNovoAnexo({
        tipo_anexo: 'Link',
        url_anexo: '',
        descricao: '',
      });
      fetchAnexos();
    } catch (error) {
      console.error('Erro ao adicionar anexo:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível adicionar o anexo.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAnexo = async (id: number) => {
    if (!confirm('Tem certeza que deseja excluir este anexo?')) return;

    try {
      const { error } = await supabase
        .from('compras_pedido_anexos')
        .delete()
        .eq('id', id);

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

  const getTipoIcon = (tipo: string) => {
    switch (tipo) {
      case 'PDF':
        return <FileText className="h-4 w-4" />;
      case 'XML':
        return <FileText className="h-4 w-4" />;
      case 'Foto':
        return <ImageIcon className="h-4 w-4" />;
      case 'Link':
        return <LinkIcon className="h-4 w-4" />;
      default:
        return <Paperclip className="h-4 w-4" />;
    }
  };

  const getTipoBadgeColor = (tipo: string) => {
    switch (tipo) {
      case 'PDF':
        return 'bg-red-100 text-red-800';
      case 'XML':
        return 'bg-green-100 text-green-800';
      case 'Foto':
        return 'bg-blue-100 text-blue-800';
      case 'Link':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Paperclip className="h-5 w-5" />
          <span>Anexos do Pedido</span>
        </CardTitle>
        <CardDescription>
          Adicione links, documentos e imagens relacionados ao pedido
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Formulário para adicionar anexo */}
        <div className="grid grid-cols-12 gap-3 p-4 border rounded-lg bg-muted/50">
          <div className="col-span-3">
            <Label htmlFor="tipo_anexo">Tipo</Label>
            <Select 
              value={novoAnexo.tipo_anexo} 
              onValueChange={(value: any) => setNovoAnexo({ ...novoAnexo, tipo_anexo: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Link">Link</SelectItem>
                <SelectItem value="PDF">PDF</SelectItem>
                <SelectItem value="XML">XML</SelectItem>
                <SelectItem value="Foto">Foto</SelectItem>
                <SelectItem value="Outro">Outro</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-5">
            <Label htmlFor="url_anexo">URL *</Label>
            <Input
              id="url_anexo"
              placeholder="https://..."
              value={novoAnexo.url_anexo}
              onChange={(e) => setNovoAnexo({ ...novoAnexo, url_anexo: e.target.value })}
            />
          </div>
          <div className="col-span-3">
            <Label htmlFor="descricao">Descrição</Label>
            <Input
              id="descricao"
              placeholder="Opcional"
              value={novoAnexo.descricao}
              onChange={(e) => setNovoAnexo({ ...novoAnexo, descricao: e.target.value })}
            />
          </div>
          <div className="col-span-1 flex items-end">
            <Button onClick={handleAddAnexo} disabled={loading} size="sm" className="w-full">
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Lista de anexos */}
        <div className="space-y-2">
          {anexos.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Nenhum anexo adicionado ainda
            </p>
          ) : (
            anexos.map((anexo) => (
              <div
                key={anexo.id}
                className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center space-x-3 flex-1 min-w-0">
                  <div className="flex-shrink-0">
                    {getTipoIcon(anexo.tipo_anexo)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <Badge className={getTipoBadgeColor(anexo.tipo_anexo)}>
                        {anexo.tipo_anexo}
                      </Badge>
                      {anexo.descricao && (
                        <span className="text-sm font-medium truncate">{anexo.descricao}</span>
                      )}
                    </div>
                    <a
                      href={anexo.url_anexo}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-muted-foreground hover:text-primary truncate block"
                    >
                      {anexo.url_anexo}
                    </a>
                  </div>
                </div>
                <div className="flex items-center space-x-2 flex-shrink-0">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => window.open(anexo.url_anexo, '_blank')}
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteAnexo(anexo.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
