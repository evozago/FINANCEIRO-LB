import React, { useState, useCallback } from "react";

// --- Início: Componentes de UI e utilitários recriados para independência ---

// Simples sistema de Toast para notificações
const ToastContext = React.createContext<(msg: { title: string; description?: string; variant?: 'destructive' }) => void>(() => {});
const useToast = () => React.useContext(ToastContext);

function ToastProvider({ children }: { children: React.ReactNode }) {
    const [toasts, setToasts] = useState<any[]>([]);

    const toast = useCallback((msg: { title: string; description?: string; variant?: 'destructive' }) => {
        const id = Date.now();
        setToasts(prev => [...prev, { ...msg, id }]);
        setTimeout(() => {
            setToasts(currentToasts => currentToasts.filter(t => t.id !== id));
        }, 3000);
    }, []);

    return (
        <ToastContext.Provider value={toast}>
            {children}
            <div className="fixed top-4 right-4 z-50 space-y-2">
                {toasts.map((t) => (
                    <div key={t.id} className={`p-4 rounded-md shadow-lg text-white ${t.variant === 'destructive' ? 'bg-red-600' : 'bg-gray-800'}`}>
                        <p className="font-bold">{t.title}</p>
                        {t.description && <p className="text-sm">{t.description}</p>}
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
}

// Componentes de UI
const Card = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => <div className={`bg-white border rounded-lg shadow-sm ${className}`}>{children}</div>;
const CardHeader = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => <div className={`p-6 border-b ${className}`}>{children}</div>;
const CardTitle = ({ children }: { children: React.ReactNode }) => <h3 className="text-xl font-semibold tracking-tight">{children}</h3>;
const CardDescription = ({ children }: { children: React.ReactNode }) => <p className="text-sm text-gray-500">{children}</p>;
const CardContent = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => <div className={`p-6 ${className}`}>{children}</div>;

const Button = ({ children, onClick, variant = 'default', disabled = false, className = '' }: { children: React.ReactNode; onClick?: () => void; variant?: 'default' | 'outline'; disabled?: boolean; className?: string }) => (
    <button
        onClick={onClick}
        disabled={disabled}
        className={`inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:pointer-events-none disabled:opacity-50
        ${variant === 'outline' ? 'border border-gray-300 bg-transparent hover:bg-gray-100' : 'bg-black text-white hover:bg-gray-800'}
        ${className}`}
    >
        {children}
    </button>
);

const Table = ({ children }: { children: React.ReactNode }) => <table className="w-full text-sm">{children}</table>;
const TableHeader = ({ children }: { children: React.ReactNode }) => <thead className="bg-gray-50">{children}</thead>;
const TableRow = ({ children }: { children: React.ReactNode }) => <tr className="border-b hover:bg-gray-50">{children}</tr>;
const TableHead = ({ children }: { children: React.ReactNode }) => <th className="h-12 px-4 text-left font-medium text-gray-600">{children}</th>;
const TableBody = ({ children }: { children: React.ReactNode }) => <tbody>{children}</tbody>;
const TableCell = ({ children }: { children: React.ReactNode }) => <td className="p-4 align-middle">{children}</td>;

const SelectContext = React.createContext<{ value: any; onValueChange: (value: any) => void; open: boolean; setOpen: (open: boolean) => void; }>({ value: '', onValueChange: () => {}, open: false, setOpen: () => {} });
const Select = ({ value, onValueChange, children }: { value: any; onValueChange: (value: any) => void; children: React.ReactNode }) => {
    const [open, setOpen] = useState(false);
    return <SelectContext.Provider value={{ value, onValueChange, open, setOpen }}><div className="relative">{children}</div></SelectContext.Provider>;
};
const SelectTrigger = ({ children }: { children: React.ReactNode }) => {
    const { setOpen } = React.useContext(SelectContext);
    return <button onClick={() => setOpen(o => !o)} className="flex h-10 w-full items-center justify-between rounded-md border border-gray-300 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2">{children}</button>;
};
const SelectValue = ({ placeholder }: { placeholder: string }) => {
    const { value } = React.useContext(SelectContext);
    return <span>{value || placeholder}</span>;
};
const SelectContent = ({ children }: { children: React.ReactNode }) => {
    const { open } = React.useContext(SelectContext);
    if (!open) return null;
    return <div className="absolute z-10 mt-1 w-full rounded-md border bg-white shadow-lg">{children}</div>;
};
const SelectItem = ({ value, children }: { value: any; children: React.ReactNode }) => {
    const { onValueChange, setOpen } = React.useContext(SelectContext);
    return <div onClick={() => { onValueChange(value); setOpen(false); }} className="cursor-pointer p-2 hover:bg-gray-100">{children}</div>;
};

const Progress = ({ value }: { value: number }) => (
    <div className="relative h-4 w-full overflow-hidden rounded-full bg-gray-200">
        <div className="h-full w-full flex-1 bg-black transition-all" style={{ transform: `translateX(-${100 - (value || 0)}%)` }} />
    </div>
);

// Ícones SVG
const Upload = ({ className = '' }) => <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" x2="12" y1="3" y2="15" /></svg>;
const FileSpreadsheet = ({ className = '' }) => <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" /><path d="M14 2v4a2 2 0 0 0 2 2h4" /><path d="M8 11h8" /><path d="M8 15h8" /><path d="M11 19h2" /></svg>;
const CheckCircle = ({ className = '' }) => <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>;
const XCircle = ({ className = '' }) => <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" /></svg>;
const Loader2 = ({ className = '' }) => <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-6.219-8.56" /></svg>;

// --- Fim: Componentes de UI e utilitários ---

// Assume-se que 'supabase', 'Papa', 'XLSX' e 'dateFns' estão disponíveis globalmente (injetados pelo ambiente)
declare const supabase: any;
declare const Papa: any;
declare const XLSX: any;
declare const dateFns: any;


interface ImportadorVendasProps {
  onSuccess: () => void;
}

interface ParsedRow {
  data?: string; vendedora?: string; filial?: string; valor_bruto?: string; desconto?: string; qtd_itens?: string; atendimentos?: string;
  [key: string]: string | undefined;
}

interface MappedRow {
  data: string; vendedora_nome: string; filial_nome: string; valor_bruto_centavos: number; desconto_centavos: number; qtd_itens: number; atendimentos: number;
  valid: boolean; error?: string;
}

function ImportadorVendasComponent({ onSuccess }: ImportadorVendasProps) {
  const [parsedData, setParsedData] = useState<ParsedRow[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
  const [mappedData, setMappedData] = useState<MappedRow[]>([]);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importResult, setImportResult] = useState<{ success: number; errors: number } | null>(null);
  const toast = useToast();
  
  // Substituindo useDropzone por um input de arquivo simples para evitar dependência
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;
      processFile(file);
  };

  const processFile = (file: File) => {
      if (file.name.endsWith(".csv")) {
          parseCSV(file);
      } else {
          parseExcel(file);
      }
  };

  const handleDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (event.dataTransfer.files && event.dataTransfer.files[0]) {
      processFile(event.dataTransfer.files[0]);
    }
  }, []);

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      event.stopPropagation();
  };


  function parseCSV(file: File) {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      delimiter: ";",
      complete: (results: any) => {
        setHeaders(results.meta.fields || []);
        setParsedData(results.data as ParsedRow[]);
        toast({ title: `${results.data.length} linhas carregadas do CSV` });
      },
      error: (error: any) => {
        toast({ title: "Erro ao processar CSV", description: error.message, variant: "destructive" });
      },
    });
  }

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

  function normalizeToMonthStart(dateStr: string): string {
    try {
      if (!dateStr) return "";
      if (dateStr.includes("/")) {
        const parsed = dateFns.parse(dateStr, "dd/MM/yyyy", new Date());
        return dateFns.format(parsed, "yyyy-MM-01");
      }
      if (/^\d{4}-\d{2}(-\d{2})?$/.test(dateStr)) {
        const [y, m] = dateStr.slice(0, 7).split("-");
        return `${y}-${m}-01`;
      }
    } catch { /* cai no throw abaixo */ }
    throw new Error("Data inválida");
  }

  function validateAndMapData() {
    const requiredFields = ["data", "vendedora", "filial", "valor_bruto", "desconto", "qtd_itens"];
    const missing = requiredFields.filter((field) => !columnMapping[field]);

    if (missing.length > 0) {
      toast({ title: "Mapeamento incompleto", description: `Faltam mapear: ${missing.join(", ")}`, variant: "destructive" });
      return;
    }

    const mapped = parsedData.map((row) => {
      try {
        const dataStr = row[columnMapping.data]?.trim() || "";
        const valorBrutoStr = row[columnMapping.valor_bruto]?.replace(/[^\d,.-]/g, "").replace(",", ".") || "0";
        const descontoStr = row[columnMapping.desconto]?.replace(/[^\d,.-]/g, "").replace(",", ".") || "0";
        const qtdItensStr = row[columnMapping.qtd_itens]?.trim() || "1";
        const atendStr = columnMapping.atendimentos ? row[columnMapping.atendimentos!]?.trim() || "0" : "0";
        const dataFormatada = normalizeToMonthStart(dataStr);
        const valorBrutoCentavos = Math.round(parseFloat(valorBrutoStr) * 100);
        const descontoCentavos = Math.round(parseFloat(descontoStr) * 100);
        const qtdItens = parseInt(qtdItensStr, 10);
        const atend = parseInt(atendStr, 10);

        if (isNaN(valorBrutoCentavos) || valorBrutoCentavos < 0) throw new Error("Valor bruto inválido");
        if (isNaN(descontoCentavos) || descontoCentavos < 0) throw new Error("Desconto inválido");
        if (isNaN(qtdItens) || qtdItens < 1) throw new Error("Quantidade inválida");
        if (isNaN(atend) || atend < 0) throw new Error("Atendimentos inválido");

        return {
          data: dataFormatada, vendedora_nome: row[columnMapping.vendedora]?.trim() || "", filial_nome: row[columnMapping.filial]?.trim() || "",
          valor_bruto_centavos: valorBrutoCentavos, desconto_centavos: descontoCentavos, qtd_itens: qtdItens, atendimentos: atend, valid: true,
        };
      } catch (error) {
        return {
          data: "", vendedora_nome: "", filial_nome: "", valor_bruto_centavos: 0, desconto_centavos: 0, qtd_itens: 0, atendimentos: 0,
          valid: false, error: error instanceof Error ? error.message : "Erro desconhecido",
        };
      }
    });

    setMappedData(mapped);
    toast({ title: "Dados mapeados", description: `${mapped.filter((m) => m.valid).length} linhas válidas, ${mapped.filter((m) => !m.valid).length} com erros` });
  }

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

    const { data: vendedoras } = await supabase.from("pessoas_fisicas").select("id, nome_completo");
    const { data: filiais } = await supabase.from("filiais").select("id, nome");

    const vendedorasMap = new Map(vendedoras?.map((v: any) => [v.nome_completo.toLowerCase(), v.id]) || []);
    const filiaisMap = new Map(filiais?.map((f: any) => [f.nome.toLowerCase(), f.id]) || []);

    for (let i = 0; i < validRows.length; i++) {
      const row = validRows[i];
      const vendedoraId = vendedorasMap.get(row.vendedora_nome.toLowerCase());
      const filialId = filiaisMap.get(row.filial_nome.toLowerCase());

      if (!vendedoraId || !filialId) {
        errorCount++;
      } else {
        const { error } = await supabase.from("vendas_diarias").insert({
          data: row.data, vendedora_pf_id: vendedoraId, filial_id: filialId,
          valor_bruto_centavos: row.valor_bruto_centavos, desconto_centavos: row.desconto_centavos,
          valor_liquido_centavos: row.valor_bruto_centavos - row.desconto_centavos,
          qtd_itens: row.qtd_itens, atendimentos: row.atendimentos ?? 0,
        });
        if (error) errorCount++; else successCount++;
      }
      setImportProgress(Math.round(((i + 1) / validRows.length) * 100));
    }

    setImporting(false);
    setImportResult({ success: successCount, errors: errorCount });
    toast({ title: "Importação concluída", description: `${successCount} vendas importadas, ${errorCount} erros` });
    if (successCount > 0) onSuccess();
  }

  function reset() {
    setParsedData([]); setHeaders([]); setColumnMapping({}); setMappedData([]); setImportResult(null); setImportProgress(0);
  }

  if (importResult) {
    return (
      <Card>
        <CardHeader><CardTitle>Resultado da Importação</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2"><CheckCircle className="h-5 w-5 text-green-500" /> <span className="text-lg font-medium">{importResult.success} importadas</span></div>
            <div className="flex items-center gap-2"><XCircle className="h-5 w-5 text-red-500" /> <span className="text-lg font-medium">{importResult.errors} erros</span></div>
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
          <CardDescription>Revise os dados antes de importar ({mappedData.filter((m) => m.valid).length} válidas, {mappedData.filter((m) => !m.valid).length} com erro)</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {importing && (
            <div className="space-y-2">
              <Progress value={importProgress} />
              <p className="text-sm text-gray-500 text-center">Importando... {importProgress}%</p>
            </div>
          )}
          <div className="max-h-96 overflow-auto border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow><TableHead>Status</TableHead><TableHead>Data</TableHead><TableHead>Vendedora</TableHead><TableHead>Filial</TableHead><TableHead>Valor Bruto</TableHead><TableHead>Desconto</TableHead><TableHead>Itens</TableHead><TableHead>Atendimentos</TableHead></TableRow>
              </TableHeader>
              <TableBody>
                {mappedData.slice(0, 20).map((row, index) => (
                  <TableRow key={index}>
                    <TableCell>{row.valid ? <CheckCircle className="h-4 w-4 text-green-500" /> : <div title={row.error}><XCircle className="h-4 w-4 text-red-500" /></div>}</TableCell>
                    <TableCell>{row.data}</TableCell><TableCell>{row.vendedora_nome}</TableCell><TableCell>{row.filial_nome}</TableCell>
                    <TableCell>R$ {(row.valor_bruto_centavos / 100).toFixed(2)}</TableCell><TableCell>R$ {(row.desconto_centavos / 100).toFixed(2)}</TableCell>
                    <TableCell>{row.qtd_itens}</TableCell><TableCell>{row.atendimentos}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="flex gap-2">
            <Button onClick={importData} disabled={importing}>
              {importing ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Importando...</> : "Confirmar Importação"}
            </Button>
            <Button variant="outline" onClick={reset} disabled={importing}>Cancelar</Button>
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
            {["data", "vendedora", "filial", "valor_bruto", "desconto", "qtd_itens", "atendimentos"].map((field) => (
              <div key={field} className="space-y-2">
                <label className="text-sm font-medium capitalize">{field.replace("_", " ")}</label>
                <Select value={columnMapping[field]} onValueChange={(value) => handleColumnMapping(field, value)}>
                  <SelectTrigger><SelectValue placeholder={field === "atendimentos" ? "Opcional" : "Selecione a coluna"} /></SelectTrigger>
                  <SelectContent>{headers.map((header) => (<SelectItem key={header} value={header}>{header}</SelectItem>))}</SelectContent>
                </Select>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <Button onClick={validateAndMapData}>Validar e Continuar</Button>
            <Button variant="outline" onClick={reset}>Cancelar</Button>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Importar Vendas</CardTitle>
        <CardDescription>Faça upload de um arquivo CSV ou Excel com os dados das vendas</CardDescription>
      </CardHeader>
      <CardContent>
        <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".csv, .xlsx, .xls" className="hidden" />
        <div
          onClick={() => fileInputRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          className="border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors border-gray-300 hover:border-black"
        >
          <div className="space-y-4">
            <FileSpreadsheet className="mx-auto h-12 w-12 text-gray-400" />
            <div>
              <p className="text-lg font-medium">Arraste um arquivo CSV ou Excel aqui</p>
              <p className="text-sm text-gray-500">ou clique para selecionar</p>
            </div>
          </div>
        </div>
        <div className="mt-4 p-4 bg-gray-100 rounded-lg">
          <p className="text-sm font-medium mb-2">Formato esperado (mínimo):</p>
          <code className="text-xs bg-gray-200 p-1 rounded">Data;Vendedora;Filial;Valor Bruto;Desconto;Qtd Itens</code>
          <p className="text-sm mt-2">Opcional: <code className="text-xs bg-gray-200 p-1 rounded">Atendimentos</code> (para ticket médio).</p>
        </div>
      </CardContent>
    </Card>
  );
}


// Componente wrapper com o Provedor de Toast
export function ImportadorVendas(props: ImportadorVendasProps) {
    return (
        <ToastProvider>
            <ImportadorVendasComponent {...props} />
        </ToastProvider>
    )
}
