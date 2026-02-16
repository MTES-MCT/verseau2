import { describe, it, expect } from 'vitest';
import { buildUrl } from './apiClient';

describe('buildUrl', () => {
  const API_BASE_URL = 'http://localhost:3000/api';

  it('appends single string params to a relative URL', () => {
    const result = buildUrl('/dossiers', { status: 'active' });

    expect(result).toBe(`${API_BASE_URL}/dossiers?status=active`);
  });

  it('appends multiple string params', () => {
    const result = buildUrl('/dossiers', { status: 'active', annee: '2025' });
    const url = new URL(result);

    expect(url.searchParams.get('status')).toBe('active');
    expect(url.searchParams.get('annee')).toBe('2025');
  });

  it('appends array params as repeated keys', () => {
    const result = buildUrl('/dossiers', { ids: ['1', '2', '3'] });
    const url = new URL(result);

    expect(url.searchParams.getAll('ids')).toEqual(['1', '2', '3']);
  });

  it('handles a mix of string and array params', () => {
    const result = buildUrl('/dossiers', {
      status: 'active',
      ids: ['a', 'b'],
    });
    const url = new URL(result);

    expect(url.searchParams.get('status')).toBe('active');
    expect(url.searchParams.getAll('ids')).toEqual(['a', 'b']);
  });

  it('handles an absolute URL without prepending API_BASE_URL', () => {
    const result = buildUrl('https://example.com/path', { key: 'value' });

    expect(result).toBe('https://example.com/path?key=value');
  });

  it('returns the base URL unchanged when params is empty', () => {
    const result = buildUrl('/dossiers', {});

    expect(result).toBe(`${API_BASE_URL}/dossiers`);
  });
});
