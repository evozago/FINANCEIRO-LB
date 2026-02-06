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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      atributos_customizados: {
        Row: {
          ativo: boolean | null
          configuracao: Json | null
          created_at: string | null
          id: number
          nome: string
          tipo: string
          valores: string[] | null
        }
        Insert: {
          ativo?: boolean | null
          configuracao?: Json | null
          created_at?: string | null
          id?: number
          nome: string
          tipo: string
          valores?: string[] | null
        }
        Update: {
          ativo?: boolean | null
          configuracao?: Json | null
          created_at?: string | null
          id?: number
          nome?: string
          tipo?: string
          valores?: string[] | null
        }
        Relationships: []
      }
      cargos: {
        Row: {
          ativo: boolean | null
          created_at: string | null
          descricao: string | null
          id: number
          nome: string
        }
        Insert: {
          ativo?: boolean | null
          created_at?: string | null
          descricao?: string | null
          id?: number
          nome: string
        }
        Update: {
          ativo?: boolean | null
          created_at?: string | null
          descricao?: string | null
          id?: number
          nome?: string
        }
        Relationships: []
      }
      categorias_financeiras: {
        Row: {
          ativo: boolean | null
          cor: string | null
          created_at: string | null
          id: number
          nome: string
          tipo: string | null
        }
        Insert: {
          ativo?: boolean | null
          cor?: string | null
          created_at?: string | null
          id?: number
          nome: string
          tipo?: string | null
        }
        Update: {
          ativo?: boolean | null
          cor?: string | null
          created_at?: string | null
          id?: number
          nome?: string
          tipo?: string | null
        }
        Relationships: []
      }
      categorias_produtos: {
        Row: {
          ativo: boolean | null
          categoria_pai_id: number | null
          cor: string | null
          created_at: string | null
          descricao: string | null
          id: number
          nome: string
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean | null
          categoria_pai_id?: number | null
          cor?: string | null
          created_at?: string | null
          descricao?: string | null
          id?: number
          nome: string
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean | null
          categoria_pai_id?: number | null
          cor?: string | null
          created_at?: string | null
          descricao?: string | null
          id?: number
          nome?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "categorias_produtos_categoria_pai_id_fkey"
            columns: ["categoria_pai_id"]
            isOneToOne: false
            referencedRelation: "categorias_produtos"
            referencedColumns: ["id"]
          },
        ]
      }
      compras_pedido_anexos: {
        Row: {
          created_at: string | null
          descricao: string | null
          id: number
          nome_arquivo: string | null
          pedido_id: number | null
          storage_path: string | null
          tamanho_bytes: number | null
          tipo_anexo: string
          url_anexo: string
        }
        Insert: {
          created_at?: string | null
          descricao?: string | null
          id?: number
          nome_arquivo?: string | null
          pedido_id?: number | null
          storage_path?: string | null
          tamanho_bytes?: number | null
          tipo_anexo: string
          url_anexo: string
        }
        Update: {
          created_at?: string | null
          descricao?: string | null
          id?: number
          nome_arquivo?: string | null
          pedido_id?: number | null
          storage_path?: string | null
          tamanho_bytes?: number | null
          tipo_anexo?: string
          url_anexo?: string
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
          created_at: string | null
          descricao: string
          id: number
          pedido_id: number | null
          quantidade: number | null
          valor_total_centavos: number | null
          valor_unitario_centavos: number | null
        }
        Insert: {
          created_at?: string | null
          descricao: string
          id?: number
          pedido_id?: number | null
          quantidade?: number | null
          valor_total_centavos?: number | null
          valor_unitario_centavos?: number | null
        }
        Update: {
          created_at?: string | null
          descricao?: string
          id?: number
          pedido_id?: number | null
          quantidade?: number | null
          valor_total_centavos?: number | null
          valor_unitario_centavos?: number | null
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
      compras_pedido_marcas: {
        Row: {
          created_at: string | null
          id: number
          marca_id: number | null
          pedido_id: number | null
        }
        Insert: {
          created_at?: string | null
          id?: number
          marca_id?: number | null
          pedido_id?: number | null
        }
        Update: {
          created_at?: string | null
          id?: number
          marca_id?: number | null
          pedido_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "compras_pedido_marcas_marca_id_fkey"
            columns: ["marca_id"]
            isOneToOne: false
            referencedRelation: "marcas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compras_pedido_marcas_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "compras_pedidos"
            referencedColumns: ["id"]
          },
        ]
      }
      compras_pedidos: {
        Row: {
          condicoes_pagamento: string | null
          created_at: string | null
          data_entrega: string | null
          data_pedido: string | null
          desconto_centavos: number | null
          filial_id: number | null
          forma_pagamento_id: number | null
          fornecedor_id: number | null
          id: number
          negociacao: string | null
          numero_pedido: string | null
          observacoes: string | null
          status: string | null
          updated_at: string | null
          valor_total_centavos: number | null
        }
        Insert: {
          condicoes_pagamento?: string | null
          created_at?: string | null
          data_entrega?: string | null
          data_pedido?: string | null
          desconto_centavos?: number | null
          filial_id?: number | null
          forma_pagamento_id?: number | null
          fornecedor_id?: number | null
          id?: number
          negociacao?: string | null
          numero_pedido?: string | null
          observacoes?: string | null
          status?: string | null
          updated_at?: string | null
          valor_total_centavos?: number | null
        }
        Update: {
          condicoes_pagamento?: string | null
          created_at?: string | null
          data_entrega?: string | null
          data_pedido?: string | null
          desconto_centavos?: number | null
          filial_id?: number | null
          forma_pagamento_id?: number | null
          fornecedor_id?: number | null
          id?: number
          negociacao?: string | null
          numero_pedido?: string | null
          observacoes?: string | null
          status?: string | null
          updated_at?: string | null
          valor_total_centavos?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "compras_pedidos_filial_id_fkey"
            columns: ["filial_id"]
            isOneToOne: false
            referencedRelation: "filiais"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compras_pedidos_forma_pagamento_id_fkey"
            columns: ["forma_pagamento_id"]
            isOneToOne: false
            referencedRelation: "formas_pagamento"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compras_pedidos_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "pessoas_juridicas"
            referencedColumns: ["id"]
          },
        ]
      }
      contas_bancarias: {
        Row: {
          agencia: string | null
          ativo: boolean | null
          banco: string | null
          conta: string | null
          created_at: string | null
          id: number
          nome: string
          saldo_inicial_centavos: number | null
          tipo: string | null
        }
        Insert: {
          agencia?: string | null
          ativo?: boolean | null
          banco?: string | null
          conta?: string | null
          created_at?: string | null
          id?: number
          nome: string
          saldo_inicial_centavos?: number | null
          tipo?: string | null
        }
        Update: {
          agencia?: string | null
          ativo?: boolean | null
          banco?: string | null
          conta?: string | null
          created_at?: string | null
          id?: number
          nome?: string
          saldo_inicial_centavos?: number | null
          tipo?: string | null
        }
        Relationships: []
      }
      contas_pagar: {
        Row: {
          categoria_id: number | null
          created_at: string | null
          descricao: string | null
          filial_id: number | null
          fornecedor_id: number | null
          id: number
          num_parcelas: number | null
          numero_nota: string | null
          observacoes: string | null
          pessoa_fisica_id: number | null
          referencia: string | null
          updated_at: string | null
          valor_total_centavos: number
        }
        Insert: {
          categoria_id?: number | null
          created_at?: string | null
          descricao?: string | null
          filial_id?: number | null
          fornecedor_id?: number | null
          id?: number
          num_parcelas?: number | null
          numero_nota?: string | null
          observacoes?: string | null
          pessoa_fisica_id?: number | null
          referencia?: string | null
          updated_at?: string | null
          valor_total_centavos: number
        }
        Update: {
          categoria_id?: number | null
          created_at?: string | null
          descricao?: string | null
          filial_id?: number | null
          fornecedor_id?: number | null
          id?: number
          num_parcelas?: number | null
          numero_nota?: string | null
          observacoes?: string | null
          pessoa_fisica_id?: number | null
          referencia?: string | null
          updated_at?: string | null
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
          {
            foreignKeyName: "contas_pagar_pessoa_fisica_id_fkey"
            columns: ["pessoa_fisica_id"]
            isOneToOne: false
            referencedRelation: "pessoas_fisicas"
            referencedColumns: ["id"]
          },
        ]
      }
      contas_pagar_parcelas: {
        Row: {
          conta_bancaria_id: number | null
          conta_id: number | null
          created_at: string | null
          data_pagamento: string | null
          forma_pagamento_id: number | null
          id: number
          numero_parcela: number
          observacoes: string | null
          pago: boolean | null
          updated_at: string | null
          valor_centavos: number
          vencimento: string
        }
        Insert: {
          conta_bancaria_id?: number | null
          conta_id?: number | null
          created_at?: string | null
          data_pagamento?: string | null
          forma_pagamento_id?: number | null
          id?: number
          numero_parcela: number
          observacoes?: string | null
          pago?: boolean | null
          updated_at?: string | null
          valor_centavos: number
          vencimento: string
        }
        Update: {
          conta_bancaria_id?: number | null
          conta_id?: number | null
          created_at?: string | null
          data_pagamento?: string | null
          forma_pagamento_id?: number | null
          id?: number
          numero_parcela?: number
          observacoes?: string | null
          pago?: boolean | null
          updated_at?: string | null
          valor_centavos?: number
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
      contas_recorrentes: {
        Row: {
          ativo: boolean | null
          categoria_id: number | null
          created_at: string | null
          descricao: string
          dia_vencimento: number | null
          filial_id: number | null
          fornecedor_id: number | null
          id: number
          pessoa_fisica_id: number | null
          valor_centavos: number
        }
        Insert: {
          ativo?: boolean | null
          categoria_id?: number | null
          created_at?: string | null
          descricao: string
          dia_vencimento?: number | null
          filial_id?: number | null
          fornecedor_id?: number | null
          id?: number
          pessoa_fisica_id?: number | null
          valor_centavos: number
        }
        Update: {
          ativo?: boolean | null
          categoria_id?: number | null
          created_at?: string | null
          descricao?: string
          dia_vencimento?: number | null
          filial_id?: number | null
          fornecedor_id?: number | null
          id?: number
          pessoa_fisica_id?: number | null
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
            foreignKeyName: "contas_recorrentes_filial_id_fkey"
            columns: ["filial_id"]
            isOneToOne: false
            referencedRelation: "filiais"
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
            foreignKeyName: "contas_recorrentes_pessoa_fisica_id_fkey"
            columns: ["pessoa_fisica_id"]
            isOneToOne: false
            referencedRelation: "pessoas_fisicas"
            referencedColumns: ["id"]
          },
        ]
      }
      entradas_nfe: {
        Row: {
          chave_nfe: string
          created_at: string
          data_entrada: string
          id: number
        }
        Insert: {
          chave_nfe: string
          created_at?: string
          data_entrada?: string
          id?: number
        }
        Update: {
          chave_nfe?: string
          created_at?: string
          data_entrada?: string
          id?: number
        }
        Relationships: []
      }
      faixas_etarias_produto: {
        Row: {
          ativo: boolean | null
          codigo: string
          created_at: string | null
          id: number
          nome: string
        }
        Insert: {
          ativo?: boolean | null
          codigo: string
          created_at?: string | null
          id?: number
          nome: string
        }
        Update: {
          ativo?: boolean | null
          codigo?: string
          created_at?: string | null
          id?: number
          nome?: string
        }
        Relationships: []
      }
      fechamentos_caixa: {
        Row: {
          created_at: string | null
          data_fechamento: string
          filial_id: number | null
          id: number
          observacoes: string | null
          valor_cartao_centavos: number | null
          valor_dinheiro_centavos: number | null
          valor_outros_centavos: number | null
          valor_pix_centavos: number | null
        }
        Insert: {
          created_at?: string | null
          data_fechamento: string
          filial_id?: number | null
          id?: number
          observacoes?: string | null
          valor_cartao_centavos?: number | null
          valor_dinheiro_centavos?: number | null
          valor_outros_centavos?: number | null
          valor_pix_centavos?: number | null
        }
        Update: {
          created_at?: string | null
          data_fechamento?: string
          filial_id?: number | null
          id?: number
          observacoes?: string | null
          valor_cartao_centavos?: number | null
          valor_dinheiro_centavos?: number | null
          valor_outros_centavos?: number | null
          valor_pix_centavos?: number | null
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
      filiais: {
        Row: {
          ativo: boolean | null
          cnpj: string | null
          created_at: string | null
          endereco: string | null
          id: number
          nome: string
          telefone: string | null
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean | null
          cnpj?: string | null
          created_at?: string | null
          endereco?: string | null
          id?: number
          nome: string
          telefone?: string | null
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean | null
          cnpj?: string | null
          created_at?: string | null
          endereco?: string | null
          id?: number
          nome?: string
          telefone?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      folha_pagamento_lancamentos: {
        Row: {
          adiantamento_centavos: number | null
          ano: number
          conta_pagar_id: number | null
          created_at: string | null
          descontos_centavos: number | null
          id: number
          mes: number
          observacoes: string | null
          pessoa_fisica_id: number | null
          salario_centavos: number | null
          vale_transporte_centavos: number | null
        }
        Insert: {
          adiantamento_centavos?: number | null
          ano: number
          conta_pagar_id?: number | null
          created_at?: string | null
          descontos_centavos?: number | null
          id?: number
          mes: number
          observacoes?: string | null
          pessoa_fisica_id?: number | null
          salario_centavos?: number | null
          vale_transporte_centavos?: number | null
        }
        Update: {
          adiantamento_centavos?: number | null
          ano?: number
          conta_pagar_id?: number | null
          created_at?: string | null
          descontos_centavos?: number | null
          id?: number
          mes?: number
          observacoes?: string | null
          pessoa_fisica_id?: number | null
          salario_centavos?: number | null
          vale_transporte_centavos?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "folha_pagamento_lancamentos_conta_pagar_id_fkey"
            columns: ["conta_pagar_id"]
            isOneToOne: false
            referencedRelation: "contas_pagar"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "folha_pagamento_lancamentos_pessoa_fisica_id_fkey"
            columns: ["pessoa_fisica_id"]
            isOneToOne: false
            referencedRelation: "pessoas_fisicas"
            referencedColumns: ["id"]
          },
        ]
      }
      formas_pagamento: {
        Row: {
          ativo: boolean | null
          created_at: string | null
          id: number
          nome: string
        }
        Insert: {
          ativo?: boolean | null
          created_at?: string | null
          id?: number
          nome: string
        }
        Update: {
          ativo?: boolean | null
          created_at?: string | null
          id?: number
          nome?: string
        }
        Relationships: []
      }
      generos_produto: {
        Row: {
          ativo: boolean | null
          codigo: string
          created_at: string | null
          id: number
          nome: string
        }
        Insert: {
          ativo?: boolean | null
          codigo: string
          created_at?: string | null
          id?: number
          nome: string
        }
        Update: {
          ativo?: boolean | null
          codigo?: string
          created_at?: string | null
          id?: number
          nome?: string
        }
        Relationships: []
      }
      marcas: {
        Row: {
          ativo: boolean | null
          created_at: string | null
          descricao: string | null
          id: number
          nome: string
        }
        Insert: {
          ativo?: boolean | null
          created_at?: string | null
          descricao?: string | null
          id?: number
          nome: string
        }
        Update: {
          ativo?: boolean | null
          created_at?: string | null
          descricao?: string | null
          id?: number
          nome?: string
        }
        Relationships: []
      }
      metas_vendas: {
        Row: {
          ano: number
          created_at: string | null
          filial_id: number | null
          id: number
          mes: number
          valor_meta_centavos: number | null
          vendedora_id: number | null
        }
        Insert: {
          ano: number
          created_at?: string | null
          filial_id?: number | null
          id?: number
          mes: number
          valor_meta_centavos?: number | null
          vendedora_id?: number | null
        }
        Update: {
          ano?: number
          created_at?: string | null
          filial_id?: number | null
          id?: number
          mes?: number
          valor_meta_centavos?: number | null
          vendedora_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "metas_vendas_filial_id_fkey"
            columns: ["filial_id"]
            isOneToOne: false
            referencedRelation: "filiais"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "metas_vendas_vendedora_id_fkey"
            columns: ["vendedora_id"]
            isOneToOne: false
            referencedRelation: "vendedoras"
            referencedColumns: ["id"]
          },
        ]
      }
      pessoas_fisicas: {
        Row: {
          ativo: boolean | null
          cargo_id: number | null
          cpf: string | null
          created_at: string | null
          data_admissao: string | null
          data_nascimento: string | null
          email: string | null
          endereco: string | null
          filial_id: number | null
          id: number
          nome: string
          rg: string | null
          salario_centavos: number | null
          telefone: string | null
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean | null
          cargo_id?: number | null
          cpf?: string | null
          created_at?: string | null
          data_admissao?: string | null
          data_nascimento?: string | null
          email?: string | null
          endereco?: string | null
          filial_id?: number | null
          id?: number
          nome: string
          rg?: string | null
          salario_centavos?: number | null
          telefone?: string | null
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean | null
          cargo_id?: number | null
          cpf?: string | null
          created_at?: string | null
          data_admissao?: string | null
          data_nascimento?: string | null
          email?: string | null
          endereco?: string | null
          filial_id?: number | null
          id?: number
          nome?: string
          rg?: string | null
          salario_centavos?: number | null
          telefone?: string | null
          updated_at?: string | null
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
          ativo: boolean | null
          cep: string | null
          cidade: string | null
          cnpj: string | null
          created_at: string | null
          email: string | null
          endereco: string | null
          estado: string | null
          id: number
          ie: string | null
          nome_fantasia: string | null
          razao_social: string
          telefone: string | null
          tipo: string | null
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean | null
          cep?: string | null
          cidade?: string | null
          cnpj?: string | null
          created_at?: string | null
          email?: string | null
          endereco?: string | null
          estado?: string | null
          id?: number
          ie?: string | null
          nome_fantasia?: string | null
          razao_social: string
          telefone?: string | null
          tipo?: string | null
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean | null
          cep?: string | null
          cidade?: string | null
          cnpj?: string | null
          created_at?: string | null
          email?: string | null
          endereco?: string | null
          estado?: string | null
          id?: number
          ie?: string | null
          nome_fantasia?: string | null
          razao_social?: string
          telefone?: string | null
          tipo?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      produtos: {
        Row: {
          ativo: boolean | null
          atributos_extras: Json | null
          categoria_id: number | null
          classificado: boolean | null
          codigo: string | null
          confianca: number | null
          cor: string | null
          created_at: string | null
          custo_unitario_centavos: number | null
          estilo: string | null
          estoque: number | null
          faixa_etaria: string | null
          genero: string | null
          id: number
          marca: string | null
          material: string | null
          nome: string
          nome_original: string | null
          preco_centavos: number | null
          sessao_id: number | null
          subcategoria: string | null
          tamanho: string | null
          updated_at: string | null
          valor_venda_centavos: number | null
          variacao_1: string | null
          variacao_2: string | null
        }
        Insert: {
          ativo?: boolean | null
          atributos_extras?: Json | null
          categoria_id?: number | null
          classificado?: boolean | null
          codigo?: string | null
          confianca?: number | null
          cor?: string | null
          created_at?: string | null
          custo_unitario_centavos?: number | null
          estilo?: string | null
          estoque?: number | null
          faixa_etaria?: string | null
          genero?: string | null
          id?: number
          marca?: string | null
          material?: string | null
          nome: string
          nome_original?: string | null
          preco_centavos?: number | null
          sessao_id?: number | null
          subcategoria?: string | null
          tamanho?: string | null
          updated_at?: string | null
          valor_venda_centavos?: number | null
          variacao_1?: string | null
          variacao_2?: string | null
        }
        Update: {
          ativo?: boolean | null
          atributos_extras?: Json | null
          categoria_id?: number | null
          classificado?: boolean | null
          codigo?: string | null
          confianca?: number | null
          cor?: string | null
          created_at?: string | null
          custo_unitario_centavos?: number | null
          estilo?: string | null
          estoque?: number | null
          faixa_etaria?: string | null
          genero?: string | null
          id?: number
          marca?: string | null
          material?: string | null
          nome?: string
          nome_original?: string | null
          preco_centavos?: number | null
          sessao_id?: number | null
          subcategoria?: string | null
          tamanho?: string | null
          updated_at?: string | null
          valor_venda_centavos?: number | null
          variacao_1?: string | null
          variacao_2?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "produtos_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "categorias_produtos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "produtos_sessao_id_fkey"
            columns: ["sessao_id"]
            isOneToOne: false
            referencedRelation: "sessoes_importacao"
            referencedColumns: ["id"]
          },
        ]
      }
      referencias_produto: {
        Row: {
          ano: number
          ativo: boolean | null
          codigo_completo: string
          colecao: string | null
          created_at: string | null
          descricao: string | null
          faixa_etaria_id: number | null
          genero_id: number | null
          id: number
          marca_id: number | null
          mes: number
          sequencial: number
          tipo_id: number | null
          updated_at: string | null
        }
        Insert: {
          ano: number
          ativo?: boolean | null
          codigo_completo: string
          colecao?: string | null
          created_at?: string | null
          descricao?: string | null
          faixa_etaria_id?: number | null
          genero_id?: number | null
          id?: number
          marca_id?: number | null
          mes: number
          sequencial: number
          tipo_id?: number | null
          updated_at?: string | null
        }
        Update: {
          ano?: number
          ativo?: boolean | null
          codigo_completo?: string
          colecao?: string | null
          created_at?: string | null
          descricao?: string | null
          faixa_etaria_id?: number | null
          genero_id?: number | null
          id?: number
          marca_id?: number | null
          mes?: number
          sequencial?: number
          tipo_id?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "referencias_produto_faixa_etaria_id_fkey"
            columns: ["faixa_etaria_id"]
            isOneToOne: false
            referencedRelation: "faixas_etarias_produto"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referencias_produto_genero_id_fkey"
            columns: ["genero_id"]
            isOneToOne: false
            referencedRelation: "generos_produto"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referencias_produto_marca_id_fkey"
            columns: ["marca_id"]
            isOneToOne: false
            referencedRelation: "marcas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referencias_produto_tipo_id_fkey"
            columns: ["tipo_id"]
            isOneToOne: false
            referencedRelation: "tipos_produto"
            referencedColumns: ["id"]
          },
        ]
      }
      regras_classificacao: {
        Row: {
          ativo: boolean | null
          campo_destino: string
          campos_pesquisa: string[] | null
          categoria_id: number | null
          condicoes: Json | null
          created_at: string | null
          genero_automatico: string | null
          id: number
          nome: string
          ordem: number | null
          pontuacao: number | null
          termos: string[]
          termos_exclusao: string[] | null
          tipo: string
          valor_destino: string
        }
        Insert: {
          ativo?: boolean | null
          campo_destino: string
          campos_pesquisa?: string[] | null
          categoria_id?: number | null
          condicoes?: Json | null
          created_at?: string | null
          genero_automatico?: string | null
          id?: number
          nome: string
          ordem?: number | null
          pontuacao?: number | null
          termos: string[]
          termos_exclusao?: string[] | null
          tipo: string
          valor_destino: string
        }
        Update: {
          ativo?: boolean | null
          campo_destino?: string
          campos_pesquisa?: string[] | null
          categoria_id?: number | null
          condicoes?: Json | null
          created_at?: string | null
          genero_automatico?: string | null
          id?: number
          nome?: string
          ordem?: number | null
          pontuacao?: number | null
          termos?: string[]
          termos_exclusao?: string[] | null
          tipo?: string
          valor_destino?: string
        }
        Relationships: [
          {
            foreignKeyName: "regras_classificacao_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "categorias_produtos"
            referencedColumns: ["id"]
          },
        ]
      }
      sequencial_referencias: {
        Row: {
          ano: number
          created_at: string | null
          faixa_etaria_id: number | null
          genero_id: number | null
          id: number
          mes: number
          tipo_id: number | null
          ultimo_sequencial: number | null
          updated_at: string | null
        }
        Insert: {
          ano: number
          created_at?: string | null
          faixa_etaria_id?: number | null
          genero_id?: number | null
          id?: number
          mes: number
          tipo_id?: number | null
          ultimo_sequencial?: number | null
          updated_at?: string | null
        }
        Update: {
          ano?: number
          created_at?: string | null
          faixa_etaria_id?: number | null
          genero_id?: number | null
          id?: number
          mes?: number
          tipo_id?: number | null
          ultimo_sequencial?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sequencial_referencias_faixa_etaria_id_fkey"
            columns: ["faixa_etaria_id"]
            isOneToOne: false
            referencedRelation: "faixas_etarias_produto"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sequencial_referencias_genero_id_fkey"
            columns: ["genero_id"]
            isOneToOne: false
            referencedRelation: "generos_produto"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sequencial_referencias_tipo_id_fkey"
            columns: ["tipo_id"]
            isOneToOne: false
            referencedRelation: "tipos_produto"
            referencedColumns: ["id"]
          },
        ]
      }
      sessoes_importacao: {
        Row: {
          arquivo_mime_type: string | null
          arquivo_storage_path: string | null
          arquivo_tamanho_bytes: number | null
          classificados: number | null
          colunas_originais: string[] | null
          confianca_media: number | null
          created_at: string | null
          dados_originais: Json | null
          id: number
          mapeamento_colunas: Json | null
          nome: string
          nome_arquivo: string | null
          total_produtos: number | null
          updated_at: string | null
        }
        Insert: {
          arquivo_mime_type?: string | null
          arquivo_storage_path?: string | null
          arquivo_tamanho_bytes?: number | null
          classificados?: number | null
          colunas_originais?: string[] | null
          confianca_media?: number | null
          created_at?: string | null
          dados_originais?: Json | null
          id?: number
          mapeamento_colunas?: Json | null
          nome: string
          nome_arquivo?: string | null
          total_produtos?: number | null
          updated_at?: string | null
        }
        Update: {
          arquivo_mime_type?: string | null
          arquivo_storage_path?: string | null
          arquivo_tamanho_bytes?: number | null
          classificados?: number | null
          colunas_originais?: string[] | null
          confianca_media?: number | null
          created_at?: string | null
          dados_originais?: Json | null
          id?: number
          mapeamento_colunas?: Json | null
          nome?: string
          nome_arquivo?: string | null
          total_produtos?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      tipos_produto: {
        Row: {
          ativo: boolean | null
          categoria: string | null
          codigo: string
          created_at: string | null
          id: number
          nome: string
        }
        Insert: {
          ativo?: boolean | null
          categoria?: string | null
          codigo: string
          created_at?: string | null
          id?: number
          nome: string
        }
        Update: {
          ativo?: boolean | null
          categoria?: string | null
          codigo?: string
          created_at?: string | null
          id?: number
          nome?: string
        }
        Relationships: []
      }
      variacoes_referencia: {
        Row: {
          ativo: boolean | null
          codigo_barras: string | null
          codigo_variacao: string
          cor: string | null
          created_at: string | null
          id: number
          referencia_id: number | null
          sufixo_sequencial: number
          tamanho: string | null
        }
        Insert: {
          ativo?: boolean | null
          codigo_barras?: string | null
          codigo_variacao: string
          cor?: string | null
          created_at?: string | null
          id?: number
          referencia_id?: number | null
          sufixo_sequencial: number
          tamanho?: string | null
        }
        Update: {
          ativo?: boolean | null
          codigo_barras?: string | null
          codigo_variacao?: string
          cor?: string | null
          created_at?: string | null
          id?: number
          referencia_id?: number | null
          sufixo_sequencial?: number
          tamanho?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "variacoes_referencia_referencia_id_fkey"
            columns: ["referencia_id"]
            isOneToOne: false
            referencedRelation: "referencias_produto"
            referencedColumns: ["id"]
          },
        ]
      }
      vendas: {
        Row: {
          created_at: string | null
          data_venda: string | null
          filial_id: number | null
          forma_pagamento_id: number | null
          id: number
          observacoes: string | null
          valor_centavos: number | null
          vendedora_id: number | null
        }
        Insert: {
          created_at?: string | null
          data_venda?: string | null
          filial_id?: number | null
          forma_pagamento_id?: number | null
          id?: number
          observacoes?: string | null
          valor_centavos?: number | null
          vendedora_id?: number | null
        }
        Update: {
          created_at?: string | null
          data_venda?: string | null
          filial_id?: number | null
          forma_pagamento_id?: number | null
          id?: number
          observacoes?: string | null
          valor_centavos?: number | null
          vendedora_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "vendas_filial_id_fkey"
            columns: ["filial_id"]
            isOneToOne: false
            referencedRelation: "filiais"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendas_forma_pagamento_id_fkey"
            columns: ["forma_pagamento_id"]
            isOneToOne: false
            referencedRelation: "formas_pagamento"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendas_vendedora_id_fkey"
            columns: ["vendedora_id"]
            isOneToOne: false
            referencedRelation: "vendedoras"
            referencedColumns: ["id"]
          },
        ]
      }
      vendedoras: {
        Row: {
          ativo: boolean | null
          created_at: string | null
          id: number
          nome: string
          pessoa_fisica_id: number | null
        }
        Insert: {
          ativo?: boolean | null
          created_at?: string | null
          id?: number
          nome: string
          pessoa_fisica_id?: number | null
        }
        Update: {
          ativo?: boolean | null
          created_at?: string | null
          id?: number
          nome?: string
          pessoa_fisica_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "vendedoras_pessoa_fisica_id_fkey"
            columns: ["pessoa_fisica_id"]
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
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
