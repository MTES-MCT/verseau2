import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../api/apiError';

vi.mock('@sentry/react', () => ({
  captureException: vi.fn(),
  init: vi.fn(),
  setUser: vi.fn(),
}));

import { reportError, shouldReportError } from './sentry';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('shouldReportError', () => {
  it.each([400, 401, 403, 404])('ignores expected ApiError status %i', (status) => {
    expect(shouldReportError(new ApiError('Expected error', status, 'Expected'))).toBe(false);
  });

  it('reports server ApiError statuses', () => {
    expect(shouldReportError(new ApiError('Server error', 500, 'Internal Server Error'))).toBe(true);
  });

  it('reports non-ApiError exceptions', () => {
    expect(shouldReportError(new TypeError('Failed to fetch'))).toBe(true);
  });
});

describe('reportError', () => {
  it('logs reportable errors when Sentry is disabled', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const error = new Error('Unexpected error');
    const context = { source: 'test' };

    reportError(error, context);

    expect(consoleError).toHaveBeenCalledWith(error, context);
  });
});
