import { fr } from '@codegouvfr/react-dsfr';
import { Button } from '@codegouvfr/react-dsfr/Button';
import { useIsModalOpen } from '@codegouvfr/react-dsfr/Modal/useIsModalOpen';
import { Table } from '@codegouvfr/react-dsfr/Table';
import { useEffect } from 'react';
import type { ConformiteSclDetailDto, ConformiteSteuDetailDto } from '@lib/dossier';
import { useDetailBilanScl, useDetailBilanSteu } from '../../hooks/useConformite';
import { conformiteDetailModal, type ConformiteDetailEntry } from './ConformiteDetailModal.shared';

type ConformiteDetailModalProps = {
  detail: ConformiteDetailEntry | null;
  isPreviousDisabled: boolean;
  isNextDisabled: boolean;
  onPrevious: () => void;
  onNext: () => void;
  onClose: () => void;
};

type DetailLine = {
  key: 'period' | 'year';
  number: number | null;
  libelle?: string | null;
  hideWhenLibelleMissing?: boolean;
};

function formatNumber(value: number | null, suffix = '') {
  if (value === null) {
    return '-';
  }

  return `${new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 }).format(value)}${suffix}`;
}

function hasDisplayableLabel(value: string | null | undefined) {
  return value !== null && value !== undefined && value !== '';
}

function getVisibleLines(lines: DetailLine[]) {
  return lines.filter((line) => !line.hideWhenLibelleMissing || hasDisplayableLabel(line.libelle));
}

function renderNumberValues(lines: DetailLine[], suffix = '') {
  const visibleLines = getVisibleLines(lines);

  if (visibleLines.length === 0) {
    return '-';
  }

  return (
    <div>
      {visibleLines.map((line) => (
        <div key={line.key}>{formatNumber(line.number, suffix)}</div>
      ))}
    </div>
  );
}

function renderLabelValues(lines: DetailLine[]) {
  const visibleLines = getVisibleLines(lines);

  if (visibleLines.length === 0) {
    return '-';
  }

  return (
    <div>
      {visibleLines.map((line) => (
        <div key={line.key}>{hasDisplayableLabel(line.libelle) ? line.libelle : '-'}</div>
      ))}
    </div>
  );
}

function createDetailRow(
  indicator: string,
  values: {
    periodNumber: number | null;
    yearNumber: number | null;
    periodLabel?: string | null;
    yearLabel?: string | null;
  },
  suffix = '',
) {
  const hasLinkedLabels = values.periodLabel !== undefined || values.yearLabel !== undefined;
  const lines: DetailLine[] = [
    {
      key: 'period',
      number: values.periodNumber,
      libelle: values.periodLabel,
      hideWhenLibelleMissing: hasLinkedLabels,
    },
    {
      key: 'year',
      number: values.yearNumber,
      libelle: values.yearLabel,
      hideWhenLibelleMissing: hasLinkedLabels,
    },
  ];

  return [indicator, renderNumberValues(lines, suffix), renderLabelValues(lines)];
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
  const headers = ['Métrique', 'Nombre', 'Libellés'];
  const data = [
    createDetailRow('Paramètres conformes (local)', {
      periodNumber: detail.conformiteLocaleParametresConformesPeriodeNb,
      yearNumber: detail.conformiteLocaleParametresConformesAnneeNb,
      periodLabel: detail.conformiteLocaleParametresConformesPeriodeLb,
      yearLabel: detail.conformiteLocaleParametresConformesAnneeLb,
    }),
    createDetailRow('Paramètres conformes (national)', {
      periodNumber: detail.conformiteNationaleParametresConformesPeriodeNb,
      yearNumber: detail.conformiteNationaleParametresConformesAnneeNb,
      periodLabel: detail.conformiteNationaleParametresConformesPeriodeLb,
      yearLabel: detail.conformiteNationaleParametresConformesAnneeLb,
    }),
    createDetailRow('Paramètres non conformes (local)', {
      periodNumber: detail.conformiteLocaleParametresNonConformesPeriodeNb,
      yearNumber: detail.conformiteLocaleParametresNonConformesAnneeNb,
      periodLabel: detail.conformiteLocaleParametresNonConformesPeriodeLb,
      yearLabel: detail.conformiteLocaleParametresNonConformesAnneeLb,
    }),
    createDetailRow('Paramètres non conformes (national)', {
      periodNumber: detail.conformiteNationaleParametresNonConformesPeriodeNb,
      yearNumber: detail.conformiteNationaleParametresNonConformesAnneeNb,
      periodLabel: detail.conformiteNationaleParametresNonConformesPeriodeLb,
      yearLabel: detail.conformiteNationaleParametresNonConformesAnneeLb,
    }),
    createDetailRow('Bilans avec données rédhibitoires (local)', {
      periodNumber: detail.conformiteLocaleRedhibitoiresPeriodeNb,
      yearNumber: detail.conformiteLocaleRedhibitoiresAnneeNb,
      periodLabel: detail.conformiteLocaleRedhibitoiresPeriodeLb,
      yearLabel: detail.conformiteLocaleRedhibitoiresAnneeLb,
    }),
    createDetailRow('Bilans avec données rédhibitoires (national)', {
      periodNumber: detail.conformiteNationaleRedhibitoiresPeriodeNb,
      yearNumber: detail.conformiteNationaleRedhibitoiresAnneeNb,
      periodLabel: detail.conformiteNationaleRedhibitoiresPeriodeLb,
      yearLabel: detail.conformiteNationaleRedhibitoiresAnneeLb,
    }),
    createDetailRow('Nombre de bilans HCNF', {
      periodNumber: detail.hcnfPeriodeNb,
      yearNumber: detail.hcnfAnneeNb,
      periodLabel: detail.hcnfPeriodeLb,
      yearLabel: detail.hcnfAnneeLb,
    }),
    createDetailRow('Nombre de bilans HCTS', {
      periodNumber: detail.hctsPeriodeNb,
      yearNumber: detail.hctsAnneeNb,
      periodLabel: detail.hctsPeriodeLb,
      yearLabel: detail.hctsAnneeLb,
    }),
    createDetailRow('Bilans avec événements', {
      periodNumber: detail.evenementsPeriodeNb,
      yearNumber: detail.evenementsAnneeNb,
    }),
  ];

  return <Table headers={headers} data={data} noCaption />;
}

