import type { Config } from 'jest';
import nextJest from 'next/jest.js';

const createJestConfig = nextJest({
  dir: './',
});

// Base configuration shared across all test types
const baseConfig: Partial<Config> = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  testPathIgnorePatterns: ['/node_modules/', '/.next/'],
  moduleDirectories: ['node_modules', '<rootDir>'],
  resolver: '<rootDir>/jest.resolver.cjs',
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
};

// Main configuration that delegates to specific environments
const config: Config = {
  ...baseConfig,
  projects: [
    // Node.js environment for API routes, lib, and utils
    {
      ...baseConfig,
      displayName: 'node',
      testEnvironment: 'node',
      testMatch: [
        '<rootDir>/src/__tests__/lib/**/*.test.ts',
        '<rootDir>/src/__tests__/utils/**/*.test.ts',
        '<rootDir>/src/__tests__/app/api/**/*.test.ts',
      ],
      setupFilesAfterEnv: ['<rootDir>/jest.setup.js', '<rootDir>/src/__tests__/setup/node-setup.js'],
    },
    // jsdom environment for React components
    {
      ...baseConfig,
      displayName: 'jsdom',
      testEnvironment: 'jsdom',
      testMatch: [
        '<rootDir>/src/__tests__/components/**/*.test.tsx',
        '<rootDir>/src/__tests__/components/**/*.test.ts',
      ],
      setupFilesAfterEnv: ['<rootDir>/jest.setup.js', '<rootDir>/src/__tests__/setup/jsdom-setup.js'],
      testEnvironmentOptions: {
        url: 'http://localhost:3000',
      },
    },
    // Real database integration tests
    {
      ...baseConfig,
      displayName: 'integration-db',
      testEnvironment: 'node',
      testMatch: [
        '<rootDir>/src/__tests__/integration/**/*.db.test.ts',
      ],
      setupFilesAfterEnv: [
        '<rootDir>/jest.setup.js', 
        '<rootDir>/src/__tests__/setup/integration-db-setup.js'
      ],
      globalSetup: '<rootDir>/src/__tests__/setup/global-db-setup.js',
      globalTeardown: '<rootDir>/src/__tests__/setup/global-db-teardown.js',
      // Run integration tests serially to avoid database conflicts
      maxWorkers: 1,
    },
  ],
};

export default createJestConfig(config);
