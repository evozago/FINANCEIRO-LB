import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { 
  Barcode, 
  Plus, 
  Copy, 
  Settings, 
  History, 
  Sparkles,
  Tag,
  Palette,
  Ruler,
  ChevronRight,
  Package,
  Search,
  Trash2
} from 'lucide-react';

interface TipoProduto {
  id: number;
  nome: string;
  codigo: string;
  categoria: string;
  ativo: boolean;
}

interface GeneroProduto {
  id: number;
  nome: string;
  codigo: string;
  ativo: boolean;
}

interface FaixaEtaria {
  id: number;
  nome: string;
  codigo: string;
  ativo: boolean;
}

interface Marca {
  id: number;
  nome: string;
}

interface Referencia {
  id: number;
  codigo_completo: string;
  ano: number;
  mes: number;
  tipo_id: number;
  genero_id: number;
  faixa_etaria_id: number;
  marca_id: number | null;
  sequencial: number;
  descricao: string | null;
  colecao: string | null;
  created_at: string;
  tipos_produto?: TipoProduto;
  generos_produto?: GeneroProduto;
  faixas_etarias_produto?: FaixaEtaria;
  marcas?: Marca;
}

interface Variacao {
  id: number;
  referencia_id: number;
  codigo_variacao: string;
  sufixo_sequencial: number;
  cor: string | null;
  tamanho: string | null;
  created_at: string;
}

