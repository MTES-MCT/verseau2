import type { AlertProps } from '@codegouvfr/react-dsfr/Alert';
import { Badge } from '@codegouvfr/react-dsfr/Badge';
import type { ConformiteSclDto, ConformiteSteuDto } from '@lib/dossier';
import { formatDate } from '@lib/shared';
import type { ReactNode } from 'react';

function renderConformiteBadge(value: string | null): ReactNode {
  if (!value) {
    return <Badge small>-</Badge>;
  }

  let severity: AlertProps.Severity | undefined;

  if (value === 'C') {
    severity = 'success';
  } else if (value === 'NC') {
    severity = 'error';
  }

  return (
    <Badge severity={severity} small>
      {value}
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
    'Conformité nationale',
    'Conformité locale',
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
    renderConformiteBadge(steu.conformiteNationaleProvisoire),
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
    'Conformité locale temps pluie',
    'Conformité nationale temps pluie',
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
    renderConformiteBadge(scl.conformiteNationaleTempsPluieProvisoire),
    renderImpactBadge(scl.impactConformite),
  ]);
}
