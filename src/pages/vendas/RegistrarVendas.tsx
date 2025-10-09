import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DatePicker } from "@/components/ui/date-picker";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, Upload, Edit, Trash2, Download } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ImportadorVendas } from "@/components/vendas/ImportadorVendas";

const vendaSchema = z.object({
  data: z.date({ required_error: "Data é obrigatória" }),
  vendedora_pf_id: z.string().min(1, "Selecione uma vendedora"),
  filial_id: z.string().min(1, "Selecione uma filial"),
  valor_bruto_centavos: z.number().min(0, "Valor deve ser positivo"),
  desconto_centavos: z.number().min(0, "Desconto deve ser positivo"),
  qtd_itens: z.number().min(1, "Quantidade deve ser maior que zero"),
});

type VendaFormData = z.infer<typeof vendaSchema>;

interface Vendedora {
  id: number;
  nome_completo: string;
}

interface Filial {
  id: number;
  nome: string;
}

interface Venda {
  id: number;
  data: string;
  vendedora_pf_id: number;
  filial_id: number;
  valor_bruto_centavos: number;
  desconto_centavos: number;
  valor_liquido_centavos: number;
  qtd_itens: number;
  pessoas_fisicas?: { nome_completo: string };
  filiais?: { nome: string };
}

export default function RegistrarVendas() {
  const [vendedoras, setVendedoras] = useState<Vendedora[]>([]);
  const [filiais, setFiliais] = useState<Filial[]>([]);
  const [vendas, setVendas] = useState<Venda[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const { toast } = useToast();

  const form = useForm<VendaFormData>({
    resolver: zodResolver(vendaSchema),
    defaultValues: {
      data: new Date(),
      vendedora_pf_id: "",
      filial_id: "",
      valor_bruto_centavos: 0,
      desconto_centavos: 0,
      qtd_itens: 1,
    },
  });

  const valorBruto = form.watch("valor_bruto_centavos");
  const desconto = form.watch("desconto_centavos");
  const valorLiquido = valorBruto - desconto;

  useEffect(() => {
    fetchVendedoras();
    fetchFiliais();
    fetchVendas();
  }, []);

  async function fetchVendedoras() {
    const { data, error } = await supabase
      .from("pessoas_fisicas")
      .select("id, nome_completo")
      .order("nome_completo");

    if (error) {
      toast({ title: "Erro ao carregar vendedoras", variant: "destructive" });
    } else {
      setVendedoras(data || []);
    }
  }

  async function fetchFiliais() {
    const { data, error } = await supabase
      .from("filiais")
      .select("id, nome")
      .order("nome");

    if (error) {
      toast({ title: "Erro ao carregar filiais", variant: "destructive" });
    } else {
      setFiliais(data || []);
    }
  }

  async function fetchVendas() {
    const { data, error } = await supabase
      .from("vendas_diarias")
      .select(`
        *,
        pessoas_fisicas(nome_completo),
        filiais(nome)
      `)
      .order("data", { ascending: false })
      .limit(50);

    if (error) {
      toast({ title: "Erro ao carregar vendas", variant: "destructive" });
    } else {
      setVendas(data || []);
    }
  }

  async function onSubmit(values: VendaFormData) {
    setLoading(true);
    try {
      const vendaData = {
        data: format(values.data, "yyyy-MM-dd"),
        vendedora_pf_id: parseInt(values.vendedora_pf_id),
        filial_id: parseInt(values.filial_id),
        valor_bruto_centavos: values.valor_bruto_centavos,
        desconto_centavos: values.desconto_centavos,
        valor_liquido_centavos: values.valor_bruto_centavos - values.desconto_centavos,
        qtd_itens: values.qtd_itens,
      };

      let error;
      if (editingId) {
        ({ error } = await supabase
          .from("vendas_diarias")
          .update(vendaData)
          .eq("id", editingId));
      } else {
        ({ error } = await supabase.from("vendas_diarias").insert(vendaData));
      }

      if (error) throw error;

      toast({
        title: editingId ? "Venda atualizada!" : "Venda registrada!",
        description: "Dados salvos com sucesso.",
      });

      form.reset({
        data: new Date(),
        vendedora_pf_id: "",
        filial_id: "",
        valor_bruto_centavos: 0,
        desconto_centavos: 0,
        qtd_itens: 1,
      });
      setEditingId(null);
      fetchVendas();
    } catch (error) {
      toast({
        title: "Erro ao salvar venda",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  function editVenda(venda: Venda) {
    setEditingId(venda.id);
    form.reset({
      data: new Date(venda.data),
      vendedora_pf_id: venda.vendedora_pf_id.toString(),
      filial_id: venda.filial_id.toString(),
      valor_bruto_centavos: venda.valor_bruto_centavos,
      desconto_centavos: venda.desconto_centavos,
      qtd_itens: venda.qtd_itens,
    });
  }

  async function deleteVenda(id: number) {
    if (!confirm("Tem certeza que deseja excluir esta venda?")) return;

    const { error } = await supabase.from("vendas_diarias").delete().eq("id", id);

    if (error) {
      toast({
        title: "Erro ao excluir venda",
        variant: "destructive",
      });
    } else {
      toast({ title: "Venda excluída com sucesso" });
      fetchVendas();
    }
  }

  function formatCurrency(cents: number) {
    return (cents / 100).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  }

  async function exportToCSV() {
    const csv = [
      ["Data", "Vendedora", "Filial", "Valor Bruto", "Desconto", "Valor Líquido", "Qtd Itens"],
      ...vendas.map((v) => [
        format(new Date(v.data), "dd/MM/yyyy"),
        v.pessoas_fisicas?.nome_completo || "",
        v.filiais?.nome || "",
        formatCurrency(v.valor_bruto_centavos),
        formatCurrency(v.desconto_centavos),
        formatCurrency(v.valor_liquido_centavos),
        v.qtd_itens,
      ]),
    ]
      .map((row) => row.join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `vendas_${format(new Date(), "yyyy-MM-dd")}.csv`;
    link.click();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Registrar Vendas</h1>
        <p className="text-muted-foreground">
          Cadastre vendas manualmente ou importe via CSV/Excel
        </p>
      </div>

      <Tabs defaultValue="manual" className="w-full">
        <TabsList>
          <TabsTrigger value="manual">
            <Plus className="mr-2 h-4 w-4" />
            Cadastro Manual
          </TabsTrigger>
          <TabsTrigger value="importar">
            <Upload className="mr-2 h-4 w-4" />
            Importar CSV/Excel
          </TabsTrigger>
        </TabsList>

        <TabsContent value="manual">
          <Card>
            <CardHeader>
              <CardTitle>{editingId ? "Editar Venda" : "Nova Venda"}</CardTitle>
              <CardDescription>
                Preencha os dados da venda para registrar no sistema
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="data"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Data</FormLabel>
                          <FormControl>
                            <DatePicker
                              date={field.value}
                              onSelect={field.onChange}
                              placeholder="Selecione a data"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="vendedora_pf_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Vendedora</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione a vendedora" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {vendedoras.map((v) => (
                                <SelectItem key={v.id} value={v.id.toString()}>
                                  {v.nome_completo}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="filial_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Filial</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione a filial" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {filiais.map((f) => (
                                <SelectItem key={f.id} value={f.id.toString()}>
                                  {f.nome}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="valor_bruto_centavos"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Valor Bruto</FormLabel>
                          <FormControl>
                            <CurrencyInput
                              value={field.value}
                              onValueChange={field.onChange}
                              placeholder="R$ 0,00"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="desconto_centavos"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Desconto</FormLabel>
                          <FormControl>
                            <CurrencyInput
                              value={field.value}
                              onValueChange={field.onChange}
                              placeholder="R$ 0,00"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="qtd_itens"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Quantidade de Itens</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="1"
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="bg-muted p-4 rounded-lg">
                    <p className="text-sm font-medium">
                      Valor Líquido: <span className="text-lg">{formatCurrency(valorLiquido)}</span>
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <Button type="submit" disabled={loading}>
                      {loading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Salvando...
                        </>
                      ) : (
                        <>
                          <Plus className="mr-2 h-4 w-4" />
                          {editingId ? "Atualizar Venda" : "Registrar Venda"}
                        </>
                      )}
                    </Button>
                    {editingId && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setEditingId(null);
                          form.reset();
                        }}
                      >
                        Cancelar
                      </Button>
                    )}
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="importar">
          <ImportadorVendas onSuccess={fetchVendas} />
        </TabsContent>
      </Tabs>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Vendas Registradas</CardTitle>
              <CardDescription>Últimas 50 vendas cadastradas</CardDescription>
            </div>
            <Button onClick={exportToCSV} variant="outline">
              <Download className="mr-2 h-4 w-4" />
              Exportar CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Vendedora</TableHead>
                <TableHead>Filial</TableHead>
                <TableHead className="text-right">Valor Bruto</TableHead>
                <TableHead className="text-right">Desconto</TableHead>
                <TableHead className="text-right">Valor Líquido</TableHead>
                <TableHead className="text-right">Itens</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {vendas.map((venda) => (
                <TableRow key={venda.id}>
                  <TableCell>
                    {format(new Date(venda.data), "dd/MM/yyyy", { locale: ptBR })}
                  </TableCell>
                  <TableCell>{venda.pessoas_fisicas?.nome_completo}</TableCell>
                  <TableCell>{venda.filiais?.nome}</TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(venda.valor_bruto_centavos)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(venda.desconto_centavos)}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(venda.valor_liquido_centavos)}
                  </TableCell>
                  <TableCell className="text-right">{venda.qtd_itens}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => editVenda(venda)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteVenda(venda.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
