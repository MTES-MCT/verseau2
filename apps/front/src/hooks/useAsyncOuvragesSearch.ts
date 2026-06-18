import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { searchOuvrages } from '../api/mesures';

export function useAsyncOuvragesSearch(search: string) {
  const normalizedSearch = search.trim();
  const [debouncedSearch, setDebouncedSearch] = useState(normalizedSearch);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => setDebouncedSearch(normalizedSearch), 300);
    return () => window.clearTimeout(timeoutId);
  }, [normalizedSearch]);

  return useQuery({
    queryKey: ['mesures-ouvrages-search', debouncedSearch],
    queryFn: () => searchOuvrages(debouncedSearch),
    enabled: debouncedSearch.length >= 2,
    placeholderData: debouncedSearch.length >= 2 ? keepPreviousData : undefined,
  });
}
