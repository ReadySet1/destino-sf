/**
 * 🔐 Supabase SSR Auth Helpers Mock
 * Mock implementation for Supabase SSR authentication helpers used in Next.js
 */

import { mockSupabaseClient, setMockAuthState, resetMockAuthState, generateMockUser, generateMockSession } from './supabase-js';
import type { CookieOptions } from '@supabase/ssr';

// Mock Browser Client
export const createBrowserClient = jest.fn().mockImplementation((
  supabaseUrl: string,
  supabaseAnonKey: string,
  options?: {
    auth?: {
      persistSession?: boolean;
      detectSessionInUrl?: boolean;
      autoRefreshToken?: boolean;
      storage?: any;
      flowType?: string;
    };
    global?: {
      headers?: Record<string, string>;
    };
    db?: {
      schema?: string;
    };
    realtime?: {
      params?: Record<string, any>;
    };
  }
) => {
  return mockSupabaseClient;
});

// Mock Server Client
export const createServerClient = jest.fn().mockImplementation((
  supabaseUrl: string,
  supabaseAnonKey: string,
  options?: {
    cookies?: {
      get?: (name: string) => string | undefined;
      set?: (name: string, value: string, options?: CookieOptions) => void;
      remove?: (name: string, options?: CookieOptions) => void;
    };
    auth?: {
      persistSession?: boolean;
      autoRefreshToken?: boolean;
      detectSessionInUrl?: boolean;
    };
  }
) => {
  return mockSupabaseClient;
});

// Mock Route Handler Client
export const createRouteHandlerClient = jest.fn().mockImplementation((
  context: {
    req?: any;
    res?: any;
    cookies?: () => any;
  },
  options?: {
    supabaseUrl?: string;
    supabaseKey?: string;
  }
) => {
  return mockSupabaseClient;
});

// Mock Middleware Client
export const createMiddlewareClient = jest.fn().mockImplementation((
  context: {
    req: any;
    res: any;
  },
  options?: {
    supabaseUrl?: string;
    supabaseKey?: string;
  }
) => {
  return {
    ...mockSupabaseClient,
    // Additional middleware-specific methods
    auth: {
      ...mockSupabaseClient.auth,
      getSession: jest.fn().mockResolvedValue({
        data: { session: null },
        error: null
      })
    }
  };
});

// Mock Server Component Client
export const createServerComponentClient = jest.fn().mockImplementation((
  context?: {
    cookies?: () => any;
  },
  options?: {
    supabaseUrl?: string;
    supabaseKey?: string;
  }
) => {
  return mockSupabaseClient;
});

// Cookie handling utilities for testing
export const mockCookieHandler = {
  get: jest.fn().mockImplementation((name: string): string | undefined => {
    // Mock cookie storage
    const mockCookies: Record<string, string> = {
      'sb-access-token': 'mock_access_token',
      'sb-refresh-token': 'mock_refresh_token',
      'sb-auth-token': JSON.stringify({
        access_token: 'mock_access_token',
        refresh_token: 'mock_refresh_token',
        expires_at: Date.now() + 3600000,
        user: generateMockUser()
      })
    };
    return mockCookies[name];
  }),

  set: jest.fn().mockImplementation((
    name: string, 
    value: string, 
    options?: CookieOptions
  ): void => {
    // Mock setting cookies
    console.log(`Mock setting cookie: ${name} = ${value}`);
  }),

  remove: jest.fn().mockImplementation((
    name: string, 
    options?: CookieOptions
  ): void => {
    // Mock removing cookies
    console.log(`Mock removing cookie: ${name}`);
  })
};

// Parse and serialize utilities
export const parseCookieHeader = jest.fn().mockImplementation((
  cookieHeader: string
): Record<string, string> => {
  const cookies: Record<string, string> = {};
  if (cookieHeader) {
    cookieHeader.split(';').forEach(cookie => {
      const [name, value] = cookie.trim().split('=');
      if (name && value) {
        cookies[name] = decodeURIComponent(value);
      }
    });
  }
  return cookies;
});

export const serializeCookie = jest.fn().mockImplementation((
  name: string,
  value: string,
  options?: CookieOptions
): string => {
  let cookie = `${name}=${encodeURIComponent(value)}`;
  
  if (options?.maxAge) {
    cookie += `; Max-Age=${options.maxAge}`;
  }
  
  if (options?.expires) {
    cookie += `; Expires=${options.expires.toUTCString()}`;
  }
  
  if (options?.path) {
    cookie += `; Path=${options.path}`;
  }
  
  if (options?.domain) {
    cookie += `; Domain=${options.domain}`;
  }
  
  if (options?.secure) {
    cookie += '; Secure';
  }
  
  if (options?.httpOnly) {
    cookie += '; HttpOnly';
  }
  
  if (options?.sameSite) {
    cookie += `; SameSite=${options.sameSite}`;
  }
  
  return cookie;
});

// Auth helpers for testing different scenarios
export const mockAuthScenarios = {
  // Set up authenticated user
  authenticatedUser: () => {
    const user = generateMockUser({
      email: 'admin@destino-sf.com',
      user_metadata: { role: 'admin' }
    });
    const session = generateMockSession(user);
    setMockAuthState(user, session);
    return { user, session };
  },

  // Set up unauthenticated state
  unauthenticatedUser: () => {
    setMockAuthState(null, null);
  },

  // Set up user with specific role
  userWithRole: (role: string) => {
    const user = generateMockUser({
      email: `${role}@destino-sf.com`,
      user_metadata: { role }
    });
    const session = generateMockSession(user);
    setMockAuthState(user, session);
    return { user, session };
  },

  // Set up expired session
  expiredSession: () => {
    const user = generateMockUser();
    const session = generateMockSession(user);
    session.expires_at = Math.floor(Date.now() / 1000) - 3600; // Expired 1 hour ago
    setMockAuthState(user, session);
    return { user, session };
  },

  // Reset to initial state
  reset: () => {
    resetMockAuthState();
  }
};

// Mock Request/Response helpers for server-side testing
export const createMockRequestResponse = () => {
  const mockReq = {
    headers: {
      cookie: 'sb-access-token=mock_token; sb-refresh-token=mock_refresh'
    },
    cookies: mockCookieHandler
  };

  const mockRes = {
    setHeader: jest.fn(),
    getHeader: jest.fn(),
    cookies: mockCookieHandler
  };

  return { req: mockReq, res: mockRes };
};

// Next.js specific mocks
export const createMockNextRequest = () => ({
  cookies: {
    get: mockCookieHandler.get,
    set: mockCookieHandler.set,
    delete: mockCookieHandler.remove,
    getAll: jest.fn().mockReturnValue([])
  },
  headers: new Map([
    ['cookie', 'sb-access-token=mock_token; sb-refresh-token=mock_refresh']
  ])
});

export const createMockNextResponse = () => ({
  cookies: {
    set: mockCookieHandler.set,
    delete: mockCookieHandler.remove
  }
});

// Export everything for easy testing
export {
  mockSupabaseClient,
  setMockAuthState,
  resetMockAuthState,
  generateMockUser,
  generateMockSession
};

// Default export
export default {
  createBrowserClient,
  createServerClient,
  createRouteHandlerClient,
  createMiddlewareClient,
  createServerComponentClient,
  mockCookieHandler,
  mockAuthScenarios,
  createMockRequestResponse,
  createMockNextRequest,
  createMockNextResponse
};
