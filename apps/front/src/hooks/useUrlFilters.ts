import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router';

export type UrlHistoryMode = 'push' | 'replace';

export interface UrlNormalizationPlan {
  params: URLSearchParams;
  warnings: string[];
}

export interface UrlFilterConfig<TState, TPatch = Partial<TState>> {
  /** Query parameter names owned by this filter. Untouched keys (including unrelated params) are preserved. */
  managedKeys: readonly string[];
  /** Managed keys always written on update, even when unchanged (e.g. a year that must persist for bookmarks). */
  alwaysPersistKeys?: readonly string[];
  parse: (params: URLSearchParams) => TState;
  transition: (prev: TState, patch: TPatch) => TState;
  serialize: (state: TState) => Record<string, string | undefined>;
  /** Optional automatic corrections (invalid page/sort syntax, irrelevant fields). Applied once via replace. */
  planNormalization?: (params: URLSearchParams, state: TState) => UrlNormalizationPlan | null;
}

export interface UrlFiltersResult<TState, TPatch = Partial<TState>> {
  state: TState;
  update: (patch: TPatch, options?: { history?: UrlHistoryMode }) => void;
  searchParams: URLSearchParams;
  /** Warnings produced by automatic URL normalization. Survive the replace, cleared on dismiss or next action. */
  normalizationWarnings: string[];
  dismissNormalizationWarnings: () => void;
}

/**
 * Generic URL-as-source-of-truth state hook.
 *
 * - Parses the current URL synchronously on every render (no mirrored useState).
 * - Applies each user action as one atomic URL update (dependent resets included).
 * - Only writes explicitly affected fields, preserving unrelated params, fragments and untouched invalid values.
 * - Skips no-op updates to prevent navigation loops.
 * - Knows nothing about domain rules: parsing, transitions and normalization come from the config.
 */
export function useUrlFilters<TState, TPatch = Partial<TState>>(
  config: UrlFilterConfig<TState, TPatch>,
): UrlFiltersResult<TState, TPatch> {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [normalizationWarnings, setNormalizationWarnings] = useState<string[]>([]);
  const keepWarningsForRef = useRef<string | null>(null);

  const state = useMemo(() => config.parse(searchParams), [config, searchParams]);

  const update = useCallback(
    (patch: TPatch, options?: { history?: UrlHistoryMode }) => {
      const prev = config.parse(searchParams);
      const next = config.transition(prev, patch);
      const serializedNext = config.serialize(next);
      const serializedPrev = config.serialize(prev);

      const affectedKeys = config.managedKeys.filter((key) => serializedNext[key] !== serializedPrev[key]);

      for (const key of config.alwaysPersistKeys ?? []) {
        const value = serializedNext[key];
        if (value === undefined) {
          continue;
        }
        if (!affectedKeys.includes(key) && searchParams.get(key) !== value) {
          affectedKeys.push(key);
        }
      }

      setNormalizationWarnings([]);

      if (affectedKeys.length === 0) {
        return;
      }

      // Rebuild in place to preserve parameter order: affected keys are substituted
      // at their first occurrence (duplicates dropped), untouched keys — including
      // unrelated params and untouched invalid values — keep their exact raw form.
      const affected = new Set(affectedKeys);
      const substituted = new Set<string>();
      const nextParams = new URLSearchParams();
      for (const [key, value] of Array.from(new URLSearchParams(searchParams.toString()).entries())) {
        if (config.managedKeys.includes(key) && affected.has(key)) {
          if (!substituted.has(key)) {
            substituted.add(key);
            const replacement = serializedNext[key];
            if (replacement !== undefined) {
              nextParams.append(key, replacement);
            }
          }
        } else {
          nextParams.append(key, value);
        }
      }
      for (const key of affectedKeys) {
        if (!substituted.has(key)) {
          const replacement = serializedNext[key];
          if (replacement !== undefined && !nextParams.has(key)) {
            nextParams.append(key, replacement);
          }
        }
      }

      // Explicit navigation preserves the route and the URL fragment; unrelated params survive via nextParams.
      navigate(
        { pathname: location.pathname, search: nextParams.toString(), hash: location.hash },
        { replace: options?.history === 'replace' },
      );
    },
    [config, searchParams, location.pathname, location.hash, navigate],
  );

  const dismissNormalizationWarnings = useCallback(() => {
    setNormalizationWarnings([]);
  }, []);

  useEffect(() => {
    if (!config.planNormalization) {
      return;
    }
    const current = new URLSearchParams(searchParams.toString());
    const plan = config.planNormalization(current, config.parse(current));
    if (!plan) {
      return;
    }
    keepWarningsForRef.current = plan.params.toString();
    setNormalizationWarnings((prev) => [...prev, ...plan.warnings]);
    navigate(
      { pathname: location.pathname, search: plan.params.toString(), hash: location.hash },
      { replace: true },
    );
  }, [config, searchParams, location.pathname, location.hash, navigate]);

  // Warnings survive the automatic replace above, but are cleared by any other
  // deliberate filter change or navigation (including Back/Forward).
  const searchString = searchParams.toString();
  const prevSearchRef = useRef(searchString);
  useEffect(() => {
    if (prevSearchRef.current === searchString) {
      return;
    }
    prevSearchRef.current = searchString;
    if (keepWarningsForRef.current !== null) {
      const expected = keepWarningsForRef.current;
      keepWarningsForRef.current = null;
      if (expected === searchString) {
        return;
      }
    }
    setNormalizationWarnings([]);
  }, [searchString]);

  return { state, update, searchParams, normalizationWarnings, dismissNormalizationWarnings };
}
