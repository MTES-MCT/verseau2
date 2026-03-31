import { fr } from '@codegouvfr/react-dsfr';
import { Button } from '@codegouvfr/react-dsfr/Button';
import { useIsModalOpen } from '@codegouvfr/react-dsfr/Modal/useIsModalOpen';
import { Table } from '@codegouvfr/react-dsfr/Table';
import { useEffect } from 'react';
import type { ConformiteSclDetailDto, ConformiteSteuDetailDto } from '@lib/dossier';
import { useDetailBilanScl, useDetailBilanSteu } from '../../../hooks/useConformite';
import { conformiteDetailModal, type ConformiteDetailEntry } from './ConformiteDetailModal.shared';
import { LoadingState } from '../ConformiteDetailSkeleton';
import './ConformiteDetailModal.css';

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

const DETAIL_TABLE_ID = 'conformite-detail-modal-table';
const DETAIL_TABLE_HEADERS = ['Métrique', 'Nombre', 'Libellés'];
const DETAIL_TABLE_STYLE = {
  tableLayout: 'fixed' as const,
  width: '100%',
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
    /*
    {
      key: 'period',
      number: values.periodNumber,
      libelle: values.periodLabel,
      hideWhenLibelleMissing: hasLinkedLabels,
    },
    */
    {
      key: 'year',
      number: values.yearNumber,
      libelle: values.yearLabel,
      hideWhenLibelleMissing: hasLinkedLabels,
    },
  ];

  return [indicator, renderNumberValues(lines, suffix), renderLabelValues(lines)];
}

function renderDetailTable(data: React.ReactNode[][]) {
  return (
    <div className="conformite-detail-table-container">
      <Table
        id={DETAIL_TABLE_ID}
        headers={DETAIL_TABLE_HEADERS}
        data={data}
        noCaption
        fixed
        style={DETAIL_TABLE_STYLE}
      />
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
  const data = [
    createDetailRow('Paramètres conformes (local)', {
      periodNumber: null,
      yearNumber: detail.conformiteLocaleParametresConformesAnneeNb,
      periodLabel: null,
      yearLabel: detail.conformiteLocaleParametresConformesAnneeLb,
    }),
    createDetailRow('Paramètres conformes (national)', {
      periodNumber: null,
      yearNumber: detail.conformiteNationaleParametresConformesAnneeNb,
      periodLabel: null,
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

  return renderDetailTable(data);
}

function SclDetailTable({ detail }: { detail: ConformiteSclDetailDto }) {
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

  return renderDetailTable(data);
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

    const isLoading = mode === 'steu' ? steuQuery.isLoading : sclQuery.isLoading;
    const isError = mode === 'steu' ? steuQuery.isError : sclQuery.isError;
    const data = mode === 'steu' ? steuQuery.data : sclQuery.data;

    if (isLoading) {
      return <LoadingState mode={mode} renderDetailTable={renderDetailTable} />;
    }

    if (isError) {
      return <ErrorState />;
    }

    if (data === null || data === undefined) {
      return <EmptyState />;
    }

    return mode === 'steu' ? (
      <SteuDetailTable detail={data as ConformiteSteuDetailDto} />
    ) : (
      <SclDetailTable detail={data as ConformiteSclDetailDto} />
    );
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
