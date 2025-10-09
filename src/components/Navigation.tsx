import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  Building2, 
  Users, 
  CreditCard, 
  ShoppingCart, 
  TrendingUp, 
  FileText,
  Package,
  Menu
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { supabase } from '@/integrations/supabase/client';

const navigationItems = [
  {
    title: 'Dashboard',
    href: '/',
    icon: TrendingUp,
  },
  {
    title: 'Cadastros',
    icon: Users,
    submenu: [
      { title: 'Pessoas Físicas', href: '/cadastros/pessoas-fisicas' },
      { title: 'Pessoas Jurídicas', href: '/cadastros/pessoas-juridicas' },
      { title: 'Filiais', href: '/cadastros/filiais' },
      { title: 'Cargos', href: '/cadastros/cargos' },
      { title: 'Marcas', href: '/cadastros/marcas' },
    ],
  },
  {
    title: 'Financeiro',
    icon: CreditCard,
    submenu: [
      { title: 'Contas a Pagar', href: '/financeiro/contas-pagar' },
      { title: 'Contas Bancárias', href: '/financeiro/contas-bancarias' },
      { title: 'Recorrências', href: '/financeiro/contas-recorrentes' },
      { title: 'Fechamento de Caixa', href: '/financeiro/fechamento-caixa' },
      { title: 'Categorias', href: '/financeiro/categorias' },
    ],
  },
  {
    title: 'Compras',
    icon: ShoppingCart,
    submenu: [
      { title: 'Pedidos', href: '/compras/pedidos' },
      { title: 'Importar XML', href: '/compras/importar-xml' },
    ],
  },
  {
    title: 'Vendas',
    icon: TrendingUp,
    submenu: [
      { title: 'Registrar Vendas', href: '/vendas/registrar' },
      { title: 'Vendas Mensais', href: '/vendas/vendas-diarias' },
      { title: 'Metas', href: '/vendas/metas' },
      { title: 'Relatórios', href: '/vendas/relatorios' },
      { title: 'Simulador de Metas', href: '/vendas/simulador-metas' },
      { title: 'Dashboard Comparativo', href: '/vendas/dashboard-comparativo' },
    ],
  },
  {
    title: 'Produtos',
    href: '/produtos',
    icon: Package,
  },
  {
    title: 'Relatórios',
    href: '/relatorios',
    icon: FileText,
  },
];

export function Navigation() {
  const location = useLocation();
  const [openSubmenu, setOpenSubmenu] = useState<string | null>(null);
  const [metrics, setMetrics] = useState({ vencidas_qtd: 0 });

  // Buscar quantidade de contas vencidas para badge
  useState(() => {
    const fetchVencidas = async () => {
      try {
        const { count } = await supabase
          .from('contas_pagar_parcelas')
          .select('*', { count: 'exact', head: true })
          .eq('pago', false)
          .lt('vencimento', new Date().toISOString().split('T')[0]);
        
        if (count) setMetrics({ vencidas_qtd: count });
      } catch (error) {
        console.error('Erro ao buscar vencidas:', error);
      }
    };
    fetchVencidas();
  });

  const isActive = (href: string) => {
    return location.pathname === href || location.pathname.startsWith(href + '/');
  };

  const NavigationContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo/Brand */}
      <div className="px-6 py-6 border-b">
        <Link to="/" className="flex items-center space-x-2">
          <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-primary to-purple flex items-center justify-center">
            <Building2 className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold tracking-tight">FinControl</h2>
            <p className="text-xs text-muted-foreground">Sistema Financeiro</p>
          </div>
        </Link>
      </div>

      {/* Navigation Items */}
      <div className="flex-1 px-3 py-4 overflow-y-auto">
        <div className="space-y-1">
          {navigationItems.map((item) => (
            <div key={item.title}>
              {item.submenu ? (
                <div>
                  <Button
                    variant="ghost"
                    className="w-full justify-start hover:bg-primary/10 transition-all"
                    onClick={() => setOpenSubmenu(openSubmenu === item.title ? null : item.title)}
                  >
                    <item.icon className="mr-3 h-4 w-4" />
                    <span className="flex-1 text-left">{item.title}</span>
                    {item.title === 'Financeiro' && (
                      <span className="ml-auto flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-xs text-white">
                        {metrics.vencidas_qtd || 0}
                      </span>
                    )}
                  </Button>
                  {openSubmenu === item.title && (
                    <div className="ml-6 mt-1 space-y-0.5 border-l-2 border-muted pl-3">
                      {item.submenu.map((subItem) => (
                        <Link
                          key={subItem.href}
                          to={subItem.href}
                          className={`block rounded-md px-3 py-2 text-sm transition-all ${
                            isActive(subItem.href)
                              ? 'bg-primary/10 text-primary font-medium border-l-2 border-primary -ml-[2px] pl-[10px]'
                              : 'hover:bg-muted/50 text-muted-foreground hover:text-foreground'
                          }`}
                        >
                          {subItem.title}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <Link
                  to={item.href!}
                  className={`flex items-center rounded-md px-3 py-2.5 text-sm transition-all ${
                    isActive(item.href!)
                      ? 'bg-primary/10 text-primary font-medium'
                      : 'hover:bg-muted/50 text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <item.icon className="mr-3 h-4 w-4" />
                  {item.title}
                </Link>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="border-t p-4">
        <div className="flex items-center space-x-3 px-2">
          <div className="h-9 w-9 rounded-full bg-gradient-to-br from-primary to-purple flex items-center justify-center text-white font-semibold text-sm">
            U
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">Usuário</p>
            <p className="text-xs text-muted-foreground">Administrador</p>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Navigation */}
      <div className="hidden md:flex h-full w-64 flex-col border-r bg-background">
        <NavigationContent />
      </div>

      {/* Mobile Navigation */}
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="outline" size="icon" className="md:hidden">
            <Menu className="h-4 w-4" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-64 p-0">
          <NavigationContent />
        </SheetContent>
      </Sheet>
    </>
  );
}
