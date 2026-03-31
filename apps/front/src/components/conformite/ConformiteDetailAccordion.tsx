import { fr } from '@codegouvfr/react-dsfr';
import { Accordion } from '@codegouvfr/react-dsfr/Accordion';
import { Table } from '@codegouvfr/react-dsfr/Table';
import type { ConformiteSclDetailDto, ConformiteSteuDetailDto } from '@lib/dossier';
import { useState } from 'react';
import { useDetailBilanScl, useDetailBilanSteu } from '../../hooks/useConformite';

type ConformiteDetailAccordionProps =
  | {
      mode: 'steu';
      year: number;
      steuCdn: number;
      sclCdn?: never;
    }
  | {
      mode: 'scl';
      year: number;
      sclCdn: number;
      steuCdn?: never;
    };

function formatNumber(value: number | null, suffix = '') {
  if (value === null) {
    return '-';
  }

  return `${new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 }).format(value)}${suffix}`;
}

function formatLabelOrNumber(label: string | null, value: number | null) {
  if (label) {
    return label;
  }

  return formatNumber(value);
}

function formatSclValue(value: number | null, conformite: string | null, suffix = '') {
  if (value === null && conformite === null) {
    return '-';
  }

  const parts = [] as string[];

  if (value !== null) {
    parts.push(formatNumber(value, suffix));
  }

  if (conformite) {
    parts.push(conformite);
  }

  return parts.join(' — ');
}

function LoadingState() {
  return (
    <div className={fr.cx('fr-py-2w')}>
      <p className={fr.cx('fr-text--sm', 'fr-mb-1w')}>Chargement...</p>
      <span className="fr-icon-loader-5-line fr-icon--lg" aria-hidden="true" />
    </div>
  );
}

function EmptyState() {
  return <p className={fr.cx('fr-mb-0')}>Aucune donnée</p>;
}

function ErrorState() {
  return <p className={fr.cx('fr-mb-0')}>Impossible de charger les données.</p>;
}

function SteuDetailTable({ detail }: { detail: ConformiteSteuDetailDto }) {
  const headers = ['Métrique', 'Période', 'Année'];
  const data = [
    [
      'Paramètres conformes (local)',
      formatLabelOrNumber(
        detail.conformiteLocaleParametresConformesPeriodeLb,
        detail.conformiteLocaleParametresConformesPeriodeNb,
      ),
      formatLabelOrNumber(
        detail.conformiteLocaleParametresConformesAnneeLb,
        detail.conformiteLocaleParametresConformesAnneeNb,
      ),
    ],
    [
      'Paramètres conformes (national)',
      formatLabelOrNumber(
        detail.conformiteNationaleParametresConformesPeriodeLb,
        detail.conformiteNationaleParametresConformesPeriodeNb,
      ),
      formatLabelOrNumber(
        detail.conformiteNationaleParametresConformesAnneeLb,
        detail.conformiteNationaleParametresConformesAnneeNb,
      ),
    ],
    [
      'Paramètres non conformes (local)',
      formatLabelOrNumber(
        detail.conformiteLocaleParametresNonConformesPeriodeLb,
        detail.conformiteLocaleParametresNonConformesPeriodeNb,
      ),
      formatLabelOrNumber(
        detail.conformiteLocaleParametresNonConformesAnneeLb,
        detail.conformiteLocaleParametresNonConformesAnneeNb,
      ),
    ],
    [
      'Paramètres non conformes (national)',
      formatLabelOrNumber(
        detail.conformiteNationaleParametresNonConformesPeriodeLb,
        detail.conformiteNationaleParametresNonConformesPeriodeNb,
      ),
      formatLabelOrNumber(
        detail.conformiteNationaleParametresNonConformesAnneeLb,
        detail.conformiteNationaleParametresNonConformesAnneeNb,
      ),
    ],
    [
      'Bilans avec données rédhibitoires (local)',
      formatLabelOrNumber(detail.conformiteLocaleRedhibitoiresPeriodeLb, detail.conformiteLocaleRedhibitoiresPeriodeNb),
      formatLabelOrNumber(detail.conformiteLocaleRedhibitoiresAnneeLb, detail.conformiteLocaleRedhibitoiresAnneeNb),
    ],
    [
      'Bilans avec données rédhibitoires (national)',
      formatLabelOrNumber(
        detail.conformiteNationaleRedhibitoiresPeriodeLb,
        detail.conformiteNationaleRedhibitoiresPeriodeNb,
      ),
      formatLabelOrNumber(
        detail.conformiteNationaleRedhibitoiresAnneeLb,
        detail.conformiteNationaleRedhibitoiresAnneeNb,
      ),
    ],
    [
      'Nombre de bilans HCNF',
      formatLabelOrNumber(detail.hcnfPeriodeLb, detail.hcnfPeriodeNb),
      formatLabelOrNumber(detail.hcnfAnneeLb, detail.hcnfAnneeNb),
    ],
    [
      'Nombre de bilans HCTS',
      formatLabelOrNumber(detail.hctsPeriodeLb, detail.hctsPeriodeNb),
      formatLabelOrNumber(detail.hctsAnneeLb, detail.hctsAnneeNb),
    ],
    ['Bilans avec événements', formatNumber(detail.evenementsPeriodeNb), formatNumber(detail.evenementsAnneeNb)],
  ];

  return <Table headers={headers} data={data} noCaption />;
}

