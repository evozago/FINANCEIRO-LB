import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useTotalExpress } from '@/hooks/useTotalExpress';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import {
  Truck, Search, RefreshCw, Package, MapPin, Tag, CheckCircle2,
  AlertCircle, Clock, Send, FileText, Settings, Loader2, Download,
  Edit2, Save, X, RotateCcw, Plus, Zap, ExternalLink
} from 'lucide-react';

interface Envio {
  id: number;
  shopify_order_id: number | null;
  shopify_order_name: string | null;
  shopify_fulfillment_id: number | null;
  dest_nome: string;
  dest_cpf_cnpj: string | null;
  dest_endereco: string | null;
  dest_numero: string | null;
  dest_complemento: string | null;
  dest_bairro: string | null;
  dest_cidade: string | null;
  dest_estado: string | null;
  dest_cep: string;
  dest_email: string | null;
  dest_telefone: string | null;
  awb: string | null;
  num_protocolo: string | null;
  cod_remessa: string | null;
  tipo_servico: number;
  volumes: number;
  peso_kg: number | null;
  valor_declarado_centavos: number;
  status: string;
  status_detalhe: string | null;
  ultimo_tracking_at: string | null;
  tracking_historico: unknown[];
  etiqueta_url: string | null;
  etiqueta_gerada: boolean;
  valor_frete_centavos: number;
  prazo_entrega_dias: number | null;
  created_at: string;
  updated_at: string;
}

const STATUS_MAP: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  pendente: { label: 'Pendente', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
  registrado: { label: 'Registrado', color: 'bg-orange-100 text-orange-800', icon: FileText },
  aguardando_coleta: { label: 'Aguardando Coleta', color: 'bg-amber-100 text-amber-800', icon: Package },
  coletado: { label: 'Coletado', color: 'bg-blue-100 text-blue-800', icon: Package },
  em_transito: { label: 'Em Trânsito', color: 'bg-indigo-100 text-indigo-800', icon: Truck },
  saiu_entrega: { label: 'Saiu p/ Entrega', color: 'bg-purple-100 text-purple-800', icon: Send },
  entregue: { label: 'Entregue', color: 'bg-green-100 text-green-800', icon: CheckCircle2 },
  problema: { label: 'Problema', color: 'bg-red-100 text-red-800', icon: AlertCircle },
};

function StatusBadge({ status }: { status: string }) {
  const info = STATUS_MAP[status] || STATUS_MAP.pendente;
  return (
    <Badge variant="outline" className={`${info.color} border-0`}>
      <info.icon className="h-3 w-3 mr-1" />
      {info.label}
    </Badge>
  );
}

const EMPTY_MANUAL_FORM = {
  pedido: '',
  tipo_servico: '7',
  tipo_entrega: '0',
  cond_frete: 'CIF',
  natureza: 'Mercadoria Diversa',
  volumes: '1',
  peso_kg: '0.5',
  valor_declarado: '100',
  dest_nome: '',
  dest_cpf_cnpj: '',
  dest_endereco: '',
  dest_numero: '',
  dest_complemento: '',
  dest_bairro: '',
  dest_cidade: '',
  dest_estado: '',
  dest_cep: '',
  dest_email: '',
  dest_ddd: '',
  dest_telefone: '',
  nfe_numero: '',
  nfe_serie: '',
  nfe_data: '',
  nfe_val_total: '',
  nfe_val_prod: '',
  nfe_chave: '',
};

