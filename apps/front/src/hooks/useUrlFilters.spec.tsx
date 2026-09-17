import { act, renderHook } from '@testing-library/react';
import { MemoryRouter, useLocation, useNavigate } from 'react-router';
import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';
import { useUrlFilters, type UrlFilterConfig } from './useUrlFilters';

interface TestState {
  q: string;
  page: number;
}

const config: UrlFilterConfig<TestState> = {
  keys: ['q', 'page'],
  parse: (params) => ({
    q: params.get('q') ?? '',
    page: Number(params.get('page')) > 0 ? Number(params.get('page')) : 1,
  }),
  serialize: (state) => ({ q: state.q || undefined, page: state.page > 1 ? String(state.page) : undefined }),
};

function renderFilters(initialEntries: string[]) {
  return renderHook(() => ({ ...useUrlFilters(config), location: useLocation(), navigate: useNavigate() }), {
    wrapper: ({ children }: { children: ReactNode }) => (
      <MemoryRouter initialEntries={initialEntries}>{children}</MemoryRouter>
    ),
  });
}

describe('useUrlFilters', () => {
  it('parses synchronously without changing the initial URL', () => {
    const { result } = renderFilters(['/bilan?q=hello&page=abc']);
    expect(result.current.state).toEqual({ q: 'hello', page: 1 });
    expect(result.current.location.search).toBe('?q=hello&page=abc');
  });

  it('writes the complete next state atomically', () => {
    const { result } = renderFilters(['/bilan?q=hello&page=2']);
    act(() => result.current.update({ q: 'bye', page: 1 }));
    expect(result.current.state).toEqual({ q: 'bye', page: 1 });
    expect(result.current.location.search).toBe('?q=bye');
    act(() => result.current.navigate(-1));
    expect(result.current.state).toEqual({ q: 'hello', page: 2 });
  });

  it('restores URL state on Back and Forward', () => {
    const { result } = renderFilters(['/bilan?q=hello']);
    act(() => result.current.update({ q: 'bye', page: 1 }));
    act(() => result.current.navigate(-1));
    expect(result.current.state.q).toBe('hello');
    act(() => result.current.navigate(1));
    expect(result.current.state.q).toBe('bye');
  });

  it('supports replacing the current history entry', () => {
    const { result } = renderFilters(['/previous', '/bilan?q=hello&page=2']);
    act(() => result.current.update({ q: 'hello', page: 1 }, { history: 'replace' }));
    expect(result.current.location.search).toBe('?q=hello');
    act(() => result.current.navigate(-1));
    expect(result.current.location.pathname).toBe('/previous');
  });

  it('does not navigate when the resulting URL is unchanged', () => {
    const { result } = renderFilters(['/bilan?q=hello']);
    const location = result.current.location;
    act(() => result.current.update({ q: 'hello', page: 1 }));
    expect(result.current.location).toBe(location);
  });

  it('preserves unrelated parameters, including duplicates, the pathname and fragment', () => {
    const { result } = renderFilters(['/bilan?q=hello&foo=bar&foo=baz#results']);
    act(() => result.current.update({ q: 'bye', page: 1 }));
    expect(result.current.location).toMatchObject({
      pathname: '/bilan',
      search: '?q=bye&foo=bar&foo=baz',
      hash: '#results',
    });
  });

  it('rewrites invalid and duplicate owned fields even when the parsed state is unchanged', () => {
    const { result } = renderFilters(['/bilan?q=hello&q=bye&page=abc']);
    act(() => result.current.update(result.current.state));
    expect(result.current.location.search).toBe('?q=hello');
  });
});
