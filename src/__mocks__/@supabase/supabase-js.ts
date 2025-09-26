/**
 * 🔐 Supabase JS Mock Implementation
 * Comprehensive mock for Supabase client including auth, database, and realtime
 */

import type { Session, User, AuthError, AuthResponse, UserResponse } from '@supabase/supabase-js';

// Mock data generators
const generateMockId = (prefix: string = 'user'): string => 
  `${prefix}_${Math.random().toString(36).substring(2, 15)}`;

const generateMockTimestamp = (): string => new Date().toISOString();

// Mock User Generator
const generateMockUser = (overrides: Partial<User> = {}): User => ({
  id: generateMockId('user'),
  aud: 'authenticated',
  role: 'authenticated',
  email: 'test@destino-sf.com',
  email_confirmed_at: generateMockTimestamp(),
  phone: '',
  confirmation_sent_at: generateMockTimestamp(),
  confirmed_at: generateMockTimestamp(),
  last_sign_in_at: generateMockTimestamp(),
  app_metadata: {
    provider: 'email',
    providers: ['email']
  },
  user_metadata: {
    email: 'test@destino-sf.com'
  },
  identities: [
    {
      id: generateMockId('identity'),
      user_id: generateMockId('user'),
      identity_data: {
        email: 'test@destino-sf.com'
      },
      provider: 'email',
      last_sign_in_at: generateMockTimestamp(),
      created_at: generateMockTimestamp(),
      updated_at: generateMockTimestamp()
    }
  ],
  created_at: generateMockTimestamp(),
  updated_at: generateMockTimestamp(),
  is_anonymous: false,
  ...overrides
});

// Mock Session Generator
const generateMockSession = (user?: User): Session => ({
  access_token: 'mock_access_token_' + Math.random().toString(36).substring(2),
  refresh_token: 'mock_refresh_token_' + Math.random().toString(36).substring(2),
  expires_in: 3600,
  expires_at: Math.floor(Date.now() / 1000) + 3600,
  token_type: 'bearer',
  user: user || generateMockUser()
});

// Mock Auth Error Generator
const generateMockAuthError = (
  message: string = 'Mock auth error',
  status: number = 400
): AuthError => ({
  name: 'AuthError',
  message,
  status
});

// Mock Auth State
let mockCurrentUser: User | null = null;
let mockCurrentSession: Session | null = null;
let mockAuthListeners: Array<(event: string, session: Session | null) => void> = [];

// Auth state management for testing
export const setMockAuthState = (user: User | null, session: Session | null = null) => {
  mockCurrentUser = user;
  mockCurrentSession = session || (user ? generateMockSession(user) : null);
  
  // Notify listeners
  mockAuthListeners.forEach(listener => {
    listener(user ? 'SIGNED_IN' : 'SIGNED_OUT', mockCurrentSession);
  });
};

export const resetMockAuthState = () => {
  mockCurrentUser = null;
  mockCurrentSession = null;
  mockAuthListeners = [];
};

