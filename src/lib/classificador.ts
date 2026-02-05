// Engine de classificação de produtos por regras

// Interface para condições compostas
export interface CondicaoComposta {
  id: string;
  tipo: 'contains' | 'exact' | 'startsWith' | 'notContains';
  termos: string[];
  operador: 'AND' | 'OR'; // Como se conecta com a próxima condição
  obrigatorio: boolean;
}

// Tipo flexível para compatibilidade com Supabase Json
export type CondicoesJson = CondicaoComposta[] | Record<string, unknown> | null;

export interface RegraClassificacao {
  id: number;
  nome: string;
  tipo: 'contains' | 'exact' | 'startsWith' | 'containsAll' | 'notContains';
  termos: string[];
  termos_exclusao?: string[]; // Termos que NÃO podem estar presentes
  campo_destino: string;
  valor_destino: string;
  categoria_id: number | null;
  pontuacao: number;
  genero_automatico: string | null;
  ativo: boolean;
  ordem: number;
  campos_pesquisa?: string[]; // Campos onde pesquisar: nome, variacao_1, variacao_2, codigo
  condicoes?: CondicoesJson; // Condições compostas (opcional)
}

export interface AtributoCustomizado {
  id: number;
  nome: string;
  tipo: 'lista' | 'regras';
  valores: string[] | null;
  configuracao: Record<string, unknown>;
  ativo: boolean;
}

export interface ResultadoClassificacao {
  categoria: string | null;
  categoria_id: number | null;
  subcategoria: string | null;
  genero: string | null;
  faixa_etaria: string | null;
  marca: string | null;
  tamanho: string | null;
  cor: string | null;
  material: string | null;
  estilo: string | null;
  atributos_extras: Record<string, string>;
  confianca: number;
  regras_aplicadas: string[];
}

// Campos disponíveis para pesquisa
export const CAMPOS_PESQUISA_DISPONIVEIS = [
  { value: 'nome', label: 'Nome do Produto' },
  { value: 'variacao_1', label: 'Variação 1 (Cor)' },
  { value: 'variacao_2', label: 'Variação 2 (Tamanho)' },
  { value: 'codigo', label: 'Código/Referência' },
];

