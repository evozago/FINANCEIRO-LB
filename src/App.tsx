import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { Dashboard } from "@/pages/Dashboard";
import { PessoasFisicas } from "@/pages/cadastros/PessoasFisicas";
import { PessoasJuridicas } from "@/pages/cadastros/PessoasJuridicas";
import { Filiais } from "@/pages/cadastros/Filiais";
import { Cargos } from "@/pages/cadastros/Cargos";
import { Marcas } from "@/pages/cadastros/Marcas";
import { ContasPagarSimple as ContasPagar } from "@/pages/financeiro/ContasPagarSimple";
import NovaContaPagar from "@/pages/financeiro/NovaContaPagar";
import { ContaDetalhes } from "@/pages/financeiro/ContaDetalhes";
import { FornecedorDetalhes } from "@/pages/financeiro/FornecedorDetalhes";
import { ContasBancarias } from "@/pages/financeiro/ContasBancarias";
import { FechamentoCaixa } from "@/pages/financeiro/FechamentoCaixa";
import { ContasRecorrentes } from "@/pages/financeiro/ContasRecorrentes";
import { Categorias } from "@/pages/financeiro/Categorias";
import { VendasMensaisPorVendedora } from "@/pages/vendas/VendasMensaisPorVendedora";
import { Metas } from "@/pages/vendas/Metas";
import RegistrarVendas from "@/pages/vendas/RegistrarVendas";
import { PessoaFisicaDetalhes } from "@/pages/cadastros/PessoaFisicaDetalhes";
import { PessoaJuridicaDetalhes } from "@/pages/cadastros/PessoaJuridicaDetalhes";
import { MarcaDetalhes } from "@/pages/cadastros/MarcaDetalhes";
import { RelatoriosVendas } from "@/pages/vendas/RelatoriosVendas";
import { SimuladorMetas } from "@/pages/vendas/SimuladorMetas";
import { DashboardComparativo } from "@/pages/vendas/DashboardComparativo";
import { Pedidos } from "@/pages/compras/Pedidos";
import ImportarXML from "@/pages/compras/ImportarXMLNew";
// import { Produtos } from "@/pages/produtos/Produtos";
import { Relatorios } from "@/pages/Relatorios";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="cadastros/pessoas-fisicas" element={<PessoasFisicas />} />
            <Route path="cadastros/pessoas-fisicas/:id" element={<PessoaFisicaDetalhes />} />
            <Route path="cadastros/pessoas-juridicas" element={<PessoasJuridicas />} />
            <Route path="cadastros/pessoas-juridicas/:id" element={<PessoaJuridicaDetalhes />} />
            <Route path="cadastros/pessoa-juridica/:id" element={<PessoaJuridicaDetalhes />} />
            <Route path="cadastros/filiais" element={<Filiais />} />
            <Route path="cadastros/cargos" element={<Cargos />} />
            <Route path="cadastros/marcas" element={<Marcas />} />
            <Route path="cadastros/marcas/:id" element={<MarcaDetalhes />} />
            <Route path="financeiro/contas-pagar" element={<ContasPagar />} />
            <Route path="financeiro/contas-pagar/nova" element={<NovaContaPagar />} />
            <Route path="financeiro/conta/:id" element={<ContaDetalhes />} />
            {/* Rota fornecedor redireciona para pessoa jurídica */}
            <Route path="financeiro/fornecedor/:id" element={<PessoaJuridicaDetalhes />} />
            <Route path="financeiro/contas-bancarias" element={<ContasBancarias />} />
            <Route path="financeiro/fechamento-caixa" element={<FechamentoCaixa />} />
            <Route path="financeiro/contas-recorrentes" element={<ContasRecorrentes />} />
            <Route path="financeiro/categorias" element={<Categorias />} />
            <Route path="vendas/vendas-diarias" element={<VendasMensaisPorVendedora />} />
            <Route path="vendas/registrar" element={<RegistrarVendas />} />
            <Route path="vendas/metas" element={<Metas />} />
            <Route path="vendas/relatorios" element={<RelatoriosVendas />} />
            <Route path="vendas/simulador-metas" element={<SimuladorMetas />} />
            <Route path="vendas/dashboard-comparativo" element={<DashboardComparativo />} />
            <Route path="compras/pedidos" element={<Pedidos />} />
            <Route path="compras/importar-xml" element={<ImportarXML />} />
            {/* <Route path="produtos" element={<Produtos />} /> */}
            <Route path="relatorios" element={<Relatorios />} />
          </Route>
          <Route path="/old" element={<Index />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
