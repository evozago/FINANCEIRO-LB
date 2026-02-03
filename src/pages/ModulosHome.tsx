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
  ArrowRight
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface ModuleCardProps {
  title: string;
  description: string;
  icon: React.ElementType;
  href: string;
  color: string;
  badge?: string;
}

const ModuleCard = ({ title, description, icon: Icon, href, color, badge }: ModuleCardProps) => (
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
    color: 'bg-gradient-to-br from-emerald-500 to-emerald-600'
  },
  {
    title: 'Vendas',
    description: 'Registrar vendas, metas, relatórios e dashboard comparativo',
    icon: TrendingUp,
    href: '/vendas/registrar',
    color: 'bg-gradient-to-br from-blue-500 to-blue-600'
  },
  {
    title: 'Compras',
    description: 'Pedidos de compra e importação de XML de notas fiscais',
    icon: ShoppingCart,
    href: '/compras/pedidos',
    color: 'bg-gradient-to-br from-orange-500 to-orange-600'
  },
  {
    title: 'Categorias de Produtos',
    description: 'Classifique produtos em categorias hierárquicas',
    icon: Package,
    href: '/produtos/categorias',
    color: 'bg-gradient-to-br from-fuchsia-500 to-fuchsia-600'
  },
  {
    title: 'Estoque',
    description: 'Controle de produtos, entrada/saída e alertas de reposição',
    icon: Package,
    href: '/estoque',
    color: 'bg-gradient-to-br from-purple-500 to-purple-600',
    badge: 'Em breve'
  },
  {
    title: 'CRM / Clientes',
    description: 'Cadastro de clientes, histórico de compras e fidelidade',
    icon: Users,
    href: '/crm',
    color: 'bg-gradient-to-br from-pink-500 to-pink-600',
    badge: 'Em breve'
  },
  {
    title: 'E-commerce',
    description: 'Loja online integrada com estoque e vendas',
    icon: ShoppingBag,
    href: '/ecommerce',
    color: 'bg-gradient-to-br from-indigo-500 to-indigo-600',
    badge: 'Em breve'
  },
  {
    title: 'Cadastros',
    description: 'Pessoas físicas, jurídicas, filiais, cargos e marcas',
    icon: Building2,
    href: '/cadastros/pessoas-fisicas',
    color: 'bg-gradient-to-br from-slate-500 to-slate-600'
  },
  {
    title: 'Relatórios',
    description: 'Relatórios gerais e exportação de dados',
    icon: FileText,
    href: '/relatorios',
    color: 'bg-gradient-to-br from-cyan-500 to-cyan-600'
  },
  {
    title: 'Cérebro IA',
    description: 'Inteligência artificial para análises e automações',
    icon: Brain,
    href: '/ia/cerebro',
    color: 'bg-gradient-to-br from-violet-500 to-violet-600'
  }
];

export default function ModulosHome() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
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

        {/* Modules Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {modules.map((module) => (
            <ModuleCard key={module.title} {...module} />
          ))}
        </div>

        {/* Quick Stats Footer */}
        <div className="mt-16 text-center">
          <p className="text-sm text-muted-foreground">
            💡 Clique em um módulo para começar a usar
          </p>
        </div>
      </div>
    </div>
  );
}
