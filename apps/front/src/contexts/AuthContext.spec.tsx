import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuth } from '../hooks/useAuth';
import { AuthProvider } from './AuthContext';

const {
  getAccessToken,
  getCurrentUser,
  logout,
  setSentryUser,
  getRefreshState,
  subscribeToRefreshState,
  startLifecycle,
  refreshAfterUnauthorized,
} = vi.hoisted(() => ({
  getAccessToken: vi.fn(),
  getCurrentUser: vi.fn(),
  logout: vi.fn(),
  setSentryUser: vi.fn(),
  getRefreshState: vi.fn(() => 'idle'),
  subscribeToRefreshState: vi.fn(),
  startLifecycle: vi.fn(),
  refreshAfterUnauthorized: vi.fn(),
}));

vi.mock('../services/auth.service', () => ({
  authService: {
    getAccessToken,
    getCurrentUser,
    login: vi.fn(),
    logout,
    getRefreshState,
    subscribeToRefreshState,
    startLifecycle,
    refreshAfterUnauthorized,
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

function RefreshStatus() {
  const { isReconnecting, hasReconnectionError } = useAuth();
  return <span>{`${isReconnecting}:${hasReconnectionError}`}</span>;
}

describe('AuthProvider Sentry user', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getAccessToken.mockResolvedValue('cookie-stored');
    getCurrentUser.mockResolvedValue(authenticatedUser);
    logout.mockResolvedValue(undefined);
    getRefreshState.mockReturnValue('idle');
    subscribeToRefreshState.mockImplementation((listener: (state: string) => void) => {
      listener('idle');
      return vi.fn();
    });
    startLifecycle.mockReturnValue(vi.fn());
    refreshAfterUnauthorized.mockResolvedValue(undefined);
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

  it('exposes refresh state changes independently from loading and authentication', async () => {
    let listener!: (state: string) => void;
    subscribeToRefreshState.mockImplementation((nextListener: (state: string) => void) => {
      listener = nextListener;
      nextListener('idle');
      return vi.fn();
    });

    render(
      <AuthProvider>
        <RefreshStatus />
      </AuthProvider>,
    );
    await waitFor(() => expect(screen.getByText('false:false')).toBeInTheDocument());

    fireEvent.click(document.body);
    listener('reconnecting');
    await waitFor(() => expect(screen.getByText('true:false')).toBeInTheDocument());

    listener('failed');
    await waitFor(() => expect(screen.getByText('false:true')).toBeInTheDocument());
  });
});
