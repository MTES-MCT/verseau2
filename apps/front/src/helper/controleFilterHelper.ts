import { EvenementType, type MasaDto, MasaStatus } from '@lib/dossier';
import type { ControleFilterSet, ControleFilterType, ControleSandreView, ControleView } from '../types/controle.types';

type ControleStatistics = {
  successCount: number;
  warningCount: number;
  errorCount: number;
  informationCount: number;
};

export const defaultActiveControleFilters: ControleFilterType[] = ['warning', 'error', 'information'];

export function matchesControleFilters(
  controle: Pick<ControleView, 'success' | 'evenementType'>,
  activeFilters: ControleFilterSet,
): boolean {
  if (activeFilters.size === 0) {
    return true;
  }

  if (controle.success) {
    return activeFilters.has('success');
  }

  if (controle.evenementType === EvenementType.AVERTISSEMENT) {
    return activeFilters.has('warning');
  }

  if (controle.evenementType === EvenementType.ERREUR) {
    return activeFilters.has('error');
  }

  if (controle.evenementType === EvenementType.INFORMATION) {
    return activeFilters.has('information');
  }

  return false;
}

export function filterControlesByActiveFilters(
  controles: ControleView[],
  activeFilters: ControleFilterSet,
): ControleView[] {
  return controles.filter((controle) => matchesControleFilters(controle, activeFilters));
}

export function matchesSandreFilters(
  controle: Pick<ControleSandreView, 'success'>,
  activeFilters: ControleFilterSet,
): boolean {
  if (activeFilters.size === 0) {
    return true;
  }

  if (controle.success) {
    return activeFilters.has('success');
  }

  return activeFilters.has('error');
}

export function filterSandreControlesByActiveFilters(
  controles: ControleSandreView[],
  activeFilters: ControleFilterSet,
): ControleSandreView[] {
  return controles.filter((controle) => matchesSandreFilters(controle, activeFilters));
}

export function getSandreStatistics(controles: ControleSandreView[]): ControleStatistics {
  return controles.reduce(
    (statistics, controle) => {
      if (controle.success) {
        statistics.successCount++;
      } else {
        statistics.errorCount++;
      }

      return statistics;
    },
    {
      successCount: 0,
      warningCount: 0,
      errorCount: 0,
      informationCount: 0,
    },
  );
}

export function matchesMasaFilters(masa: MasaDto | null, activeFilters: ControleFilterSet): boolean {
  if (!masa) {
    return false;
  }

  if (activeFilters.size === 0) {
    return true;
  }

  return activeFilters.has(getMasaFilterType(masa));
}

export function getMasaStatistics(masa: MasaDto | null): ControleStatistics {
  if (!masa) {
    return {
      successCount: 0,
      warningCount: 0,
      errorCount: 0,
      informationCount: 0,
    };
  }

  const filterType = getMasaFilterType(masa);

  if (filterType === 'success') {
    return {
      successCount: 1,
      warningCount: 0,
      errorCount: 0,
      informationCount: 0,
    };
  }

  if (filterType === 'warning') {
    return {
      successCount: 0,
      warningCount: 1,
      errorCount: 0,
      informationCount: 0,
    };
  }

  return {
    successCount: 0,
    warningCount: 0,
    errorCount: 1,
    informationCount: 0,
  };
}

function getMasaFilterType(masa: MasaDto): ControleFilterType {
  switch (masa.statut) {
    case MasaStatus.INTEGRE:
      return 'success';
    case MasaStatus.INTEGRATION_PARTIELLE:
      return 'warning';
    case MasaStatus.REFUSE:
      return 'error';
  }
}
