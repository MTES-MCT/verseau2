import type { z, ZodType } from 'zod';

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';

export interface RouteDefinition {
  readonly method: HttpMethod;
  readonly path: string;
  readonly params?: ZodType;
  readonly query?: ZodType;
  readonly body?: ZodType;
  readonly response?: ZodType;
}

// Inference helpers
type InferField<R, K extends keyof RouteDefinition> = K extends keyof R
  ? R[K] extends ZodType
    ? z.infer<R[K]>
    : never
  : never;

export type RouteParams<R> = InferField<R, 'params'>;
export type RouteQuery<R> = InferField<R, 'query'>;
export type RouteBody<R> = InferField<R, 'body'>;
export type RouteResponse<R> = InferField<R, 'response'>;

// URL builder (pure function, used by frontend)
export function buildRoutePath<R extends RouteDefinition>(
  route: R,
  options?: {
    params?: RouteParams<R>;
    query?: RouteQuery<R>;
  },
): string {
  let path = route.path;

  // Replace path parameters (e.g., :id)
  if (options?.params) {
    for (const [key, value] of Object.entries(options.params)) {
      path = path.replace(`:${key}`, encodeURIComponent(String(value)));
    }
  }

  // Add query parameters
  if (options?.query) {
    const searchParams = new URLSearchParams();
    for (const [key, value] of Object.entries(options.query)) {
      if (Array.isArray(value)) {
        for (const item of value) {
          searchParams.append(key, String(item));
        }
      } else {
        searchParams.append(key, String(value));
      }
    }
    const queryString = searchParams.toString();
    if (queryString) {
      path += `?${queryString}`;
    }
  }

  return path;
}