export default function GeradorReferencias() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('gerar');
  const [configDialogOpen, setConfigDialogOpen] = useState(false);
  const [variacoesDialogOpen, setVariacoesDialogOpen] = useState(false);
  const [selectedReferencia, setSelectedReferencia] = useState<Referencia | null>(null);
  const [busca, setBusca] = useState('');

  // Form state para geração
  const [formData, setFormData] = useState({
    tipoId: '',
    generoId: '',
    faixaEtariaId: '',
    marcaId: '',
    descricao: '',
    colecao: '',
    quantidadeVariacoes: 1,
    cores: [''],
    tamanhos: [''],
  });

  // Queries
  const { data: tipos = [] } = useQuery({
    queryKey: ['tipos-produto'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tipos_produto')
        .select('*')
        .eq('ativo', true)
        .order('nome');
      if (error) throw error;
      return data as TipoProduto[];
    }
  });

  const { data: generos = [] } = useQuery({
    queryKey: ['generos-produto'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('generos_produto')
        .select('*')
        .eq('ativo', true)
        .order('nome');
      if (error) throw error;
      return data as GeneroProduto[];
    }
  });

  const { data: faixasEtarias = [] } = useQuery({
    queryKey: ['faixas-etarias-produto'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('faixas_etarias_produto')
        .select('*')
        .eq('ativo', true)
        .order('nome');
      if (error) throw error;
      return data as FaixaEtaria[];
    }
  });

  const { data: marcas = [] } = useQuery({
    queryKey: ['marcas-ref'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('marcas')
        .select('id, nome')
        .eq('ativo', true)
        .order('nome');
      if (error) throw error;
      return data as Marca[];
    }
  });

  const { data: referencias = [], isLoading: loadingReferencias } = useQuery({
    queryKey: ['referencias-produto', busca],
    queryFn: async () => {
      let query = supabase
        .from('referencias_produto')
        .select(`
          *,
          tipos_produto (id, nome, codigo, categoria, ativo),
          generos_produto (id, nome, codigo, ativo),
          faixas_etarias_produto (id, nome, codigo, ativo),
          marcas (id, nome)
        `)
        .order('created_at', { ascending: false })
        .limit(100);

      if (busca) {
        query = query.ilike('codigo_completo', `%${busca}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as unknown as Referencia[];
    }
  });

  const { data: variacoes = [] } = useQuery({
    queryKey: ['variacoes-referencia', selectedReferencia?.id],
    queryFn: async () => {
      if (!selectedReferencia) return [];
      const { data, error } = await supabase
        .from('variacoes_referencia')
        .select('*')
        .eq('referencia_id', selectedReferencia.id)
        .order('sufixo_sequencial');
      if (error) throw error;
      return data as Variacao[];
    },
    enabled: !!selectedReferencia
  });

  // Mutation para gerar referência
  const gerarReferencia = useMutation({
    mutationFn: async () => {
      const now = new Date();
      const ano = now.getFullYear() % 100; // 26 para 2026
      const mes = now.getMonth() + 1; // 1-12

      const tipoId = parseInt(formData.tipoId);
      const generoId = parseInt(formData.generoId);
      const faixaEtariaId = parseInt(formData.faixaEtariaId);
      const marcaId = formData.marcaId ? parseInt(formData.marcaId) : null;

      // Buscar próximo sequencial
      const { data: seqData, error: seqError } = await supabase
        .from('sequencial_referencias')
        .select('ultimo_sequencial')
        .eq('ano', ano)
        .eq('mes', mes)
        .eq('tipo_id', tipoId)
        .eq('genero_id', generoId)
        .eq('faixa_etaria_id', faixaEtariaId)
        .single();

      let proximoSequencial = 1;
      
      if (!seqError && seqData) {
        proximoSequencial = seqData.ultimo_sequencial + 1;
        // Atualizar sequencial
        await supabase
          .from('sequencial_referencias')
          .update({ ultimo_sequencial: proximoSequencial })
          .eq('ano', ano)
          .eq('mes', mes)
          .eq('tipo_id', tipoId)
          .eq('genero_id', generoId)
          .eq('faixa_etaria_id', faixaEtariaId);
      } else {
        // Criar novo registro de sequencial
        await supabase
          .from('sequencial_referencias')
          .insert({
            ano,
            mes,
            tipo_id: tipoId,
            genero_id: generoId,
            faixa_etaria_id: faixaEtariaId,
            ultimo_sequencial: 1
          });
      }

      // Buscar códigos
      const tipo = tipos.find(t => t.id === tipoId);
      const genero = generos.find(g => g.id === generoId);
      const faixa = faixasEtarias.find(f => f.id === faixaEtariaId);

      if (!tipo || !genero || !faixa) {
        throw new Error('Tipo, gênero ou faixa etária não encontrado');
      }

      // Gerar código: AAMM + Tipo + Gênero + FaixaEtária + Sequencial
      // Exemplo: 2602BFA001
      const codigoCompleto = `${ano.toString().padStart(2, '0')}${mes.toString().padStart(2, '0')}${tipo.codigo}${genero.codigo}${faixa.codigo}${proximoSequencial.toString().padStart(3, '0')}`;

      // Criar referência
      const { data: refData, error: refError } = await supabase
        .from('referencias_produto')
        .insert({
          codigo_completo: codigoCompleto,
          ano,
          mes,
          tipo_id: tipoId,
          genero_id: generoId,
          faixa_etaria_id: faixaEtariaId,
          marca_id: marcaId,
          sequencial: proximoSequencial,
          descricao: formData.descricao || null,
          colecao: formData.colecao || null
        })
        .select()
        .single();

      if (refError) throw refError;

      // Gerar variações se houver cores/tamanhos
      const coresValidas = formData.cores.filter(c => c.trim());
      const tamanhosValidos = formData.tamanhos.filter(t => t.trim());

      if (coresValidas.length > 0 || tamanhosValidos.length > 0) {
        const variacoesParaInserir: any[] = [];
        let sufixo = 1;

        // Se tem cores e tamanhos, gerar combinações
        if (coresValidas.length > 0 && tamanhosValidos.length > 0) {
          for (const cor of coresValidas) {
            for (const tamanho of tamanhosValidos) {
              variacoesParaInserir.push({
                referencia_id: refData.id,
                codigo_variacao: `${codigoCompleto}-${sufixo.toString().padStart(2, '0')}`,
                sufixo_sequencial: sufixo,
                cor: cor.toUpperCase(),
                tamanho: tamanho.toUpperCase()
              });
              sufixo++;
            }
          }
        } else if (coresValidas.length > 0) {
          // Só cores
          for (const cor of coresValidas) {
            variacoesParaInserir.push({
              referencia_id: refData.id,
              codigo_variacao: `${codigoCompleto}-${sufixo.toString().padStart(2, '0')}`,
              sufixo_sequencial: sufixo,
              cor: cor.toUpperCase(),
              tamanho: null
            });
            sufixo++;
          }
        } else {
          // Só tamanhos
          for (const tamanho of tamanhosValidos) {
            variacoesParaInserir.push({
              referencia_id: refData.id,
              codigo_variacao: `${codigoCompleto}-${sufixo.toString().padStart(2, '0')}`,
              sufixo_sequencial: sufixo,
              cor: null,
              tamanho: tamanho.toUpperCase()
            });
            sufixo++;
          }
        }

        if (variacoesParaInserir.length > 0) {
          const { error: varError } = await supabase
            .from('variacoes_referencia')
            .insert(variacoesParaInserir);
          if (varError) throw varError;
        }
      }

      return { referencia: refData, codigo: codigoCompleto };
    },
    onSuccess: (data) => {
      toast.success(`Referência ${data.codigo} gerada com sucesso!`);
      queryClient.invalidateQueries({ queryKey: ['referencias-produto'] });
      // Limpar form
      setFormData({
        tipoId: '',
        generoId: '',
        faixaEtariaId: '',
        marcaId: '',
        descricao: '',
        colecao: '',
        quantidadeVariacoes: 1,
        cores: [''],
        tamanhos: [''],
      });
    },
    onError: (error: any) => {
      toast.error(`Erro ao gerar referência: ${error.message}`);
    }
  });

  // Funções auxiliares
  const copiarCodigo = (codigo: string) => {
    navigator.clipboard.writeText(codigo);
    toast.success('Código copiado!');
  };

  const adicionarCor = () => {
    setFormData(prev => ({ ...prev, cores: [...prev.cores, ''] }));
  };

  const removerCor = (index: number) => {
    setFormData(prev => ({
      ...prev,
      cores: prev.cores.filter((_, i) => i !== index)
    }));
  };

  const adicionarTamanho = () => {
    setFormData(prev => ({ ...prev, tamanhos: [...prev.tamanhos, ''] }));
  };

  const removerTamanho = (index: number) => {
    setFormData(prev => ({
      ...prev,
      tamanhos: prev.tamanhos.filter((_, i) => i !== index)
    }));
  };

  const atualizarCor = (index: number, valor: string) => {
    setFormData(prev => {
      const novasCores = [...prev.cores];
      novasCores[index] = valor;
      return { ...prev, cores: novasCores };
    });
  };

  const atualizarTamanho = (index: number, valor: string) => {
    setFormData(prev => {
      const novosTamanhos = [...prev.tamanhos];
      novosTamanhos[index] = valor;
      return { ...prev, tamanhos: novosTamanhos };
    });
  };

  const previewCodigo = () => {
    if (!formData.tipoId || !formData.generoId || !formData.faixaEtariaId) {
      return 'XXXX-XXX-XXX';
    }

    const now = new Date();
    const ano = (now.getFullYear() % 100).toString().padStart(2, '0');
    const mes = (now.getMonth() + 1).toString().padStart(2, '0');
    
    const tipo = tipos.find(t => t.id === parseInt(formData.tipoId));
    const genero = generos.find(g => g.id === parseInt(formData.generoId));
    const faixa = faixasEtarias.find(f => f.id === parseInt(formData.faixaEtariaId));

    return `${ano}${mes}${tipo?.codigo || 'X'}${genero?.codigo || 'X'}${faixa?.codigo || 'X'}###`;
  };

  const getCategoriaColor = (categoria: string) => {
    switch (categoria) {
      case 'vestuario': return 'bg-blue-100 text-blue-800';
      case 'acessorios': return 'bg-purple-100 text-purple-800';
      case 'calcados': return 'bg-amber-100 text-amber-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-primary to-purple-500 rounded-xl">
              <Barcode className="h-8 w-8 text-primary-foreground" />
            </div>
            Gerador de Referências
          </h1>
          <p className="text-muted-foreground mt-1">
            Gere códigos estruturados para identificar produtos únicos
          </p>
        </div>

        <Dialog open={configDialogOpen} onOpenChange={setConfigDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline">
              <Settings className="h-4 w-4 mr-2" />
              Configurar
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[80vh]">
            <DialogHeader>
              <DialogTitle>Configurar Códigos</DialogTitle>
            </DialogHeader>
            <ConfiguracaoCodigos 
              tipos={tipos} 
              generos={generos} 
              faixasEtarias={faixasEtarias}
              onUpdate={() => {
                queryClient.invalidateQueries({ queryKey: ['tipos-produto'] });
                queryClient.invalidateQueries({ queryKey: ['generos-produto'] });
                queryClient.invalidateQueries({ queryKey: ['faixas-etarias-produto'] });
              }}
            />
          </DialogContent>
        </Dialog>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="gerar" className="gap-2">
            <Sparkles className="h-4 w-4" />
            Gerar Código
          </TabsTrigger>
          <TabsTrigger value="historico" className="gap-2">
            <History className="h-4 w-4" />
            Histórico
          </TabsTrigger>
        </TabsList>

        <TabsContent value="gerar" className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            {/* Formulário */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Tag className="h-5 w-5" />
                  Dados do Produto
                </CardTitle>
                <CardDescription>
                  Selecione os atributos para gerar o código
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Tipo de Produto *</Label>
                    <Select
                      value={formData.tipoId}
                      onValueChange={(v) => setFormData(prev => ({ ...prev, tipoId: v }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                      <SelectContent>
                        {tipos.map(tipo => (
                          <SelectItem key={tipo.id} value={tipo.id.toString()}>
                            <span className="flex items-center gap-2">
                              <Badge variant="outline" className="font-mono">{tipo.codigo}</Badge>
                              {tipo.nome}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Gênero *</Label>
                    <Select
                      value={formData.generoId}
                      onValueChange={(v) => setFormData(prev => ({ ...prev, generoId: v }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                      <SelectContent>
                        {generos.map(genero => (
                          <SelectItem key={genero.id} value={genero.id.toString()}>
                            <span className="flex items-center gap-2">
                              <Badge variant="outline" className="font-mono">{genero.codigo}</Badge>
                              {genero.nome}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Faixa Etária *</Label>
                    <Select
                      value={formData.faixaEtariaId}
                      onValueChange={(v) => setFormData(prev => ({ ...prev, faixaEtariaId: v }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                      <SelectContent>
                        {faixasEtarias.map(faixa => (
                          <SelectItem key={faixa.id} value={faixa.id.toString()}>
                            <span className="flex items-center gap-2">
                              <Badge variant="outline" className="font-mono">{faixa.codigo}</Badge>
                              {faixa.nome}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Marca (opcional)</Label>
                    <Select
                      value={formData.marcaId}
                      onValueChange={(v) => setFormData(prev => ({ ...prev, marcaId: v }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                      <SelectContent>
                        {marcas.map(marca => (
                          <SelectItem key={marca.id} value={marca.id.toString()}>
                            {marca.nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Descrição (opcional)</Label>
                  <Input
                    placeholder="Ex: Blusa cropped com babado"
                    value={formData.descricao}
                    onChange={(e) => setFormData(prev => ({ ...prev, descricao: e.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Coleção (opcional)</Label>
                  <Input
                    placeholder="Ex: Verão 2026"
                    value={formData.colecao}
                    onChange={(e) => setFormData(prev => ({ ...prev, colecao: e.target.value }))}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Variações */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Variações (SKUs)
                </CardTitle>
                <CardDescription>
                  Adicione cores e tamanhos para gerar códigos de variação
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Cores */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="flex items-center gap-2">
                      <Palette className="h-4 w-4" />
                      Cores
                    </Label>
                    <Button variant="ghost" size="sm" onClick={adicionarCor}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {formData.cores.map((cor, index) => (
                      <div key={index} className="flex gap-2">
                        <Input
                          placeholder={`Cor ${index + 1}`}
                          value={cor}
                          onChange={(e) => atualizarCor(index, e.target.value)}
                        />
                        {formData.cores.length > 1 && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removerCor(index)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Tamanhos */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="flex items-center gap-2">
                      <Ruler className="h-4 w-4" />
                      Tamanhos
                    </Label>
                    <Button variant="ghost" size="sm" onClick={adicionarTamanho}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {formData.tamanhos.map((tamanho, index) => (
                      <div key={index} className="flex gap-2">
                        <Input
                          placeholder={`Tamanho ${index + 1}`}
                          value={tamanho}
                          onChange={(e) => atualizarTamanho(index, e.target.value)}
                        />
                        {formData.tamanhos.length > 1 && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removerTamanho(index)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Preview variações */}
                {(formData.cores.some(c => c) || formData.tamanhos.some(t => t)) && (
                  <div className="mt-4 p-3 bg-muted rounded-lg">
                    <p className="text-sm text-muted-foreground mb-2">
                      Variações que serão geradas:
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {(() => {
                        const coresValidas = formData.cores.filter(c => c.trim());
                        const tamanhosValidos = formData.tamanhos.filter(t => t.trim());
                        const variacoes: string[] = [];

                        if (coresValidas.length > 0 && tamanhosValidos.length > 0) {
                          for (const cor of coresValidas) {
                            for (const tamanho of tamanhosValidos) {
                              variacoes.push(`${cor.toUpperCase()}/${tamanho.toUpperCase()}`);
                            }
                          }
                        } else if (coresValidas.length > 0) {
                          variacoes.push(...coresValidas.map(c => c.toUpperCase()));
                        } else if (tamanhosValidos.length > 0) {
                          variacoes.push(...tamanhosValidos.map(t => t.toUpperCase()));
                        }

                        return variacoes.slice(0, 10).map((v, i) => (
                          <Badge key={i} variant="secondary" className="text-xs">
                            {v}
                          </Badge>
                        ));
                      })()}
                      {(() => {
                        const total = formData.cores.filter(c => c).length * 
                          Math.max(formData.tamanhos.filter(t => t).length, 1);
                        if (total > 10) {
                          return <Badge variant="outline">+{total - 10} mais</Badge>;
                        }
                        return null;
                      })()}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Preview e Gerar */}
          <Card className="bg-gradient-to-r from-primary/5 to-purple-500/5 border-primary/20">
            <CardContent className="py-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Código que será gerado:</p>
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-3xl font-bold text-primary">
                      {previewCodigo()}
                    </span>
                    <Button variant="ghost" size="icon" onClick={() => copiarCodigo(previewCodigo())}>
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    ### = sequencial automático
                  </p>
                </div>

                <Button 
                  size="lg" 
                  onClick={() => gerarReferencia.mutate()}
                  disabled={!formData.tipoId || !formData.generoId || !formData.faixaEtariaId || gerarReferencia.isPending}
                  className="bg-gradient-to-r from-primary to-purple-500 hover:from-primary/90 hover:to-purple-500/90"
                >
                  <Sparkles className="h-5 w-5 mr-2" />
                  {gerarReferencia.isPending ? 'Gerando...' : 'Gerar Referência'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="historico" className="space-y-4">
          {/* Busca */}
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por código..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          {/* Tabela */}
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Gênero</TableHead>
                  <TableHead>Faixa Etária</TableHead>
                  <TableHead>Marca</TableHead>
                  <TableHead>Coleção</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loadingReferencias ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      Carregando...
                    </TableCell>
                  </TableRow>
                ) : referencias.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      Nenhuma referência encontrada
                    </TableCell>
                  </TableRow>
                ) : (
                  referencias.map(ref => (
                    <TableRow key={ref.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <code className="font-mono font-semibold text-primary">
                            {ref.codigo_completo}
                          </code>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => copiarCodigo(ref.codigo_completo)}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getCategoriaColor(ref.tipos_produto?.categoria || '')}>
                          {ref.tipos_produto?.nome}
                        </Badge>
                      </TableCell>
                      <TableCell>{ref.generos_produto?.nome}</TableCell>
                      <TableCell>{ref.faixas_etarias_produto?.nome}</TableCell>
                      <TableCell>{ref.marcas?.nome || '-'}</TableCell>
                      <TableCell>{ref.colecao || '-'}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {new Date(ref.created_at).toLocaleDateString('pt-BR')}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedReferencia(ref);
                            setVariacoesDialogOpen(true);
                          }}
                        >
                          Ver Variações
                          <ChevronRight className="h-4 w-4 ml-1" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialog de Variações */}
      <Dialog open={variacoesDialogOpen} onOpenChange={setVariacoesDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Barcode className="h-5 w-5" />
              Variações de {selectedReferencia?.codigo_completo}
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh]">
            {variacoes.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Esta referência não possui variações cadastradas
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Código SKU</TableHead>
                    <TableHead>Cor</TableHead>
                    <TableHead>Tamanho</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {variacoes.map(v => (
                    <TableRow key={v.id}>
                      <TableCell>
                        <code className="font-mono font-semibold">{v.codigo_variacao}</code>
                      </TableCell>
                      <TableCell>{v.cor || '-'}</TableCell>
                      <TableCell>{v.tamanho || '-'}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => copiarCodigo(v.codigo_variacao)}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Componente de Configuração
function ConfiguracaoCodigos({ 
  tipos, 
  generos, 
  faixasEtarias,
  onUpdate 
}: { 
  tipos: TipoProduto[];
  generos: GeneroProduto[];
  faixasEtarias: FaixaEtaria[];
  onUpdate: () => void;
}) {
  const [activeTab, setActiveTab] = useState('tipos');

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab}>
      <TabsList className="grid grid-cols-3">
        <TabsTrigger value="tipos">Tipos</TabsTrigger>
        <TabsTrigger value="generos">Gêneros</TabsTrigger>
        <TabsTrigger value="faixas">Faixas Etárias</TabsTrigger>
      </TabsList>

      <TabsContent value="tipos">
        <ScrollArea className="h-[400px]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Ativo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tipos.map(t => (
                <TableRow key={t.id}>
                  <TableCell>
                    <Badge variant="outline" className="font-mono">{t.codigo}</Badge>
                  </TableCell>
                  <TableCell>{t.nome}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{t.categoria}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={t.ativo ? 'default' : 'outline'}>
                      {t.ativo ? 'Sim' : 'Não'}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ScrollArea>
      </TabsContent>

      <TabsContent value="generos">
        <ScrollArea className="h-[400px]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead>Ativo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {generos.map(g => (
                <TableRow key={g.id}>
                  <TableCell>
                    <Badge variant="outline" className="font-mono">{g.codigo}</Badge>
                  </TableCell>
                  <TableCell>{g.nome}</TableCell>
                  <TableCell>
                    <Badge variant={g.ativo ? 'default' : 'outline'}>
                      {g.ativo ? 'Sim' : 'Não'}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ScrollArea>
      </TabsContent>

      <TabsContent value="faixas">
        <ScrollArea className="h-[400px]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead>Ativo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {faixasEtarias.map(f => (
                <TableRow key={f.id}>
                  <TableCell>
                    <Badge variant="outline" className="font-mono">{f.codigo}</Badge>
                  </TableCell>
                  <TableCell>{f.nome}</TableCell>
                  <TableCell>
                    <Badge variant={f.ativo ? 'default' : 'outline'}>
                      {f.ativo ? 'Sim' : 'Não'}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ScrollArea>
      </TabsContent>
    </Tabs>
  );
}
