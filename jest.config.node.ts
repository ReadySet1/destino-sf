import type { Config } from 'jest';

// Jest configuration for API/Server tests (Node environment)
const config: Config = {
  displayName: 'node',
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: [
    '<rootDir>/src/**/__tests__/**/*.test.ts',
    '<rootDir>/src/**/__tests__/**/api/**/*.test.ts',
    '<rootDir>/src/**/__tests__/**/lib/**/*.test.ts',
    '<rootDir>/src/**/__tests__/**/utils/**/*.test.ts',
    '<rootDir>/src/**/__tests__/**/actions/**/*.test.ts',
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  setupFilesAfterEnv: ['<rootDir>/jest.setup.node.js'],
  transform: {
    '^.+\\.(ts|tsx)$': [
      'ts-jest',
      {
        useESM: true,
        tsconfig: 'tsconfig.test.json',
      },
    ],
  },
  moduleDirectories: ['node_modules', '<rootDir>', '<rootDir>/src'],
};

export default config;
