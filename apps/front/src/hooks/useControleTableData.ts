import { useMemo } from 'react';
import { EvenementType } from '@lib/dossier';
import type { ControleView, ControleFilterSet } from '../types/controle.types';
import { filterControlesByActiveFilters } from '../helper/controleFilterHelper';

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
    successCount: number;
  };
};

export type TableDataRow = SingleControleRow | GroupedControleRow;

export function useControleTableData(
  groupedControles: Record<string, ControleView[]>,
  activeFilters: ControleFilterSet,
): TableDataRow[] {
  return useMemo(() => {
    return Object.entries(groupedControles).flatMap(([name, group]) => {
      const stats = getGroupStats(group);
      const filtered = filterControlesByActiveFilters(group, activeFilters);

      if (filtered.length === 0) {
        return [];
      }

      if (group.length === 1) {
        const controle = group[0];
        return {
          name: controle.name,
          evenementType: controle.evenementType,
          message: controle.message || '-',
          isGroup: false as const,
        };
      }

      const displayedItems = filtered;

      return {
        name,
        evenementType: getGroupStatus(stats.errorCount, stats.warningCount),
        message: getGroupMessage(displayedItems),
        isGroup: true as const,
        groupData: {
          controls: group,
          ...stats,
        },
      };
    });
  }, [groupedControles, activeFilters]);
}

function getGroupStats(group: ControleView[]) {
  return {
    errorCount: group.filter((controle) => controle.evenementType === EvenementType.ERREUR).length,
    warningCount: group.filter((controle) => controle.evenementType === EvenementType.AVERTISSEMENT).length,
    successCount: group.filter((controle) => controle.success).length,
  };
}

function getGroupStatus(errorCount: number, warningCount: number): EvenementType | undefined {
  if (errorCount > 0) {
    return EvenementType.ERREUR;
  }
  if (warningCount > 0) {
    return EvenementType.AVERTISSEMENT;
  }
  return undefined;
}

function getGroupMessage(items: ControleView[]): string {
  const stats = getGroupStats(items);
  const activeTypesCount = [stats.errorCount, stats.warningCount, stats.successCount].filter(
    (count) => count > 0,
  ).length;

  if (activeTypesCount > 1) {
    return `Voir les ${items.length} contrôles`;
  }

  if (stats.errorCount > 0) {
    return `Voir les ${stats.errorCount} erreur${stats.errorCount > 1 ? 's' : ''}`;
  }

  if (stats.warningCount > 0) {
    return `Voir les ${stats.warningCount} avertissement${stats.warningCount > 1 ? 's' : ''}`;
  }

  return `Voir les ${stats.successCount} succès`;
}
