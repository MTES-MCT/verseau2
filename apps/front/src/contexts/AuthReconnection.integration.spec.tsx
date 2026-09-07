import { act, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { authenticatedFetch } from '../api/apiClient';
import { ReconnectionLayout } from '../components/ReconnectionLayout';
import { useAuth } from '../hooks/useAuth';
import { AuthProvider } from './AuthContext';

function ReconnectionHarness() {
  const { isReconnecting, hasReconnectionError } = useAuth();
  return (
    <ReconnectionLayout
      isReconnecting={isReconnecting}
      hasError={hasReconnectionError}
      onRetry={() => undefined}
      onLogin={() => undefined}
    >
      <label>
        Valeur conservée
        <input defaultValue="formulaire en cours" />
      </label>
    </ReconnectionLayout>
  );
}

describe('API 401 reconnection integration', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('paints Reconnexion before a fast refresh settles, then retries once', async () => {
    const animationFrames: FrameRequestCallback[] = [];
    vi.stubGlobal(
      'requestAnimationFrame',
      vi.fn((callback: FrameRequestCallback) => animationFrames.push(callback)),
    );
    vi.mocked(fetch)
      .mockResolvedValueOnce(new Response('Unauthorized', { status: 401 }))
      .mockResolvedValueOnce(Response.json({ expiresIn: 3600 }))
      .mockResolvedValueOnce(new Response('ok', { status: 200 }));

    render(
      <AuthProvider>
        <ReconnectionHarness />
      </AuthProvider>,
    );

    const request = authenticatedFetch('/api/protected');
    let requestSettled = false;
    void request.finally(() => {
      requestSettled = true;
    });

    expect(await screen.findByRole('heading', { name: 'Reconnexion' })).toBeInTheDocument();
    expect(screen.getByLabelText('Valeur conservée')).toHaveValue('formulaire en cours');
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(requestSettled).toBe(false);

    await act(async () => {
      animationFrames.shift()?.(performance.now());
      animationFrames.shift()?.(performance.now());
    });

    await expect(request).resolves.toHaveProperty('status', 200);
    await waitFor(() => expect(screen.queryByRole('heading', { name: 'Reconnexion' })).not.toBeInTheDocument());
    expect(fetch).toHaveBeenCalledTimes(3);
  });
});
