import { useState } from "react";
import { useDropzone } from "react-dropzone";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { Upload, FileSpreadsheet, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { format, parse } from "date-fns";

interface ImportadorVendasProps {
  onSuccess: () => void;
}

interface ParsedRow {
  data?: string;
  vendedora?: string;
  filial?: string;
  valor_bruto?: string;
  desconto?: string;
  qtd_itens?: string;
  atendimentos?: string;        // <-- opcional
  [key: string]: string | undefined;
}

interface MappedRow {
  data: string;                 // sempre "YYYY-MM-01"
  vendedora_nome: string;
  filial_nome: string;
  valor_bruto_centavos: number;
  desconto_centavos: number;
  qtd_itens: number;
  atendimentos: number;         // >= 0
  valid: boolean;
  error?: string;
}

export function ImportadorVendas({ onSuccess }: ImportadorVendasProps) {
  const [parsedData, setParsedData] = useState<ParsedRow[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
  const [mappedData, setMappedData] = useState<MappedRow[]>([]);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importResult, setImportResult] = useState<{ success: number; errors: number } | null>(null);
  const { toast } = useToast();

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      "text/csv": [".csv"],
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
      "application/vnd.ms-excel": [".xls"],
    },
    maxFiles: 1,
    onDrop: (acceptedFiles) => {
      const file = acceptedFiles[0];
      if (!file) return;

      if (file.name.endsWith(".csv")) {
        parseCSV(file);     // CSV (usa ; por padrão, autodetecta ,)
      } else {
        parseExcel(file);   // Excel
      }
    },
  });

  // =============================
  // CSV: prioriza ; e faz fallback para ,
  // =============================
  function parseCSV(file: File) {
    const tryParse = (delimiter: ";" | ",", onDone: (ok: boolean, res?: Papa.ParseResult<any>) => void) => {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        delimiter, // força delimitador
        complete: (results) => {
          const ok = (results.meta.fields || []).length > 1; // >1 coluna = válido
          onDone(ok, results);
        },
        error: () => onDone(false),
      });
    };

    // 1ª tentativa: ;
    tryParse(";", (ok1, res1) => {
      if (ok1 && res1) {
        setHeaders(res1.meta.fields || []);
        setParsedData(res1.data as ParsedRow[]);
        toast({ title: `${(res1.data || []).length} linhas carregadas do CSV (;)` });
      } else {
        // 2ª tentativa: ,
        tryParse(",", (ok2, res2) => {
          if (ok2 && res2) {
            setHeaders(res2.meta.fields || []);
            setParsedData(res2.data as ParsedRow[]);
            toast({ title: `${(res2.data || []).length} linhas carregadas do CSV (,)` });
          } else {
            toast({ title: "Não foi possível detectar o delimitador", variant: "destructive" });
          }
        });
      }
    });
  }

  // =============================
  // Excel: sem delimitador
  // =============================
  function parseExcel(file: File) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const data = new Uint8Array(e.target?.result as ArrayBuffer);
      const workbook = XLSX.read(data, { type: "array" });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const json = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

      if (json.length < 2) {
        toast({ title: "Arquivo vazio", variant: "destructive" });
        return;
      }

      const headers = json[0] as string[];
      const rows = json.slice(1) as any[][];

      const parsedRows = rows.map((row) => {
        const obj: ParsedRow = {};
        headers.forEach((header, index) => {
          obj[header] = row[index]?.toString() || "";
        });
        return obj;
      });

      setHeaders(headers);
      setParsedData(parsedRows);
      toast({ title: `${parsedRows.length} linhas carregadas do Excel` });
    };
    reader.readAsArrayBuffer(file);
  }

  function handleColumnMapping(field: string, column: string) {
    setColumnMapping((prev) => ({ ...prev, [field]: column }));
  }

  // Normaliza qualquer data para primeiro dia do mês (YYYY-MM-01)
  function normalizeToMonthStart(dateStr: string): string {
    try {
      if (!dateStr) return "";
      // dd/MM/yyyy
      if (dateStr.includes("/")) {
        const parsed = parse(dateStr, "dd/MM/yyyy", new Date());
        return format(parsed, "yyyy-MM-01");
      }
      // yyyy-MM ou yyyy-MM-dd
      if (/^\d{4}-\d{2}(-\d{2})?$/.test(dateStr)) {
        const [y, m] = dateStr.slice(0, 7).split("-");
        return `${y}-${m}-01`;
      }
    } catch {
      /* queda para erro abaixo */
    }
    throw new Error("Data inválida");
  }

  // =============================
  // Validação e mapeamento
  // =============================
  function validateAndMapData() {
    const requiredFields = ["data", "vendedora", "filial", "valor_bruto", "desconto", "qtd_itens"];
    const missing = requiredFields.filter((field) => !columnMapping[field]);
    if (missing.length > 0) {
      toast({
        title: "Mapeamento incompleto",
        description: `Faltam mapear: ${missing.join(", ")}`,
        variant: "destructive",
      });
      return;
    }

    const mapped = parsedData.map((row) => {
      try {
        const dataStr = row[columnMapping.data]?.trim() || "";
        const valorBrutoStr =
          row[columnMapping.valor_bruto]?.replace(/[^\d,.-]/g, "").replace(",", ".") || "0";
        const descontoStr =
          row[columnMapping.desconto]?.replace(/[^\d,.-]/g, "").replace(",", ".") || "0";
        const qtdItensStr = row[columnMapping.qtd_itens]?.trim() || "1";

        // atendimentos (opcional)
        const atendStr = columnMapping.atendimentos
          ? row[columnMapping.atendimentos!]?.trim() || "0"
          : "0";

        // Data → sempre YYYY-MM-01
        const dataFormatada = normalizeToMonthStart(dataStr);

        const valorBrutoCentavos = Math.round(parseFloat(valorBrutoStr) * 100);
        const descontoCentavos = Math.round(parseFloat(descontoStr) * 100);
        const qtdItens = parseInt(qtdItensStr, 10);
        const atend = parseInt(atendStr, 10);

        if (isNaN(valorBrutoCentavos) || valorBrutoCentavos < 0) {
          throw new Error("Valor bruto inválido");
        }
        if (isNaN(descontoCentavos) || descontoCentavos < 0) {
          throw new Error("Desconto inválido");
        }
        if (isNaN(qtdItens) || qtdItens < 1) {
          throw new Error("Quantidade inválida");
        }
        if (isNaN(atend) || atend < 0) {
          throw new Error("Atendimentos inválido");
        }

        return {
          data: dataFormatada,
          vendedora_nome: row[columnMapping.vendedora]?.trim() || "",
          filial_nome: row[columnMapping.filial]?.trim() || "",
          valor_bruto_centavos: valorBrutoCentavos,
          desconto_centavos: descontoCentavos,
          qtd_itens: qtdItens,
          atendimentos: atend,
          valid: true,
        };
      } catch (error) {
        return {
          data: "",
          vendedora_nome: "",
          filial_nome: "",
          valor_bruto_centavos: 0,
          desconto_centavos: 0,
          qtd_itens: 0,
          atendimentos: 0,
          valid: false,
          error: error instanceof Error ? error.message : "Erro desconhecido",
        };
      }
    });

    setMappedData(mapped);
    toast({
      title: "Dados mapeados",
      description: `${mapped.filter((m) => m.valid).length} válidas, ${
        mapped.filter((m) => !m.valid).length
      } com erros`,
    });
  }

  // =============================
  // Import
  // =============================
  async function importData() {
    const validRows = mappedData.filter((row) => row.valid);
    if (validRows.length === 0) {
      toast({ title: "Nenhuma linha válida para importar", variant: "destructive" });
      return;
    }

    setImporting(true);
    setImportProgress(0);

    let successCount = 0;
    let errorCount = 0;

    // Busca vendedoras e filiais
    const { data: vendedoras } = await supabase
      .from("pessoas_fisicas")
      .select("id, nome_completo");
    const { data: filiais } = await supabase.from("filiais").select("id, nome");

    const vendedorasMap = new Map(
      vendedoras?.map((v) => [v.nome_completo.toLowerCase(), v.id]) || []
    );
    const filiaisMap = new Map(filiais?.map((f) => [f.nome.toLowerCase(), f.id]) || []);

    for (let i = 0; i < validRows.length; i++) {
      const row = validRows[i];
      const vendedoraId = vendedorasMap.get(row.vendedora_nome.toLowerCase());
      const filialId = filiaisMap.get(row.filial_nome.toLowerCase());

      if (!vendedoraId || !filialId) {
        errorCount++;
        setImportProgress(Math.round(((i + 1) / validRows.length) * 100));
        continue;
      }

      const { error } = await supabase.from("vendas_diarias").insert({
        data: row.data, // YYYY-MM-01
        vendedora_pf_id: vendedoraId,
        filial_id: filialId,
        valor_bruto_centavos: row.valor_bruto_centavos,
        desconto_centavos: row.desconto_centavos,
        valor_liquido_centavos: row.valor_bruto_centavos - row.desconto_centavos,
        qtd_itens: row.qtd_itens,
        atendimentos: row.atendimentos ?? 0, // <-- novo
      });

      if (error) errorCount++; else successCount++;
      setImportProgress(Math.round(((i + 1) / validRows.length) * 100));
    }

    setImporting(false);
    setImportResult({ success: successCount, errors: errorCount });

    toast({
      title: "Importação concluída",
      description: `${successCount} vendas importadas, ${errorCount} erros`,
    });

    if (successCount > 0) onSuccess();
  }

  function reset() {
    setParsedData([]);
    setHeaders([]);
    setColumnMapping({});
    setMappedData([]);
    setImportResult(null);
    setImportProgress(0);
  }

  if (importResult) {
    return (
      <Card>
        <CardHeader><CardTitle>Resultado da Importação</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <span className="text-lg font-medium">{importResult.success} importadas</span>
            </div>
            <div className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-red-500" />
              <span className="text-lg font-medium">{importResult.errors} erros</span>
            </div>
          </div>
          <Button onClick={reset}>Nova Importação</Button>
        </CardContent>
      </Card>
    );
  }

  if (mappedData.length > 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Preview dos Dados</CardTitle>
          <CardDescription>
            Revise os dados antes de importar ({mappedData.filter((m) => m.valid).length} válidas,{" "}
            {mappedData.filter((m) => !m.valid).length} com erro)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {importing && (
            <div className="space-y-2">
              <Progress value={importProgress} />
              <p className="text-sm text-muted-foreground text-center">
                Importando... {importProgress}%
              </p>
            </div>
          )}

          <div className="max-h-96 overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Status</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Vendedora</TableHead>
                  <TableHead>Filial</TableHead>
                  <TableHead>Valor Bruto</TableHead>
                  <TableHead>Desconto</TableHead>
                  <TableHead>Itens</TableHead>
                  <TableHead>Atendimentos</TableHead> {/* novo */}
                </TableRow>
              </TableHeader>
              <TableBody>
                {mappedData.slice(0, 20).map((row, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      {row.valid ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <div title={row.error}>
                          <XCircle className="h-4 w-4 text-red-500" />
                        </div>
                      )}
                    </TableCell>
                    <TableCell>{row.data}</TableCell>
                    <TableCell>{row.vendedora_nome}</TableCell>
                    <TableCell>{row.filial_nome}</TableCell>
                    <TableCell>R$ {(row.valor_bruto_centavos / 100).toFixed(2)}</TableCell>
                    <TableCell>R$ {(row.desconto_centavos / 100).toFixed(2)}</TableCell>
                    <TableCell>{row.qtd_itens}</TableCell>
                    <TableCell>{row.atendimentos}</TableCell> {/* novo */}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="flex gap-2">
            <Button onClick={importData} disabled={importing}>
              {importing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Importando...
                </>
              ) : (
                "Confirmar Importação"
              )}
            </Button>
            <Button variant="outline" onClick={reset} disabled={importing}>
              Cancelar
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (parsedData.length > 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Mapear Colunas</CardTitle>
          <CardDescription>Relacione as colunas do arquivo com os campos do sistema</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              "data",
              "vendedora",
              "filial",
              "valor_bruto",
              "desconto",
              "qtd_itens",
              "atendimentos", // opcional
            ].map((field) => (
              <div key={field} className="space-y-2">
                <label className="text-sm font-medium capitalize">
                  {field.replace("_", " ")}
                </label>
                <Select
                  value={columnMapping[field]}
                  onValueChange={(value) => handleColumnMapping(field, value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={field === "atendimentos" ? "Opcional" : "Selecione a coluna"} />
                  </SelectTrigger>
                  <SelectContent>
                    {headers.map((header) => (
                      <SelectItem key={header} value={header}>
                        {header}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            <Button onClick={validateAndMapData}>Validar e Continuar</Button>
            <Button variant="outline" onClick={reset}>
              Cancelar
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Importar Vendas</CardTitle>
        <CardDescription>Faça upload de um arquivo CSV (padrão ; ou ,) ou Excel com os dados das vendas</CardDescription>
      </CardHeader>
      <CardContent>
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors ${
            isDragActive
              ? "border-primary bg-primary/5"
              : "border-muted-foreground/25 hover:border-primary/50"
          }`}
        >
          <input {...getInputProps()} />
          <div className="space-y-4">
            {isDragActive ? (
              <Upload className="mx-auto h-12 w-12 text-primary" />
            ) : (
              <FileSpreadsheet className="mx-auto h-12 w-12 text-muted-foreground" />
            )}
            <div>
              <p className="text-lg font-medium">
                {isDragActive ? "Solte o arquivo aqui" : "Arraste um arquivo CSV ou Excel aqui"}
              </p>
              <p className="text-sm text-muted-foreground">ou clique para selecionar</p>
            </div>
          </div>
        </div>

        <div className="mt-4 p-4 bg-muted rounded-lg">
          <p className="text-sm font-medium mb-2">Formato mínimo esperado:</p>
          <code className="text-xs">
            Data, Vendedora, Filial, Valor Bruto, Desconto, Qtd Itens
          </code>
          <p className="text-sm mt-2">
            Opcional: <code>Atendimentos</code> (para cálculo de ticket médio).
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            * CSV com **;** é aceito nativamente. Se vier com **,**, o importador detecta e ajusta.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
