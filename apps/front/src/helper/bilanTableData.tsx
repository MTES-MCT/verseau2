import { formatDate } from '@lib/shared';
import type { BilanSclDto, BilanSteuDto } from '@lib/dossier';
import type { ReactNode } from 'react';
import { Badge } from '@codegouvfr/react-dsfr/Badge';

export function buildBilanSteuTableHeaders(): string[] {
  return ['Bilan écarté par le SPE (A)', 'Date', 'Paramètre', 'HCNF', 'Evt', 'Finalité'];
}

function renderBooleanBadge(value: boolean, trueLabel: string, falseLabel: string): ReactNode {
  return (
    <Badge severity={value ? 'warning' : 'info'} small>
      {value ? trueLabel : falseLabel}
    </Badge>
  );
}

export function buildBilanSteuTableRows(bilanList: BilanSteuDto[]): ReactNode[][] {
  return bilanList.map((bilan) => [
    renderBooleanBadge(bilan.bilanEcarteParSpe, 'Oui', 'Non'),
    formatDate(bilan.date),
    bilan.parametreNom ?? '-',
    bilan.hcnf ?? '-',
    bilan.evt ?? '-',
    bilan.finalite ?? '-',
  ]);
}

export function buildBilanSclTableHeaders(): string[] {
  return ['Nom', 'Point de mesure', 'Date', 'Volume déversé (m³)', 'Temps de déversement (h)', 'Statut (TP ou TS)'];
}

export function buildBilanSclTableRows(bilanList: BilanSclDto[]): ReactNode[][] {
  return bilanList.map((bilan) => [
    bilan.systemeCollecteNom ?? '-',
    bilan.pointMesureNumero ?? '-',
    formatDate(bilan.date),
    bilan.volumeDeverse !== null ? String(bilan.volumeDeverse) : '-',
    bilan.tempsDeversement !== null ? String(bilan.tempsDeversement) : '-',
    bilan.statut ?? '-',
  ]);
}
