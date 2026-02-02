import axios, {
  AxiosInstance,
  AxiosRequestConfig,
  AxiosResponse,
  AxiosError,
} from 'axios';

// API Response types
export interface ApiResponse<T = unknown> {
  data: T;
  message?: string;
}

interface ErrorResponse {
  message?: string;
  code?: string;
  errors?: Record<string, string[]>;
}

export interface ApiError {
  message: string;
  code?: string;
  status?: number;
}

// Authentication provider interface for abstraction
export interface AuthProvider {
  getCurrentUser: () => Promise<{
    getIdToken: (forceRefresh?: boolean) => Promise<string>;
  } | null>;
  signOut: () => Promise<void>;
}

// Toast notification interface
export interface ToastProvider {
  error: (message: string) => void;
}

// API Client configuration
export interface ApiClientConfig {
  baseURL: string;
  timeout?: number;
  authProvider: AuthProvider;
  toastProvider?: ToastProvider;
  loginPath?: string;
  onUnauthorized?: () => void | Promise<void>;
  responseExtractor?: <T>(response: AxiosResponse<ApiResponse<T>>) => T;
  enableDevLogging?: boolean;
}

/**
 * Default response data extractor
 * Handles both nested {data: T} and direct T response formats
 * @template T - Response data type
 * @param response - Axios response object
 * @returns Extracted data
 * @internal
 */
const defaultExtractData = <T>(
  response: AxiosResponse<ApiResponse<T>>,
): T => {
  const data = response.data;
  return data && typeof data === 'object' && 'data' in data
    ? (data.data as T)
    : (data as T);
};

/**
 * Creates a configured API client instance with authentication and error handling
 * 
 * @param config - API client configuration
 * @returns Configured API client with HTTP methods (get, post, put, patch, delete)
 * 
 * @example
 * ```typescript
 * const api = createApiClient({
 *   baseURL: 'https://api.example.com',
 *   authProvider: myAuthProvider,
 *   toastProvider: { error: toast.error },
 *   loginPath: '/login',
 * });
 * ```
 */
