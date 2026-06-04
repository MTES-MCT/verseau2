import { fr } from '@codegouvfr/react-dsfr';
import { Alert } from '@codegouvfr/react-dsfr/Alert';
import { Button } from '@codegouvfr/react-dsfr/Button';
import { Notice } from '@codegouvfr/react-dsfr/Notice';
import { Pagination } from '@codegouvfr/react-dsfr/Pagination';
import { RadioButtons } from '@codegouvfr/react-dsfr/RadioButtons';
import { Select } from '@codegouvfr/react-dsfr/Select';
import { Table } from '@codegouvfr/react-dsfr/Table';
import {
  type ConformiteSclDto,
  type ConformiteSclSortByValue,
  type ConformiteSteuDto,
  type ConformiteSteuSortByValue,
} from '@lib/dossier';
import { getPreviousSunday } from '@lib/shared';
import { useMemo, useState, type MouseEvent } from 'react';
import { ConformiteDetailModal } from './modal/ConformiteDetailModal';
import { conformiteDetailModal, type ConformiteDetailEntry } from './modal/ConformiteDetailModal.shared';
import { SortableHeader } from '../../components/SortableHeader';
import { SelectAutocomplete, type AutocompleteOption } from '../../components/SelectAutocomplete';
import { useAsyncOuvragesSearch } from '../../hooks/useAsyncOuvragesSearch';
import { useAsyncSystemesCollecteSearch } from '../../hooks/useAsyncSystemesCollecteSearch';
import {
  buildConformiteSclTableHeaders,
  buildConformiteSclTableRows,
  buildConformiteSteuTableHeaders,
  buildConformiteSteuTableRows,
} from '../../helper/conformiteTableData';
import { useConformiteFilters } from '../../hooks/useConformiteFilters';
import { TableLoader } from '../../components/common/TableLoader';
import { useCsvExportDownload } from '../../hooks/useCsvExportDownload';
import { downloadConformiteSclExport, downloadConformiteSteuExport } from '../../api/conformite';

type ConformiteSteuRow = ConformiteSteuDto;

type ConformiteSclRow = ConformiteSclDto;

type ConformiteDashboardDetailEntry = ConformiteDetailEntry & {
  key: string;
};

function getSteuDetailKey(steuCdn: number) {
  return `steu-${steuCdn}`;
}

function getSclDetailKey(sclCdn: number) {
  return `scl-${sclCdn}`;
}

