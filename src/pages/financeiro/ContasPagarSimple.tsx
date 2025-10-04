import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';

interface ParcelaSimple {
  id: number;
  conta_id: number;
  numero_parcela: number;
  valor_parcela_centavos: number;
  vencimento: string;
  pago: boolean;
  descricao: string;
  fornecedor: string;
}

export function ContasPagarSimple() {
  const [parcelas, setParcelas] = useState<ParcelaSimple[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchParcelas();
  }, []);

  const fetchParcelas = async () => {
    try {
      console.log('🔍 Buscando parcelas...');
      
      // Consulta SQL simples e direta
      const { data, error } = await supabase.rpc('get_parcelas_contas_pagar');
      
      if (error) {
        console.error('Erro RPC, tentando consulta direta:', error);
        
        // Fallback: consulta direta
        const { data: parcelasData, error: parcelasError } = await supabase
          .from('contas_pagar_parcelas')
          .select('*')
          .eq('pago', false)
          .order('vencimento')
          .limit(50);
          
        if (parcelasError) throw parcelasError;
        
        // Buscar dados das contas separadamente
        const contasIds = [...new Set(parcelasData?.map(p => p.conta_id) || [])];
        const { data: contasData, error: contasError } = await supabase
          .from('contas_pagar')
          .select('id, descricao, fornecedor_id')
          .in('id', contasIds);
          
        if (contasError) throw contasError;
        
        // Buscar fornecedores
        const fornecedorIds = [...new Set(contasData?.map(c => c.fornecedor_id) || [])];
        const { data: fornecedoresData, error: fornecedoresError } = await supabase
          .from('pessoas_juridicas')
          .select('id, nome_fantasia')
          .in('id', fornecedorIds);
          
        if (fornecedoresError) throw fornecedoresError;
        
        // Combinar dados
        const parcelasCompletas = parcelasData?.map(parcela => {
          const conta = contasData?.find(c => c.id === parcela.conta_id);
          const fornecedor = fornecedoresData?.find(f => f.id === conta?.fornecedor_id);
          
          return {
            id: parcela.id,
            conta_id: parcela.conta_id,
            numero_parcela: parcela.numero_parcela || parcela.parcela_num || 1,
            valor_parcela_centavos: parcela.valor_parcela_centavos,
            vencimento: parcela.vencimento,
            pago: parcela.pago,
            descricao: conta?.descricao || 'N/A',
            fornecedor: fornecedor?.nome_fantasia || 'N/A'
          };
        }) || [];
        
        setParcelas(parcelasCompletas);
      } else {
        setParcelas(data || []);
      }
      
      console.log('✅ Parcelas carregadas:', parcelas.length);
    } catch (error) {
      console.error('Erro ao buscar parcelas:', error);
      setParcelas([]);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (centavos: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(centavos / 100);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const getStatusBadge = (vencimento: string, pago: boolean) => {
    if (pago) return <Badge variant="secondary">Pago</Badge>;
    
    const hoje = new Date();
    const dataVencimento = new Date(vencimento);
    
    if (dataVencimento < hoje) {
      return <Badge variant="destructive">Vencido</Badge>;
    } else if (dataVencimento <= new Date(hoje.getTime() + 7 * 24 * 60 * 60 * 1000)) {
      return <Badge variant="outline">Vence em 7 dias</Badge>;
    } else {
      return <Badge variant="default">Em aberto</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Contas a Pagar</h1>
          <p className="text-muted-foreground">Carregando parcelas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Contas a Pagar</h1>
        <p className="text-muted-foreground">
          {parcelas.length} parcela(s) em aberto
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lista de Parcelas</CardTitle>
          <CardDescription>
            Parcelas importadas dos XMLs de notas fiscais
          </CardDescription>
        </CardHeader>
        <CardContent>
          {parcelas.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Nenhuma parcela encontrada
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Fornecedor</TableHead>
                  <TableHead>Parcela</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Vencimento</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {parcelas.map((parcela) => (
                  <TableRow key={parcela.id}>
                    <TableCell className="font-medium">
                      {parcela.descricao}
                    </TableCell>
                    <TableCell>{parcela.fornecedor}</TableCell>
                    <TableCell>{parcela.numero_parcela}</TableCell>
                    <TableCell>{formatCurrency(parcela.valor_parcela_centavos)}</TableCell>
                    <TableCell>{formatDate(parcela.vencimento)}</TableCell>
                    <TableCell>
                      {getStatusBadge(parcela.vencimento, parcela.pago)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