export const createApiClient = (config: ApiClientConfig) => {
  const {
    baseURL,
    timeout = 30000,
    authProvider,
    toastProvider,
    loginPath = '/login',
    onUnauthorized,
    responseExtractor = defaultExtractData,
    enableDevLogging = process.env.NODE_ENV === 'development',
  } = config;

  let isRedirecting = false;

  /**
   * Redirects to login page after handling unauthorized callback
   * @internal
   */
  const redirectToLogin = async () => {
    if (typeof window !== 'undefined' && !isRedirecting) {
      isRedirecting = true;
      
      // Wait for onUnauthorized callback to complete before redirecting
      if (onUnauthorized) {
        try {
          await Promise.resolve(onUnauthorized());
        } catch (error) {
          console.error('Error in onUnauthorized callback:', error);
        }
      }
      
      window.location.href = loginPath;
      
      setTimeout(() => {
        isRedirecting = false;
      }, 2000);
    }
  };

  /**
   * Shows error toast notification if toast provider is available
   * @param message - Error message to display
   * @internal
   */
  const showToast = (message: string) => {
    if (toastProvider) {
      try {
        toastProvider.error(message);
      } catch (e) {
        console.error('Toast error:', e);
      }
    }
  };

  // Create axios instance
  const apiClient: AxiosInstance = axios.create({
    baseURL,
    timeout,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  /**
   * Request interceptor: Adds authentication token to requests
   * @internal
   */
  apiClient.interceptors.request.use(
    async (requestConfig) => {
      try {
        const user = await authProvider.getCurrentUser();
        if (user) {
          const token = await user.getIdToken();
          requestConfig.headers.Authorization = `Bearer ${token}`;
        }
      } catch (error) {
        console.error('Failed to get auth token:', error);
      }

      // Dev mode logging
      if (enableDevLogging) {
        console.log(
          `[API Request] ${requestConfig.method?.toUpperCase()} ${requestConfig.url}`,
          {
            baseURL: requestConfig.baseURL,
            headers: {
              ...requestConfig.headers,
              Authorization: requestConfig.headers.Authorization
                ? 'Bearer ***'
                : undefined,
            },
            data: requestConfig.data,
            params: requestConfig.params,
          },
        );
      }

      return requestConfig;
    },
    (error) => {
      return Promise.reject(error);
    },
  );

  /**
   * Response interceptor: Handles responses and errors
   * - Logs requests/responses in dev mode
   * - Handles 401 with token refresh retry
   * - Provides user feedback via toasts
   * @internal
   */
  apiClient.interceptors.response.use(
    (response: AxiosResponse) => {
      // Dev mode logging
      if (enableDevLogging) {
        console.log(
          `[API Response] ${response.status} ${response.config.method?.toUpperCase()} ${response.config.url}`,
          {
            data: response.data,
            headers: response.headers,
          },
        );
      }
      return response;
    },
    async (error: AxiosError) => {
      // Dev mode logging for errors
      if (enableDevLogging) {
        console.error(
          `[API Error] ${error.response?.status || 'NO_RESPONSE'} ${error.config?.method?.toUpperCase()} ${error.config?.url}`,
          {
            response: error.response?.data,
            request: error.request,
            message: error.message,
          },
        );
      }

      // Handle different error types
      if (error.response) {
        // Server responded with error status
        const status = error.response.status;
        const data = error.response.data as ErrorResponse;

        switch (status) {
          case 401:
            if (typeof window !== 'undefined') {
              // Try to refresh token first
              const user = await authProvider.getCurrentUser();

              if (user && error.config) {
                try {
                  // Force token refresh
                  const newToken = await user.getIdToken(true);

                  // Retry the original request with new token
                  // Properly clone config with headers
                  const originalRequest = {
                    ...error.config,
                    headers: {
                      ...error.config.headers,
                      Authorization: `Bearer ${newToken}`,
                    },
                  };

                  // Retry the request
                  return apiClient.request(originalRequest);
                } catch (refreshError) {
                  // Token refresh failed - sign out and redirect
                  console.error('Token refresh failed:', refreshError);

                  // Show toast if available
                  showToast('Session expired, please login again');

                  // Sign out and redirect
                  authProvider
                    .signOut()
                    .then(() => {
                      setTimeout(() => {
                        redirectToLogin();
                      }, 500);
                    })
                    .catch((signOutError) => {
                      console.error('Failed to sign out:', signOutError);
                      setTimeout(() => {
                        redirectToLogin();
                      }, 500);
                    });
                }
              } else {
                // No user or no config - just redirect
                showToast('Session expired, please login again');
                setTimeout(() => {
                  redirectToLogin();
                }, 500);
              }
            }
            break;
          case 403:
            console.error('Forbidden - insufficient permissions');
            showToast('Forbidden - insufficient permissions');
            break;
          case 404:
            console.error('Resource not found');
            showToast('Resource not found');
            break;
          case 500:
            console.error('Server error');
            showToast('Server error');
            break;
          default:
            console.error(`API Error: ${status}`, data);
            showToast(`API Error: ${status}`);
        }

        return Promise.reject({
          message: data?.message || error.message || 'An error occurred',
          code: data?.code,
          status,
        } as ApiError);
      } else if (error.request) {
        // Request made but no response received
        console.error('No response received:', error.request);

        const isTimeout =
          error.code === 'ECONNABORTED' ||
          error.message?.includes('timeout') ||
          (error.config?.timeout && error.request.readyState === 0);

        const errorMessage = isTimeout
          ? 'Request timed out - please try again'
          : 'Network error - please check your connection';

        showToast(errorMessage);

        return Promise.reject({
          message: errorMessage,
          code: isTimeout ? 'TIMEOUT_ERROR' : 'NETWORK_ERROR',
        } as ApiError);
      } else {
        // Error in request setup
        console.error('Request setup error:', error.message);
        return Promise.reject({
          message: error.message || 'An unexpected error occurred',
          code: 'REQUEST_ERROR',
        } as ApiError);
      }
    },
  );

  /**
   * API client methods for HTTP operations
   * All methods automatically include authentication tokens
   */
  const api = {
    /**
     * Performs a GET request
     * @template T - Expected response type
     * @param url - API endpoint (relative to baseURL)
     * @param requestConfig - Optional axios request configuration
     * @returns Promise resolving to response data
     * 
     * @example
     * ```typescript
     * const user = await api.get<User>('/users/123');
     * ```
     */
    get: async <T = unknown>(
      url: string,
      requestConfig?: AxiosRequestConfig,
    ): Promise<T> => {
      const response = await apiClient.get<ApiResponse<T>>(url, requestConfig);
      return responseExtractor(response);
    },

    /**
     * Performs a POST request
     * @template T - Expected response type
     * @param url - API endpoint (relative to baseURL)
     * @param data - Request payload
     * @param requestConfig - Optional axios request configuration
     * @returns Promise resolving to response data
     * 
     * @example
     * ```typescript
     * const newUser = await api.post<User>('/users', { name: 'John' });
     * ```
     */
    post: async <T = unknown>(
      url: string,
      data?: unknown,
      requestConfig?: AxiosRequestConfig,
    ): Promise<T> => {
      const response = await apiClient.post<ApiResponse<T>>(
        url,
        data,
        requestConfig,
      );
      return responseExtractor(response);
    },

    /**
     * Performs a PUT request
     * @template T - Expected response type
     * @param url - API endpoint (relative to baseURL)
     * @param data - Request payload
     * @param requestConfig - Optional axios request configuration
     * @returns Promise resolving to response data
     */
    put: async <T = unknown>(
      url: string,
      data?: unknown,
      requestConfig?: AxiosRequestConfig,
    ): Promise<T> => {
      const response = await apiClient.put<ApiResponse<T>>(
        url,
        data,
        requestConfig,
      );
      return responseExtractor(response);
    },

    /**
     * Performs a PATCH request
     * @template T - Expected response type
     * @param url - API endpoint (relative to baseURL)
     * @param data - Request payload
     * @param requestConfig - Optional axios request configuration
     * @returns Promise resolving to response data
     */
    patch: async <T = unknown>(
      url: string,
      data?: unknown,
      requestConfig?: AxiosRequestConfig,
    ): Promise<T> => {
      const response = await apiClient.patch<ApiResponse<T>>(
        url,
        data,
        requestConfig,
      );
      return responseExtractor(response);
    },

    /**
     * Performs a DELETE request
     * @template T - Expected response type
     * @param url - API endpoint (relative to baseURL)
     * @param requestConfig - Optional axios request configuration
     * @returns Promise resolving to response data
     */
    delete: async <T = unknown>(
      url: string,
      requestConfig?: AxiosRequestConfig,
    ): Promise<T> => {
      const response = await apiClient.delete<ApiResponse<T>>(
        url,
        requestConfig,
      );
      return responseExtractor(response);
    },

    /**
     * Raw axios instance for advanced use cases
     * Use this when you need direct access to axios features
     * 
     * @example
     * ```typescript
     * const response = await api.client.get('/endpoint', {
     *   headers: { 'Custom-Header': 'value' },
     * });
     * ```
     */
    client: apiClient,
  };

  return api;
};

/**
 * Creates a Firebase Auth provider adapter
 * Convenience function for Firebase Authentication integration
 * 
 * @param firebaseAuth - Firebase Auth instance with currentUser and signOut
 * @returns AuthProvider compatible with createApiClient
 * 
 * @example
 * ```typescript
 * import { getAuth } from 'firebase/auth';
 * const auth = getAuth();
 * const provider = createFirebaseAuthProvider(auth);
 * ```
 */
export const createFirebaseAuthProvider = (
  firebaseAuth: { currentUser: { getIdToken: (forceRefresh?: boolean) => Promise<string> } | null; signOut: () => Promise<void> },
): AuthProvider => {
  return {
    getCurrentUser: async () => {
      return firebaseAuth.currentUser;
    },
    signOut: () => firebaseAuth.signOut(),
  };
};

// Default export for this project (Firebase-specific)
import { auth } from '@/lib/firebase/client';
import { toastError } from '../toast';

const firebaseAuthProvider = createFirebaseAuthProvider(auth);

export const api = createApiClient({
  baseURL:
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    'http://localhost:3000/api/v1',
  authProvider: firebaseAuthProvider,
  toastProvider: {
    error: toastError,
  },
  loginPath: '/login',
});

export default api;
