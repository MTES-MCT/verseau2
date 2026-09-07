import { createContext } from 'react';
import type { AuthenticatedUserWithIntervenant } from '../types/auth.types';

export interface AuthContextValue {
  authenticatedUser: AuthenticatedUserWithIntervenant | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isReconnecting: boolean;
  hasReconnectionError: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  retryReconnection: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);
