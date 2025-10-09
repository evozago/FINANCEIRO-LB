import { Outlet, useLocation } from 'react-router-dom';
import { Navigation } from './Navigation';
import { Bell, Search, User } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';

export function Layout() {
  const location = useLocation();
  
  const getBreadcrumbs = () => {
    const paths = location.pathname.split('/').filter(Boolean);
    if (paths.length === 0) return 'Dashboard';
    
    const breadcrumbMap: { [key: string]: string } = {
      'cadastros': 'Cadastros',
      'compras': 'Compras',
      'financeiro': 'Financeiro',
      'produtos': 'Produtos',
      'vendas': 'Vendas',
      'relatorios': 'Relatórios',
      'filiais': 'Filiais',
      'cargos': 'Cargos',
      'marcas': 'Marcas',
      'pessoas-fisicas': 'Pessoas Físicas',
      'pessoas-juridicas': 'Pessoas Jurídicas',
      'importar-xml': 'Importar XML',
      'pedidos': 'Pedidos',
      'categorias': 'Categorias',
      'contas-bancarias': 'Contas Bancárias',
      'contas-pagar': 'Contas a Pagar',
      'contas-recorrentes': 'Contas Recorrentes',
      'fechamento-caixa': 'Fechamento de Caixa',
      'metas': 'Metas',
      'vendas-diarias': 'Vendas Diárias',
    };
    
    return paths.map(p => breadcrumbMap[p] || p).join(' / ');
  };

  return (
    <div className="flex h-screen bg-background">
      <Navigation />
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header Global */}
        <header className="h-16 border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
          <div className="h-full px-6 flex items-center justify-between gap-4">
            {/* Breadcrumbs */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-muted-foreground truncate">
                {getBreadcrumbs()}
              </p>
            </div>

            {/* Search Bar */}
            <div className="hidden md:flex items-center flex-1 max-w-md">
              <div className="relative w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Buscar..." 
                  className="pl-9 bg-background/50"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="h-5 w-5" />
                <span className="absolute top-1 right-1 h-2 w-2 bg-destructive rounded-full"></span>
              </Button>
              <Button variant="ghost" size="icon">
                <User className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-auto">
          <div className="container mx-auto p-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
