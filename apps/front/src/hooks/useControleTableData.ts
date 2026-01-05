import { useMemo } from 'react';
import { EvenementType } from '@lib/dossier';
import type { ControleView } from '../types/controle.types';

type SingleControleRow = {
  isGroup: false;
  name: string;
  evenementType: EvenementType | undefined;
  message: string;
};

type GroupedControleRow = {
  isGroup: true;
  name: string;
  evenementType: EvenementType | undefined;
  message: string;
  groupData: {
    controls: ControleView[];
    errorCount: number;
    warningCount: number;
  };
};

export type TableDataRow = SingleControleRow | GroupedControleRow;

export function useControleTableData(groupedControles: Record<string, ControleView[]>): TableDataRow[] {
  return useMemo(() => {
    return Object.entries(groupedControles).flatMap(([name, group]) => {
      if (group.length === 1) {
        const c = group[0];
        return {
          name: c.name,
          evenementType: c.evenementType,
          message: c.message || '-',
          isGroup: false as const,
        };
      }

      const groupErrorCount = group.filter((c) => c.evenementType === EvenementType.ERREUR).length;
      const groupWarningCount = group.filter((c) => c.evenementType === EvenementType.AVERTISSEMENT).length;

      const groupEvenementType =
        groupErrorCount > 0 ? EvenementType.ERREUR : groupWarningCount > 0 ? EvenementType.AVERTISSEMENT : undefined;

      return {
        name,
        evenementType: groupEvenementType,
        message: `Détails (${group.length})`,
        isGroup: true as const,
        groupData: {
          controls: group,
          errorCount: groupErrorCount,
          warningCount: groupWarningCount,
        },
      };
    });
  }, [groupedControles]);
}
