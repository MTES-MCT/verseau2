import { authService } from '../services/auth.service';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';

export class ApiError extends Error {
  status: number;
  statusText: string;

  constructor(message: string, status: number, statusText: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.statusText = statusText;
  }
}

/**
 * Enhanced fetch wrapper with automatic token management and refresh
 */
export async function authenticatedFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const token = await authService.getAccessToken();

  if (!token) {
    // Redirect to login if not authenticated
    window.location.href = '/login';
    throw new ApiError('Not authenticated', 401, 'Unauthorized');
  }

  // Add Authorization header
  const headers = new Headers(options.headers);
  headers.set('Authorization', `Bearer ${token}`);

  const response = await fetch(url, {
    ...options,
    headers,
    credentials: 'include',
  });

  // Handle 401 by attempting to refresh token
  if (response.status === 401) {
    try {
      await authService.refreshToken();
      const newToken = await authService.getAccessToken();

      if (newToken) {
        headers.set('Authorization', `Bearer ${newToken}`);
        const retryResponse = await fetch(url, {
          ...options,
          headers,
          credentials: 'include',
        });

        return retryResponse;
      }
    } catch (error) {
      // Refresh failed, redirect to login
      authService.clearTokens();
      window.location.href = '/login';
      throw new ApiError('Session expired', 401, 'Unauthorized');
    }
  }

  return response;
}

/**
 * GET request helper
 */
export async function apiGet<T>(endpoint: string): Promise<T> {
  console.log('apiGet', endpoint);
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;
  const response = await authenticatedFetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const message = await response.text().catch(() => response.statusText);
    throw new ApiError(`GET ${endpoint} failed: ${message}`, response.status, response.statusText);
  }

  return response.json();
}

/**
 * POST request helper
 */
export async function apiPost<T>(endpoint: string, body?: any): Promise<T> {
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;
  const response = await authenticatedFetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const message = await response.text().catch(() => response.statusText);
    throw new ApiError(`POST ${endpoint} failed: ${message}`, response.status, response.statusText);
  }

  return response.json();
}

/**
 * POST with FormData (for file uploads)
 */
export async function apiPostFormData<T>(endpoint: string, formData: FormData): Promise<T> {
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;
  const token = await authService.getAccessToken();

  if (!token) {
    window.location.href = '/login';
    throw new ApiError('Not authenticated', 401, 'Unauthorized');
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
    credentials: 'include',
  });

  if (!response.ok) {
    const message = await response.text().catch(() => response.statusText);
    throw new ApiError(`POST ${endpoint} failed: ${message}`, response.status, response.statusText);
  }

  // Return empty object if no content
  if (response.status === 204) {
    return {} as T;
  }

  return response.json();
}

export async function apiDownload(endpoint: string): Promise<Blob> {
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;
  const response = await authenticatedFetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/pdf',
    },
  });
  return response.blob();
  if (!response.ok) {
    const message = await response.text().catch(() => response.statusText);
    throw new ApiError(`GET ${endpoint} failed: ${message}`, response.status, response.statusText);
  }

  return response.blob();
}

/**
 * Build URL with query parameters
 */
export function buildUrl(baseUrl: string, params: Record<string, string | string[]>): string {
  const url = new URL(baseUrl.startsWith('http') ? baseUrl : `${API_BASE_URL}${baseUrl}`);

  Object.entries(params).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      value.forEach((v) => url.searchParams.append(key, v));
    } else {
      url.searchParams.set(key, value);
    }
  });

  return url.toString();
}
