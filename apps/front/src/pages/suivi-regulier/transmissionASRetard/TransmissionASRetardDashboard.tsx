import { useMemo, useState, type ChangeEvent } from 'react';
import type { TransmissionASRetardSteuSortByValue, TransmissionASRetardSclSortByValue } from '@lib/dossier';
import type { SortByValue } from '../../../hooks/useTransmissionASRetardFilters';
import type { ReactNode } from 'react';
import { CURRENT_TRANSMISSION_YEAR, FIRST_TRANSMISSION_YEAR } from '@lib/dossier';
import { Notice } from '@codegouvfr/react-dsfr/Notice';
import { Alert } from '@codegouvfr/react-dsfr/Alert';
import { Pagination } from '@codegouvfr/react-dsfr/Pagination';
import { RadioButtons } from '@codegouvfr/react-dsfr/RadioButtons';
import { Select } from '@codegouvfr/react-dsfr/Select';
import { Button } from '@codegouvfr/react-dsfr/Button';
import { useTransmissionASRetardSteu, useTransmissionASRetardScl } from '../../../hooks/useTransmissionASRetard';
import { useTransmissionASRetardFilters } from '../../../hooks/useTransmissionASRetardFilters';
import { SelectAutocomplete, type AutocompleteOption } from '../../../components/SelectAutocomplete';
import { getPreviousSunday } from '@lib/shared';
import { fr } from '@codegouvfr/react-dsfr';
import { SortableHeader } from '../../../components/SortableHeader';
import { useAsyncOuvragesSearch } from '../../../hooks/useAsyncOuvragesSearch';
import { useAsyncSystemesCollecteSearch } from '../../../hooks/useAsyncSystemesCollecteSearch';
import {
  buildTransmissionASRetardTableHeaders,
  buildTransmissionASRetardSteuTableRows,
  buildTransmissionASRetardSclTableRows,
} from '../../../helper/transmissionASRetardTableData';
import { TableLoader } from '../../../components/common/TableLoader';
import { useCsvExportDownload } from '../../../hooks/useCsvExportDownload';
import {
  downloadTransmissionASRetardSclExport,
  downloadTransmissionASRetardSteuExport,
} from '../../../api/transmissionASRetard';
import { FixedHeightTable } from '../../../components/common/FixedHeightTable';

