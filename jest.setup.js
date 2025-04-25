import { TextEncoder, TextDecoder } from 'util';
const fetch = require('node-fetch');

if (typeof global.TextEncoder === 'undefined') {
  global.TextEncoder = TextEncoder;
}
if (typeof global.TextDecoder === 'undefined') {
  global.TextDecoder = TextDecoder;
}

if (!global.fetch) {
  global.fetch = fetch;
}
if (!global.Request) {
  global.Request = fetch.Request;
}
if (!global.Response) {
  global.Response = fetch.Response;
}
if (!global.Headers) {
  global.Headers = fetch.Headers;
}

// Import jest-dom for DOM testing extensions
import '@testing-library/jest-dom';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
  }),
  useParams: () => ({}),
  usePathname: () => '',
  useSearchParams: () => new URLSearchParams(),
}));

// Mock next-themes
jest.mock('next-themes', () => ({
  useTheme: () => ({
    theme: 'light',
    setTheme: jest.fn(),
  }),
}));

// Mock Supabase
jest.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    auth: {
      getSession: jest.fn().mockResolvedValue({ data: { session: null } }),
      onAuthStateChange: jest.fn(() => ({ data: { subscription: { unsubscribe: jest.fn() } } })),
    },
  }),
}));

// This extends Jest's expect
expect.extend({
  toHaveClass(received, className) {
    const pass = received.classList.contains(className);
    return {
      message: () => `expected ${received} ${pass ? 'not ' : ''}to have class "${className}"`,
      pass,
    };
  },
});
