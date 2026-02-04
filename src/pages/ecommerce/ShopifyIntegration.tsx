import { useState, useEffect } from 'react';
import { useShopify, ShopifyProduct, ShopifyLocation } from '@/hooks/useShopify';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { 
  RefreshCw, 
  Package, 
  Store, 
  Search, 
  Eye,
  AlertCircle,
  ImageOff
} from 'lucide-react';

export default function ShopifyIntegration() {
  const { loading, error, getProducts, getLocations, getProductsCount } = useShopify();
  
  const [products, setProducts] = useState<ShopifyProduct[]>([]);
  const [locations, setLocations] = useState<ShopifyLocation[]>([]);
  const [totalProducts, setTotalProducts] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLocation, setSelectedLocation] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Carrega dados iniciais
  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    setIsLoading(true);
    try {
      const [productsData, locationsData, countData] = await Promise.all([
        getProducts(50),
        getLocations(),
        getProductsCount(),
      ]);

      if (productsData) {
        setProducts(productsData.products);
      }
      if (locationsData) {
        setLocations(locationsData);
        if (locationsData.length > 0) {
          setSelectedLocation(locationsData[0].id);
        }
      }
      if (countData) {
        setTotalProducts(countData.count);
      }
    } catch (err) {
      console.error('Erro ao carregar dados:', err);
      toast.error('Erro ao carregar dados do Shopify');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    toast.info('Sincronizando produtos...');
    await loadInitialData();
    toast.success('Produtos sincronizados!');
  };

  const filteredProducts = products.filter(product =>
    product.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.vendor.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.product_type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalInventory = products.reduce((acc, product) => {
    return acc + product.variants.reduce((vAcc, variant) => vAcc + (variant.inventory_quantity || 0), 0);
  }, 0);

  const lowStockProducts = products.filter(product =>
    product.variants.some(v => v.inventory_quantity !== undefined && v.inventory_quantity <= 5)
  ).length;

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              Erro na Conexão
            </CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={loadInitialData} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Tentar Novamente
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Store className="h-8 w-8 text-primary" />
            Integração Shopify
          </h1>
          <p className="text-muted-foreground mt-1">
            Visualize produtos e estoque da sua loja (somente leitura)
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleRefresh} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Sincronizar
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total de Produtos</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-2xl font-bold">{totalProducts}</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Itens em Estoque</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-2xl font-bold text-primary">{totalInventory.toLocaleString('pt-BR')}</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Estoque Baixo</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-2xl font-bold text-destructive">{lowStockProducts}</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Localizações</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-2xl font-bold">{locations.length}</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Location Selector */}
      {locations.length > 1 && (
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-4">
              <Label>Localização:</Label>
              <Select
                value={selectedLocation?.toString() || ''}
                onValueChange={(val) => setSelectedLocation(parseInt(val, 10))}
              >
                <SelectTrigger className="w-[300px]">
                  <SelectValue placeholder="Selecione uma localização" />
                </SelectTrigger>
                <SelectContent>
                  {locations.map((loc) => (
                    <SelectItem key={loc.id} value={loc.id.toString()}>
                      {loc.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Products Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Produtos ({filteredProducts.length})
              </CardTitle>
              <CardDescription>Lista de produtos sincronizados da sua loja Shopify</CardDescription>
            </div>
            <div className="relative w-full md:w-[300px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar produto..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : (
            <div className="rounded-md border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[60px]">Imagem</TableHead>
                    <TableHead>Produto</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Fornecedor</TableHead>
                    <TableHead className="text-center">Variantes</TableHead>
                    <TableHead className="text-right">Estoque Total</TableHead>
                    <TableHead className="text-right">Preço</TableHead>
                    <TableHead className="w-[80px]">Detalhes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProducts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                        Nenhum produto encontrado
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredProducts.map((product) => {
                      const totalStock = product.variants.reduce((acc, v) => acc + (v.inventory_quantity || 0), 0);
                      const mainVariant = product.variants[0];
                      const hasLowStock = product.variants.some(v => v.inventory_quantity !== undefined && v.inventory_quantity <= 5);

                      return (
                        <TableRow key={product.id}>
                          <TableCell>
                            {product.images[0]?.src ? (
                              <img
                                src={product.images[0].src}
                                alt={product.title}
                                className="w-12 h-12 object-cover rounded"
                              />
                            ) : (
                              <div className="w-12 h-12 bg-muted rounded flex items-center justify-center">
                                <ImageOff className="h-5 w-5 text-muted-foreground" />
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="font-medium line-clamp-2">{product.title}</div>
                            <div className="text-xs text-muted-foreground">{product.handle}</div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{product.product_type || 'Sem tipo'}</Badge>
                          </TableCell>
                          <TableCell className="text-sm">{product.vendor}</TableCell>
                          <TableCell className="text-center">
                            <Badge variant="secondary">{product.variants.length}</Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              {hasLowStock && (
                                <AlertCircle className="h-4 w-4 text-destructive" />
                              )}
                              <span className={hasLowStock ? 'text-destructive font-medium' : ''}>
                                {totalStock}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {mainVariant?.price ? `R$ ${parseFloat(mainVariant.price).toFixed(2)}` : '-'}
                          </TableCell>
                          <TableCell>
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-2xl">
                                <DialogHeader>
                                  <DialogTitle>{product.title}</DialogTitle>
                                  <DialogDescription>Detalhes das variantes (somente visualização)</DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4 max-h-[400px] overflow-y-auto">
                                  {product.variants.map((variant) => (
                                    <div
                                      key={variant.id}
                                      className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                                    >
                                      <div>
                                        <div className="font-medium">{variant.title}</div>
                                        <div className="text-sm text-muted-foreground">
                                          SKU: {variant.sku || 'N/A'} • Preço: R$ {parseFloat(variant.price).toFixed(2)}
                                        </div>
                                      </div>
                                      <Badge
                                        variant={variant.inventory_quantity <= 5 ? 'destructive' : 'secondary'}
                                      >
                                        {variant.inventory_quantity} em estoque
                                      </Badge>
                                    </div>
                                  ))}
                                </div>
                              </DialogContent>
                            </Dialog>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
