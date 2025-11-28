import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, Sparkles, DollarSign, Calendar, Building2, Tag, User } from "lucide-react";
import { Label } from "@/components/ui/label";

interface ExtractedData {
  descricao?: string;
  valor_total?: number;
  data_vencimento?: string;
  nome_fornecedor_sugerido?: string;
  nome_empresa_sugerida?: string;
  nome_categoria_sugerida?: string;
  raw?: string;
  error?: string;
}

const TesteGemini = () => {
  const [prompt, setPrompt] = useState("");
  const [extractedData, setExtractedData] = useState<ExtractedData | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!prompt.trim()) {
      toast({
        title: "Erro",
        description: "Digite um prompt para enviar",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    setExtractedData(null);

    try {
      const { data, error } = await supabase.functions.invoke('gemini-chat', {
        body: { prompt }
      });

      if (error) throw error;

      setExtractedData(data as ExtractedData);
      toast({
        title: "Sucesso!",
        description: "Dados extraídos com sucesso"
      });
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Erro ao chamar a IA",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-6 w-6" />
            Teste Google Gemini AI
          </CardTitle>
          <CardDescription>
            Digite seu prompt e receba uma resposta da IA Gemini
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="prompt" className="text-sm font-medium">
                Seu Prompt
              </label>
              <Textarea
                id="prompt"
                placeholder="Digite sua pergunta ou prompt aqui..."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className="min-h-[100px]"
                disabled={loading}
              />
            </div>
            
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processando...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Enviar para Gemini
                </>
              )}
            </Button>
          </form>

          {extractedData && (
            <div className="mt-6 space-y-4">
              <Label className="text-lg font-semibold">Dados Extraídos:</Label>
              
              {extractedData.error ? (
                <div className="p-4 rounded-md bg-destructive/10 text-destructive">
                  <p className="font-medium">Erro ao processar:</p>
                  <p className="text-sm mt-1">{extractedData.error}</p>
                  {extractedData.raw && (
                    <p className="text-xs mt-2 opacity-70">{extractedData.raw}</p>
                  )}
                </div>
              ) : (
                <div className="grid gap-3">
                  {extractedData.descricao && (
                    <div className="flex items-start gap-3 p-3 rounded-md bg-muted">
                      <Tag className="h-5 w-5 mt-0.5 text-primary" />
                      <div>
                        <p className="text-xs text-muted-foreground">Descrição</p>
                        <p className="font-medium">{extractedData.descricao}</p>
                      </div>
                    </div>
                  )}
                  
                  {extractedData.valor_total !== undefined && (
                    <div className="flex items-start gap-3 p-3 rounded-md bg-muted">
                      <DollarSign className="h-5 w-5 mt-0.5 text-success" />
                      <div>
                        <p className="text-xs text-muted-foreground">Valor Total</p>
                        <p className="font-medium">
                          {new Intl.NumberFormat('pt-BR', { 
                            style: 'currency', 
                            currency: 'BRL' 
                          }).format(extractedData.valor_total / 100)}
                        </p>
                      </div>
                    </div>
                  )}
                  
                  {extractedData.data_vencimento && (
                    <div className="flex items-start gap-3 p-3 rounded-md bg-muted">
                      <Calendar className="h-5 w-5 mt-0.5 text-info" />
                      <div>
                        <p className="text-xs text-muted-foreground">Data de Vencimento</p>
                        <p className="font-medium">{extractedData.data_vencimento}</p>
                      </div>
                    </div>
                  )}
                  
                  {extractedData.nome_fornecedor_sugerido && (
                    <div className="flex items-start gap-3 p-3 rounded-md bg-muted">
                      <User className="h-5 w-5 mt-0.5 text-warning" />
                      <div>
                        <p className="text-xs text-muted-foreground">Fornecedor Sugerido</p>
                        <p className="font-medium">{extractedData.nome_fornecedor_sugerido}</p>
                      </div>
                    </div>
                  )}
                  
                  {extractedData.nome_empresa_sugerida && (
                    <div className="flex items-start gap-3 p-3 rounded-md bg-muted">
                      <Building2 className="h-5 w-5 mt-0.5 text-purple" />
                      <div>
                        <p className="text-xs text-muted-foreground">Empresa Sugerida</p>
                        <p className="font-medium">{extractedData.nome_empresa_sugerida}</p>
                      </div>
                    </div>
                  )}
                  
                  {extractedData.nome_categoria_sugerida && (
                    <div className="flex items-start gap-3 p-3 rounded-md bg-muted">
                      <Tag className="h-5 w-5 mt-0.5 text-primary" />
                      <div>
                        <p className="text-xs text-muted-foreground">Categoria Sugerida</p>
                        <p className="font-medium">{extractedData.nome_categoria_sugerida}</p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default TesteGemini;
