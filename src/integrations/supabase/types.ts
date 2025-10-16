export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      bandeiras_cartao: {
        Row: {
          created_at: string
          id: number
          nome: string
        }
        Insert: {
          created_at?: string
          id?: number
          nome: string
        }
        Update: {
          created_at?: string
          id?: number
          nome?: string
        }
        Relationships: []
      }
      cargos: {
        Row: {
          created_at: string
          id: number
          nome: string
        }
        Insert: {
          created_at?: string
          id?: number
          nome: string
        }
        Update: {
          created_at?: string
          id?: number
          nome?: string
        }
        Relationships: []
      }
      categorias_financeiras: {
        Row: {
          archived: boolean
          categoria_pai_id: number | null
          cor: string
          created_at: string
          descricao: string | null
          id: number
          nome: string
          ordem: number
          parent_id: number | null
          slug: string | null
          tipo: Database["public"]["Enums"]["tipo_categoria"]
          updated_at: string
        }
        Insert: {
          archived?: boolean
          categoria_pai_id?: number | null
          cor?: string
          created_at?: string
          descricao?: string | null
          id?: number
          nome: string
          ordem?: number
          parent_id?: number | null
          slug?: string | null
          tipo?: Database["public"]["Enums"]["tipo_categoria"]
          updated_at?: string
        }
        Update: {
          archived?: boolean
          categoria_pai_id?: number | null
          cor?: string
          created_at?: string
          descricao?: string | null
          id?: number
          nome?: string
          ordem?: number
          parent_id?: number | null
          slug?: string | null
          tipo?: Database["public"]["Enums"]["tipo_categoria"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "categorias_financeiras_categoria_pai_id_fkey"
            columns: ["categoria_pai_id"]
            isOneToOne: false
            referencedRelation: "categorias_financeiras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "categorias_financeiras_parent_fk"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "categorias_financeiras"
            referencedColumns: ["id"]
          },
        ]
      }
      categorias_pj: {
        Row: {
          created_at: string | null
          descricao: string | null
          id: number
          nome: string
        }
        Insert: {
          created_at?: string | null
          descricao?: string | null
          id?: number
          nome: string
        }
        Update: {
          created_at?: string | null
          descricao?: string | null
          id?: number
          nome?: string
        }
        Relationships: []
      }
      compras_pedido_anexos: {
        Row: {
          created_at: string
          descricao: string | null
          id: number
          pedido_id: number
          tipo_anexo: string
          updated_at: string
          url_anexo: string
        }
        Insert: {
          created_at?: string
          descricao?: string | null
          id?: never
          pedido_id: number
          tipo_anexo: string
          updated_at?: string
          url_anexo: string
        }
        Update: {
          created_at?: string
          descricao?: string | null
          id?: never
          pedido_id?: number
          tipo_anexo?: string
          updated_at?: string
          url_anexo?: string
        }
        Relationships: [
          {
            foreignKeyName: "compras_pedido_anexos_new_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "compras_pedidos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compras_pedido_anexos_new_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "pedidos_compra_resumo"
            referencedColumns: ["id"]
          },
        ]
      }
      compras_pedido_itens: {
        Row: {
          created_at: string
          descricao: string | null
          id: number
          pedido_id: number
          preco_unit_centavos: number
          qtd_pecas: number
          referencia: string
          subtotal_centavos: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          descricao?: string | null
          id?: number
          pedido_id: number
          preco_unit_centavos: number
          qtd_pecas: number
          referencia: string
          subtotal_centavos?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          descricao?: string | null
          id?: number
          pedido_id?: number
          preco_unit_centavos?: number
          qtd_pecas?: number
          referencia?: string
          subtotal_centavos?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "compras_pedido_itens_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "compras_pedidos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compras_pedido_itens_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "pedidos_compra_resumo"
            referencedColumns: ["id"]
          },
        ]
      }
      compras_pedido_links: {
        Row: {
          created_at: string
          descricao: string | null
          id: number
          pedido_id: number
          tipo: Database["public"]["Enums"]["tipo_link"]
          url: string
        }
        Insert: {
          created_at?: string
          descricao?: string | null
          id?: number
          pedido_id: number
          tipo: Database["public"]["Enums"]["tipo_link"]
          url: string
        }
        Update: {
          created_at?: string
          descricao?: string | null
          id?: number
          pedido_id?: number
          tipo?: Database["public"]["Enums"]["tipo_link"]
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "compras_pedido_links_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "compras_pedidos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compras_pedido_links_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "pedidos_compra_resumo"
            referencedColumns: ["id"]
          },
        ]
      }
      compras_pedidos: {
        Row: {
          created_at: string
          data_pedido: string
          desconto_percentual: number | null
          desconto_valor_centavos: number | null
          fornecedor_id: number
          id: number
          marca_id: number | null
          numero_pedido: string
          observacoes: string | null
          preco_medio_centavos: number | null
          previsao_entrega: string | null
          quantidade_pecas: number | null
          quantidade_referencias: number | null
          representante_pf_id: number | null
          status: Database["public"]["Enums"]["status_pedido"]
          updated_at: string
          valor_bruto_centavos: number | null
          valor_liquido_centavos: number | null
          valor_medio_peca_centavos: number | null
        }
        Insert: {
          created_at?: string
          data_pedido: string
          desconto_percentual?: number | null
          desconto_valor_centavos?: number | null
          fornecedor_id: number
          id?: number
          marca_id?: number | null
          numero_pedido: string
          observacoes?: string | null
          preco_medio_centavos?: number | null
          previsao_entrega?: string | null
          quantidade_pecas?: number | null
          quantidade_referencias?: number | null
          representante_pf_id?: number | null
          status?: Database["public"]["Enums"]["status_pedido"]
          updated_at?: string
          valor_bruto_centavos?: number | null
          valor_liquido_centavos?: number | null
          valor_medio_peca_centavos?: number | null
        }
        Update: {
          created_at?: string
          data_pedido?: string
          desconto_percentual?: number | null
          desconto_valor_centavos?: number | null
          fornecedor_id?: number
          id?: number
          marca_id?: number | null
          numero_pedido?: string
          observacoes?: string | null
          preco_medio_centavos?: number | null
          previsao_entrega?: string | null
          quantidade_pecas?: number | null
          quantidade_referencias?: number | null
          representante_pf_id?: number | null
          status?: Database["public"]["Enums"]["status_pedido"]
          updated_at?: string
          valor_bruto_centavos?: number | null
          valor_liquido_centavos?: number | null
          valor_medio_peca_centavos?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "compras_pedidos_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "analise_fornecedores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compras_pedidos_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "pessoas_juridicas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compras_pedidos_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "vw_fin_resumo_por_fornecedor"
            referencedColumns: ["pessoa_juridica_id"]
          },
          {
            foreignKeyName: "compras_pedidos_marca_id_fkey"
            columns: ["marca_id"]
            isOneToOne: false
            referencedRelation: "marcas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compras_pedidos_representante_pf_id_fkey"
            columns: ["representante_pf_id"]
            isOneToOne: false
            referencedRelation: "pessoas_fisicas"
            referencedColumns: ["id"]
          },
        ]
      }
      contas_bancarias: {
        Row: {
          agencia: string | null
          ativa: boolean
          banco: string | null
          created_at: string
          id: number
          nome_conta: string
          numero_conta: string | null
          pf_id: number | null
          pj_id: number | null
          saldo_atual_centavos: number
          updated_at: string
        }
        Insert: {
          agencia?: string | null
          ativa?: boolean
          banco?: string | null
          created_at?: string
          id?: number
          nome_conta: string
          numero_conta?: string | null
          pf_id?: number | null
          pj_id?: number | null
          saldo_atual_centavos?: number
          updated_at?: string
        }
        Update: {
          agencia?: string | null
          ativa?: boolean
          banco?: string | null
          created_at?: string
          id?: number
          nome_conta?: string
          numero_conta?: string | null
          pf_id?: number | null
          pj_id?: number | null
          saldo_atual_centavos?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contas_bancarias_pj_id_fkey"
            columns: ["pj_id"]
            isOneToOne: false
            referencedRelation: "analise_fornecedores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contas_bancarias_pj_id_fkey"
            columns: ["pj_id"]
            isOneToOne: false
            referencedRelation: "pessoas_juridicas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contas_bancarias_pj_id_fkey"
            columns: ["pj_id"]
            isOneToOne: false
            referencedRelation: "vw_fin_resumo_por_fornecedor"
            referencedColumns: ["pessoa_juridica_id"]
          },
          {
            foreignKeyName: "fk_pf"
            columns: ["pf_id"]
            isOneToOne: false
            referencedRelation: "pessoas_fisicas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_pj"
            columns: ["pj_id"]
            isOneToOne: false
            referencedRelation: "analise_fornecedores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_pj"
            columns: ["pj_id"]
            isOneToOne: false
            referencedRelation: "pessoas_juridicas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_pj"
            columns: ["pj_id"]
            isOneToOne: false
            referencedRelation: "vw_fin_resumo_por_fornecedor"
            referencedColumns: ["pessoa_juridica_id"]
          },
        ]
      }
      contas_movimentacoes: {
        Row: {
          conta_bancaria_id: number
          created_at: string
          descricao: string | null
          id: number
          origem: Database["public"]["Enums"]["origem_movimentacao"]
          parcela_id: number | null
          tipo: Database["public"]["Enums"]["tipo_movimentacao"]
          valor_centavos: number
        }
        Insert: {
          conta_bancaria_id: number
          created_at?: string
          descricao?: string | null
          id?: number
          origem?: Database["public"]["Enums"]["origem_movimentacao"]
          parcela_id?: number | null
          tipo: Database["public"]["Enums"]["tipo_movimentacao"]
          valor_centavos: number
        }
        Update: {
          conta_bancaria_id?: number
          created_at?: string
          descricao?: string | null
          id?: number
          origem?: Database["public"]["Enums"]["origem_movimentacao"]
          parcela_id?: number | null
          tipo?: Database["public"]["Enums"]["tipo_movimentacao"]
          valor_centavos?: number
        }
        Relationships: [
          {
            foreignKeyName: "contas_movimentacoes_conta_bancaria_id_fkey"
            columns: ["conta_bancaria_id"]
            isOneToOne: false
            referencedRelation: "contas_bancarias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contas_movimentacoes_parcela_id_fkey"
            columns: ["parcela_id"]
            isOneToOne: false
            referencedRelation: "contas_pagar_parcelas"
            referencedColumns: ["id"]
          },
        ]
      }
      contas_pagar: {
        Row: {
          categoria_id: number | null
          chave_nfe: string | null
          created_at: string
          data_emissao: string | null
          descricao: string | null
          empresa_destinataria_id: number | null
          filial_id: number | null
          fornecedor_id: number | null
          fornecedor_pf_id: number | null
          id: number
          num_parcelas: number | null
          numero_nf: string | null
          numero_nota: string | null
          qtd_parcelas: number | null
          referencia: string | null
          updated_at: string
          valor_total_centavos: number
        }
        Insert: {
          categoria_id?: number | null
          chave_nfe?: string | null
          created_at?: string
          data_emissao?: string | null
          descricao?: string | null
          empresa_destinataria_id?: number | null
          filial_id?: number | null
          fornecedor_id?: number | null
          fornecedor_pf_id?: number | null
          id?: number
          num_parcelas?: number | null
          numero_nf?: string | null
          numero_nota?: string | null
          qtd_parcelas?: number | null
          referencia?: string | null
          updated_at?: string
          valor_total_centavos: number
        }
        Update: {
          categoria_id?: number | null
          chave_nfe?: string | null
          created_at?: string
          data_emissao?: string | null
          descricao?: string | null
          empresa_destinataria_id?: number | null
          filial_id?: number | null
          fornecedor_id?: number | null
          fornecedor_pf_id?: number | null
          id?: number
          num_parcelas?: number | null
          numero_nf?: string | null
          numero_nota?: string | null
          qtd_parcelas?: number | null
          referencia?: string | null
          updated_at?: string
          valor_total_centavos?: number
        }
        Relationships: [
          {
            foreignKeyName: "contas_pagar_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "categorias_financeiras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contas_pagar_empresa_destinataria_id_fkey"
            columns: ["empresa_destinataria_id"]
            isOneToOne: false
            referencedRelation: "analise_fornecedores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contas_pagar_empresa_destinataria_id_fkey"
            columns: ["empresa_destinataria_id"]
            isOneToOne: false
            referencedRelation: "pessoas_juridicas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contas_pagar_empresa_destinataria_id_fkey"
            columns: ["empresa_destinataria_id"]
            isOneToOne: false
            referencedRelation: "vw_fin_resumo_por_fornecedor"
            referencedColumns: ["pessoa_juridica_id"]
          },
          {
            foreignKeyName: "contas_pagar_filial_id_fkey"
            columns: ["filial_id"]
            isOneToOne: false
            referencedRelation: "filiais"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contas_pagar_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "analise_fornecedores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contas_pagar_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "pessoas_juridicas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contas_pagar_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "vw_fin_resumo_por_fornecedor"
            referencedColumns: ["pessoa_juridica_id"]
          },
          {
            foreignKeyName: "fk_fornecedor_pf"
            columns: ["fornecedor_pf_id"]
            isOneToOne: false
            referencedRelation: "pessoas_fisicas"
            referencedColumns: ["id"]
          },
        ]
      }
      contas_pagar_parcelas: {
        Row: {
          conta_bancaria_id: number | null
          conta_id: number
          created_at: string
          forma_pagamento_id: number | null
          id: number
          numero_parcela: number | null
          observacao: string | null
          pago: boolean
          pago_em: string | null
          parcela_num: number
          updated_at: string
          valor_pago_centavos: number | null
          valor_parcela_centavos: number
          vencimento: string
        }
        Insert: {
          conta_bancaria_id?: number | null
          conta_id: number
          created_at?: string
          forma_pagamento_id?: number | null
          id?: number
          numero_parcela?: number | null
          observacao?: string | null
          pago?: boolean
          pago_em?: string | null
          parcela_num: number
          updated_at?: string
          valor_pago_centavos?: number | null
          valor_parcela_centavos: number
          vencimento: string
        }
        Update: {
          conta_bancaria_id?: number | null
          conta_id?: number
          created_at?: string
          forma_pagamento_id?: number | null
          id?: number
          numero_parcela?: number | null
          observacao?: string | null
          pago?: boolean
          pago_em?: string | null
          parcela_num?: number
          updated_at?: string
          valor_pago_centavos?: number | null
          valor_parcela_centavos?: number
          vencimento?: string
        }
        Relationships: [
          {
            foreignKeyName: "contas_pagar_parcelas_conta_bancaria_id_fkey"
            columns: ["conta_bancaria_id"]
            isOneToOne: false
            referencedRelation: "contas_bancarias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contas_pagar_parcelas_conta_id_fkey"
            columns: ["conta_id"]
            isOneToOne: false
            referencedRelation: "contas_pagar"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contas_pagar_parcelas_conta_id_fkey"
            columns: ["conta_id"]
            isOneToOne: false
            referencedRelation: "contas_pagar_abertas"
            referencedColumns: ["conta_id"]
          },
          {
            foreignKeyName: "contas_pagar_parcelas_forma_pagamento_id_fkey"
            columns: ["forma_pagamento_id"]
            isOneToOne: false
            referencedRelation: "formas_pagamento"
            referencedColumns: ["id"]
          },
        ]
      }
      contas_recorrentes: {
        Row: {
          ativa: boolean | null
          categoria_id: number | null
          created_at: string | null
          descricao: string
          dia_vencimento: number | null
          fornecedor_id: number | null
          id: number
          observacoes: string | null
          proxima_geracao: string
          tipo_recorrencia: string | null
          valor_centavos: number
        }
        Insert: {
          ativa?: boolean | null
          categoria_id?: number | null
          created_at?: string | null
          descricao: string
          dia_vencimento?: number | null
          fornecedor_id?: number | null
          id?: number
          observacoes?: string | null
          proxima_geracao: string
          tipo_recorrencia?: string | null
          valor_centavos: number
        }
        Update: {
          ativa?: boolean | null
          categoria_id?: number | null
          created_at?: string | null
          descricao?: string
          dia_vencimento?: number | null
          fornecedor_id?: number | null
          id?: number
          observacoes?: string | null
          proxima_geracao?: string
          tipo_recorrencia?: string | null
          valor_centavos?: number
        }
        Relationships: [
          {
            foreignKeyName: "contas_recorrentes_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "categorias_financeiras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contas_recorrentes_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "analise_fornecedores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contas_recorrentes_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "pessoas_juridicas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contas_recorrentes_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "vw_fin_resumo_por_fornecedor"
            referencedColumns: ["pessoa_juridica_id"]
          },
        ]
      }
      cores: {
        Row: {
          created_at: string | null
          hex_code: string | null
          id: number
          nome: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          hex_code?: string | null
          id?: number
          nome: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          hex_code?: string | null
          id?: number
          nome?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      fechamento_caixa: {
        Row: {
          created_at: string
          data_fechamento: string
          diferenca_boleto: number | null
          diferenca_credito: number | null
          diferenca_debito: number | null
          diferenca_dinheiro: number | null
          diferenca_pix: number | null
          filial_id: number | null
          id: number
          observacao: string | null
          valor_conferido_boleto: number | null
          valor_conferido_credito: number | null
          valor_conferido_debito: number | null
          valor_conferido_dinheiro: number | null
          valor_conferido_pix: number | null
          valor_sistema_boleto: number | null
          valor_sistema_credito: number | null
          valor_sistema_debito: number | null
          valor_sistema_dinheiro: number | null
          valor_sistema_pix: number | null
        }
        Insert: {
          created_at?: string
          data_fechamento: string
          diferenca_boleto?: number | null
          diferenca_credito?: number | null
          diferenca_debito?: number | null
          diferenca_dinheiro?: number | null
          diferenca_pix?: number | null
          filial_id?: number | null
          id?: number
          observacao?: string | null
          valor_conferido_boleto?: number | null
          valor_conferido_credito?: number | null
          valor_conferido_debito?: number | null
          valor_conferido_dinheiro?: number | null
          valor_conferido_pix?: number | null
          valor_sistema_boleto?: number | null
          valor_sistema_credito?: number | null
          valor_sistema_debito?: number | null
          valor_sistema_dinheiro?: number | null
          valor_sistema_pix?: number | null
        }
        Update: {
          created_at?: string
          data_fechamento?: string
          diferenca_boleto?: number | null
          diferenca_credito?: number | null
          diferenca_debito?: number | null
          diferenca_dinheiro?: number | null
          diferenca_pix?: number | null
          filial_id?: number | null
          id?: number
          observacao?: string | null
          valor_conferido_boleto?: number | null
          valor_conferido_credito?: number | null
          valor_conferido_debito?: number | null
          valor_conferido_dinheiro?: number | null
          valor_conferido_pix?: number | null
          valor_sistema_boleto?: number | null
          valor_sistema_credito?: number | null
          valor_sistema_debito?: number | null
          valor_sistema_dinheiro?: number | null
          valor_sistema_pix?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fechamento_caixa_filial_id_fkey"
            columns: ["filial_id"]
            isOneToOne: false
            referencedRelation: "filiais"
            referencedColumns: ["id"]
          },
        ]
      }
      fechamentos_caixa: {
        Row: {
          created_at: string | null
          data_fechamento: string
          filial_id: number | null
          id: number
          observacoes: string | null
          outras_entradas_centavos: number | null
          outras_saidas_centavos: number | null
          pagamentos_fornecedores_centavos: number | null
          saldo_final_centavos: number | null
          status: string | null
          total_entradas_centavos: number | null
          total_saidas_centavos: number | null
          vendas_cartao_centavos: number | null
          vendas_dinheiro_centavos: number | null
          vendas_pix_centavos: number | null
        }
        Insert: {
          created_at?: string | null
          data_fechamento: string
          filial_id?: number | null
          id?: number
          observacoes?: string | null
          outras_entradas_centavos?: number | null
          outras_saidas_centavos?: number | null
          pagamentos_fornecedores_centavos?: number | null
          saldo_final_centavos?: number | null
          status?: string | null
          total_entradas_centavos?: number | null
          total_saidas_centavos?: number | null
          vendas_cartao_centavos?: number | null
          vendas_dinheiro_centavos?: number | null
          vendas_pix_centavos?: number | null
        }
        Update: {
          created_at?: string | null
          data_fechamento?: string
          filial_id?: number | null
          id?: number
          observacoes?: string | null
          outras_entradas_centavos?: number | null
          outras_saidas_centavos?: number | null
          pagamentos_fornecedores_centavos?: number | null
          saldo_final_centavos?: number | null
          status?: string | null
          total_entradas_centavos?: number | null
          total_saidas_centavos?: number | null
          vendas_cartao_centavos?: number | null
          vendas_dinheiro_centavos?: number | null
          vendas_pix_centavos?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fechamentos_caixa_filial_id_fkey"
            columns: ["filial_id"]
            isOneToOne: false
            referencedRelation: "filiais"
            referencedColumns: ["id"]
          },
        ]
      }
      ferias_vendedoras: {
        Row: {
          created_at: string
          fim: string
          id: number
          inicio: string
          observacao: string | null
          vendedora_pf_id: number
        }
        Insert: {
          created_at?: string
          fim: string
          id?: number
          inicio: string
          observacao?: string | null
          vendedora_pf_id: number
        }
        Update: {
          created_at?: string
          fim?: string
          id?: number
          inicio?: string
          observacao?: string | null
          vendedora_pf_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "ferias_vendedoras_vendedora_pf_id_fkey"
            columns: ["vendedora_pf_id"]
            isOneToOne: false
            referencedRelation: "pessoas_fisicas"
            referencedColumns: ["id"]
          },
        ]
      }
      filiais: {
        Row: {
          created_at: string
          id: number
          nome: string
          pj_id: number
        }
        Insert: {
          created_at?: string
          id?: number
          nome: string
          pj_id: number
        }
        Update: {
          created_at?: string
          id?: number
          nome?: string
          pj_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "filiais_pj_id_fkey"
            columns: ["pj_id"]
            isOneToOne: false
            referencedRelation: "analise_fornecedores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "filiais_pj_id_fkey"
            columns: ["pj_id"]
            isOneToOne: false
            referencedRelation: "pessoas_juridicas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "filiais_pj_id_fkey"
            columns: ["pj_id"]
            isOneToOne: false
            referencedRelation: "vw_fin_resumo_por_fornecedor"
            referencedColumns: ["pessoa_juridica_id"]
          },
        ]
      }
      formas_pagamento: {
        Row: {
          created_at: string
          id: number
          nome: string
        }
        Insert: {
          created_at?: string
          id?: number
          nome: string
        }
        Update: {
          created_at?: string
          id?: number
          nome?: string
        }
        Relationships: []
      }
      marcas: {
        Row: {
          created_at: string
          descricao: string | null
          id: number
          nome: string
          pj_vinculada_id: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          descricao?: string | null
          id?: number
          nome: string
          pj_vinculada_id?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          descricao?: string | null
          id?: number
          nome?: string
          pj_vinculada_id?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "marcas_pj_vinculada_id_fkey"
            columns: ["pj_vinculada_id"]
            isOneToOne: false
            referencedRelation: "analise_fornecedores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marcas_pj_vinculada_id_fkey"
            columns: ["pj_vinculada_id"]
            isOneToOne: false
            referencedRelation: "pessoas_juridicas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marcas_pj_vinculada_id_fkey"
            columns: ["pj_vinculada_id"]
            isOneToOne: false
            referencedRelation: "vw_fin_resumo_por_fornecedor"
            referencedColumns: ["pessoa_juridica_id"]
          },
        ]
      }
      metas_vendedoras: {
        Row: {
          ano: number
          created_at: string
          id: number
          mes: number
          meta_centavos: number
          vendedora_pf_id: number
        }
        Insert: {
          ano: number
          created_at?: string
          id?: number
          mes: number
          meta_centavos: number
          vendedora_pf_id: number
        }
        Update: {
          ano?: number
          created_at?: string
          id?: number
          mes?: number
          meta_centavos?: number
          vendedora_pf_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "metas_vendedoras_vendedora_pf_id_fkey"
            columns: ["vendedora_pf_id"]
            isOneToOne: false
            referencedRelation: "pessoas_fisicas"
            referencedColumns: ["id"]
          },
        ]
      }
      pessoas_fisicas: {
        Row: {
          cargo_id: number | null
          celular: string | null
          cpf: string | null
          created_at: string
          email: string | null
          endereco: string | null
          filial_id: number | null
          id: number
          nascimento: string | null
          nome_completo: string
          num_cadastro_folha: string | null
          updated_at: string
        }
        Insert: {
          cargo_id?: number | null
          celular?: string | null
          cpf?: string | null
          created_at?: string
          email?: string | null
          endereco?: string | null
          filial_id?: number | null
          id?: number
          nascimento?: string | null
          nome_completo: string
          num_cadastro_folha?: string | null
          updated_at?: string
        }
        Update: {
          cargo_id?: number | null
          celular?: string | null
          cpf?: string | null
          created_at?: string
          email?: string | null
          endereco?: string | null
          filial_id?: number | null
          id?: number
          nascimento?: string | null
          nome_completo?: string
          num_cadastro_folha?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pessoas_fisicas_cargo_id_fkey"
            columns: ["cargo_id"]
            isOneToOne: false
            referencedRelation: "cargos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pessoas_fisicas_filial_id_fkey"
            columns: ["filial_id"]
            isOneToOne: false
            referencedRelation: "filiais"
            referencedColumns: ["id"]
          },
        ]
      }
      pessoas_juridicas: {
        Row: {
          categoria_id: number | null
          celular: string | null
          cnpj: string | null
          created_at: string
          email: string | null
          endereco: string | null
          fundacao: string | null
          id: number
          insc_estadual: string | null
          nome_fantasia: string | null
          razao_social: string | null
          updated_at: string
        }
        Insert: {
          categoria_id?: number | null
          celular?: string | null
          cnpj?: string | null
          created_at?: string
          email?: string | null
          endereco?: string | null
          fundacao?: string | null
          id?: number
          insc_estadual?: string | null
          nome_fantasia?: string | null
          razao_social?: string | null
          updated_at?: string
        }
        Update: {
          categoria_id?: number | null
          celular?: string | null
          cnpj?: string | null
          created_at?: string
          email?: string | null
          endereco?: string | null
          fundacao?: string | null
          id?: number
          insc_estadual?: string | null
          nome_fantasia?: string | null
          razao_social?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_categoria_financeira"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "categorias_financeiras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pessoas_juridicas_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "categorias_pj"
            referencedColumns: ["id"]
          },
        ]
      }
      pj_marcas: {
        Row: {
          marca_id: number
          pj_id: number
        }
        Insert: {
          marca_id: number
          pj_id: number
        }
        Update: {
          marca_id?: number
          pj_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "pj_marcas_marca_id_fkey"
            columns: ["marca_id"]
            isOneToOne: false
            referencedRelation: "marcas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pj_marcas_pj_id_fkey"
            columns: ["pj_id"]
            isOneToOne: false
            referencedRelation: "analise_fornecedores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pj_marcas_pj_id_fkey"
            columns: ["pj_id"]
            isOneToOne: false
            referencedRelation: "pessoas_juridicas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pj_marcas_pj_id_fkey"
            columns: ["pj_id"]
            isOneToOne: false
            referencedRelation: "vw_fin_resumo_por_fornecedor"
            referencedColumns: ["pessoa_juridica_id"]
          },
        ]
      }
      pj_representantes: {
        Row: {
          pf_id: number
          pj_id: number
        }
        Insert: {
          pf_id: number
          pj_id: number
        }
        Update: {
          pf_id?: number
          pj_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "pj_representantes_pf_id_fkey"
            columns: ["pf_id"]
            isOneToOne: false
            referencedRelation: "pessoas_fisicas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pj_representantes_pj_id_fkey"
            columns: ["pj_id"]
            isOneToOne: false
            referencedRelation: "analise_fornecedores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pj_representantes_pj_id_fkey"
            columns: ["pj_id"]
            isOneToOne: false
            referencedRelation: "pessoas_juridicas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pj_representantes_pj_id_fkey"
            columns: ["pj_id"]
            isOneToOne: false
            referencedRelation: "vw_fin_resumo_por_fornecedor"
            referencedColumns: ["pessoa_juridica_id"]
          },
        ]
      }
      produto_grades: {
        Row: {
          cor_id: number | null
          created_at: string | null
          custo_centavos: number | null
          estoque: number | null
          id: number
          preco_venda_centavos: number | null
          produto_id: number
          sku: string | null
          tamanho_id: number | null
          updated_at: string | null
        }
        Insert: {
          cor_id?: number | null
          created_at?: string | null
          custo_centavos?: number | null
          estoque?: number | null
          id?: number
          preco_venda_centavos?: number | null
          produto_id: number
          sku?: string | null
          tamanho_id?: number | null
          updated_at?: string | null
        }
        Update: {
          cor_id?: number | null
          created_at?: string | null
          custo_centavos?: number | null
          estoque?: number | null
          id?: number
          preco_venda_centavos?: number | null
          produto_id?: number
          sku?: string | null
          tamanho_id?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "produto_grades_cor_id_fkey"
            columns: ["cor_id"]
            isOneToOne: false
            referencedRelation: "cores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "produto_grades_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "produto_grades_tamanho_id_fkey"
            columns: ["tamanho_id"]
            isOneToOne: false
            referencedRelation: "tamanhos"
            referencedColumns: ["id"]
          },
        ]
      }
      produtos: {
        Row: {
          ativo: boolean | null
          categoria: string | null
          created_at: string | null
          descricao: string | null
          faixa_etaria: string | null
          genero: string | null
          id: number
          nome: string
          tipo_manga: string | null
          unidade_medida: string | null
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean | null
          categoria?: string | null
          created_at?: string | null
          descricao?: string | null
          faixa_etaria?: string | null
          genero?: string | null
          id?: number
          nome: string
          tipo_manga?: string | null
          unidade_medida?: string | null
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean | null
          categoria?: string | null
          created_at?: string | null
          descricao?: string | null
          faixa_etaria?: string | null
          genero?: string | null
          id?: number
          nome?: string
          tipo_manga?: string | null
          unidade_medida?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      recorrencias: {
        Row: {
          ativa: boolean
          categoria_id: number | null
          chave_nfe: string | null
          codigo_boleto: string | null
          created_at: string
          data_emissao: string | null
          dia_fechamento: number | null
          dia_vencimento: number | null
          dia_vencimento_livre: number | null
          dias_semana: number[] | null
          filial_id: number
          fornecedor_id: number | null
          id: number
          intervalo_frequencia: number | null
          livre: boolean
          nome: string
          num_parcelas: number | null
          numero_nota: string | null
          referencia: string | null
          sem_data_final: boolean
          tipo_frequencia: string | null
          ultimo_gerado_em: string | null
          updated_at: string
          valor_total_centavos: number
        }
        Insert: {
          ativa?: boolean
          categoria_id?: number | null
          chave_nfe?: string | null
          codigo_boleto?: string | null
          created_at?: string
          data_emissao?: string | null
          dia_fechamento?: number | null
          dia_vencimento?: number | null
          dia_vencimento_livre?: number | null
          dias_semana?: number[] | null
          filial_id: number
          fornecedor_id?: number | null
          id?: number
          intervalo_frequencia?: number | null
          livre?: boolean
          nome: string
          num_parcelas?: number | null
          numero_nota?: string | null
          referencia?: string | null
          sem_data_final?: boolean
          tipo_frequencia?: string | null
          ultimo_gerado_em?: string | null
          updated_at?: string
          valor_total_centavos?: number
        }
        Update: {
          ativa?: boolean
          categoria_id?: number | null
          chave_nfe?: string | null
          codigo_boleto?: string | null
          created_at?: string
          data_emissao?: string | null
          dia_fechamento?: number | null
          dia_vencimento?: number | null
          dia_vencimento_livre?: number | null
          dias_semana?: number[] | null
          filial_id?: number
          fornecedor_id?: number | null
          id?: number
          intervalo_frequencia?: number | null
          livre?: boolean
          nome?: string
          num_parcelas?: number | null
          numero_nota?: string | null
          referencia?: string | null
          sem_data_final?: boolean
          tipo_frequencia?: string | null
          ultimo_gerado_em?: string | null
          updated_at?: string
          valor_total_centavos?: number
        }
        Relationships: [
          {
            foreignKeyName: "recorrencias_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "categorias_financeiras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recorrencias_filial_id_fkey"
            columns: ["filial_id"]
            isOneToOne: false
            referencedRelation: "filiais"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recorrencias_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "analise_fornecedores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recorrencias_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "pessoas_juridicas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recorrencias_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "vw_fin_resumo_por_fornecedor"
            referencedColumns: ["pessoa_juridica_id"]
          },
        ]
      }
      salarios: {
        Row: {
          comissao_percentual: number
          created_at: string
          id: number
          meta_centavos: number
          pf_id: number
          salario_base_centavos: number
          vigencia_fim: string | null
          vigencia_inicio: string
        }
        Insert: {
          comissao_percentual?: number
          created_at?: string
          id?: number
          meta_centavos?: number
          pf_id: number
          salario_base_centavos: number
          vigencia_fim?: string | null
          vigencia_inicio: string
        }
        Update: {
          comissao_percentual?: number
          created_at?: string
          id?: number
          meta_centavos?: number
          pf_id?: number
          salario_base_centavos?: number
          vigencia_fim?: string | null
          vigencia_inicio?: string
        }
        Relationships: [
          {
            foreignKeyName: "salarios_pf_id_fkey"
            columns: ["pf_id"]
            isOneToOne: false
            referencedRelation: "pessoas_fisicas"
            referencedColumns: ["id"]
          },
        ]
      }
      tamanhos: {
        Row: {
          created_at: string | null
          id: number
          nome: string
          ordem: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: number
          nome: string
          ordem?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: number
          nome?: string
          ordem?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      taxas_bandeira: {
        Row: {
          bandeira_id: number
          conta_id: number
          created_at: string
          id: number
          percentual: number
        }
        Insert: {
          bandeira_id: number
          conta_id: number
          created_at?: string
          id?: number
          percentual: number
        }
        Update: {
          bandeira_id?: number
          conta_id?: number
          created_at?: string
          id?: number
          percentual?: number
        }
        Relationships: [
          {
            foreignKeyName: "taxas_bandeira_bandeira_id_fkey"
            columns: ["bandeira_id"]
            isOneToOne: false
            referencedRelation: "bandeiras_cartao"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "taxas_bandeira_conta_id_fkey"
            columns: ["conta_id"]
            isOneToOne: false
            referencedRelation: "contas_bancarias"
            referencedColumns: ["id"]
          },
        ]
      }
      vendas_diarias: {
        Row: {
          atendimentos: number
          created_at: string
          data: string
          desconto_centavos: number
          filial_id: number | null
          id: number
          qtd_itens: number
          valor_bruto_centavos: number
          valor_liquido_centavos: number
          vendedora_pf_id: number | null
        }
        Insert: {
          atendimentos?: number
          created_at?: string
          data: string
          desconto_centavos?: number
          filial_id?: number | null
          id?: number
          qtd_itens?: number
          valor_bruto_centavos?: number
          valor_liquido_centavos?: number
          vendedora_pf_id?: number | null
        }
        Update: {
          atendimentos?: number
          created_at?: string
          data?: string
          desconto_centavos?: number
          filial_id?: number | null
          id?: number
          qtd_itens?: number
          valor_bruto_centavos?: number
          valor_liquido_centavos?: number
          vendedora_pf_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "vendas_diarias_filial_id_fkey"
            columns: ["filial_id"]
            isOneToOne: false
            referencedRelation: "filiais"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendas_diarias_vendedora_pf_id_fkey"
            columns: ["vendedora_pf_id"]
            isOneToOne: false
            referencedRelation: "pessoas_fisicas"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      analise_fornecedores: {
        Row: {
          cnpj: string | null
          id: number | null
          nome_fantasia: string | null
          parcelas_abertas: number | null
          parcelas_pagas: number | null
          primeira_compra: string | null
          razao_social: string | null
          ticket_medio: number | null
          total_parcelas: number | null
          total_titulos: number | null
          ultima_compra: string | null
          valor_em_aberto: number | null
          valor_total_comprado: number | null
        }
        Relationships: []
      }
      contas_pagar_abertas: {
        Row: {
          categoria: string | null
          conta_id: number | null
          descricao: string | null
          filial: string | null
          fornecedor: string | null
          num_parcelas: number | null
          numero_nota: string | null
          parcelas_abertas: number | null
          parcelas_pagas: number | null
          proximo_vencimento: string | null
          referencia: string | null
          status_pagamento: string | null
          total_parcelas: number | null
          valor_em_aberto: number | null
          valor_total_centavos: number | null
        }
        Relationships: []
      }
      crescimento_yoy: {
        Row: {
          ano: number | null
          crescimento_absoluto: number | null
          crescimento_percentual: number | null
          filial_id: number | null
          filial_nome: string | null
          mes: number | null
          valor_anterior: number | null
          valor_atual: number | null
        }
        Relationships: [
          {
            foreignKeyName: "vendas_diarias_filial_id_fkey"
            columns: ["filial_id"]
            isOneToOne: false
            referencedRelation: "filiais"
            referencedColumns: ["id"]
          },
        ]
      }
      fluxo_caixa: {
        Row: {
          banco: string | null
          entradas: number | null
          mes: string | null
          nome_conta: string | null
          saidas: number | null
          saldo_periodo: number | null
        }
        Relationships: []
      }
      pedidos_compra_resumo: {
        Row: {
          data_pedido: string | null
          desconto_percentual: number | null
          desconto_valor_centavos: number | null
          fornecedor: string | null
          id: number | null
          marca: string | null
          numero: string | null
          preco_medio_centavos: number | null
          previsao_entrega: string | null
          qtd_pecas_total: number | null
          qtd_pecas_total_calculada: number | null
          qtd_referencias: number | null
          representante: string | null
          status: Database["public"]["Enums"]["status_pedido"] | null
          total_itens: number | null
          valor_bruto_calculado: number | null
          valor_bruto_centavos: number | null
          valor_liquido_centavos: number | null
        }
        Relationships: []
      }
      vendas_mensal: {
        Row: {
          ano: number | null
          desconto_total: number | null
          filial_id: number | null
          filial_nome: string | null
          mes: number | null
          qtd_itens_total: number | null
          ticket_medio: number | null
          total_vendas: number | null
          valor_bruto_total: number | null
          valor_liquido_total: number | null
        }
        Relationships: [
          {
            foreignKeyName: "vendas_diarias_filial_id_fkey"
            columns: ["filial_id"]
            isOneToOne: false
            referencedRelation: "filiais"
            referencedColumns: ["id"]
          },
        ]
      }
      vendedoras_mensal: {
        Row: {
          ano: number | null
          desconto_total: number | null
          filial_id: number | null
          filial_nome: string | null
          mes: number | null
          qtd_itens_total: number | null
          ticket_medio: number | null
          total_vendas: number | null
          valor_bruto_total: number | null
          valor_liquido_total: number | null
          vendedora_nome: string | null
          vendedora_pf_id: number | null
        }
        Relationships: [
          {
            foreignKeyName: "vendas_diarias_filial_id_fkey"
            columns: ["filial_id"]
            isOneToOne: false
            referencedRelation: "filiais"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendas_diarias_vendedora_pf_id_fkey"
            columns: ["vendedora_pf_id"]
            isOneToOne: false
            referencedRelation: "pessoas_fisicas"
            referencedColumns: ["id"]
          },
        ]
      }
      vendedoras_mensal_com_meta: {
        Row: {
          ano: number | null
          desconto_total: number | null
          dias_ferias: number | null
          dias_no_mes: number | null
          dias_trabalhados: number | null
          filial_id: number | null
          filial_nome: string | null
          mes: number | null
          meta_ajustada: number | null
          meta_original: number | null
          percentual_meta: number | null
          qtd_itens_total: number | null
          ticket_medio: number | null
          total_vendas: number | null
          valor_bruto_total: number | null
          valor_liquido_total: number | null
          vendedora_nome: string | null
          vendedora_pf_id: number | null
        }
        Relationships: [
          {
            foreignKeyName: "vendas_diarias_filial_id_fkey"
            columns: ["filial_id"]
            isOneToOne: false
            referencedRelation: "filiais"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendas_diarias_vendedora_pf_id_fkey"
            columns: ["vendedora_pf_id"]
            isOneToOne: false
            referencedRelation: "pessoas_fisicas"
            referencedColumns: ["id"]
          },
        ]
      }
      vw_fin_resumo_por_fornecedor: {
        Row: {
          cnpj: string | null
          nome: string | null
          pessoa_juridica_id: number | null
          total_contas_centavos: number | null
          total_em_aberto_centavos: number | null
          total_pago_centavos: number | null
          total_vencido_centavos: number | null
        }
        Relationships: []
      }
      vw_vendas_pbi_mes: {
        Row: {
          ano: number | null
          filial_id: number | null
          mes: number | null
          soma_atendimentos: number | null
          soma_bruto_centavos: number | null
          soma_desconto_centavos: number | null
          soma_itens: number | null
          soma_liquido_centavos: number | null
          ticket_medio_centavos: number | null
          vendedora_pf_id: number | null
        }
        Relationships: [
          {
            foreignKeyName: "vendas_diarias_filial_id_fkey"
            columns: ["filial_id"]
            isOneToOne: false
            referencedRelation: "filiais"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendas_diarias_vendedora_pf_id_fkey"
            columns: ["vendedora_pf_id"]
            isOneToOne: false
            referencedRelation: "pessoas_fisicas"
            referencedColumns: ["id"]
          },
        ]
      }
      vw_vendas_pbi_raw: {
        Row: {
          ano: number | null
          atendimentos: number | null
          data: string | null
          desconto_centavos: number | null
          filial_id: number | null
          id: number | null
          mes: number | null
          qtd_itens: number | null
          ticket_medio_centavos: number | null
          valor_bruto_centavos: number | null
          valor_liquido_centavos: number | null
          vendedora_pf_id: number | null
        }
        Insert: {
          ano?: never
          atendimentos?: number | null
          data?: string | null
          desconto_centavos?: number | null
          filial_id?: number | null
          id?: number | null
          mes?: never
          qtd_itens?: number | null
          ticket_medio_centavos?: never
          valor_bruto_centavos?: number | null
          valor_liquido_centavos?: never
          vendedora_pf_id?: number | null
        }
        Update: {
          ano?: never
          atendimentos?: number | null
          data?: string | null
          desconto_centavos?: number | null
          filial_id?: number | null
          id?: number | null
          mes?: never
          qtd_itens?: number | null
          ticket_medio_centavos?: never
          valor_bruto_centavos?: number | null
          valor_liquido_centavos?: never
          vendedora_pf_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "vendas_diarias_filial_id_fkey"
            columns: ["filial_id"]
            isOneToOne: false
            referencedRelation: "filiais"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendas_diarias_vendedora_pf_id_fkey"
            columns: ["vendedora_pf_id"]
            isOneToOne: false
            referencedRelation: "pessoas_fisicas"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      aplicar_recorrencia_mes: {
        Args: { ano: number; mes: number; recorrencia_id: number }
        Returns: undefined
      }
      contas_recorrentes_vencidas: {
        Args: Record<PropertyKey, never>
        Returns: {
          dia_vencimento: number
          meses_atrasados: number
          nome: string
          recorrencia_id: number
          ultimo_mes_gerado: string
          valor_esperado_centavos: number
        }[]
      }
      days_in_month: {
        Args: { ano: number; mes: number }
        Returns: number
      }
      ferias_dias_no_mes: {
        Args: { ano: number; mes: number; pf_id: number }
        Returns: number
      }
      gen_numero_nf_like: {
        Args: { categoria_id: number }
        Returns: string
      }
      gera_parcelas_conta: {
        Args: { conta_id: number }
        Returns: undefined
      }
      gerar_contas_mes_atual: {
        Args: Record<PropertyKey, never>
        Returns: {
          conta_id: number
          mensagem: string
          nome: string
          recorrencia_id: number
          status: string
          valor_centavos: number
        }[]
      }
      gerar_contas_recorrentes: {
        Args: { p_ano?: number; p_mes?: number }
        Returns: {
          conta_id: number
          nome: string
          recorrencia_id: number
          status: string
          valor_centavos: number
        }[]
      }
      gtrgm_compress: {
        Args: { "": unknown }
        Returns: unknown
      }
      gtrgm_decompress: {
        Args: { "": unknown }
        Returns: unknown
      }
      gtrgm_in: {
        Args: { "": unknown }
        Returns: unknown
      }
      gtrgm_options: {
        Args: { "": unknown }
        Returns: undefined
      }
      gtrgm_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      is_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      pagar_parcela: {
        Args: {
          conta_bancaria_id: number
          forma_pagamento_id: number
          observacao_param?: string
          parcela_id: number
          valor_pago_centavos: number
        }
        Returns: undefined
      }
      pj_fin_listar_contas: {
        Args: { _fornecedor_id: number; _limit?: number }
        Returns: {
          conta_id: number
          created_at: string
          data_pagamento: string
          descricao: string
          num_parcelas: number
          numero_nota: string
          pago: boolean
          parcela_id: number
          parcela_num: number
          valor_parcela_centavos: number
          valor_total_centavos: number
          vencimento: string
        }[]
      }
      proximas_contas_recorrentes: {
        Args: { dias_antecedencia?: number }
        Returns: {
          categoria: string
          dia_vencimento: number
          dias_restantes: number
          filial: string
          fornecedor: string
          nome: string
          proxima_geracao: string
          recorrencia_id: number
          valor_esperado_centavos: number
        }[]
      }
      set_limit: {
        Args: { "": number }
        Returns: number
      }
      show_limit: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      show_trgm: {
        Args: { "": string }
        Returns: string[]
      }
      to_slug: {
        Args: { txt: string }
        Returns: string
      }
      unaccent: {
        Args: { "": string }
        Returns: string
      }
      unaccent_init: {
        Args: { "": unknown }
        Returns: unknown
      }
    }
    Enums: {
      app_role: "admin" | "user" | "rh"
      origem_movimentacao: "parcela" | "ajuste" | "importacao"
      status_pedido: "aberto" | "parcial" | "recebido" | "cancelado"
      tipo_categoria:
        | "materia_prima"
        | "consumo_interno"
        | "revenda"
        | "servico"
        | "outros"
        | "despesa"
        | "receita"
        | "transferencia"
      tipo_link: "pedido" | "foto" | "outro"
      tipo_movimentacao: "debito" | "credito"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "user", "rh"],
      origem_movimentacao: ["parcela", "ajuste", "importacao"],
      status_pedido: ["aberto", "parcial", "recebido", "cancelado"],
      tipo_categoria: [
        "materia_prima",
        "consumo_interno",
        "revenda",
        "servico",
        "outros",
        "despesa",
        "receita",
        "transferencia",
      ],
      tipo_link: ["pedido", "foto", "outro"],
      tipo_movimentacao: ["debito", "credito"],
    },
  },
} as const
