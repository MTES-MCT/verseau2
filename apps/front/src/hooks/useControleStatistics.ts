import { useMemo } from 'react';
import { EvenementType } from '@lib/dossier';
import type { ControleView } from '../types/controle.types';

export function useControleStatistics(controles: ControleView[], showSuccess: boolean) {
  return useMemo(() => {
    const result = controles.reduce(
      (acc, controle) => {
        if (controle.success) {
          acc.successCount++;
        } else if (controle.evenementType === EvenementType.ERREUR) {
          acc.errorCount++;
        } else if (controle.evenementType === EvenementType.AVERTISSEMENT) {
          acc.warningCount++;
        }

        if (showSuccess || !controle.success) {
          acc.filteredControles.push(controle);
        }

        return acc;
      },
      {
        successCount: 0,
        errorCount: 0,
        warningCount: 0,
        filteredControles: [] as ControleView[],
      },
    );

    return result;
  }, [controles, showSuccess]);
}
