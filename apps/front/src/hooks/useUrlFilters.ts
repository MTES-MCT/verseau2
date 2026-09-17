import { useCallback, useMemo } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router';

export type UrlHistoryMode = 'push' | 'replace';

export interface UrlFilterConfig<T> {
  keys: readonly string[];
  parse: (params: URLSearchParams) => T;
  serialize: (filters: T) => Record<string, string | undefined>;
}

/** Reads URL state synchronously and writes all owned fields in one navigation. */
export function useUrlFilters<T>(config: UrlFilterConfig<T>) {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const state = useMemo(() => config.parse(searchParams), [config, searchParams]);

  const update = useCallback(
    (next: T, options?: { history?: UrlHistoryMode }) => {
      const values = config.serialize(next);
      const params = new URLSearchParams(searchParams);
      for (const key of config.keys) {
        const value = values[key];
        if (value === undefined) {
          params.delete(key);
        } else {
          params.set(key, value);
        }
      }

      if (params.toString() === searchParams.toString()) {
        return;
      }
      navigate(
        { pathname: location.pathname, search: params.toString(), hash: location.hash },
        { replace: options?.history === 'replace' },
      );
    },
    [config, searchParams, location.pathname, location.hash, navigate],
  );

  return { state, update, searchParams };
}
