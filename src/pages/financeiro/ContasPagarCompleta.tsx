import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Filter,
  Settings,
  Edit,
  Trash2,
  CheckCircle,
  MoreHorizontal,
  Plus,
  DollarSign,
  Eye
} from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { FiltrosAvancados } from '@/components/financeiro/FiltrosAvancados';
import { supabase } from '@/integrations/supabase/client';

// Interfaces
interface Conta {
  id: string;
  descricao: string;
  numero_nota?: string;
  valor_total: number;
  num_parcelas: number;
  data_emissao: string;
  fornecedor?: {
    id: number;
    nome: string;
  };
}

interface Parcela {
  id: string;
  conta_id: string;
  parcela_num: number;
  valor: number;
  vencimento: string;
  pago: boolean;
  conta?: Conta;
}

function ContasPagarCompleta() {
  // Estados
  const [parcelas, setParcelas] = useState<Parcela[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedParcelas, setSelectedParcelas] = useState<string[]>([]);
  const [busca, setBusca] = useState('');
  const [statusFiltro, setStatusFiltro] = useState('todos');
  const [showFiltrosAvancados, setShowFiltrosAvancados] = useState(false);
  const [filtrosAplicados, setFiltrosAplicados] = useState<any>({});
  const [parcelasOriginais, setParcelasOriginais] = useState<Parcela[]>([]);
  const [contasBancarias, setContasBancarias] = useState<any[]>([]);

  // Dados mockados para demonstração
  useEffect(() => {
    carregarDados();
    carregarContasBancarias();
  }, []);

  const carregarDados = async () => {
    setLoading(true);

      const parcelasMock: Parcela[] = [
        {
          id: '1',
          conta_id: '1',
          parcela_num: 1,
          valor: 91.80,
          vencimento: '2025-09-17',
          pago: false,
          conta: {
            id: '1',
            descricao: 'NFe 106005 - RRC COMPANY LTDA.',
            numero_nota: '106005',
            valor_total: 91.80,
            num_parcelas: 1,
            data_emissao: '2025-08-17',
            fornecedor: { id: 1, nome: 'N/A' }
          }
        },
        {
          id: '2',
          conta_id: '2',
          parcela_num: 1,
          valor: 108.89,
          vencimento: '2025-09-17',
          pago: false,
          conta: {
            id: '2',
            descricao: 'NFe 183406 - ART BOX 3D COMERCIO E SERVICOS DE IMPRESSOES LTDA',
            numero_nota: '183406',
            valor_total: 108.89,
            num_parcelas: 1,
            data_emissao: '2025-08-17',
            fornecedor: { id: 2, nome: 'ART BOX 3D' }
          }
        },
        {
          id: '3',
          conta_id: '3',
          parcela_num: 1,
          valor: 3974.48,
          vencimento: '2025-10-06',
          pago: false,
          conta: {
            id: '3',
            descricao: 'NFe 8097 - XUA BABY PRODUTOS INFANTIS EIRELI - ME',
            numero_nota: '8097',
            valor_total: 23846.88,
            num_parcelas: 6,
            data_emissao: '2025-09-06',
            fornecedor: { id: 3, nome: 'XUA BABY' }
          }
        },
        {
          id: '4',
          conta_id: '3',
          parcela_num: 2,
          valor: 3974.50,
          vencimento: '2025-10-20',
          pago: false,
          conta: {
            id: '3',
            descricao: 'NFe 8097 - XUA BABY PRODUTOS INFANTIS EIRELI - ME',
            numero_nota: '8097',
            valor_total: 23846.88,
            num_parcelas: 6,
            data_emissao: '2025-09-06',
            fornecedor: { id: 3, nome: 'XUA BABY' }
          }
        },
        {
          id: '5',
          conta_id: '3',
          parcela_num: 3,
          valor: 3974.50,
          vencimento: '2025-11-04',
          pago: false,
          conta: {
            id: '3',
            descricao: 'NFe 8097 - XUA BABY PRODUTOS INFANTIS EIRELI - ME',
            numero_nota: '8097',
            valor_total: 23846.88,
            num_parcelas: 6,
            data_emissao: '2025-09-06',
            fornecedor: { id: 3, nome: 'XUA BABY' }
          }
        },
        {
          id: '6',
          conta_id: '4',
          parcela_num: 1,
          valor: 1138.74,
          vencimento: '2025-10-14',
          pago: false,
          conta: {
            id: '4',
            descricao: 'NFe 383742 - ABRANGE IND E COM CONF LTDA',
            numero_nota: '383742',
            valor_total: 3416.22,
            num_parcelas: 3,
            data_emissao: '2025-09-14',
            fornecedor: { id: 4, nome: 'ABRANGE' }
          }
        },
        {
          id: '7',
          conta_id: '4',
          parcela_num: 2,
          valor: 1138.74,
          vencimento: '2025-11-11',
          pago: false,
          conta: {
            id: '4',
            descricao: 'NFe 383742 - ABRANGE IND E COM CONF LTDA',
            numero_nota: '383742',
            valor_total: 3416.22,
            num_parcelas: 3,
            data_emissao: '2025-09-14',
            fornecedor: { id: 4, nome: 'ABRANGE' }
          }
        },
        {
          id: '8',
          conta_id: '4',
          parcela_num: 3,
          valor: 1138.74,
          vencimento: '2025-12-09',
          pago: false,
          conta: {
            id: '4',
            descricao: 'NFe 383742 - ABRANGE IND E COM CONF LTDA',
            numero_nota: '383742',
            valor_total: 3416.22,
            num_parcelas: 3,
            data_emissao: '2025-09-14',
            fornecedor: { id: 4, nome: 'ABRANGE' }
          }
        }
      ];
      
      setParcelas(parcelasMock);
      setParcelasOriginais(parcelasMock);
      setLoading(false);

  };

  const carregarContasBancarias = async () => {
    try {
      const { data, error } = await supabase
        .from('contas_bancarias')
        .select('*')
        .eq('ativa', true)
        .order('banco');

      if (error) throw error;
      setContasBancarias(data || []);
    } catch (error) {
      console.error('Erro ao carregar contas bancárias:', error);
    }
  };

  // Funções auxiliares
  const formatarData = (data: string) => {
    if (!data) return '';
    return format(new Date(data), 'dd/MM/yyyy', { locale: ptBR });
  };

  const formatarMoeda = (valor: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(valor);
  };

  const getStatusBadge = (parcela: Parcela) => {
    const hoje = new Date();
    const vencimento = new Date(parcela.vencimento);
    const diffDias = Math.ceil((vencimento.getTime() - hoje.getTime()) / (1000 * 3600 * 24));

    if (parcela.pago) {
      return <Badge variant="default" className="bg-green-500">Pago</Badge>;
    } else if (diffDias < 0) {
      return <Badge variant="destructive">Vencido</Badge>;
    } else if (diffDias <= 7) {
      return <Badge variant="secondary" className="bg-yellow-500 text-white">Vence em {diffDias} dias</Badge>;
    } else {
      return <Badge variant="outline">Em aberto</Badge>;
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedParcelas(parcelas.map(p => p.id));
    } else {
      setSelectedParcelas([]);
    }
  };

  const aplicarFiltros = (filtros: any) => {
    setFiltrosAplicados(filtros);
    
    let parcelasFiltradas = [...parcelasOriginais];
    
    // Filtro por status
    if (filtros.status && filtros.status !== '') {
      parcelasFiltradas = parcelasFiltradas.filter(parcela => {
        const hoje = new Date();
        const vencimento = new Date(parcela.vencimento);
        const diffDias = Math.ceil((vencimento.getTime() - hoje.getTime()) / (1000 * 3600 * 24));
        
        switch (filtros.status) {
          case 'pendente':
            return !parcela.pago && diffDias >= 0;
          case 'pago':
            return parcela.pago;
          case 'vencido':
            return !parcela.pago && diffDias < 0;
          default:
            return true;
        }
      });
    }
    
    // Filtro por credor/fornecedor
    if (filtros.credor && filtros.credor !== '') {
      parcelasFiltradas = parcelasFiltradas.filter(parcela => 
        parcela.conta?.fornecedor?.nome?.toLowerCase().includes(filtros.credor.toLowerCase())
      );
    }
    
    // Filtro por categoria
    if (filtros.categoria && filtros.categoria !== '') {
      // Como não temos categoria nos dados mock, vamos simular
      parcelasFiltradas = parcelasFiltradas.filter(parcela => {
        // Simular categorias baseadas no fornecedor
        const fornecedor = parcela.conta?.fornecedor?.nome?.toLowerCase() || '';
        switch (filtros.categoria) {
          case 'mercadorias':
            return fornecedor.includes('baby') || fornecedor.includes('box') || fornecedor.includes('company');
          case 'servicos':
            return fornecedor.includes('servicos');
          default:
            return true;
        }
      });
    }
    
    // Filtro por período de vencimento
    if (filtros.dataVencimentoDe && filtros.dataVencimentoAte) {
      const dataInicio = new Date(filtros.dataVencimentoDe);
      const dataFim = new Date(filtros.dataVencimentoAte);
      
      parcelasFiltradas = parcelasFiltradas.filter(parcela => {
        const vencimento = new Date(parcela.vencimento);
        return vencimento >= dataInicio && vencimento <= dataFim;
      });
    }
    
    // Filtro por faixa de valor
    if (filtros.valorMin || filtros.valorMax) {
      parcelasFiltradas = parcelasFiltradas.filter(parcela => {
        const valor = parcela.valor;
        const min = filtros.valorMin ? parseFloat(filtros.valorMin) : 0;
        const max = filtros.valorMax ? parseFloat(filtros.valorMax) : Infinity;
        return valor >= min && valor <= max;
      });
    }
    
    setParcelas(parcelasFiltradas);
  };

  const handleSelectParcela = (parcelaId: string, checked: boolean) => {
    if (checked) {
      setSelectedParcelas([...selectedParcelas, parcelaId]);
    } else {
      setSelectedParcelas(selectedParcelas.filter(id => id !== parcelaId));
    }
  };

  const handlePagarParcela = (parcelaId: string) => {
    setParcelas(parcelas.map(p => 
      p.id === parcelaId ? { ...p, pago: true } : p
    ));
    alert(`Parcela ${parcelaId} marcada como paga!`);
  };

  const handlePagarLote = () => {
    setParcelas(parcelas.map(p => 
      selectedParcelas.includes(p.id) ? { ...p, pago: true } : p
    ));
    alert(`${selectedParcelas.length} parcelas marcadas como pagas!`);
    setSelectedParcelas([]);
  };

  const parcelasFiltradas = parcelas.filter(parcela => {
    if (busca && !parcela.conta?.descricao.toLowerCase().includes(busca.toLowerCase())) {
      return false;
    }
    if (statusFiltro !== 'todos') {
      const hoje = new Date();
      const vencimento = new Date(parcela.vencimento);
      const vencido = vencimento < hoje;
      
      if (statusFiltro === 'pago' && !parcela.pago) return false;
      if (statusFiltro === 'vencido' && (!vencido || parcela.pago)) return false;
      if (statusFiltro === 'aberto' && (parcela.pago || vencido)) return false;
    }
    return true;
  });

  const totalSelecionado = parcelas
    .filter(p => selectedParcelas.includes(p.id))
    .reduce((sum, p) => sum + p.valor, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Carregando parcelas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Contas a Pagar</h1>
          <p className="text-muted-foreground">
            {parcelas.filter(p => !p.pago).length} parcela(s) em aberto
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowFiltrosAvancados(true)}>
            <Filter className="w-4 h-4 mr-2" />
            Filtros
          </Button>
          <Button variant="outline" onClick={() => alert('Personalizar colunas em desenvolvimento')}>
            <Settings className="w-4 h-4 mr-2" />
            Colunas
          </Button>
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Nova Conta
          </Button>
        </div>
      </div>

      {/* Barra de busca e ações */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4">
            <div className="flex gap-4">
              <div className="flex-1">
                <Input
                  placeholder="Buscar por descrição, fornecedor..."
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  className="w-full"
                />
              </div>
              <Select value={statusFiltro} onValueChange={setStatusFiltro}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="aberto">Em aberto</SelectItem>
                  <SelectItem value="vencido">Vencido</SelectItem>
                  <SelectItem value="pago">Pago</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {selectedParcelas.length > 0 && (
              <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                <div className="flex items-center gap-4">
                  <span className="text-sm font-medium">
                    {selectedParcelas.length} parcela(s) selecionada(s)
                  </span>
                  <span className="text-sm text-muted-foreground">
                    Total: {formatarMoeda(totalSelecionado)}
                  </span>
                </div>
                <div className="flex gap-2">
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => alert('Editar em massa em desenvolvimento')}
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    Editar em Massa
                  </Button>
                  <Button 
                    size="sm"
                    onClick={handlePagarLote}
                  >
                    <DollarSign className="w-4 h-4 mr-2" />
                    Pagar em Lote
                  </Button>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Tabela de parcelas */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Parcelas</CardTitle>
          <CardDescription>
            Parcelas importadas dos XMLs de notas fiscais
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="p-4 text-left">
                    <Checkbox
                      checked={selectedParcelas.length === parcelas.length}
                      onCheckedChange={handleSelectAll}
                    />
                  </th>
                  <th className="p-4 text-left">Descrição</th>
                  <th className="p-4 text-left">Fornecedor</th>
                  <th className="p-4 text-left">Parcela</th>
                  <th className="p-4 text-left">Valor</th>
                  <th className="p-4 text-left">Vencimento</th>
                  <th className="p-4 text-left">Status</th>
                  <th className="p-4 text-left">Ações</th>
                </tr>
              </thead>
              <tbody>
                {parcelasFiltradas.map((parcela) => (
                  <tr key={parcela.id} className="border-b hover:bg-muted/50">
                    <td className="p-4">
                      <Checkbox
                        checked={selectedParcelas.includes(parcela.id)}
                        onCheckedChange={(checked) => handleSelectParcela(parcela.id, checked as boolean)}
                      />
                    </td>
                    <td className="p-4">
                      <div className="font-medium">{parcela.conta?.descricao}</div>
                      {parcela.conta?.numero_nota && (
                        <div className="text-sm text-muted-foreground">
                          Nota: {parcela.conta.numero_nota}
                        </div>
                      )}
                    </td>
                    <td className="p-4">{parcela.conta?.fornecedor?.nome || 'N/A'}</td>
                    <td className="p-4">
                      <span className="font-medium">
                        {parcela.parcela_num}/{parcela.conta?.num_parcelas || 1}
                      </span>
                    </td>
                    <td className="p-4 font-medium">{formatarMoeda(parcela.valor)}</td>
                    <td className="p-4">{formatarData(parcela.vencimento)}</td>
                    <td className="p-4">{getStatusBadge(parcela)}</td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        {!parcela.pago && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handlePagarParcela(parcela.id)}
                          >
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Pagar
                          </Button>
                        )}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <span className="sr-only">Abrir menu</span>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => alert('Ver detalhes em desenvolvimento')}>
                              <Eye className="mr-2 h-4 w-4" />
                              <span>Ver Detalhes</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => alert('Editar em desenvolvimento')}>
                              <Edit className="mr-2 h-4 w-4" />
                              <span>Editar</span>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-red-600" onClick={() => alert('Excluir em desenvolvimento')}>
                              <Trash2 className="mr-2 h-4 w-4" />
                              <span>Excluir</span>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Modal de Filtros Avançados */}
      <FiltrosAvancados
        open={showFiltrosAvancados}
        onOpenChange={setShowFiltrosAvancados}
        onApplyFilters={aplicarFiltros}
        contasBancarias={contasBancarias}
      />
    </div>
  );
}

export default ContasPagarCompleta;