// Mock Auth API
const mockAuth = {
  // Session management
  getSession: jest.fn().mockImplementation((): Promise<{ data: { session: Session | null }, error: null }> => {
    return Promise.resolve({
      data: { session: mockCurrentSession },
      error: null
    });
  }),

  getUser: jest.fn().mockImplementation((): Promise<UserResponse> => {
    return Promise.resolve({
      data: { user: mockCurrentUser },
      error: null
    });
  }),

  setSession: jest.fn().mockImplementation((tokens: {
    access_token: string;
    refresh_token: string;
  }): Promise<AuthResponse> => {
    const mockUser = generateMockUser();
    const session = generateMockSession(mockUser);
    setMockAuthState(mockUser, session);
    
    return Promise.resolve({
      data: { user: mockUser, session },
      error: null
    });
  }),

  // Authentication methods
  signUp: jest.fn().mockImplementation((credentials: {
    email: string;
    password: string;
    options?: any;
  }): Promise<AuthResponse> => {
    if (credentials.email.includes('invalid')) {
      return Promise.resolve({
        data: { user: null, session: null },
        error: generateMockAuthError('Invalid email format')
      });
    }

    const mockUser = generateMockUser({ email: credentials.email });
    const session = generateMockSession(mockUser);
    setMockAuthState(mockUser, session);

    return Promise.resolve({
      data: { user: mockUser, session },
      error: null
    });
  }),

  signInWithPassword: jest.fn().mockImplementation((credentials: {
    email: string;
    password: string;
  }): Promise<AuthResponse> => {
    if (credentials.password === 'wrong_password') {
      return Promise.resolve({
        data: { user: null, session: null },
        error: generateMockAuthError('Invalid login credentials')
      });
    }

    const mockUser = generateMockUser({ email: credentials.email });
    const session = generateMockSession(mockUser);
    setMockAuthState(mockUser, session);

    return Promise.resolve({
      data: { user: mockUser, session },
      error: null
    });
  }),

  signInWithOtp: jest.fn().mockImplementation((credentials: {
    email: string;
    options?: any;
  }): Promise<{ data: any, error: AuthError | null }> => {
    return Promise.resolve({
      data: { user: null, session: null },
      error: null
    });
  }),

  signOut: jest.fn().mockImplementation((): Promise<{ error: AuthError | null }> => {
    setMockAuthState(null, null);
    return Promise.resolve({ error: null });
  }),

  // Password management
  resetPasswordForEmail: jest.fn().mockImplementation((email: string): Promise<{ 
    data: any, 
    error: AuthError | null 
  }> => {
    return Promise.resolve({
      data: {},
      error: null
    });
  }),

  updateUser: jest.fn().mockImplementation((attributes: {
    email?: string;
    password?: string;
    data?: any;
  }): Promise<UserResponse> => {
    if (mockCurrentUser) {
      const updatedUser = {
        ...mockCurrentUser,
        ...attributes,
        email: attributes.email || mockCurrentUser.email,
        updated_at: generateMockTimestamp()
      };
      setMockAuthState(updatedUser, mockCurrentSession);
      
      return Promise.resolve({
        data: { user: updatedUser },
        error: null
      });
    }

    return Promise.resolve({
      data: { user: null },
      error: generateMockAuthError('User not authenticated')
    });
  }),

  // Session refresh
  refreshSession: jest.fn().mockImplementation((refresh_token?: string): Promise<AuthResponse> => {
    if (mockCurrentSession) {
      const refreshedSession = {
        ...mockCurrentSession,
        access_token: 'refreshed_' + mockCurrentSession.access_token,
        expires_at: Math.floor(Date.now() / 1000) + 3600
      };
      setMockAuthState(mockCurrentUser, refreshedSession);

      return Promise.resolve({
        data: { user: mockCurrentUser, session: refreshedSession },
        error: null
      });
    }

    return Promise.resolve({
      data: { user: null, session: null },
      error: generateMockAuthError('No session to refresh')
    });
  }),

  // Auth state listeners
  onAuthStateChange: jest.fn().mockImplementation((callback: (
    event: string, 
    session: Session | null
  ) => void): { data: { subscription: { unsubscribe: () => void } } } => {
    mockAuthListeners.push(callback);
    
    // Immediately call with current state
    callback(mockCurrentSession ? 'SIGNED_IN' : 'SIGNED_OUT', mockCurrentSession);

    return {
      data: {
        subscription: {
          unsubscribe: () => {
            const index = mockAuthListeners.indexOf(callback);
            if (index > -1) {
              mockAuthListeners.splice(index, 1);
            }
          }
        }
      }
    };
  })
};

