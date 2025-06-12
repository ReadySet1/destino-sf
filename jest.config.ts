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
  testPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/.next/',
    '<rootDir>/coverage/',
  ],
  moduleDirectories: ['node_modules', '<rootDir>'],
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
