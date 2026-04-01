import type { AlertProps } from '@codegouvfr/react-dsfr/Alert';
import { Badge } from '@codegouvfr/react-dsfr/Badge';
import {
  ConformiteProvisoire,
  conformiteProvisoireLabel,
  type ConformiteSclDto,
  type ConformiteSteuDto,
} from '@lib/dossier';
import { formatDate } from '@lib/shared';
import type { ReactNode } from 'react';

const conformiteProvisoireSeverityMap: Record<ConformiteProvisoire, AlertProps.Severity | undefined> = {
  [ConformiteProvisoire.Conforme]: 'success',
  [ConformiteProvisoire.NonConforme]: 'error',
  [ConformiteProvisoire.Inconnue]: undefined,
  [ConformiteProvisoire.SansObjet]: 'info',
};

export function renderConformiteBadge(value: string | null): ReactNode {
  if (!value) {
    return <Badge small>-</Badge>;
  }

  const enumValue = Object.values(ConformiteProvisoire).includes(value as ConformiteProvisoire)
    ? (value as ConformiteProvisoire)
    : null;

  if (!enumValue) {
    return <Badge small>{value}</Badge>;
  }

  return (
    <Badge severity={conformiteProvisoireSeverityMap[enumValue]} small>
      {conformiteProvisoireLabel[enumValue]}
    </Badge>
  );
}

function renderImpactBadge(impactConformite: boolean): ReactNode {
  return (
    <Badge severity={impactConformite ? 'warning' : 'info'} small>
      {impactConformite ? 'Avec impact' : 'Sans impact'}
    </Badge>
  );
}

export function buildConformiteSteuTableHeaders(): string[] {
  return [
    'Code Sandre',
    'Nom',
    "Tranche d'obligation (EH)",
    'Capacité nominale (EH)',
    'Début période',
    'Fin période',
    'Conformité réglementaire',
    'Synthèse des changements',
  ];
}

export function buildConformiteSteuTableRows(steuList: ConformiteSteuDto[]): ReactNode[][] {
  return steuList.map((steu) => [
    steu.ouvrageDepollutionCode,
    steu.ouvrageDepollutionNom ?? '-',
    steu.trancheObligationLibelle ?? '-',
    steu.capaciteNominaleEH !== null ? String(steu.capaciteNominaleEH) : '-',
    formatDate(steu.suiviDebutDate),
    formatDate(steu.suiviFinDate),
    renderConformiteBadge(steu.conformiteLocaleProvisoire),
    renderImpactBadge(steu.impactConformite),
  ]);
}

export function buildConformiteSclTableHeaders(): string[] {
  return [
    'Code Sandre',
    'Nom',
    "Tranche d'obligation (EH)",
    'Type',
    'Début période',
    'Fin période',
    'Conformité réglementaire temps pluie',
    'Synthèse des changements',
  ];
}

export function buildConformiteSclTableRows(sclList: ConformiteSclDto[]): ReactNode[][] {
  return sclList.map((scl) => [
    scl.systemeCollecteCode,
    scl.systemeCollecteNom ?? '-',
    scl.trancheObligationLibelle ?? '-',
    scl.typeScl ?? '-',
    formatDate(scl.suiviDebutDate),
    formatDate(scl.suiviFinDate),
    renderConformiteBadge(scl.conformiteLocaleTempsPluieProvisoire),
    renderImpactBadge(scl.impactConformite),
  ]);
}