// Mock Database API
const mockDatabase = {
  from: jest.fn().mockImplementation((table: string) => ({
    select: jest.fn().mockImplementation((columns?: string) => ({
      eq: jest.fn().mockReturnThis(),
      neq: jest.fn().mockReturnThis(),
      gt: jest.fn().mockReturnThis(),
      gte: jest.fn().mockReturnThis(),
      lt: jest.fn().mockReturnThis(),
      lte: jest.fn().mockReturnThis(),
      like: jest.fn().mockReturnThis(),
      ilike: jest.fn().mockReturnThis(),
      is: jest.fn().mockReturnThis(),
      in: jest.fn().mockReturnThis(),
      contains: jest.fn().mockReturnThis(),
      containedBy: jest.fn().mockReturnThis(),
      rangeGt: jest.fn().mockReturnThis(),
      rangeGte: jest.fn().mockReturnThis(),
      rangeLt: jest.fn().mockReturnThis(),
      rangeLte: jest.fn().mockReturnThis(),
      rangeAdjacent: jest.fn().mockReturnThis(),
      overlaps: jest.fn().mockReturnThis(),
      textSearch: jest.fn().mockReturnThis(),
      match: jest.fn().mockReturnThis(),
      not: jest.fn().mockReturnThis(),
      filter: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      range: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ 
        data: { id: 1, name: 'Mock Record' }, 
        error: null 
      }),
      maybeSingle: jest.fn().mockResolvedValue({ 
        data: { id: 1, name: 'Mock Record' }, 
        error: null 
      }),
      then: jest.fn().mockImplementation((callback) => {
        const mockResult = { 
          data: [{ id: 1, name: 'Mock Record' }], 
          error: null 
        };
        return Promise.resolve(callback(mockResult));
      })
    })),
    insert: jest.fn().mockImplementation((values: any) => ({
      select: jest.fn().mockResolvedValue({ 
        data: Array.isArray(values) ? values : [values], 
        error: null 
      }),
      then: jest.fn().mockImplementation((callback) => {
        const mockResult = { 
          data: Array.isArray(values) ? values : [values], 
          error: null 
        };
        return Promise.resolve(callback(mockResult));
      })
    })),
    update: jest.fn().mockImplementation((values: any) => ({
      eq: jest.fn().mockReturnThis(),
      neq: jest.fn().mockReturnThis(),
      match: jest.fn().mockReturnThis(),
      select: jest.fn().mockResolvedValue({ 
        data: [{ ...values, id: 1 }], 
        error: null 
      }),
      then: jest.fn().mockImplementation((callback) => {
        const mockResult = { 
          data: [{ ...values, id: 1 }], 
          error: null 
        };
        return Promise.resolve(callback(mockResult));
      })
    })),
    delete: jest.fn().mockImplementation(() => ({
      eq: jest.fn().mockReturnThis(),
      neq: jest.fn().mockReturnThis(),
      match: jest.fn().mockReturnThis(),
      then: jest.fn().mockImplementation((callback) => {
        const mockResult = { 
          data: null, 
          error: null 
        };
        return Promise.resolve(callback(mockResult));
      })
    })),
    upsert: jest.fn().mockImplementation((values: any) => ({
      select: jest.fn().mockResolvedValue({ 
        data: Array.isArray(values) ? values : [values], 
        error: null 
      }),
      then: jest.fn().mockImplementation((callback) => {
        const mockResult = { 
          data: Array.isArray(values) ? values : [values], 
          error: null 
        };
        return Promise.resolve(callback(mockResult));
      })
    }))
  }))
};

// Mock Storage API
const mockStorage = {
  from: jest.fn().mockImplementation((bucket: string) => ({
    upload: jest.fn().mockResolvedValue({
      data: { path: `${bucket}/mock-file.jpg` },
      error: null
    }),
    download: jest.fn().mockResolvedValue({
      data: new Blob(['mock file content']),
      error: null
    }),
    remove: jest.fn().mockResolvedValue({
      data: null,
      error: null
    }),
    getPublicUrl: jest.fn().mockReturnValue({
      data: { publicUrl: `https://mock-storage.supabase.co/storage/v1/object/public/${bucket}/mock-file.jpg` }
    }),
    createSignedUrl: jest.fn().mockResolvedValue({
      data: { signedUrl: `https://mock-storage.supabase.co/storage/v1/object/sign/${bucket}/mock-file.jpg?token=mock-token` },
      error: null
    })
  }))
};

// Mock Realtime API
const mockRealtime = {
  channel: jest.fn().mockImplementation((name: string) => ({
    on: jest.fn().mockReturnThis(),
    subscribe: jest.fn().mockReturnThis(),
    unsubscribe: jest.fn().mockReturnThis()
  }))
};

// Mock Supabase Client
export const mockSupabaseClient = {
  auth: mockAuth,
  from: mockDatabase.from,
  storage: mockStorage,
  realtime: mockRealtime,
  
  // Additional client methods
  removeAllChannels: jest.fn(),
  getChannels: jest.fn().mockReturnValue([])
};

// Mock createClient function
export const createClient = jest.fn().mockReturnValue(mockSupabaseClient);

// Export utilities for testing
export {
  generateMockUser,
  generateMockSession,
  generateMockAuthError,
  setMockAuthState,
  resetMockAuthState,
  mockAuth,
  mockDatabase,
  mockStorage,
  mockRealtime
};

// Default export for compatibility
export default {
  createClient,
  mockSupabaseClient,
  generateMockUser,
  generateMockSession,
  setMockAuthState,
  resetMockAuthState
};
