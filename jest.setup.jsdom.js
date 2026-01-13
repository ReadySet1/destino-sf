// Jest setup for jsdom environment (Component tests)
require('@testing-library/jest-dom');
const { TextEncoder, TextDecoder } = require('util');

// Fix TextEncoder/TextDecoder for Node environment
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// Load test environment variables
require('dotenv').config({ path: '.env.test' });

// Ensure test environment
process.env.NODE_ENV = 'test';

// Mock environment variables for tests
process.env.NEXT_PUBLIC_SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://test.supabase.co';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'test-key';

// Mock fetch for tests
global.fetch = jest.fn();

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks();
});

// Mock Next.js router for component tests
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '',
  useParams: () => ({}),
}));

// Mock next-themes
jest.mock('next-themes', () => ({
  useTheme: () => ({
    theme: 'light',
    setTheme: jest.fn(),
  }),
}));

// Mock next/font/google
jest.mock('next/font/google', () => ({
  Dancing_Script: () => ({
    className: 'dancing-script-class',
    style: { fontFamily: 'Dancing Script' },
  }),
  Inter: () => ({
    className: 'inter-class',
    style: { fontFamily: 'Inter' },
  }),
  Poppins: () => ({
    className: 'poppins-class',
    style: { fontFamily: 'Poppins' },
  }),
}));

// Mock Supabase for component tests
jest.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    auth: {
      getSession: jest.fn().mockResolvedValue({ data: { session: null } }),
      onAuthStateChange: jest.fn(() => ({ data: { subscription: { unsubscribe: jest.fn() } } })),
      getUser: jest.fn().mockResolvedValue({ data: { user: null } }),
    },
  }),
}));

// Mock @testing-library/user-event
jest.mock('@testing-library/user-event', () => {
  const mockUserEventInstance = {
    click: jest.fn().mockResolvedValue(undefined),
    type: jest.fn().mockResolvedValue(undefined),
    clear: jest.fn().mockResolvedValue(undefined),
    selectOptions: jest.fn().mockResolvedValue(undefined),
    upload: jest.fn().mockResolvedValue(undefined),
    hover: jest.fn().mockResolvedValue(undefined),
    unhover: jest.fn().mockResolvedValue(undefined),
    keyboard: jest.fn().mockResolvedValue(undefined),
    pointer: jest.fn().mockResolvedValue(undefined),
    tab: jest.fn().mockResolvedValue(undefined),
    dblClick: jest.fn().mockResolvedValue(undefined),
    tripleClick: jest.fn().mockResolvedValue(undefined),
  };

  const userEventObject = {
    ...mockUserEventInstance,
    setup: jest.fn(() => mockUserEventInstance),
  };

  return {
    __esModule: true,
    default: userEventObject,
  };
});

// Add console mock for cleaner test output
global.console = {
  ...console,
  warn: jest.fn(),
  error: jest.fn(),
  log: jest.fn(),
};

// Mock localStorage for Zustand persist middleware
const localStorageMock = {
  getItem: jest.fn(() => null),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
  length: 0,
  key: jest.fn(() => null),
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

// Reset Zustand stores before each test to ensure clean state
beforeEach(() => {
  // Clear localStorage mock
  localStorageMock.getItem.mockReturnValue(null);
  localStorageMock.setItem.mockClear();
  localStorageMock.removeItem.mockClear();
  localStorageMock.clear.mockClear();
});
