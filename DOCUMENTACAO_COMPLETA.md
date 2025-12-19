# 📊 FinControl - Documentação Técnica e Funcional Completa

**Versão:** 1.0.0  
**Data de Geração:** 19 de Dezembro de 2025  
**Plataforma:** React + Vite + Supabase  

---

## 📑 Índice

1. [Visão Geral do Sistema](#1-visão-geral-do-sistema)
2. [Arquitetura Técnica](#2-arquitetura-técnica)
3. [Módulo: Dashboard](#3-módulo-dashboard)
4. [Módulo: Cadastros](#4-módulo-cadastros)
5. [Módulo: Financeiro](#5-módulo-financeiro)
6. [Módulo: Vendas](#6-módulo-vendas)
7. [Módulo: Compras](#7-módulo-compras)
8. [Módulo: Relatórios](#8-módulo-relatórios)
9. [Edge Functions (Backend)](#9-edge-functions-backend)
10. [Banco de Dados](#10-banco-de-dados)
11. [Segurança e Permissões](#11-segurança-e-permissões)
12. [Hooks Customizados](#12-hooks-customizados)
13. [Componentes UI](#13-componentes-ui)
14. [Guia de Uso](#14-guia-de-uso)

---

## 1. Visão Geral do Sistema

### 1.1 Descrição
O **FinControl** é um sistema completo de gestão empresarial desenvolvido para controle financeiro, vendas, compras e cadastros. O sistema oferece uma interface moderna e responsiva, com funcionalidades avançadas de importação de dados e inteligência artificial.

### 1.2 Funcionalidades Principais
- ✅ Gestão completa de contas a pagar
- ✅ Importação automática de XML de Notas Fiscais Eletrônicas (NFe)
- ✅ Controle de vendas diárias por vendedora
- ✅ Gestão de metas e comissões
- ✅ Pedidos de compra com itens detalhados
- ✅ Dashboard analítico com métricas em tempo real
- ✅ Contas recorrentes com geração automática
- ✅ Integração com IA (Google Gemini) para extração de dados

### 1.3 Público-Alvo
- Gestores financeiros
- Administradores de lojas de varejo
- Equipes de compras
- Analistas de vendas

---

## 2. Arquitetura Técnica

### 2.1 Stack Tecnológico

| Camada | Tecnologia | Versão |
|--------|------------|--------|
| **Frontend** | React | 18.3.1 |
| **Build Tool** | Vite | Latest |
| **Linguagem** | TypeScript | 5.x |
| **Estilização** | Tailwind CSS | 3.x |
| **UI Components** | shadcn/ui | Latest |
| **Backend** | Supabase | Latest |
| **Banco de Dados** | PostgreSQL | 15.x |
| **State Management** | React Query | 5.x |
| **Roteamento** | React Router | 6.x |
| **Gráficos** | Recharts | 2.x |
| **IA** | Google Gemini | 2.5-flash |

### 2.2 Diagrama de Arquitetura

```
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND (React + Vite)                   │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────────┐ │
│  │ Dashboard│  │ Cadastros│  │Financeiro│  │ Vendas/Compras   │ │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────────┬─────────┘ │
│       │             │             │                  │           │
│  ┌────┴─────────────┴─────────────┴──────────────────┴─────────┐ │
│  │                    React Query (Cache + State)               │ │
│  └──────────────────────────────┬───────────────────────────────┘ │
└─────────────────────────────────┼───────────────────────────────┘
                                  │
                    ┌─────────────┴─────────────┐
                    │     SUPABASE CLIENT       │
                    └─────────────┬─────────────┘
                                  │
┌─────────────────────────────────┼───────────────────────────────┐
│                        BACKEND (Supabase)                        │
├─────────────────────────────────┼───────────────────────────────┤
│  ┌──────────────────────────────┴───────────────────────────────┐│
│  │                     PostgreSQL Database                       ││
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐   ││
│  │  │   Tables    │  │    Views    │  │   Functions/Triggers│   ││
│  │  └─────────────┘  └─────────────┘  └─────────────────────┘   ││
│  └──────────────────────────────────────────────────────────────┘│
│  ┌────────────────┐  ┌────────────────┐  ┌───────────────────┐  │
│  │ Edge Functions │  │  RLS Policies  │  │  Storage Buckets  │  │
│  └────────────────┘  └────────────────┘  └───────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                                  │
                    ┌─────────────┴─────────────┐
                    │    INTEGRAÇÕES EXTERNAS   │
                    │  ┌───────┐  ┌──────────┐  │
                    │  │Gemini │  │ NFe APIs │  │
                    │  │  AI   │  │          │  │
                    │  └───────┘  └──────────┘  │
                    └───────────────────────────┘
```

### 2.3 Estrutura de Diretórios

```
src/
├── components/           # Componentes reutilizáveis
│   ├── ui/              # Componentes shadcn/ui
│   ├── cadastros/       # Componentes de cadastros
│   ├── compras/         # Componentes de compras
│   ├── financeiro/      # Componentes financeiros
│   └── vendas/          # Componentes de vendas
├── hooks/               # Hooks customizados
├── integrations/        # Integrações (Supabase)
├── lib/                 # Utilitários
├── pages/               # Páginas da aplicação
│   ├── cadastros/       # Páginas de cadastros
│   ├── compras/         # Páginas de compras
│   ├── financeiro/      # Páginas financeiras
│   └── vendas/          # Páginas de vendas
└── assets/              # Recursos estáticos

supabase/
├── functions/           # Edge Functions
│   ├── gemini-chat/     # IA para extração de dados
│   └── processar-audio-despesa/
└── config.toml          # Configuração do Supabase
```

---

## 3. Módulo: Dashboard

### 3.1 Localização
- **Arquivo:** `src/pages/Dashboard.tsx`
- **Rota:** `/`

### 3.2 Funcionalidades

| Funcionalidade | Descrição |
|----------------|-----------|
| **Cards de Métricas** | Exibe vendas, contas a pagar, pedidos e crescimento |
| **Gráfico de Vendas** | Comparativo mensal com múltiplas séries |
| **Filtros** | Seleção por período e filial |
| **Atualização em Tempo Real** | Dados atualizados via React Query |

### 3.3 Métricas Exibidas

1. **Vendas do Mês**
   - Valor total líquido
   - Comparativo com mês anterior
   - Percentual de crescimento

2. **Contas a Pagar**
   - Total em aberto
   - Quantidade de parcelas pendentes
   - Próximos vencimentos

3. **Pedidos de Compra**
   - Total de pedidos abertos
   - Valor em pedidos
   - Status de entrega

4. **Crescimento YoY**
   - Comparativo ano a ano
   - Percentual de variação
   - Tendência

### 3.4 Consultas ao Banco

```sql
-- Vendas mensais por filial
SELECT * FROM vendas_mensal 
WHERE ano = ? AND mes = ?;

-- Contas a pagar em aberto
SELECT * FROM contas_pagar_abertas;

-- Crescimento ano a ano
SELECT * FROM crescimento_yoy;
```

---

## 4. Módulo: Cadastros

### 4.1 Pessoas Jurídicas (PJ)

#### 4.1.1 Localização
- **Arquivo:** `src/pages/cadastros/PessoasJuridicas.tsx`
- **Rota:** `/cadastros/pessoas-juridicas`
- **Detalhes:** `src/pages/cadastros/PessoaJuridicaDetalhes.tsx`

#### 4.1.2 Campos do Formulário

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `razao_social` | text | Sim | Razão social da empresa |
| `nome_fantasia` | text | Não | Nome fantasia |
| `cnpj` | text | Não | CNPJ formatado |
| `insc_estadual` | text | Não | Inscrição estadual |
| `email` | text | Não | E-mail de contato |
| `celular` | text | Não | Telefone/celular |
| `endereco` | text | Não | Endereço completo |
| `fundacao` | date | Não | Data de fundação |
| `categoria_id` | bigint | Não | Categoria financeira |

#### 4.1.3 Funcionalidades

- ✅ Listagem com busca por nome/CNPJ
- ✅ Criação via modal ou formulário dedicado
- ✅ Edição inline e em página de detalhes
- ✅ Exclusão com confirmação
- ✅ Vinculação de marcas à PJ
- ✅ Vinculação de representantes (PF)
- ✅ Histórico de contas a pagar
- ✅ Análise financeira do fornecedor

#### 4.1.4 Página de Detalhes

A página de detalhes (`/cadastros/pessoas-juridicas/:id`) exibe:

1. **Informações Gerais**
   - Dados cadastrais completos
   - Edição inline de campos

2. **Marcas Vinculadas**
   - Lista de marcas associadas
   - Adicionar/remover marcas

3. **Representantes**
   - Lista de pessoas físicas representantes
   - Adicionar/remover representantes

4. **Resumo Financeiro**
   - Total de compras
   - Valor em aberto
   - Histórico de pagamentos

5. **Histórico de Contas**
   - Lista de contas a pagar
   - Filtros por status
   - Navegação para detalhes

---

### 4.2 Pessoas Físicas (PF)

#### 4.2.1 Localização
- **Arquivo:** `src/pages/cadastros/PessoasFisicas.tsx`
- **Rota:** `/cadastros/pessoas-fisicas`
- **Detalhes:** `src/pages/cadastros/PessoaFisicaDetalhes.tsx`

#### 4.2.2 Campos do Formulário

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `nome_completo` | text | Sim | Nome completo |
| `cpf` | text | Não | CPF formatado |
| `email` | text | Não | E-mail |
| `celular` | text | Não | Telefone/celular |
| `endereco` | text | Não | Endereço |
| `nascimento` | date | Não | Data de nascimento |
| `cargo_id` | bigint | Não | Cargo/função |
| `filial_id` | bigint | Não | Filial de trabalho |
| `num_cadastro_folha` | text | Não | Número na folha de pagamento |

#### 4.2.3 Funcionalidades

- ✅ Listagem com busca
- ✅ Filtro por cargo e filial
- ✅ Criação/edição via modal
- ✅ Exclusão com confirmação
- ✅ Associação a salários
- ✅ Registro de férias
- ✅ Metas de vendas

---

### 4.3 Filiais

#### 4.3.1 Localização
- **Arquivo:** `src/pages/cadastros/Filiais.tsx`
- **Rota:** `/cadastros/filiais`

#### 4.3.2 Campos

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `nome` | text | Sim | Nome da filial |
| `pj_id` | bigint | Sim | PJ proprietária |

#### 4.3.3 Funcionalidades

- ✅ CRUD completo
- ✅ Vinculação a PJ
- ✅ Usado em filtros de vendas
- ✅ Base para fechamento de caixa

---

### 4.4 Cargos

#### 4.4.1 Localização
- **Arquivo:** `src/pages/cadastros/Cargos.tsx`
- **Rota:** `/cadastros/cargos`

#### 4.4.2 Campos

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `nome` | text | Sim | Nome do cargo |

#### 4.4.3 Funcionalidades

- ✅ CRUD simples
- ✅ Usado na associação com PF
- ✅ Exibido em listagens de funcionários

---

### 4.5 Marcas

#### 4.5.1 Localização
- **Arquivo:** `src/pages/cadastros/Marcas.tsx`
- **Rota:** `/cadastros/marcas`
- **Detalhes:** `src/pages/cadastros/MarcaDetalhes.tsx`

#### 4.5.2 Campos

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `nome` | text | Sim | Nome da marca |
| `descricao` | text | Não | Descrição |
| `pj_vinculada_id` | bigint | Não | PJ fabricante |

#### 4.5.3 Funcionalidades

- ✅ CRUD completo
- ✅ Vinculação a múltiplas PJs (fornecedores)
- ✅ Usado em pedidos de compra
- ✅ Página de detalhes com fornecedores

---

## 5. Módulo: Financeiro

### 5.1 Contas a Pagar

#### 5.1.1 Localização
- **Arquivo:** `src/pages/financeiro/ContasPagarSimple.tsx`
- **Rota:** `/financeiro/contas-pagar`

#### 5.1.2 Estrutura de Dados

**Tabela: `contas_pagar`**

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | bigint | ID único |
| `descricao` | text | Descrição da conta |
| `numero_nota` | text | Número da NF |
| `chave_nfe` | text | Chave de acesso NFe (44 dígitos) |
| `valor_total_centavos` | integer | Valor total em centavos |
| `num_parcelas` | integer | Número de parcelas |
| `fornecedor_id` | bigint | FK para pessoas_juridicas |
| `fornecedor_pf_id` | bigint | FK para pessoas_fisicas |
| `categoria_id` | bigint | FK para categorias_financeiras |
| `filial_id` | bigint | FK para filiais |
| `empresa_destinataria_id` | bigint | FK para PJ destinatária |
| `data_emissao` | date | Data de emissão |
| `referencia` | text | Referência/observação |
| `created_at` | timestamp | Data de criação |
| `updated_at` | timestamp | Data de atualização |

**Tabela: `contas_pagar_parcelas`**

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | bigint | ID único |
| `conta_id` | bigint | FK para contas_pagar |
| `parcela_num` | integer | Número da parcela |
| `valor_parcela_centavos` | integer | Valor da parcela |
| `vencimento` | date | Data de vencimento |
| `pago` | boolean | Status de pagamento |
| `pago_em` | date | Data do pagamento |
| `forma_pagamento_id` | bigint | FK para formas_pagamento |
| `conta_bancaria_id` | bigint | FK para contas_bancarias |
| `valor_pago_centavos` | integer | Valor efetivamente pago |
| `observacao` | text | Observações |

#### 5.1.3 Funcionalidades Detalhadas

##### A) Importação de XML NFe

**Fluxo de Importação:**

```
┌─────────────┐     ┌──────────────┐     ┌─────────────────┐
│  Upload XML │────▶│ Parse XML    │────▶│ Validar Dados   │
└─────────────┘     │ (DOMParser)  │     │ (chave, CNPJ)   │
                    └──────────────┘     └────────┬────────┘
                                                  │
                    ┌──────────────┐     ┌────────▼────────┐
                    │ Criar Conta  │◀────│ Buscar/Criar    │
                    │ + Parcelas   │     │ Fornecedor      │
                    └──────────────┘     └─────────────────┘
```

**Hook de Importação:** `src/hooks/useXMLImport.ts`

```typescript
// Dados extraídos do XML
interface XMLData {
  chaveNFe: string;        // 44 dígitos
  numeroNota: string;       // Número da NF
  dataEmissao: string;      // YYYY-MM-DD
  valorTotal: number;       // Valor em reais
  fornecedor: {
    cnpj: string;
    razaoSocial: string;
    nomeFantasia: string;
  };
  destinatario: {
    cnpj: string;
    razaoSocial: string;
  };
}
```

**Validações Implementadas:**
1. ✅ Verifica se XML já foi importado (chave_nfe)
2. ✅ Valida estrutura do XML
3. ✅ Extrai dados do fornecedor e destinatário
4. ✅ Cria fornecedor se não existir
5. ✅ Cria conta com parcela única
6. ✅ Verificação pós-inserção para confirmar persistência

##### B) Filtros Avançados

| Filtro | Tipo | Descrição |
|--------|------|-----------|
| **Busca Geral** | text | Busca por descrição, nota, fornecedor |
| **Busca por Valor** | number | Busca por valor exato ou aproximado |
| **Fornecedor PJ** | multi-select | Filtro por múltiplos fornecedores |
| **Fornecedor PF** | multi-select | Filtro por pessoas físicas |
| **Categoria** | multi-select | Filtro por categorias |
| **Status** | select | Todos/Pago/Em aberto |
| **Período** | date-range | Filtro por data de vencimento |
| **Filial** | select | Filtro por filial |

##### C) Colunas Configuráveis

O usuário pode mostrar/ocultar as seguintes colunas:

- ☑️ Número da Nota
- ☑️ Chave NFe
- ☑️ Fornecedor
- ☑️ Categoria
- ☑️ Filial
- ☑️ Vencimento
- ☑️ Valor
- ☑️ Status
- ☑️ Ações

##### D) Seleção e Ações em Massa

```typescript
// Estados de seleção
const [selectedParcelas, setSelectedParcelas] = useState<Set<number>>();

// Ações disponíveis
- Selecionar todas visíveis
- Selecionar todas do filtro
- Pagar selecionadas
- Editar selecionadas
- Excluir selecionadas
```

##### E) Pagamento de Parcelas

**Modal de Pagamento:**

| Campo | Tipo | Obrigatório |
|-------|------|-------------|
| Conta Bancária | select | Sim |
| Forma de Pagamento | select | Sim |
| Data do Pagamento | date | Sim |
| Valor Pago | currency | Sim |
| Observação | text | Não |

**Fluxo de Pagamento:**

```sql
-- 1. Atualizar parcela
UPDATE contas_pagar_parcelas 
SET pago = true, 
    pago_em = ?, 
    valor_pago_centavos = ?,
    forma_pagamento_id = ?,
    conta_bancaria_id = ?
WHERE id = ?;

-- 2. Criar movimentação (via trigger ou função)
INSERT INTO contas_movimentacoes 
(conta_bancaria_id, tipo, valor_centavos, origem, parcela_id)
VALUES (?, 'debito', ?, 'parcela', ?);

-- 3. Atualizar saldo da conta (via trigger)
```

---

### 5.2 Nova Conta a Pagar

#### 5.2.1 Localização
- **Arquivo:** `src/pages/financeiro/NovaContaPagar.tsx`
- **Rota:** `/financeiro/nova-conta`

#### 5.2.2 Campos do Formulário

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `descricao` | text | Sim | Descrição da despesa |
| `valor_total` | currency | Sim | Valor total |
| `fornecedor_id` | select | Não* | Fornecedor PJ |
| `fornecedor_pf_id` | select | Não* | Fornecedor PF |
| `categoria_id` | select | Não | Categoria |
| `filial_id` | select | Não | Filial |
| `num_parcelas` | number | Sim | Quantidade de parcelas |
| `primeiro_vencimento` | date | Sim | Data do 1º vencimento |
| `intervalo_dias` | number | Sim | Intervalo entre parcelas |

*Pelo menos um tipo de fornecedor é recomendado

#### 5.2.3 Preview de Parcelas

O sistema exibe uma prévia das parcelas antes de salvar:

```typescript
// Componente: src/components/financeiro/PreviewParcelas.tsx
interface ParcelaPreview {
  numero: number;
  vencimento: Date;
  valor: number;
}
```

---

### 5.3 Contas Recorrentes

#### 5.3.1 Localização
- **Arquivo:** `src/pages/financeiro/ContasRecorrentes.tsx`
- **Rota:** `/financeiro/contas-recorrentes`

#### 5.3.2 Estrutura de Dados

**Tabela: `recorrencias`**

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | bigint | ID único |
| `nome` | text | Nome/descrição |
| `valor_total_centavos` | integer | Valor mensal |
| `dia_vencimento` | integer | Dia do mês (1-31) |
| `tipo_frequencia` | text | mensal/semanal/diario |
| `intervalo_frequencia` | integer | Intervalo |
| `fornecedor_id` | bigint | FK para PJ |
| `fornecedor_pf_id` | bigint | FK para PF |
| `categoria_id` | bigint | FK para categoria |
| `filial_id` | bigint | FK para filial |
| `ativa` | boolean | Status ativo |
| `livre` | boolean | Modo livre |
| `sem_data_final` | boolean | Sem término |
| `dias_semana` | integer[] | Dias da semana (semanal) |
| `proxima_geracao` | date | Próxima data de geração |
| `ultimo_gerado_em` | date | Última geração |

#### 5.3.3 Funcionalidades

##### A) Criação de Recorrência

| Tipo | Descrição | Campos Extras |
|------|-----------|---------------|
| **Mensal** | Todo mês no dia X | `dia_vencimento` |
| **Semanal** | Dias da semana específicos | `dias_semana[]` |
| **Diário** | Todo dia útil | - |
| **Livre** | Intervalo customizado | `intervalo_frequencia` |

##### B) Geração de Contas

```sql
-- Função: gerar_contas_mes_atual()
-- Gera contas para todas as recorrências ativas do mês

SELECT * FROM gerar_contas_mes_atual();

-- Retorna:
-- recorrencia_id | conta_id | nome | valor_centavos | status | mensagem
```

##### C) Ações Disponíveis

- ✅ Criar nova recorrência
- ✅ Editar recorrência
- ✅ Ativar/Desativar
- ✅ Duplicar recorrência
- ✅ Gerar conta manualmente
- ✅ Excluir

---

### 5.4 Contas Bancárias

#### 5.4.1 Localização
- **Arquivo:** `src/pages/financeiro/ContasBancarias.tsx`
- **Rota:** `/financeiro/contas-bancarias`
- **Detalhes:** `src/pages/financeiro/ContaDetalhes.tsx`

#### 5.4.2 Estrutura de Dados

**Tabela: `contas_bancarias`**

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | bigint | ID único |
| `nome_conta` | text | Nome/apelido |
| `banco` | text | Nome do banco |
| `agencia` | text | Número da agência |
| `numero_conta` | text | Número da conta |
| `saldo_atual_centavos` | integer | Saldo atual |
| `ativa` | boolean | Status ativo |
| `pj_id` | bigint | FK para PJ titular |
| `pf_id` | integer | FK para PF titular |

**Tabela: `contas_movimentacoes`**

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | bigint | ID único |
| `conta_bancaria_id` | bigint | FK para conta |
| `tipo` | enum | 'debito' ou 'credito' |
| `valor_centavos` | integer | Valor da movimentação |
| `origem` | enum | 'parcela', 'ajuste', 'importacao' |
| `parcela_id` | bigint | FK para parcela (se origem='parcela') |
| `descricao` | text | Descrição |
| `created_at` | timestamp | Data/hora |

#### 5.4.3 Funcionalidades

- ✅ CRUD de contas bancárias
- ✅ Toggle de saldo visível/oculto
- ✅ Extrato de movimentações
- ✅ Ajuste manual de saldo
- ✅ Atualização automática via trigger

#### 5.4.4 Trigger de Saldo

```sql
-- Trigger: atualiza_saldo_conta
-- Atualiza saldo_atual_centavos automaticamente

CREATE FUNCTION atualiza_saldo_conta() 
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE contas_bancarias 
    SET saldo_atual_centavos = saldo_atual_centavos + 
      CASE 
        WHEN NEW.tipo = 'credito' THEN NEW.valor_centavos
        WHEN NEW.tipo = 'debito' THEN -NEW.valor_centavos
      END
    WHERE id = NEW.conta_bancaria_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

---

### 5.5 Categorias Financeiras

#### 5.5.1 Localização
- **Arquivo:** `src/pages/financeiro/Categorias.tsx`
- **Rota:** `/financeiro/categorias`

#### 5.5.2 Estrutura de Dados

**Tabela: `categorias_financeiras`**

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | bigint | ID único |
| `nome` | text | Nome da categoria |
| `slug` | text | Slug (gerado automaticamente) |
| `descricao` | text | Descrição |
| `cor` | varchar | Cor em hexadecimal |
| `tipo` | enum | Tipo da categoria |
| `parent_id` | bigint | Categoria pai (hierarquia) |
| `ordem` | integer | Ordem de exibição |
| `archived` | boolean | Arquivada |
| `calcula_por_dias_uteis` | boolean | Cálculo por dias úteis |
| `valor_por_dia_centavos` | integer | Valor por dia |

**Tipos de Categoria:**
- `materia_prima`
- `consumo_interno`
- `revenda`
- `servico`
- `despesa`
- `receita`
- `transferencia`
- `outros`

#### 5.5.3 Funcionalidades

- ✅ Árvore hierárquica de categorias
- ✅ Cores personalizadas
- ✅ Drag-and-drop para ordenação
- ✅ Mover para subcategoria
- ✅ Arquivar/desarquivar
- ✅ Cálculo automático por dias úteis

---

### 5.6 Fechamento de Caixa

#### 5.6.1 Localização
- **Arquivo:** `src/pages/financeiro/FechamentoCaixa.tsx`
- **Rota:** `/financeiro/fechamento-caixa`

#### 5.6.2 Campos

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `data_fechamento` | date | Data do fechamento |
| `filial_id` | bigint | Filial |
| `valor_sistema_*` | integer | Valores do sistema |
| `valor_conferido_*` | integer | Valores conferidos |
| `diferenca_*` | integer | Diferenças calculadas |
| `observacao` | text | Observações |

**Formas de Pagamento Monitoradas:**
- Dinheiro
- Débito
- Crédito
- PIX
- Boleto

---

## 6. Módulo: Vendas

### 6.1 Registrar Vendas

#### 6.1.1 Localização
- **Arquivo:** `src/pages/vendas/RegistrarVendas.tsx`
- **Rota:** `/vendas/registrar`

#### 6.1.2 Estrutura de Dados

**Tabela: `vendas_diarias`**

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | bigint | ID único |
| `data` | date | Data da venda |
| `vendedora_pf_id` | bigint | FK para vendedora |
| `filial_id` | bigint | FK para filial |
| `valor_bruto_centavos` | integer | Valor bruto |
| `desconto_centavos` | integer | Desconto aplicado |
| `valor_liquido_centavos` | integer | Valor líquido |
| `qtd_itens` | integer | Quantidade de itens |
| `atendimentos` | integer | Número de atendimentos |

#### 6.1.3 Métodos de Entrada

##### A) Entrada Manual

Formulário com campos:
- Data
- Vendedora
- Filial
- Valor Bruto
- Desconto
- Quantidade de Itens
- Atendimentos

##### B) Importação CSV/Excel

**Formato Esperado:**

| Coluna | Descrição |
|--------|-----------|
| data | Data (DD/MM/YYYY) |
| vendedora | Nome da vendedora |
| filial | Nome da filial |
| valor_bruto | Valor bruto |
| desconto | Valor do desconto |
| qtd_itens | Quantidade de itens |
| atendimentos | Número de atendimentos |

**Bibliotecas Utilizadas:**
- `papaparse` - Parse de CSV
- `xlsx` - Leitura de Excel

---

### 6.2 Vendas Mensais por Vendedora

#### 6.2.1 Localização
- **Arquivo:** `src/pages/vendas/VendasMensaisPorVendedora.tsx`
- **Rota:** `/vendas/vendas-mensais`

#### 6.2.2 View Utilizada

```sql
-- View: vendedoras_mensal_com_meta
CREATE VIEW vendedoras_mensal_com_meta AS
SELECT 
  v.vendedora_pf_id,
  pf.nome_completo as vendedora_nome,
  v.filial_id,
  f.nome as filial_nome,
  v.ano,
  v.mes,
  v.total_vendas,
  v.valor_bruto_total,
  v.desconto_total,
  v.valor_liquido_total,
  v.qtd_itens_total,
  v.ticket_medio,
  m.meta_centavos as meta_original,
  days_in_month(v.ano, v.mes) as dias_no_mes,
  ferias_dias_no_mes(v.vendedora_pf_id, v.ano, v.mes) as dias_ferias,
  days_in_month(v.ano, v.mes) - ferias_dias_no_mes(v.vendedora_pf_id, v.ano, v.mes) as dias_trabalhados,
  -- Meta ajustada proporcionalmente aos dias trabalhados
  ROUND(m.meta_centavos * (days_in_month(v.ano, v.mes) - ferias_dias_no_mes(v.vendedora_pf_id, v.ano, v.mes))::numeric / days_in_month(v.ano, v.mes), 0) as meta_ajustada,
  -- Percentual da meta atingido
  CASE 
    WHEN m.meta_centavos > 0 
    THEN ROUND(v.valor_liquido_total::numeric * 100 / (m.meta_centavos * (days_in_month(v.ano, v.mes) - ferias_dias_no_mes(v.vendedora_pf_id, v.ano, v.mes))::numeric / days_in_month(v.ano, v.mes)), 2)
    ELSE 0
  END as percentual_meta
FROM vendedoras_mensal v
LEFT JOIN pessoas_fisicas pf ON v.vendedora_pf_id = pf.id
LEFT JOIN filiais f ON v.filial_id = f.id
LEFT JOIN metas_vendedoras m ON m.vendedora_pf_id = v.vendedora_pf_id 
  AND m.ano = v.ano AND m.mes = v.mes;
```

#### 6.2.3 Funcionalidades

- ✅ Tabela com todas as vendedoras
- ✅ Filtro por mês/ano
- ✅ Filtro por filial
- ✅ Ordenação por colunas
- ✅ Indicador visual de meta (cores)
- ✅ Gráfico de barras comparativo

---

### 6.3 Metas de Vendas

#### 6.3.1 Localização
- **Arquivo:** `src/pages/vendas/Metas.tsx`
- **Rota:** `/vendas/metas`

#### 6.3.2 Estrutura de Dados

**Tabela: `metas_vendedoras`**

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | bigint | ID único |
| `vendedora_pf_id` | bigint | FK para vendedora |
| `ano` | integer | Ano da meta |
| `mes` | integer | Mês da meta |
| `meta_centavos` | integer | Valor da meta |

**Tabela: `ferias_vendedoras`**

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | bigint | ID único |
| `vendedora_pf_id` | bigint | FK para vendedora |
| `inicio` | date | Início das férias |
| `fim` | date | Fim das férias |
| `observacao` | text | Observações |

#### 6.3.3 Funcionalidades

- ✅ Definir meta mensal por vendedora
- ✅ Copiar metas de mês anterior
- ✅ Registrar períodos de férias
- ✅ Ajuste automático de meta por dias trabalhados

---

### 6.4 Dashboard Comparativo

#### 6.4.1 Localização
- **Arquivo:** `src/pages/vendas/DashboardComparativo.tsx`
- **Rota:** `/vendas/dashboard-comparativo`

#### 6.4.2 Métricas Exibidas

| Métrica | Descrição |
|---------|-----------|
| **Vendas Totais** | Soma de todas as vendas no período |
| **Ticket Médio** | Valor médio por atendimento |
| **Crescimento YoY** | Comparativo com mesmo período ano anterior |
| **Meta Geral** | Progresso da meta consolidada |

#### 6.4.3 Gráficos

- 📊 Gráfico de barras: Vendas por vendedora
- 📈 Gráfico de linhas: Evolução diária
- 🥧 Gráfico de pizza: Distribuição por filial

---

### 6.5 Simulador de Metas

#### 6.5.1 Localização
- **Arquivo:** `src/pages/vendas/SimuladorMetas.tsx`
- **Rota:** `/vendas/simulador-metas`

#### 6.5.2 Funcionalidades

- ✅ Simular cenários de vendas
- ✅ Calcular meta diária necessária
- ✅ Projeção de comissão
- ✅ Comparativo com histórico

---

## 7. Módulo: Compras

### 7.1 Pedidos de Compra

#### 7.1.1 Localização
- **Arquivo:** `src/pages/compras/Pedidos.tsx`
- **Rota:** `/compras/pedidos`

#### 7.1.2 Estrutura de Dados

**Tabela: `compras_pedidos`**

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | bigint | ID único |
| `numero_pedido` | text | Número do pedido |
| `data_pedido` | date | Data do pedido |
| `fornecedor_id` | bigint | FK para PJ |
| `marca_id` | bigint | FK para marca |
| `representante_pf_id` | bigint | FK para representante |
| `status` | enum | Status do pedido |
| `previsao_entrega` | date | Previsão de entrega |
| `quantidade_pecas` | integer | Total de peças |
| `quantidade_referencias` | integer | Qtd de referências |
| `valor_bruto_centavos` | integer | Valor bruto |
| `desconto_percentual` | numeric | % de desconto |
| `desconto_valor_centavos` | integer | Valor do desconto |
| `valor_liquido_centavos` | integer | Valor líquido |
| `preco_medio_centavos` | integer | Preço médio por peça |
| `observacoes` | text | Observações |

**Status do Pedido:**
- `aberto` - Pedido criado, aguardando
- `parcial` - Entrega parcial recebida
- `recebido` - Totalmente recebido
- `cancelado` - Pedido cancelado

**Tabela: `compras_pedido_itens`**

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | bigint | ID único |
| `pedido_id` | bigint | FK para pedido |
| `referencia` | text | Código de referência |
| `descricao` | text | Descrição do item |
| `qtd_pecas` | integer | Quantidade |
| `preco_unit_centavos` | integer | Preço unitário |
| `subtotal_centavos` | integer | Subtotal |

#### 7.1.3 Funcionalidades

- ✅ CRUD completo de pedidos
- ✅ Adição de itens ao pedido
- ✅ Cálculo automático de totais
- ✅ Workflow de status
- ✅ Anexos (fotos, PDFs)
- ✅ Links externos (pedido, fotos)
- ✅ Filtros avançados
- ✅ View resumida (`pedidos_compra_resumo`)

---

### 7.2 Importar XML (Compras)

#### 7.2.1 Localização
- **Arquivo:** `src/pages/compras/ImportarXMLNew.tsx`
- **Rota:** `/compras/importar-xml`

#### 7.2.2 Fluxo de Importação

```
┌────────────────┐
│ Upload de XML  │
└───────┬────────┘
        ▼
┌────────────────┐     ┌─────────────────┐
│  Parse XML     │────▶│ Detectar Tipo   │
│  (DOMParser)   │     │ (NFe/Pedido)    │
└────────────────┘     └───────┬─────────┘
                               ▼
              ┌────────────────┴────────────────┐
              │                                  │
              ▼                                  ▼
     ┌────────────────┐               ┌────────────────┐
     │ Criar Conta    │               │ Criar Pedido   │
     │ a Pagar        │               │ de Compra      │
     └────────────────┘               └────────────────┘
```

#### 7.2.3 Dados Extraídos

**De NFe:**
- Chave de acesso
- Número da nota
- Data de emissão
- Valor total
- Dados do emitente (fornecedor)
- Dados do destinatário (empresa)
- Itens da nota

**De Pedido:**
- Número do pedido
- Fornecedor
- Itens com quantidades e preços

---

## 8. Módulo: Relatórios

### 8.1 Localização
- **Arquivo:** `src/pages/Relatorios.tsx`
- **Rota:** `/relatorios`

### 8.2 Relatórios Disponíveis

| Relatório | Descrição | Exportação |
|-----------|-----------|------------|
| **Vendas por Período** | Vendas consolidadas | CSV |
| **Vendas por Vendedora** | Performance individual | CSV |
| **Contas a Pagar** | Lista de contas | CSV |
| **Fluxo de Caixa** | Entradas e saídas | CSV |
| **Análise de Fornecedores** | Ranking de fornecedores | CSV |

### 8.3 Views Utilizadas

```sql
-- View: fluxo_caixa
SELECT 
  nome_conta,
  banco,
  date_trunc('month', created_at) as mes,
  SUM(CASE WHEN tipo = 'credito' THEN valor_centavos ELSE 0 END) as entradas,
  SUM(CASE WHEN tipo = 'debito' THEN valor_centavos ELSE 0 END) as saidas,
  SUM(CASE WHEN tipo = 'credito' THEN valor_centavos ELSE -valor_centavos END) as saldo_periodo
FROM contas_movimentacoes m
JOIN contas_bancarias c ON m.conta_bancaria_id = c.id
GROUP BY nome_conta, banco, date_trunc('month', created_at);
```

---

## 9. Edge Functions (Backend)

### 9.1 gemini-chat

#### 9.1.1 Localização
- **Arquivo:** `supabase/functions/gemini-chat/index.ts`

#### 9.1.2 Propósito
Integração com Google Gemini AI para extração inteligente de dados financeiros a partir de texto natural.

#### 9.1.3 Endpoint
```
POST /functions/v1/gemini-chat
```

#### 9.1.4 Request Body
```json
{
  "prompt": "Paguei R$ 150,00 de luz em 15/12/2025 para a CEMIG"
}
```

#### 9.1.5 Response
```json
{
  "descricao": "Conta de energia elétrica",
  "valor_total": 150.00,
  "data_vencimento": "2025-12-15",
  "fornecedor_sugerido": "CEMIG",
  "categoria_sugerida": "Energia",
  "raw": "..."
}
```

#### 9.1.6 Prompt do Sistema
```
Você é um assistente financeiro de IA. Analise a entrada e extraia:
- Descrição da despesa
- Valor total
- Data de vencimento
- Fornecedor sugerido
- Empresa relacionada
- Categoria sugerida

Responda APENAS em JSON válido.
```

---

### 9.2 processar-audio-despesa

#### 9.2.1 Localização
- **Arquivo:** `supabase/functions/processar-audio-despesa/index.ts`

#### 9.2.2 Propósito
Processamento de áudio para transcrição e extração de dados de despesas via comando de voz.

---

## 10. Banco de Dados

### 10.1 Diagrama ER Simplificado

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│ pessoas_fisicas │     │pessoas_juridicas │     │     filiais     │
├─────────────────┤     ├──────────────────┤     ├─────────────────┤
│ id              │     │ id               │◀────│ pj_id           │
│ nome_completo   │     │ razao_social     │     │ nome            │
│ cargo_id        │────▶│ cnpj             │     └─────────────────┘
│ filial_id       │────▶│ categoria_id     │
└─────────────────┘     └──────────────────┘
        │                       │
        │                       │
        ▼                       ▼
┌─────────────────┐     ┌──────────────────┐
│  vendas_diarias │     │   contas_pagar   │
├─────────────────┤     ├──────────────────┤
│ vendedora_pf_id │     │ fornecedor_id    │
│ filial_id       │     │ categoria_id     │
│ valor_*         │     │ valor_total_*    │
└─────────────────┘     └────────┬─────────┘
                                 │
                                 ▼
                        ┌──────────────────┐
                        │contas_pagar_     │
                        │   parcelas       │
                        ├──────────────────┤
                        │ conta_id         │
                        │ vencimento       │
                        │ pago             │
                        └──────────────────┘
```

### 10.2 Views Principais

| View | Descrição |
|------|-----------|
| `vendas_mensal` | Vendas agregadas por mês/filial |
| `vendedoras_mensal` | Vendas por vendedora/mês |
| `vendedoras_mensal_com_meta` | Inclui metas e cálculos |
| `crescimento_yoy` | Comparativo ano a ano |
| `contas_pagar_abertas` | Contas com status de pagamento |
| `analise_fornecedores` | Análise financeira por fornecedor |
| `pedidos_compra_resumo` | Resumo de pedidos |
| `fluxo_caixa` | Movimentações bancárias |
| `vw_fin_resumo_por_fornecedor` | Resumo financeiro por PJ |

### 10.3 Funções SQL Principais

| Função | Descrição |
|--------|-----------|
| `gerar_contas_mes_atual()` | Gera contas de recorrências |
| `pagar_parcela()` | Registra pagamento + movimentação |
| `ferias_dias_no_mes()` | Calcula dias de férias no mês |
| `days_in_month()` | Retorna dias do mês |
| `gen_numero_nf_like()` | Gera número de NF automático |
| `is_admin()` | Verifica se usuário é admin |

---

## 11. Segurança e Permissões

### 11.1 Row Level Security (RLS)

O sistema utiliza RLS para controle de acesso em nível de linha.

#### 11.1.1 Roles

| Role | Descrição |
|------|-----------|
| `admin` | Acesso total |
| `user` | Acesso de leitura |
| `rh` | Acesso a dados de RH |

#### 11.1.2 Políticas Padrão

```sql
-- Exemplo: Política de leitura
CREATE POLICY "Authenticated can view" ON tabela
FOR SELECT
USING (auth.role() = 'authenticated');

-- Exemplo: Política de admin
CREATE POLICY "Admins can manage" ON tabela
FOR ALL
USING (is_admin());
```

### 11.2 Função is_admin()

```sql
CREATE FUNCTION is_admin() RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() AND role = 'admin'
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;
```

---

## 12. Hooks Customizados

### 12.1 useXMLImport

**Arquivo:** `src/hooks/useXMLImport.ts`

**Propósito:** Importação de arquivos XML de NFe.

**Principais Funções:**

| Função | Descrição |
|--------|-----------|
| `processarXML()` | Processa arquivo XML |
| `parseXMLContent()` | Extrai dados do XML |
| `buscarOuCriarFornecedor()` | Busca/cria PJ fornecedor |
| `criarContaPrincipal()` | Cria conta + parcela |

**Estados Retornados:**

```typescript
interface UseXMLImportReturn {
  isProcessing: boolean;
  importResults: ImportResult[];
  duplicateXMLs: string[];
  processarXML: (file: File) => Promise<void>;
  limparResultados: () => void;
}
```

---

### 12.2 usePersistentState

**Arquivo:** `src/hooks/usePersistentState.ts`

**Propósito:** Estado persistente em localStorage.

**Uso:**
```typescript
const [value, setValue] = usePersistentState('key', defaultValue);
```

---

### 12.3 useToast

**Arquivo:** `src/hooks/useToast.ts`

**Propósito:** Notificações toast.

**Uso:**
```typescript
const { toast } = useToast();
toast({ title: 'Sucesso', description: 'Operação realizada' });
```

---

## 13. Componentes UI

### 13.1 Componentes shadcn/ui Utilizados

| Componente | Uso |
|------------|-----|
| `Button` | Botões em geral |
| `Input` | Campos de texto |
| `Select` | Dropdowns |
| `Dialog` | Modais |
| `Table` | Tabelas de dados |
| `Card` | Cards de informação |
| `Tabs` | Abas |
| `Badge` | Etiquetas/status |
| `Calendar` | Seleção de data |
| `Checkbox` | Checkboxes |
| `Toast` | Notificações |
| `Tooltip` | Dicas |
| `Sheet` | Painéis laterais |
| `Popover` | Popovers |
| `Command` | Busca/comandos |

### 13.2 Componentes Customizados

| Componente | Localização | Descrição |
|------------|-------------|-----------|
| `CurrencyInput` | `ui/currency-input.tsx` | Input de valores monetários |
| `DatePicker` | `ui/date-picker.tsx` | Seletor de data |
| `DateRangePicker` | `ui/date-range-picker.tsx` | Seletor de período |
| `GradientCard` | `ui/gradient-card.tsx` | Card com gradiente |
| `StatsCard` | `ui/stats-card.tsx` | Card de estatísticas |
| `HighlightText` | `ui/highlight-text.tsx` | Texto com destaque |

---

## 14. Guia de Uso

### 14.1 Fluxo de Trabalho Recomendado

#### Início do Dia
1. Acessar Dashboard para visão geral
2. Verificar contas a pagar do dia
3. Processar recebimentos pendentes

#### Registro de Vendas
1. Acessar Vendas > Registrar
2. Inserir dados manualmente ou importar CSV
3. Verificar totais

#### Importação de NFe
1. Acessar Financeiro > Contas a Pagar
2. Clicar em "Importar XML"
3. Selecionar arquivos XML
4. Conferir dados extraídos
5. Confirmar importação

#### Pagamento de Contas
1. Filtrar contas por vencimento
2. Selecionar parcelas
3. Clicar em "Pagar Selecionadas"
4. Preencher dados do pagamento
5. Confirmar

### 14.2 Atalhos e Dicas

| Ação | Dica |
|------|------|
| **Busca rápida** | Use o campo de busca para filtrar qualquer tabela |
| **Multi-seleção** | Segure Ctrl/Cmd para selecionar múltiplos itens |
| **Exportar dados** | A maioria das tabelas permite exportar para CSV |
| **Colunas** | Clique no ícone de colunas para personalizar a visualização |

---

## 15. Changelog

### Versão 1.0.0 (Dezembro 2025)
- ✅ Release inicial
- ✅ Módulos: Dashboard, Cadastros, Financeiro, Vendas, Compras
- ✅ Importação de XML NFe
- ✅ Integração com Gemini AI
- ✅ Contas recorrentes
- ✅ Gestão de metas

---

## 16. Suporte e Contato

Para dúvidas ou sugestões sobre esta documentação, entre em contato com a equipe de desenvolvimento.

---

**Documento gerado automaticamente pelo FinControl**  
**© 2025 - Todos os direitos reservados**
