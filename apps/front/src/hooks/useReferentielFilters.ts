import { useState } from 'react';
import { getNYearsAgoAsISODate, getTodayAsISODate } from '@lib/shared';
import type { OuvrageTypeValue, TypePointMesureValue } from '@lib/dossier';
import { useSystemesCollecte } from './useSystemesCollecte';
import { usePointsMesureReferentiel } from './usePointsMesureReferentiel';
import { useAsyncOuvragesSearch } from './useAsyncOuvragesSearch';

interface FilterState {
  ouvrageType: OuvrageTypeValue;
  selectedOuvrageCode: string;
  dateDebut: string;
  dateFin: string;
  reglementaire: boolean;
  logique: boolean;
}

const INITIAL_FILTERS: FilterState = {
  ouvrageType: 'steu',
  selectedOuvrageCode: '',
  dateDebut: getNYearsAgoAsISODate(1),
  dateFin: getTodayAsISODate(),
  reglementaire: true,
  logique: true,
};

export function useReferentielFilters() {
  const [form, setForm] = useState<FilterState>(INITIAL_FILTERS);
  const [submitted, setSubmitted] = useState<FilterState>(INITIAL_FILTERS);
  const [hasSearched, setHasSearched] = useState(false);
  const [ouvrageError, setOuvrageError] = useState<string>('');
  const [ouvrageSearch, setOuvrageSearch] = useState('');

  const { data: ouvrages = [], isLoading: ouvragesLoading } = useAsyncOuvragesSearch(ouvrageSearch);
  const { data: systemesCollecte = [], isLoading: systemesCollecteLoading } = useSystemesCollecte();

  function toTypePoint(reglementaire: boolean, logique: boolean): TypePointMesureValue {
    if (reglementaire && !logique) {
      return 'reglementaire';
    }
    if (logique && !reglementaire) {
      return 'logique';
    }
    return 'tous';
  }

  const query = {
    ouvrageType: submitted.ouvrageType,
    ouvrageCode: submitted.selectedOuvrageCode,
    typePoint: toTypePoint(submitted.reglementaire, submitted.logique),
    ...(submitted.dateDebut ? { dateDebut: submitted.dateDebut } : {}),
    ...(submitted.dateFin ? { dateFin: submitted.dateFin } : {}),
  };

  const { data, isLoading, isFetching, error } = usePointsMesureReferentiel(
    query,
    hasSearched && !!submitted.selectedOuvrageCode,
  );

  function handleSearch() {
    if (!form.selectedOuvrageCode) {
      setOuvrageError(
        form.ouvrageType === 'scl'
          ? 'Veuillez s\u00e9lectionner au moins un syst\u00e8me de collecte.'
          : 'Veuillez s\u00e9lectionner au moins une station.',
      );
      return;
    }
    setSubmitted(form);
    setHasSearched(true);
  }

  function updateOuvrageType(ouvrageType: OuvrageTypeValue) {
    setOuvrageError('');
    setOuvrageSearch('');
    setForm({
      ...INITIAL_FILTERS,
      ouvrageType,
      dateDebut: form.dateDebut,
      dateFin: form.dateFin,
      reglementaire: form.reglementaire,
      logique: form.logique,
    });
  }

  function updateForm(field: Exclude<keyof FilterState, 'ouvrageType' | 'reglementaire' | 'logique'>, value: string) {
    if (field === 'selectedOuvrageCode') {
      setOuvrageSearch(value);
    }

    setForm((f) => {
      if (field === 'selectedOuvrageCode') {
        if (value) {
          setOuvrageError('');
        }
        return { ...f, selectedOuvrageCode: value };
      }
      return { ...f, [field]: value };
    });
  }

  function toggleCheckbox(field: 'reglementaire' | 'logique') {
    setForm((f) => ({ ...f, [field]: !f[field] }));
  }

  return {
    form,
    updateForm,
    updateOuvrageType,
    toggleCheckbox,
    handleSearch,
    ouvrages,
    ouvragesLoading,
    ouvrageSearch,
    setOuvrageSearch,
    systemesCollecte,
    systemesCollecteLoading,
    ouvrageError,
    data,
    isLoading,
    isFetching,
    error,
  };
}
