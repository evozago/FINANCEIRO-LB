// Type definitions for Supabase database views
// These are manual type definitions since views are not auto-generated in Supabase types

export interface VendasMensal {
  mes: number;
  ano: number;
  filial_id: number | null;
  filial_nome: string | null;
  total_vendas: number | null;
  valor_bruto_total: number | null;
  desconto_total: number | null;
  valor_liquido_total: number | null;
  qtd_itens_total: number | null;
  ticket_medio: number | null;
}

export interface VendedorasMensal {
  mes: number;
  ano: number;
  filial_id: number | null;
  filial_nome: string | null;
  vendedora_pf_id: number | null;
  vendedora_nome: string | null;
  total_vendas: number | null;
  valor_bruto_total: number | null;
  desconto_total: number | null;
  valor_liquido_total: number | null;
  qtd_itens_total: number | null;
  ticket_medio: number | null;
}

export interface VendedorasMensalComMeta {
  mes: number;
  ano: number;
  filial_id: number | null;
  filial_nome: string | null;
  vendedora_pf_id: number | null;
  vendedora_nome: string | null;
  total_vendas: number | null;
  valor_bruto_total: number | null;
  desconto_total: number | null;
  valor_liquido_total: number | null;
  qtd_itens_total: number | null;
  ticket_medio: number | null;
  meta_original: number | null;
  dias_no_mes: number | null;
  dias_ferias: number | null;
  dias_trabalhados: number | null;
  meta_ajustada: number | null;
  meta_ajustada_centavos?: number | null;
  percentual_meta: number | null;
}

export interface CrescimentoYoY {
  mes: number;
  ano: number;
  filial_id: number | null;
  filial_nome: string | null;
  valor_atual: number | null;
  valor_anterior: number | null;
  crescimento_percentual: number | null;
  crescimento_absoluto: number | null;
}

export interface ContasPagarAbertas {
  conta_id: number | null;
  referencia: string | null;
  fornecedor: string | null;
  categoria: string | null;
  filial: string | null;
  descricao: string | null;
  numero_nota: string | null;
  valor_total_centavos: number | null;
  num_parcelas: number | null;
  total_parcelas: number | null;
  parcelas_pagas: number | null;
  parcelas_abertas: number | null;
  valor_em_aberto: number | null;
  proximo_vencimento: string | null;
  status_pagamento: string | null;
}

export interface AnaliseFornecedores {
  id: number | null;
  cnpj: string | null;
  razao_social: string | null;
  nome_fantasia: string | null;
  total_titulos: number | null;
  valor_total_comprado: number | null;
  ticket_medio: number | null;
  total_parcelas: number | null;
  parcelas_pagas: number | null;
  parcelas_abertas: number | null;
  valor_em_aberto: number | null;
  primeira_compra: string | null;
  ultima_compra: string | null;
}

export interface FluxoCaixa {
  nome_conta: string | null;
  banco: string | null;
  mes: string | null;
  entradas: number | null;
  saidas: number | null;
  saldo_periodo: number | null;
}

// Helper type for Supabase queries with views
export type SupabaseView<T> = {
  from(view: 'vendas_mensal'): { select: (query: string) => Promise<{ data: VendasMensal[] | null; error: any }> };
  from(view: 'vendedoras_mensal'): { select: (query: string) => Promise<{ data: VendedorasMensal[] | null; error: any }> };
  from(view: 'vendedoras_mensal_com_meta'): { select: (query: string) => Promise<{ data: VendedorasMensalComMeta[] | null; error: any }> };
  from(view: 'crescimento_yoy'): { select: (query: string) => Promise<{ data: CrescimentoYoY[] | null; error: any }> };
  from(view: 'contas_pagar_abertas'): { select: (query: string) => Promise<{ data: ContasPagarAbertas[] | null; error: any }> };
  from(view: 'analise_fornecedores'): { select: (query: string) => Promise<{ data: AnaliseFornecedores[] | null; error: any }> };
  from(view: 'fluxo_caixa'): { select: (query: string) => Promise<{ data: FluxoCaixa[] | null; error: any }> };
};
