import { useState } from 'react';
import { useMesures } from './useMesures';
import { useOuvrages } from './useOuvrages';

const PAGE_SIZE = 20;

interface FilterState {
  selectedSteu: string;
  dateDebut: string;
  dateFin: string;
  parametreCode: string;
  qualification: string;
  finalite: string;
}

const INITIAL_FILTERS: FilterState = {
  selectedSteu: '',
  dateDebut: '',
  dateFin: '',
  parametreCode: '',
  qualification: '',
  finalite: '',
};

export function useMesureFilters() {
  const [form, setForm] = useState<FilterState>(INITIAL_FILTERS);
  const [submitted, setSubmitted] = useState<FilterState>(INITIAL_FILTERS);
  const [hasSearched, setHasSearched] = useState(false);
  const [page, setPage] = useState(1);

  const { data: ouvrages = [], isLoading: ouvragesLoading } = useOuvrages();

  const query = {
    ...(submitted.selectedSteu ? { steuSandreCdas: [submitted.selectedSteu] } : {}),
    ...(submitted.dateDebut ? { dateDebut: submitted.dateDebut } : {}),
    ...(submitted.dateFin ? { dateFin: submitted.dateFin } : {}),
    ...(submitted.parametreCode ? { parametreCode: submitted.parametreCode } : {}),
    ...(submitted.qualification ? { qualification: submitted.qualification } : {}),
    ...(submitted.finalite ? { finalite: submitted.finalite } : {}),
    page,
    pageSize: PAGE_SIZE,
  };

  const { data, isLoading, error } = useMesures(query, hasSearched);

  const totalPages = data ? Math.ceil(data.total / PAGE_SIZE) : 0;

  function handleSearch() {
    setSubmitted(form);
    setHasSearched(true);
    setPage(1);
  }

  function updateForm(field: keyof FilterState, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  return {
    form,
    updateForm,
    handleSearch,
    ouvrages,
    ouvragesLoading,
    data,
    isLoading,
    error,
    page,
    setPage,
    totalPages,
    PAGE_SIZE,
  };
}
