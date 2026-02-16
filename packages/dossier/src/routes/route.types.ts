import type { z, ZodType } from 'zod';

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';

export interface RouteDefinition<
  TMethod extends HttpMethod = HttpMethod,
  TParams extends ZodType | undefined = ZodType | undefined,
  TQuery extends ZodType | undefined = ZodType | undefined,
  TBody extends ZodType | undefined = ZodType | undefined,
  TResponse extends ZodType | undefined = ZodType | undefined,
> {
  readonly method: TMethod;
  readonly path: string;
  readonly params?: TParams;
  readonly query?: TQuery;
  readonly body?: TBody;
  readonly response?: TResponse;
}

// Inference helpers
export type RouteParams<R> =
  R extends RouteDefinition<HttpMethod, infer TParams, ZodType | undefined, ZodType | undefined, ZodType | undefined>
    ? TParams extends ZodType
      ? z.infer<TParams>
      : never
    : never;

export type RouteQuery<R> =
  R extends RouteDefinition<HttpMethod, ZodType | undefined, infer TQuery, ZodType | undefined, ZodType | undefined>
    ? TQuery extends ZodType
      ? z.infer<TQuery>
      : never
    : never;

export type RouteBody<R> =
  R extends RouteDefinition<HttpMethod, ZodType | undefined, ZodType | undefined, infer TBody, ZodType | undefined>
    ? TBody extends ZodType
      ? z.infer<TBody>
      : never
    : never;

export type RouteResponse<R> =
  R extends RouteDefinition<HttpMethod, ZodType | undefined, ZodType | undefined, ZodType | undefined, infer TResponse>
    ? TResponse extends ZodType
      ? z.infer<TResponse>
      : never
    : never;

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
    const queryString = new URLSearchParams(
      Object.entries(options.query).map(([key, value]) => [key, String(value)]),
    ).toString();
    if (queryString) {
      path += `?${queryString}`;
    }
  }

  return path;
}
