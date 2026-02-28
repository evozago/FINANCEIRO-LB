# 🔗 Documentação de Integração Externa - Gestor LB

Este documento descreve todas as formas de conectar sistemas externos ao projeto Gestor LB, incluindo acesso a dados (API REST), código-fonte (GitHub) e banco de dados direto.

---

## 📋 Índice

1. [API REST Externa](#1-api-rest-externa)
2. [Acesso ao Código-Fonte (GitHub)](#2-acesso-ao-código-fonte-github)
3. [Acesso Direto ao Banco de Dados](#3-acesso-direto-ao-banco-de-dados)
4. [Exemplos Práticos](#4-exemplos-práticos)
5. [Tabelas Disponíveis](#5-tabelas-disponíveis)

---

## 1. API REST Externa

### URL Base
```
https://yimrllhmdbuabvryvirn.supabase.co/functions/v1/external-api
```

### Autenticação
Toda requisição deve incluir a API Key no header:

```
x-api-key: <SUA_EXTERNAL_API_KEY>
```

Ou alternativamente:
```
Authorization: Bearer <SUA_EXTERNAL_API_KEY>
```

### Endpoints Disponíveis

#### 📊 Endpoints Especiais

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| `GET` | `/tables` | Lista todas as tabelas e views disponíveis |
| `GET` | `/stats` | Estatísticas gerais do sistema |
| `GET` | `/dashboard` | Dados resumidos do dashboard financeiro |
| `GET` | `/openapi` | Especificação OpenAPI (para ChatGPT Actions, etc.) |

#### 📦 CRUD em Tabelas

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| `GET` | `/{tabela}` | Lista registros (com paginação e filtros) |
| `GET` | `/{tabela}/{id}` | Busca registro por ID |
| `GET` | `/{tabela}/search?q=termo` | Busca textual em campos comuns |
| `POST` | `/{tabela}` | Cria um ou mais registros |
| `PUT` | `/{tabela}/{id}` | Atualiza um registro |
| `DELETE` | `/{tabela}/{id}` | Exclui um registro |

#### 🔍 Parâmetros de Listagem (GET)

| Parâmetro | Padrão | Descrição |
|-----------|--------|-----------|
| `limit` | `100` | Máximo de registros retornados |
| `offset` | `0` | Ponto de início para paginação |
| `order` | `id.desc` | Ordenação (`campo.asc` ou `campo.desc`) |
| `select` | `*` | Campos específicos a retornar |

#### 🎯 Filtros Avançados

Adicione filtros como query params com operadores:

| Operador | Exemplo | Descrição |
|----------|---------|-----------|
| `eq` | `?status=eq.pendente` | Igual a |
| `neq` | `?ativo=neq.false` | Diferente de |
| `gt` | `?valor_centavos=gt.10000` | Maior que |
| `gte` | `?id=gte.100` | Maior ou igual |
| `lt` | `?valor_centavos=lt.50000` | Menor que |
| `lte` | `?id=lte.50` | Menor ou igual |
| `like` | `?nome=like.João` | Contém (case-sensitive) |
| `ilike` | `?nome=ilike.maria` | Contém (case-insensitive) |
| `is` | `?pago=is.true` | É (para boolean/null) |

Sem operador = filtro exato: `?filial_id=1`

---

## 2. Acesso ao Código-Fonte (GitHub)

### Como Conectar
1. No editor Lovable, vá em **Settings → Connectors → GitHub**
2. Autorize o GitHub App da Lovable
3. Selecione a conta/organização GitHub
4. Clique em **Create Repository**

### Recursos
- **Sincronização bidirecional**: alterações no Lovable → GitHub e vice-versa
- **Branches**: suporte experimental (ativar em Account Settings → Labs)
- **Clone local**: clone o repo e edite com sua IDE preferida
- **CI/CD**: configure GitHub Actions para deploy automatizado

---

## 3. Acesso Direto ao Banco de Dados

### Como Acessar
Para ferramentas de BI (Metabase, Power BI, DBeaver, etc.), acesse a connection string:

1. No editor Lovable, abra a **view Cloud** (ícone na barra superior)
2. Navegue até **Database → Settings**
3. Copie a **connection string** PostgreSQL

### Formato da Connection String
```
postgresql://postgres.[project-ref]:[PASSWORD]@aws-1-sa-east-1.pooler.supabase.com:6543/postgres
```

### Segurança
- Use conexões **somente leitura** quando possível
- Nunca exponha a connection string em código público
- Para acesso programático, prefira a API REST

---

## 4. Exemplos Práticos

### cURL - Listar Fornecedores
```bash
curl -X GET \
  'https://yimrllhmdbuabvryvirn.supabase.co/functions/v1/external-api/pessoas_juridicas?limit=10&tipo=eq.fornecedor' \
  -H 'x-api-key: SUA_API_KEY'
```

### cURL - Criar Conta a Pagar
```bash
curl -X POST \
  'https://yimrllhmdbuabvryvirn.supabase.co/functions/v1/external-api/contas_pagar' \
  -H 'x-api-key: SUA_API_KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "descricao": "Conta de luz",
    "valor_total_centavos": 35000,
    "num_parcelas": 1,
    "categoria_id": 1
  }'
```

### cURL - Buscar Produtos
```bash
curl -X GET \
  'https://yimrllhmdbuabvryvirn.supabase.co/functions/v1/external-api/produtos/search?q=vestido&limit=20' \
  -H 'x-api-key: SUA_API_KEY'
```

### cURL - Dashboard Financeiro
```bash
curl -X GET \
  'https://yimrllhmdbuabvryvirn.supabase.co/functions/v1/external-api/dashboard' \
  -H 'x-api-key: SUA_API_KEY'
```

### Python
```python
import requests

API_URL = "https://yimrllhmdbuabvryvirn.supabase.co/functions/v1/external-api"
HEADERS = {"x-api-key": "SUA_API_KEY"}

# Listar contas a pagar pendentes
response = requests.get(
    f"{API_URL}/contas_pagar_parcelas",
    headers=HEADERS,
    params={"pago": "is.false", "order": "vencimento.asc", "limit": 50}
)
data = response.json()
print(f"Total pendente: {data['count']} parcelas")
```

### JavaScript/Node.js
```javascript
const API_URL = "https://yimrllhmdbuabvryvirn.supabase.co/functions/v1/external-api";
const API_KEY = "SUA_API_KEY";

// Buscar estatísticas
const res = await fetch(`${API_URL}/stats`, {
  headers: { "x-api-key": API_KEY }
});
const stats = await res.json();
console.log(`Valor pendente: ${stats.valor_pendente_formatado}`);
```

### ChatGPT Custom GPT
1. Acesse `/openapi` para obter a especificação OpenAPI
2. No ChatGPT, crie um GPT personalizado
3. Em **Actions**, cole a especificação OpenAPI
4. Configure a autenticação com a API Key

---

## 5. Tabelas Disponíveis

### Cadastros
| Tabela | Descrição |
|--------|-----------|
| `pessoas_juridicas` | Fornecedores, clientes PJ |
| `pessoas_fisicas` | Funcionários, pessoas físicas |
| `cargos` | Cargos dos funcionários |
| `filiais` | Filiais da empresa |
| `marcas` | Marcas de produtos |
| `vendedoras` | Vendedoras cadastradas |

### Financeiro
| Tabela | Descrição |
|--------|-----------|
| `contas_pagar` | Contas a pagar (cabeçalho) |
| `contas_pagar_parcelas` | Parcelas das contas |
| `contas_recorrentes` | Despesas recorrentes |
| `contas_bancarias` | Contas bancárias |
| `categorias_financeiras` | Categorias financeiras |
| `formas_pagamento` | Formas de pagamento |
| `fechamentos_caixa` | Fechamentos de caixa |
| `folha_pagamento_lancamentos` | Lançamentos de folha |

### Vendas
| Tabela | Descrição |
|--------|-----------|
| `vendas` | Registro de vendas |
| `metas_vendas` | Metas por vendedora/mês |

### Compras
| Tabela | Descrição |
|--------|-----------|
| `compras_pedidos` | Pedidos de compra |
| `compras_pedido_itens` | Itens dos pedidos |
| `compras_pedido_anexos` | Anexos dos pedidos |
| `compras_pedido_marcas` | Marcas dos pedidos |

### Produtos
| Tabela | Descrição |
|--------|-----------|
| `produtos` | Catálogo de produtos |
| `categorias_produtos` | Categorias de produtos |
| `referencias_produto` | Referências geradas |
| `variacoes_referencia` | Variações (cor/tamanho) |
| `regras_classificacao` | Regras do classificador |
| `sessoes_importacao` | Sessões de importação |
| `tipos_produto` | Tipos de produto |
| `generos_produto` | Gêneros (M/F/U) |
| `faixas_etarias_produto` | Faixas etárias |
| `atributos_customizados` | Atributos extras |
| `sequencial_referencias` | Controle de sequencial |

### Logística
| Tabela | Descrição |
|--------|-----------|
| `envios` | Envios e rastreamento |
| `entradas_nfe` | Entradas de NF-e |

### Impressão 3D
| Tabela | Descrição |
|--------|-----------|
| `print3d_produtos` | Produtos 3D |
| `print3d_materiais` | Materiais (filamento) |
| `print3d_impressoras` | Impressoras |
| `print3d_vendas` | Vendas 3D |
| `print3d_marketplaces` | Marketplaces |
| `print3d_estoque` | Estoque 3D |
| `print3d_parametros` | Parâmetros de custo |
| `print3d_produto_imagens` | Imagens dos produtos |

### Sistema
| Tabela | Descrição |
|--------|-----------|
| `role_modulos` | Permissões por role |

---

## ⚠️ Observações de Segurança

1. **Nunca exponha a `EXTERNAL_API_KEY`** em código público ou frontend
2. A API usa **service role** internamente — tem acesso total ao banco
3. Para integrações em produção, considere criar chaves separadas por sistema
4. Valores monetários são armazenados em **centavos** (ex: R$ 350,00 = 35000)
5. Datas seguem formato **ISO 8601** (YYYY-MM-DD ou YYYY-MM-DDTHH:mm:ss)
