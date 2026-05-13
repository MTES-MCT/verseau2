import { authService } from '../services/auth.service';
import { APP_HOME_PATH, API_BASE_URL } from '../appConfig';
import type { RouteDefinition, RouteResponse, RouteParams, RouteQuery, RouteBody } from '@lib/dossier';
import { buildRoutePath } from '@lib/dossier';

// Re-export buildRoutePath for convenience
export { buildRoutePath };

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

export interface DownloadedFile {
  blob: Blob;
  filename?: string;
}

/**
 * Enhanced fetch wrapper with automatic token management and refresh
 */
export async function authenticatedFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const response = await fetch(url, {
    ...options,
    credentials: 'include',
  });

  // Handle 401 by attempting to refresh token (dedup handled by authService)
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
      authService.clearSession();
      window.location.href = APP_HOME_PATH;
      throw new ApiError('Session expired', 401, 'Unauthorized');
    }
  }

  return response;
}

/**
 * POST with FormData (for file uploads).
 * Uses authenticatedFetch for automatic 401-retry via cookie-based auth.
 */
export async function apiPostFormData<T>(endpoint: string, formData: FormData): Promise<T> {
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;

  const response = await authenticatedFetch(url, {
    method: 'POST',
    body: formData,
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
  const file = await apiDownloadFile(endpoint, 'application/pdf');
  return file.blob;
}

export async function apiDownloadFile(endpoint: string, accept?: string): Promise<DownloadedFile> {
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;
  const response = await authenticatedFetch(url, {
    method: 'GET',
    headers: accept ? { Accept: accept } : undefined,
  });
  if (!response.ok) {
    const message = await response.text().catch(() => response.statusText);
    throw new ApiError(`GET ${endpoint} failed: ${message}`, response.status, response.statusText);
  }

  return {
    blob: await response.blob(),
    filename: parseContentDispositionFilename(response.headers.get('Content-Disposition')),
  };
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

function parseContentDispositionFilename(contentDisposition: string | null): string | undefined {
  if (!contentDisposition) {
    return undefined;
  }

  const utf8Match = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8Match?.[1]) {
    return decodeURIComponent(utf8Match[1]);
  }

  const filenameMatch = contentDisposition.match(/filename=([^;]+)/i);
  if (!filenameMatch?.[1]) {
    return undefined;
  }

  return filenameMatch[1].trim().replace(/^"|"$/g, '');
}
