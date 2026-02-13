import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const SOAP_ENDPOINT = 'https://edi.totalexpress.com.br/webservice24.php';
const FRETE_ENDPOINT = 'https://edi.totalexpress.com.br/webservice_calculo_frete_v2.php';
const SMARTLABEL_ENDPOINT = 'https://apis.totalexpress.com.br/ics-edi-lv/v1/coleta/smartlabel/registrar';
const TRACKING_REST_ENDPOINT = 'https://apis.totalexpress.com.br/ics-tracking-encomenda-lv/v1/tracking';

function getCredentials() {
  const user = Deno.env.get('TOTAL_EXPRESS_USER');
  const password = Deno.env.get('TOTAL_EXPRESS_PASSWORD');
  const cnpj = Deno.env.get('TOTAL_EXPRESS_CNPJ');
  const reid = Deno.env.get('TOTAL_EXPRESS_REID');
  if (!user || !password || !cnpj || !reid) {
    throw new Error('Credenciais da Total Express não configuradas');
  }
  return { user, password, cnpj, reid };
}

function getRestCredentials() {
  const user = Deno.env.get('TOTAL_EXPRESS_REST_USER') || Deno.env.get('TOTAL_EXPRESS_USER');
  const password = Deno.env.get('TOTAL_EXPRESS_REST_PASSWORD') || Deno.env.get('TOTAL_EXPRESS_PASSWORD');
  if (!user || !password) {
    throw new Error('Credenciais REST da Total Express não configuradas');
  }
  return { user, password };
}

function basicAuth(user: string, password: string): string {
  return 'Basic ' + btoa(`${user}:${password}`);
}

function getTagText(xmlText: string, tagName: string): string {
  const regex = new RegExp(`<${tagName}[^>]*>([^<]*)</${tagName}>`, 'i');
  const match = xmlText.match(regex);
  return match?.[1]?.trim() || '';
}

function getAllTagContents(xmlText: string, tagName: string): string[] {
  const regex = new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)</${tagName}>`, 'gi');
  const results: string[] = [];
  let match;
  while ((match = regex.exec(xmlText)) !== null) {
    results.push(match[1]);
  }
  return results;
}

// ===== CALCULAR FRETE (SOAP) =====
// Manual: TipoServico é string "EXP" ou "STD", ValorDeclarado em reais com vírgula
async function calcularFreteSingle(params: {
  cep_destino: string;
  peso: number;
  valor_declarado: number;
  tipo_servico: string;
  tipo_entrega?: number;
  altura?: number;
  largura?: number;
  profundidade?: number;
}) {
  const creds = getCredentials();
  const tipoEntrega = params.tipo_entrega ?? 0;

  const soapBody = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xmlns:xsd="http://www.w3.org/2001/XMLSchema"
  xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"
  xmlns:urn="urn:calcularFrete">
  <soapenv:Header/>
  <soapenv:Body>
    <urn:calcularFrete soapenv:encodingStyle="http://schemas.xmlsoap.org/soap/encoding/">
      <calcularFreteRequest xsi:type="web:calcularFreteRequest"
        xmlns:web="http://edi.totalexpress.com.br/soap/webservice_calculo_frete.total">
        <TipoServico xsi:type="xsd:string">${params.tipo_servico}</TipoServico>
        <CepDestino xsi:type="xsd:nonNegativeInteger">${params.cep_destino.replace(/\D/g, '')}</CepDestino>
        <Peso xsi:type="xsd:string">${params.peso.toFixed(2).replace('.', ',')}</Peso>
        <ValorDeclarado xsi:type="xsd:string">${(params.valor_declarado / 100).toFixed(2).replace('.', ',')}</ValorDeclarado>
        <TipoEntrega xsi:type="xsd:nonNegativeInteger">${tipoEntrega}</TipoEntrega>
        ${params.altura ? `<Altura xsi:type="xsd:nonNegativeInteger">${params.altura}</Altura>` : ''}
        ${params.largura ? `<Largura xsi:type="xsd:nonNegativeInteger">${params.largura}</Largura>` : ''}
        ${params.profundidade ? `<Profundidade xsi:type="xsd:nonNegativeInteger">${params.profundidade}</Profundidade>` : ''}
      </calcularFreteRequest>
    </urn:calcularFrete>
  </soapenv:Body>
</soapenv:Envelope>`;

  const response = await fetch(FRETE_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'text/xml; charset=utf-8',
      'Authorization': basicAuth(creds.user, creds.password),
      'User-Agent': 'LovableApp/1.0',
    },
    body: soapBody,
  });

  const xmlText = await response.text();
  console.log(`Frete response (tipo=${params.tipo_servico}):`, xmlText.substring(0, 500));

  const codigoProc = getTagText(xmlText, 'CodigoProc');

  if (codigoProc !== '1') {
    const erro = getTagText(xmlText, 'ErroConsultaFrete') || getTagText(xmlText, 'Erro') || 'Erro no cálculo de frete';
    return { success: false, error: `código ${codigoProc}: ${erro}` };
  }

  const prazo = getTagText(xmlText, 'Prazo');
  const valorServico = getTagText(xmlText, 'ValorServico');
  const rota = getTagText(xmlText, 'Rota');

  return {
    success: true,
    data: {
      prazo_dias: parseInt(prazo) || 0,
      valor_centavos: Math.round(parseFloat(valorServico.replace(',', '.')) * 100),
      valor_formatado: `R$ ${valorServico}`,
      rota,
      tipo_servico: params.tipo_servico,
    },
  };
}

