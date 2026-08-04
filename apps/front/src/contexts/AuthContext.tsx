import { useState, useEffect, useCallback, type ReactNode } from 'react';
import { authService } from '../services/auth.service';
import type { AuthenticatedUserWithIntervenant } from '../types/auth.types';
import { reportError, setSentryUser } from '../monitoring/sentry';
import { AuthContext, type AuthContextValue } from './authContextDefinition';

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [authenticatedUser, setAuthenticatedUser] = useState<AuthenticatedUserWithIntervenant | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    try {
      // Use getAccessToken() instead of isAuthenticated() so that an
      // expired access token triggers a refresh via the refresh-token
      // cookie. This is critical on page reload where the access token
      // may have expired while a valid refresh token still exists.
      const token = await authService.getAccessToken();
      if (token) {
        const userData = await authService.getCurrentUser();
        setAuthenticatedUser(userData);
      } else {
        setAuthenticatedUser(null);
      }
    } catch (error) {
      reportError(error, { source: 'AuthContext.refreshUser' });
      setAuthenticatedUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  useEffect(() => {
    if (!authenticatedUser) {
      setSentryUser(null);
      return;
    }

    const { cerbereId, nom, prenom, mel, itvCdn } = authenticatedUser.user;
    const username = `${prenom} ${nom}`.trim();
    setSentryUser({
      id: cerbereId,
      username: username || undefined,
      email: mel || undefined,
      itvCdn: itvCdn ?? undefined,
    });
  }, [authenticatedUser]);

  const login = useCallback(async () => {
    setIsLoading(true);
    try {
      await authService.login();
    } catch (error) {
      reportError(error, { source: 'AuthContext.login' });
      setIsLoading(false);
      throw error;
    }
  }, []);

  const logout = useCallback(async () => {
    setIsLoading(true);
    try {
      await authService.logout();
      setAuthenticatedUser(null);
    } catch (error) {
      reportError(error, { source: 'AuthContext.logout' });
      setAuthenticatedUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const value: AuthContextValue = {
    authenticatedUser,
    isAuthenticated: !!authenticatedUser,
    isLoading,
    login,
    logout,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
