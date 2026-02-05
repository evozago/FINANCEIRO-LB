import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Plus, Trash2, GripVertical, ArrowDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface Condicao {
  id: string;
  tipo: 'contains' | 'exact' | 'startsWith' | 'notContains';
  termos: string[];
  operador: 'AND' | 'OR'; // Como se conecta com a próxima condição
  obrigatorio: boolean;
}

interface CondicoesEditorProps {
  condicoes: Condicao[];
  onChange: (condicoes: Condicao[]) => void;
}

const tiposCondicao = [
  { value: 'contains', label: 'Contém', desc: 'Qualquer um dos termos' },
  { value: 'exact', label: 'Exato', desc: 'Texto exatamente igual' },
  { value: 'startsWith', label: 'Começa com', desc: 'Inicia com o termo' },
  { value: 'notContains', label: 'NÃO contém', desc: 'Exclui se tiver' },
];

const gerarId = () => Math.random().toString(36).substring(2, 9);

export default function CondicoesEditor({ condicoes, onChange }: CondicoesEditorProps) {
  const adicionarCondicao = () => {
    const novaCondicao: Condicao = {
      id: gerarId(),
      tipo: 'contains',
      termos: [],
      operador: 'AND',
      obrigatorio: true,
    };
    onChange([...condicoes, novaCondicao]);
  };

  const removerCondicao = (id: string) => {
    onChange(condicoes.filter(c => c.id !== id));
  };

  const atualizarCondicao = (id: string, updates: Partial<Condicao>) => {
    onChange(condicoes.map(c => c.id === id ? { ...c, ...updates } : c));
  };

  const moverCondicao = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= condicoes.length) return;
    
    const newCondicoes = [...condicoes];
    [newCondicoes[index], newCondicoes[newIndex]] = [newCondicoes[newIndex], newCondicoes[index]];
    onChange(newCondicoes);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label>Condições (avaliadas na ordem)</Label>
        <Button type="button" size="sm" variant="outline" onClick={adicionarCondicao}>
          <Plus className="h-3.5 w-3.5 mr-1" />
          Adicionar Condição
        </Button>
      </div>

      {condicoes.length === 0 ? (
        <div className="text-center py-6 border-2 border-dashed rounded-lg text-muted-foreground">
          <p className="text-sm">Nenhuma condição adicionada</p>
          <p className="text-xs mt-1">Clique em "Adicionar Condição" para criar regras flexíveis</p>
        </div>
      ) : (
        <div className="space-y-2">
          {condicoes.map((condicao, index) => (
            <div key={condicao.id}>
              <div 
                className={cn(
                  "border rounded-lg p-3 space-y-3 bg-background",
                  condicao.obrigatorio ? "border-primary/50" : "border-muted",
                  condicao.tipo === 'notContains' && "border-destructive/50 bg-destructive/5"
                )}
              >
                {/* Header da condição */}
                <div className="flex items-center gap-2">
                  <GripVertical className="h-4 w-4 text-muted-foreground cursor-move" />
                  <Badge variant={condicao.obrigatorio ? "default" : "secondary"} className="text-xs">
                    {index + 1}º
                  </Badge>
                  <Badge variant={condicao.tipo === 'notContains' ? 'destructive' : 'outline'} className="text-xs">
                    {tiposCondicao.find(t => t.value === condicao.tipo)?.label}
                  </Badge>
                  <div className="flex-1" />
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Obrigatória</span>
                    <Switch
                      checked={condicao.obrigatorio}
                      onCheckedChange={(checked) => atualizarCondicao(condicao.id, { obrigatorio: checked })}
                    />
                  </div>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7"
                    onClick={() => removerCondicao(condicao.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </div>

                {/* Tipo e Termos */}
                <div className="grid grid-cols-[140px_1fr] gap-2">
                  <Select
                    value={condicao.tipo}
                    onValueChange={(v) => atualizarCondicao(condicao.id, { tipo: v as Condicao['tipo'] })}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {tiposCondicao.map(t => (
                        <SelectItem key={t.value} value={t.value}>
                          {t.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Input
                    placeholder="Termos separados por vírgula (ex: BIQUINI, MAIO, SUNQUINI)"
                    value={condicao.termos.join(', ')}
                    onChange={(e) => {
                      const termos = e.target.value.split(',').map(t => t.trim()).filter(Boolean);
                      atualizarCondicao(condicao.id, { termos });
                    }}
                    className="h-9"
                  />
                </div>

                {/* Descrição do tipo */}
                <p className="text-xs text-muted-foreground">
                  {tiposCondicao.find(t => t.value === condicao.tipo)?.desc}
                  {condicao.obrigatorio 
                    ? ' — Esta condição DEVE ser atendida' 
                    : ' — Condição opcional (bônus de pontuação)'
                  }
                </p>
              </div>

              {/* Conector para próxima condição */}
              {index < condicoes.length - 1 && (
                <div className="flex items-center justify-center py-1">
                  <div className="flex items-center gap-2 bg-muted rounded-full px-3 py-1">
                    <ArrowDown className="h-3 w-3 text-muted-foreground" />
                    <Select
                      value={condicao.operador}
                      onValueChange={(v) => atualizarCondicao(condicao.id, { operador: v as 'AND' | 'OR' })}
                    >
                      <SelectTrigger className="h-6 w-16 text-xs border-0 bg-transparent p-0 focus:ring-0">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="AND">E</SelectItem>
                        <SelectItem value="OR">OU</SelectItem>
                      </SelectContent>
                    </Select>
                    <ArrowDown className="h-3 w-3 text-muted-foreground" />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Legenda */}
      {condicoes.length > 0 && (
        <div className="text-xs text-muted-foreground space-y-1 pt-2 border-t">
          <p><strong>E (AND):</strong> Ambas as condições devem ser verdadeiras</p>
          <p><strong>OU (OR):</strong> Basta uma condição ser verdadeira</p>
          <p><strong>Obrigatória:</strong> Se falhar, a regra toda é descartada</p>
        </div>
      )}
    </div>
  );
}

// Função utilitária para converter condições legadas para o novo formato
export function converterRegraParaCondicoes(regra: {
  tipo: string;
  termos: string[];
  termos_exclusao?: string[];
}): Condicao[] {
  const condicoes: Condicao[] = [];

  // Condição principal de inclusão
  if (regra.termos.length > 0) {
    condicoes.push({
      id: gerarId(),
      tipo: regra.tipo as Condicao['tipo'],
      termos: regra.termos,
      operador: 'AND',
      obrigatorio: true,
    });
  }

  // Condição de exclusão (se existir)
  if (regra.termos_exclusao && regra.termos_exclusao.length > 0) {
    condicoes.push({
      id: gerarId(),
      tipo: 'notContains',
      termos: regra.termos_exclusao,
      operador: 'AND',
      obrigatorio: true,
    });
  }

  return condicoes;
}

// Função para validar condições compostas
export function validarCondicoes(
  textoNormalizado: string,
  condicoes: Condicao[],
  normalizarFn: (texto: string) => string
): { valido: boolean; pontuacaoBonus: number } {
  if (condicoes.length === 0) {
    return { valido: false, pontuacaoBonus: 0 };
  }

  let resultadoAtual = true;
  let pontuacaoBonus = 0;
  let operadorPendente: 'AND' | 'OR' = 'AND';

  for (let i = 0; i < condicoes.length; i++) {
    const condicao = condicoes[i];
    const termosNorm = condicao.termos.map(t => normalizarFn(t));
    
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
