import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, Sparkles } from "lucide-react";

const TesteGemini = () => {
  const [prompt, setPrompt] = useState("");
  const [response, setResponse] = useState("");
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
    setResponse("");

    try {
      const { data, error } = await supabase.functions.invoke('gemini-chat', {
        body: { prompt }
      });

      if (error) throw error;

      setResponse(data.response);
      toast({
        title: "Sucesso!",
        description: "Resposta recebida do Gemini"
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

          {response && (
            <div className="mt-6 space-y-2">
              <label className="text-sm font-medium">Resposta da IA:</label>
              <div className="p-4 rounded-md bg-muted whitespace-pre-wrap">
                {response}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default TesteGemini;
