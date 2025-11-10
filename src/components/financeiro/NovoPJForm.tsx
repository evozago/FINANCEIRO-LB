import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus } from "lucide-react";

interface NovoPJFormProps {
  onSuccess: (newPJ: { id: number; razao_social: string; nome_fantasia?: string }) => void;
}

export function NovoPJForm({ onSuccess }: NovoPJFormProps) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    razao_social: "",
    nome_fantasia: "",
    cnpj: "",
    email: "",
    celular: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.razao_social.trim()) {
      toast.error("Razão social é obrigatória");
      return;
    }

    setIsSubmitting(true);
    try {
      const { data, error } = await supabase
        .from("pessoas_juridicas")
        .insert({
          razao_social: formData.razao_social.trim(),
          nome_fantasia: formData.nome_fantasia.trim() || null,
          cnpj: formData.cnpj.trim() || null,
          email: formData.email.trim() || null,
          celular: formData.celular.trim() || null,
        })
        .select()
        .single();

      if (error) throw error;

      toast.success("Fornecedor cadastrado com sucesso!");
      onSuccess(data);
      setOpen(false);
      setFormData({
        razao_social: "",
        nome_fantasia: "",
        cnpj: "",
        email: "",
        celular: "",
      });
    } catch (error: any) {
      console.error("Erro ao cadastrar fornecedor:", error);
      toast.error("Erro ao cadastrar: " + (error.message || "Erro desconhecido"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="icon">
          <Plus className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Novo Fornecedor PJ</DialogTitle>
          <DialogDescription>Cadastre uma nova pessoa jurídica</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="razao_social">Razão Social *</Label>
              <Input
                id="razao_social"
                value={formData.razao_social}
                onChange={(e) => setFormData({ ...formData, razao_social: e.target.value })}
                placeholder="Empresa Ltda"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="nome_fantasia">Nome Fantasia</Label>
              <Input
                id="nome_fantasia"
                value={formData.nome_fantasia}
                onChange={(e) => setFormData({ ...formData, nome_fantasia: e.target.value })}
                placeholder="Nome comercial"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="cnpj">CNPJ</Label>
                <Input
                  id="cnpj"
                  value={formData.cnpj}
                  onChange={(e) => setFormData({ ...formData, cnpj: e.target.value })}
                  placeholder="00.000.000/0000-00"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="celular">Celular</Label>
                <Input
                  id="celular"
                  value={formData.celular}
                  onChange={(e) => setFormData({ ...formData, celular: e.target.value })}
                  placeholder="(00) 00000-0000"
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="contato@empresa.com"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Salvando..." : "Cadastrar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
