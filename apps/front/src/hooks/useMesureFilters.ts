import { useState } from 'react';
import { useMesures } from './useMesures';
import { useOuvrages } from './useOuvrages';
import { usePointsMesure } from './usePointsMesure';
import { useParametresMesure } from './useParametresMesure';

const PAGE_SIZE = 20;

interface FilterState {
  selectedSteu: string;
  selectedPmo: string;
  selectedParametre: string;
  dateDebut: string;
  dateFin: string;
  finalite: string;
}

const INITIAL_FILTERS: FilterState = {
  selectedSteu: '',
  selectedPmo: '',
  selectedParametre: '',
  dateDebut: '',
  dateFin: '',
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
    form.selectedPmo || null,
  );

  const query = {
    ...(submitted.selectedSteu ? { steuSandreCdas: [submitted.selectedSteu] } : {}),
    ...(submitted.selectedParametre ? { parametreCode: submitted.selectedParametre } : {}),
    ...(submitted.dateDebut ? { dateDebut: submitted.dateDebut } : {}),
    ...(submitted.dateFin ? { dateFin: submitted.dateFin } : {}),
    ...(submitted.finalite ? { finalite: submitted.finalite } : {}),
    page,
    pageSize: PAGE_SIZE,
  };

  const { data, isLoading, error } = useMesures(query, hasSearched);

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

  function updateForm(field: keyof FilterState, value: string) {
    setForm((f) => {
      // Cascade: changement d'ouvrage → reset PMO + paramètre
      if (field === 'selectedSteu') {
        if (value) setOuvrageError('');
        return { ...f, selectedSteu: value, selectedPmo: '', selectedParametre: '' };
      }
      // Cascade: changement de PMO → reset paramètre
      if (field === 'selectedPmo') {
        return { ...f, selectedPmo: value, selectedParametre: '' };
      }
      return { ...f, [field]: value };
    });
  }

  return {
    form,
    updateForm,
    handleSearch,
    ouvrages,
    ouvragesLoading,
    ouvrageError,
    pointsMesure,
    pointsMesureLoading,
    parametres,
    parametresLoading,
    data,
    isLoading,
    error,
    page,
    setPage,
    totalPages,
    PAGE_SIZE,
  };
}