async function calcularFrete(params: {
  cep_destino: string;
  peso: number;
  valor_declarado: number;
  tipo_servico?: string;
  tipo_entrega?: number;
  altura?: number;
  largura?: number;
  profundidade?: number;
}) {
  const tipoServico = params.tipo_servico || 'EXP';
  const result = await calcularFreteSingle({ ...params, tipo_servico: tipoServico });
  if (result.success) return result.data;
  throw new Error(`Erro Total Express (${result.error})`);
}

// ===== REGISTRAR COLETA (SOAP) =====
// Manual: TipoServico é numérico: 1=Standard, 7=Super Expresso
// Default changed to 7 (Expresso) per manual specification
async function registrarColeta(params: {
  cod_remessa?: string;
  pedido: string;
  tipo_servico?: number;
  tipo_entrega?: number;
  cond_frete?: string;
  volumes?: number;
  peso?: number;
  dest_nome: string;
  dest_cpf_cnpj: string;
  dest_endereco: string;
  dest_numero: string;
  dest_complemento?: string;
  dest_bairro: string;
  dest_cidade: string;
  dest_estado: string;
  dest_cep: string;
  dest_email?: string;
  dest_telefone?: string;
  dest_ddd?: string;
  natureza?: string;
  isencao_icms?: number;
  nfe_numero?: string;
  nfe_serie?: string;
  nfe_data?: string;
  nfe_val_total?: number;
  nfe_val_prod?: number;
  nfe_chave?: string;
}) {
  const creds = getCredentials();
  const tipoServico = params.tipo_servico ?? 7;
  const tipoEntrega = params.tipo_entrega ?? 0;
  const condFrete = params.cond_frete || 'CIF';
  const volumes = params.volumes ?? 1;
  const isencaoIcms = params.isencao_icms ?? 0;

  let docFiscalXml = '';
  if (params.nfe_numero && params.nfe_chave) {
    docFiscalXml = `
      <DocFiscalNFe>
        <item>
          <NfeNumero>${params.nfe_numero}</NfeNumero>
          <NfeSerie>${params.nfe_serie || '1'}</NfeSerie>
          <NfeData>${params.nfe_data || new Date().toISOString().split('T')[0]}</NfeData>
          <NfeValTotal>${((params.nfe_val_total || 0) / 100).toFixed(2)}</NfeValTotal>
          <NfeValProd>${((params.nfe_val_prod || 0) / 100).toFixed(2)}</NfeValProd>
          <NfeChave>${params.nfe_chave}</NfeChave>
        </item>
      </DocFiscalNFe>`;
  } else {
    // DocFiscalO (Declaração) quando não tem NF-e
    docFiscalXml = `
      <DocFiscalO>
        <item>
          <NfoTipo>00</NfoTipo>
          <NfoNumero>${(params.pedido || '').replace(/\D/g, '') || '0'}</NfoNumero>
          <NfoData>${new Date().toISOString().split('T')[0]}</NfoData>
          <NfoValTotal>${((params.nfe_val_total || 0) / 100).toFixed(2)}</NfoValTotal>
          <NfoValProd>${((params.nfe_val_prod || 0) / 100).toFixed(2)}</NfoValProd>
        </item>
      </DocFiscalO>`;
  }

  const soapBody = `<?xml version="1.0" encoding="UTF-8"?>
<SOAP-ENV:Envelope xmlns:SOAP-ENV="http://schemas.xmlsoap.org/soap/envelope/"
  xmlns:ns1="urn:RegistraColeta" xmlns:xsd="http://www.w3.org/2001/XMLSchema"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xmlns:ns2="https://edi.totalexpress.com.br/soap/webservice_v24.total"
  xmlns:SOAP-ENC="http://schemas.xmlsoap.org/soap/encoding/">
  <SOAP-ENV:Body>
    <ns1:RegistraColeta>
      <RegistraColetaRequest>
        ${params.cod_remessa ? `<CodRemessa>${params.cod_remessa}</CodRemessa>` : ''}
        <Encomendas>
          <item>
            <TipoServico>${tipoServico}</TipoServico>
            <TipoEntrega>${tipoEntrega}</TipoEntrega>
            <Volumes>${volumes}</Volumes>
            <CondFrete>${condFrete}</CondFrete>
            <Pedido>${params.pedido}</Pedido>
            <Natureza>${params.natureza || 'Mercadoria Diversa'}</Natureza>
            <IsencaoIcms>${isencaoIcms}</IsencaoIcms>
            ${params.peso ? `<Peso>${params.peso.toFixed(2)}</Peso>` : ''}
            <DestNome>${params.dest_nome}</DestNome>
            <DestCpfCnpj>${(params.dest_cpf_cnpj || '').replace(/\D/g, '')}</DestCpfCnpj>
            <DestEnd>${params.dest_endereco}</DestEnd>
            <DestEndNum>${params.dest_numero}</DestEndNum>
            ${params.dest_complemento ? `<DestCompl>${params.dest_complemento}</DestCompl>` : '<DestCompl> </DestCompl>'}
            <DestBairro>${params.dest_bairro}</DestBairro>
            <DestCidade>${params.dest_cidade}</DestCidade>
            <DestEstado>${params.dest_estado}</DestEstado>
            <DestCep>${params.dest_cep.replace(/\D/g, '')}</DestCep>
            ${params.dest_email ? `<DestEmail>${params.dest_email}</DestEmail>` : ''}
            ${params.dest_ddd ? `<DestDdd>${params.dest_ddd.replace(/\D/g, '')}</DestDdd>` : ''}
            ${params.dest_telefone ? `<DestTelefone1>${params.dest_telefone.replace(/\D/g, '')}</DestTelefone1>` : ''}
            ${docFiscalXml}
          </item>
        </Encomendas>
      </RegistraColetaRequest>
    </ns1:RegistraColeta>
  </SOAP-ENV:Body>
</SOAP-ENV:Envelope>`;

  const response = await fetch(SOAP_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'text/xml; charset=utf-8',
      'Authorization': basicAuth(creds.user, creds.password),
      'SOAPAction': 'urn:RegistraColeta#RegistraColeta',
      'User-Agent': 'LovableApp/1.0',
    },
    body: soapBody,
  });

  const xmlText = await response.text();
  console.log('RegistraColeta response:', xmlText.substring(0, 1000));

  const codigoProc = getTagText(xmlText, 'CodigoProc');

  if (codigoProc !== '1') {
    // ErrosIndividuais contains <item xsi:type="tns:CriticaVolume"> not <CriticaVolume>
    const errosSection = getAllTagContents(xmlText, 'ErrosIndividuais');
    let erros: string[] = [];
    if (errosSection.length > 0) {
      const itemBlocks = getAllTagContents(errosSection[0], 'item');
      erros = itemBlocks.map(block => {
        const pedido = getTagText(block, 'Pedido') || '';
        const codErro = getTagText(block, 'CodigoErro') || '';
        const descErro = getTagText(block, 'DescricaoErro') || getTagText(block, 'Descricao') || '';
        return `[${pedido}] Erro ${codErro}: ${descErro}`;
      }).filter(e => e.length > 5);
    }
    // Fallback: try CriticaVolume directly
    if (erros.length === 0) {
      const criticaBlocks = getAllTagContents(xmlText, 'CriticaVolume');
      erros = criticaBlocks.map(block => {
        return getTagText(block, 'DescricaoErro') || getTagText(block, 'Descricao') || '';
      }).filter(Boolean);
    }
    console.error('Total Express erros individuais:', JSON.stringify(erros));
    throw new Error(`Erro Total Express (código ${codigoProc}): ${erros.length > 0 ? erros.join('; ') : 'Erro ao registrar coleta'}`);
  }

  const numProtocolo = getTagText(xmlText, 'NumProtocolo');
  const itensProcessados = getTagText(xmlText, 'ItensProcessados');

  let awb = '';
  const criticaBlocks = getAllTagContents(xmlText, 'CriticaVolume');
  if (criticaBlocks.length > 0) {
    awb = getTagText(criticaBlocks[0], 'AWB');
  }

  return {
    codigo_proc: parseInt(codigoProc),
    num_protocolo: numProtocolo,
    itens_processados: parseInt(itensProcessados) || 0,
    awb,
  };
}

