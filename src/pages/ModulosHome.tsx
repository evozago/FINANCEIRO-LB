import { Link } from 'react-router-dom';
import {
  Package,
  Users,
  ShoppingBag,
  CreditCard,
  TrendingUp,
  ShoppingCart,
  Building2,
  FileText,
  Brain,
  ArrowRight,
  Tags,
  FileSpreadsheet,
  LogOut,
  Settings,
  Printer,
  Truck
} from 'lucide-react';
import { EntradaNfeCard } from '@/components/dashboard/EntradaNfeCard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';

interface ModuleCardProps {
  title: string;
  description: string;
  icon: React.ElementType;
  href: string;
  color: string;
  badge?: string;
  moduloId: string;
}

const ModuleCard = ({ title, description, icon: Icon, href, color, badge }: Omit<ModuleCardProps, 'moduloId'>) => (
  <Link to={href} className="group">
    <Card className="h-full transition-all duration-300 hover:shadow-xl hover:-translate-y-1 border-2 hover:border-primary/30">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className={`p-3 rounded-xl ${color} shadow-lg`}>
            <Icon className="h-6 w-6 text-white" />
          </div>
          {badge && (
            <span className="px-2 py-1 text-xs font-medium bg-amber-100 text-amber-800 rounded-full dark:bg-amber-900/30 dark:text-amber-400">
              {badge}
            </span>
          )}
        </div>
        <CardTitle className="text-lg mt-4 group-hover:text-primary transition-colors">
          {title}
        </CardTitle>
        <CardDescription className="text-sm">
          {description}
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex items-center text-sm text-primary font-medium opacity-0 group-hover:opacity-100 transition-opacity">
          Acessar módulo
          <ArrowRight className="ml-1 h-4 w-4" />
        </div>
      </CardContent>
    </Card>
  </Link>
);

const modules: ModuleCardProps[] = [
  {
    title: 'Financeiro',
    description: 'Contas a pagar, bancos, fechamento de caixa e categorias',
    icon: CreditCard,
    href: '/financeiro/contas-pagar',
    color: 'bg-gradient-to-br from-emerald-500 to-emerald-600',
    moduloId: 'financeiro'
  },
  {
    title: 'Vendas',
    description: 'Registrar vendas, metas, relatórios e dashboard comparativo',
    icon: TrendingUp,
    href: '/vendas/registrar',
    color: 'bg-gradient-to-br from-blue-500 to-blue-600',
    moduloId: 'vendas'
  },
  {
    title: 'Compras',
    description: 'Pedidos de compra e importação de XML de notas fiscais',
    icon: ShoppingCart,
    href: '/compras/pedidos',
    color: 'bg-gradient-to-br from-orange-500 to-orange-600',
    moduloId: 'compras'
  },
  {
    title: 'Classificador de Produtos',
    description: 'Importe planilhas e classifique produtos automaticamente',
    icon: Tags,
    href: '/produtos/classificador',
    color: 'bg-gradient-to-br from-fuchsia-500 to-fuchsia-600',
    moduloId: 'produtos'
  },
  {
    title: 'Estoque',
    description: 'Controle de produtos, entrada/saída e alertas de reposição',
    icon: Package,
    href: '/estoque',
    color: 'bg-gradient-to-br from-purple-500 to-purple-600',
    badge: 'Em breve',
    moduloId: 'estoque'
  },
  {
    title: 'CRM / Clientes',
    description: 'Cadastro de clientes, histórico de compras e fidelidade',
    icon: Users,
    href: '/crm',
    color: 'bg-gradient-to-br from-pink-500 to-pink-600',
    badge: 'Em breve',
    moduloId: 'crm'
  },
  {
    title: 'E-commerce / Shopify',
    description: 'Produtos e estoque sincronizados com sua loja Shopify',
    icon: ShoppingBag,
    href: '/ecommerce/shopify',
    color: 'bg-gradient-to-br from-indigo-500 to-indigo-600',
    moduloId: 'ecommerce'
  },
  {
    title: 'Envios',
    description: 'Coletas, etiquetas e rastreamento via Total Express',
    icon: Truck,
    href: '/ecommerce/envios',
    color: 'bg-gradient-to-br from-amber-500 to-amber-600',
    moduloId: 'ecommerce'
  },
  {
    title: 'Cadastros',
    description: 'Pessoas físicas, jurídicas, filiais, cargos e marcas',
    icon: Building2,
    href: '/cadastros/pessoas-fisicas',
    color: 'bg-gradient-to-br from-slate-500 to-slate-600',
    moduloId: 'cadastros'
  },
  {
    title: 'Relatórios',
    description: 'Relatórios gerais e exportação de dados',
    icon: FileText,
    href: '/relatorios',
    color: 'bg-gradient-to-br from-cyan-500 to-cyan-600',
    moduloId: 'relatorios'
  },
  {
    title: 'Unificador de Planilhas',
    description: 'Una múltiplas planilhas XLSX/CSV em um único arquivo',
    icon: FileSpreadsheet,
    href: '/ferramentas/unificador-planilhas',
    color: 'bg-gradient-to-br from-teal-500 to-teal-600',
    moduloId: 'ferramentas'
  },
  {
    title: 'Cérebro IA',
    description: 'Inteligência artificial para análises e automações',
    icon: Brain,
    href: '/ia/cerebro',
    color: 'bg-gradient-to-br from-violet-500 to-violet-600',
    moduloId: 'admin'
  },
  {
    title: 'Impressão 3D',
    description: 'Custos, precificação marketplace e controle de produção',
    icon: Printer,
    href: '/impressao3d',
    color: 'bg-gradient-to-br from-rose-500 to-rose-600',
    moduloId: 'impressao3d'
  }
];

export default function ModulosHome() {
  const { profile, role, hasModuleAccess, signOut } = useAuth();

  const filteredModules = modules.filter(m => hasModuleAccess(m.moduloId));

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div />
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">
              Olá, <strong>{profile?.nome || 'Usuário'}</strong>
              {role && <span className="ml-1 text-xs">({role === 'admin' ? 'Admin' : 'Operador'})</span>}
            </span>
            {role === 'admin' && (
              <Link to="/admin/usuarios">
                <Button variant="outline" size="sm">
                  <Settings className="h-4 w-4 mr-1" /> Usuários
                </Button>
              </Link>
            )}
            <Button variant="ghost" size="sm" onClick={signOut}>
              <LogOut className="h-4 w-4 mr-1" /> Sair
            </Button>
          </div>
        </div>

        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center p-3 bg-gradient-to-br from-primary to-primary/80 rounded-2xl shadow-lg mb-4">
            <Building2 className="h-10 w-10 text-white" />
          </div>
          <h1 className="text-4xl font-bold tracking-tight mb-2">
            Ecossistema da Loja
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Gerencie todos os aspectos do seu negócio em um só lugar
          </p>
        </div>

        {/* Entrada de Notas */}
        <div className="max-w-md mx-auto mb-10">
          <EntradaNfeCard />
        </div>

        {/* Modules Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {filteredModules.map((module) => (
            <ModuleCard key={module.title} {...module} />
          ))}
        </div>

        <div className="mt-16 text-center">
          <p className="text-sm text-muted-foreground">
            💡 Clique em um módulo para começar a usar
          </p>
        </div>
      </div>
    </div>
  );
}
