// Temporary fake token helpers to be removed when real OIDC is available.
import { useEffect, useState } from 'react';

export const FAKE_TOKEN_STORAGE_KEY = 'OIDC_FAKE_TOKEN';

const getEnvFakeToken = (): string => ((import.meta.env.VITE_FAKE_TOKEN as string | undefined) || '').trim();

export const getCurrentFakeToken = (): string => {
  if (typeof window !== 'undefined') {
    const stored = window.localStorage.getItem(FAKE_TOKEN_STORAGE_KEY)?.trim();
    if (stored) {
      return stored;
    }
  }
  return getEnvFakeToken();
};

export const useFakeToken = () => {
  const [fakeToken, setFakeToken] = useState<string>(getCurrentFakeToken);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    if (fakeToken) {
      window.localStorage.setItem(FAKE_TOKEN_STORAGE_KEY, fakeToken);
    } else {
      window.localStorage.removeItem(FAKE_TOKEN_STORAGE_KEY);
    }
  }, [fakeToken]);

  return { fakeToken, setFakeToken };
};
