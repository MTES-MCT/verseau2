import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuth } from '../hooks/useAuth';
import { AuthProvider } from './AuthContext';

const {
  getAccessToken,
  getCurrentUser,
  getSessionSnapshot,
  listeners,
  logout,
  sessionState,
  setSentryUser,
  startLifecycle,
  subscribe,
} = vi.hoisted(() => {
  const listeners = new Set<() => void>();
  const sessionState: { value: string | null } = { value: 'session-1' };
  return {
    getAccessToken: vi.fn(),
    getCurrentUser: vi.fn(),
    getSessionSnapshot: vi.fn(() => sessionState.value),
    listeners,
    logout: vi.fn(),
    sessionState,
    setSentryUser: vi.fn(),
    startLifecycle: vi.fn(),
    subscribe: vi.fn((listener: () => void) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    }),
  };
});

vi.mock('../services/auth.service', () => ({
  SessionExpiredError: class extends Error {},
  authService: {
    getAccessToken,
    getCurrentUser,
    login: vi.fn(),
    logout,
    startLifecycle,
    subscribe,
    getSessionSnapshot,
  },
}));

vi.mock('../monitoring/sentry', () => ({
  reportError: vi.fn(),
  setSentryUser,
}));

const authenticatedUser = {
  user: {
    cerbereId: 'cerbere-123',
    nom: 'Dupont',
    prenom: 'Alice',
    mel: 'alice.dupont@example.test',
    itvCdn: 42,
    isExpertNational: false,
  },
  intervenant: null,
  isExpertNational: false,
};

function LogoutButton() {
  const { isLoading, logout: handleLogout } = useAuth();
  return (
    <button disabled={isLoading} onClick={handleLogout}>
      Logout
    </button>
  );
}

function AuthStatus() {
  const { authenticatedUser, isAuthenticated } = useAuth();
  return <div>{isAuthenticated ? authenticatedUser?.user.mel : 'signed-out'}</div>;
}

function ImmediateLogoutButton() {
  const { logout: handleLogout } = useAuth();
  return <button onClick={handleLogout}>Immediate logout</button>;
}

describe('AuthProvider Sentry user', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listeners.clear();
    sessionState.value = 'session-1';
    getAccessToken.mockResolvedValue('cookie-stored');
    getCurrentUser.mockResolvedValue(authenticatedUser);
    logout.mockResolvedValue(undefined);
    startLifecycle.mockReturnValue(vi.fn());
  });

  it('sets the Sentry user after loading the authenticated user', async () => {
    render(<AuthProvider>Content</AuthProvider>);

    await waitFor(() =>
      expect(setSentryUser).toHaveBeenLastCalledWith({
        id: 'cerbere-123',
        username: 'Alice Dupont',
        email: 'alice.dupont@example.test',
        itvCdn: 42,
      }),
    );
  });

  it('clears the Sentry user on logout', async () => {
    render(
      <AuthProvider>
        <LogoutButton />
      </AuthProvider>,
    );

    await waitFor(() => expect(screen.getByRole('button', { name: 'Logout' })).toBeEnabled());
    fireEvent.click(screen.getByRole('button', { name: 'Logout' }));

    await waitFor(() => expect(setSentryUser).toHaveBeenLastCalledWith(null));
  });

  it('reacts to a session cleared in another tab', async () => {
    render(
      <AuthProvider>
        <AuthStatus />
      </AuthProvider>,
    );
    await screen.findByText('alice.dupont@example.test');

    act(() => {
      sessionState.value = null;
      listeners.forEach((listener) => listener());
    });

    await screen.findByText('signed-out');
  });

  it('reloads user claims when renewed session metadata changes', async () => {
    render(
      <AuthProvider>
        <AuthStatus />
      </AuthProvider>,
    );
    await screen.findByText('alice.dupont@example.test');
    getCurrentUser.mockResolvedValue({
      ...authenticatedUser,
      user: { ...authenticatedUser.user, mel: 'renewed@example.test', isExpertNational: true },
      isExpertNational: true,
    });

    act(() => {
      sessionState.value = 'session-2';
      listeners.forEach((listener) => listener());
    });

    await screen.findByText('renewed@example.test');
  });

  it('ignores an in-flight user response after logout', async () => {
    let resolveUser!: (value: typeof authenticatedUser) => void;
    getCurrentUser.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveUser = resolve;
      }),
    );
    render(
      <AuthProvider>
        <ImmediateLogoutButton />
        <AuthStatus />
      </AuthProvider>,
    );
    await waitFor(() => expect(getCurrentUser).toHaveBeenCalledTimes(1));

    fireEvent.click(screen.getByRole('button', { name: 'Immediate logout' }));
    resolveUser(authenticatedUser);

    await screen.findByText('signed-out');
  });
});
