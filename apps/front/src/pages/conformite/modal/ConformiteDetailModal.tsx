import { fr } from '@codegouvfr/react-dsfr';
import { Button } from '@codegouvfr/react-dsfr/Button';
import Notice from '@codegouvfr/react-dsfr/Notice';
import { useIsModalOpen } from '@codegouvfr/react-dsfr/Modal/useIsModalOpen';
import { Table } from '@codegouvfr/react-dsfr/Table';
import { useEffect, useState, type ReactNode } from 'react';
import type { ConformiteSclDetailDto, ConformiteSteuDetailDto } from '@lib/dossier';
import { useDetailBilanScl, useDetailBilanSteu } from '../../../hooks/useConformite';
import { renderConformiteBadge } from '../../../helper/conformiteTableData';
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

type DetailValue = {
  number: number | null;
  libelle?: string | null;
};

type DetailRow = {
  indicator: string;
  currentContent: ReactNode;
  previousContent: ReactNode;
  currentText: string;
  previousText: string;
};

const DETAIL_TABLE_ID = 'conformite-detail-modal-table';
const DETAIL_TABLE_HEADERS = ['Métrique', 'Actuel', 'Avant'];
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

function isDetailValueEmpty(value: DetailValue) {
  return value.number === null && !hasDisplayableLabel(value.libelle);
}

function renderDetailValue(value: DetailValue, suffix = '') {
  if (isDetailValueEmpty(value)) {
    return '-';
  }

  return (
    <div className="conformite-detail-value-cell">
      <span className={fr.cx('fr-text--bold')}>{formatNumber(value.number, suffix)}</span>
      <span className={fr.cx('fr-text--sm')} style={{ color: 'var(--text-mention-grey)' }}>
        {hasDisplayableLabel(value.libelle) ? value.libelle : '-'}
      </span>
    </div>
  );
}

