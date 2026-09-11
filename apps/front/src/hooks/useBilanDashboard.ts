import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router';
import {
  CURRENT_BILAN_YEAR,
  FIRST_BILAN_YEAR,
  type BilanSclSortByValue,
  type BilanSteuSortByValue,
  type RouteQuery,
  listBilanScl,
  listBilanSteu,
} from '@lib/dossier';
import { useBilanFilters, type SortByValue } from './useBilanFilters';
import {
  useBilanScl,
  useBilanSclDetail,
  useBilanSteu,
  useBilanSteuDetail,
  useBilanSteuParametres,
} from './useBilan';
import { usePointsMesure } from './usePointsMesure';
import { useAsyncOuvragesSearch } from './useAsyncOuvragesSearch';
import { useAsyncSystemesCollecteSearch } from './useAsyncSystemesCollecteSearch';
import { useCsvExportDownload } from './useCsvExportDownload';
import { downloadBilanSclExport, downloadBilanSteuExport } from '../api/bilan';
import { buildPointMesureLabel } from '../helper/pointMesureLabel';
import { formatOption } from '../helper/optionsFormatter';
import { BILAN_PAGE_SIZE, buildBilanPageHref } from '../helper/bilanUrlFilters';
import type { AutocompleteOption } from '../components/SelectAutocomplete';

export type BilanResourceStatus = 'idle' | 'loading' | 'ready' | 'unavailable' | 'error';

export const BILAN_UNAVAILABLE_MESSAGE =
  'L’ouvrage demandé est indisponible ou vous n’êtes pas autorisé à y accéder. Modifiez ou effacez votre sélection.';

type SteuQuery = RouteQuery<typeof listBilanSteu>;
type SclQuery = RouteQuery<typeof listBilanScl>;

/**
 * Orchestrates Bilan URL state, resource validation, API queries and display state.
 * The dashboard component primarily composes controls, alerts, resource details and the table.
 */