export default function GerenciarEnvios() {
  const [envios, setEnvios] = useState<Envio[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('todos');
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  // Cotação de frete
  const [freteDialog, setFreteDialog] = useState(false);
  const [freteCep, setFreteCep] = useState('');
  const [fretePeso, setFretePeso] = useState('0.5');
  const [freteValor, setFreteValor] = useState('100');
  const [freteAltura, setFreteAltura] = useState('');
  const [freteLargura, setFreteLargura] = useState('');
  const [freteProfundidade, setFreteProfundidade] = useState('');
  const [freteResultado, setFreteResultado] = useState<{ prazo_dias: number; valor_formatado: string; rota: string } | null>(null);

  // Config dialog
  const [configDialog, setConfigDialog] = useState(false);
  const [importLoading, setImportLoading] = useState(false);

  const [bulkTrackingLoading, setBulkTrackingLoading] = useState(false);
  const [editingAwb, setEditingAwb] = useState<number | null>(null);
  const [editAwbValue, setEditAwbValue] = useState('');
  const [syncLoading, setSyncLoading] = useState(false);

  // Manual shipment dialog
  const [manualDialog, setManualDialog] = useState(false);
  const [manualForm, setManualForm] = useState(EMPTY_MANUAL_FORM);
  const [manualLoading, setManualLoading] = useState(false);

  // One-click flow loading
  const [oneClickLoading, setOneClickLoading] = useState<number | null>(null);

  // NF-e dialog for one-click flow
  const [nfeDialog, setNfeDialog] = useState(false);
  const [nfeEnvio, setNfeEnvio] = useState<Envio | null>(null);
  const [nfeForm, setNfeForm] = useState({
    nfe_numero: '',
    nfe_serie: '1',
    nfe_data: '',
    nfe_val_total: '',
    nfe_val_prod: '',
    nfe_chave: '',
  });

  const { loading: apiLoading, calcularFrete, registrarColeta, rastrearPorAwb, rastrearEAtualizar, registerCarrierService, smartLabel, importOrders, createFulfillment, syncTracking } = useTotalExpress();

  const loadEnvios = useCallback(async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('envios')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) {
      console.error('Erro ao carregar envios:', error);
      toast.error('Erro ao carregar envios');
    } else {
      setEnvios((data || []) as unknown as Envio[]);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => { loadEnvios(); }, [loadEnvios]);

  const filteredEnvios = envios.filter(e => {
    const matchSearch = !searchTerm || 
      e.dest_nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.awb?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.shopify_order_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.dest_cep.includes(searchTerm);
    const matchStatus = statusFilter === 'todos' || e.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const handleRegistrarColeta = async (envio: Envio) => {
    if (envio.awb) {
      toast.info('Coleta já registrada para este envio');
      return;
    }
    setActionLoading(envio.id);
    const result = await registrarColeta({
      pedido: envio.shopify_order_name || envio.id.toString(),
      dest_nome: envio.dest_nome,
      dest_cpf_cnpj: envio.dest_cpf_cnpj || '',
      dest_endereco: envio.dest_endereco || '',
      dest_numero: envio.dest_numero || 'S/N',
      dest_complemento: envio.dest_complemento || '',
      dest_bairro: envio.dest_bairro || '',
      dest_cidade: envio.dest_cidade || '',
      dest_estado: envio.dest_estado || '',
      dest_cep: envio.dest_cep,
      dest_email: envio.dest_email || '',
      dest_telefone: envio.dest_telefone || '',
      peso: envio.peso_kg || 0.5,
      volumes: envio.volumes,
      tipo_servico: 7, // Expresso conforme manual oficial
      nfe_val_total: envio.valor_declarado_centavos,
      nfe_val_prod: envio.valor_declarado_centavos,
    });
    
    if (result) {
      await supabase.from('envios').update({
        awb: result.awb,
        num_protocolo: result.num_protocolo,
        status: 'coletado',
      }).eq('id', envio.id);
      toast.success(`Coleta registrada! AWB: ${result.awb}`);
      loadEnvios();
    } else {
      toast.error('Erro ao registrar coleta');
    }
    setActionLoading(null);
  };

  const handleGerarEtiqueta = async (envio: Envio) => {
    setActionLoading(envio.id);
    const result = await smartLabel({
      pedido: envio.shopify_order_name || envio.id.toString(),
      dest_nome: envio.dest_nome,
      dest_cpf_cnpj: envio.dest_cpf_cnpj || '',
      dest_endereco: envio.dest_endereco || '',
      dest_numero: envio.dest_numero || 'S/N',
      dest_complemento: envio.dest_complemento || '',
      dest_bairro: envio.dest_bairro || '',
      dest_cidade: envio.dest_cidade || '',
      dest_estado: envio.dest_estado || '',
      dest_cep: envio.dest_cep,
      dest_email: envio.dest_email || '',
      dest_telefone: envio.dest_telefone || '',
      peso: envio.peso_kg || 0.5,
      volumes: envio.volumes,
      tipo_servico: envio.tipo_servico || 1, // Usa o tipo do envio (default: 1 Standard)
      nfe_val_total: envio.valor_declarado_centavos,
      nfe_val_prod: envio.valor_declarado_centavos,
    });

    if (result) {
      // Extract AWB from SmartLabel response (same logic as one-click flow)
      const resultData = result as Record<string, unknown>;
      const encomendas = resultData.encomendas as Array<Record<string, unknown>> | undefined;
      const smartAwb = (encomendas?.[0]?.awb as string) || '';
      const etiquetaUrl = smartAwb 
        ? `https://totalconecta.totalexpress.com.br/rastreamento/rastreamento/encomendas/${smartAwb}`
        : null;
      
      await supabase.from('envios').update({
        etiqueta_gerada: true,
        status: 'aguardando_coleta',
        ...(smartAwb ? { awb: smartAwb } : {}),
        ...(etiquetaUrl ? { etiqueta_url: etiquetaUrl } : {}),
      }).eq('id', envio.id);
      toast.success(`Etiqueta gerada com sucesso!${smartAwb ? ` AWB: ${smartAwb}` : ''}`);
      loadEnvios();
    } else {
      toast.error('Erro ao gerar etiqueta');
    }
    setActionLoading(null);
  };

  const handleRastrear = async (envio: Envio) => {
    if (!envio.awb) {
      toast.error('Envio ainda não possui AWB');
      return;
    }
    setActionLoading(envio.id);
    const result = await rastrearEAtualizar([envio.awb]);
    if (result) {
      toast.success('Rastreamento atualizado com status real!');
      loadEnvios();
    } else {
      toast.error('Erro ao rastrear');
    }
    setActionLoading(null);
  };

  const handleBulkTracking = async () => {
    const awbs = envios.filter(e => e.awb && e.status !== 'entregue').map(e => e.awb!);
    if (awbs.length === 0) {
      toast.info('Nenhum envio com AWB para atualizar');
      return;
    }
    setBulkTrackingLoading(true);
    const result = await rastrearEAtualizar(awbs);
    if (result) {
      toast.success(`${result.updated} envios atualizados com status real da Total Express`);
      loadEnvios();
    } else {
      toast.error('Erro ao atualizar rastreamentos');
    }
    setBulkTrackingLoading(false);
  };

  const handleSaveAwb = async (envio: Envio) => {
    const newAwb = editAwbValue.trim() || null;
    const { error } = await supabase.from('envios').update({ awb: newAwb }).eq('id', envio.id);
    if (error) {
      toast.error('Erro ao salvar AWB');
    } else {
      toast.success('AWB atualizado!');
      setEditingAwb(null);
      loadEnvios();
    }
  };

  const handleSyncFromShopify = async () => {
    const orderIds = envios.filter(e => e.shopify_order_id).map(e => e.shopify_order_id!);
    if (orderIds.length === 0) {
      toast.info('Nenhum pedido Shopify para sincronizar');
      return;
    }
    setSyncLoading(true);
    const result = await syncTracking(orderIds);
    if (result) {
      toast.success(`${result.synced} pedidos sincronizados do Shopify`);
      loadEnvios();
    } else {
      toast.error('Erro ao sincronizar do Shopify');
    }
    setSyncLoading(false);
  };

  const handleCalcularFrete = async () => {
    if (!freteCep || freteCep.replace(/\D/g, '').length !== 8) {
      toast.error('CEP inválido');
      return;
    }
    const result = await calcularFrete({
      cep_destino: freteCep,
      peso: parseFloat(fretePeso) || 0.5,
      valor_declarado: Math.round(parseFloat(freteValor) * 100),
      altura: freteAltura ? parseInt(freteAltura) : undefined,
      largura: freteLargura ? parseInt(freteLargura) : undefined,
      profundidade: freteProfundidade ? parseInt(freteProfundidade) : undefined,
    });
    if (result) {
      setFreteResultado(result);
      toast.success('Frete calculado!');
    } else {
      toast.error('Erro ao calcular frete');
    }
  };

  const handleRegistrarCarrierService = async () => {
    const result = await registerCarrierService();
    if (result) {
      toast.success('Carrier Service registrado no Shopify!');
    } else {
      toast.error('Erro ao registrar Carrier Service');
    }
  };

  const handleImportOrders = async () => {
    setImportLoading(true);
    const result = await importOrders();
    if (result) {
      toast.success(`Importados ${result.new_imported} novos pedidos (${result.already_imported} já existiam)`);
      loadEnvios();
    } else {
      toast.error('Erro ao importar pedidos do Shopify');
    }
    setImportLoading(false);
  };

  // === MANUAL SHIPMENT ===
  const handleManualSubmit = async () => {
    // Validações conforme manual oficial da API
    const cep = manualForm.dest_cep.replace(/\D/g, '');
    const cpfCnpj = manualForm.dest_cpf_cnpj.replace(/\D/g, '');
    
    if (!manualForm.dest_nome.trim()) { toast.error('Nome do destinatário é obrigatório'); return; }
    if (!cpfCnpj || (cpfCnpj.length !== 11 && cpfCnpj.length !== 14)) { toast.error('CPF (11 dígitos) ou CNPJ (14 dígitos) inválido'); return; }
    if (!manualForm.dest_endereco.trim()) { toast.error('Endereço é obrigatório'); return; }
    if (!manualForm.dest_numero.trim()) { toast.error('Número do endereço é obrigatório'); return; }
    if (!manualForm.dest_bairro.trim()) { toast.error('Bairro é obrigatório'); return; }
    if (!manualForm.dest_cidade.trim()) { toast.error('Cidade é obrigatória'); return; }
    if (!manualForm.dest_estado.trim() || manualForm.dest_estado.length !== 2) { toast.error('Estado (UF) inválido — 2 letras'); return; }
    if (cep.length !== 8) { toast.error('CEP deve ter 8 dígitos'); return; }
    if (!manualForm.pedido.trim()) { toast.error('Nº do Pedido é obrigatório'); return; }

    setManualLoading(true);
    try {
      const valorDeclaradoCentavos = Math.round(parseFloat(manualForm.valor_declarado || '0') * 100);
      
      // 1. Create envio record
      const { data: envioData, error: insertError } = await supabase.from('envios').insert({
        dest_nome: manualForm.dest_nome,
        dest_cpf_cnpj: cpfCnpj,
        dest_endereco: manualForm.dest_endereco,
        dest_numero: manualForm.dest_numero,
        dest_complemento: manualForm.dest_complemento || null,
        dest_bairro: manualForm.dest_bairro,
        dest_cidade: manualForm.dest_cidade,
        dest_estado: manualForm.dest_estado.toUpperCase(),
        dest_cep: cep,
        dest_email: manualForm.dest_email || null,
        dest_telefone: manualForm.dest_telefone || null,
        peso_kg: parseFloat(manualForm.peso_kg) || 0.5,
        volumes: parseInt(manualForm.volumes) || 1,
        valor_declarado_centavos: valorDeclaradoCentavos,
        tipo_servico: parseInt(manualForm.tipo_servico),
        status: 'pendente',
      }).select().single();

      if (insertError) throw insertError;
      toast.success('Envio criado com sucesso!');

      // 2. Register coleta with all fields per manual
      const coletaParams: Record<string, unknown> = {
        pedido: manualForm.pedido,
        dest_nome: manualForm.dest_nome,
        dest_cpf_cnpj: cpfCnpj,
        dest_endereco: manualForm.dest_endereco,
        dest_numero: manualForm.dest_numero,
        dest_complemento: manualForm.dest_complemento || '',
        dest_bairro: manualForm.dest_bairro,
        dest_cidade: manualForm.dest_cidade,
        dest_estado: manualForm.dest_estado.toUpperCase(),
        dest_cep: cep,
        dest_email: manualForm.dest_email || '',
        dest_ddd: manualForm.dest_ddd || '',
        dest_telefone: manualForm.dest_telefone || '',
        peso: parseFloat(manualForm.peso_kg) || 0.5,
        volumes: parseInt(manualForm.volumes) || 1,
        tipo_servico: parseInt(manualForm.tipo_servico),
        tipo_entrega: parseInt(manualForm.tipo_entrega),
        cond_frete: manualForm.cond_frete,
        natureza: manualForm.natureza,
        nfe_val_total: valorDeclaradoCentavos,
        nfe_val_prod: valorDeclaradoCentavos,
      };

      // NF-e fields (optional)
      if (manualForm.nfe_numero && manualForm.nfe_chave) {
        coletaParams.nfe_numero = manualForm.nfe_numero;
        coletaParams.nfe_serie = manualForm.nfe_serie || '1';
        coletaParams.nfe_data = manualForm.nfe_data || new Date().toISOString().split('T')[0];
        coletaParams.nfe_chave = manualForm.nfe_chave;
        if (manualForm.nfe_val_total) coletaParams.nfe_val_total = Math.round(parseFloat(manualForm.nfe_val_total) * 100);
        if (manualForm.nfe_val_prod) coletaParams.nfe_val_prod = Math.round(parseFloat(manualForm.nfe_val_prod) * 100);
      }

      const coletaResult = await registrarColeta(coletaParams);

      if (coletaResult) {
        await supabase.from('envios').update({
          awb: coletaResult.awb,
          num_protocolo: coletaResult.num_protocolo,
          status: 'coletado',
        }).eq('id', envioData.id);
        toast.success(`Coleta registrada! AWB: ${coletaResult.awb}`);

        // 3. Generate label automatically
        const labelResult = await smartLabel({
          pedido: manualForm.pedido,
          dest_nome: manualForm.dest_nome,
          dest_cpf_cnpj: cpfCnpj,
          dest_endereco: manualForm.dest_endereco,
          dest_numero: manualForm.dest_numero,
          dest_complemento: manualForm.dest_complemento || '',
          dest_bairro: manualForm.dest_bairro,
          dest_cidade: manualForm.dest_cidade,
          dest_estado: manualForm.dest_estado.toUpperCase(),
          dest_cep: cep,
          dest_email: manualForm.dest_email || '',
          dest_telefone: manualForm.dest_telefone || '',
          peso: parseFloat(manualForm.peso_kg) || 0.5,
          volumes: parseInt(manualForm.volumes) || 1,
          tipo_servico: parseInt(manualForm.tipo_servico),
          nfe_val_total: valorDeclaradoCentavos,
          nfe_val_prod: valorDeclaradoCentavos,
        });
        if (labelResult) {
          await supabase.from('envios').update({ etiqueta_gerada: true }).eq('id', envioData.id);
          toast.success('Etiqueta gerada automaticamente!');
        }
      }

      setManualDialog(false);
      setManualForm(EMPTY_MANUAL_FORM);
      loadEnvios();
    } catch (err) {
      console.error('Erro ao criar envio manual:', err);
      toast.error('Erro ao criar envio');
    }
    setManualLoading(false);
  };

  // === OPEN NF-e DIALOG BEFORE ONE-CLICK FLOW ===
  const openNfeDialog = (envio: Envio) => {
    setNfeEnvio(envio);
    setNfeForm({
      nfe_numero: '',
      nfe_serie: '1',
      nfe_data: '',
      nfe_val_total: envio.valor_declarado_centavos ? (envio.valor_declarado_centavos / 100).toFixed(2) : '',
      nfe_val_prod: envio.valor_declarado_centavos ? (envio.valor_declarado_centavos / 100).toFixed(2) : '',
      nfe_chave: '',
    });
    setNfeDialog(true);
  };

  const startOneClickFlow = () => {
    if (nfeEnvio) {
      setNfeDialog(false);
      handleOneClickFlow(nfeEnvio);
    }
  };

  // === ONE-CLICK SHOPIFY FLOW ===
  const handleOneClickFlow = async (envio: Envio) => {
    if (!envio.shopify_order_id) {
      toast.error('Este envio não tem pedido Shopify vinculado');
      return;
    }
    setOneClickLoading(envio.id);
    try {
      let awb = envio.awb;
      let numProtocolo = envio.num_protocolo;

      // Get NF-e data from the dialog form
      const nfeData = nfeForm.nfe_numero ? {
        nfe_numero: nfeForm.nfe_numero,
        nfe_serie: parseInt(nfeForm.nfe_serie) || 1,
        nfe_data: nfeForm.nfe_data || new Date().toISOString().split('T')[0],
        nfe_val_total: Math.round(parseFloat(nfeForm.nfe_val_total || '0') * 100),
        nfe_val_prod: Math.round(parseFloat(nfeForm.nfe_val_prod || '0') * 100),
        nfe_chave: nfeForm.nfe_chave,
      } : {};

      // Step 1: Register coleta (if no AWB and no existing protocol)
      if (!awb && !numProtocolo) {
        toast.info('Passo 1/3: Registrando coleta...');
        const pedidoNum = (envio.shopify_order_name || envio.id.toString()).replace(/\D/g, '');
        // Extract CPF/CNPJ from name if field is empty
        let cpfCnpj = (envio.dest_cpf_cnpj || '').replace(/\D/g, '');
        let destNome = envio.dest_nome;
        if (!cpfCnpj) {
          const match = destNome.match(/\b(\d{11}|\d{14})\b/);
          if (match) {
            cpfCnpj = match[1];
            destNome = destNome.replace(match[1], '').trim();
          }
        }
        const coletaResult = await registrarColeta({
          pedido: pedidoNum,
          dest_nome: destNome,
          dest_cpf_cnpj: cpfCnpj,
          dest_endereco: envio.dest_endereco || '',
          dest_numero: envio.dest_numero || 'S/N',
          dest_complemento: envio.dest_complemento || '',
          dest_bairro: envio.dest_bairro || '',
          dest_cidade: envio.dest_cidade || '',
          dest_estado: envio.dest_estado || '',
          dest_cep: envio.dest_cep,
          dest_email: envio.dest_email || '',
          dest_telefone: envio.dest_telefone || '',
          peso: envio.peso_kg || 0.5,
          volumes: envio.volumes,
          tipo_servico: envio.tipo_servico || 1,
          nfe_val_total: nfeData.nfe_val_total || envio.valor_declarado_centavos,
          nfe_val_prod: nfeData.nfe_val_prod || envio.valor_declarado_centavos,
          ...nfeData,
        });
        if (!coletaResult) {
          toast.error('Erro no passo 1: Registrar coleta');
          setOneClickLoading(null);
          return;
        }
        const alreadyRegistered = (coletaResult as Record<string, unknown>).already_registered === true;
        awb = coletaResult.awb;
        numProtocolo = coletaResult.num_protocolo;
        await supabase.from('envios').update({
          awb: awb || undefined, num_protocolo: numProtocolo, status: 'registrado',
        }).eq('id', envio.id);
        if (alreadyRegistered) {
          toast.info('Coleta já registrada anteriormente. Avançando para etiqueta...');
        } else {
          toast.success(`Coleta registrada! Protocolo: ${numProtocolo}${awb ? ` AWB: ${awb}` : ''}`);
        }
      }

      // Step 2: Generate label (SmartLabel)
      if (!envio.etiqueta_gerada) {
        toast.info('Passo 2/3: Gerando etiqueta...');
        const labelPedidoNum = (envio.shopify_order_name || envio.id.toString()).replace(/\D/g, '');
        let labelCpf = (envio.dest_cpf_cnpj || '').replace(/\D/g, '');
        let labelNome = envio.dest_nome;
        if (!labelCpf) {
          const m = labelNome.match(/\b(\d{11}|\d{14})\b/);
          if (m) { labelCpf = m[1]; labelNome = labelNome.replace(m[1], '').trim(); }
        }
        const labelResult = await smartLabel({
          pedido: labelPedidoNum,
          dest_nome: labelNome,
          dest_cpf_cnpj: labelCpf,
          dest_endereco: envio.dest_endereco || '',
          dest_numero: envio.dest_numero || 'S/N',
          dest_complemento: envio.dest_complemento || '',
          dest_bairro: envio.dest_bairro || '',
          dest_cidade: envio.dest_cidade || '',
          dest_estado: envio.dest_estado || '',
          dest_cep: envio.dest_cep,
          dest_email: envio.dest_email || '',
          dest_telefone: envio.dest_telefone || '',
          peso: envio.peso_kg || 0.5,
          volumes: envio.volumes,
          tipo_servico: envio.tipo_servico || 1,
          nfe_val_total: nfeData.nfe_val_total || envio.valor_declarado_centavos,
          nfe_val_prod: nfeData.nfe_val_prod || envio.valor_declarado_centavos,
          ...nfeData,
        }) as Record<string, unknown> | null;
        if (labelResult) {
          // Extract AWB from SmartLabel response
          const encomendas = labelResult.encomendas as Array<Record<string, unknown>> | undefined;
          const smartAwb = encomendas?.[0]?.awb as string || '';
          if (smartAwb && !awb) {
            awb = smartAwb;
          }
          await supabase.from('envios').update({
            etiqueta_gerada: true,
            status: 'aguardando_coleta',
            ...(smartAwb ? { awb: smartAwb } : {}),
          }).eq('id', envio.id);
          toast.success(`Etiqueta gerada!${smartAwb ? ` AWB: ${smartAwb}` : ''}`);
        } else {
          toast.warning('Etiqueta não gerada, mas continuando...');
        }
      }

      // Step 3: Create fulfillment in Shopify
      if (!envio.shopify_fulfillment_id && awb) {
        toast.info('Passo 3/3: Criando fulfillment no Shopify...');
        const fulfillResult = await createFulfillment({
          order_id: envio.shopify_order_id,
          tracking_number: awb,
          tracking_company: 'Total Express',
        });
        if (fulfillResult) {
          toast.success('Fulfillment criado no Shopify! Cliente notificado.');
        } else {
          toast.warning('Erro ao criar fulfillment no Shopify');
        }
      }

      loadEnvios();
    } catch (err) {
      console.error('Erro no fluxo automático:', err);
      toast.error('Erro no fluxo automático');
    }
    setOneClickLoading(null);
  };

  const stats = {
    total: envios.length,
    pendentes: envios.filter(e => e.status === 'pendente').length,
    emTransito: envios.filter(e => ['coletado', 'em_transito', 'saiu_entrega'].includes(e.status)).length,
    entregues: envios.filter(e => e.status === 'entregue').length,
  };

  const updateManualField = (field: string, value: string) => {
    setManualForm(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Truck className="h-8 w-8 text-primary" />
            Gerenciar Envios
          </h1>
          <p className="text-muted-foreground mt-1">
            Total Express — Coletas, etiquetas e rastreamento
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button onClick={() => setManualDialog(true)} className="bg-primary">
            <Plus className="h-4 w-4 mr-2" />
            Novo Envio Manual
          </Button>

          <Button variant="outline" onClick={handleBulkTracking} disabled={bulkTrackingLoading}>
            {bulkTrackingLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
            Atualizar Rastreios
          </Button>

          <Button variant="outline" onClick={handleImportOrders} disabled={importLoading}>
            {importLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
            Importar Pedidos Shopify
          </Button>

          <Button variant="outline" onClick={handleSyncFromShopify} disabled={syncLoading}>
            {syncLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RotateCcw className="h-4 w-4 mr-2" />}
            Sincronizar Rastreios Shopify
          </Button>

          <Dialog open={freteDialog} onOpenChange={setFreteDialog}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <MapPin className="h-4 w-4 mr-2" />
                Calcular Frete
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Calcular Frete</DialogTitle>
                <DialogDescription>Simule o valor e prazo de entrega</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>CEP Destino</Label>
                  <Input placeholder="00000-000" value={freteCep} onChange={e => setFreteCep(e.target.value)} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Peso (kg)</Label>
                    <Input type="number" step="0.1" value={fretePeso} onChange={e => setFretePeso(e.target.value)} />
                  </div>
                  <div>
                    <Label>Valor (R$)</Label>
                    <Input type="number" step="0.01" value={freteValor} onChange={e => setFreteValor(e.target.value)} />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label>Altura (cm)</Label>
                    <Input type="number" placeholder="Opcional" value={freteAltura} onChange={e => setFreteAltura(e.target.value)} />
                  </div>
                  <div>
                    <Label>Largura (cm)</Label>
                    <Input type="number" placeholder="Opcional" value={freteLargura} onChange={e => setFreteLargura(e.target.value)} />
                  </div>
                  <div>
                    <Label>Profundidade (cm)</Label>
                    <Input type="number" placeholder="Opcional" value={freteProfundidade} onChange={e => setFreteProfundidade(e.target.value)} />
                  </div>
                </div>
                <Button onClick={handleCalcularFrete} disabled={apiLoading} className="w-full">
                  {apiLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                  Calcular
                </Button>
                {freteResultado && (
                  <Card>
                    <CardContent className="pt-4 space-y-2">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Valor:</span>
                        <span className="font-bold text-lg">{freteResultado.valor_formatado}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Prazo:</span>
                        <span className="font-medium">{freteResultado.prazo_dias} dias úteis</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Rota:</span>
                        <span className="text-xs">{freteResultado.rota}</span>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={configDialog} onOpenChange={setConfigDialog}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Settings className="h-4 w-4 mr-2" />
                Configurações
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Configurações de Envio</DialogTitle>
                <DialogDescription>Configurar integração com Shopify e Total Express</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Carrier Service (Frete no Checkout)</CardTitle>
                    <CardDescription className="text-xs">Registrar cálculo de frete automático no checkout do Shopify</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button onClick={handleRegistrarCarrierService} disabled={apiLoading} variant="default" size="sm">
                      {apiLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Truck className="h-4 w-4 mr-2" />}
                      Registrar Carrier Service
                    </Button>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Status</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm space-y-1">
                    <p>✅ Total Express configurada</p>
                    <p>✅ Shopify conectado</p>
                  </CardContent>
                </Card>
              </div>
            </DialogContent>
          </Dialog>

          <Button onClick={loadEnvios} variant="outline" disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </div>
      </div>

      {/* Manual Shipment Dialog */}
      <Dialog open={manualDialog} onOpenChange={setManualDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Novo Envio Manual
            </DialogTitle>
            <DialogDescription>
              Crie um envio sem pedido Shopify. A coleta será registrada e a etiqueta gerada automaticamente.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* Dados do Pedido */}
            <div>
              <h4 className="font-medium text-sm mb-3 flex items-center gap-2"><FileText className="h-4 w-4" /> Dados do Pedido</h4>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <Label>Nº Pedido *</Label>
                  <Input value={manualForm.pedido} onChange={e => updateManualField('pedido', e.target.value)} placeholder="PED-2026-001" />
                </div>
                <div>
                  <Label>Tipo Serviço</Label>
                  <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={manualForm.tipo_servico} onChange={e => updateManualField('tipo_servico', e.target.value)}>
                    <option value="7">7 - Expresso</option>
                    <option value="1">1 - Standard</option>
                    <option value="5">5 - Premium</option>
                    <option value="11">11 - Total Hoje</option>
                  </select>
                </div>
                <div>
                  <Label>Tipo Entrega</Label>
                  <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={manualForm.tipo_entrega} onChange={e => updateManualField('tipo_entrega', e.target.value)}>
                    <option value="0">0 - Entrega Normal</option>
                    <option value="1">1 - GoBack (Devolução)</option>
                    <option value="2">2 - RMA (Retorno)</option>
                  </select>
                </div>
                <div>
                  <Label>Cond. Frete</Label>
                  <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={manualForm.cond_frete} onChange={e => updateManualField('cond_frete', e.target.value)}>
                    <option value="CIF">CIF (Cliente paga)</option>
                    <option value="FOB">FOB (Remetente paga)</option>
                  </select>
                </div>
                <div>
                  <Label>Volumes</Label>
                  <Input type="number" min="1" value={manualForm.volumes} onChange={e => updateManualField('volumes', e.target.value)} />
                </div>
                <div>
                  <Label>Natureza</Label>
                  <Input value={manualForm.natureza} onChange={e => updateManualField('natureza', e.target.value)} placeholder="Mercadoria Diversa" />
                </div>
              </div>
            </div>

            {/* Destinatário */}
            <div className="border-t pt-4">
              <h4 className="font-medium text-sm mb-3">Destinatário *</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label>Nome *</Label>
                  <Input value={manualForm.dest_nome} onChange={e => updateManualField('dest_nome', e.target.value)} placeholder="Nome completo" />
                </div>
                <div>
                  <Label>CPF/CNPJ * (sem máscara)</Label>
                  <Input value={manualForm.dest_cpf_cnpj} onChange={e => updateManualField('dest_cpf_cnpj', e.target.value)} placeholder="12345678901" />
                </div>
                <div>
                  <Label>CEP * (8 dígitos)</Label>
                  <Input value={manualForm.dest_cep} onChange={e => updateManualField('dest_cep', e.target.value)} placeholder="01310100" maxLength={9} />
                </div>
              </div>
            </div>

            {/* Endereço */}
            <div className="border-t pt-4">
              <h4 className="font-medium text-sm mb-3">Endereço</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label>Endereço *</Label>
                  <Input value={manualForm.dest_endereco} onChange={e => updateManualField('dest_endereco', e.target.value)} placeholder="Rua das Flores" />
                </div>
                <div>
                  <Label>Número *</Label>
                  <Input value={manualForm.dest_numero} onChange={e => updateManualField('dest_numero', e.target.value)} placeholder="123" />
                </div>
                <div>
                  <Label>Complemento</Label>
                  <Input value={manualForm.dest_complemento} onChange={e => updateManualField('dest_complemento', e.target.value)} placeholder="Apto 456" />
                </div>
                <div>
                  <Label>Bairro *</Label>
                  <Input value={manualForm.dest_bairro} onChange={e => updateManualField('dest_bairro', e.target.value)} placeholder="Centro" />
                </div>
                <div>
                  <Label>Cidade *</Label>
                  <Input value={manualForm.dest_cidade} onChange={e => updateManualField('dest_cidade', e.target.value)} placeholder="São Paulo" />
                </div>
                <div>
                  <Label>Estado (UF) *</Label>
                  <Input value={manualForm.dest_estado} onChange={e => updateManualField('dest_estado', e.target.value.toUpperCase())} placeholder="SP" maxLength={2} />
                </div>
              </div>
            </div>

            {/* Contato */}
            <div className="border-t pt-4">
              <h4 className="font-medium text-sm mb-3">Contato (recomendado)</h4>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label>E-mail</Label>
                  <Input value={manualForm.dest_email} onChange={e => updateManualField('dest_email', e.target.value)} placeholder="email@exemplo.com" />
                </div>
                <div>
                  <Label>DDD</Label>
                  <Input value={manualForm.dest_ddd} onChange={e => updateManualField('dest_ddd', e.target.value)} placeholder="11" maxLength={2} />
                </div>
                <div>
                  <Label>Telefone</Label>
                  <Input value={manualForm.dest_telefone} onChange={e => updateManualField('dest_telefone', e.target.value)} placeholder="987654321" />
                </div>
              </div>
            </div>

            {/* Pacote */}
            <div className="border-t pt-4">
              <h4 className="font-medium text-sm mb-3">Pacote</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Peso (kg)</Label>
                  <Input type="number" step="0.1" value={manualForm.peso_kg} onChange={e => updateManualField('peso_kg', e.target.value)} />
                </div>
                <div>
                  <Label>Valor declarado (R$)</Label>
                  <Input type="number" step="0.01" value={manualForm.valor_declarado} onChange={e => updateManualField('valor_declarado', e.target.value)} />
                </div>
              </div>
            </div>

            {/* NF-e (Opcional) */}
            <div className="border-t pt-4">
              <h4 className="font-medium text-sm mb-3">Nota Fiscal NF-e (opcional)</h4>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <Label>Número NF-e</Label>
                  <Input value={manualForm.nfe_numero} onChange={e => updateManualField('nfe_numero', e.target.value)} placeholder="123456789" />
                </div>
                <div>
                  <Label>Série</Label>
                  <Input value={manualForm.nfe_serie} onChange={e => updateManualField('nfe_serie', e.target.value)} placeholder="001" />
                </div>
                <div>
                  <Label>Data Emissão</Label>
                  <Input type="date" value={manualForm.nfe_data} onChange={e => updateManualField('nfe_data', e.target.value)} />
                </div>
                <div>
                  <Label>Valor Total (R$)</Label>
                  <Input type="number" step="0.01" value={manualForm.nfe_val_total} onChange={e => updateManualField('nfe_val_total', e.target.value)} placeholder="1234.56" />
                </div>
                <div>
                  <Label>Valor Produtos (R$)</Label>
                  <Input type="number" step="0.01" value={manualForm.nfe_val_prod} onChange={e => updateManualField('nfe_val_prod', e.target.value)} placeholder="1200.00" />
                </div>
                <div className="col-span-2 md:col-span-3">
                  <Label>Chave NF-e (44 dígitos)</Label>
                  <Input value={manualForm.nfe_chave} onChange={e => updateManualField('nfe_chave', e.target.value)} placeholder="35260213123456789012345678901234567890" maxLength={44} />
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setManualDialog(false)}>Cancelar</Button>
            <Button onClick={handleManualSubmit} disabled={manualLoading}>
              {manualLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
              Criar Envio + Registrar Coleta + Etiqueta
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* NF-e Dialog for One-Click Flow */}
      <Dialog open={nfeDialog} onOpenChange={setNfeDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Dados Fiscais (Opcional)
            </DialogTitle>
            <DialogDescription>
              Preencha os dados da NF-e se disponíveis, ou clique "Prosseguir sem NF-e" para usar declaração de conteúdo.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {nfeEnvio && (
              <div className="text-sm bg-muted p-3 rounded-md">
                <p><strong>Pedido:</strong> {nfeEnvio.shopify_order_name || `#${nfeEnvio.id}`}</p>
                <p><strong>Destinatário:</strong> {nfeEnvio.dest_nome}</p>
                <p><strong>Status:</strong> {nfeEnvio.num_protocolo ? `Coleta já registrada (Protocolo: ${nfeEnvio.num_protocolo})` : 'Pendente'}</p>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Número NF-e</Label>
                <Input value={nfeForm.nfe_numero} onChange={e => setNfeForm(f => ({ ...f, nfe_numero: e.target.value }))} placeholder="123456789" />
              </div>
              <div>
                <Label>Série</Label>
                <Input value={nfeForm.nfe_serie} onChange={e => setNfeForm(f => ({ ...f, nfe_serie: e.target.value }))} placeholder="1" />
              </div>
              <div>
                <Label>Data Emissão</Label>
                <Input type="date" value={nfeForm.nfe_data} onChange={e => setNfeForm(f => ({ ...f, nfe_data: e.target.value }))} />
              </div>
              <div>
                <Label>Valor Total (R$)</Label>
                <Input type="number" step="0.01" value={nfeForm.nfe_val_total} onChange={e => setNfeForm(f => ({ ...f, nfe_val_total: e.target.value }))} placeholder="0.00" />
              </div>
              <div>
                <Label>Valor Produtos (R$)</Label>
                <Input type="number" step="0.01" value={nfeForm.nfe_val_prod} onChange={e => setNfeForm(f => ({ ...f, nfe_val_prod: e.target.value }))} placeholder="0.00" />
              </div>
            </div>
            <div>
              <Label>Chave NF-e (44 dígitos)</Label>
              <Input value={nfeForm.nfe_chave} onChange={e => setNfeForm(f => ({ ...f, nfe_chave: e.target.value }))} placeholder="35260213123456789012345678901234567890" maxLength={44} />
            </div>
          </div>
          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={startOneClickFlow}>
              <Zap className="h-4 w-4 mr-2" />
              Prosseguir sem NF-e
            </Button>
            <Button onClick={startOneClickFlow} disabled={!nfeForm.nfe_numero || !nfeForm.nfe_chave}>
              <FileText className="h-4 w-4 mr-2" />
              Prosseguir com NF-e
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">Total de envios</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-yellow-600">{stats.pendentes}</div>
            <p className="text-xs text-muted-foreground">Pendentes</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-blue-600">{stats.emTransito}</div>
            <p className="text-xs text-muted-foreground">Em trânsito</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-green-600">{stats.entregues}</div>
            <p className="text-xs text-muted-foreground">Entregues</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters & Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Envios ({filteredEnvios.length})
            </CardTitle>
            <div className="flex gap-2 flex-wrap items-center">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome, AWB, pedido..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-[250px]"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={statusFilter} onValueChange={setStatusFilter}>
            <TabsList className="mb-4">
              <TabsTrigger value="todos">Todos</TabsTrigger>
              <TabsTrigger value="pendente">Pendentes</TabsTrigger>
              <TabsTrigger value="coletado">Coletados</TabsTrigger>
              <TabsTrigger value="em_transito">Em Trânsito</TabsTrigger>
              <TabsTrigger value="entregue">Entregues</TabsTrigger>
              <TabsTrigger value="problema">Problemas</TabsTrigger>
            </TabsList>

            <TabsContent value={statusFilter} className="mt-0">
              {isLoading ? (
                <div className="space-y-3">
                  {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
                </div>
              ) : filteredEnvios.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Truck className="h-12 w-12 mx-auto mb-4 opacity-30" />
                  <p className="text-lg font-medium">Nenhum envio encontrado</p>
                  <p className="text-sm">Os envios aparecerão aqui quando pedidos forem registrados</p>
                </div>
              ) : (
                <div className="rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Pedido</TableHead>
                        <TableHead>Destinatário</TableHead>
                        <TableHead>CEP</TableHead>
                        <TableHead>AWB</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Frete</TableHead>
                        <TableHead>Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredEnvios.map((envio) => (
                        <TableRow key={envio.id}>
                          <TableCell>
                            <div className="font-medium">{envio.shopify_order_name || `#${envio.id}`}</div>
                            <div className="text-xs text-muted-foreground">
                              {new Date(envio.created_at).toLocaleDateString('pt-BR')}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="font-medium">{envio.dest_nome}</div>
                            <div className="text-xs text-muted-foreground">
                              {envio.dest_cidade}/{envio.dest_estado}
                            </div>
                          </TableCell>
                          <TableCell className="font-mono text-sm">{envio.dest_cep}</TableCell>
                          <TableCell>
                            {editingAwb === envio.id ? (
                              <div className="flex items-center gap-1">
                                <Input
                                  value={editAwbValue}
                                  onChange={e => setEditAwbValue(e.target.value)}
                                  className="h-7 w-[140px] text-xs font-mono"
                                  placeholder="Código AWB"
                                  autoFocus
                                />
                                <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => handleSaveAwb(envio)}>
                                  <Save className="h-3 w-3" />
                                </Button>
                                <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setEditingAwb(null)}>
                                  <X className="h-3 w-3" />
                                </Button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1 group cursor-pointer" onClick={() => { setEditingAwb(envio.id); setEditAwbValue(envio.awb || ''); }}>
                                {envio.awb ? (
                                  <span className="font-mono text-xs">{envio.awb}</span>
                                ) : (
                                  <span className="text-muted-foreground text-xs">—</span>
                                )}
                                <Edit2 className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                              </div>
                            )}
                          </TableCell>
                          <TableCell><StatusBadge status={envio.status} /></TableCell>
                          <TableCell className="text-right">
                            {envio.valor_frete_centavos > 0
                              ? `R$ ${(envio.valor_frete_centavos / 100).toFixed(2)}`
                              : '—'}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              {/* One-click flow for Shopify orders without AWB */}
                              {envio.shopify_order_id && !envio.awb && (
                                <Button
                                  size="sm" variant="default"
                                  onClick={() => openNfeDialog(envio)}
                                  disabled={oneClickLoading === envio.id}
                                  title="Fluxo automático: Coleta + Etiqueta + Fulfillment"
                                  className="bg-primary"
                                >
                                  {oneClickLoading === envio.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Zap className="h-3 w-3" />}
                                </Button>
                              )}
                              {!envio.awb && !envio.shopify_order_id && (
                                <Button
                                  size="sm" variant="outline"
                                  onClick={() => handleRegistrarColeta(envio)}
                                  disabled={actionLoading === envio.id}
                                  title="Registrar Coleta"
                                >
                                  {actionLoading === envio.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
                                </Button>
                              )}
                              {(envio.num_protocolo || envio.status === 'registrado' || envio.status === 'aguardando_coleta') && (!envio.etiqueta_gerada || !envio.awb) && (
                                <Button
                                  size="sm" variant="outline"
                                  onClick={() => handleGerarEtiqueta(envio)}
                                  disabled={actionLoading === envio.id}
                                  title="Gerar Etiqueta"
                                >
                                  {actionLoading === envio.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Tag className="h-3 w-3" />}
                                </Button>
                              )}
                              {envio.awb && envio.etiqueta_gerada && (
                                <Button
                                  size="sm" variant="outline"
                                  onClick={() => {
                                    const url = envio.etiqueta_url || `https://totalconecta.totalexpress.com.br/rastreamento/rastreamento/encomendas/${envio.awb}`;
                                    window.open(url, '_blank');
                                  }}
                                  title={`Ver Etiqueta / Rastreio (AWB: ${envio.awb})`}
                                >
                                  <ExternalLink className="h-3 w-3" />
                                </Button>
                              )}
                              {envio.awb && (
                                <Button
                                  size="sm" variant="outline"
                                  onClick={() => handleRastrear(envio)}
                                  disabled={actionLoading === envio.id}
                                  title="Rastrear"
                                >
                                  {actionLoading === envio.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <MapPin className="h-3 w-3" />}
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
