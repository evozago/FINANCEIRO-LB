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
  const creds = getCredentials();

  const tipoServico = params.tipo_servico || 'STD';
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
        <TipoServico xsi:type="xsd:string">${tipoServico}</TipoServico>
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
  console.log('Frete response:', xmlText.substring(0, 500));

  const codigoProc = getTagText(xmlText, 'CodigoProc');

  if (codigoProc !== '1') {
    const erro = getTagText(xmlText, 'ErroConsultaFrete') || getTagText(xmlText, 'Erro') || 'Erro no cálculo de frete';
    throw new Error(`Erro Total Express (código ${codigoProc}): ${erro}`);
  }

  const prazo = getTagText(xmlText, 'Prazo');
  const valorServico = getTagText(xmlText, 'ValorServico');
  const rota = getTagText(xmlText, 'Rota');

  return {
    prazo_dias: parseInt(prazo) || 0,
    valor_centavos: Math.round(parseFloat(valorServico.replace(',', '.')) * 100),
    valor_formatado: `R$ ${valorServico}`,
    rota,
    tipo_servico: tipoServico,
  };
}

// ===== REGISTRAR COLETA (SOAP) =====
async function registrarColeta(params: {
  cod_remessa?: string;
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
  natureza?: string;
  nfe_numero?: string;
  nfe_serie?: string;
  nfe_data?: string;
  nfe_val_total?: number;
  nfe_val_prod?: number;
  nfe_chave?: string;
}) {
  const creds = getCredentials();
  const tipoServico = params.tipo_servico ?? 1;
  const volumes = params.volumes ?? 1;

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
    // Usar DocFiscalO (Outros/Declaração) quando não tem NF-e
    docFiscalXml = `
      <DocFiscalO>
        <item>
          <NfoTipo>00</NfoTipo>
          <NfoNumero>${params.pedido}</NfoNumero>
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
            <TipoEntrega>0</TipoEntrega>
            <Volumes>${volumes}</Volumes>
            <CondFrete>CIF</CondFrete>
            <Pedido>${params.pedido}</Pedido>
            <Natureza>${params.natureza || 'Mercadoria'}</Natureza>
            <IsencaoIcms>0</IsencaoIcms>
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
    const criticaBlocks = getAllTagContents(xmlText, 'CriticaVolume');
    const erros = criticaBlocks.map(block => getTagText(block, 'Descricao')).filter(Boolean);
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

// ===== OBTER TRACKING (SOAP) =====
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
        status: getTagText(item, 'Status'),
        data_hora: getTagText(item, 'DataHora'),
        descricao: getTagText(item, 'Descricao'),
        cidade: getTagText(item, 'Cidade'),
      });
    }
  }

  return { trackings };
}

// ===== RASTREAR POR PEDIDO (REST API) =====
async function rastrearPorPedido(params: { pedidos: string[] }) {
  const creds = getCredentials();

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

// ===== RASTREAR POR AWB (REST API) =====
async function rastrearPorAwb(params: { awbs: string[] }) {
  const creds = getCredentials();

  const response = await fetch(TRACKING_REST_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': basicAuth(creds.user, creds.password),
      'User-Agent': 'LovableApp/1.0',
    },
    body: JSON.stringify({
      awbs: params.awbs,
      comprovanteEntrega: true,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Erro ao rastrear: ${response.status} - ${errorText}`);
  }

  return await response.json();
}

// ===== SMART LABEL (REST API) =====
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
    docFiscal.outros = [{
      nfoTipo: '00',
      nfoNumero: parseInt(params.pedido) || 1,
      nfoData: new Date().toISOString().split('T')[0],
      nfoValTotal: (params.nfe_val_total || 0) / 100,
      nfoValProd: (params.nfe_val_prod || 0) / 100,
    }];
  }

  const body = {
    remetenteId: parseInt(creds.reid),
    cnpj: creds.cnpj,
    encomendas: [{
      servicoTipo: params.tipo_servico ?? 1,
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

  const response = await fetch(SMARTLABEL_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': basicAuth(creds.user, creds.password),
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
