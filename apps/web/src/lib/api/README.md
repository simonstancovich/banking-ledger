# API Client Documentation

A reusable, type-safe API client with built-in authentication, error handling, and developer tools. Designed to work with any authentication system through a simple provider interface.

## Table of Contents

- [Features](#features)
- [Quick Start](#quick-start)
- [Core Concepts](#core-concepts)
- [Authentication Providers](#authentication-providers)
- [Configuration Options](#configuration-options)
- [Usage Examples](#usage-examples)
- [Type Safety](#type-safety)
- [Error Handling](#error-handling)
- [Best Practices](#best-practices)

## Features

- ✅ **Framework Agnostic**: Works with any auth system
- ✅ **Type-Safe**: Full TypeScript support
- ✅ **Automatic Token Management**: Handles token injection and refresh
- ✅ **Error Handling**: Comprehensive error handling with user feedback
- ✅ **Dev Tools**: Built-in request/response logging in development
- ✅ **Timeout Detection**: Automatic timeout error detection
- ✅ **401 Auto-Retry**: Automatic token refresh and request retry on 401
- ✅ **Flexible Configuration**: Highly configurable for different use cases

## Quick Start

### 1. Install Dependencies

```bash
npm install axios
# or
pnpm add axios
```

### 2. Create Your Auth Provider

Implement the `AuthProvider` interface for your authentication system:

```typescript
import { AuthProvider } from '@/lib/api/client';

const myAuthProvider: AuthProvider = {
  getCurrentUser: async () => {
    // Return user with getIdToken method, or null
  },
  signOut: async () => {
    // Sign out logic
  },
};
```

### 3. Create API Client

```typescript
import { createApiClient } from '@/lib/api/client';

export const api = createApiClient({
  baseURL: 'https://api.example.com',
  authProvider: myAuthProvider,
  loginPath: '/login',
});
```

### 4. Use It

```typescript
import { api } from '@/lib/api/client';

// GET request
const users = await api.get<User[]>('/users');

// POST request
const newUser = await api.post<User>('/users', { name: 'John' });
```

## Core Concepts

### AuthProvider Interface

The `AuthProvider` interface abstracts authentication logic, making the client work with any auth system:

```typescript
export interface AuthProvider {
  getCurrentUser: () => Promise<{
    getIdToken: (forceRefresh?: boolean) => Promise<string>;
  } | null>;
  signOut: () => Promise<void>;
}
```

**Requirements:**

- `getCurrentUser()`: Must return a user object with `getIdToken()` method, or `null` if not authenticated
- `getIdToken(forceRefresh?)`: Must return a JWT token string
- `signOut()`: Must sign out the current user

### ToastProvider Interface (Optional)

For user-facing error notifications:

```typescript
export interface ToastProvider {
  error: (message: string) => void;
}
```

## Authentication Providers

### Firebase Authentication

**Requirements:**

- Firebase Auth SDK installed
- Firebase project configured

**Implementation:**

```typescript
import { getAuth } from 'firebase/auth';
import { createApiClient, createFirebaseAuthProvider } from '@/lib/api/client';

const firebaseAuth = getAuth();

// Use the built-in Firebase adapter
const authProvider = createFirebaseAuthProvider(firebaseAuth);

export const api = createApiClient({
  baseURL:
    process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000/api/v1',
  authProvider,
  loginPath: '/login',
});
```

**Or implement manually:**

```typescript
import { getAuth } from 'firebase/auth';
import { AuthProvider } from '@/lib/api/client';

const firebaseAuth = getAuth();

const firebaseAuthProvider: AuthProvider = {
  getCurrentUser: async () => {
    return firebaseAuth.currentUser;
  },
  signOut: async () => {
    await firebaseAuth.signOut();
  },
};
```

### Auth0

**Requirements:**

- `@auth0/auth0-spa-js` installed

**Implementation:**

```typescript
import { useAuth0 } from '@auth0/auth0-spa-js';
import { AuthProvider } from '@/lib/api/client';

// In your setup file or hook
const { getAccessTokenSilently, logout, user } = useAuth0();

const auth0Provider: AuthProvider = {
  getCurrentUser: async () => {
    if (!user) return null;

    return {
      getIdToken: async (forceRefresh = false) => {
        return await getAccessTokenSilently({
          cacheMode: forceRefresh ? 'off' : 'on',
        });
      },
    };
  },
  signOut: async () => {
    await logout({ returnTo: window.location.origin });
  },
};

export const api = createApiClient({
  baseURL: 'https://api.example.com',
  authProvider: auth0Provider,
  loginPath: '/login',
});
```

### JWT with LocalStorage/SessionStorage

**Requirements:**

- Token stored in localStorage/sessionStorage
- Token refresh endpoint (optional)

**Implementation:**

```typescript
import { AuthProvider } from '@/lib/api/client';

const jwtProvider: AuthProvider = {
  getCurrentUser: async () => {
    const token = localStorage.getItem('authToken');
    const refreshToken = localStorage.getItem('refreshToken');

    if (!token) return null;

    return {
      getIdToken: async (forceRefresh = false) => {
        if (forceRefresh && refreshToken) {
          // Refresh token logic
          const response = await fetch('/api/auth/refresh', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken }),
          });

          if (response.ok) {
            const { token: newToken } = await response.json();
            localStorage.setItem('authToken', newToken);
            return newToken;
          }
        }

        return token;
      },
    };
  },
  signOut: async () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('refreshToken');
    window.location.href = '/login';
  },
};

export const api = createApiClient({
  baseURL: 'https://api.example.com',
  authProvider: jwtProvider,
  loginPath: '/login',
});
```

### Supabase

**Requirements:**

- `@supabase/supabase-js` installed

**Implementation:**

```typescript
import { createClient } from '@supabase/supabase-js';
import { AuthProvider } from '@/lib/api/client';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const supabaseProvider: AuthProvider = {
  getCurrentUser: async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) return null;

    return {
      getIdToken: async (forceRefresh = false) => {
        if (forceRefresh) {
          const {
            data: { session: newSession },
          } = await supabase.auth.refreshSession();
          return newSession?.access_token || session.access_token;
        }
        return session.access_token;
      },
    };
  },
  signOut: async () => {
    await supabase.auth.signOut();
  },
};

export const api = createApiClient({
  baseURL: 'https://api.example.com',
  authProvider: supabaseProvider,
  loginPath: '/login',
});
```

### NextAuth.js

**Requirements:**

- `next-auth` installed and configured

**Implementation:**

```typescript
import { getSession } from 'next-auth/react';
import { AuthProvider } from '@/lib/api/client';

const nextAuthProvider: AuthProvider = {
  getCurrentUser: async () => {
    const session = await getSession();

    if (!session?.accessToken) return null;

    return {
      getIdToken: async () => {
        return session.accessToken as string;
      },
    };
  },
  signOut: async () => {
    await signOut({ callbackUrl: '/login' });
  },
};

export const api = createApiClient({
  baseURL: 'https://api.example.com',
  authProvider: nextAuthProvider,
  loginPath: '/login',
});
```

### Custom/OAuth2

**Implementation:**

```typescript
import { AuthProvider } from '@/lib/api/client';

const customOAuthProvider: AuthProvider = {
  getCurrentUser: async () => {
    // Check if user is authenticated
    const token = getTokenFromStorage(); // Your token storage logic

    if (!token || isTokenExpired(token)) {
      return null;
    }

    return {
      getIdToken: async (forceRefresh = false) => {
        if (forceRefresh) {
          // Refresh token logic
          const newToken = await refreshAccessToken();
          saveTokenToStorage(newToken);
          return newToken;
        }
        return token;
      },
    };
  },
  signOut: async () => {
    clearTokenStorage();
    redirectToLogin();
  },
};

export const api = createApiClient({
  baseURL: 'https://api.example.com',
  authProvider: customOAuthProvider,
  loginPath: '/login',
});
```

## Configuration Options

### ApiClientConfig

```typescript
export interface ApiClientConfig {
  // Required
  baseURL: string; // API base URL
  authProvider: AuthProvider; // Authentication provider

  // Optional
  timeout?: number; // Request timeout in ms (default: 30000)
  toastProvider?: ToastProvider; // Toast notification system
  loginPath?: string; // Login redirect path (default: '/login')
  onUnauthorized?: () => void | Promise<void>; // Custom unauthorized handler (awaited before redirect)
  responseExtractor?: <T>(response: AxiosResponse<ApiResponse<T>>) => T; // Custom response extractor
  enableDevLogging?: boolean; // Enable dev logging (default: NODE_ENV === 'development')
}
```

### Configuration Examples

**Minimal Configuration:**

```typescript
export const api = createApiClient({
  baseURL: 'https://api.example.com',
  authProvider: myAuthProvider,
});
```

**Full Configuration:**

```typescript
export const api = createApiClient({
  baseURL: 'https://api.example.com',
  authProvider: myAuthProvider,
  timeout: 60000, // 60 seconds
  loginPath: '/auth/signin',
  enableDevLogging: true,
  toastProvider: {
    error: (message) => {
      // Your toast implementation
      toast.error(message);
    },
  },
  onUnauthorized: async () => {
    // Custom logic before redirect (fully awaited before redirect happens)
    await clearUserData();
    await trackLogoutEvent();
  },
  responseExtractor: <T>(response) => {
    // Custom extraction logic
    return response.data.result as T;
  },
});
```

## Usage Examples

### Basic Requests

```typescript
import { api } from '@/lib/api/client';

// GET request
const users = await api.get<User[]>('/users');

// GET with query params
const user = await api.get<User>('/users/123');

// POST request
const newUser = await api.post<User>('/users', {
  name: 'John Doe',
  email: 'john@example.com',
});

// PUT request
const updatedUser = await api.put<User>('/users/123', {
  name: 'Jane Doe',
});

// PATCH request
const patchedUser = await api.patch<User>('/users/123', {
  email: 'jane@example.com',
});

// DELETE request
await api.delete('/users/123');
```

### With TypeScript

```typescript
// Define your types
interface User {
  id: string;
  name: string;
  email: string;
}

interface CreateUserDto {
  name: string;
  email: string;
}

// Use with types
const user = await api.get<User>('/users/123');
const newUser = await api.post<User, CreateUserDto>('/users', {
  name: 'John',
  email: 'john@example.com',
});
```

### Advanced Usage

```typescript
// Access raw axios instance for advanced use cases
const response = await api.client.get('/endpoint', {
  headers: { 'Custom-Header': 'value' },
  params: { page: 1 },
});

// Use with AbortController for cancellation
const controller = new AbortController();
const promise = api.get('/endpoint', {
  signal: controller.signal,
});

// Cancel request
controller.abort();
```

## Type Safety

### Response Types

The client is fully type-safe. Always specify your response types:

```typescript
// ✅ Good - Type-safe
const user = await api.get<User>('/users/123');

// ❌ Avoid - Returns unknown
const user = await api.get('/users/123');
```

### Error Types

Errors are typed as `ApiError`:

```typescript
import { ApiError } from '@/lib/api/client';

try {
  await api.get('/endpoint');
} catch (error) {
  const apiError = error as ApiError;
  console.log(apiError.message);
  console.log(apiError.code);
  console.log(apiError.status);
}
```

## Error Handling

### Automatic Error Handling

The client automatically handles:

- **401 Unauthorized**: Attempts token refresh, then signs out and redirects
- **403 Forbidden**: Shows error toast
- **404 Not Found**: Shows error toast
- **500 Server Error**: Shows error toast
- **Network Errors**: Detects timeouts and network issues
- **Request Errors**: Handles request setup errors

### Custom Error Handling

```typescript
try {
  const data = await api.get('/endpoint');
} catch (error) {
  const apiError = error as ApiError;

  switch (apiError.code) {
    case 'TIMEOUT_ERROR':
      // Handle timeout
      break;
    case 'NETWORK_ERROR':
      // Handle network error
      break;
    case 'REQUEST_ERROR':
      // Handle request error
      break;
    default:
    // Handle other errors
  }
}
```

## Best Practices

### 1. Always Specify Types

```typescript
// ✅ Good
const user = await api.get<User>('/users/123');

// ❌ Avoid
const user = await api.get('/users/123');
```

### 2. Handle Errors Appropriately

```typescript
// ✅ Good
try {
  const data = await api.get<User>('/users/123');
} catch (error) {
  const apiError = error as ApiError;
  // Handle specific error cases
}

// ❌ Avoid - Silent failures
const data = await api.get<User>('/users/123').catch(() => null);
```

### 3. Use Environment Variables

```typescript
// ✅ Good
export const api = createApiClient({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000',
  authProvider: myAuthProvider,
});

// ❌ Avoid - Hard-coded URLs
export const api = createApiClient({
  baseURL: 'https://api.example.com',
  authProvider: myAuthProvider,
});
```

### 4. Create Auth Provider Once

```typescript
// ✅ Good - Create once, reuse
const authProvider = createMyAuthProvider();
export const api = createApiClient({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL,
  authProvider,
});

// ❌ Avoid - Creating multiple instances
export const api = createApiClient({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL,
  authProvider: createMyAuthProvider(), // New instance each time
});
```

### 5. Use Custom Response Extractors for Non-Standard APIs

```typescript
// If your API returns data in a different structure
export const api = createApiClient({
  baseURL: 'https://api.example.com',
  authProvider: myAuthProvider,
  responseExtractor: <T>(response) => {
    // Your API returns { result: T }
    return response.data.result as T;
  },
});
```

## Requirements Summary

### Minimum Requirements

1. **AuthProvider Implementation**

   - Must implement `getCurrentUser()` returning user with `getIdToken()` or `null`
   - Must implement `signOut()` for cleanup

2. **Token Format**

   - Tokens must be JWT strings
   - `getIdToken()` must return a Promise<string>

3. **Environment**
   - Node.js/Browser environment
   - Axios installed

### Optional Requirements

- **ToastProvider**: For user-facing error notifications
- **Custom Handlers**: For advanced use cases
- **Response Extractor**: For non-standard API response formats

## Troubleshooting

### Token Not Being Sent

**Problem:** Requests don't include Authorization header

**Solution:** Check that `getCurrentUser()` returns a user object with `getIdToken()` method:

```typescript
const authProvider: AuthProvider = {
  getCurrentUser: async () => {
    const user = await getMyUser();
    if (!user) return null;

    // ✅ Must return object with getIdToken
    return {
      getIdToken: async () => user.token,
    };
  },
  // ...
};
```

### 401 Not Triggering Refresh

**Problem:** 401 errors don't attempt token refresh

**Solution:** Ensure `getIdToken(true)` works for force refresh:

```typescript
getIdToken: async (forceRefresh = false) => {
  if (forceRefresh) {
    // Implement token refresh logic
    return await refreshToken();
  }
  return currentToken;
},
```

### Type Errors

**Problem:** TypeScript errors with response types

**Solution:** Always specify generic types:

```typescript
// ✅ Correct
const user = await api.get<User>('/users/123');

// ❌ Wrong
const user = await api.get('/users/123'); // Returns unknown
```

## License

This API client is part of your project template and can be reused across projects.
