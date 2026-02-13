import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { Layout } from "@/components/Layout";
import ModulosHome from "@/pages/ModulosHome";
import { Dashboard } from "@/pages/Dashboard";
import { PessoasFisicas } from "@/pages/cadastros/PessoasFisicas";
import { PessoasJuridicas } from "@/pages/cadastros/PessoasJuridicas";
import { Filiais } from "@/pages/cadastros/Filiais";
import { Cargos } from "@/pages/cadastros/Cargos";
import { Marcas } from "@/pages/cadastros/Marcas";
import { ContasPagarSimple as ContasPagar } from "@/pages/financeiro/ContasPagarSimple";
import NovaContaPagar from "@/pages/financeiro/NovaContaPagar";
import ContaDetalhes from "@/pages/financeiro/ContaDetalhes";
import { ContasBancarias } from "@/pages/financeiro/ContasBancarias";
import { FechamentoCaixa } from "@/pages/financeiro/FechamentoCaixa";
import { ContasRecorrentes } from "@/pages/financeiro/ContasRecorrentes";
import Categorias from "@/pages/financeiro/Categorias";
import { VendasMensaisPorVendedora } from "@/pages/vendas/VendasMensaisPorVendedora";
import { PessoaFisicaDetalhes } from "@/pages/cadastros/PessoaFisicaDetalhes";
import PessoaJuridicaDetalhes from "@/pages/cadastros/PessoaJuridicaDetalhes";
import { MarcaDetalhes } from "@/pages/cadastros/MarcaDetalhes";
import { SimuladorMetas } from "@/pages/vendas/SimuladorMetas";
import { Pedidos } from "@/pages/compras/Pedidos";
import PedidoDetalhes from "@/pages/compras/PedidoDetalhes";
import { Relatorios } from "@/pages/Relatorios";
import TesteGemini from "./pages/TesteGemini";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import CategoriasProdutos from "./pages/produtos/CategoriasProdutos";
import ClassificadorProdutos from "./pages/produtos/ClassificadorProdutos";
import RegrasClassificacao from "./pages/produtos/RegrasClassificacao";
import DashboardProdutos from "./pages/produtos/DashboardProdutos";
import ListaProdutos from "./pages/produtos/ListaProdutos";
import GeradorReferencias from "./pages/produtos/GeradorReferencias";
import ShopifyIntegration from "./pages/ecommerce/ShopifyIntegration";
import GerenciarEnvios from "./pages/ecommerce/GerenciarEnvios";
import UnificadorPlanilhas from "./pages/ferramentas/UnificadorPlanilhas";
import Login from "./pages/Login";
import GerenciarUsuarios from "./pages/admin/GerenciarUsuarios";
import Impressao3dHome from "./pages/impressao3d/Impressao3dHome";
import Produtos3d from "./pages/impressao3d/Produtos3d";
import Materiais3d from "./pages/impressao3d/Materiais3d";
import Impressoras3d from "./pages/impressao3d/Impressoras3d";
import Marketplaces3d from "./pages/impressao3d/Marketplaces3d";
import Estoque3d from "./pages/impressao3d/Estoque3d";
import Vendas3d from "./pages/impressao3d/Vendas3d";
import Parametros3d from "./pages/impressao3d/Parametros3d";
import { Loader2 } from "lucide-react";

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

