import { useState, useCallback, useRef } from "react";
import { Mic, MicOff, Loader2, Upload, FileImage } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useDropzone } from "react-dropzone";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

export function GlobalAIActions() {
  const navigate = useNavigate();
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Toggle voice recording
  const toggleListening = async () => {
    if (isListening) {
      // Stop recording
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
        mediaRecorderRef.current.stop();
      }
      setIsListening(false);
    } else {
      // Start recording
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mediaRecorder = new MediaRecorder(stream);
        mediaRecorderRef.current = mediaRecorder;
        audioChunksRef.current = [];

        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            audioChunksRef.current.push(event.data);
          }
        };

        mediaRecorder.onstop = async () => {
          // Stop all tracks
          stream.getTracks().forEach(track => track.stop());
          
          if (audioChunksRef.current.length > 0) {
            const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
            await processAudio(audioBlob);
          }
        };

        mediaRecorder.start();
        setIsListening(true);
        toast.info("Gravando... Clique novamente para parar.");
      } catch (error) {
        console.error("Erro ao acessar microfone:", error);
        toast.error("Não foi possível acessar o microfone.");
      }
    }
  };

  const processAudio = async (audioBlob: Blob) => {
    setIsProcessing(true);
    toast.info("Processando áudio...");

    try {
      // Convert to base64
      const base64 = await blobToBase64(audioBlob);
      
      const { data, error } = await supabase.functions.invoke("gemini-chat", {
        body: { 
          audio_base64: base64,
          audio_mime_type: audioBlob.type
        },
      });

      if (error) throw error;

      if (data.error) {
        throw new Error(data.error);
      }

      toast.success("Áudio processado com sucesso!");
      
      // Navigate based on intent
      if (data.intencao === "DAR_BAIXA") {
        navigate("/financeiro/contas-pagar", { state: { darBaixa: data } });
      } else {
        navigate("/financeiro/contas-pagar/nova", { state: { dadosImportados: data } });
      }
    } catch (error) {
      console.error("Erro ao processar áudio:", error);
      toast.error(error instanceof Error ? error.message : "Falha ao processar áudio.");
    } finally {
      setIsProcessing(false);
    }
  };

  const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(blob);
      reader.onload = () => {
        const result = reader.result as string;
        const base64 = result.split(",")[1];
        resolve(base64);
      };
      reader.onerror = reject;
    });
  };

  const processarTexto = async (texto: string) => {
    setIsProcessing(true);
    toast.info(`Processando: "${texto}"`);

    try {
      const { data, error } = await supabase.functions.invoke(
        "processar-audio-despesa",
        {
          body: { textoTranscrito: texto },
        }
      );

      if (error) throw error;

      toast.success("Dados extraídos com sucesso!");
      // Navegar para nova conta a pagar com dados preenchidos
      navigate("/financeiro/contas-pagar/nova", { state: { dadosVoz: data } });
    } catch (error) {
      console.error(error);
      toast.error("Falha ao processar a despesa.");
    } finally {
      setIsProcessing(false);
    }
  };

  // File upload
  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      if (!file) return;

      setShowUploadDialog(false);
      setIsProcessing(true);
      toast.info(`Processando ${file.name}...`);

      try {
        // Convert to base64
        const base64 = await fileToBase64(file);
        const mimeType = file.type;

        const { data, error } = await supabase.functions.invoke("gemini-chat", {
          body: mimeType.startsWith("image/")
            ? { image_base64: base64, image_mime_type: mimeType }
            : { pdf_base64: base64 },
        });

        if (error) throw error;

        if (data.error) {
          throw new Error(data.error);
        }

        toast.success(`Documento analisado com ${data.confianca}% de confiança`);
        
        // Navigate to appropriate page based on intent
        if (data.intencao === "DAR_BAIXA") {
          navigate("/financeiro/contas-pagar", { state: { darBaixa: data } });
        } else {
          navigate("/financeiro/contas-pagar/nova", { state: { dadosImportados: data } });
        }
      } catch (error) {
        console.error("Erro ao processar documento:", error);
        toast.error(
          error instanceof Error ? error.message : "Erro ao processar documento"
        );
      } finally {
        setIsProcessing(false);
      }
    },
    [navigate]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/*": [".jpg", ".jpeg", ".png", ".webp"],
      "application/pdf": [".pdf"],
    },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024,
  });

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        const base64 = result.split(",")[1];
        resolve(base64);
      };
      reader.onerror = reject;
    });
  };

  return (
    <>
      <div className="flex items-center gap-1">
        {/* Voice Input Button */}
        <Button
          variant={isListening ? "destructive" : "ghost"}
          size="icon"
          onClick={toggleListening}
          disabled={isProcessing}
          title="Lançar por voz"
        >
          {isProcessing ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : isListening ? (
            <MicOff className="h-5 w-5" />
          ) : (
            <Mic className="h-5 w-5" />
          )}
        </Button>

        {/* Upload Button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setShowUploadDialog(true)}
          disabled={isProcessing}
          title="Importar documento (imagem ou PDF)"
        >
          <FileImage className="h-5 w-5" />
        </Button>
      </div>

      {/* Upload Dialog */}
      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Importar Documento com IA</DialogTitle>
          </DialogHeader>

          <div
            {...getRootProps()}
            className={`
              border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
              ${isDragActive ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50"}
            `}
          >
            <input {...getInputProps()} />
            <Upload className="h-10 w-10 mx-auto mb-4 text-muted-foreground" />
            {isDragActive ? (
              <p className="text-primary font-medium">Solte o arquivo aqui...</p>
            ) : (
              <div className="space-y-2">
                <p className="font-medium">Arraste uma imagem ou PDF aqui</p>
                <p className="text-sm text-muted-foreground">
                  ou clique para selecionar
                </p>
                <p className="text-xs text-muted-foreground mt-4">
                  Suporta: Notas fiscais, boletos, comprovantes de pagamento
                </p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
