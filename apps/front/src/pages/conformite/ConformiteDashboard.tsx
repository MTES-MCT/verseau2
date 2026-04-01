import { fr } from '@codegouvfr/react-dsfr';
import { Alert } from '@codegouvfr/react-dsfr/Alert';
import { Button } from '@codegouvfr/react-dsfr/Button';
import { Notice } from '@codegouvfr/react-dsfr/Notice';
import { Pagination } from '@codegouvfr/react-dsfr/Pagination';
import { RadioButtons } from '@codegouvfr/react-dsfr/RadioButtons';
import { Select } from '@codegouvfr/react-dsfr/Select';
import { Table } from '@codegouvfr/react-dsfr/Table';
import type {
  ConformiteSclDto,
  ConformiteSclSortByValue,
  ConformiteSteuDto,
  ConformiteSteuSortByValue,
} from '@lib/dossier';
import { getPreviousSunday } from '@lib/shared';
import { useMemo, useState, type MouseEvent } from 'react';
import { ConformiteDetailModal } from './modal/ConformiteDetailModal';
import { conformiteDetailModal, type ConformiteDetailEntry } from './modal/ConformiteDetailModal.shared';
import {
  buildConformiteSclTableHeaders,
  buildConformiteSclTableRows,
  buildConformiteSteuTableHeaders,
  buildConformiteSteuTableRows,
} from '../../helper/conformiteTableData';
import { useConformiteFilters } from '../../hooks/useConformiteFilters';

type ConformiteSteuRow = ConformiteSteuDto;

type ConformiteSclRow = ConformiteSclDto;

type ConformiteDashboardDetailEntry = ConformiteDetailEntry & {
  key: string;
};

type ColumnConfig<TSortBy extends string> = {
  label: string;
  field: TSortBy | null;
};

const KNOWN_TRANCHE_OPTIONS = ['2000 à 9999 EH', '2000 EH ≤ capacité < 10000 EH', 'capacité ≥ 10000 EH'];

const STEU_COLUMNS: ColumnConfig<ConformiteSteuSortByValue>[] = [
  { label: 'Code Sandre', field: 'ouvrageDepollutionCode' },
  { label: 'Nom', field: 'ouvrageDepollutionNom' },
  { label: "Tranche d'obligation (EH)", field: 'trancheObligationLibelle' },
  { label: 'Capacité nominale (EH)', field: 'capaciteNominaleEH' },
  { label: 'Début période', field: null },
  { label: 'Fin période', field: null },
  { label: 'Conformité réglementaire', field: 'conformiteLocaleProvisoire' },
  { label: 'Synthèse des changements', field: null },
];

const SCL_COLUMNS: ColumnConfig<ConformiteSclSortByValue>[] = [
  { label: 'Code Sandre', field: 'systemeCollecteCode' },
  { label: 'Nom', field: 'systemeCollecteNom' },
  { label: "Tranche d'obligation (EH)", field: 'trancheObligationLibelle' },
  { label: 'Type', field: 'typeScl' },
  { label: 'Début période', field: null },
  { label: 'Fin période', field: null },
  { label: 'Conformité réglementaire temps pluie', field: 'conformiteLocaleTempsPluieProvisoire' },
  { label: 'Synthèse des changements', field: null },
];

const STEU_HEADER_LABELS = buildConformiteSteuTableHeaders();
const SCL_HEADER_LABELS = buildConformiteSclTableHeaders();

function getSteuDetailKey(steuCdn: number) {
  return `steu-${steuCdn}`;
}

function getSclDetailKey(sclCdn: number) {
  return `scl-${sclCdn}`;
}

function renderSortableHeader<TSortBy extends string>(
  column: ColumnConfig<TSortBy>,
  sortBy: TSortBy | undefined,
  sortOrder: 'ASC' | 'DESC' | undefined,
  setSort: (nextSortBy: TSortBy, nextSortOrder: 'ASC' | 'DESC') => void,
) {
  if (!column.field) {
    return column.label;
  }

  const field = column.field;
  const isSorted = sortBy === field;
  const nextOrder: 'ASC' | 'DESC' = isSorted && sortOrder === 'ASC' ? 'DESC' : 'ASC';

  return (
    <button
      type="button"
      onClick={() => setSort(field, nextOrder)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        padding: 0,
      }}
    >
      {column.label}
      {isSorted && (
        <span className={fr.cx(sortOrder === 'ASC' ? 'fr-icon-arrow-up-s-line' : 'fr-icon-arrow-down-s-line')} />
      )}
    </button>
  );
}

