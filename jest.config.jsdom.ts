import type { Config } from 'jest';

// Jest configuration for Component tests (jsdom environment)
const config: Config = {
  displayName: 'jsdom',
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  testMatch: [
    '<rootDir>/src/**/__tests__/**/*.test.tsx',
    '<rootDir>/src/**/__tests__/**/components/**/*.test.tsx',
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    '\\.(jpg|jpeg|png|gif|webp|avif|svg)$': '<rootDir>/src/__mocks__/fileMock.js',
  },
  setupFilesAfterEnv: ['<rootDir>/jest.setup.jsdom.js'],
  transform: {
    '^.+\\.(ts|tsx)$': [
      'ts-jest',
      {
        useESM: true,
        tsconfig: 'tsconfig.test.json',
      },
    ],
  },
  transformIgnorePatterns: [
    'node_modules/(?!(.*\\.mjs$|@next|@supabase|@testing-library|@t3-oss))',
  ],
  moduleDirectories: ['node_modules', '<rootDir>', '<rootDir>/src'],
};

export default config;
