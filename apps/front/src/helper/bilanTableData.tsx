import { formatDate } from '@lib/shared';
import type { BilanSclDto, BilanSteuDto } from '@lib/dossier';
import type { ReactNode } from 'react';
import { Badge } from '@codegouvfr/react-dsfr/Badge';

export function buildBilanSteuTableHeaders(): string[] {
  return [
    'Code Sandre',
    'Date de mise en service',
    'Exploitant / MOA',
    'SIRET établissement',
    'Bilan écarté par le SPE (A)',
    'Date',
    'Paramètre',
    'HCNF',
    'Evt',
    'Finalité',
  ];
}

function renderBooleanBadge(value: boolean, trueLabel: string, falseLabel: string): ReactNode {
  return (
    <Badge severity={value ? 'warning' : 'info'} small>
      {value ? trueLabel : falseLabel}
    </Badge>
  );
}

function formatDistinctValues(primaryValue: string | null, secondaryValue: string | null): string {
  const primary = primaryValue?.trim() || null;
  const secondary = secondaryValue?.trim() || null;

  if (primary && secondary) {
    if (primary === secondary) {
      return primary;
    }

    return `${primary} / ${secondary}`;
  }

  if (primary) {
    return primary;
  }

  if (secondary) {
    return secondary;
  }

  return '-';
}

export function buildBilanSteuTableRows(bilanList: BilanSteuDto[]): ReactNode[][] {
  return bilanList.map((bilan) => [
    bilan.ouvrageDepollutionCode,
    formatDate(bilan.dateMiseEnService),
    formatDistinctValues(bilan.exploitantNom, bilan.moaNom),
    formatDistinctValues(bilan.exploitantSiret, bilan.moaSiret),
    renderBooleanBadge(bilan.bilanEcarteParSpe, 'Oui', 'Non'),
    formatDate(bilan.date),
    bilan.parametreNom ?? '-',
    bilan.hcnf ?? '-',
    bilan.evt ?? '-',
    bilan.finalite ?? '-',
  ]);
}

export function buildBilanSclTableHeaders(): string[] {
  return [
    'Code Sandre',
    'Nom',
    'Point de mesure',
    'Date',
    'Volume déversé (m³)',
    'Temps de déversement (h)',
    'Statut (TP ou TS)',
  ];
}

export function buildBilanSclTableRows(bilanList: BilanSclDto[]): ReactNode[][] {
  return bilanList.map((bilan) => [
    bilan.systemeCollecteCode,
    bilan.systemeCollecteNom ?? '-',
    bilan.pointMesureNumero ?? '-',
    formatDate(bilan.date),
    bilan.volumeDeverse !== null ? String(bilan.volumeDeverse) : '-',
    bilan.tempsDeversement !== null ? String(bilan.tempsDeversement) : '-',
    bilan.statut ?? '-',
  ]);
}
