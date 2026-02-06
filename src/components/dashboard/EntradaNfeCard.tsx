import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { 
  FileText, 
  Check, 
  AlertCircle, 
  Loader2, 
  X,
  DollarSign,
  Clock
} from "lucide-react";
import { format } from "date-fns";

interface EntradaNfe {
  id: number;
  chave_nfe: string;
  data_entrada: string;
  temFinanceiro: boolean;
}

export function EntradaNfeCard() {
  const [chaveInput, setChaveInput] = useState("");
  const [entradas, setEntradas] = useState<EntradaNfe[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingList, setLoadingList] = useState(true);
  const { toast } = useToast();

  const fetchEntradas = useCallback(async () => {
    try {
      // Busca as últimas 10 entradas
      const { data: entradasData, error: entradasError } = await supabase
        .from("entradas_nfe")
        .select("id, chave_nfe, data_entrada")
        .order("data_entrada", { ascending: false })
        .limit(10);

      if (entradasError) throw entradasError;

      if (!entradasData || entradasData.length === 0) {
        setEntradas([]);
        return;
      }

      // Busca chaves que existem no financeiro (numero_nota em contas_pagar)
      const chaves = entradasData.map(e => e.chave_nfe);
      const { data: contasData, error: contasError } = await supabase
        .from("contas_pagar")
        .select("numero_nota")
        .in("numero_nota", chaves);

      if (contasError) throw contasError;

      const chavesNoFinanceiro = new Set((contasData || []).map(c => c.numero_nota));

      const entradasComStatus: EntradaNfe[] = entradasData.map(e => ({
        ...e,
        temFinanceiro: chavesNoFinanceiro.has(e.chave_nfe)
      }));

      setEntradas(entradasComStatus);
    } catch (error) {
      console.error("Erro ao buscar entradas:", error);
    } finally {
      setLoadingList(false);
    }
  }, []);

  useEffect(() => {
    fetchEntradas();
  }, [fetchEntradas]);

  const validarChave = (chave: string): boolean => {
    // Remove espaços e caracteres não numéricos
    const chaveLimpa = chave.replace(/\D/g, "");
    return chaveLimpa.length === 44;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const chaveLimpa = chaveInput.replace(/\D/g, "");
    
    if (!validarChave(chaveLimpa)) {
      toast({
        title: "Chave inválida",
        description: "A chave NFe deve ter exatamente 44 dígitos numéricos.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      // Verifica se já existe
      const { data: existente, error: checkError } = await supabase
        .from("entradas_nfe")
        .select("id")
        .eq("chave_nfe", chaveLimpa)
        .maybeSingle();

      if (checkError) throw checkError;

      if (existente) {
        toast({
          title: "Chave já registrada",
          description: "Esta chave NFe já foi dado entrada anteriormente.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      // Insere nova entrada
      const { error: insertError } = await supabase
        .from("entradas_nfe")
        .insert({ chave_nfe: chaveLimpa });

      if (insertError) throw insertError;

      toast({
        title: "Entrada registrada",
        description: "Chave NFe registrada com sucesso!",
      });

      setChaveInput("");
      fetchEntradas();
    } catch (error: any) {
      console.error("Erro ao registrar entrada:", error);
      toast({
        title: "Erro ao registrar",
        description: error.message || "Não foi possível registrar a entrada.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const formatarChave = (chave: string): string => {
    // Formata a chave para exibição: primeiros 6 + ... + últimos 6
    if (chave.length <= 16) return chave;
    return `${chave.slice(0, 8)}...${chave.slice(-8)}`;
  };

  const formatarData = (dataStr: string): string => {
    try {
      return format(new Date(dataStr), "dd/MM/yy HH:mm");
    } catch {
      return dataStr;
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Entrada de Notas
        </CardTitle>
        <CardDescription>
          Registre a chave NFe ao receber mercadoria
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Input
            placeholder="Chave NFe (44 dígitos)"
            value={chaveInput}
            onChange={(e) => setChaveInput(e.target.value)}
            className="font-mono text-xs"
            maxLength={48}
            disabled={loading}
          />
          <Button type="submit" disabled={loading || !chaveInput.trim()}>
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Check className="h-4 w-4" />
            )}
          </Button>
        </form>

        {chaveInput.trim() && (
          <div className="text-xs text-muted-foreground">
            {chaveInput.replace(/\D/g, "").length}/44 dígitos
          </div>
        )}

        <Separator />

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Últimas entradas</span>
            <span className="text-xs text-muted-foreground">
              {entradas.length} registro(s)
            </span>
          </div>

          {loadingList ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          ) : entradas.length === 0 ? (
            <div className="text-center py-4 text-sm text-muted-foreground">
              Nenhuma entrada registrada
            </div>
          ) : (
            <ScrollArea className="h-[200px]">
              <div className="space-y-2">
                {entradas.map((entrada) => (
                  <div
                    key={entrada.id}
                    className="flex items-center justify-between p-2 rounded-md border bg-muted/30 text-sm"
                  >
                    <div className="flex flex-col gap-1 min-w-0">
                      <code className="text-xs font-mono truncate" title={entrada.chave_nfe}>
                        {formatarChave(entrada.chave_nfe)}
                      </code>
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatarData(entrada.data_entrada)}
                      </span>
                    </div>
                    <div className="shrink-0 ml-2">
                      {entrada.temFinanceiro ? (
                        <Badge variant="default" className="text-xs gap-1">
                          <DollarSign className="h-3 w-3" />
                          Financeiro
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs gap-1">
                          <AlertCircle className="h-3 w-3" />
                          Pendente
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
