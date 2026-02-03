import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Package,
  Search,
  Filter,
  MoreVertical,
  Pencil,
  Trash2,
  Download,
  ArrowLeft,
} from 'lucide-react';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import * as XLSX from 'xlsx';

export default function ListaProdutos() {
  const queryClient = useQueryClient();
  const [busca, setBusca] = useState('');
  const [filtroCategoria, setFiltroCategoria] = useState<string>('all');
  const [filtroGenero, setFiltroGenero] = useState<string>('all');
  const [pagina, setPagina] = useState(0);
  const porPagina = 50;

  // Buscar categorias
  const { data: categorias = [] } = useQuery({
    queryKey: ['categorias-produtos'],
    queryFn: async () => {
      const { data, error } = await supabase.from('categorias_produtos').select('id, nome').eq('ativo', true);
      if (error) throw error;
      return data;
    },
  });

  // Buscar produtos
  const { data: produtosResult, isLoading } = useQuery({
    queryKey: ['produtos-lista', busca, filtroCategoria, filtroGenero, pagina],
    queryFn: async () => {
      let query = supabase
        .from('produtos')
        .select('*, categorias_produtos(nome)', { count: 'exact' })
        .eq('ativo', true)
        .order('created_at', { ascending: false })
        .range(pagina * porPagina, (pagina + 1) * porPagina - 1);

      if (busca) {
        query = query.ilike('nome', `%${busca}%`);
      }
      if (filtroCategoria && filtroCategoria !== 'all') {
        query = query.eq('categoria_id', parseInt(filtroCategoria));
      }
      if (filtroGenero && filtroGenero !== 'all') {
        query = query.eq('genero', filtroGenero);
      }

      const { data, error, count } = await query;
      if (error) throw error;
      return { produtos: data, total: count || 0 };
    },
  });

  const produtos = produtosResult?.produtos || [];
  const totalProdutos = produtosResult?.total || 0;
  const totalPaginas = Math.ceil(totalProdutos / porPagina);

  // Excluir produto
  const excluirMutation = useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase.from('produtos').update({ ativo: false }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['produtos-lista'] });
      toast.success('Produto excluído!');
    },
    onError: () => toast.error('Erro ao excluir produto'),
  });

  // Exportar
  const exportar = () => {
    const dados = produtos.map(p => ({
      'Código': p.codigo || '',
      'Nome': p.nome,
      'Categoria': (p.categorias_produtos as { nome: string } | null)?.nome || '',
      'Subcategoria': p.subcategoria || '',
      'Gênero': p.genero || '',
      'Faixa Etária': p.faixa_etaria || '',
      'Marca': p.marca || '',
      'Tamanho': p.tamanho || '',
      'Cor': p.cor || '',
      'Material': p.material || '',
      'Preço': p.preco_centavos ? (p.preco_centavos / 100).toFixed(2) : '',
      'Confiança': p.confianca,
    }));

    const ws = XLSX.utils.json_to_sheet(dados);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Produtos');
    XLSX.writeFile(wb, `produtos_${new Date().toISOString().split('T')[0]}.xlsx`);
    toast.success('Exportado!');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Button variant="ghost" size="icon" asChild>
              <Link to="/produtos/classificador">
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Package className="h-6 w-6" />
              Lista de Produtos
            </h1>
          </div>
          <p className="text-muted-foreground ml-10">
            {totalProdutos} produtos cadastrados
          </p>
        </div>

        <Button onClick={exportar}>
          <Download className="h-4 w-4 mr-2" />
          Exportar Excel
        </Button>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={busca}
                  onChange={e => { setBusca(e.target.value); setPagina(0); }}
                  placeholder="Buscar por nome..."
                  className="pl-9"
                />
              </div>
            </div>
            <Select value={filtroCategoria} onValueChange={v => { setFiltroCategoria(v); setPagina(0); }}>
              <SelectTrigger className="w-[180px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as categorias</SelectItem>
                {categorias.map(cat => (
                  <SelectItem key={cat.id} value={cat.id.toString()}>{cat.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filtroGenero} onValueChange={v => { setFiltroGenero(v); setPagina(0); }}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Gênero" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os gêneros</SelectItem>
                <SelectItem value="FEMININO">Feminino</SelectItem>
                <SelectItem value="MASCULINO">Masculino</SelectItem>
                <SelectItem value="UNISSEX">Unissex</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Tabela */}
      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="text-center py-12 text-muted-foreground">Carregando...</div>
          ) : produtos.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              Nenhum produto encontrado
            </div>
          ) : (
            <>
              <div className="border rounded-lg overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Código</TableHead>
                      <TableHead>Nome</TableHead>
                      <TableHead>Categoria</TableHead>
                      <TableHead>Gênero</TableHead>
                      <TableHead>Tamanho</TableHead>
                      <TableHead>Cor</TableHead>
                      <TableHead>Confiança</TableHead>
                      <TableHead className="w-10"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {produtos.map((produto) => (
                      <TableRow key={produto.id}>
                        <TableCell className="font-mono text-sm">{produto.codigo || '—'}</TableCell>
                        <TableCell className="font-medium max-w-[300px] truncate">{produto.nome}</TableCell>
                        <TableCell>
                          {(produto.categorias_produtos as { nome: string } | null)?.nome && (
                            <Badge variant="outline">
                              {(produto.categorias_produtos as { nome: string }).nome}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>{produto.genero || '—'}</TableCell>
                        <TableCell>{produto.tamanho || '—'}</TableCell>
                        <TableCell>{produto.cor || '—'}</TableCell>
                        <TableCell>
                          <Badge variant={produto.confianca >= 70 ? 'default' : 'secondary'}>
                            {produto.confianca}%
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => {
                                  if (confirm('Excluir produto?')) {
                                    excluirMutation.mutate(produto.id);
                                  }
                                }}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Excluir
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Paginação */}
              <div className="flex items-center justify-between mt-4">
                <p className="text-sm text-muted-foreground">
                  Mostrando {pagina * porPagina + 1}-{Math.min((pagina + 1) * porPagina, totalProdutos)} de {totalProdutos}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={pagina === 0}
                    onClick={() => setPagina(p => p - 1)}
                  >
                    Anterior
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={pagina >= totalPaginas - 1}
                    onClick={() => setPagina(p => p + 1)}
                  >
                    Próxima
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
