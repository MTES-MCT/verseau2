import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { searchOuvrages, searchSystemesCollecte } from '../api/mesures';
import { useAsyncOuvragesSearch } from './useAsyncOuvragesSearch';
import { useAsyncSystemesCollecteSearch } from './useAsyncSystemesCollecteSearch';

vi.mock('../api/mesures', () => ({
  searchOuvrages: vi.fn(),
  searchSystemesCollecte: vi.fn(),
}));

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

function createDeferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((promiseResolve, promiseReject) => {
    resolve = promiseResolve;
    reject = promiseReject;
  });

  return { promise, resolve, reject };
}

async function resolveQuery<T>(deferred: ReturnType<typeof createDeferred<T>>, value: T) {
  await act(async () => {
    deferred.resolve(value);
    await deferred.promise;
    await vi.advanceTimersByTimeAsync(0);
  });
}

async function advanceDebounce() {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(300);
  });
}

describe('async autocomplete search hooks', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.mocked(searchOuvrages).mockReset();
    vi.mocked(searchSystemesCollecte).mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('keeps previous ouvrage options while the next valid search is pending', async () => {
    const previousOuvrages = [{ ouvrageDepollutionCode: '060123456789', ouvrageDepollutionNom: 'Lyon' }];
    const previousSearch = createDeferred<typeof previousOuvrages>();
    const nextSearch = createDeferred<typeof previousOuvrages>();
    vi.mocked(searchOuvrages).mockImplementation((search) => {
      if (search === 'ly') {
        return previousSearch.promise;
      }

      return nextSearch.promise;
    });

    const { result, rerender } = renderHook(({ search }) => useAsyncOuvragesSearch(search), {
      initialProps: { search: 'ly' },
      wrapper: createWrapper(),
    });

    expect(searchOuvrages).toHaveBeenCalledWith('ly');
    await resolveQuery(previousSearch, previousOuvrages);
    expect(result.current.data).toEqual(previousOuvrages);

    rerender({ search: 'lyo' });
    await advanceDebounce();

    expect(searchOuvrages).toHaveBeenCalledWith('lyo');
    expect(result.current.data).toEqual(previousOuvrages);
    expect(result.current.isPlaceholderData).toBe(true);
  });

  it('clears stale ouvrage options when the search becomes too short', async () => {
    const previousOuvrages = [{ ouvrageDepollutionCode: '060123456789', ouvrageDepollutionNom: 'Lyon' }];
    const previousSearch = createDeferred<typeof previousOuvrages>();
    vi.mocked(searchOuvrages).mockImplementation(() => previousSearch.promise);

    const { result, rerender } = renderHook(({ search }) => useAsyncOuvragesSearch(search), {
      initialProps: { search: 'ly' },
      wrapper: createWrapper(),
    });

    await resolveQuery(previousSearch, previousOuvrages);
    expect(result.current.data).toEqual(previousOuvrages);

    rerender({ search: 'l' });
    await advanceDebounce();

    expect(searchOuvrages).toHaveBeenCalledTimes(1);
    expect(result.current.data).toBeUndefined();
  });

  it('keeps previous systemes collecte options while the next valid search is pending', async () => {
    const previousSystemesCollecte = [{ systemeCollecteCode: '060123456789', systemeCollecteNom: 'Lyon' }];
    const previousSearch = createDeferred<typeof previousSystemesCollecte>();
    const nextSearch = createDeferred<typeof previousSystemesCollecte>();
    vi.mocked(searchSystemesCollecte).mockImplementation((search) => {
      if (search === 'ly') {
        return previousSearch.promise;
      }

      return nextSearch.promise;
    });

    const { result, rerender } = renderHook(({ search }) => useAsyncSystemesCollecteSearch(search), {
      initialProps: { search: 'ly' },
      wrapper: createWrapper(),
    });

    expect(searchSystemesCollecte).toHaveBeenCalledWith('ly');
    await resolveQuery(previousSearch, previousSystemesCollecte);
    expect(result.current.data).toEqual(previousSystemesCollecte);

    rerender({ search: 'lyo' });
    await advanceDebounce();

    expect(searchSystemesCollecte).toHaveBeenCalledWith('lyo');
    expect(result.current.data).toEqual(previousSystemesCollecte);
    expect(result.current.isPlaceholderData).toBe(true);
  });

  it('clears stale systemes collecte options when the search becomes too short', async () => {
    const previousSystemesCollecte = [{ systemeCollecteCode: '060123456789', systemeCollecteNom: 'Lyon' }];
    const previousSearch = createDeferred<typeof previousSystemesCollecte>();
    vi.mocked(searchSystemesCollecte).mockImplementation(() => previousSearch.promise);

    const { result, rerender } = renderHook(({ search }) => useAsyncSystemesCollecteSearch(search), {
      initialProps: { search: 'ly' },
      wrapper: createWrapper(),
    });

    await resolveQuery(previousSearch, previousSystemesCollecte);
    expect(result.current.data).toEqual(previousSystemesCollecte);

    rerender({ search: 'l' });
    await advanceDebounce();

    expect(searchSystemesCollecte).toHaveBeenCalledTimes(1);
    expect(result.current.data).toBeUndefined();
  });
});
