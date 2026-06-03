import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { authService } from '../services/auth.service';
import type { AuthenticatedUserWithIntervenant } from '../types/auth.types';

interface AuthContextValue {
  authenticatedUser: AuthenticatedUserWithIntervenant | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

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
      console.error('Failed to fetch user:', error);
      setAuthenticatedUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const login = useCallback(async () => {
    setIsLoading(true);
    try {
      const sessionResumed = await authService.login();
      if (sessionResumed) {
        await refreshUser();
      }
    } catch (error) {
      console.error('Login failed:', error);
      setIsLoading(false);
      throw error;
    }
  }, [refreshUser]);

  const logout = useCallback(async () => {
    setIsLoading(true);
    try {
      await authService.logout();
      setAuthenticatedUser(null);
    } catch (error) {
      console.error('Logout failed:', error);
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

// eslint-disable-next-line react-refresh/only-export-components
export function useAuthContext(): AuthContextValue {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
}
