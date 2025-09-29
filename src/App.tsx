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
import { ContasPagar } from "@/pages/financeiro/ContasPagar";
import { ContasBancarias } from "@/pages/financeiro/ContasBancarias";
import { FechamentoCaixa } from "@/pages/financeiro/FechamentoCaixa";
import { ContasRecorrentes } from "@/pages/financeiro/ContasRecorrentes";
import { VendasDiarias } from "@/pages/vendas/VendasDiarias";
import { Metas } from "@/pages/vendas/Metas";
import { RelatoriosVendas } from "@/pages/vendas/RelatoriosVendas";
import { Pedidos } from "@/pages/compras/Pedidos";
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
            <Route path="cadastros/pessoas-juridicas" element={<PessoasJuridicas />} />
            <Route path="cadastros/filiais" element={<Filiais />} />
            <Route path="cadastros/cargos" element={<Cargos />} />
            <Route path="cadastros/marcas" element={<Marcas />} />
            <Route path="financeiro/contas-pagar" element={<ContasPagar />} />
            <Route path="financeiro/contas-bancarias" element={<ContasBancarias />} />
            <Route path="financeiro/fechamento-caixa" element={<FechamentoCaixa />} />
            <Route path="financeiro/contas-recorrentes" element={<ContasRecorrentes />} />
            <Route path="vendas/vendas-diarias" element={<VendasDiarias />} />
            <Route path="vendas/metas" element={<Metas />} />
            <Route path="vendas/relatorios" element={<RelatoriosVendas />} />
            <Route path="compras/pedidos" element={<Pedidos />} />
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
