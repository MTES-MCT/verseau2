import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { searchSystemesCollecte } from '../api/mesures';

export function useAsyncSystemesCollecteSearch(search: string) {
  const normalizedSearch = search.trim();
  const [debouncedSearch, setDebouncedSearch] = useState(normalizedSearch);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => setDebouncedSearch(normalizedSearch), 300);
    return () => window.clearTimeout(timeoutId);
  }, [normalizedSearch]);

  return useQuery({
    queryKey: ['mesures-systemes-collecte-search', debouncedSearch],
    queryFn: () => searchSystemesCollecte(debouncedSearch),
    enabled: debouncedSearch.length >= 2,
  });
}
