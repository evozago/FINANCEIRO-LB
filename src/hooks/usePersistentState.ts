import { useState, useEffect, Dispatch, SetStateAction } from 'react';

/**
 * Hook personalizado para persistir estado no localStorage
 * @param key - Chave única para armazenar no localStorage
 * @param initialValue - Valor inicial do estado
 * @returns [state, setState] - Tupla com o estado e função para atualizá-lo
 */
export function usePersistentState<T>(
  key: string,
  initialValue: T
): [T, Dispatch<SetStateAction<T>>] {
  // Inicializar estado do localStorage ou usar valor inicial
  const [state, setState] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.warn(`Erro ao ler ${key} do localStorage:`, error);
      return initialValue;
    }
  });

  // Atualizar localStorage quando o estado mudar
  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(state));
    } catch (error) {
      console.warn(`Erro ao salvar ${key} no localStorage:`, error);
    }
  }, [key, state]);

  return [state, setState];
}

/**
 * Hook para persistir seleções (array de IDs)
 * @param key - Chave única para armazenar no localStorage
 * @returns [selectedIds, setSelectedIds, clearSelections]
 */
export function usePersistentSelection(key: string) {
  const [selectedIds, setSelectedIds] = usePersistentState<Set<number>>(
    key,
    new Set()
  );

  const clearSelections = () => setSelectedIds(new Set());

  const toggleSelection = (id: number) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  const selectAll = (ids: number[]) => {
    setSelectedIds(new Set(ids));
  };

  return {
    selectedIds,
    setSelectedIds,
    clearSelections,
    toggleSelection,
    selectAll,
  };
}
