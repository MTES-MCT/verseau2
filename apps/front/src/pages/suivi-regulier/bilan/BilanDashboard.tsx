import { useMemo, useState, type ChangeEvent } from 'react';
import { type BilanSteuSortByValue, type BilanSclSortByValue, type IntervenantDetailDto } from '@lib/dossier';
import type { SortByValue } from '../../../hooks/useBilanFilters';
import { CURRENT_BILAN_YEAR, FIRST_BILAN_YEAR } from '@lib/dossier';
import { Notice } from '@codegouvfr/react-dsfr/Notice';
import { Alert } from '@codegouvfr/react-dsfr/Alert';
import { Pagination } from '@codegouvfr/react-dsfr/Pagination';
import { RadioButtons } from '@codegouvfr/react-dsfr/RadioButtons';
import { Select } from '@codegouvfr/react-dsfr/Select';
import { Table } from '@codegouvfr/react-dsfr/Table';
import { Button } from '@codegouvfr/react-dsfr/Button';
import { useBilanSteu, useBilanScl, useBilanSteuDetail, useBilanSclDetail } from '../../../hooks/useBilan';
import { useBilanFilters } from '../../../hooks/useBilanFilters';
import { SelectAutocomplete, type AutocompleteOption } from '../../../components/SelectAutocomplete';
import { usePointsMesure } from '../../../hooks/usePointsMesure';
import { useAsyncOuvragesSearch } from '../../../hooks/useAsyncOuvragesSearch';
import { useAsyncSystemesCollecteSearch } from '../../../hooks/useAsyncSystemesCollecteSearch';
import { getPreviousSunday } from '@lib/shared';
import { fr } from '@codegouvfr/react-dsfr';
import { SortableHeader } from '../../../components/SortableHeader';
import {
  buildBilanSclTableHeaders,
  buildBilanSclTableRows,
  buildBilanSteuTableHeaders,
  buildBilanSteuTableRows,
} from '../../../helper/bilanTableData';
import { TableLoader } from '../../../components/common/TableLoader';
import { buildPointMesureLabel } from '../../../helper/pointMesureLabel';
import { useCsvExportDownload } from '../../../hooks/useCsvExportDownload';
import { downloadBilanSclExport, downloadBilanSteuExport } from '../../../api/bilan';
import { useParametresMesure } from '../../../hooks/useParametresMesure';
import { formatOption } from '../../../helper/optionsFormatter';

function formatInfoDate(value: string | null | undefined) {
  if (!value) {
    return '-';
  }

  const [year, month, day] = value.split('-');
  if (!year || !month || !day) {
    return value;
  }

  return `${day}/${month}/${year}`;
}

function formatIntervenants(intervenants: IntervenantDetailDto[], key: 'intervenantNom' | 'intervenantSiret'): string {
  return (
    intervenants
      .map((intervenant) => intervenant[key])
      .filter(Boolean)
      .join(' / ') || '-'
  );
}

