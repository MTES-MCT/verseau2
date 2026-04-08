import { formatDate } from '@lib/shared';
import type { TransmissionASRetardSteuDto, TransmissionASRetardSclDto } from '@lib/dossier';
import type { ReactNode } from 'react';
import { Badge } from '@codegouvfr/react-dsfr/Badge';

export function buildTransmissionASRetardTableHeaders(): string[] {
  return [
    'Code Sandre',
    'Nom',
    "Tranche d'obligation (EH)",
    'Capacité nominale (EH)',
    'Nb fichiers AS reçus',
    'Date dernier fichier reçu',
    'Période début',
    'Période fin',
    'Date attendue',
    'Nb jours de retard',
  ];
}

function renderRetardBadge(nbJours: number | null): ReactNode {
  if (nbJours === null) {
    return '-';
  }
  const severity = nbJours > 30 ? 'error' : 'warning';
  return (
    <Badge severity={severity} small>
      {nbJours} j
    </Badge>
  );
}

export function buildTransmissionASRetardSteuTableRows(items: TransmissionASRetardSteuDto[]): ReactNode[][] {
  return items.map((item) => [
    item.codeSandre,
    item.nom ?? '-',
    item.trancheObligation ?? '-',
    item.capaciteNominale !== null ? String(item.capaciteNominale) : '-',
    item.nbFichiersAsRecus !== null ? String(item.nbFichiersAsRecus) : '-',
    item.dateDernierFichierRecu ? formatDate(item.dateDernierFichierRecu) : '-',
    item.dateDebutPeriode ? formatDate(item.dateDebutPeriode) : '-',
    item.dateFinPeriode ? formatDate(item.dateFinPeriode) : '-',
    item.dateMesureSuivanteAttendue ? formatDate(item.dateMesureSuivanteAttendue) : '-',
    renderRetardBadge(item.nbJoursRetard),
  ]);
}

export function buildTransmissionASRetardSclTableRows(items: TransmissionASRetardSclDto[]): ReactNode[][] {
  return items.map((item) => [
    item.codeSandre,
    item.nom ?? '-',
    item.trancheObligation ?? '-',
    item.capaciteNominale !== null ? String(item.capaciteNominale) : '-',
    item.nbFichiersAsRecus !== null ? String(item.nbFichiersAsRecus) : '-',
    item.dateDernierFichierRecu ? formatDate(item.dateDernierFichierRecu) : '-',
    item.dateDebutPeriode ? formatDate(item.dateDebutPeriode) : '-',
    item.dateFinPeriode ? formatDate(item.dateFinPeriode) : '-',
    item.dateMesureSuivanteAttendue ? formatDate(item.dateMesureSuivanteAttendue) : '-',
    renderRetardBadge(item.nbJoursRetard),
  ]);
}
