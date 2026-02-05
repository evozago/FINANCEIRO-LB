import { supabase } from "@/integrations/supabase/client";

export type MarcaBasica = { id: number; nome: string };

const normalizarNomeMarca = (nome: string) => nome.trim().toUpperCase();

const chunk = <T,>(arr: T[], size: number) => {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) chunks.push(arr.slice(i, i + size));
  return chunks;
};

/**
 * Lista marcas do cadastro unificado.
 * Se o cadastro estiver incompleto, sincroniza automaticamente a partir das regras do Classificador
 * (campo_destino='marca'), criando registros em `marcas` quando necessário.
 */
export async function listarMarcasUnificadas(): Promise<MarcaBasica[]> {
  // 1) Marcas existentes (inclui inativas para evitar duplicidade)
  const { data: todasMarcas, error: marcasError } = await supabase
    .from("marcas")
    .select("id, nome, ativo")
    .order("nome");

  if (marcasError) throw marcasError;

  const chaveExistente = new Set(
    (todasMarcas || [])
      .map((m) => (m?.nome ? normalizarNomeMarca(m.nome) : ""))
      .filter(Boolean)
  );

  // 2) Marcas vindas do Classificador (regras)
  const { data: regras, error: regrasError } = await supabase
    .from("regras_classificacao")
    .select("valor_destino, ativo, campo_destino")
    .eq("campo_destino", "marca")
    // ativo pode ser NULL em registros antigos; tratamos NULL como ativo
    .or("ativo.is.null,ativo.eq.true");

  if (regrasError) throw regrasError;

  const nomesRegras: string[] = [];
  const seen = new Set<string>();

  for (const r of regras || []) {
    const raw = (r as any)?.valor_destino;
    if (typeof raw !== "string") continue;
    const nome = raw.trim();
    if (!nome) continue;

    const key = normalizarNomeMarca(nome);
    if (seen.has(key)) continue;
    seen.add(key);
    nomesRegras.push(nome);
  }

  // 3) Insere o que estiver faltando no cadastro unificado
  const faltantes = nomesRegras
    .filter((nome) => !chaveExistente.has(normalizarNomeMarca(nome)))
    .map((nome) => ({ nome, ativo: true }));

  if (faltantes.length > 0) {
    for (const lote of chunk(faltantes, 200)) {
      const { error: insertError } = await supabase.from("marcas").insert(lote);
      if (insertError) throw insertError;
    }
  }

  // 4) Retorna somente ativas (true ou null)
  const { data: marcasAtivas, error: ativasError } = await supabase
    .from("marcas")
    .select("id, nome, ativo")
    .or("ativo.is.null,ativo.eq.true")
    .order("nome");

  if (ativasError) throw ativasError;

  return (marcasAtivas || []).map((m) => ({ id: m.id, nome: m.nome }));
}
