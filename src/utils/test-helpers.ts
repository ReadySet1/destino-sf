/**
 * Test helper utilities for creating mock requests and testing infrastructure
 */

import { NextRequest } from 'next/server';

export function createMockRequest(
  url: string = 'http://localhost:3000/test',
  options: {
    method?: string;
    headers?: Record<string, string>;
    body?: string | null;
  } = {}
): NextRequest {
  const { method = 'GET', headers = {}, body = null } = options;

  const request = new NextRequest(url, {
    method,
    headers: new Headers(headers),
    body,
  });

  return request;
}

export function createMockResponse(
  data: any = null,
  status: number = 200,
  headers: Record<string, string> = {}
): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  });
}

export function createMockUser(overrides: any = {}) {
  return {
    id: 'test-user-id',
    email: 'test@example.com',
    user_metadata: {},
    app_metadata: {},
    aud: 'authenticated',
    created_at: '2024-01-01T00:00:00Z',
    ...overrides,
  };
}

export function createMockSession(user: any = createMockUser()) {
  return {
    access_token: 'mock-access-token',
    refresh_token: 'mock-refresh-token',
    expires_in: 3600,
    expires_at: Date.now() + 3600000,
    token_type: 'bearer',
    user,
  };
}

export function createMockSupabaseClient() {
  return {
    auth: {
      getUser: jest.fn().mockResolvedValue({
        data: { user: createMockUser() },
        error: null,
      }),
      getSession: jest.fn().mockResolvedValue({
        data: { session: createMockSession() },
        error: null,
      }),
      signInWithPassword: jest.fn(),
      signOut: jest.fn(),
      onAuthStateChange: jest.fn(() => ({
        data: { subscription: { unsubscribe: jest.fn() } },
      })),
    },
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null, error: null }),
    })),
  };
}
