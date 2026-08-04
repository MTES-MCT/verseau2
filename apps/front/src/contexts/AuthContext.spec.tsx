import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuth } from '../hooks/useAuth';
import { AuthProvider } from './AuthContext';

const { getAccessToken, getCurrentUser, logout, setSentryUser } = vi.hoisted(() => ({
  getAccessToken: vi.fn(),
  getCurrentUser: vi.fn(),
  logout: vi.fn(),
  setSentryUser: vi.fn(),
}));

vi.mock('../services/auth.service', () => ({
  authService: {
    getAccessToken,
    getCurrentUser,
    login: vi.fn(),
    logout,
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

describe('AuthProvider Sentry user', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getAccessToken.mockResolvedValue('cookie-stored');
    getCurrentUser.mockResolvedValue(authenticatedUser);
    logout.mockResolvedValue(undefined);
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
});