export const TransmissionASRetardDashboard = () => {
  const { filters, updateFilter, page, setPage } = useTransmissionASRetardFilters();
  const pageSize = 10;
  const [ouvrageSearch, setOuvrageSearch] = useState('');
  const [sclSearch, setSclSearch] = useState('');

  const isScl = filters.mode === 'scl';

  const { data: ouvrages = [], isLoading: ouvragesLoading } = useAsyncOuvragesSearch(ouvrageSearch);
  const { data: systemesCollecte = [], isLoading: systemesCollecteLoading } = useAsyncSystemesCollecteSearch(sclSearch);

  const yearOptions = useMemo(
    () =>
      [CURRENT_TRANSMISSION_YEAR, CURRENT_TRANSMISSION_YEAR - 1]
        .filter((year, index, years) => year >= FIRST_TRANSMISSION_YEAR && years.indexOf(year) === index)
        .map((year) => year.toString()),
    [],
  );

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
  const currentOuvrageValue = filters.ouvrageCode || null;
  const hasOuvrageSelected = !!filters.ouvrageCode;

  const handleOuvrageChange = (value: string | null) => {
    const newVal = value ?? '';
    if (isScl) {
      setSclSearch(newVal);
    } else {
      setOuvrageSearch(newVal);
    }
    updateFilter({ ouvrageCode: newVal });
  };

  const handleModeChange = (mode: 'steu' | 'scl') => {
    setOuvrageSearch('');
    setSclSearch('');
    updateFilter({ mode });
  };

  const handleSort = (nextSortBy: SortByValue, nextSortOrder: 'ASC' | 'DESC') => {
    updateFilter({ sortBy: nextSortBy, sortOrder: nextSortOrder });
  };

  const steuQuery = {
    page,
    pageSize,
    year: filters.year,
    ...(filters.ouvrageCode ? { ouvrageDepollutionCode: filters.ouvrageCode } : {}),
    ...(filters.sortBy ? { sortBy: filters.sortBy as TransmissionASRetardSteuSortByValue } : {}),
    ...(filters.sortOrder ? { sortOrder: filters.sortOrder } : {}),
  };

  const sclQuery = {
    page,
    pageSize,
    year: filters.year,
    ...(filters.ouvrageCode ? { systemeCollecteCode: filters.ouvrageCode } : {}),
    ...(filters.sortBy ? { sortBy: filters.sortBy as TransmissionASRetardSclSortByValue } : {}),
    ...(filters.sortOrder ? { sortOrder: filters.sortOrder } : {}),
  };

  const {
    data: steuData,
    isLoading: steuLoading,
    isFetching: steuFetching,
  } = useTransmissionASRetardSteu(steuQuery, !isScl && hasOuvrageSelected);
  const {
    data: sclData,
    isLoading: sclLoading,
    isFetching: sclFetching,
  } = useTransmissionASRetardScl(sclQuery, isScl && hasOuvrageSelected);

  const data = isScl ? sclData : steuData;
  const isLoading = isScl ? sclLoading : steuLoading;
  const isFetching = isScl ? sclFetching : steuFetching;
  const {
    download: downloadSteuCsv,
    isLoading: isSteuExportLoading,
    downloadError: steuDownloadError,
    setDownloadError: setSteuDownloadError,
  } = useCsvExportDownload(downloadTransmissionASRetardSteuExport);
  const {
    download: downloadSclCsv,
    isLoading: isSclExportLoading,
    downloadError: sclDownloadError,
    setDownloadError: setSclDownloadError,
  } = useCsvExportDownload(downloadTransmissionASRetardSclExport);

  const tableData = isScl
    ? buildTransmissionASRetardSclTableRows(sclData?.data || [])
    : buildTransmissionASRetardSteuTableRows(steuData?.data || []);

  const headers = buildTransmissionASRetardTableHeaders();

  // Rendre les colonnes triables
  const sortableColumns: { label: string; field: SortByValue }[] = isScl
    ? [
        { label: 'Code Sandre', field: 'systemeCollecteCode' },
        { label: 'Nom', field: 'systemeCollecteNom' },
        { label: "Tranche d'obligation (EH)", field: 'trancheObligationLibelle' },
        { label: 'Capacité nominale (EH)', field: 'capaciteNominaleEH' },
        { label: 'Date dernier fichier reçu', field: 'dateDernierFichierRecu' },
        { label: 'Nb jours de retard', field: 'nbJoursRetard' },
      ]
    : [
        { label: 'Code Sandre', field: 'ouvrageDepollutionCode' },
        { label: 'Nom', field: 'ouvrageDepollutionNom' },
        { label: "Tranche d'obligation (EH)", field: 'trancheObligationLibelle' },
        { label: 'Capacité nominale (EH)', field: 'capaciteNominaleEH' },
        { label: 'Date dernier fichier reçu', field: 'dateDernierFichierRecu' },
        { label: 'Nb jours de retard', field: 'nbJoursRetard' },
      ];

  const finalHeaders: (string | ReactNode)[] = headers.map((header) => {
    const sortable = sortableColumns.find((s) => s.label === header);
    if (sortable) {
      return (
        <SortableHeader<SortByValue>
          key={sortable.field}
          label={sortable.label}
          field={sortable.field}
          sortBy={filters.sortBy}
          sortOrder={filters.sortOrder}
          onSort={handleSort}
        />
      );
    }
    return header;
  });

  const title = isScl ? 'Transmission AS des SCL en retard' : 'Transmission AS des STEU en retard';
  const isExportLoading = isScl ? isSclExportLoading : isSteuExportLoading;
  const downloadError = isScl ? sclDownloadError : steuDownloadError;
  const setDownloadError = isScl ? setSclDownloadError : setSteuDownloadError;
  const canExport = hasOuvrageSelected && !isLoading && !isFetching && (data?.total ?? 0) > 0;

  const handleExport = () => {
    if (!canExport) {
      return;
    }

    if (isScl) {
      void downloadSclCsv(sclQuery, `transmission-as-retard-scl-${filters.year}.csv`);
      return;
    }

    void downloadSteuCsv(steuQuery, `transmission-as-retard-steu-${filters.year}.csv`);
  };

  return (
    <div className={fr.cx('fr-container', 'fr-py-2w')}>
      <Notice
        title="Les données ne sont pas en temps réel"
        description={` - Données mises à jour le ${getPreviousSunday()}`}
        severity="info"
        className={fr.cx('fr-mb-2w')}
      />
      <h1>{title}</h1>

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

      <div className="fr-grid-row fr-grid-row--gutters fr-mb-4w">
        <div className="fr-col-6 fr-col-lg-3 fr-col-xl-2">
          <RadioButtons
            legend="Type d'ouvrage"
            orientation="horizontal"
            hintText={<br />}
            options={[
              {
                label: 'STEU',
                nativeInputProps: {
                  checked: filters.mode === 'steu',
                  onChange: () => handleModeChange('steu'),
                },
              },
              {
                label: 'SCL',
                nativeInputProps: {
                  checked: filters.mode === 'scl',
                  onChange: () => handleModeChange('scl'),
                },
              },
            ]}
          />
        </div>
        <div className="fr-col-6 fr-col-lg-2 fr-col-xl-2">
          <Select
            label="Année"
            hint={<br />}
            nativeSelectProps={{
              value: filters.year.toString(),
              onChange: (e: ChangeEvent<HTMLSelectElement>) => updateFilter({ year: parseInt(e.target.value) }),
            }}
          >
            {yearOptions.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </Select>
        </div>
        <div className="fr-col-12 fr-col-lg-7 fr-col-xl-6">
          <SelectAutocomplete
            label={isScl ? 'Système de collecte' : 'Station'}
            hintText={ouvragesLoadingCurrent ? 'Recherche en cours...' : 'Saisissez au moins 2 caractères'}
            placeholder={isScl ? 'Rechercher un SCL' : 'Rechercher une station'}
            options={ouvragesOptions}
            value={currentOuvrageValue}
            onChange={handleOuvrageChange}
            onInputChange={isScl ? setSclSearch : setOuvrageSearch}
          />
        </div>
      </div>

      <TableLoader
        isLoading={isLoading && hasOuvrageSelected}
        isFetching={isFetching}
        hasOuvrageSelected={hasOuvrageSelected}
      >
        <div className={fr.cx('fr-mb-2w')} style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Button type="button" priority="secondary" onClick={handleExport} disabled={!canExport || isExportLoading}>
            Exporter CSV
          </Button>
        </div>
        <FixedHeightTable
          data={tableData}
          headers={finalHeaders}
          isFetching={isFetching}
          pageSize={pageSize}
          rowHeight="two-lines"
        />
        {Math.ceil((data?.total || 0) / pageSize) > 1 && (
          <Pagination
            count={Math.ceil((data?.total || 0) / pageSize)}
            defaultPage={page}
            getPageLinkProps={(pageNumber: number) => ({
              href: `#page-${pageNumber}`,
              onClick: (e: React.MouseEvent<HTMLAnchorElement>) => {
                e.preventDefault();
                setPage(pageNumber);
              },
            })}
          />
        )}
      </TableLoader>
    </div>
  );
};