export function ConformiteDashboard() {
  const {
    form,
    appliedYear,
    hasOuvrageSelected,
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
  const [infoBannerVisible, setInfoBannerVisible] = useState(true);
  const [selectedDetailKey, setSelectedDetailKey] = useState<string | null>(null);
  const [ouvrageSearch, setOuvrageSearch] = useState('');
  const [sclSearch, setSclSearch] = useState('');

  const mode = form.mode;
  const isScl = mode === 'scl';
  const selectedYear = appliedYear;

  const { data: ouvrages = [], isLoading: ouvragesLoading } = useAsyncOuvragesSearch(ouvrageSearch);
  const { data: systemesCollecte = [], isLoading: systemesCollecteLoading } = useAsyncSystemesCollecteSearch(sclSearch);

  const ouvragesOptions: AutocompleteOption[] = isScl
    ? systemesCollecte.map((s) => ({
        value: s.systemeCollecteCode,
        label: s.systemeCollecteNom ?? s.systemeCollecteCode,
      }))
    : ouvrages.map((o) => ({
        value: o.ouvrageDepollutionCode,
        label: o.ouvrageDepollutionNom ?? o.ouvrageDepollutionCode,
      }));

  const ouvragesLoadingCurrent = isScl ? systemesCollecteLoading : ouvragesLoading;

  const handleOuvrageChange = (value: string | null) => {
    const newVal = value ?? '';
    if (isScl) {
      setSclSearch(newVal);
    } else {
      setOuvrageSearch(newVal);
    }
    updateForm('ouvrageCode', newVal);
  };

  const handleModeChange = (nextMode: 'steu' | 'scl') => {
    setOuvrageSearch('');
    setSclSearch('');
    updateMode(nextMode);
  };

  const steuRows = useMemo(
    () => ((mode === 'steu' ? data?.data : []) ?? []) as ConformiteSteuRow[],
    [data?.data, mode],
  );
  const sclRows = useMemo(() => ((mode === 'scl' ? data?.data : []) ?? []) as ConformiteSclRow[], [data?.data, mode]);
  const headers = useMemo(() => {
    if (mode === 'steu') {
      return [
        ...buildConformiteSteuTableHeaders().map((header) => {
          if (
            ![
              'ouvrageDepollutionCode',
              'ouvrageDepollutionNom',
              'trancheObligationLibelle',
              'capaciteNominaleEH',
              'conformiteLocaleProvisoire',
            ].includes(header.property)
          ) {
            return header.label;
          }

          return (
            <SortableHeader
              key={header.property}
              label={header.label}
              field={header.property as ConformiteSteuSortByValue}
              sortBy={form.sortBy as ConformiteSteuSortByValue | undefined}
              sortOrder={form.sortOrder}
              onSort={setSort as (nextSortBy: ConformiteSteuSortByValue, nextSortOrder: 'ASC' | 'DESC') => void}
            />
          );
        }),
        'Détail',
      ];
    }

    return [
      ...buildConformiteSclTableHeaders().map((header) => {
        if (
          ![
            'systemeCollecteCode',
            'systemeCollecteNom',
            'trancheObligationLibelle',
            'typeScl',
            'conformiteLocaleTempsPluieProvisoire',
          ].includes(header.property)
        ) {
          return header.label;
        }

        return (
          <SortableHeader
            key={header.property}
            label={header.label}
            field={header.property as ConformiteSclSortByValue}
            sortBy={form.sortBy as ConformiteSclSortByValue | undefined}
            sortOrder={form.sortOrder}
            onSort={setSort as (nextSortBy: ConformiteSclSortByValue, nextSortOrder: 'ASC' | 'DESC') => void}
          />
        );
      }),
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
  const {
    download: downloadSteuCsv,
    isLoading: isSteuExportLoading,
    downloadError: steuDownloadError,
    setDownloadError: setSteuDownloadError,
  } = useCsvExportDownload(downloadConformiteSteuExport);
  const {
    download: downloadSclCsv,
    isLoading: isSclExportLoading,
    downloadError: sclDownloadError,
    setDownloadError: setSclDownloadError,
  } = useCsvExportDownload(downloadConformiteSclExport);
  const isExportLoading = isScl ? isSclExportLoading : isSteuExportLoading;
  const downloadError = isScl ? sclDownloadError : steuDownloadError;
  const setDownloadError = isScl ? setSclDownloadError : setSteuDownloadError;
  const canExport = hasOuvrageSelected && !isLoading && !isFetching && total > 0;

  const handleExport = () => {
    if (!canExport) {
      return;
    }

    if (isScl) {
      void downloadSclCsv(
        {
          year: Number(form.year),
          ...(form.ouvrageCode ? { systemeCollecteCode: form.ouvrageCode } : {}),
          ...(form.trancheObligationRfa ? { trancheObligationRfa: form.trancheObligationRfa } : {}),
          ...(form.impact ? { impact: form.impact } : {}),
          ...(form.sortBy ? { sortBy: form.sortBy as ConformiteSclSortByValue } : {}),
          ...(form.sortOrder ? { sortOrder: form.sortOrder } : {}),
          page,
          pageSize: PAGE_SIZE,
        },
        `conformite-scl-${form.year}.csv`,
      );
      return;
    }

    void downloadSteuCsv(
      {
        year: Number(form.year),
        ...(form.ouvrageCode ? { ouvrageDepollutionCode: form.ouvrageCode } : {}),
        ...(form.trancheObligationRfa ? { trancheObligationRfa: form.trancheObligationRfa } : {}),
        ...(form.impact ? { impact: form.impact } : {}),
        ...(form.sortBy ? { sortBy: form.sortBy as ConformiteSteuSortByValue } : {}),
        ...(form.sortOrder ? { sortOrder: form.sortOrder } : {}),
        page,
        pageSize: PAGE_SIZE,
      },
      `conformite-steu-${form.year}.csv`,
    );
  };

  return (
    <div className={fr.cx('fr-container', 'fr-py-2w')}>
      {infoBannerVisible && (
        <Alert
          severity="info"
          title="À Conformité réglementaire : information importante"
          description="La conformité réglementaire affichée pour l'année en cours est provisoire. Elle est calculée uniquement sur la base des bilans d'autosurveillance actuellement disponibles et pourra être réévaluée par le SPE. La conformité annuelle finale tient également compte d'autres informations, comme les déversements en tête de station, les événements d'exploitation et la qualification de l'autosurveillance."
          closable
          onClose={() => setInfoBannerVisible(false)}
          className={fr.cx('fr-mb-2w')}
        />
      )}
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
        <div className={fr.cx('fr-grid-row', 'fr-grid-row--gutters', 'fr-mb-4w')}>
          <div className={fr.cx('fr-col-12', 'fr-col-lg-3')}>
            <RadioButtons
              legend="Type de tableau"
              hintText={<br />}
              name="conformite-mode"
              orientation="horizontal"
              options={[
                {
                  label: 'STEU',
                  nativeInputProps: {
                    value: 'steu',
                    checked: mode === 'steu',
                    onChange: () => handleModeChange('steu'),
                  },
                },
                {
                  label: 'SCL',
                  nativeInputProps: {
                    value: 'scl',
                    checked: mode === 'scl',
                    onChange: () => handleModeChange('scl'),
                  },
                },
              ]}
            />
          </div>

          <div className={fr.cx('fr-col-12', 'fr-col-md-4', 'fr-col-lg-2')}>
            <Select
              label="Année"
              hint={<br />}
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

          <div className={fr.cx('fr-col-12', 'fr-col-md-4', 'fr-col-lg-4')}>
            <SelectAutocomplete
              label={isScl ? 'Système de collecte' : 'Station'}
              hintText={ouvragesLoadingCurrent ? 'Recherche en cours...' : 'Saisissez au moins 2 caractères'}
              placeholder={isScl ? 'Rechercher un SCL' : 'Rechercher une station'}
              options={ouvragesOptions}
              value={form.ouvrageCode || null}
              onChange={handleOuvrageChange}
              onInputChange={isScl ? setSclSearch : setOuvrageSearch}
            />
          </div>

          <div className={fr.cx('fr-col-12', 'fr-col-md-4', 'fr-col-lg-3')}>
            <Select
              label="Impact"
              hint={<br />}
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

      {downloadError && (
        <Alert
          severity="error"
          title="Erreur d'export"
          description={downloadError}
          closable
          onClose={() => setDownloadError(null)}
          className={fr.cx('fr-mb-2w')}
        />
      )}

      <TableLoader
        isLoading={isLoading && hasOuvrageSelected}
        isFetching={isFetching}
        hasOuvrageSelected={hasOuvrageSelected}
      >
        {!error && total === 0 && <p>Aucun résultat trouvé</p>}

        {!error && total > 0 && (
          <>
            <div className={fr.cx('fr-mb-2w')} style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Button
                type="button"
                priority="secondary"
                onClick={handleExport}
                disabled={!canExport || isExportLoading}
              >
                Exporter CSV
              </Button>
            </div>
            <Table
              headers={headers}
              data={tableData}
              noCaption
              bordered
              noScroll={false}
              className={fr.cx('fr-mb-2w')}
            />

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
          </>
        )}
      </TableLoader>
    </div>
  );
}

export default ConformiteDashboard;