// ===== OBTER TRACKING (SOAP - método legado para consulta por data) =====
async function obterTracking(params: { data_consulta?: string }) {
  const creds = getCredentials();
  const dataConsulta = params.data_consulta || new Date().toISOString().split('T')[0];

  const soapBody = `<?xml version="1.0" encoding="UTF-8"?>
<SOAP-ENV:Envelope xmlns:SOAP-ENV="http://schemas.xmlsoap.org/soap/envelope/"
  xmlns:ns1="urn:ObterTracking" xmlns:xsd="http://www.w3.org/2001/XMLSchema"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <SOAP-ENV:Body>
    <ns1:ObterTracking>
      <ObterTrackingRequest>
        <DataConsulta>${dataConsulta}</DataConsulta>
      </ObterTrackingRequest>
    </ns1:ObterTracking>
  </SOAP-ENV:Body>
</SOAP-ENV:Envelope>`;

  const response = await fetch(SOAP_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'text/xml; charset=utf-8',
      'Authorization': basicAuth(creds.user, creds.password),
      'SOAPAction': 'urn:ObterTracking#ObterTracking',
      'User-Agent': 'LovableApp/1.0',
    },
    body: soapBody,
  });

  const xmlText = await response.text();
  console.log('ObterTracking response:', xmlText.substring(0, 1000));

  const itemBlocks = getAllTagContents(xmlText, 'item');
  const trackings: Array<{
    awb: string;
    pedido: string;
    status: string;
    data_hora: string;
    descricao: string;
    cidade: string;
  }> = [];

  for (const item of itemBlocks) {
    const awb = getTagText(item, 'AWB');
    const pedido = getTagText(item, 'Pedido');
    if (awb || pedido) {
      trackings.push({
        awb,
        pedido,
        status: getTagText(item, 'CodStatus') || getTagText(item, 'Status'),
        data_hora: getTagText(item, 'DataStatus') || getTagText(item, 'DataHora'),
        descricao: getTagText(item, 'DescStatus') || getTagText(item, 'Descricao'),
        cidade: getTagText(item, 'Cidade'),
      });
    }
  }

  return { trackings };
}

