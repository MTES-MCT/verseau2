import { useState } from 'react';
import { getNYearsAgoAsISODate, getTodayAsISODate } from '@lib/shared';
import { useMesures } from './useMesures';
import { useOuvrages } from './useOuvrages';
import { usePointsMesure } from './usePointsMesure';
import { useParametresMesure } from './useParametresMesure';
import { useFinalites } from './useFinalites';

const PAGE_SIZE = 20;

interface FilterState {
  selectedSteu: string;
  selectedPmoCdn: number | null;
  selectedParametre: string;
  dateDebut: string;
  dateFin: string;
  finalite: string;
}

const INITIAL_FILTERS: FilterState = {
  selectedSteu: '',
  selectedPmoCdn: null,
  selectedParametre: '',
  dateDebut: getNYearsAgoAsISODate(1),
  dateFin: getTodayAsISODate(),
  finalite: '',
};

export function useMesureFilters() {
  const [form, setForm] = useState<FilterState>(INITIAL_FILTERS);
  const [submitted, setSubmitted] = useState<FilterState>(INITIAL_FILTERS);
  const [hasSearched, setHasSearched] = useState(false);
  const [page, setPage] = useState(1);
  const [ouvrageError, setOuvrageError] = useState<string>('');

  const { data: ouvrages = [], isLoading: ouvragesLoading } = useOuvrages();
  const { data: pointsMesure = [], isLoading: pointsMesureLoading } = usePointsMesure(form.selectedSteu || null);
  const { data: parametres = [], isLoading: parametresLoading } = useParametresMesure(
    form.selectedSteu || null,
    form.selectedPmoCdn,
  );
  const { data: finalites = [], isLoading: finalitesLoading } = useFinalites();

  const query = {
    ...(submitted.selectedSteu ? { steuSandreCdas: [submitted.selectedSteu] } : {}),
    ...(submitted.selectedPmoCdn !== null ? { pmoCdn: submitted.selectedPmoCdn } : {}),
    ...(submitted.selectedParametre ? { parametreCode: submitted.selectedParametre } : {}),
    ...(submitted.dateDebut ? { dateDebut: submitted.dateDebut } : {}),
    ...(submitted.dateFin ? { dateFin: submitted.dateFin } : {}),
    ...(submitted.finalite ? { finalite: submitted.finalite } : {}),
    page,
    pageSize: PAGE_SIZE,
  };
  console.log('Mesure filters query', query);

  const { data, isLoading, isFetching, error } = useMesures(query, hasSearched);

  const totalPages = data ? Math.ceil(data.total / PAGE_SIZE) : 0;

  function handleSearch() {
    if (!form.selectedSteu) {
      setOuvrageError('Veuillez sélectionner au moins un ouvrage.');
      return;
    }
    setSubmitted(form);
    setHasSearched(true);
    setPage(1);
  }

  function updateForm(field: Exclude<keyof FilterState, 'selectedPmoCdn'>, value: string) {
    setForm((f) => {
      // Cascade: changement d'ouvrage → reset PMO + paramètre
      if (field === 'selectedSteu') {
        if (value) {
          setOuvrageError('');
        }
        return { ...f, selectedSteu: value, selectedPmoCdn: null, selectedParametre: '' };
      }
      return { ...f, [field]: value };
    });
  }

  function updateSelectedPmo(pmoCdn: number | null) {
    setForm((f) => ({ ...f, selectedPmoCdn: pmoCdn, selectedParametre: '' }));
  }

  return {
    form,
    updateForm,
    updateSelectedPmo,
    handleSearch,
    ouvrages,
    ouvragesLoading,
    ouvrageError,
    pointsMesure,
    pointsMesureLoading,
    parametres,
    parametresLoading,
    finalites,
    finalitesLoading,
    data,
    isLoading,
    isFetching,
    error,
    page,
    setPage,
    totalPages,
    PAGE_SIZE,
  };
}
