import { useMemo } from 'react';
import type { ControleView } from '../types/controle.types';

export function useGroupedControles(controles: ControleView[]) {
  return useMemo(() => {
    return controles.reduce(
      (acc, controle) => {
        const name = controle.name || 'Inconnu';
        if (!acc[name]) {
          acc[name] = [];
        }
        acc[name].push(controle);
        return acc;
      },
      {} as Record<string, ControleView[]>,
    );
  }, [controles]);
}
