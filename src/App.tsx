import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
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
import { Relatorios } from "@/pages/Relatorios";
import TesteGemini from "./pages/TesteGemini";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import CategoriasProdutos from "./pages/produtos/CategoriasProdutos";
import ClassificadorProdutos from "./pages/produtos/ClassificadorProdutos";
import RegrasClassificacao from "./pages/produtos/RegrasClassificacao";
import DashboardProdutos from "./pages/produtos/DashboardProdutos";
import ListaProdutos from "./pages/produtos/ListaProdutos";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          {/* Home - Módulos */}
          <Route path="/" element={<ModulosHome />} />

          {/* Layout com sidebar para páginas internas */}
          <Route element={<Layout />}>
            <Route path="dashboard" element={<Dashboard />} />

            {/* Cadastros */}
            <Route path="cadastros/pessoas-fisicas" element={<PessoasFisicas />} />
            <Route path="cadastros/pessoas-fisicas/:id" element={<PessoaFisicaDetalhes />} />
            <Route path="cadastros/pessoas-juridicas" element={<PessoasJuridicas />} />
            <Route path="cadastros/filiais" element={<Filiais />} />
            <Route path="cadastros/cargos" element={<Cargos />} />
            <Route path="cadastros/marcas" element={<Marcas />} />

            {/* Rota CANÔNICA (singular) para detalhe */}
            <Route path="cadastros/pessoa-juridica/:id" element={<PessoaJuridicaDetalhes />} />

            {/* Compatibilidade: se alguém navegar para o PLURAL com :id, redireciona para o singular */}
            <Route
              path="cadastros/pessoas-juridicas/:id"
              element={<Navigate to="/cadastros/pessoa-juridica/:id" replace />}
            />

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

            {/* Produtos */}
            <Route path="produtos/categorias" element={<CategoriasProdutos />} />
            <Route path="produtos/classificador" element={<ClassificadorProdutos />} />
            <Route path="produtos/regras" element={<RegrasClassificacao />} />
            <Route path="produtos/dashboard" element={<DashboardProdutos />} />
            <Route path="produtos/lista" element={<ListaProdutos />} />

            {/* Módulos futuros - placeholders */}
            <Route path="estoque" element={<PlaceholderModule title="Estoque" />} />
            <Route path="crm" element={<PlaceholderModule title="CRM / Clientes" />} />
            <Route path="ecommerce" element={<PlaceholderModule title="E-commerce" />} />

            {/* Relatórios */}
            <Route path="relatorios" element={<Relatorios />} />

            <Route path="teste-gemini" element={<TesteGemini />} />
          </Route>

          {/* Página antiga / teste */}
          <Route path="/old" element={<Index />} />

          {/* Catch-all */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

// Placeholder para módulos futuros
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