export const BilanDashboard = () => {
  const { filters, updateFilter, page, setPage } = useBilanFilters();
  const pageSize = 20;
  const [ouvrageSearch, setOuvrageSearch] = useState('');
  const [sclSearch, setSclSearch] = useState('');

  const isScl = filters.mode === 'scl';

  const { data: pmos = [] } = usePointsMesure('scl', isScl ? filters.systemeCollecteCode || null : null);
  const { data: parametres = [], isLoading: parametresLoading } = useParametresMesure(
    'steu',
    !isScl ? filters.ouvrageDepollutionCode || null : null,
  );
  const { data: ouvrages = [], isLoading: ouvragesLoading } = useAsyncOuvragesSearch(ouvrageSearch);
  const { data: systemesCollecte = [], isLoading: systemesCollecteLoading } = useAsyncSystemesCollecteSearch(sclSearch);

  const yearOptions = useMemo(
    () =>
      [CURRENT_BILAN_YEAR, CURRENT_BILAN_YEAR - 1]
        .filter((year, index, years) => year >= FIRST_BILAN_YEAR && years.indexOf(year) === index)
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
  const currentOuvrageValue = isScl ? filters.systemeCollecteCode : filters.ouvrageDepollutionCode;
  const hasOuvrageSelected = !!currentOuvrageValue;
  const pointMesureOptions: AutocompleteOption[] = pmos.map((p) => ({
    value: p.pointMesureId.toString(),
    label: buildPointMesureLabel(p),
  }));
  const parametreOptions: AutocompleteOption[] = parametres.map((option) =>
    formatOption({
      elementNomenclatureCode: option.parametreAnalyseCode,
      elementNomenclatureLibelle: option.parametreNomCourt,
    }),
  );

  const handleOuvrageChange = (value: string | null) => {
    const newVal = value ?? '';
    if (isScl) {
      setSclSearch(newVal);
      updateFilter({ systemeCollecteCode: newVal, pointMesureId: '' });
    } else {
      setOuvrageSearch(newVal);
      updateFilter({ ouvrageDepollutionCode: newVal, parametreCode: '' });
    }
  };

  const handlePointMesureChange = (value: string | null) => {
    const newVal = value ?? '';
    updateFilter({ pointMesureId: newVal });
  };

  const handleModeChange = (mode: 'steu' | 'scl') => {
    setOuvrageSearch('');
    setSclSearch('');
    updateFilter({ mode });
  };

  const handleParametreChange = (value: string | null) => {
    updateFilter({ parametreCode: value ?? '' });
  };

  const steuQuery = {
    page,
    pageSize,
    year: filters.year,
    ...(filters.ouvrageDepollutionCode ? { ouvrageDepollutionCode: filters.ouvrageDepollutionCode } : {}),
    ...(filters.parametreCode ? { parametreCode: filters.parametreCode } : {}),
    ...(filters.sortBy ? { sortBy: filters.sortBy as BilanSteuSortByValue } : {}),
    ...(filters.sortOrder ? { sortOrder: filters.sortOrder } : {}),
  };

  const sclQuery = {
    page,
    pageSize,
    year: filters.year,
    ...(filters.systemeCollecteCode ? { systemeCollecteCode: filters.systemeCollecteCode } : {}),
    ...(filters.pointMesureId ? { pointMesureId: Number(filters.pointMesureId) } : {}),
    ...(filters.statut ? { statut: filters.statut } : {}),
    ...(filters.sortBy ? { sortBy: filters.sortBy as BilanSclSortByValue } : {}),
    ...(filters.sortOrder ? { sortOrder: filters.sortOrder } : {}),
  };

  const {
    data: steuData,
    isLoading: steuLoading,
    isFetching: steuFetching,
  } = useBilanSteu(steuQuery, filters.mode === 'steu' && hasOuvrageSelected);
  const {
    data: sclData,
    isLoading: sclLoading,
    isFetching: sclFetching,
  } = useBilanScl(sclQuery, filters.mode === 'scl' && hasOuvrageSelected);
  const { data: steuDetail } = useBilanSteuDetail(
    isScl ? null : filters.ouvrageDepollutionCode || null,
    !isScl && hasOuvrageSelected,
  );
  const { data: sclDetail } = useBilanSclDetail(
    isScl ? filters.systemeCollecteCode || null : null,
    isScl && hasOuvrageSelected,
  );

  const data = filters.mode === 'steu' ? steuData : sclData;
  const isLoading = filters.mode === 'steu' ? steuLoading : sclLoading;
  const isFetching = filters.mode === 'steu' ? steuFetching : sclFetching;
  const {
    download: downloadSteuCsv,
    isLoading: isSteuExportLoading,
    downloadError: steuDownloadError,
    setDownloadError: setSteuDownloadError,
  } = useCsvExportDownload(downloadBilanSteuExport);
  const {
    download: downloadSclCsv,
    isLoading: isSclExportLoading,
    downloadError: sclDownloadError,
    setDownloadError: setSclDownloadError,
  } = useCsvExportDownload(downloadBilanSclExport);

  const handleDateSort = (nextSortBy: SortByValue, nextSortOrder: 'ASC' | 'DESC') => {
    updateFilter({ sortBy: nextSortBy, sortOrder: nextSortOrder });
  };

  const isExportLoading = isScl ? isSclExportLoading : isSteuExportLoading;
  const downloadError = isScl ? sclDownloadError : steuDownloadError;
  const setDownloadError = isScl ? setSclDownloadError : setSteuDownloadError;
  const canExport = hasOuvrageSelected && !isLoading && !isFetching && (data?.total ?? 0) > 0;

  const handleExport = () => {
    if (!canExport) {
      return;
    }

    if (isScl) {
      void downloadSclCsv(sclQuery, `bilan-scl-${filters.year}.csv`);
      return;
    }

    void downloadSteuCsv(steuQuery, `bilan-steu-${filters.year}.csv`);
  };

  const tableData = isScl ? buildBilanSclTableRows(sclData?.data || []) : buildBilanSteuTableRows(steuData?.data || []);

  let headers;
  if (isScl) {
    headers = buildBilanSclTableHeaders().map((header) => {
      if (header.property !== 'date') {
        return header.label;
      }

      return (
        <SortableHeader<BilanSclSortByValue>
          key="date"
          label={header.label}
          field="date"
          sortBy={filters.sortBy as BilanSclSortByValue | undefined}
          sortOrder={filters.sortOrder}
          onSort={handleDateSort as (nextSortBy: BilanSclSortByValue, nextSortOrder: 'ASC' | 'DESC') => void}
        />
      );
    });
  } else {
    headers = buildBilanSteuTableHeaders().map((header) => {
      if (header.property !== 'date') {
        return header.label;
      }

      return (
        <SortableHeader<BilanSteuSortByValue>
          key="date"
          label={header.label}
          field="date"
          sortBy={filters.sortBy as BilanSteuSortByValue | undefined}
          sortOrder={filters.sortOrder}
          onSort={handleDateSort as (nextSortBy: BilanSteuSortByValue, nextSortOrder: 'ASC' | 'DESC') => void}
        />
      );
    });
  }

  const detail = isScl ? sclDetail : steuDetail;
  const codeSandreLabel = detail
    ? 'ouvrageDepollutionCode' in detail
      ? detail.ouvrageDepollutionCode
      : detail.systemeCollecteCode
    : '-';
  const detailIntervenants = detail ? [...detail.exploitants, ...detail.maitresOuvrage] : [];
  const exploitantMoaLabel = formatIntervenants(detailIntervenants, 'intervenantNom');
  const siretLabel = formatIntervenants(detailIntervenants, 'intervenantSiret');
  const steuMiseEnServiceLabel = !isScl ? formatInfoDate(steuDetail?.dateMiseEnService ?? null) : '-';

  return (
    <div className={fr.cx('fr-container', 'fr-py-2w')}>
      <Notice
        title="Les données ne sont pas en temps réel"
        description={` - Données mises à jour le ${getPreviousSunday()}`}
        severity="info"
        className={fr.cx('fr-mb-2w')}
      />
      <h1>Tableau de bord bilans</h1>

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
        <div className={`fr-col-12 fr-col-lg-7 ${isScl ? 'fr-col-xl-4' : 'fr-col-xl-6'}`}>
          <SelectAutocomplete
            label={isScl ? 'Système de collecte' : 'Station'}
            hintText={ouvragesLoadingCurrent ? 'Recherche en cours...' : 'Saisissez au moins 2 caractères'}
            placeholder={isScl ? 'Rechercher un SCL' : 'Rechercher une station'}
            options={ouvragesOptions}
            value={currentOuvrageValue || null}
            onChange={handleOuvrageChange}
            onInputChange={isScl ? setSclSearch : setOuvrageSearch}
          />
        </div>
        {!isScl && (
          <div className="fr-col-12 fr-col-lg-5 fr-col-xl-4">
            <SelectAutocomplete
              label="Paramètre"
              hintText={<br />}
              disabled={!hasOuvrageSelected}
              placeholder={!hasOuvrageSelected ? 'Sélectionnez une station' : parametresLoading ? 'Chargement…' : 'Tous les paramètres'}
              options={parametreOptions}
              value={filters.parametreCode || null}
              onChange={handleParametreChange}
            />
          </div>
        )}
        {isScl && (
          <>
            <div className="fr-col-12 fr-col-lg-6 fr-col-xl-2">
              <SelectAutocomplete
                label="Point de mesures"
                hintText={'Sélectionner un point de mesure'}
                disabled={!hasOuvrageSelected}
                placeholder="Rechercher un point de mesure"
                options={pointMesureOptions}
                value={filters.pointMesureId || null}
                onChange={handlePointMesureChange}
              />
            </div>
            <div className="fr-col-12 fr-col-lg-6 fr-col-xl-2">
              <Select
                label="Statut"
                hint={<br />}
                disabled={!hasOuvrageSelected}
                nativeSelectProps={{
                  value: filters.statut,
                  onChange: (e: ChangeEvent<HTMLSelectElement>) =>
                    updateFilter({ statut: e.target.value as 'TP' | 'TS' | '' }),
                }}
              >
                <option value="">Tous les statuts</option>
                <option value="TP">TP</option>
                <option value="TS">TS</option>
              </Select>
            </div>
          </>
        )}
      </div>

      {hasOuvrageSelected && detail && (
        <div className="fr-grid-row fr-grid-row--gutters fr-mb-3w">
          <div className="fr-col-12">
            <div className="fr-callout fr-callout--blue-ecume">
              <h2 className="fr-callout__title">Informations de l'ouvrage</h2>
              <p className="fr-mb-1v">
                <strong>Code Sandre :</strong> {codeSandreLabel}
              </p>
              {!isScl && (
                <p className="fr-mb-1v">
                  <strong>Date de mise en service :</strong> {steuMiseEnServiceLabel}
                </p>
              )}
              <p className="fr-mb-1v">
                <strong>Exploitant / MOA :</strong> {exploitantMoaLabel}
              </p>
              <p className="fr-mb-0">
                <strong>SIRET :</strong> {siretLabel}
              </p>
            </div>
          </div>
        </div>
      )}

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
        <Table data={tableData} headers={headers} />
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