// ===== RASTREAR POR PEDIDO (REST API - conforme manual Status de Entrega) =====
// Endpoint: POST https://apis.totalexpress.com.br/ics-tracking-encomenda-lv/v1/tracking
// Body: { "pedidos": ["..."], "comprovanteEntrega": true }
async function rastrearPorPedido(params: { pedidos: string[] }) {
  const creds = getRestCredentials();

  const response = await fetch(TRACKING_REST_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': basicAuth(creds.user, creds.password),
      'User-Agent': 'LovableApp/1.0',
    },
    body: JSON.stringify({
      pedidos: params.pedidos,
      comprovanteEntrega: true,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Erro ao rastrear: ${response.status} - ${errorText}`);
  }

  return await response.json();
}

// ===== RASTREAR POR AWB (REST API direta - conforme manual Status de Entrega) =====
// CORRIGIDO: Agora usa REST API direta ao invés de loop SOAP de 7 dias
// Body: { "awbs": ["ABCD000000000tx", ...], "comprovanteEntrega": true }
// Limite: 50 AWBs por request
async function rastrearPorAwb(params: { awbs: string[] }) {
  const creds = getRestCredentials();

  // Dividir em lotes de 50 (limite da API conforme manual)
  const batches: string[][] = [];
  for (let i = 0; i < params.awbs.length; i += 50) {
    batches.push(params.awbs.slice(i, i + 50));
  }

  const allResults: Array<{ awb: string; eventos: Array<{ descricao: string; codigo: string; data: string; cidade: string }> }> = [];

  for (const batch of batches) {
    try {
      const response = await fetch(TRACKING_REST_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': basicAuth(creds.user, creds.password),
          'User-Agent': 'LovableApp/1.0',
        },
        body: JSON.stringify({
          awbs: batch,
          comprovanteEntrega: true,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`REST tracking falhou (${response.status}): ${errorText}`);
        console.log('Tentando fallback via SOAP ObterTracking...');
        
        // FALLBACK: usar SOAP ObterTracking por data (últimos 30 dias)
        const fallbackResults = await rastrearPorAwbSoap(batch);
        allResults.push(...fallbackResults);
        continue;
      }

      const data = await response.json();
      console.log('REST Tracking response:', JSON.stringify(data).substring(0, 1000));

      // Parse the REST API response - suporta múltiplos formatos
      const encomendas = data?.data || data?.encomendas || data || [];
      if (Array.isArray(encomendas)) {
        for (const enc of encomendas) {
          const awb = enc.awb || enc.AWB || '';
          const eventos: Array<{ descricao: string; codigo: string; data: string; cidade: string }> = [];
          
          const statusList = enc.tracking || enc.statusTotal || enc.status || enc.ocorrencias || [];
          if (Array.isArray(statusList)) {
            for (const st of statusList) {
              eventos.push({
                descricao: st.descricao || st.descStatus || st.DescStatus || '',
                codigo: String(st.codigo || st.codStatus || st.CodStatus || st.id || ''),
                data: st.data || st.dataStatus || st.DataStatus || st.dataHora || '',
                cidade: st.cidade || st.Cidade || '',
              });
            }
          }

          if (awb) {
            eventos.sort((a, b) => (b.data || '').localeCompare(a.data || ''));
            allResults.push({ awb, eventos });
          }
        }
      }
    } catch (err) {
      console.error('Erro no rastreio REST, tentando SOAP:', err);
      const fallbackResults = await rastrearPorAwbSoap(batch);
      allResults.push(...fallbackResults);
    }
  }

  return allResults;
}

// ===== FALLBACK: RASTREAR POR AWB VIA SOAP (ObterTracking por data) =====
// Quando a REST API falha (ex: autenticação), usa o SOAP buscando últimos 30 dias
async function rastrearPorAwbSoap(awbs: string[]) {
  const creds = getCredentials();
  const awbSet = new Set(awbs.map(a => a.toUpperCase()));
  const results: Array<{ awb: string; eventos: Array<{ descricao: string; codigo: string; data: string; cidade: string }> }> = [];
  const awbEventos: Record<string, Array<{ descricao: string; codigo: string; data: string; cidade: string }>> = {};

  // Buscar últimos 30 dias para encontrar eventos dos AWBs
  const today = new Date();
  for (let d = 0; d < 30; d++) {
    const date = new Date(today);
    date.setDate(date.getDate() - d);
    const dateStr = date.toISOString().split('T')[0];

    const soapBody = `<?xml version="1.0" encoding="UTF-8"?>
<SOAP-ENV:Envelope xmlns:SOAP-ENV="http://schemas.xmlsoap.org/soap/envelope/"
  xmlns:ns1="urn:ObterTracking" xmlns:xsd="http://www.w3.org/2001/XMLSchema"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <SOAP-ENV:Body>
    <ns1:ObterTracking>
      <ObterTrackingRequest>
        <DataConsulta>${dateStr}</DataConsulta>
      </ObterTrackingRequest>
    </ns1:ObterTracking>
  </SOAP-ENV:Body>
</SOAP-ENV:Envelope>`;

    try {
      const response = await fetch(SOAP_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/xml; charset=utf-8',
          'Authorization': basicAuth(creds.user, creds.password),
          'SOAPAction': 'urn:ObterTracking#ObterTracking',
          'User-Agent': 'LovableApp/1.0',
        },
        body: soapBody,
      });

      const xmlText = await response.text();
      if (d === 0) {
        console.log(`SOAP ObterTracking dia ${dateStr} response (${xmlText.length} chars):`, xmlText.substring(0, 500));
      }
      const itemBlocks = getAllTagContents(xmlText, 'item');
      if (d < 3) {
        console.log(`SOAP dia ${dateStr}: ${itemBlocks.length} items encontrados`);
      }
      
      for (const item of itemBlocks) {
        const awb = getTagText(item, 'AWB').toUpperCase();
        if (!awb || !awbSet.has(awb)) continue;
        
        const evento = {
          descricao: getTagText(item, 'DescStatus') || getTagText(item, 'Descricao') || getTagText(item, 'Status'),
          codigo: getTagText(item, 'CodStatus') || getTagText(item, 'Codigo'),
          data: getTagText(item, 'DataStatus') || getTagText(item, 'DataHora') || dateStr,
          cidade: getTagText(item, 'Cidade'),
        };
        
        if (!awbEventos[awb]) awbEventos[awb] = [];
        awbEventos[awb].push(evento);
      }

      // Se já encontramos todos os AWBs, parar de buscar
      if (Object.keys(awbEventos).length >= awbs.length) {
        const allFound = awbs.every(a => (awbEventos[a.toUpperCase()]?.length || 0) > 0);
        if (allFound) break;
      }
    } catch (err) {
      console.error(`Erro SOAP tracking data ${dateStr}:`, err);
    }
  }

  // Montar resultados
  for (const awb of awbs) {
    const eventos = awbEventos[awb.toUpperCase()] || [];
    if (eventos.length > 0) {
      eventos.sort((a, b) => (b.data || '').localeCompare(a.data || ''));
      results.push({ awb, eventos });
    }
  }

  console.log(`SOAP fallback: encontrados ${results.length}/${awbs.length} AWBs com eventos`);
  return results;
}

// ===== SMART LABEL (REST API) =====
// CORRIGIDO conforme manual oficial:
// - servicoTipo: 7 = Expresso (antes era 1 = Standard)
// - Estrutura do body corrigida conforme documentação oficial
async function smartLabel(params: {
  pedido: string;
  tipo_servico?: number;
  volumes?: number;
  peso?: number;
  dest_nome: string;
  dest_cpf_cnpj: string;
  dest_endereco: string;
  dest_numero: string;
  dest_complemento?: string;
  dest_bairro: string;
  dest_cidade: string;
  dest_estado: string;
  dest_cep: string;
  dest_email?: string;
  dest_telefone?: string;
  nfe_numero?: string;
  nfe_serie?: number;
  nfe_data?: string;
  nfe_val_total?: number;
  nfe_val_prod?: number;
  nfe_chave?: string;
}) {
  const creds = getCredentials();

  // Montar docFiscal conforme manual
  const docFiscal: Record<string, unknown> = {};
  if (params.nfe_numero && params.nfe_chave) {
    docFiscal.nfe = [{
      nfeNumero: parseInt(params.nfe_numero),
      nfeSerie: params.nfe_serie || 1,
      nfeData: params.nfe_data || new Date().toISOString().split('T')[0],
      nfeValTotal: (params.nfe_val_total || 0) / 100,
      nfeValProd: (params.nfe_val_prod || 0) / 100,
      nfeChave: params.nfe_chave,
    }];
  } else {
    // "outros" para declaração de conteúdo convencional
    docFiscal.outros = [{
      nfoTipo: '00',
      nfoNumero: parseInt(params.pedido) || 1,
      nfoData: new Date().toISOString().split('T')[0],
      nfoValTotal: (params.nfe_val_total || 0) / 100,
      nfoValProd: (params.nfe_val_prod || 0) / 100,
    }];
  }

  // CORRIGIDO: servicoTipo default 7 = Expresso (antes era 1)
  // Estrutura conforme manual oficial SmartLabel
  const body = {
    remetenteId: parseInt(creds.reid),
    cnpj: creds.cnpj,
    encomendas: [{
      servicoTipo: params.tipo_servico ?? 7,
      entregaTipo: 0,
      peso: params.peso || 0.5,
      volumes: params.volumes ?? 1,
      condFrete: 'CIF',
      pedido: params.pedido,
      natureza: 'Mercadoria',
      icmsIsencao: 0,
      destinatario: {
        nome: params.dest_nome,
        cpfCnpj: (params.dest_cpf_cnpj || '').replace(/\D/g, ''),
        endereco: {
          logradouro: params.dest_endereco,
          numero: params.dest_numero,
          complemento: params.dest_complemento || '',
          bairro: params.dest_bairro,
          cidade: params.dest_cidade,
          estado: params.dest_estado,
          pais: 'Brasil',
          cep: params.dest_cep.replace(/\D/g, ''),
        },
        email: params.dest_email || '',
        telefone1: params.dest_telefone ? parseInt(params.dest_telefone.replace(/\D/g, '')) : 0,
      },
      docFiscal,
    }],
  };

  // SmartLabel is a REST API - use REST credentials (same as tracking)
  const restCreds = getRestCredentials();
  const response = await fetch(SMARTLABEL_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': basicAuth(restCreds.user, restCreds.password),
      'User-Agent': 'LovableApp/1.0',
    },
    body: JSON.stringify(body),
  });

  const data = await response.json();
  console.log('SmartLabel response:', JSON.stringify(data).substring(0, 1000));

  if (!response.ok) {
    throw new Error(`Erro SmartLabel: ${response.status} - ${JSON.stringify(data)}`);
  }

  return data;
}

// ===== MAPEAMENTO DE STATUS TOTAL EXPRESS → LOCAL =====
// CORRIGIDO: Agora usa TODOS os IDs oficiais do Anexo 1 do manual
function mapearStatusTotalExpress(descricao: string, codigo?: string): { status: string; status_detalhe: string } {
  const desc = (descricao || '').toUpperCase().trim();
  const cod = codigo || '';

  // ===== ENTREGUE =====
  // ID 1: ENTREGA REALIZADA
  if (cod === '1' || desc.includes('ENTREGA REALIZADA') || desc.includes('ENTREGUE')) {
    return { status: 'entregue', status_detalhe: descricao };
  }

  // ===== PROBLEMAS / OCORRÊNCIAS =====
  // IDs do Anexo 1 que indicam problemas
  const problemaCodes = new Set([
    '6',   // ENDERECO DESTINATARIO NAO LOCALIZADO
    '8',   // DUAS OU MAIS VEZES AUSENTE/FECHADO
    '9',   // RECUSADA - MERCADORIA EM DESACORDO
    '10',  // SINISTRO LIQUIDADO
    '11',  // RECUSADA - AVARIA DA MERCADORIA/EMBALAGEM
    '12',  // SERVIÇO NÃO ATENDIDO
    '13',  // LOCALIDADE FORA DO PERIMETRO URBANO
    '14',  // MERCADORIA AVARIADA
    '15',  // EMBALAGEM EM ANALISE
    '16',  // RECUSADA - PEDIDO/COLETA EM DUPLICIDADE
    '18',  // EXTRAVIO / HUB
    '19',  // EXTRAVIO POR DIVERGÊNCIA DE COLETA
    '21',  // CLIENTE AUSENTE/ESTABELECIMENTO FECHADO
    '22',  // MERCADORIA ENVIADA PARA SALVADOS
    '23',  // EXTRAVIO DE MERCADORIA EM TRANSITO
    '24',  // ACAREAÇÃO SEM SUCESSO – MERCADORIA EXTRAVIADA
    '27',  // ROUBO DE CARGA
    '30',  // EXTRAVIO / AGENTE
    '31',  // EXTRAVIO / COURIER OU MOTORISTA
    '32',  // EXTRAVIO / TRANSFERÊNCIA AEREA
    '33',  // EXTRAVIO / TRANSFERÊNCIA RODOVIARIA
    '35',  // EXTRAVIO / ROUBO - TRANSPORTADORAS
    '36',  // EXTRAVIO / ROUBO - ECT
    '39',  // DESTINATARIO MUDOU-SE
    '40',  // CANCELADO PELO DESTINATARIO
    '41',  // DESTINATARIO DESCONHECIDO
    '42',  // DESTINATARIO DEMITIDO
    '43',  // DESTINATARIO FALECEU
    '44',  // FALTA BLOCO DO EDIFICIO/SALA
    '45',  // FALTA NOME DE CONTATO/DEPARTAMENTO/RAMAL
    '46',  // FALTA NUMERO APT/CASA
  ]);
  if (problemaCodes.has(cod)) {
    return { status: 'problema', status_detalhe: descricao };
  }
  // Fallback textual para problemas
  if (desc.includes('RECUSADA') || desc.includes('NÃO LOCALIZADO') ||
      desc.includes('AVARIADA') || desc.includes('ROUBO') || desc.includes('ROUBADO') ||
      desc.includes('FALECEU') || desc.includes('EXTRAVIO') || desc.includes('SINISTRO') ||
      desc.includes('FORA DO PERÍMETRO') || desc.includes('FORA DO PERIMETRO') ||
      desc.includes('DUPLICIDADE') || desc.includes('ANÁLISE') || desc.includes('ANALISE') ||
      desc.includes('CANCELADO') || desc.includes('DESCONHECIDO') || desc.includes('MUDOU-SE') ||
      desc.includes('DEMITIDO') || desc.includes('CONFISCADO') || desc.includes('AVARIA')) {
    return { status: 'problema', status_detalhe: descricao };
  }

  // ===== DEVOLUÇÃO =====
  // IDs 25, 26, 34 + textuais
  const devolucaoCodes = new Set(['25', '26', '34']);
  if (devolucaoCodes.has(cod) ||
      desc.includes('DEVOLUÇÃO') || desc.includes('DEVOLVID')) {
    return { status: 'problema', status_detalhe: `Devolução: ${descricao}` };
  }

  // ===== SAIU PARA ENTREGA =====
  if (desc.includes('SAIU PARA ENTREGA') || desc.includes('EM ROTA DE ENTREGA') ||
      desc.includes('PROCESSO DE ENTREGA')) {
    return { status: 'saiu_entrega', status_detalhe: descricao };
  }

  // ===== COLETADO =====
  // ID 83: COLETA REALIZADA
  if (cod === '83' || desc.includes('COLETA REALIZADA') ||
      desc.includes('INÍCIO DE COLETA')) {
    return { status: 'coletado', status_detalhe: descricao };
  }

  // ===== EM TRÂNSITO =====
  // Inclui recebimentos em CD, transferências, embarcados
  if (desc.includes('COLETA RECEBIDA') || desc.includes('RECEBIDA E PROCESSADA') ||
      desc.includes('EMBARCADO PARA') || desc.includes('TRANSFERENCIA PARA') ||
      desc.includes('TRANSFERÊNCIA PARA') || desc.includes('RECEBIDO CD') ||
      desc.includes('EM TRÂNSITO') || desc.includes('EM TRANSITO') ||
      desc.includes('CD ') || desc.includes('REDESPACHO') ||
      desc.includes('ENTREGA PROGRAMADA') || desc.includes('EM AGENDAMENTO') ||
      desc.includes('DISPONÍVEL PARA RETIRADA') || desc.includes('FORA DE ROTA') ||
      cod === '29' || cod === '37' || cod === '38') {
    return { status: 'em_transito', status_detalhe: descricao };
  }

  // ===== PENDENTE =====
  if (desc.includes('PROCESSO DE COLETA') || desc.includes('ARQUIVO RECEBIDO') ||
      desc.includes('POSTAGEM') || desc.includes('AGUARDANDO')) {
    return { status: 'pendente', status_detalhe: descricao };
  }

  // Default: em trânsito (se tem tracking, está em movimento)
  return { status: 'em_transito', status_detalhe: descricao };
}

// ===== RASTREAR E ATUALIZAR STATUS NO BANCO =====
async function rastrearEAtualizar(params: { awbs: string[] }) {
  const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  // CORRIGIDO: Agora usa REST API direta ao invés de loop SOAP de 7 dias
  const trackingResult = await rastrearPorAwb({ awbs: params.awbs });
  
  const updates: Array<{ awb: string; status: string; status_detalhe: string; tracking_historico: unknown }> = [];

  for (const item of trackingResult) {
    const awb = item.awb;
    const eventos = item.eventos || [];
    
    if (eventos.length === 0) continue;
    
    // Get the most recent event
    const ultimoEvento = eventos[0];
    const descricao = ultimoEvento?.descricao || '';
    const codigo = ultimoEvento?.codigo?.toString() || '';
    
    const mapped = mapearStatusTotalExpress(descricao, codigo);
    
    updates.push({
      awb,
      status: mapped.status,
      status_detalhe: mapped.status_detalhe,
      tracking_historico: eventos,
    });
  }

  // Update each envio in the database
  for (const upd of updates) {
    await supabase
      .from('envios')
      .update({
        status: upd.status,
        status_detalhe: upd.status_detalhe,
        tracking_historico: JSON.parse(JSON.stringify(upd.tracking_historico)),
        ultimo_tracking_at: new Date().toISOString(),
      })
      .eq('awb', upd.awb);
  }

  return { updated: updates.length, details: updates.map(u => ({ awb: u.awb, status: u.status, status_detalhe: u.status_detalhe })) };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, ...params } = await req.json();
    let result: unknown;

    switch (action) {
      case 'calcular_frete':
        result = await calcularFrete(params as Parameters<typeof calcularFrete>[0]);
        break;
      case 'registrar_coleta':
        result = await registrarColeta(params as Parameters<typeof registrarColeta>[0]);
        break;
      case 'obter_tracking':
        result = await obterTracking(params as Parameters<typeof obterTracking>[0]);
        break;
      case 'rastrear_pedido':
        result = await rastrearPorPedido(params as Parameters<typeof rastrearPorPedido>[0]);
        break;
      case 'rastrear_awb':
        result = await rastrearPorAwb(params as Parameters<typeof rastrearPorAwb>[0]);
        break;
      case 'smart_label':
        result = await smartLabel(params as Parameters<typeof smartLabel>[0]);
        break;
      case 'rastrear_e_atualizar':
        result = await rastrearEAtualizar(params as { awbs: string[] });
        break;
      default:
        throw new Error(`Ação desconhecida: ${action}`);
    }

    return new Response(JSON.stringify({ success: true, data: result }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Total Express Proxy Error:', error);
    const message = error instanceof Error ? error.message : 'Erro desconhecido';
    return new Response(JSON.stringify({ success: false, error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
