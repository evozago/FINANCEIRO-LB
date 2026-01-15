import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

const EXTERNAL_API_KEY = Deno.env.get('EXTERNAL_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || 'https://tntvymprraevwhmrcjio.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

// Tabelas permitidas para acesso externo
const ALLOWED_TABLES = [
  'bandeiras_cartao',
  'cargos',
  'categorias_financeiras',
  'categorias_pj',
  'compras_pedidos',
  'compras_pedido_itens',
  'compras_pedido_anexos',
  'contas_bancarias',
  'contas_movimentacoes',
  'contas_pagar',
  'contas_pagar_parcelas',
  'fechamentos_caixa',
  'ferias_vendedoras',
  'filiais',
  'folha_pagamento_lancamentos',
  'formas_pagamento',
  'ia_conhecimento',
  'marcas',
  'metas_vendedoras',
  'pessoas_fisicas',
  'pessoas_juridicas',
  'pj_marcas',
  'pj_representantes',
  'produtos',
  'produto_grades',
  'recorrencias',
  'salarios',
  'tamanhos',
  'cores',
  'taxas_bandeira',
  'vendas_diarias',
];

// Views disponíveis
const ALLOWED_VIEWS = [
  'contas_pagar_abertas',
  'analise_fornecedores',
  'fluxo_caixa',
  'vendas_mensal',
  'vendedoras_mensal',
  'crescimento_yoy',
];

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verificar API Key
    const apiKey = req.headers.get('x-api-key') || req.headers.get('authorization')?.replace('Bearer ', '');
    
    if (!apiKey || apiKey !== EXTERNAL_API_KEY) {
      return new Response(JSON.stringify({ 
        error: 'Unauthorized', 
        message: 'API Key inválida ou não fornecida. Use header x-api-key ou Authorization: Bearer <key>' 
      }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Criar cliente Supabase com service role (acesso total)
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY!);

    const url = new URL(req.url);
    const pathParts = url.pathname.split('/').filter(Boolean);
    
    // Remove 'external-api' do path se presente
    const basePath = pathParts[0] === 'external-api' ? pathParts.slice(1) : pathParts;
    
    // Rota: /openapi - retorna especificação OpenAPI
    if (basePath[0] === 'openapi' || basePath[0] === 'schema') {
      return new Response(JSON.stringify(getOpenAPISpec()), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Rota: /tables - lista tabelas disponíveis
    if (basePath[0] === 'tables') {
      return new Response(JSON.stringify({ 
        tables: ALLOWED_TABLES,
        views: ALLOWED_VIEWS,
        endpoints: {
          list: 'GET /{table}?limit=100&offset=0&order=id.desc',
          get: 'GET /{table}/{id}',
          create: 'POST /{table}',
          update: 'PUT /{table}/{id}',
          delete: 'DELETE /{table}/{id}',
          search: 'GET /{table}/search?q=termo&fields=campo1,campo2',
        }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Rota: /stats - estatísticas gerais
    if (basePath[0] === 'stats') {
      const stats = await getStats(supabase);
      return new Response(JSON.stringify(stats), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Rota: /dashboard - dados resumidos do dashboard
    if (basePath[0] === 'dashboard') {
      const dashboard = await getDashboardData(supabase);
      return new Response(JSON.stringify(dashboard), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Rota: /query - executa query SQL customizada (SELECT apenas)
    if (basePath[0] === 'query' && req.method === 'POST') {
      const { sql } = await req.json();
      
      // Validar que é apenas SELECT
      const sqlUpper = sql.trim().toUpperCase();
      if (!sqlUpper.startsWith('SELECT')) {
        return new Response(JSON.stringify({ 
          error: 'Apenas queries SELECT são permitidas' 
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      // Bloquear comandos perigosos
      const forbidden = ['DROP', 'DELETE', 'UPDATE', 'INSERT', 'ALTER', 'CREATE', 'TRUNCATE', 'GRANT', 'REVOKE'];
      for (const cmd of forbidden) {
        if (sqlUpper.includes(cmd)) {
          return new Response(JSON.stringify({ 
            error: `Comando ${cmd} não é permitido` 
          }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      }

      // Usar rpc para executar query - infelizmente Supabase não tem método direto
      // Vamos usar a API REST diretamente
      const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          'apikey': SUPABASE_SERVICE_ROLE_KEY!,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: sql }),
      });

      // Se não funcionar, retornar erro informativo
      return new Response(JSON.stringify({ 
        error: 'Query customizada não suportada diretamente. Use os endpoints de tabela.',
        suggestion: 'Use GET /{table} com parâmetros de filtro'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Extrair tabela e ID do path
    const tableName = basePath[0];
    const recordId = basePath[1];
    const action = basePath[2]; // para ações especiais como 'search'

    // Verificar se tabela é permitida
    if (!ALLOWED_TABLES.includes(tableName) && !ALLOWED_VIEWS.includes(tableName)) {
      return new Response(JSON.stringify({ 
        error: 'Tabela não encontrada',
        available_tables: ALLOWED_TABLES,
        available_views: ALLOWED_VIEWS,
      }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Processar por método HTTP
    switch (req.method) {
      case 'GET': {
        // Busca/Search
        if (recordId === 'search') {
          const searchTerm = url.searchParams.get('q') || '';
          const fields = url.searchParams.get('fields')?.split(',') || ['*'];
          const limit = parseInt(url.searchParams.get('limit') || '50');
          
          let query = supabase.from(tableName).select(fields.join(','));
          
          // Busca em campos de texto
          if (searchTerm) {
            const textFields = ['nome', 'razao_social', 'nome_fantasia', 'descricao', 'referencia', 'observacao'];
            const orConditions = textFields.map(f => `${f}.ilike.%${searchTerm}%`).join(',');
            query = query.or(orConditions);
          }
          
          const { data, error } = await query.limit(limit);
          
          if (error) {
            return new Response(JSON.stringify({ error: error.message }), {
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }
          
          return new Response(JSON.stringify({ data, count: data?.length || 0 }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // GET por ID
        if (recordId && recordId !== 'search') {
          const { data, error } = await supabase
            .from(tableName)
            .select('*')
            .eq('id', recordId)
            .single();

          if (error) {
            return new Response(JSON.stringify({ error: error.message }), {
              status: error.code === 'PGRST116' ? 404 : 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }

          return new Response(JSON.stringify({ data }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // GET lista com filtros
        const limit = parseInt(url.searchParams.get('limit') || '100');
        const offset = parseInt(url.searchParams.get('offset') || '0');
        const order = url.searchParams.get('order') || 'id.desc';
        const select = url.searchParams.get('select') || '*';
        
        let query = supabase.from(tableName).select(select, { count: 'exact' });
        
        // Aplicar filtros dos query params
        for (const [key, value] of url.searchParams.entries()) {
          if (['limit', 'offset', 'order', 'select'].includes(key)) continue;
          
          // Suportar operadores: eq, neq, gt, gte, lt, lte, like, ilike
          if (value.includes('.')) {
            const [op, val] = value.split('.');
            switch (op) {
              case 'eq': query = query.eq(key, val); break;
              case 'neq': query = query.neq(key, val); break;
              case 'gt': query = query.gt(key, val); break;
              case 'gte': query = query.gte(key, val); break;
              case 'lt': query = query.lt(key, val); break;
              case 'lte': query = query.lte(key, val); break;
              case 'like': query = query.like(key, `%${val}%`); break;
              case 'ilike': query = query.ilike(key, `%${val}%`); break;
              case 'is': query = query.is(key, val === 'null' ? null : val === 'true'); break;
              default: query = query.eq(key, value);
            }
          } else {
            query = query.eq(key, value);
          }
        }
        
        // Ordenação
        const [orderCol, orderDir] = order.split('.');
        query = query.order(orderCol, { ascending: orderDir !== 'desc' });
        
        // Paginação
        query = query.range(offset, offset + limit - 1);
        
        const { data, error, count } = await query;
        
        if (error) {
          return new Response(JSON.stringify({ error: error.message }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        return new Response(JSON.stringify({ 
          data, 
          count,
          limit,
          offset,
          hasMore: count ? offset + limit < count : false
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'POST': {
        // Verificar se é view (não permite insert)
        if (ALLOWED_VIEWS.includes(tableName)) {
          return new Response(JSON.stringify({ error: 'Views são somente leitura' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const body = await req.json();
        
        // Suportar insert em lote
        const records = Array.isArray(body) ? body : [body];
        
        const { data, error } = await supabase
          .from(tableName)
          .insert(records)
          .select();

        if (error) {
          return new Response(JSON.stringify({ error: error.message, details: error.details }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        return new Response(JSON.stringify({ data, created: data?.length || 0 }), {
          status: 201,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'PUT':
      case 'PATCH': {
        if (!recordId) {
          return new Response(JSON.stringify({ error: 'ID é obrigatório para atualização' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        if (ALLOWED_VIEWS.includes(tableName)) {
          return new Response(JSON.stringify({ error: 'Views são somente leitura' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const body = await req.json();
        
        const { data, error } = await supabase
          .from(tableName)
          .update(body)
          .eq('id', recordId)
          .select();

        if (error) {
          return new Response(JSON.stringify({ error: error.message }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        return new Response(JSON.stringify({ data }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'DELETE': {
        if (!recordId) {
          return new Response(JSON.stringify({ error: 'ID é obrigatório para exclusão' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        if (ALLOWED_VIEWS.includes(tableName)) {
          return new Response(JSON.stringify({ error: 'Views são somente leitura' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const { error } = await supabase
          .from(tableName)
          .delete()
          .eq('id', recordId);

        if (error) {
          return new Response(JSON.stringify({ error: error.message }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        return new Response(JSON.stringify({ deleted: true, id: recordId }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      default:
        return new Response(JSON.stringify({ error: 'Método não suportado' }), {
          status: 405,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

  } catch (error: unknown) {
    console.error('Error in external-api:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ 
      error: 'Internal server error', 
      message: errorMessage 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// Função para obter estatísticas
async function getStats(supabase: any) {
  const [
    { count: totalFornecedores },
    { count: totalContas },
    { count: totalParcelas },
    { count: totalProdutos },
    { count: totalVendas },
  ] = await Promise.all([
    supabase.from('pessoas_juridicas').select('*', { count: 'exact', head: true }),
    supabase.from('contas_pagar').select('*', { count: 'exact', head: true }),
    supabase.from('contas_pagar_parcelas').select('*', { count: 'exact', head: true }),
    supabase.from('produtos').select('*', { count: 'exact', head: true }),
    supabase.from('vendas_diarias').select('*', { count: 'exact', head: true }),
  ]);

  // Valores pendentes
  const { data: pendentes } = await supabase
    .from('contas_pagar_parcelas')
    .select('valor_parcela_centavos')
    .eq('pago', false);

  const totalPendente = pendentes?.reduce((sum: number, p: any) => sum + (p.valor_parcela_centavos || 0), 0) || 0;

  return {
    fornecedores: totalFornecedores || 0,
    contas_pagar: totalContas || 0,
    parcelas: totalParcelas || 0,
    produtos: totalProdutos || 0,
    vendas: totalVendas || 0,
    valor_pendente_centavos: totalPendente,
    valor_pendente_formatado: `R$ ${(totalPendente / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
  };
}

// Função para dados do dashboard
async function getDashboardData(supabase: any) {
  const hoje = new Date().toISOString().split('T')[0];
  const inicioMes = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
  const fimMes = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().split('T')[0];

  const [
    { data: vencidasHoje },
    { data: vencidasMes },
    { data: pagasMes },
    { data: vendasMes },
  ] = await Promise.all([
    supabase.from('contas_pagar_parcelas')
      .select('*, contas_pagar(descricao, pessoas_juridicas(razao_social))')
      .eq('pago', false)
      .lte('vencimento', hoje)
      .order('vencimento'),
    supabase.from('contas_pagar_parcelas')
      .select('valor_parcela_centavos, vencimento')
      .eq('pago', false)
      .gte('vencimento', inicioMes)
      .lte('vencimento', fimMes),
    supabase.from('contas_pagar_parcelas')
      .select('valor_pago_centavos, pago_em')
      .eq('pago', true)
      .gte('pago_em', inicioMes)
      .lte('pago_em', fimMes),
    supabase.from('vendas_diarias')
      .select('*')
      .gte('data', inicioMes)
      .lte('data', fimMes),
  ]);

  const totalVencidoHoje = vencidasHoje?.reduce((sum: number, p: any) => sum + (p.valor_parcela_centavos || 0), 0) || 0;
  const totalPendentesMes = vencidasMes?.reduce((sum: number, p: any) => sum + (p.valor_parcela_centavos || 0), 0) || 0;
  const totalPagoMes = pagasMes?.reduce((sum: number, p: any) => sum + (p.valor_pago_centavos || 0), 0) || 0;
  const totalVendasMes = vendasMes?.reduce((sum: number, v: any) => sum + (v.valor_centavos || 0), 0) || 0;

  return {
    data_referencia: hoje,
    periodo: { inicio: inicioMes, fim: fimMes },
    resumo: {
      vencidas_hoje: {
        quantidade: vencidasHoje?.length || 0,
        valor_centavos: totalVencidoHoje,
        valor_formatado: `R$ ${(totalVencidoHoje / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
      },
      pendentes_mes: {
        quantidade: vencidasMes?.length || 0,
        valor_centavos: totalPendentesMes,
        valor_formatado: `R$ ${(totalPendentesMes / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
      },
      pagas_mes: {
        quantidade: pagasMes?.length || 0,
        valor_centavos: totalPagoMes,
        valor_formatado: `R$ ${(totalPagoMes / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
      },
      vendas_mes: {
        quantidade: vendasMes?.length || 0,
        valor_centavos: totalVendasMes,
        valor_formatado: `R$ ${(totalVendasMes / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
      },
    },
    contas_vencidas: vencidasHoje?.slice(0, 10) || [],
  };
}

// Especificação OpenAPI para ChatGPT Actions
function getOpenAPISpec() {
  return {
    openapi: "3.1.0",
    info: {
      title: "Gestor Financeiro API",
      description: "API completa para acesso ao sistema de gestão financeira. Permite consultar, criar, atualizar e excluir dados de fornecedores, contas a pagar, vendas, produtos e mais.",
      version: "1.0.0",
    },
    servers: [
      {
        url: "https://tntvymprraevwhmrcjio.supabase.co/functions/v1/external-api",
        description: "Production API"
      }
    ],
    security: [
      { apiKey: [] }
    ],
    components: {
      securitySchemes: {
        apiKey: {
          type: "apiKey",
          in: "header",
          name: "x-api-key",
          description: "API Key para autenticação"
        }
      }
    },
    paths: {
      "/tables": {
        get: {
          operationId: "listTables",
          summary: "Lista todas as tabelas e views disponíveis",
          responses: {
            200: {
              description: "Lista de tabelas e endpoints disponíveis"
            }
          }
        }
      },
      "/stats": {
        get: {
          operationId: "getStats",
          summary: "Retorna estatísticas gerais do sistema",
          responses: {
            200: {
              description: "Estatísticas do sistema"
            }
          }
        }
      },
      "/dashboard": {
        get: {
          operationId: "getDashboard",
          summary: "Retorna dados resumidos do dashboard financeiro",
          responses: {
            200: {
              description: "Dados do dashboard"
            }
          }
        }
      },
      "/{table}": {
        get: {
          operationId: "listRecords",
          summary: "Lista registros de uma tabela",
          parameters: [
            { name: "table", in: "path", required: true, schema: { type: "string" }, description: "Nome da tabela" },
            { name: "limit", in: "query", schema: { type: "integer", default: 100 }, description: "Limite de registros" },
            { name: "offset", in: "query", schema: { type: "integer", default: 0 }, description: "Offset para paginação" },
            { name: "order", in: "query", schema: { type: "string", default: "id.desc" }, description: "Ordenação (campo.asc ou campo.desc)" },
            { name: "select", in: "query", schema: { type: "string", default: "*" }, description: "Campos a selecionar" }
          ],
          responses: {
            200: { description: "Lista de registros" }
          }
        },
        post: {
          operationId: "createRecord",
          summary: "Cria um novo registro",
          parameters: [
            { name: "table", in: "path", required: true, schema: { type: "string" } }
          ],
          requestBody: {
            content: {
              "application/json": {
                schema: { type: "object" }
              }
            }
          },
          responses: {
            201: { description: "Registro criado" }
          }
        }
      },
      "/{table}/{id}": {
        get: {
          operationId: "getRecord",
          summary: "Busca um registro por ID",
          parameters: [
            { name: "table", in: "path", required: true, schema: { type: "string" } },
            { name: "id", in: "path", required: true, schema: { type: "string" } }
          ],
          responses: {
            200: { description: "Registro encontrado" }
          }
        },
        put: {
          operationId: "updateRecord",
          summary: "Atualiza um registro",
          parameters: [
            { name: "table", in: "path", required: true, schema: { type: "string" } },
            { name: "id", in: "path", required: true, schema: { type: "string" } }
          ],
          requestBody: {
            content: {
              "application/json": {
                schema: { type: "object" }
              }
            }
          },
          responses: {
            200: { description: "Registro atualizado" }
          }
        },
        delete: {
          operationId: "deleteRecord",
          summary: "Exclui um registro",
          parameters: [
            { name: "table", in: "path", required: true, schema: { type: "string" } },
            { name: "id", in: "path", required: true, schema: { type: "string" } }
          ],
          responses: {
            200: { description: "Registro excluído" }
          }
        }
      },
      "/{table}/search": {
        get: {
          operationId: "searchRecords",
          summary: "Busca registros por termo",
          parameters: [
            { name: "table", in: "path", required: true, schema: { type: "string" } },
            { name: "q", in: "query", required: true, schema: { type: "string" }, description: "Termo de busca" },
            { name: "limit", in: "query", schema: { type: "integer", default: 50 } }
          ],
          responses: {
            200: { description: "Resultados da busca" }
          }
        }
      }
    }
  };
}
