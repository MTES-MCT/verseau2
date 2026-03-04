import { authService } from '../services/auth.service';
import type { RouteDefinition, RouteResponse, RouteParams, RouteQuery, RouteBody } from '@lib/dossier';
import { buildRoutePath } from '@lib/dossier';

// Re-export buildRoutePath for convenience
export { buildRoutePath };

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
  const response = await fetch(url, {
    ...options,
    credentials: 'include',
  });

  // Handle 401 by attempting to refresh token
  if (response.status === 401) {
    try {
      await authService.refreshToken();

      const retryResponse = await fetch(url, {
        ...options,
        credentials: 'include',
      });

      return retryResponse;
    } catch {
      // Refresh failed, redirect to login
      authService.clearTokens();
      window.location.href = '/';
      throw new ApiError('Session expired', 401, 'Unauthorized');
    }
  }

  return response;
}

/**
 * POST with FormData (for file uploads)
 */
export async function apiPostFormData<T>(endpoint: string, formData: FormData): Promise<T> {
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;
  const token = await authService.getAccessToken();

  if (!token) {
    window.location.href = '/';
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
  if (!response.ok) {
    const message = await response.text().catch(() => response.statusText);
    throw new ApiError(`GET ${endpoint} failed: ${message}`, response.status, response.statusText);
  }

  return response.blob();
}

/**
 * Generic typed API call using route definitions
 */
export async function apiCall<R extends RouteDefinition>(
  route: R,
  options?: {
    params?: RouteParams<R>;
    query?: RouteQuery<R>;
    body?: RouteBody<R>;
  },
): Promise<RouteResponse<R>> {
  // Build the URL from route definition
  const path = buildRoutePath(route, {
    params: options?.params,
    query: options?.query,
  });

  const url = path.startsWith('http') ? path : `${API_BASE_URL}${path}`;

  // Make the request
  const response = await authenticatedFetch(url, {
    method: route.method,
    headers: {
      'Content-Type': 'application/json',
    },
    body: options?.body ? JSON.stringify(options.body) : undefined,
  });

  if (!response.ok) {
    const message = await response.text().catch(() => response.statusText);
    throw new ApiError(`${route.method} ${path} failed: ${message}`, response.status, response.statusText);
  }

  // Parse response (no validation on frontend, schemas are for typing only)
  const json = await response.json();
  return json as RouteResponse<R>;
}
