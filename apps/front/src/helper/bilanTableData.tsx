import { formatDate } from '@lib/shared';
import {
  bilanSclPropertyToHeaderMapper,
  bilanSteuPropertyToHeaderMapper,
  type BilanSclDto,
  type BilanSteuDto,
} from '@lib/dossier';
import type { ReactNode } from 'react';
import { Badge } from '@codegouvfr/react-dsfr/Badge';

export type BilanTableHeaderDefinition = {
  property: string;
  label: string;
};

const BILAN_STEU_TABLE_HEADERS: BilanTableHeaderDefinition[] = bilanSteuPropertyToHeaderMapper.map(
  ({ property, header }) => ({
    property,
    label: header,
  }),
);

const BILAN_SCL_TABLE_HEADERS: BilanTableHeaderDefinition[] = bilanSclPropertyToHeaderMapper.map(
  ({ property, header }) => ({
    property,
    label: header,
  }),
);

export function buildBilanSteuTableHeaders(): BilanTableHeaderDefinition[] {
  return BILAN_STEU_TABLE_HEADERS;
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

export function buildBilanSclTableHeaders(): BilanTableHeaderDefinition[] {
  return BILAN_SCL_TABLE_HEADERS;
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
