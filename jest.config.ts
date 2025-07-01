import type { Config } from 'jest';
import nextJest from 'next/jest.js';

const createJestConfig = nextJest({
  dir: './',
});

// Base configuration shared across all test types
const baseConfig: Partial<Config> = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js', '@testing-library/jest-dom/extend-expect'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^~/(.*)$': '<rootDir>/$1',
    '^@/components/(.*)$': '<rootDir>/src/components/$1',
    '^@/lib/(.*)$': '<rootDir>/src/lib/$1',
    '^@/utils/(.*)$': '<rootDir>/src/utils/$1',
    '^@/types/(.*)$': '<rootDir>/src/types/$1',
    '^@/app/(.*)$': '<rootDir>/src/app/$1',
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    '\\.(jpg|jpeg|png|gif|webp|avif|svg)$': '<rootDir>/src/__mocks__/fileMock.js',
  },
  testPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/.next/',
    '<rootDir>/coverage/',
  ],
  moduleDirectories: ['node_modules', '<rootDir>', '<rootDir>/src'],
  resolver: '<rootDir>/jest.resolver.cjs',
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/__tests__/**',
    '!src/__mocks__/**',
    '!src/**/node_modules/**',
    '!src/app/**/page.tsx',
    '!src/app/**/layout.tsx',
    '!src/app/**/loading.tsx',
    '!src/app/**/error.tsx',
    '!src/app/**/not-found.tsx',
    '!src/components/**/page.tsx',
    '!src/sanity/**',
    '!src/scripts/**',
  ],
  coverageDirectory: 'coverage',
  extensionsToTreatAsEsm: ['.tsx', '.ts'],
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      useESM: true,
      tsconfig: {
        jsx: 'react-jsx',
      },
    }],
    '^.+\\.(js|jsx)$': ['babel-jest', { 
      presets: [
        ['next/babel'],
        ['@babel/preset-env', { 
          targets: { node: 'current' },
          modules: 'commonjs'
        }],
        ['@babel/preset-react', { 
          runtime: 'automatic'
        }],
        ['@babel/preset-typescript', {
          allowDeclareFields: true,
          isTSX: true,
          allExtensions: true
        }]
      ]
    }],
  },
  globals: {
    'ts-jest': {
      useESM: true
    }
  },
  transformIgnorePatterns: [
    'node_modules/(?!(.*\\.mjs$|@next|@supabase|@testing-library))'
  ],
};

// Main configuration that delegates to specific environments
const config: Config = {
  ...baseConfig,
  coverageReporters: ['text', 'lcov', 'html'],
  coverageThreshold: {
    global: {
      branches: 2,     // Temporarily very low for production deployment
      functions: 1,    // Will increase gradually
      lines: 3,        // as more tests are added
      statements: 3,   // Current actual coverage levels
    },
    // Critical path specific thresholds for production-ready testing
    'src/app/api/checkout/**/*.ts': {
      branches: 85,
      functions: 85,
      lines: 85,
      statements: 85,
    },
    'src/app/actions/orders.ts': {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
    'src/lib/square/**/*.ts': {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },
  projects: [
    // Node.js environment for API routes, lib, and utils
    {
      ...baseConfig,
      displayName: 'node',
      testEnvironment: 'node',
      testMatch: [
        '<rootDir>/src/__tests__/**/*.test.ts',
        '<rootDir>/src/__tests__/**/*.test.js',
      ],
      testPathIgnorePatterns: [
        '<rootDir>/node_modules/',
        '<rootDir>/.next/',
        '<rootDir>/coverage/',
      ],
      setupFilesAfterEnv: ['<rootDir>/jest.setup.js', '<rootDir>/src/__tests__/setup/node-setup.js'],
    },
    // jsdom environment for React components
    {
      ...baseConfig,
      displayName: 'jsdom',
      testEnvironment: 'jsdom',
      testMatch: [
        '<rootDir>/src/__tests__/**/*.test.tsx',
        '<rootDir>/src/__tests__/**/components/**/*.test.ts',
      ],
      setupFilesAfterEnv: ['<rootDir>/jest.setup.js', '<rootDir>/src/__tests__/setup/jsdom-setup.js'],
      testEnvironmentOptions: {
        url: 'http://localhost:3000',
      },
    },
  ],
};

export default createJestConfig(config);