const AppRoutes = () => (
  <Routes>
    <Route path="/login" element={<Login />} />
    
    {/* Protected routes */}
    <Route path="/" element={<ProtectedRoute><ModulosHome /></ProtectedRoute>} />

    <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
      <Route path="dashboard" element={<Dashboard />} />

      {/* Cadastros */}
      <Route path="cadastros/pessoas-fisicas" element={<PessoasFisicas />} />
      <Route path="cadastros/pessoas-fisicas/:id" element={<PessoaFisicaDetalhes />} />
      <Route path="cadastros/pessoas-juridicas" element={<PessoasJuridicas />} />
      <Route path="cadastros/filiais" element={<Filiais />} />
      <Route path="cadastros/cargos" element={<Cargos />} />
      <Route path="cadastros/marcas" element={<Marcas />} />
      <Route path="cadastros/pessoa-juridica/:id" element={<PessoaJuridicaDetalhes />} />
      <Route path="cadastros/pessoas-juridicas/:id" element={<Navigate to="/cadastros/pessoa-juridica/:id" replace />} />
      <Route path="cadastros/marca/:id" element={<MarcaDetalhes />} />

      {/* Financeiro */}
      <Route path="financeiro/contas-pagar" element={<ContasPagar />} />
      <Route path="financeiro/contas-pagar/nova" element={<NovaContaPagar />} />
      <Route path="financeiro/conta/:id" element={<ContaDetalhes />} />
      <Route path="financeiro/fornecedor/:id" element={<PessoaJuridicaDetalhes />} />
      <Route path="financeiro/contas-bancarias" element={<ContasBancarias />} />
      <Route path="financeiro/fechamento-caixa" element={<FechamentoCaixa />} />
      <Route path="financeiro/contas-recorrentes" element={<ContasRecorrentes />} />
      <Route path="financeiro/categorias" element={<Categorias />} />

      {/* Vendas */}
      <Route path="vendas/vendas-diarias" element={<VendasMensaisPorVendedora />} />
      <Route path="vendas/simulador-metas" element={<SimuladorMetas />} />

      {/* Compras */}
      <Route path="compras/pedidos" element={<Pedidos />} />
      <Route path="compras/pedido/:id" element={<PedidoDetalhes />} />

      {/* Produtos */}
      <Route path="produtos/categorias" element={<CategoriasProdutos />} />
      <Route path="produtos/classificador" element={<ClassificadorProdutos />} />
      <Route path="produtos/regras" element={<RegrasClassificacao />} />
      <Route path="produtos/dashboard" element={<DashboardProdutos />} />
      <Route path="produtos/referencias" element={<GeradorReferencias />} />
      <Route path="produtos/lista" element={<ListaProdutos />} />

      {/* Módulos futuros */}
      <Route path="estoque" element={<PlaceholderModule title="Estoque" />} />
      <Route path="crm" element={<PlaceholderModule title="CRM / Clientes" />} />

      {/* E-commerce */}
      <Route path="ecommerce/shopify" element={<ShopifyIntegration />} />
      <Route path="ecommerce/envios" element={<GerenciarEnvios />} />
      <Route path="ecommerce" element={<PlaceholderModule title="E-commerce" />} />

      {/* Ferramentas */}
      <Route path="ferramentas/unificador-planilhas" element={<UnificadorPlanilhas />} />

      {/* Relatórios */}
      <Route path="relatorios" element={<Relatorios />} />

      {/* Impressão 3D */}
      <Route path="impressao3d" element={<Impressao3dHome />} />
      <Route path="impressao3d/produtos" element={<Produtos3d />} />
      <Route path="impressao3d/materiais" element={<Materiais3d />} />
      <Route path="impressao3d/impressoras" element={<Impressoras3d />} />
      <Route path="impressao3d/marketplaces" element={<Marketplaces3d />} />
      <Route path="impressao3d/estoque" element={<Estoque3d />} />
      <Route path="impressao3d/vendas" element={<Vendas3d />} />
      <Route path="impressao3d/parametros" element={<Parametros3d />} />

      {/* Admin */}
      <Route path="admin/usuarios" element={<GerenciarUsuarios />} />

      <Route path="teste-gemini" element={<TesteGemini />} />
    </Route>

    <Route path="/old" element={<Index />} />
    <Route path="*" element={<NotFound />} />
  </Routes>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

function PlaceholderModule({ title }: { title: string }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
      <div className="p-4 bg-amber-100 rounded-full mb-4">
        <span className="text-4xl">🚧</span>
      </div>
      <h1 className="text-2xl font-bold mb-2">{title}</h1>
      <p className="text-muted-foreground">Este módulo está em desenvolvimento</p>
    </div>
  );
}

export default App;