function SclDetailTable({ detail }: { detail: ConformiteSclDetailDto }) {
  const headers = ['Indicateur', 'Période', 'Année'];
  const data = [
    [
      '% volume déversé (m3) sur 5 ans',
      formatSclValue(detail.volumeDeversePeriodePc, detail.conformiteVolumePeriode, ' %'),
      formatSclValue(detail.volumeDeverseAnneePc, detail.conformiteVolumeAnnee, ' %'),
    ],
    [
      '% flux déversé (kg de DBO5) sur 5 ans',
      formatSclValue(detail.fluxDeversePeriodePc, detail.conformiteFluxPeriode, ' %'),
      formatSclValue(detail.fluxDeverseAnneePc, detail.conformiteFluxAnnee, ' %'),
    ],
    [
      'Nb DO avec déversement >= 20j/an',
      formatSclValue(detail.joursDeversementPeriodeNb, detail.conformiteJoursDeversementPeriode),
      formatSclValue(detail.joursDeversementAnneeNb, detail.conformiteJoursDeversementAnnee),
    ],
  ];

  return <Table headers={headers} data={data} noCaption />;
}

export function ConformiteDetailAccordion(props: ConformiteDetailAccordionProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { mode, year } = props;
  const steuCdn = mode === 'steu' ? props.steuCdn : 0;
  const sclCdn = mode === 'scl' ? props.sclCdn : 0;

  const steuQuery = useDetailBilanSteu(steuCdn, year, mode === 'steu' && isOpen);
  const sclQuery = useDetailBilanScl(sclCdn, year, mode === 'scl' && isOpen);

  const title =
    mode === 'steu'
      ? 'État des bilans depuis le dernier suivi effectué'
      : 'Détail sur la conformité locale temps pluie depuis le dernier suivi effectué';

  const content = (() => {
    if (!isOpen) {
      return null;
    }

    if (mode === 'steu') {
      if (steuQuery.isLoading) {
        return <LoadingState />;
      }

      if (steuQuery.isError) {
        return <ErrorState />;
      }

      if (steuQuery.data === null || steuQuery.data === undefined) {
        return <EmptyState />;
      }

      return <SteuDetailTable detail={steuQuery.data} />;
    }

    if (sclQuery.isLoading) {
      return <LoadingState />;
    }

    if (sclQuery.isError) {
      return <ErrorState />;
    }

    if (sclQuery.data === null || sclQuery.data === undefined) {
      return <EmptyState />;
    }

    return <SclDetailTable detail={sclQuery.data} />;
  })();

  return (
    <Accordion expanded={isOpen} onExpandedChange={setIsOpen} label={title} titleAs="h3" className={fr.cx('fr-mb-2w')}>
      {content ?? <div />}
    </Accordion>
  );
}

export default ConformiteDetailAccordion;
