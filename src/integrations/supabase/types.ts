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
          created_at: string
          id: number
          nome: string
          tipo: Database["public"]["Enums"]["tipo_categoria"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: number
          nome: string
          tipo?: Database["public"]["Enums"]["tipo_categoria"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: number
          nome?: string
          tipo?: Database["public"]["Enums"]["tipo_categoria"]
          updated_at?: string
        }
        Relationships: []
      }
      compras_pedido_anexos: {
        Row: {
          arquivo_path: string
          descricao: string | null
          id: number
          mime_type: string | null
          pedido_id: number
          uploaded_at: string
        }
        Insert: {
          arquivo_path: string
          descricao?: string | null
          id?: number
          mime_type?: string | null
          pedido_id: number
          uploaded_at?: string
        }
        Update: {
          arquivo_path?: string
          descricao?: string | null
          id?: number
          mime_type?: string | null
          pedido_id?: number
          uploaded_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "compras_pedido_anexos_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "compras_pedidos"
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
          numero: string
          observacoes: string | null
          preco_medio_centavos: number | null
          previsao_entrega: string | null
          qtd_pecas_total: number | null
          qtd_referencias: number | null
          representante_pf_id: number | null
          status: Database["public"]["Enums"]["status_pedido"]
          updated_at: string
          valor_bruto_centavos: number | null
          valor_liquido_centavos: number | null
        }
        Insert: {
          created_at?: string
          data_pedido: string
          desconto_percentual?: number | null
          desconto_valor_centavos?: number | null
          fornecedor_id: number
          id?: number
          marca_id?: number | null
          numero: string
          observacoes?: string | null
          preco_medio_centavos?: number | null
          previsao_entrega?: string | null
          qtd_pecas_total?: number | null
          qtd_referencias?: number | null
          representante_pf_id?: number | null
          status?: Database["public"]["Enums"]["status_pedido"]
          updated_at?: string
          valor_bruto_centavos?: number | null
          valor_liquido_centavos?: number | null
        }
        Update: {
          created_at?: string
          data_pedido?: string
          desconto_percentual?: number | null
          desconto_valor_centavos?: number | null
          fornecedor_id?: number
          id?: number
          marca_id?: number | null
          numero?: string
          observacoes?: string | null
          preco_medio_centavos?: number | null
          previsao_entrega?: string | null
          qtd_pecas_total?: number | null
          qtd_referencias?: number | null
          representante_pf_id?: number | null
          status?: Database["public"]["Enums"]["status_pedido"]
          updated_at?: string
          valor_bruto_centavos?: number | null
          valor_liquido_centavos?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "compras_pedidos_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "pessoas_juridicas"
            referencedColumns: ["id"]
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
          pj_id: number
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
          pj_id: number
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
          pj_id?: number
          saldo_atual_centavos?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contas_bancarias_pj_id_fkey"
            columns: ["pj_id"]
            isOneToOne: false
            referencedRelation: "pessoas_juridicas"
            referencedColumns: ["id"]
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
          categoria_id: number
          chave_nfe: string | null
          created_at: string
          descricao: string | null
          filial_id: number
          fornecedor_id: number
          id: number
          num_parcelas: number
          numero_nota: string | null
          referencia: string | null
          updated_at: string
          valor_total_centavos: number
        }
        Insert: {
          categoria_id: number
          chave_nfe?: string | null
          created_at?: string
          descricao?: string | null
          filial_id: number
          fornecedor_id: number
          id?: number
          num_parcelas: number
          numero_nota?: string | null
          referencia?: string | null
          updated_at?: string
          valor_total_centavos: number
        }
        Update: {
          categoria_id?: number
          chave_nfe?: string | null
          created_at?: string
          descricao?: string | null
          filial_id?: number
          fornecedor_id?: number
          id?: number
          num_parcelas?: number
          numero_nota?: string | null
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
            referencedRelation: "pessoas_juridicas"
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
            foreignKeyName: "contas_pagar_parcelas_forma_pagamento_id_fkey"
            columns: ["forma_pagamento_id"]
            isOneToOne: false
            referencedRelation: "formas_pagamento"
            referencedColumns: ["id"]
          },
        ]
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
            referencedRelation: "pessoas_juridicas"
            referencedColumns: ["id"]
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
          id: number
          nome: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: number
          nome: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: number
          nome?: string
          updated_at?: string
        }
        Relationships: []
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
          cpf: string
          created_at: string
          email: string | null
          endereco: string | null
          filial_id: number | null
          id: number
          nascimento: string | null
          nome_completo: string
          num_cadastro_folha: string
          updated_at: string
        }
        Insert: {
          cargo_id?: number | null
          celular?: string | null
          cpf: string
          created_at?: string
          email?: string | null
          endereco?: string | null
          filial_id?: number | null
          id?: number
          nascimento?: string | null
          nome_completo: string
          num_cadastro_folha: string
          updated_at?: string
        }
        Update: {
          cargo_id?: number | null
          celular?: string | null
          cpf?: string
          created_at?: string
          email?: string | null
          endereco?: string | null
          filial_id?: number | null
          id?: number
          nascimento?: string | null
          nome_completo?: string
          num_cadastro_folha?: string
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
          celular: string | null
          cnpj: string | null
          created_at: string
          email: string | null
          endereco: string | null
          fundacao: string | null
          id: number
          insc_estadual: string | null
          nome_fantasia: string | null
          razao_social: string
          updated_at: string
        }
        Insert: {
          celular?: string | null
          cnpj?: string | null
          created_at?: string
          email?: string | null
          endereco?: string | null
          fundacao?: string | null
          id?: number
          insc_estadual?: string | null
          nome_fantasia?: string | null
          razao_social: string
          updated_at?: string
        }
        Update: {
          celular?: string | null
          cnpj?: string | null
          created_at?: string
          email?: string | null
          endereco?: string | null
          fundacao?: string | null
          id?: number
          insc_estadual?: string | null
          nome_fantasia?: string | null
          razao_social?: string
          updated_at?: string
        }
        Relationships: []
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
            referencedRelation: "pessoas_juridicas"
            referencedColumns: ["id"]
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
            referencedRelation: "pessoas_juridicas"
            referencedColumns: ["id"]
          },
        ]
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
          categoria_id: number
          created_at: string
          dia_fechamento: number | null
          dia_vencimento: number | null
          filial_id: number
          fornecedor_id: number | null
          id: number
          livre: boolean
          nome: string
          sem_data_final: boolean
          updated_at: string
          valor_esperado_centavos: number
        }
        Insert: {
          ativa?: boolean
          categoria_id: number
          created_at?: string
          dia_fechamento?: number | null
          dia_vencimento?: number | null
          filial_id: number
          fornecedor_id?: number | null
          id?: number
          livre?: boolean
          nome: string
          sem_data_final?: boolean
          updated_at?: string
          valor_esperado_centavos?: number
        }
        Update: {
          ativa?: boolean
          categoria_id?: number
          created_at?: string
          dia_fechamento?: number | null
          dia_vencimento?: number | null
          filial_id?: number
          fornecedor_id?: number | null
          id?: number
          livre?: boolean
          nome?: string
          sem_data_final?: boolean
          updated_at?: string
          valor_esperado_centavos?: number
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
            referencedRelation: "pessoas_juridicas"
            referencedColumns: ["id"]
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
      [_ in never]: never
    }
    Functions: {
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
      ],
      tipo_link: ["pedido", "foto", "outro"],
      tipo_movimentacao: ["debito", "credito"],
    },
  },
} as const
