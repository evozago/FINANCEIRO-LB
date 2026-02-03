import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, ShoppingCart, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface MarcaData {
  id: number;
  nome: string;
  descricao?: string;
  ativo?: boolean;
  created_at: string;
}

export function MarcaDetalhes() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [marca, setMarca] = useState<MarcaData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      fetchMarcaDetalhes();
    }
  }, [id]);

  const fetchMarcaDetalhes = async () => {
    try {
      setLoading(true);

      const { data: marcaData, error: marcaError } = await supabase
        .from('marcas')
        .select('*')
        .eq('id', parseInt(id!))
        .single();

      if (marcaError) throw marcaError;
      setMarca(marcaData as MarcaData);
    } catch (error) {
      console.error('Erro ao buscar detalhes da marca:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os detalhes da marca.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('pt-BR');
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-full" />
        <div className="grid gap-4 md:grid-cols-3">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (!marca) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold mb-4">Marca não encontrada</h2>
        <Button onClick={() => navigate('/cadastros/marcas')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar para Marcas
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="outline" size="sm" onClick={() => navigate('/cadastros/marcas')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold tracking-tight">{marca.nome}</h1>
          <p className="text-muted-foreground">
            Cadastrada em {formatDate(marca.created_at)}
          </p>
        </div>
        <Badge variant={marca.ativo ? 'default' : 'secondary'}>
          {marca.ativo ? 'Ativa' : 'Inativa'}
        </Badge>
      </div>

      {/* Conteúdo Principal */}
      <Tabs defaultValue="informacoes" className="w-full">
        <TabsList>
          <TabsTrigger value="informacoes">Informações</TabsTrigger>
        </TabsList>

        <TabsContent value="informacoes" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Informações da Marca</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">Nome</h3>
                <p className="text-muted-foreground">{marca.nome}</p>
              </div>

              {marca.descricao && (
                <>
                  <Separator />
                  <div>
                    <h3 className="font-semibold mb-2">Descrição</h3>
                    <p className="text-muted-foreground">{marca.descricao}</p>
                  </div>
                </>
              )}

              <Separator />
              <div>
                <h3 className="font-semibold mb-2">Status</h3>
                <Badge variant={marca.ativo ? 'default' : 'secondary'}>
                  {marca.ativo ? 'Ativa' : 'Inativa'}
                </Badge>
              </div>

              <Separator />
              <div>
                <h3 className="font-semibold mb-2">Data de Cadastro</h3>
                <p className="text-muted-foreground">{formatDate(marca.created_at)}</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
