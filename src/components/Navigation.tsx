import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  Building2, 
  Users, 
  CreditCard, 
  ShoppingCart, 
  TrendingUp, 
  FileText,
  Menu,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';

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
      { title: 'Vendas Diárias', href: '/vendas/vendas-diarias' },
      { title: 'Metas', href: '/vendas/metas' },
      { title: 'Relatórios', href: '/vendas/relatorios' },
      { title: 'Simulador de Metas', href: '/vendas/simulador-metas' },
    ],
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

  const isActive = (href: string) => {
    return location.pathname === href || location.pathname.startsWith(href + '/');
  };

  const NavigationContent = () => (
    <div className="flex flex-col space-y-2">
      <div className="px-3 py-2">
        <h2 className="mb-2 px-4 text-lg font-semibold tracking-tight">
          Sistema Financeiro
        </h2>
      </div>
      <div className="px-3">
        {navigationItems.map((item) => (
          <div key={item.title}>
            {item.submenu ? (
              <div>
                <Button
                  variant="ghost"
                  className="w-full justify-start"
                  onClick={() => setOpenSubmenu(openSubmenu === item.title ? null : item.title)}
                >
                  <item.icon className="mr-2 h-4 w-4" />
                  {item.title}
                </Button>
                {openSubmenu === item.title && (
                  <div className="ml-6 mt-2 space-y-1">
                    {item.submenu.map((subItem) => (
                      <Link
                        key={subItem.href}
                        to={subItem.href}
                        className={`block rounded-md px-3 py-2 text-sm transition-colors hover:bg-accent hover:text-accent-foreground ${
                          isActive(subItem.href) ? 'bg-accent text-accent-foreground' : ''
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
                className={`flex items-center rounded-md px-3 py-2 text-sm transition-colors hover:bg-accent hover:text-accent-foreground ${
                  isActive(item.href!) ? 'bg-accent text-accent-foreground' : ''
                }`}
              >
                <item.icon className="mr-2 h-4 w-4" />
                {item.title}
              </Link>
            )}
          </div>
        ))}
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
