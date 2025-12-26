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
import { Progress } from "@/components/ui/progress";

interface ProcessedReceipt {
  file: File;
  status: 'pending' | 'processing' | 'success' | 'error';
  data?: any;
  error?: string;
}

export function GlobalAIActions() {
  const navigate = useNavigate();
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [receiptsToProcess, setReceiptsToProcess] = useState<ProcessedReceipt[]>([]);
  const [processingProgress, setProcessingProgress] = useState(0);
  
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

  // File upload - now supports multiple files
  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (!acceptedFiles.length) return;

      // Initialize receipts with pending status
      const receipts: ProcessedReceipt[] = acceptedFiles.map(file => ({
        file,
        status: 'pending'
      }));
      
      setReceiptsToProcess(receipts);
      setShowUploadDialog(false);
      setIsProcessing(true);
      
      toast.info(`Processando ${acceptedFiles.length} comprovante(s)...`);
      
      const processedReceipts: ProcessedReceipt[] = [];
      
      // Process each file sequentially to avoid rate limits
      for (let i = 0; i < acceptedFiles.length; i++) {
        const file = acceptedFiles[i];
        setProcessingProgress(Math.round(((i) / acceptedFiles.length) * 100));
        
        // Update status to processing
        setReceiptsToProcess(prev => prev.map((r, idx) => 
          idx === i ? { ...r, status: 'processing' } : r
        ));
        
        try {
          const base64 = await fileToBase64(file);
          const mimeType = file.type;

          const { data, error } = await supabase.functions.invoke("gemini-chat", {
            body: mimeType.startsWith("image/")
              ? { image_base64: base64, image_mime_type: mimeType }
              : { pdf_base64: base64 },
          });

          if (error) throw error;
          if (data.error) throw new Error(data.error);

          processedReceipts.push({
            file,
            status: 'success',
            data
          });
          
          // Update status to success
          setReceiptsToProcess(prev => prev.map((r, idx) => 
            idx === i ? { ...r, status: 'success', data } : r
          ));
          
        } catch (error) {
          console.error(`Erro ao processar ${file.name}:`, error);
          processedReceipts.push({
            file,
            status: 'error',
            error: error instanceof Error ? error.message : 'Erro desconhecido'
          });
          
          // Update status to error
          setReceiptsToProcess(prev => prev.map((r, idx) => 
            idx === i ? { ...r, status: 'error', error: error instanceof Error ? error.message : 'Erro desconhecido' } : r
          ));
        }
      }
      
      setProcessingProgress(100);
      setIsProcessing(false);
      
      // Filter successful DAR_BAIXA receipts
      const baixaReceipts = processedReceipts.filter(
        r => r.status === 'success' && r.data?.intencao === 'DAR_BAIXA'
      );
      
      // Filter successful CRIAR_CONTA receipts
      const criarReceipts = processedReceipts.filter(
        r => r.status === 'success' && r.data?.intencao !== 'DAR_BAIXA'
      );
      
      const errorCount = processedReceipts.filter(r => r.status === 'error').length;
      
      if (errorCount > 0) {
        toast.warning(`${errorCount} arquivo(s) com erro no processamento.`);
      }
      
      // Navigate with batch data
      if (baixaReceipts.length > 0) {
        toast.success(`${baixaReceipts.length} comprovante(s) identificado(s) para baixa!`);
        navigate("/financeiro/contas-pagar", { 
          state: { 
            darBaixaLote: baixaReceipts.map(r => ({
              ...r.data,
              fileName: r.file.name
            }))
          } 
        });
      } else if (criarReceipts.length > 0) {
        toast.success(`${criarReceipts.length} documento(s) para criação de contas!`);
        navigate("/financeiro/contas-pagar/nova", { 
          state: { dadosImportados: criarReceipts[0].data } 
        });
      } else {
        toast.error("Nenhum documento válido processado.");
      }
      
      setReceiptsToProcess([]);
      setProcessingProgress(0);
    },
    [navigate]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/*": [".jpg", ".jpeg", ".png", ".webp"],
      "application/pdf": [".pdf"],
    },
    maxFiles: 20,
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
            <DialogTitle>Importar Comprovantes com IA</DialogTitle>
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
              <p className="text-primary font-medium">Solte os arquivos aqui...</p>
            ) : (
              <div className="space-y-2">
                <p className="font-medium">Arraste imagens ou PDFs aqui</p>
                <p className="text-sm text-muted-foreground">
                  ou clique para selecionar
                </p>
                <p className="text-xs text-muted-foreground mt-4">
                  Suporta até 20 arquivos • Notas fiscais, boletos, comprovantes
                </p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Processing Progress Dialog */}
      <Dialog open={isProcessing && receiptsToProcess.length > 0} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Processando Comprovantes</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <Progress value={processingProgress} className="h-2" />
            <p className="text-sm text-muted-foreground text-center">
              {processingProgress}% concluído
            </p>
            
            <div className="max-h-60 overflow-y-auto space-y-2">
              {receiptsToProcess.map((receipt, idx) => (
                <div key={idx} className="flex items-center gap-2 text-sm">
                  {receipt.status === 'pending' && (
                    <div className="h-4 w-4 rounded-full bg-muted" />
                  )}
                  {receipt.status === 'processing' && (
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  )}
                  {receipt.status === 'success' && (
                    <div className="h-4 w-4 rounded-full bg-green-500" />
                  )}
                  {receipt.status === 'error' && (
                    <div className="h-4 w-4 rounded-full bg-destructive" />
                  )}
                  <span className={receipt.status === 'error' ? 'text-destructive' : ''}>
                    {receipt.file.name}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}