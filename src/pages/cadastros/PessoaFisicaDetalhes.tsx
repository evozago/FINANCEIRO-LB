import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, User, Briefcase, MapPin, Phone, Mail, Calendar, DollarSign, FileText, History } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';

interface PessoaFisica {
  id: number;
  nome_completo: string;
  cpf?: string;
  celular?: string;
  email?: string;
  endereco?: string;
  nascimento?: string;
  num_cadastro_folha?: string;
  filial_id?: number;
  cargo_id?: number;
  created_at: string;
  updated_at: string;
  filiais?: { nome: string };
  cargos?: { nome: string };
}

interface Venda {
  id: number;
  data: string;
  valor_liquido_centavos: number;
  qtd_itens: number;
  filiais?: { nome: string };
}

interface Parcela {
  id: number;
  vencimento: string;
  valor_parcela_centavos: number;
  pago: boolean;
  pago_em?: string;
  contas_pagar: {
    descricao: string;
    numero_nota?: string;
  };
}

export function PessoaFisicaDetalhes() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [pessoa, setPessoa] = useState<PessoaFisica | null>(null);
  const [vendas, setVendas] = useState<Venda[]>([]);
  const [parcelas, setParcelas] = useState<Parcela[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      fetchPessoaDetalhes();
      fetchVendas();
      fetchParcelas();
    }
  }, [id]);

  const fetchPessoaDetalhes = async () => {
    try {
      const { data, error } = await supabase
        .from('pessoas_fisicas')
        .select(`
          *,
          filiais(nome),
          cargos(nome)
        `)
        .eq('id', parseInt(id!))
        .single();

      if (error) throw error;
      setPessoa(data);
    } catch (error) {
      console.error('Erro ao buscar pessoa física:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os dados da pessoa.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchVendas = async () => {
    try {
      const { data, error } = await supabase
        .from('vendas_diarias')
        .select(`
          id,
          data,
          valor_liquido_centavos,
          qtd_itens,
          filiais(nome)
        `)
        .eq('vendedora_pf_id', parseInt(id!))
        .order('data', { ascending: false })
        .limit(50);

      if (error) throw error;
      setVendas(data || []);
    } catch (error) {
      console.error('Erro ao buscar vendas:', error);
    }
  };

  const fetchParcelas = async () => {
    if (!id) return;
    
    try {
      const pfId = parseInt(id);
      
      // Usando fetch direto para evitar problemas de type inference
      const supabaseUrl = 'https://tntvymprraevwhmrcjio.supabase.co';
      const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRudHZ5bXBycmFldndobXJjamlvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkxNDkxMTAsImV4cCI6MjA3NDcyNTExMH0.d16oYzYRw04sMfP5F0hcw0Swmy1y_9mxIcUQNYUclSw';
      
      // Buscar contas onde esta PF é fornecedora
      const contasRes = await fetch(
        `${supabaseUrl}/rest/v1/contas_pagar?fornecedor_pf_id=eq.${pfId}&select=id`,
        {
          headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`
          }
        }
      );
      const contasData = await contasRes.json();
      const contaIds = contasData.map((c: any) => c.id);
      
      if (contaIds.length === 0) {
        setParcelas([]);
        return;
      }

      // Buscar parcelas dessas contas
      const parcelasRes = await fetch(
        `${supabaseUrl}/rest/v1/contas_pagar_parcelas?conta_id=in.(${contaIds.join(',')})&select=id,vencimento,valor_parcela_centavos,pago,pago_em,conta_id&order=vencimento.desc&limit=50`,
        {
          headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`
          }
        }
      );
      const parcelasData = await parcelasRes.json();

      // Buscar info das contas
      const contasInfoRes = await fetch(
        `${supabaseUrl}/rest/v1/contas_pagar?id=in.(${contaIds.join(',')})&select=id,descricao,numero_nota`,
        {
          headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`
          }
        }
      );
      const contasInfoData = await contasInfoRes.json();

      // Mapear contas por ID
      const contasMap: Record<number, any> = {};
      contasInfoData.forEach((conta: any) => {
        contasMap[conta.id] = conta;
      });

      // Combinar parcelas com info das contas
      const parcelasFinais: Parcela[] = parcelasData.map((parcela: any) => ({
        id: parcela.id,
        vencimento: parcela.vencimento,
        valor_parcela_centavos: parcela.valor_parcela_centavos,
        pago: parcela.pago,
        pago_em: parcela.pago_em,
        contas_pagar: contasMap[parcela.conta_id] || { descricao: 'N/A', numero_nota: '' }
      }));

      setParcelas(parcelasFinais);
    } catch (error) {
      console.error('Erro ao buscar parcelas:', error);
      setParcelas([]);
    }
  };

  const formatCurrency = (centavos: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(centavos / 100);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('pt-BR');
  };

  const formatDateTime = (date: string) => {
    return new Date(date).toLocaleString('pt-BR');
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-3/4" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (!pessoa) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Pessoa não encontrada</p>
        <Button onClick={() => navigate('/cadastros/pessoas-fisicas')} className="mt-4">
          Voltar
        </Button>
      </div>
    );
  }

  const totalVendas = vendas.reduce((sum, v) => sum + v.valor_liquido_centavos, 0);
  const totalItensVendidos = vendas.reduce((sum, v) => sum + v.qtd_itens, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => navigate('/cadastros/pessoas-fisicas')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{pessoa.nome_completo}</h1>
            <p className="text-muted-foreground">
              Cadastrado em {formatDate(pessoa.created_at)}
            </p>
          </div>
        </div>
      </div>

      {/* Cards de Informações Principais */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cargo</CardTitle>
            <Briefcase className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pessoa.cargos?.nome || 'Não definido'}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Filial</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pessoa.filiais?.nome || 'Não definido'}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Vendas</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalVendas)}</div>
            <p className="text-xs text-muted-foreground">{vendas.length} vendas registradas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Produtos Vendidos</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalItensVendidos}</div>
            <p className="text-xs text-muted-foreground">Total de itens</p>
          </CardContent>
        </Card>
      </div>

      {/* Dados Pessoais */}
      <Card>
        <CardHeader>
          <CardTitle>Dados Pessoais</CardTitle>
          <CardDescription>Informações cadastrais da pessoa</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <User className="h-4 w-4" />
                CPF
              </div>
              <div className="font-medium">{pessoa.cpf || 'Não informado'}</div>
            </div>
            <div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <Calendar className="h-4 w-4" />
                Data de Nascimento
              </div>
              <div className="font-medium">
                {pessoa.nascimento ? formatDate(pessoa.nascimento) : 'Não informado'}
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <Phone className="h-4 w-4" />
                Celular
              </div>
              <div className="font-medium">{pessoa.celular || 'Não informado'}</div>
            </div>
            <div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <Mail className="h-4 w-4" />
                E-mail
              </div>
              <div className="font-medium">{pessoa.email || 'Não informado'}</div>
            </div>
            <div className="md:col-span-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <MapPin className="h-4 w-4" />
                Endereço
              </div>
              <div className="font-medium">{pessoa.endereco || 'Não informado'}</div>
            </div>
            <div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <FileText className="h-4 w-4" />
                Nº Cadastro Folha
              </div>
              <div className="font-medium">{pessoa.num_cadastro_folha || 'Não informado'}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs de Histórico */}
      <Tabs defaultValue="vendas" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="vendas">Histórico de Vendas</TabsTrigger>
          <TabsTrigger value="parcelas">Parcelas</TabsTrigger>
          <TabsTrigger value="alteracoes">Alterações</TabsTrigger>
        </TabsList>

        <TabsContent value="vendas" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Histórico de Vendas</CardTitle>
              <CardDescription>Últimas 50 vendas realizadas</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Filial</TableHead>
                    <TableHead className="text-center">Qtd Itens</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vendas.map((venda) => (
                    <TableRow key={venda.id}>
                      <TableCell>{formatDate(venda.data)}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{venda.filiais?.nome || 'Sem filial'}</Badge>
                      </TableCell>
                      <TableCell className="text-center">{venda.qtd_itens}</TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(venda.valor_liquido_centavos)}
                      </TableCell>
                    </TableRow>
                  ))}
                  {vendas.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground">
                        Nenhuma venda registrada
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="parcelas" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Histórico de Parcelas</CardTitle>
              <CardDescription>Últimas 50 parcelas relacionadas</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Conta</TableHead>
                    <TableHead>Nº Nota</TableHead>
                    <TableHead>Vencimento</TableHead>
                    <TableHead>Pago em</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parcelas.map((parcela) => (
                    <TableRow key={parcela.id}>
                      <TableCell className="font-medium">
                        {parcela.contas_pagar?.descricao || 'Sem descrição'}
                      </TableCell>
                      <TableCell>{parcela.contas_pagar?.numero_nota || '-'}</TableCell>
                      <TableCell>{formatDate(parcela.vencimento)}</TableCell>
                      <TableCell>
                        {parcela.pago_em ? formatDate(parcela.pago_em) : '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(parcela.valor_parcela_centavos)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={parcela.pago ? 'default' : 'destructive'}>
                          {parcela.pago ? 'Paga' : 'Aberta'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                  {parcelas.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground">
                        Nenhuma parcela registrada
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="alteracoes" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Histórico de Alterações</CardTitle>
              <CardDescription>Registro de modificações no cadastro</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-start gap-4">
                  <div className="rounded-full bg-primary/10 p-2">
                    <History className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">Cadastro criado</p>
                    <p className="text-sm text-muted-foreground">
                      {formatDateTime(pessoa.created_at)}
                    </p>
                  </div>
                </div>
                <Separator />
                <div className="flex items-start gap-4">
                  <div className="rounded-full bg-primary/10 p-2">
                    <History className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">Última atualização</p>
                    <p className="text-sm text-muted-foreground">
                      {formatDateTime(pessoa.updated_at)}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
