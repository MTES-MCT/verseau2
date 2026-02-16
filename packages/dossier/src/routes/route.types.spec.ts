import { z } from 'zod';
import { buildRoutePath, type RouteDefinition } from './route.types';

describe('buildRoutePath', () => {
  it('should return the path as-is when no options are provided', () => {
    const route = { method: 'GET', path: '/items' } as const satisfies RouteDefinition;

    expect(buildRoutePath(route)).toBe('/items');
  });

  it('should replace a single path parameter', () => {
    const route = {
      method: 'GET',
      path: '/items/:id',
      params: z.object({ id: z.string() }),
    } as const satisfies RouteDefinition;

    expect(buildRoutePath(route, { params: { id: '42' } })).toBe('/items/42');
  });

  it('should replace multiple path parameters', () => {
    const route = {
      method: 'GET',
      path: '/users/:userId/posts/:postId',
      params: z.object({ userId: z.string(), postId: z.string() }),
    } as const satisfies RouteDefinition;

    expect(buildRoutePath(route, { params: { userId: 'u1', postId: 'p2' } })).toBe('/users/u1/posts/p2');
  });

  it('should encode path parameters with special characters', () => {
    const route = {
      method: 'GET',
      path: '/items/:id',
      params: z.object({ id: z.string() }),
    } as const satisfies RouteDefinition;

    expect(buildRoutePath(route, { params: { id: 'hello world' } })).toBe('/items/hello%20world');
  });

  it('should append a single scalar query parameter', () => {
    const route = {
      method: 'GET',
      path: '/search',
      query: z.object({ q: z.string() }),
    } as const satisfies RouteDefinition;

    expect(buildRoutePath(route, { query: { q: 'test' } })).toBe('/search?q=test');
  });

  it('should append multiple scalar query parameters', () => {
    const route = {
      method: 'GET',
      path: '/search',
      query: z.object({ q: z.string(), page: z.string() }),
    } as const satisfies RouteDefinition;

    const result = buildRoutePath(route, { query: { q: 'test', page: '2' } });
    expect(result).toBe('/search?q=test&page=2');
  });

  it('should append array query parameters as repeated keys', () => {
    const route = {
      method: 'GET',
      path: '/referentiel/codes-to-parametres',
      query: z.object({ codes: z.union([z.string(), z.array(z.string())]) }),
    } as const satisfies RouteDefinition;

    const result = buildRoutePath(route, { query: { codes: ['1301', '1302', '1303'] } });
    expect(result).toBe('/referentiel/codes-to-parametres?codes=1301&codes=1302&codes=1303');
  });

  it('should handle a single-element array query parameter', () => {
    const route = {
      method: 'GET',
      path: '/items',
      query: z.object({ ids: z.array(z.string()) }),
    } as const satisfies RouteDefinition;

    expect(buildRoutePath(route, { query: { ids: ['42'] } })).toBe('/items?ids=42');
  });

  it('should handle an empty array query parameter by omitting it', () => {
    const route = {
      method: 'GET',
      path: '/items',
      query: z.object({ ids: z.array(z.string()) }),
    } as const satisfies RouteDefinition;

    expect(buildRoutePath(route, { query: { ids: [] } })).toBe('/items');
  });

  it('should combine path parameters and query parameters', () => {
    const route = {
      method: 'GET',
      path: '/users/:userId/posts',
      params: z.object({ userId: z.string() }),
      query: z.object({ page: z.string() }),
    } as const satisfies RouteDefinition;

    const result = buildRoutePath(route, { params: { userId: 'u1' }, query: { page: '3' } });
    expect(result).toBe('/users/u1/posts?page=3');
  });

  it('should encode query parameter values with special characters', () => {
    const route = {
      method: 'GET',
      path: '/search',
      query: z.object({ q: z.string() }),
    } as const satisfies RouteDefinition;

    const result = buildRoutePath(route, { query: { q: 'hello world&more' } });
    expect(result).toBe('/search?q=hello+world%26more');
  });

  it('should return the path unchanged when options is undefined', () => {
    const route = {
      method: 'GET',
      path: '/items',
      params: z.object({ id: z.string() }),
    } as const satisfies RouteDefinition;

    expect(buildRoutePath(route, undefined)).toBe('/items');
  });

  it('should mix array and scalar query parameters', () => {
    const route = {
      method: 'GET',
      path: '/filter',
      query: z.object({ status: z.string(), tags: z.array(z.string()) }),
    } as const satisfies RouteDefinition;

    const result = buildRoutePath(route, { query: { status: 'active', tags: ['a', 'b'] } });
    expect(result).toBe('/filter?status=active&tags=a&tags=b');
  });
});