function getDetailValueText(value: DetailValue, suffix = '') {
  if (isDetailValueEmpty(value)) {
    return '-';
  }

  const formattedNumber = formatNumber(value.number, suffix);

  return hasDisplayableLabel(value.libelle) ? `${formattedNumber} - ${value.libelle}` : formattedNumber;
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
): DetailRow {
  const currentValue: DetailValue = {
    number: values.periodNumber,
    libelle: values.periodLabel,
  };
  const previousValue: DetailValue = {
    number: values.yearNumber,
    libelle: values.yearLabel,
  };

  return {
    indicator,
    currentContent: renderDetailValue(currentValue, suffix),
    previousContent: renderDetailValue(previousValue, suffix),
    currentText: getDetailValueText(currentValue, suffix),
    previousText: getDetailValueText(previousValue, suffix),
  };
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

function renderDetailRows(rows: DetailRow[]) {
  return renderDetailTable(rows.map((row) => [row.indicator, row.currentContent, row.previousContent]));
}

function buildDetailCopyText(title: string, entityCode: string, entityName: string, rows: DetailRow[]) {
  return [
    title,
    entityName ? `${entityCode} - ${entityName}` : entityCode,
    '',
    DETAIL_TABLE_HEADERS.join('\t'),
    ...rows.map((row) => [row.indicator, row.currentText, row.previousText].join('\t')),
  ].join('\n');
}

function EmptyState() {
  return <p className={fr.cx('fr-mb-0')}>Aucune donnée</p>;
}

function ErrorState() {
  return <p className={fr.cx('fr-mb-0')}>Impossible de charger les données.</p>;
}

function getSteuDetailRows(detail: ConformiteSteuDetailDto) {
  return [
    createDetailRow('Paramètres conformes (réglementaire)', {
      periodNumber: detail.conformiteLocaleParametresConformesPeriodeNb,
      yearNumber: detail.conformiteLocaleParametresConformesAnneeNb,
      periodLabel: detail.conformiteLocaleParametresConformesPeriodeLb,
      yearLabel: detail.conformiteLocaleParametresConformesAnneeLb,
    }),
    createDetailRow('Paramètres non conformes (réglementaire)', {
      periodNumber: detail.conformiteLocaleParametresNonConformesPeriodeNb,
      yearNumber: detail.conformiteLocaleParametresNonConformesAnneeNb,
      periodLabel: detail.conformiteLocaleParametresNonConformesPeriodeLb,
      yearLabel: detail.conformiteLocaleParametresNonConformesAnneeLb,
    }),
    createDetailRow('Bilans avec données rédhibitoires (réglementaire)', {
      periodNumber: detail.conformiteLocaleRedhibitoiresPeriodeNb,
      yearNumber: detail.conformiteLocaleRedhibitoiresAnneeNb,
      periodLabel: detail.conformiteLocaleRedhibitoiresPeriodeLb,
      yearLabel: detail.conformiteLocaleRedhibitoiresAnneeLb,
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
}

function getSclDetailRows(detail: ConformiteSclDetailDto) {
  return [
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
}

export function ConformiteDetailModal(props: ConformiteDetailModalProps) {
  const isModalOpen = useIsModalOpen(conformiteDetailModal, { onConceal: props.onClose });
  const { detail, isPreviousDisabled, isNextDisabled, onPrevious, onNext } = props;
  const [copied, setCopied] = useState(false);
  const [isCopiedNoticeVisible, setIsCopiedNoticeVisible] = useState(false);
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
      : 'Détail sur la conformité réglementaire temps pluie depuis le dernier suivi effectué';

  const conformiteBadges = (() => {
    if (!detail) {
      return null;
    }

    if (detail.mode === 'steu') {
      return (
        <div className={fr.cx('fr-badges-group')}>
          <span>Réglementaire : {renderConformiteBadge(detail.conformiteLocaleProvisoire)}</span>
        </div>
      );
    }

    return (
      <div className={fr.cx('fr-badges-group')}>
        <span>Réglementaire temps pluie : {renderConformiteBadge(detail.conformiteLocaleTempsPluieProvisoire)}</span>
      </div>
    );
  })();

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

  useEffect(() => {
    setCopied(false);
    setIsCopiedNoticeVisible(false);
  }, [detail?.mode, detail?.entityCode, detail?.year]);

  useEffect(() => {
    if (!copied) {
      return;
    }

    const timeout = window.setTimeout(() => setCopied(false), 2000);

    return () => window.clearTimeout(timeout);
  }, [copied]);

  const isLoading = detail ? (mode === 'steu' ? steuQuery.isLoading : sclQuery.isLoading) : false;
  const isError = detail ? (mode === 'steu' ? steuQuery.isError : sclQuery.isError) : false;
  const data = detail ? (mode === 'steu' ? steuQuery.data : sclQuery.data) : undefined;
  const detailRows =
    data === null || data === undefined
      ? null
      : mode === 'steu'
        ? getSteuDetailRows(data as ConformiteSteuDetailDto)
        : getSclDetailRows(data as ConformiteSclDetailDto);
  const copyText = detailRows ? buildDetailCopyText(title, entityCode, entityName, detailRows) : '';

  async function handleCopyTable() {
    if (!copyText || !navigator.clipboard?.writeText) {
      return;
    }

    try {
      await navigator.clipboard.writeText(copyText);
      setCopied(true);
      setIsCopiedNoticeVisible(true);
    } catch {
      setCopied(false);
    }
  }

  const content = (() => {
    if (!detail) {
      return <EmptyState />;
    }

    if (isLoading) {
      return <LoadingState mode={mode} renderDetailTable={renderDetailTable} />;
    }

    if (isError) {
      return <ErrorState />;
    }

    if (data === null || data === undefined) {
      return <EmptyState />;
    }

    return renderDetailRows(detailRows ?? []);
  })();

  return (
    <conformiteDetailModal.Component title={title} size="large" buttons={[{ children: 'Fermer' }]}>
      <div className={fr.cx('fr-grid-row', 'fr-grid-row--gutters', 'fr-mb-2w')}>
        <div className="fr-col-12">
          <p className={fr.cx('fr-text--sm', 'fr-text--bold', 'fr-mb-1v')}>{entityCode}</p>
          <div className={fr.cx('fr-grid-row', 'fr-grid-row--center')}>
            <p className={`${fr.cx('fr-text--sm', 'fr-mb-0', 'fr-mr-1w')} fr-text--disabled-grey`}>{entityName}</p>
            <span>{conformiteBadges}</span>
          </div>
          <p className={fr.cx('fr-text--sm', 'fr-mt-1w', 'fr-mb-0')}>{subtitle}</p>
        </div>

        <div className="fr-col-12">
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '1rem',
              width: '100%',
            }}
          >
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
                priority="secondary"
                iconId={copied ? 'fr-icon-check-line' : 'fr-icon-clipboard-line'}
                onClick={handleCopyTable}
                disabled={!copyText}
                title="Copier les informations du tableau"
              >
                {copied ? 'Copié !' : 'Copier le tableau'}
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

      {isCopiedNoticeVisible && (
        <Notice
          title="Détail copié"
          description="- Les informations du tableau ont été copiées dans le presse-papiers."
          severity="info"
          className={fr.cx('fr-mb-2w')}
          isClosable
          onClose={() => setIsCopiedNoticeVisible(false)}
        />
      )}

      {content}
    </conformiteDetailModal.Component>
  );
}

export default ConformiteDetailModal;
