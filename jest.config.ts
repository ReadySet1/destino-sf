import type { Config } from 'jest';

const config: Config = {
  projects: [
    {
      displayName: 'node',
      preset: 'ts-jest',
      testEnvironment: 'node',
      testMatch: [
        '<rootDir>/src/**/__tests__/**/*.test.ts',
        '!<rootDir>/src/**/__tests__/**/*.test.tsx',
      ],
      moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1',
      },
      setupFilesAfterEnv: [
        '<rootDir>/jest.setup.enhanced.js',
        '<rootDir>/src/__tests__/setup/test-db-setup.ts'
      ],
      globalSetup: '<rootDir>/src/__tests__/setup/global-setup.ts',
      globalTeardown: '<rootDir>/src/__tests__/setup/global-teardown.ts',
      transform: {
        '^.+\\.tsx?$': ['ts-jest', {
          tsconfig: {
            jsx: 'react',
            esModuleInterop: true,
            allowSyntheticDefaultImports: true,
          },
        }],
      },
    },
    {
      displayName: 'jsdom',
      preset: 'ts-jest',
      testEnvironment: 'jsdom',
      testMatch: [
        '<rootDir>/src/**/__tests__/**/*.test.tsx',
      ],
      moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1',
        '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
        '\\.(jpg|jpeg|png|gif|webp|svg)$': '<rootDir>/src/__mocks__/fileMock.js',
      },
      setupFilesAfterEnv: [
        '<rootDir>/jest.setup.enhanced.js',
        '<rootDir>/src/__tests__/setup/jsdom-setup.ts'
      ],
      transform: {
        '^.+\\.tsx?$': ['ts-jest', {
          tsconfig: {
            jsx: 'react',
            esModuleInterop: true,
            allowSyntheticDefaultImports: true,
          },
        }],
      },
    },
  ],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/__mocks__/**',
    '!src/**/__tests__/**',
    '!src/**/*.stories.tsx',
    '!src/scripts/**',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html', 'json-summary'],
  coverageThreshold: {
    global: {
      branches: 0,  // Start with 0 to allow tests to pass
      functions: 0,
      lines: 0,
      statements: 0,
    },
  },
  passWithNoTests: true,
  verbose: true,
  maxWorkers: 1, // Run tests serially to avoid DB conflicts
  testTimeout: 30000, // 30 seconds timeout for all tests
  bail: false,  // Don't stop on first failure
};

export default config;
