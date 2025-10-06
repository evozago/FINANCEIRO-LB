import { useState } from 'react';
import { Upload, FileText, AlertCircle, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface XMLData {
  numeroNF: string;
  serie: string;
  dataEmissao: string;
  cnpjEmitente: string;
  nomeEmitente: string;
  valorTotal: number;
  valorProdutos: number;
  valorICMS: number;
  valorIPI: number;
  itens: XMLItem[];
}

interface XMLItem {
  codigo: string;
  descricao: string;
  quantidade: number;
  valorUnitario: number;
  valorTotal: number;
}

interface Fornecedor {
  id: number;
  nome_fantasia?: string;
  razao_social: string;
  cnpj?: string;
}

interface Categoria {
  id: number;
  nome: string;
}

export function ImportarXML() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [xmlFile, setXmlFile] = useState<File | null>(null);
  const [xmlData, setXmlData] = useState<XMLData | null>(null);
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [selectedFornecedor, setSelectedFornecedor] = useState<string>('');
  const [selectedCategoria, setSelectedCategoria] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'upload' | 'review' | 'success'>('upload');
  const { toast } = useToast();

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === 'text/xml') {
      setXmlFile(file);
      parseXML(file);
    } else {
      toast({
        title: 'Erro',
        description: 'Por favor, selecione um arquivo XML válido.',
        variant: 'destructive',
      });
    }
  };

  const parseXML = async (file: File) => {
    try {
      setLoading(true);
      const text = await file.text();
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(text, 'text/xml');

      // Verificar se há erros de parsing
      const parseError = xmlDoc.querySelector('parsererror');
      if (parseError) {
        throw new Error('Arquivo XML inválido');
      }

      // Extrair dados da NFe (simplificado - pode precisar de ajustes conforme o formato)
      const infNFe = xmlDoc.querySelector('infNFe');
      const ide = xmlDoc.querySelector('ide');
      const emit = xmlDoc.querySelector('emit');
      const total = xmlDoc.querySelector('total');
      const ICMSTot = xmlDoc.querySelector('ICMSTot');

      if (!infNFe || !ide || !emit || !total) {
        throw new Error('Estrutura XML não reconhecida como NFe');
      }

      const numeroNF = ide.querySelector('nNF')?.textContent || '';
      const serie = ide.querySelector('serie')?.textContent || '';
      const dataEmissao = ide.querySelector('dhEmi')?.textContent?.split('T')[0] || '';
      
      const cnpjEmitente = emit.querySelector('CNPJ')?.textContent || '';
      const nomeEmitente = emit.querySelector('xNome')?.textContent || '';

      const valorTotal = parseFloat(ICMSTot?.querySelector('vNF')?.textContent || '0');
      const valorProdutos = parseFloat(ICMSTot?.querySelector('vProd')?.textContent || '0');
      const valorICMS = parseFloat(ICMSTot?.querySelector('vICMS')?.textContent || '0');
      const valorIPI = parseFloat(ICMSTot?.querySelector('vIPI')?.textContent || '0');

      // Extrair itens
      const detElements = xmlDoc.querySelectorAll('det');
      const itens: XMLItem[] = Array.from(detElements).map(det => {
        const prod = det.querySelector('prod');
        return {
          codigo: prod?.querySelector('cProd')?.textContent || '',
          descricao: prod?.querySelector('xProd')?.textContent || '',
          quantidade: parseFloat(prod?.querySelector('qCom')?.textContent || '0'),
          valorUnitario: parseFloat(prod?.querySelector('vUnCom')?.textContent || '0'),
          valorTotal: parseFloat(prod?.querySelector('vProd')?.textContent || '0'),
        };
      });

      const parsedData: XMLData = {
        numeroNF,
        serie,
        dataEmissao,
        cnpjEmitente,
        nomeEmitente,
        valorTotal,
        valorProdutos,
        valorICMS,
        valorIPI,
        itens,
      };

      setXmlData(parsedData);
      await fetchFornecedores();
      await fetchCategorias();
      
      // Tentar encontrar fornecedor automaticamente pelo CNPJ
      if (cnpjEmitente) {
        const fornecedorEncontrado = fornecedores.find(f => 
          f.cnpj?.replace(/\D/g, '') === cnpjEmitente.replace(/\D/g, '')
        );
        if (fornecedorEncontrado) {
          setSelectedFornecedor(fornecedorEncontrado.id.toString());
        }
      }

      setStep('review');
    } catch (error) {
      console.error('Erro ao processar XML:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível processar o arquivo XML. Verifique se é uma NFe válida.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchFornecedores = async () => {
    try {
      const { data, error } = await supabase
        .from('pessoas_juridicas')
        .select('id, nome_fantasia, razao_social, cnpj')
        .order('razao_social');

      if (error) throw error;
      setFornecedores(data || []);
    } catch (error) {
      console.error('Erro ao buscar fornecedores:', error);
    }
  };

  const fetchCategorias = async () => {
    try {
      const { data, error } = await supabase
        .from('categorias_financeiras')
        .select('id, nome')
        .order('nome');

      if (error) throw error;
      setCategorias(data || []);
    } catch (error) {
      console.error('Erro ao buscar categorias:', error);
    }
  };

  const handleImport = async () => {
    if (!xmlData || !selectedFornecedor || !selectedCategoria) {
      toast({
        title: 'Erro',
        description: 'Por favor, selecione o fornecedor e a categoria.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setLoading(true);

      // Primeiro, criar ou encontrar o fornecedor baseado no emitente
      let fornecedorId: number;
      
      // Buscar se já existe um fornecedor com este CNPJ
      const { data: fornecedorExistente } = await supabase
        .from('pessoas_juridicas')
        .select('id')
        .eq('cnpj', xmlData.cnpjEmitente)
        .single();

      if (fornecedorExistente) {
        fornecedorId = fornecedorExistente.id;
      } else {
        // Criar novo fornecedor
        const { data: novoFornecedor, error: fornecedorError } = await supabase
          .from('pessoas_juridicas')
          .insert([{
            razao_social: xmlData.nomeEmitente,
            nome_fantasia: xmlData.nomeEmitente,
            cnpj: xmlData.cnpjEmitente,
          }])
          .select()
          .single();

        if (fornecedorError) throw fornecedorError;
        fornecedorId = novoFornecedor.id;
      }

      // Criar conta a pagar
      const { data: contaData, error: contaError } = await supabase
        .from('contas_pagar')
        .insert([{
          valor_total_centavos: Math.round(xmlData.valorTotal * 100),
          num_parcelas: 1,
          fornecedor_id: fornecedorId,
          categoria_id: parseInt(selectedCategoria),
          filial_id: parseInt(selectedFornecedor),
          numero_nota: `${xmlData.numeroNF}/${xmlData.serie}`,
          referencia: `Importado de XML - CNPJ: ${xmlData.cnpjEmitente}`,
        }])
        .select()
        .single();

      if (contaError) throw contaError;

      // Criar itens da nota (se houver tabela para isso)
      // Aqui você pode adicionar lógica para salvar os itens se necessário

      toast({
        title: 'Sucesso',
        description: `Nota fiscal ${xmlData.numeroNF} importada com sucesso!`,
      });

      setStep('success');
      
      // Reset após 2 segundos
      setTimeout(() => {
        resetForm();
        setIsDialogOpen(false);
      }, 2000);

    } catch (error) {
      console.error('Erro ao importar XML:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível importar a nota fiscal.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setXmlFile(null);
    setXmlData(null);
    setSelectedFornecedor('');
    setSelectedCategoria('');
    setStep('upload');
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" onClick={() => { resetForm(); }}>
          <Upload className="mr-2 h-4 w-4" />
          Importar XML
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Importar Nota Fiscal (XML)</DialogTitle>
          <DialogDescription>
            Faça upload do arquivo XML da nota fiscal para importar automaticamente
          </DialogDescription>
        </DialogHeader>

        {step === 'upload' && (
          <div className="space-y-4">
            <div>
              <Label htmlFor="xml-file">Arquivo XML da NFe</Label>
              <Input
                id="xml-file"
                type="file"
                accept=".xml"
                onChange={handleFileChange}
                disabled={loading}
              />
              <p className="text-sm text-muted-foreground mt-1">
                Selecione o arquivo XML da nota fiscal eletrônica
              </p>
            </div>

            {loading && (
              <Alert>
                <FileText className="h-4 w-4" />
                <AlertDescription>
                  Processando arquivo XML...
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}

        {step === 'review' && xmlData && (
          <div className="space-y-4">
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                XML processado com sucesso! Revise os dados antes de importar.
              </AlertDescription>
            </Alert>

            <div className="grid grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Dados da Nota</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div>
                    <strong>Número:</strong> {xmlData.numeroNF}/{xmlData.serie}
                  </div>
                  <div>
                    <strong>Data Emissão:</strong> {new Date(xmlData.dataEmissao).toLocaleDateString('pt-BR')}
                  </div>
                  <div>
                    <strong>Emitente:</strong> {xmlData.nomeEmitente}
                  </div>
                  <div>
                    <strong>CNPJ:</strong> {xmlData.cnpjEmitente}
                  </div>
                  <div>
                    <strong>Valor Total:</strong> {formatCurrency(xmlData.valorTotal)}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Configurações</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="fornecedor">Sua Empresa (Destinatário) *</Label>
                    <select
                      id="fornecedor"
                      value={selectedFornecedor}
                      onChange={(e) => setSelectedFornecedor(e.target.value)}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <option value="">Selecione sua empresa</option>
                      {fornecedores.map((fornecedor) => (
                        <option key={fornecedor.id} value={fornecedor.id.toString()}>
                          {fornecedor.nome_fantasia || fornecedor.razao_social}
                          {fornecedor.cnpj && ` - ${fornecedor.cnpj}`}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <Label htmlFor="categoria">Categoria *</Label>
                    <select
                      id="categoria"
                      value={selectedCategoria}
                      onChange={(e) => setSelectedCategoria(e.target.value)}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <option value="">Selecione a categoria</option>
                      {categorias.map((categoria) => (
                        <option key={categoria.id} value={categoria.id.toString()}>
                          {categoria.nome}
                        </option>
                      ))}
                    </select>
                  </div>
                </CardContent>
              </Card>
            </div>

            {xmlData.itens.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Itens da Nota ({xmlData.itens.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="max-h-40 overflow-y-auto">
                    {xmlData.itens.slice(0, 5).map((item, index) => (
                      <div key={index} className="flex justify-between items-center py-2 border-b">
                        <div>
                          <div className="font-medium">{item.descricao}</div>
                          <div className="text-sm text-muted-foreground">
                            Código: {item.codigo} | Qtd: {item.quantidade}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-medium">{formatCurrency(item.valorTotal)}</div>
                          <div className="text-sm text-muted-foreground">
                            Unit: {formatCurrency(item.valorUnitario)}
                          </div>
                        </div>
                      </div>
                    ))}
                    {xmlData.itens.length > 5 && (
                      <div className="text-center py-2 text-muted-foreground">
                        ... e mais {xmlData.itens.length - 5} itens
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setStep('upload')}>
                Voltar
              </Button>
              <Button 
                onClick={handleImport} 
                disabled={loading || !selectedFornecedor || !selectedCategoria}
              >
                {loading ? 'Importando...' : 'Importar Nota'}
              </Button>
            </div>
          </div>
        )}

        {step === 'success' && (
          <div className="text-center space-y-4">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto" />
            <div>
              <h3 className="text-lg font-semibold">Importação Concluída!</h3>
              <p className="text-muted-foreground">
                A nota fiscal foi importada com sucesso para o sistema.
              </p>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