// Normaliza texto para comparação (remove acentos, uppercase)
export function normalizarTexto(texto: string): string {
  return texto
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Obtém o texto combinado dos campos selecionados para pesquisa
export function obterTextoPesquisa(
  produto: { nome: string; variacao_1?: string | null; variacao_2?: string | null; codigo?: string | null },
  camposPesquisa: string[]
): string {
  const campos = camposPesquisa.length > 0 ? camposPesquisa : ['nome'];
  
  const textos: string[] = [];
  
  for (const campo of campos) {
    switch (campo) {
      case 'nome':
        if (produto.nome) textos.push(produto.nome);
        break;
      case 'variacao_1':
        if (produto.variacao_1) textos.push(produto.variacao_1);
        break;
      case 'variacao_2':
        if (produto.variacao_2) textos.push(produto.variacao_2);
        break;
      case 'codigo':
        if (produto.codigo) textos.push(produto.codigo);
        break;
    }
  }
  
  return textos.join(' ');
}

// Verifica se as condições compostas são válidas
function isCondicoesValidas(condicoes: unknown): condicoes is CondicaoComposta[] {
  return Array.isArray(condicoes) && condicoes.length > 0 && 
    condicoes.every(c => c && typeof c === 'object' && 'tipo' in c && 'termos' in c);
}

// Valida condições compostas
function validarCondicoesCompostas(
  textoNormalizado: string,
  condicoes: CondicaoComposta[]
): { valido: boolean; pontuacaoBonus: number } {
  if (condicoes.length === 0) {
    return { valido: false, pontuacaoBonus: 0 };
  }

  let resultadoAtual = true;
  let pontuacaoBonus = 0;
  let operadorPendente: 'AND' | 'OR' = 'AND';

  for (let i = 0; i < condicoes.length; i++) {
    const condicao = condicoes[i];
    const termosNorm = condicao.termos.map(t => normalizarTexto(t));
    
    let match = false;

    switch (condicao.tipo) {
      case 'exact':
        match = termosNorm.some(t => textoNormalizado === t);
        break;
      case 'startsWith':
        match = termosNorm.some(t => textoNormalizado.startsWith(t));
        break;
      case 'contains':
        match = termosNorm.some(t => textoNormalizado.includes(t));
        break;
      case 'notContains':
        match = !termosNorm.some(t => textoNormalizado.includes(t));
        break;
    }

    // Se é obrigatória e falhou, regra inteira falha
    if (condicao.obrigatorio && !match) {
      return { valido: false, pontuacaoBonus: 0 };
    }

    // Calcula resultado com operador
    if (i === 0) {
      resultadoAtual = match;
    } else {
      if (operadorPendente === 'AND') {
        resultadoAtual = resultadoAtual && match;
      } else {
        resultadoAtual = resultadoAtual || match;
      }
    }

    // Bônus por condição opcional atendida
    if (!condicao.obrigatorio && match) {
      pontuacaoBonus += 25;
    }

    // Atualiza operador para próxima iteração
    operadorPendente = condicao.operador;
  }

  return { valido: resultadoAtual, pontuacaoBonus };
}

// Verifica se uma regra aplica ao produto (suporta condições compostas)
function verificarRegra(
  textoNormalizado: string, 
  regra: RegraClassificacao
): { match: boolean; bonusCondicoes: number } {
  // Se tem condições compostas, usa o novo sistema
  if (regra.condicoes && isCondicoesValidas(regra.condicoes)) {
    const resultado = validarCondicoesCompostas(textoNormalizado, regra.condicoes);
    return { match: resultado.valido, bonusCondicoes: resultado.pontuacaoBonus };
  }

  // Caso contrário, usa a lógica legada
  const termosNormalizados = regra.termos.map(t => normalizarTexto(t));
  
  // Primeiro verifica os termos de exclusão (se existirem)
  const termosExclusaoNorm = (regra.termos_exclusao || []).map(t => normalizarTexto(t));
  if (termosExclusaoNorm.length > 0) {
    // Se qualquer termo de exclusão estiver presente, a regra NÃO aplica
    const temExclusao = termosExclusaoNorm.some(termo => textoNormalizado.includes(termo));
    if (temExclusao) {
      return { match: false, bonusCondicoes: 0 };
    }
  }

  // Depois verifica os termos de inclusão
  let match = false;
  switch (regra.tipo) {
    case 'exact':
      match = termosNormalizados.some(termo => textoNormalizado === termo);
      break;
    case 'startsWith':
      match = termosNormalizados.some(termo => textoNormalizado.startsWith(termo));
      break;
    case 'contains':
      match = termosNormalizados.some(termo => textoNormalizado.includes(termo));
      break;
    case 'containsAll':
      match = termosNormalizados.every(termo => textoNormalizado.includes(termo));
      break;
    case 'notContains':
      match = !termosNormalizados.some(termo => textoNormalizado.includes(termo));
      break;
    default:
      match = false;
  }

  return { match, bonusCondicoes: 0 };
}

// Calcula pontuação baseada no tipo de regra
function calcularPontuacao(regra: RegraClassificacao): number {
  const base = regra.pontuacao;
  
  // Bônus por especificidade
  switch (regra.tipo) {
    case 'exact':
      return base + 900; // Máxima precisão
    case 'startsWith':
      return base + 700;
    case 'containsAll':
      return base + 500 + (regra.termos.length * 50); // Bônus por cada termo
    case 'contains':
      return base;
    case 'notContains':
      return base - 50; // Regras de exclusão têm menos peso
    default:
      return base;
  }
}

// Extrai atributos de uma lista (cores, tamanhos, etc.)
function extrairDeLista(nomeNormalizado: string, valores: string[]): string | null {
  for (const valor of valores) {
    const valorNorm = normalizarTexto(valor);
    // Busca como palavra completa para evitar falsos positivos
    const regex = new RegExp(`\\b${valorNorm}\\b`);
    if (regex.test(nomeNormalizado)) {
      return valor;
    }
  }
  return null;
}

// Interface do produto com campos opcionais para classificação
export interface ProdutoParaClassificar {
  id?: number;
  nome: string;
  variacao_1?: string | null;
  variacao_2?: string | null;
  codigo?: string | null;
  [key: string]: unknown;
}

// Classifica um produto baseado nas regras
export function classificarProduto(
  produto: ProdutoParaClassificar,
  regras: RegraClassificacao[],
  atributos: AtributoCustomizado[]
): ResultadoClassificacao {
  const resultado: ResultadoClassificacao = {
    categoria: null,
    categoria_id: null,
    subcategoria: null,
    genero: null,
    faixa_etaria: null,
    marca: null,
    tamanho: null,
    cor: null,
    material: null,
    estilo: null,
    atributos_extras: {},
    confianca: 0,
    regras_aplicadas: []
  };

  // Agrupa pontuações por campo
  const pontuacoes: Record<string, { valor: string; pontos: number; regra: string; categoria_id?: number | null; genero_auto?: string | null }[]> = {};

  // Aplica regras ordenadas
  const regrasAtivas = regras
    .filter(r => r.ativo)
    .sort((a, b) => a.ordem - b.ordem);

  for (const regra of regrasAtivas) {
    // Obtém o texto de pesquisa baseado nos campos configurados na regra
    const textoPesquisa = obterTextoPesquisa(produto, regra.campos_pesquisa || ['nome']);
    const textoNormalizado = normalizarTexto(textoPesquisa);
    
    const { match, bonusCondicoes } = verificarRegra(textoNormalizado, regra);
    
    if (match) {
      const campo = regra.campo_destino;
      const pontos = calcularPontuacao(regra) + bonusCondicoes;

      if (!pontuacoes[campo]) {
        pontuacoes[campo] = [];
      }

      pontuacoes[campo].push({
        valor: regra.valor_destino,
        pontos,
        regra: regra.nome,
        categoria_id: regra.categoria_id,
        genero_auto: regra.genero_automatico
      });
    }
  }

  // Seleciona o melhor match para cada campo
  let pontosTotal = 0;
  let camposPreenchidos = 0;

  for (const [campo, matches] of Object.entries(pontuacoes)) {
    if (matches.length === 0) continue;

    // Pega o match com maior pontuação
    const melhor = matches.reduce((a, b) => a.pontos > b.pontos ? a : b);
    pontosTotal += melhor.pontos;
    camposPreenchidos++;
    resultado.regras_aplicadas.push(melhor.regra);

    switch (campo) {
      case 'categoria':
        resultado.categoria = melhor.valor;
        resultado.categoria_id = melhor.categoria_id || null;
        // Aplica gênero automático se definido
        if (melhor.genero_auto && !resultado.genero) {
          resultado.genero = melhor.genero_auto;
        }
        break;
      case 'subcategoria':
        resultado.subcategoria = melhor.valor;
        break;
      case 'genero':
        resultado.genero = melhor.valor;
        break;
      case 'faixa_etaria':
        resultado.faixa_etaria = melhor.valor;
        break;
      case 'marca':
        resultado.marca = melhor.valor;
        break;
      case 'estilo':
        resultado.estilo = melhor.valor;
        break;
      default:
        resultado.atributos_extras[campo] = melhor.valor;
    }
  }

  // Texto normalizado para extração de atributos (usando nome + variações)
  const textoCompleto = normalizarTexto(
    [produto.nome, produto.variacao_1, produto.variacao_2].filter(Boolean).join(' ')
  );

  // Extrai atributos customizados do tipo lista
  for (const atributo of atributos.filter(a => a.ativo && a.tipo === 'lista')) {
    const valores = atributo.valores || [];
    const encontrado = extrairDeLista(textoCompleto, valores);
    
    if (encontrado) {
      const nomeAtrib = atributo.nome.toLowerCase();
      
      switch (nomeAtrib) {
        case 'cores':
          if (!resultado.cor) resultado.cor = encontrado;
          break;
        case 'tamanhos':
          if (!resultado.tamanho) resultado.tamanho = encontrado;
          break;
        case 'materiais':
          if (!resultado.material) resultado.material = encontrado;
          break;
        default:
          if (!resultado.atributos_extras[nomeAtrib]) {
            resultado.atributos_extras[nomeAtrib] = encontrado;
          }
      }
      camposPreenchidos++;
    }
  }

  // Calcula índice de confiança (0-100)
  // Baseado em quantos campos foram preenchidos e pontuação total
  const maxCampos = 10; // categoria, subcategoria, genero, faixa_etaria, marca, tamanho, cor, material, estilo + 1
  const percentCampos = Math.min(camposPreenchidos / maxCampos, 1);
  const percentPontos = Math.min(pontosTotal / 1000, 1);
  
  resultado.confianca = Math.round((percentCampos * 60 + percentPontos * 40));

  return resultado;
}

// Classifica múltiplos produtos (backwards compatible)
export function classificarLote(
  produtos: ProdutoParaClassificar[],
  regras: RegraClassificacao[],
  atributos: AtributoCustomizado[]
): { produto: ProdutoParaClassificar; resultado: ResultadoClassificacao }[] {
  return produtos.map(produto => ({
    produto,
    resultado: classificarProduto(produto, regras, atributos)
  }));
}
