import { act, renderHook } from '@testing-library/react';
import { MemoryRouter, useLocation, useNavigate } from 'react-router';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it } from 'vitest';
import { useUrlFilters, type UrlFilterConfig } from './useUrlFilters';

interface TestState {
  q: string;
  page: number;
}

type TestPatch = Partial<TestState>;

const testConfig: UrlFilterConfig<TestState, TestPatch> = {
  managedKeys: ['q', 'page'],
  parse: (params) => ({
    q: params.get('q') ?? '',
    page: Number(params.get('page')) > 0 ? Number(params.get('page')) : 1,
  }),
  transition: (prev, patch) => {
    const next = { ...prev, ...patch };
    const keys = Object.keys(patch);
    if (!(keys.length === 1 && keys[0] === 'page')) {
      next.page = 1;
    }
    return next;
  },
  serialize: (state) => ({
    q: state.q || undefined,
    page: state.page > 1 ? String(state.page) : undefined,
  }),
};

let seenLocations: string[] = [];
let goBack: (() => void) | null = null;

function LocationProbe() {
  const location = useLocation();
  const navigate = useNavigate();
  seenLocations.push(`${location.pathname}${location.search}${location.hash}`);
  goBack = () => navigate(-1);
  return null;
}

function createWrapper(initialEntries: string[]) {
  return ({ children }: { children: ReactNode }) => (
    <MemoryRouter initialEntries={initialEntries}>
      {children}
      <LocationProbe />
    </MemoryRouter>
  );
}

const currentSearch = () => {
  const last = seenLocations[seenLocations.length - 1];
  return last.slice(last.indexOf('?') === -1 ? last.length : last.indexOf('?'));
};

describe('useUrlFilters', () => {
  beforeEach(() => {
    seenLocations = [];
    goBack = null;
  });

  it('parses the current URL synchronously as initial state', () => {
    const { result } = renderHook(() => useUrlFilters(testConfig), {
      wrapper: createWrapper(['/bilan?q=hello&page=2']),
    });

    expect(result.current.state).toEqual({ q: 'hello', page: 2 });
  });

  it('applies filter changes and dependent resets as one atomic URL update', () => {
    const { result } = renderHook(() => useUrlFilters(testConfig), {
      wrapper: createWrapper(['/bilan?q=hello&page=2']),
    });
    const navigations = seenLocations.length;

    act(() => {
      result.current.update({ q: 'bye' });
    });

    expect(result.current.state).toEqual({ q: 'bye', page: 1 });
    expect(seenLocations).toHaveLength(navigations + 1);
    expect(currentSearch()).toBe('?q=bye');
  });

  it('pushes history entries for committed updates so Back restores the previous state', () => {
    const { result } = renderHook(() => useUrlFilters(testConfig), {
      wrapper: createWrapper(['/bilan?q=hello']),
    });

    act(() => {
      result.current.update({ q: 'bye' });
    });
    expect(currentSearch()).toBe('?q=bye');

    act(() => {
      goBack?.();
    });
    expect(currentSearch()).toBe('?q=hello');
    expect(result.current.state).toEqual({ q: 'hello', page: 1 });
  });

  it('replaces history for normalization-style updates', () => {
    const { result } = renderHook(() => useUrlFilters(testConfig), {
      wrapper: createWrapper(['/a', '/bilan?q=hello&page=2']),
    });

    act(() => {
      result.current.update({ page: 1 }, { history: 'replace' });
    });
    expect(currentSearch()).toBe('?q=hello');

    act(() => {
      goBack?.();
    });
    expect(seenLocations[seenLocations.length - 1]).toBe('/a');
  });

  it('skips no-op updates to prevent navigation loops', () => {
    const { result } = renderHook(() => useUrlFilters(testConfig), {
      wrapper: createWrapper(['/bilan?q=hello']),
    });
    const navigations = seenLocations.length;

    act(() => {
      result.current.update({ q: 'hello' });
    });

    expect(seenLocations).toHaveLength(navigations);
  });

  it('preserves unrelated query parameters and the fragment', () => {
    const { result } = renderHook(() => useUrlFilters(testConfig), {
      wrapper: createWrapper(['/bilan?q=hello&foo=bar#results']),
    });

    act(() => {
      result.current.update({ q: 'bye' });
    });

    expect(seenLocations[seenLocations.length - 1]).toBe('/bilan?q=bye&foo=bar#results');
  });

  it('keeps untouched invalid values in the URL until the user corrects them', () => {
    const configWithRaw: UrlFilterConfig<TestState, TestPatch> = {
      ...testConfig,
      serialize: (state) => ({
        q: state.q || undefined,
        page: state.page > 1 ? String(state.page) : undefined,
      }),
    };
    const { result } = renderHook(() => useUrlFilters(configWithRaw), {
      wrapper: createWrapper(['/bilan?q=hello&page=abc']),
    });

    act(() => {
      result.current.update({ q: 'bye' });
    });

    // Only the affected field is rewritten; the untouched invalid page stays as-is.
    expect(currentSearch()).toBe('?q=bye&page=abc');
  });

  it('always persists configured keys such as the year', () => {
    const configWithYear: UrlFilterConfig<TestState & { year: number }, Partial<TestState & { year: number }>> = {
      managedKeys: ['q', 'page', 'year'],
      alwaysPersistKeys: ['year'],
      parse: (params) => ({
        q: params.get('q') ?? '',
        page: 1,
        year: Number(params.get('year')) || 2026,
      }),
      transition: (prev, patch) => ({ ...prev, ...patch }),
      serialize: (state) => ({
        q: state.q || undefined,
        page: undefined,
        year: String(state.year),
      }),
    };
    const { result } = renderHook(() => useUrlFilters(configWithYear), {
      wrapper: createWrapper(['/bilan?q=hello']),
    });

    act(() => {
      result.current.update({ q: 'bye' });
    });

    expect(currentSearch()).toBe('?q=bye&year=2026');
  });

  it('surfaces normalization warnings until dismissed or the next action', () => {
    const configWithNormalization: UrlFilterConfig<TestState, TestPatch> = {
      ...testConfig,
      planNormalization: (params) => {
        if (params.get('page') === 'abc') {
          const next = new URLSearchParams(params.toString());
          next.delete('page');
          return { params: next, warnings: ['Page invalide, page 1 restaurée.'] };
        }
        return null;
      },
    };
    const { result } = renderHook(() => useUrlFilters(configWithNormalization), {
      wrapper: createWrapper(['/bilan?q=hello&page=abc']),
    });

    expect(result.current.normalizationWarnings).toEqual(['Page invalide, page 1 restaurée.']);
    expect(currentSearch()).toBe('?q=hello');

    act(() => {
      result.current.dismissNormalizationWarnings();
    });
    expect(result.current.normalizationWarnings).toEqual([]);
  });
});
