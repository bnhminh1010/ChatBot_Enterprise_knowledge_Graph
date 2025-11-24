/**
 * API Client Service
 * Quản lý tất cả HTTP requests tới backend
 */

interface ApiRequestOptions extends RequestInit {
  headers?: Record<string, string>;
  params?: Record<string, any>;
}

interface ApiResponse<T = any> {
  statusCode?: number;
  message?: string;
  data?: T;
  error?: string;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002';

/**
 * Tạo URL với query parameters
 */
function buildUrl(endpoint: string, params?: Record<string, any>): string {
  const url = new URL(endpoint, API_URL);
  
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== null && value !== undefined) {
        url.searchParams.append(key, String(value));
      }
    });
  }
  
  return url.toString();
}

/**
 * Lấy token JWT từ localStorage
 * NOTE: Not used anymore with cookie-based auth, but kept for backwards compatibility
 */
function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('auth_token');
}

/**
 * Gọi API chung
 */
async function apiCall<T = any>(
  endpoint: string,
  method: string = 'GET',
  options: ApiRequestOptions = {}
): Promise<T> {
  const url = buildUrl(endpoint, options.params);

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  // Cookies are sent automatically with credentials: 'include'
  // No need to manually add Authorization header

  try {
    const response = await fetch(url, {
      method,
      credentials: 'include',  // ⬅️ CRITICAL: Send cookies
      ...options,
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
    });

    // Handle 401 - try to refresh token
    if (response.status === 401 && !endpoint.includes('/auth/')) {
      // Attempt refresh
      const refreshRes = await fetch(`${API_URL}/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
      });

      if (refreshRes.ok) {
        // Retry original request with new access token (in cookie)
        return apiCall(endpoint, method, options);
      }

      // Refresh failed, redirect to login
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
      throw new Error('Session expired');
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({
        message: `HTTP ${response.status}`,
      }));
      throw new Error(error.message || `API Error: ${response.status}`);
    }

    const data = await response.json();
    return data as T;
  } catch (error) {
    console.error(`API Call Error [${method} ${endpoint}]:`, error);
    throw error;
  }
}

/**
 * GET request
 */
export async function apiGet<T = any>(
  endpoint: string,
  options: ApiRequestOptions = {}
): Promise<T> {
  return apiCall<T>(endpoint, 'GET', options);
}

/**
 * POST request
 */
export async function apiPost<T = any>(
  endpoint: string,
  body?: any,
  options: ApiRequestOptions = {}
): Promise<T> {
  return apiCall<T>(endpoint, 'POST', {
    ...options,
    body,
  });
}

/**
 * PUT request
 */
export async function apiPut<T = any>(
  endpoint: string,
  body?: any,
  options: ApiRequestOptions = {}
): Promise<T> {
  return apiCall<T>(endpoint, 'PUT', {
    ...options,
    body,
  });
}

/**
 * PATCH request
 */
export async function apiPatch<T = any>(
  endpoint: string,
  body?: any,
  options: ApiRequestOptions = {}
): Promise<T> {
  return apiCall<T>(endpoint, 'PATCH', {
    ...options,
    body,
  });
}

/**
 * DELETE request
 */
export async function apiDelete<T = any>(
  endpoint: string,
  options: ApiRequestOptions = {}
): Promise<T> {
  return apiCall<T>(endpoint, 'DELETE', options);
}

export { API_URL };
export type { ApiResponse, ApiRequestOptions };
