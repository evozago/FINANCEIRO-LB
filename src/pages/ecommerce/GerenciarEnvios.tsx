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
  AlertCircle, Clock, Send, FileText, Settings, Loader2, Download
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

  const { loading: apiLoading, calcularFrete, registrarColeta, rastrearPorAwb, registerCarrierService, smartLabel, importOrders } = useTotalExpress();

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
      nfe_val_total: envio.valor_declarado_centavos,
      nfe_val_prod: envio.valor_declarado_centavos,
    });

    if (result) {
      await supabase.from('envios').update({
        etiqueta_gerada: true,
      }).eq('id', envio.id);
      toast.success('Etiqueta gerada com sucesso!');
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
    const result = await rastrearPorAwb([envio.awb]);
    if (result) {
      const trackingData = result as { data?: unknown[] };
      await supabase.from('envios').update({
        tracking_historico: JSON.parse(JSON.stringify(trackingData.data || result)),
        ultimo_tracking_at: new Date().toISOString(),
      }).eq('id', envio.id);
      toast.success('Rastreamento atualizado!');
      loadEnvios();
    } else {
      toast.error('Erro ao rastrear');
    }
    setActionLoading(null);
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

  const stats = {
    total: envios.length,
    pendentes: envios.filter(e => e.status === 'pendente').length,
    emTransito: envios.filter(e => ['coletado', 'em_transito', 'saiu_entrega'].includes(e.status)).length,
    entregues: envios.filter(e => e.status === 'entregue').length,
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
          <Button variant="outline" onClick={handleImportOrders} disabled={importLoading}>
            {importLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
            Importar Pedidos Shopify
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

      {/* Stats */}
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
                            {envio.awb ? (
                              <span className="font-mono text-xs">{envio.awb}</span>
                            ) : (
                              <span className="text-muted-foreground text-xs">—</span>
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
                              {!envio.awb && (
                                <Button
                                  size="sm" variant="outline"
                                  onClick={() => handleRegistrarColeta(envio)}
                                  disabled={actionLoading === envio.id}
                                >
                                  {actionLoading === envio.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
                                </Button>
                              )}
                              {envio.awb && (
                                <>
                                  <Button
                                    size="sm" variant="outline"
                                    onClick={() => handleGerarEtiqueta(envio)}
                                    disabled={actionLoading === envio.id}
                                    title="Gerar Etiqueta"
                                  >
                                    {actionLoading === envio.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Tag className="h-3 w-3" />}
                                  </Button>
                                  <Button
                                    size="sm" variant="outline"
                                    onClick={() => handleRastrear(envio)}
                                    disabled={actionLoading === envio.id}
                                    title="Rastrear"
                                  >
                                    {actionLoading === envio.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <MapPin className="h-3 w-3" />}
                                  </Button>
                                </>
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