function SclDetailTable({ detail }: { detail: ConformiteSclDetailDto }) {
  const headers = ['Métrique', 'Nombre', 'Libellés'];
  const data = [
    createDetailRow(
      '% volume déversé (m3) sur 5 ans',
      {
        periodNumber: detail.volumeDeversePeriodePc,
        yearNumber: detail.volumeDeverseAnneePc,
        periodLabel: detail.conformiteVolumePeriode,
        yearLabel: detail.conformiteVolumeAnnee,
      },
      ' %',
    ),
    createDetailRow(
      '% flux déversé (kg de DBO5) sur 5 ans',
      {
        periodNumber: detail.fluxDeversePeriodePc,
        yearNumber: detail.fluxDeverseAnneePc,
        periodLabel: detail.conformiteFluxPeriode,
        yearLabel: detail.conformiteFluxAnnee,
      },
      ' %',
    ),
    createDetailRow('Nb DO avec déversement >= 20j/an', {
      periodNumber: detail.joursDeversementPeriodeNb,
      yearNumber: detail.joursDeversementAnneeNb,
      periodLabel: detail.conformiteJoursDeversementPeriode,
      yearLabel: detail.conformiteJoursDeversementAnnee,
    }),
  ];

  return <Table headers={headers} data={data} noCaption />;
}

export function ConformiteDetailModal(props: ConformiteDetailModalProps) {
  const isModalOpen = useIsModalOpen(conformiteDetailModal, { onConceal: props.onClose });
  const { detail, isPreviousDisabled, isNextDisabled, onPrevious, onNext } = props;
  const mode = detail?.mode ?? 'steu';
  const year = detail?.year ?? new Date().getFullYear();
  const entityCode = detail?.entityCode ?? '';
  const entityName = detail?.entityName ?? '';
  const steuCdn = detail?.mode === 'steu' ? detail.steuCdn : 0;
  const sclCdn = detail?.mode === 'scl' ? detail.sclCdn : 0;

  const steuQuery = useDetailBilanSteu(steuCdn, year, detail?.mode === 'steu' && isModalOpen);
  const sclQuery = useDetailBilanScl(sclCdn, year, detail?.mode === 'scl' && isModalOpen);

  const title = mode === 'steu' ? 'Détail conformité STEU' : 'Détail conformité SCL';
  const subtitle =
    mode === 'steu'
      ? 'État des bilans depuis le dernier suivi effectué'
      : 'Détail sur la conformité locale temps pluie depuis le dernier suivi effectué';

  useEffect(() => {
    if (!isModalOpen) {
      return;
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'ArrowLeft' && !isPreviousDisabled) {
        event.preventDefault();
        onPrevious();
      }

      if (event.key === 'ArrowRight' && !isNextDisabled) {
        event.preventDefault();
        onNext();
      }
    }

    window.addEventListener('keydown', onKeyDown);

    return () => {
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [isModalOpen, isNextDisabled, isPreviousDisabled, onNext, onPrevious]);

  const content = (() => {
    if (!detail) {
      return <EmptyState />;
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
    <conformiteDetailModal.Component title={title} size="large" buttons={[{ children: 'Fermer' }]}>
      <div className={fr.cx('fr-grid-row', 'fr-grid-row--gutters', 'fr-mb-2w')}>
        <div className="fr-col-12">
          <p className={fr.cx('fr-text--sm', 'fr-text--bold', 'fr-mb-1v')}>{entityCode}</p>
          <p className="fr-text--sm fr-text--disabled-grey fr-mb-0">{entityName}</p>
          <p className={fr.cx('fr-text--sm', 'fr-mt-1w', 'fr-mb-0')}>{subtitle}</p>
        </div>

        <div className="fr-col-12">
          <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
            <div>
              <Button
                type="button"
                priority="tertiary no outline"
                iconId="fr-icon-arrow-left-s-line"
                disabled={isPreviousDisabled}
                onClick={onPrevious}
                title="Afficher le détail précédent"
                nativeButtonProps={{ 'aria-label': 'Afficher le détail précédent' }}
              >
                Précédent
              </Button>
            </div>
            <div>
              <Button
                type="button"
                priority="tertiary no outline"
                iconId="fr-icon-arrow-right-s-line"
                iconPosition="right"
                disabled={isNextDisabled}
                onClick={onNext}
                title="Afficher le détail suivant"
                nativeButtonProps={{ 'aria-label': 'Afficher le détail suivant' }}
              >
                Suivant
              </Button>
            </div>
          </div>
        </div>
      </div>

      {content}
    </conformiteDetailModal.Component>
  );
}

export default ConformiteDetailModal;
