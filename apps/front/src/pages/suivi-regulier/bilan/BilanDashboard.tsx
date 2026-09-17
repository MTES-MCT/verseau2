import { useEffect, useState, type ChangeEvent } from 'react';
import { useLocation } from 'react-router';
import {
  BilanSclSortBy,
  BilanSteuSortBy,
  CURRENT_BILAN_YEAR,
  FIRST_BILAN_YEAR,
  listBilanScl,
  listBilanSteu,
  type IntervenantDetailDto,
  type RouteQuery,
} from '@lib/dossier';
import { Notice } from '@codegouvfr/react-dsfr/Notice';
import { Alert } from '@codegouvfr/react-dsfr/Alert';
import { Pagination } from '@codegouvfr/react-dsfr/Pagination';
import { RadioButtons } from '@codegouvfr/react-dsfr/RadioButtons';
import { Select } from '@codegouvfr/react-dsfr/Select';
import { Button } from '@codegouvfr/react-dsfr/Button';
import { Tooltip } from '@codegouvfr/react-dsfr/Tooltip';
import { useBilanFilters, type SortByValue } from '../../../hooks/useBilanFilters';
import {
  useBilanScl,
  useBilanSclDetail,
  useBilanSteu,
  useBilanSteuDetail,
  useBilanSteuParametres,
} from '../../../hooks/useBilan';
import { usePointsMesure } from '../../../hooks/usePointsMesure';
import { useAsyncOuvragesSearch } from '../../../hooks/useAsyncOuvragesSearch';
import { useAsyncSystemesCollecteSearch } from '../../../hooks/useAsyncSystemesCollecteSearch';
import { useCsvExportDownload } from '../../../hooks/useCsvExportDownload';
import { downloadBilanSclExport, downloadBilanSteuExport } from '../../../api/bilan';
import { buildPointMesureLabel } from '../../../helper/pointMesureLabel';
import { formatOption } from '../../../helper/optionsFormatter';
import { BILAN_PAGE_SIZE, buildBilanPageHref } from '../../../helper/bilanUrlFilters';
import { SelectAutocomplete, type AutocompleteOption } from '../../../components/SelectAutocomplete';
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
import { FixedHeightTable } from '../../../components/common/FixedHeightTable';

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
  const { filters, updateFilter, searchParams, yearError } = useBilanFilters();
  const { hash } = useLocation();
  const { page } = filters;
  const pageSize = BILAN_PAGE_SIZE;
  const isScl = filters.mode === 'scl';
  const currentOuvrageValue = isScl ? filters.systemeCollecteCode : filters.ouvrageDepollutionCode;
  const hasOuvrageSelected = currentOuvrageValue !== '';
  const canFetchList = hasOuvrageSelected && !yearError;
  const yearOptions = [CURRENT_BILAN_YEAR, FIRST_BILAN_YEAR];
  const [ouvrageSearch, setOuvrageSearch] = useState('');
  const [sclSearch, setSclSearch] = useState('');

  // External navigation restores the selection and clears obsolete search drafts.
  useEffect(() => {
    setOuvrageSearch('');
    setSclSearch('');
  }, [currentOuvrageValue, isScl]);

  const { data: parametres = [], isLoading: parametresLoading } = useBilanSteuParametres();
  const { data: ouvrages = [], isFetching: ouvragesLoading } = useAsyncOuvragesSearch(ouvrageSearch);
  const { data: systemesCollecte = [], isFetching: systemesCollecteLoading } =
    useAsyncSystemesCollecteSearch(sclSearch);
  const { data: steuDetail } = useBilanSteuDetail(filters.ouvrageDepollutionCode, !isScl);
  const { data: sclDetail } = useBilanSclDetail(filters.systemeCollecteCode, isScl);
  const { data: pmos = [] } = usePointsMesure('scl', isScl ? filters.systemeCollecteCode : null);
  const detail = isScl ? sclDetail : steuDetail;

  const steuSortBy = BilanSteuSortBy.safeParse(filters.sortBy).data;
  const sclSortBy = BilanSclSortBy.safeParse(filters.sortBy).data;
  const steuQuery: RouteQuery<typeof listBilanSteu> = {
    page,
    pageSize,
    year: filters.year,
    ...(filters.ouvrageDepollutionCode ? { ouvrageDepollutionCode: filters.ouvrageDepollutionCode } : {}),
    ...(filters.parametreCode ? { parametreCode: filters.parametreCode } : {}),
    ...(steuSortBy ? { sortBy: steuSortBy } : {}),
    ...(filters.sortOrder ? { sortOrder: filters.sortOrder } : {}),
  };
  const sclQuery: RouteQuery<typeof listBilanScl> = {
    page,
    pageSize,
    year: filters.year,
    ...(filters.systemeCollecteCode ? { systemeCollecteCode: filters.systemeCollecteCode } : {}),
    ...(filters.pointMesureId ? { pointMesureId: Number(filters.pointMesureId) } : {}),
    ...(filters.statut ? { statut: filters.statut } : {}),
    ...(sclSortBy ? { sortBy: sclSortBy } : {}),
    ...(filters.sortOrder ? { sortOrder: filters.sortOrder } : {}),
  };
  const steuList = useBilanSteu(steuQuery, !isScl && canFetchList);
  const sclList = useBilanScl(sclQuery, isScl && canFetchList);
  const activeList = isScl ? sclList : steuList;
  const isListPending = canFetchList && activeList.isPending;
  const isListFetching = canFetchList && activeList.isFetching;
  const listError = canFetchList && activeList.isError;
  const showResults = canFetchList && !listError;
  const total = showResults ? (activeList.data?.total ?? 0) : 0;
  const tableData = isScl
    ? buildBilanSclTableRows(showResults ? (sclList.data?.data ?? []) : [])
    : buildBilanSteuTableRows(showResults ? (steuList.data?.data ?? []) : []);

  const resultTotal = activeList.data?.total;
  const isPlaceholder = activeList.isPlaceholderData;
  const isSuccess = activeList.isSuccess;
  useEffect(() => {
    if (!canFetchList || !isSuccess || isPlaceholder || resultTotal === undefined) {
      return;
    }
    const lastPage = Math.max(1, Math.ceil(resultTotal / BILAN_PAGE_SIZE));
    if (page > lastPage) {
      updateFilter({ page: lastPage }, 'replace');
    }
  }, [canFetchList, isSuccess, isPlaceholder, resultTotal, page, updateFilter]);

  const steuExport = useCsvExportDownload(downloadBilanSteuExport);
  const sclExport = useCsvExportDownload(downloadBilanSclExport);
  const { isLoading: isExportLoading, downloadError, setDownloadError } = isScl ? sclExport : steuExport;
  const canExport = showResults && !isListPending && !isListFetching && total > 0;
  const handleExport = () => {
    if (!canExport) {
      return;
    }
    if (isScl) {
      void sclExport.download(sclQuery, `bilan-scl-${filters.year}.csv`);
    } else {
      void steuExport.download(steuQuery, `bilan-steu-${filters.year}.csv`);
    }
  };

  const ouvragesOptions: AutocompleteOption[] = isScl
    ? systemesCollecte.map((s) => ({
        value: s.systemeCollecteCode,
        label: s.systemeCollecteNom ?? s.systemeCollecteCode,
      }))
    : ouvrages.map((o) => ({
        value: o.ouvrageDepollutionCode,
        label: o.ouvrageDepollutionNom ?? o.ouvrageDepollutionCode,
      }));
  if (hasOuvrageSelected && !ouvragesOptions.some((option) => option.value === currentOuvrageValue)) {
    const name = isScl ? sclDetail?.systemeCollecteNom : steuDetail?.ouvrageDepollutionNom;
    ouvragesOptions.push({ value: currentOuvrageValue, label: name ?? currentOuvrageValue });
  }
  const ouvragesLoadingCurrent = isScl ? systemesCollecteLoading : ouvragesLoading;
  const pointMesureOptions = pmos.map((p) => ({ value: String(p.pointMesureId), label: buildPointMesureLabel(p) }));
  const parametreOptions = parametres.map((option) =>
    formatOption({
      elementNomenclatureCode: option.parametreAnalyseCode,
      elementNomenclatureLibelle: option.parametreNomCourt,
    }),
  );
  const handleOuvrageChange = (value: string | null) => {
    setOuvrageSearch('');
    setSclSearch('');
    updateFilter(isScl ? { systemeCollecteCode: value ?? '' } : { ouvrageDepollutionCode: value ?? '' });
  };
  const handleDateSort = (sortBy: SortByValue, sortOrder: 'ASC' | 'DESC') => updateFilter({ sortBy, sortOrder });

  let headers;
  if (isScl) {
    headers = buildBilanSclTableHeaders().map((header) => {
      if (header.property !== 'date') {
        return header.label;
      }

      return (
        <SortableHeader<SortByValue>
          key="date"
          label={header.label}
          field="date"
          sortBy={filters.sortBy}
          sortOrder={filters.sortOrder}
          onSort={handleDateSort}
        />
      );
    });
  } else {
    headers = buildBilanSteuTableHeaders().map((header) => {
      if (header.property === 'hcnf') {
        return (
          <span key="hcnf">
            {header.label} <Tooltip title="Hors condition normale de fonctionnement (Débit A3 > Débit de référence)" />
          </span>
        );
      }

      if (header.property !== 'date') {
        return header.label;
      }

      return (
        <SortableHeader<SortByValue>
          key="date"
          label={header.label}
          field="date"
          sortBy={filters.sortBy}
          sortOrder={filters.sortOrder}
          onSort={handleDateSort}
        />
      );
    });
  }

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

      {listError && (
        <Alert
          severity="error"
          title="Erreur de chargement"
          description="Une erreur est survenue lors du chargement des bilans."
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
                  onChange: () => updateFilter({ mode: 'steu' }),
                },
              },
              {
                label: 'SCL',
                nativeInputProps: {
                  checked: filters.mode === 'scl',
                  onChange: () => updateFilter({ mode: 'scl' }),
                },
              },
            ]}
          />
        </div>
        <div className="fr-col-6 fr-col-lg-2 fr-col-xl-2">
          <Select
            label="Année"
            hint={<br />}
            state={yearError ? 'error' : 'default'}
            stateRelatedMessage={yearError}
            nativeSelectProps={{
              value: filters.year.toString(),
              onChange: (e: ChangeEvent<HTMLSelectElement>) => updateFilter({ year: parseInt(e.target.value) }),
            }}
          >
            {yearError && <option value={filters.year}>{filters.year} (indisponible)</option>}
            {yearOptions.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </Select>
        </div>
        <div className={`fr-col-12 fr-col-lg-4 ${isScl ? 'fr-col-xl-4' : 'fr-col-xl-5'}`}>
          <SelectAutocomplete
            label={isScl ? 'Système de collecte' : 'Station'}
            hintText={ouvragesLoadingCurrent ? 'Recherche en cours...' : 'Saisissez au moins 2 caractères'}
            placeholder={isScl ? 'Rechercher un SCL' : 'Rechercher une station'}
            options={ouvragesOptions}
            value={currentOuvrageValue || null}
            onChange={handleOuvrageChange}
            onInputChange={isScl ? setSclSearch : setOuvrageSearch}
            clientSideFilter={false}
            isFetching={ouvragesLoadingCurrent}
          />
        </div>
        {!isScl && (
          <div className="fr-col-12 fr-col-lg-3 fr-col-xl-3">
            <SelectAutocomplete
              label="Paramètre"
              hintText={<br />}
              placeholder={parametresLoading ? 'Chargement…' : 'Tous les paramètres'}
              options={parametreOptions}
              value={filters.parametreCode || null}
              onChange={(value) => updateFilter({ parametreCode: value ?? '' })}
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
                onChange={(value) => updateFilter({ pointMesureId: value ?? '' })}
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

      {detail && (
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

      <TableLoader isLoading={isListPending} isFetching={isListFetching} hasOuvrageSelected={hasOuvrageSelected}>
        <div className={fr.cx('fr-mb-2w')} style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Button type="button" priority="secondary" onClick={handleExport} disabled={!canExport || isExportLoading}>
            Exporter CSV
          </Button>
        </div>
        <FixedHeightTable
          data={tableData}
          headers={headers}
          isFetching={isListFetching}
          pageSize={pageSize}
          rowHeight="one-line"
        />
        {Math.ceil(total / pageSize) > 1 && (
          <Pagination
            key={page}
            count={Math.ceil(total / pageSize)}
            defaultPage={page}
            getPageLinkProps={(pageNumber: number) => ({
              href: buildBilanPageHref(searchParams, pageNumber, hash),
              onClick: (e: React.MouseEvent<HTMLAnchorElement>) => {
                e.preventDefault();
                updateFilter({ page: pageNumber });
              },
            })}
          />
        )}
      </TableLoader>
    </div>
  );
};
