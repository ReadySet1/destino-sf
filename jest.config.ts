import type { Config } from 'jest';
import nextJest from 'next/jest.js';

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files in your test environment
  dir: './',
});

// Add any custom config to be passed to Jest
const config: Config = {
  // Setup files
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],

  // Path mapping for TypeScript imports
  moduleNameMapper: {
    // Handle module aliases
    '^@/(.*)$': '<rootDir>/src/$1',
  },

  // Specify test match pattern
  testMatch: ['**/__tests__/**/*.test.[jt]s?(x)'],

  // Test environment based on file location
  testEnvironment: 'node', // Default to node for API and lib tests
  
  // Override test environment for specific files
  testEnvironmentOptions: {
    url: 'http://localhost',
  },

  // Global settings
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/__tests__/**',
    '!src/__mocks__/**',
    '!src/**/node_modules/**',
  ],

  coverageReporters: ['text', 'lcov', 'html'],
  
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },

  // Ignore these directories
  testPathIgnorePatterns: ['/node_modules/', '/.next/'],

  // Modules to mock
  moduleDirectories: ['node_modules', '<rootDir>'],

  // Add resolver
  resolver: '<rootDir>/jest.resolver.cjs',
};

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
export default createJestConfig(config);
