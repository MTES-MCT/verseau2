import { useState, useEffect, useCallback, useRef, useSyncExternalStore, type ReactNode } from 'react';
import { authService, SessionExpiredError } from '../services/auth.service';
import type { AuthenticatedUserWithIntervenant } from '../types/auth.types';
import { reportError, setSentryUser } from '../monitoring/sentry';
import { AuthContext, type AuthContextValue } from './authContextDefinition';

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [authenticatedUser, setAuthenticatedUser] = useState<AuthenticatedUserWithIntervenant | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const refreshRequestId = useRef(0);
  const sessionSnapshot = useSyncExternalStore(authService.subscribe, authService.getSessionSnapshot, () => null);

  const refreshUser = useCallback(async () => {
    const requestId = ++refreshRequestId.current;
    try {
      // Use getAccessToken() instead of isAuthenticated() so that an
      // expired access token triggers a refresh via the refresh-token
      // cookie. This is critical on page reload where the access token
      // may have expired while a valid refresh token still exists.
      const token = await authService.getAccessToken();
      if (token) {
        const sessionBeforeUserFetch = authService.getSessionSnapshot();
        if (!sessionBeforeUserFetch) {
          setAuthenticatedUser(null);
          return;
        }
        const userData = await authService.getCurrentUser();
        if (requestId === refreshRequestId.current && authService.getSessionSnapshot() === sessionBeforeUserFetch) {
          setAuthenticatedUser(userData);
        }
      } else {
        if (requestId === refreshRequestId.current) {
          setAuthenticatedUser(null);
        }
      }
    } catch (error) {
      if (!(error instanceof SessionExpiredError)) {
        reportError(error, { source: 'AuthContext.refreshUser' });
      }
      if (!authService.getSessionSnapshot() && requestId === refreshRequestId.current) {
        setAuthenticatedUser(null);
      }
    } finally {
      if (requestId === refreshRequestId.current) {
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    const stopLifecycle = authService.startLifecycle();
    return stopLifecycle;
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser, sessionSnapshot]);

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
    refreshRequestId.current += 1;
    setAuthenticatedUser(null);
    try {
      await authService.logout();
    } catch (error) {
      reportError(error, { source: 'AuthContext.logout' });
    } finally {
      setIsLoading(false);
    }
  }, []);

  const value: AuthContextValue = {
    authenticatedUser,
    isAuthenticated: !!authenticatedUser && sessionSnapshot !== null,
    isLoading,
    login,
    logout,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