export const useBilanDashboard = () => {
  const {
    filters,
    updateFilter,
    page,
    setPage,
    commitFilters,
    searchParams,
    issues,
    normalizationWarnings,
    dismissNormalizationWarnings,
  } = useBilanFilters();
  const locationHash = useLocation().hash;

  const [ouvrageSearch, setOuvrageSearch] = useState('');
  const [sclSearch, setSclSearch] = useState('');

  const isScl = filters.mode === 'scl';
  const currentOuvrageValue = isScl ? filters.systemeCollecteCode : filters.ouvrageDepollutionCode;
  const hasOuvrageSelected = currentOuvrageValue !== '';

  // Clear obsolete autocomplete drafts when external navigation changes the selection.
  useEffect(() => {
    setOuvrageSearch('');
    setSclSearch('');
  }, [currentOuvrageValue, isScl]);

  const yearOptions = useMemo(
    () =>
      [CURRENT_BILAN_YEAR, CURRENT_BILAN_YEAR - 1]
        .filter((year, index, years) => year >= FIRST_BILAN_YEAR && years.indexOf(year) === index)
        .map((year) => year.toString()),
    [],
  );

  const { data: parametres = [], isLoading: parametresLoading } = useBilanSteuParametres();
  const { data: ouvrages = [], isFetching: ouvragesLoading } = useAsyncOuvragesSearch(ouvrageSearch);
  const { data: systemesCollecte = [], isFetching: systemesCollecteLoading } =
    useAsyncSystemesCollecteSearch(sclSearch);

  const hasBlockingIssues = issues.length > 0;

  const steuDetailQuery = useBilanSteuDetail(
    !isScl && hasOuvrageSelected ? filters.ouvrageDepollutionCode : null,
    !isScl && hasOuvrageSelected,
  );
  const sclDetailQuery = useBilanSclDetail(
    isScl && hasOuvrageSelected ? filters.systemeCollecteCode : null,
    isScl && hasOuvrageSelected,
  );

  const steuDetail = !isScl ? steuDetailQuery.data : undefined;
  const sclDetail = isScl ? sclDetailQuery.data : undefined;
  const detailQuery = isScl ? sclDetailQuery : steuDetailQuery;

  const sclParentReady = isScl && hasOuvrageSelected && sclDetail !== undefined && sclDetail !== null;
  const { data: pmos = [], isPending: pmosPending, isError: pmosError, refetch: refetchPmos } = usePointsMesure(
    'scl',
    sclParentReady ? filters.systemeCollecteCode : null,
  );

  const resourceStatus: BilanResourceStatus = (() => {
    if (!hasOuvrageSelected) {
      return 'idle';
    }
    if (detailQuery.isPending) {
      return 'loading';
    }
    if (detailQuery.data) {
      if (isScl) {
        if (pmosPending) {
          return 'loading';
        }
        if (pmosError) {
          return 'error';
        }
        if (filters.pointMesureId !== '' && !pmos.some((p) => String(p.pointMesureId) === filters.pointMesureId)) {
          return 'unavailable';
        }
      }
      return 'ready';
    }
    if (detailQuery.isError) {
      return 'error';
    }
    return 'unavailable';
  })();

  const canFetchList = hasOuvrageSelected && !hasBlockingIssues && resourceStatus === 'ready';

  const steuQuery: SteuQuery = {
    page,
    pageSize: BILAN_PAGE_SIZE,
    year: filters.year,
    ...(filters.ouvrageDepollutionCode ? { ouvrageDepollutionCode: filters.ouvrageDepollutionCode } : {}),
    ...(filters.parametreCode ? { parametreCode: filters.parametreCode } : {}),
    ...(filters.sortBy ? { sortBy: filters.sortBy as BilanSteuSortByValue } : {}),
    ...(filters.sortOrder ? { sortOrder: filters.sortOrder } : {}),
  };

  const sclQuery: SclQuery = {
    page,
    pageSize: BILAN_PAGE_SIZE,
    year: filters.year,
    ...(filters.systemeCollecteCode ? { systemeCollecteCode: filters.systemeCollecteCode } : {}),
    ...(filters.pointMesureId ? { pointMesureId: Number(filters.pointMesureId) } : {}),
    ...(filters.statut ? { statut: filters.statut } : {}),
    ...(filters.sortBy ? { sortBy: filters.sortBy as BilanSclSortByValue } : {}),
    ...(filters.sortOrder ? { sortOrder: filters.sortOrder } : {}),
  };

  const steuListQuery = useBilanSteu(steuQuery, !isScl && canFetchList);
  const sclListQuery = useBilanScl(sclQuery, isScl && canFetchList);
  const activeListQuery = isScl ? sclListQuery : steuListQuery;

  // Never expose cached or placeholder rows while the selection is pending or invalid.
  const displayData = canFetchList ? activeListQuery.data : undefined;
  const isListPending = canFetchList && activeListQuery.isPending;
  const isListFetching = canFetchList && activeListQuery.isFetching;

  // When a successful (non-placeholder) response proves the page is beyond the last page,
  // replace it with the last valid page — or page 1 for empty results.
  const total = displayData?.total;
  const isPlaceholder = activeListQuery.isPlaceholderData;
  useEffect(() => {
    if (!canFetchList || total === undefined || isPlaceholder) {
      return;
    }
    if (total === 0) {
      if (page !== 1) {
        commitFilters({ page: 1 }, 'replace');
      }
      return;
    }
    const lastPage = Math.ceil(total / BILAN_PAGE_SIZE);
    if (page > lastPage) {
      commitFilters({ page: lastPage }, 'replace');
    }
  }, [canFetchList, total, isPlaceholder, page, commitFilters]);

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

  const isExportLoading = isScl ? isSclExportLoading : isSteuExportLoading;
  const downloadError = isScl ? sclDownloadError : steuDownloadError;
  const setDownloadError = isScl ? setSclDownloadError : setSteuDownloadError;
  const canExport = canFetchList && !isListPending && !isListFetching && (displayData?.total ?? 0) > 0;

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

  const resolvedOuvrageNom = isScl ? sclDetail?.systemeCollecteNom : steuDetail?.ouvrageDepollutionNom;
  const searchOptions: AutocompleteOption[] = isScl
    ? systemesCollecte.map((s) => ({
        value: s.systemeCollecteCode,
        label: s.systemeCollecteNom ?? s.systemeCollecteCode,
      }))
    : ouvrages.map((o) => ({
        value: o.ouvrageDepollutionCode,
        label: o.ouvrageDepollutionNom ?? o.ouvrageDepollutionCode,
      }));
  // Keep the requested code visible while unresolved or unavailable, without inventing a suggestion.
  const ouvragesOptions: AutocompleteOption[] =
    currentOuvrageValue !== '' && !searchOptions.some((option) => option.value === currentOuvrageValue)
      ? [...searchOptions, { value: currentOuvrageValue, label: resolvedOuvrageNom ?? currentOuvrageValue }]
      : searchOptions;

  const ouvragesLoadingCurrent = isScl ? systemesCollecteLoading : ouvragesLoading;

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
    setOuvrageSearch('');
    setSclSearch('');
    if (isScl) {
      updateFilter({ systemeCollecteCode: newVal });
    } else {
      updateFilter({ ouvrageDepollutionCode: newVal });
    }
  };

  const handlePointMesureChange = (value: string | null) => {
    updateFilter({ pointMesureId: value ?? '' });
  };

  const handleModeChange = (mode: 'steu' | 'scl') => {
    setOuvrageSearch('');
    setSclSearch('');
    updateFilter({ mode });
  };

  const handleParametreChange = (value: string | null) => {
    updateFilter({ parametreCode: value ?? '' });
  };

  const handleDateSort = (nextSortBy: SortByValue, nextSortOrder: 'ASC' | 'DESC') => {
    updateFilter({ sortBy: nextSortBy, sortOrder: nextSortOrder });
  };

  const retryResource = () => {
    void detailQuery.refetch();
    if (isScl && sclParentReady) {
      void refetchPmos();
    }
  };

  const getPageHref = (pageNumber: number) => buildBilanPageHref(searchParams, pageNumber, locationHash);

  return {
    filters,
    updateFilter,
    page,
    setPage,
    pageSize: BILAN_PAGE_SIZE,
    issues,
    normalizationWarnings,
    dismissNormalizationWarnings,
    isScl,
    hasOuvrageSelected,
    currentOuvrageValue,
    yearOptions,
    ouvrageSearch,
    setOuvrageSearch,
    sclSearch,
    setSclSearch,
    ouvragesOptions,
    ouvragesLoadingCurrent,
    pointMesureOptions,
    parametreOptions,
    parametresLoading,
    resourceStatus,
    detail: isScl ? sclDetail : steuDetail,
    steuDetail: !isScl ? steuDetail : undefined,
    sclDetail: isScl ? sclDetail : undefined,
    retryResource,
    steuQuery,
    sclQuery,
    displayData,
    total: displayData?.total ?? 0,
    isListPending,
    isListFetching,
    canExport,
    isExportLoading,
    downloadError,
    setDownloadError,
    handleExport,
    handleOuvrageChange,
    handlePointMesureChange,
    handleModeChange,
    handleParametreChange,
    handleDateSort,
    getPageHref,
  };
};
