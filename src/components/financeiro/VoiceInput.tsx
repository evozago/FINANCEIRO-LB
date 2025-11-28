import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Mic, MicOff, Loader2 } from "lucide-react"; // Ícones que você já usa
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";

interface VoiceInputProps {
  onDataReceived: (data: any) => void;
}

export function VoiceInput({ onDataReceived }: VoiceInputProps) {
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  const startListening = () => {
    if (!('webkitSpeechRecognition' in window)) {
      toast({ title: "Erro", description: "Seu navegador não suporta reconhecimento de voz.", variant: "destructive" });
      return;
    }

    const recognition = new (window as any).webkitSpeechRecognition();
    recognition.lang = 'pt-BR';
    recognition.continuous = false;

    recognition.onstart = () => setIsListening(true);
    
    recognition.onresult = async (event: any) => {
      const transcript = event.results[0][0].transcript;
      setIsListening(false);
      processarTexto(transcript);
    };

    recognition.onerror = () => {
      setIsListening(false);
      toast({ title: "Erro", description: "Não entendi o áudio, tente novamente." });
    };

    recognition.start();
  };

  const processarTexto = async (texto: string) => {
    setIsProcessing(true);
    toast({ title: "Processando...", description: `Entendi: "${texto}"` });

    try {
      const { data, error } = await supabase.functions.invoke('processar-audio-despesa', {
        body: { textoTranscrito: texto }
      });

      if (error) throw error;

      onDataReceived(data); // Passa o JSON preenchido para o formulário pai
      toast({ title: "Sucesso!", description: "Dados extraídos com IA." });

    } catch (error) {
      console.error(error);
      toast({ title: "Erro na IA", description: "Falha ao processar a despesa.", variant: "destructive" });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Button 
      type="button" 
      variant={isListening ? "destructive" : "default"} 
      onClick={startListening}
      disabled={isProcessing}
      className="gap-2"
    >
      {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : (isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />)}
      {isListening ? "Ouvindo..." : "Lançar por Voz"}
    </Button>
  );
}