export function ConformiteDashboard() {
  const {
    form,
    appliedYear,
    updateForm,
    updateMode,
    setSort,
    data,
    isLoading,
    isFetching,
    error,
    page,
    setPage,
    totalPages,
    PAGE_SIZE,
    yearOptions,
  } = useConformiteFilters();
  const [selectedDetailKey, setSelectedDetailKey] = useState<string | null>(null);

  const mode = form.mode;
  const selectedYear = appliedYear;
  const steuRows = useMemo(
    () => ((mode === 'steu' ? data?.data : []) ?? []) as ConformiteSteuRow[],
    [data?.data, mode],
  );
  const sclRows = useMemo(() => ((mode === 'scl' ? data?.data : []) ?? []) as ConformiteSclRow[], [data?.data, mode]);
  const currentRows = (mode === 'steu' ? steuRows : sclRows) as Array<ConformiteSteuRow | ConformiteSclRow>;

  const trancheOptions = useMemo(() => {
    const values = new Set(KNOWN_TRANCHE_OPTIONS);

    currentRows.forEach((row) => {
      if (row.trancheObligationLibelle) {
        values.add(row.trancheObligationLibelle);
      }
    });

    return Array.from(values);
  }, [currentRows]);

  const headers = useMemo(() => {
    if (mode === 'steu') {
      return [
        ...STEU_COLUMNS.map((column, index) =>
          renderSortableHeader(
            { ...column, label: STEU_HEADER_LABELS[index] ?? column.label },
            form.sortBy as ConformiteSteuSortByValue | undefined,
            form.sortOrder,
            setSort,
          ),
        ),
        'Détail',
      ];
    }

    return [
      ...SCL_COLUMNS.map((column, index) =>
        renderSortableHeader(
          { ...column, label: SCL_HEADER_LABELS[index] ?? column.label },
          form.sortBy as ConformiteSclSortByValue | undefined,
          form.sortOrder,
          setSort,
        ),
      ),
      'Détail',
    ];
  }, [form.sortBy, form.sortOrder, mode, setSort]);

  const detailEntries = useMemo<ConformiteDashboardDetailEntry[]>(() => {
    if (mode === 'steu') {
      return steuRows
        .filter((steu) => steu.steuCdn)
        .map((steu) => ({
          key: getSteuDetailKey(steu.steuCdn),
          mode: 'steu' as const,
          year: selectedYear,
          steuCdn: steu.steuCdn,
          entityCode: steu.ouvrageDepollutionCode,
          entityName: steu.ouvrageDepollutionNom ?? 'Nom non renseigné',
          conformiteLocaleProvisoire: steu.conformiteLocaleProvisoire,
        }));
    }

    return sclRows
      .filter((scl) => scl.sclCdn)
      .map((scl) => ({
        key: getSclDetailKey(scl.sclCdn),
        mode: 'scl' as const,
        year: selectedYear,
        sclCdn: scl.sclCdn,
        entityCode: scl.systemeCollecteCode,
        entityName: scl.systemeCollecteNom ?? 'Nom non renseigné',
        conformiteLocaleTempsPluieProvisoire: scl.conformiteLocaleTempsPluieProvisoire,
      }));
  }, [mode, sclRows, selectedYear, steuRows]);

  const selectedDetailIndex = selectedDetailKey
    ? detailEntries.findIndex((entry) => entry.key === selectedDetailKey)
    : -1;
  const selectedDetail = selectedDetailIndex >= 0 ? detailEntries[selectedDetailIndex] : null;

  const tableData = useMemo(() => {
    if (mode === 'steu') {
      const baseRows = buildConformiteSteuTableRows(steuRows);

      return baseRows.map((row, index) => {
        const steu = steuRows[index];

        return [
          ...row,
          steu.steuCdn ? (
            <Button
              key={`detail-steu-${steu.ouvrageDepollutionCode}`}
              type="button"
              priority="tertiary no outline"
              size="small"
              onClick={() => {
                setSelectedDetailKey(getSteuDetailKey(steu.steuCdn));
                conformiteDetailModal.open();
              }}
            >
              Voir le détail
            </Button>
          ) : (
            <p key={`detail-missing-steu-${steu.ouvrageDepollutionCode}`} className={fr.cx('fr-text--sm', 'fr-mb-0')}>
              Détail indisponible
            </p>
          ),
        ];
      });
    }

    const baseRows = buildConformiteSclTableRows(sclRows);

    return baseRows.map((row, index) => {
      const scl = sclRows[index];

      return [
        ...row,
        scl.sclCdn ? (
          <Button
            key={`detail-scl-${scl.systemeCollecteCode}`}
            type="button"
            priority="tertiary no outline"
            size="small"
            onClick={() => {
              setSelectedDetailKey(getSclDetailKey(scl.sclCdn));
              conformiteDetailModal.open();
            }}
          >
            Voir le détail
          </Button>
        ) : (
          <p key={`detail-missing-scl-${scl.systemeCollecteCode}`} className={fr.cx('fr-text--sm', 'fr-mb-0')}>
            Détail indisponible
          </p>
        ),
      ];
    });
  }, [mode, sclRows, steuRows]);

  const total = data?.total ?? 0;
  const firstResult = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const lastResult = total === 0 ? 0 : Math.min(page * PAGE_SIZE, total);

  return (
    <div className={fr.cx('fr-container', 'fr-py-2w')}>
      <Notice
        title="Les données ne sont pas en temps réel"
        description={` - Données mises à jour le ${getPreviousSunday()}`}
        severity="info"
        className={fr.cx('fr-mb-2w')}
      />

      <div className={fr.cx('fr-grid-row', 'fr-grid-row--middle', 'fr-grid-row--gutters', 'fr-mb-2w')}>
        <div className={fr.cx('fr-col-12', 'fr-col-md')}>
          <h1 className={fr.cx('fr-mb-0')}>Tableau de bord conformité</h1>
        </div>
      </div>

      <div className={fr.cx('fr-mb-3w')}>
        <div className={fr.cx('fr-grid-row', 'fr-grid-row--gutters', 'fr-grid-row--bottom')}>
          <div className={fr.cx('fr-col-12', 'fr-col-lg-4')}>
            <RadioButtons
              legend="Type de tableau"
              name="conformite-mode"
              orientation="horizontal"
              options={[
                {
                  label: 'STEU',
                  nativeInputProps: {
                    value: 'steu',
                    checked: mode === 'steu',
                    onChange: () => updateMode('steu'),
                  },
                },
                {
                  label: 'SCL',
                  nativeInputProps: {
                    value: 'scl',
                    checked: mode === 'scl',
                    onChange: () => updateMode('scl'),
                  },
                },
              ]}
            />
          </div>

          <div className={fr.cx('fr-col-12', 'fr-col-md-4', 'fr-col-lg-2')}>
            <Select
              label="Année"
              nativeSelectProps={{
                value: form.year,
                onChange: (event) => updateForm('year', event.target.value),
              }}
            >
              {yearOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </Select>
          </div>

          <div className={fr.cx('fr-col-12', 'fr-col-md-4', 'fr-col-lg-3')}>
            <Select
              label="Tranche d'obligation"
              nativeSelectProps={{
                value: form.trancheObligationLibelle,
                onChange: (event) => updateForm('trancheObligationLibelle', event.target.value),
              }}
            >
              <option value="">Toutes les tranches</option>
              {trancheOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </Select>
          </div>

          <div className={fr.cx('fr-col-12', 'fr-col-md-4', 'fr-col-lg-3')}>
            <Select
              label="Impact"
              nativeSelectProps={{
                value: form.impact,
                onChange: (event) => updateForm('impact', event.target.value),
              }}
            >
              <option value="">Tous les résultats</option>
              <option value="avec">Avec impact</option>
              <option value="sans">Sans impact</option>
            </Select>
          </div>
        </div>
      </div>

      {isLoading && <p>Chargement des données...</p>}

      {!isLoading && error && (
        <Alert
          severity="error"
          title="Erreur"
          description={
            error instanceof Error ? error.message : 'Une erreur est survenue lors du chargement des données.'
          }
          className={fr.cx('fr-mb-2w')}
        />
      )}

      {!isLoading && !error && total === 0 && <p>Aucun résultat trouvé</p>}

      {!isLoading && !error && total > 0 && (
        <div style={{ opacity: isFetching ? 0.6 : 1, transition: 'opacity 0.15s ease' }}>
          <Table headers={headers} data={tableData} noCaption bordered noScroll={false} className={fr.cx('fr-mb-2w')} />

          <ConformiteDetailModal
            detail={selectedDetail}
            isPreviousDisabled={selectedDetailIndex <= 0}
            isNextDisabled={selectedDetailIndex === detailEntries.length - 1}
            onPrevious={() => {
              if (selectedDetailIndex > 0) {
                setSelectedDetailKey(detailEntries[selectedDetailIndex - 1]?.key ?? null);
              }
            }}
            onNext={() => {
              if (selectedDetailIndex < detailEntries.length - 1) {
                setSelectedDetailKey(detailEntries[selectedDetailIndex + 1]?.key ?? null);
              }
            }}
            onClose={() => setSelectedDetailKey(null)}
          />

          <p className={fr.cx('fr-text--sm', 'fr-mb-2w')}>
            Affichage de {firstResult} à {lastResult} sur {total} résultats
          </p>

          {totalPages > 1 && (
            <Pagination
              count={totalPages}
              defaultPage={page}
              getPageLinkProps={(pageNumber) => ({
                href: `#page-${pageNumber}`,
                onClick: (event: MouseEvent<HTMLAnchorElement>) => {
                  event.preventDefault();
                  setPage(pageNumber);
                },
              })}
              showFirstLast={true}
            />
          )}
        </div>
      )}
    </div>
  );
}

export default ConformiteDashboard;
