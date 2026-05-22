import { useState } from 'react';
import { getStartOfPreviousYearAsISODate, getEndOfPreviousYearAsISODate } from '@lib/shared';
import type { MesuresSortByValue, OuvrageTypeValue } from '@lib/dossier';
import { useMesures } from './useMesures';
import { usePointsMesure } from './usePointsMesure';
import { useParametresMesure } from './useParametresMesure';
import { useFinalites } from './useFinalites';
import { useStatuts } from './useStatuts';
import { useQualifications } from './useQualifications';
import { useAsyncOuvragesSearch } from './useAsyncOuvragesSearch';
import { useAsyncSystemesCollecteSearch } from './useAsyncSystemesCollecteSearch';

const PAGE_SIZE = 20;

interface FilterState {
  ouvrageType: OuvrageTypeValue;
  selectedOuvrageCode: string;
  selectedPmoCdn: number | null;
  selectedParametre: string;
  dateDebut: string;
  dateFin: string;
  finalite: string;
  statut: string;
  qualification: string;
  sortBy?: MesuresSortByValue;
  sortOrder?: 'ASC' | 'DESC';
}

const INITIAL_FILTERS: FilterState = {
  ouvrageType: 'steu',
  selectedOuvrageCode: '',
  selectedPmoCdn: null,
  selectedParametre: '',
  dateDebut: getStartOfPreviousYearAsISODate(),
  dateFin: getEndOfPreviousYearAsISODate(),
  finalite: '',
  statut: '',
  qualification: '',
  sortBy: undefined,
  sortOrder: undefined,
};

export function useMesureFilters() {
  const [form, setForm] = useState<FilterState>(INITIAL_FILTERS);
  const [submitted, setSubmitted] = useState<FilterState>(INITIAL_FILTERS);
  const [hasSearched, setHasSearched] = useState(false);
  const [page, setPage] = useState(1);
  const [ouvrageError, setOuvrageError] = useState<string>('');
  const [ouvrageSearch, setOuvrageSearch] = useState('');
  const [sclSearch, setSclSearch] = useState('');

  const { data: ouvrages = [], isLoading: ouvragesLoading } = useAsyncOuvragesSearch(ouvrageSearch);
  const { data: systemesCollecte = [], isLoading: systemesCollecteLoading } = useAsyncSystemesCollecteSearch(sclSearch);
  const { data: pointsMesure = [], isLoading: pointsMesureLoading } = usePointsMesure(
    form.ouvrageType,
    form.selectedOuvrageCode || null,
  );
  const { data: parametres = [], isLoading: parametresLoading } = useParametresMesure(
    form.ouvrageType,
    form.selectedOuvrageCode || null,
    form.selectedPmoCdn,
  );
  const { data: finalites = [], isLoading: finalitesLoading } = useFinalites();
  const { data: statuts = [], isLoading: statutsLoading } = useStatuts();
  const { data: qualifications = [], isLoading: qualificationsLoading } = useQualifications();

  const submittedQuery = {
    ouvrageType: submitted.ouvrageType,
    ...(submitted.ouvrageType === 'scl'
      ? submitted.selectedOuvrageCode
        ? { sclSandreCdas: [submitted.selectedOuvrageCode] }
        : {}
      : submitted.selectedOuvrageCode
        ? { steuSandreCdas: [submitted.selectedOuvrageCode] }
        : {}),
    ...(submitted.selectedPmoCdn !== null ? { pmoCdn: submitted.selectedPmoCdn } : {}),
    ...(submitted.selectedParametre ? { parametreCode: submitted.selectedParametre } : {}),
    ...(submitted.dateDebut ? { dateDebut: submitted.dateDebut } : {}),
    ...(submitted.dateFin ? { dateFin: submitted.dateFin } : {}),
    ...(submitted.finalite ? { finalite: submitted.finalite } : {}),
    ...(submitted.statut ? { statut: submitted.statut } : {}),
    ...(submitted.qualification ? { qualification: submitted.qualification } : {}),
    ...(submitted.sortBy ? { sortBy: submitted.sortBy } : {}),
    ...(submitted.sortOrder ? { sortOrder: submitted.sortOrder } : {}),
    page,
    pageSize: PAGE_SIZE,
  };

  const { data, isLoading, isFetching, error } = useMesures(submittedQuery, hasSearched);

  const totalPages = data ? Math.ceil(data.total / PAGE_SIZE) : 0;

  const advancedFilterCount = [form.finalite, form.statut, form.qualification].filter(Boolean).length;

  function handleSearch() {
    if (!form.selectedOuvrageCode) {
      setOuvrageError(
        form.ouvrageType === 'scl'
          ? 'Veuillez sélectionner au moins un système de collecte.'
          : 'Veuillez sélectionner au moins une station.',
      );
      return;
    }
    setSubmitted(form);
    setHasSearched(true);
    setPage(1);
  }

  function updateOuvrageType(ouvrageType: OuvrageTypeValue) {
    setOuvrageError('');
    setOuvrageSearch('');
    setSclSearch('');
    setForm({
      ...INITIAL_FILTERS,
      ouvrageType,
      dateDebut: form.dateDebut,
      dateFin: form.dateFin,
    });
  }

  function updateForm(field: Exclude<keyof FilterState, 'selectedPmoCdn' | 'ouvrageType'>, value: string) {
    if (field === 'selectedOuvrageCode') {
      if (form.ouvrageType === 'scl') {
        setOuvrageSearch('');
        setSclSearch(value);
      } else {
        setSclSearch('');
        setOuvrageSearch(value);
      }
    }

    setForm((f) => {
      // Cascade: changement d'ouvrage → reset PMO + paramètre
      if (field === 'selectedOuvrageCode') {
        if (value) {
          setOuvrageError('');
        }
        return { ...f, selectedOuvrageCode: value, selectedPmoCdn: null, selectedParametre: '' };
      }
      return { ...f, [field]: value };
    });
  }

  function updateSelectedPmo(pmoCdn: number | null) {
    setForm((f) => ({ ...f, selectedPmoCdn: pmoCdn, selectedParametre: '' }));
  }

  function setSort(sortBy: MesuresSortByValue, sortOrder: 'ASC' | 'DESC') {
    setForm((f) => ({ ...f, sortBy, sortOrder }));
    setSubmitted((s) => ({ ...s, sortBy, sortOrder }));
    setPage(1);
  }

  return {
    form,
    submitted,
    submittedQuery,
    hasSearched,
    updateForm,
    updateOuvrageType,
    updateSelectedPmo,
    handleSearch,
    setSort,
    ouvrages,
    ouvragesLoading,
    ouvrageSearch,
    setOuvrageSearch,
    systemesCollecte,
    systemesCollecteLoading,
    sclSearch,
    setSclSearch,
    ouvrageError,
    pointsMesure,
    pointsMesureLoading,
    parametres,
    parametresLoading,
    finalites,
    finalitesLoading,
    statuts,
    statutsLoading,
    qualifications,
    qualificationsLoading,
    data,
    isLoading,
    isFetching,
    error,
    page,
    setPage,
    totalPages,
    PAGE_SIZE,
    advancedFilterCount,
  };
}
