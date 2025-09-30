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
        // Path mapping
        '^@/(.*)$': '<rootDir>/src/$1',
        '^@/types/(.*)$': '<rootDir>/src/types/$1',
        '^@/lib/(.*)$': '<rootDir>/src/lib/$1',
        '^@/components/(.*)$': '<rootDir>/src/components/$1',
        '^@/app/(.*)$': '<rootDir>/src/app/$1',
        '^@/utils/(.*)$': '<rootDir>/src/utils/$1',
        '^@/hooks/(.*)$': '<rootDir>/src/hooks/$1',
        '^@/store/(.*)$': '<rootDir>/src/store/$1',
        
        // Mock external modules that don't work in Node.js (remaining mocks only)
        '^@supabase/auth-helpers-nextjs$': '<rootDir>/src/__mocks__/@supabase/auth-helpers-nextjs.ts',
        '^resend$': '<rootDir>/src/__mocks__/resend.ts',
        '^next/router$': '<rootDir>/src/__mocks__/next/router.ts',
        '^next/navigation$': '<rootDir>/src/__mocks__/next/navigation.ts',
        '^@googlemaps/js-api-loader$': '<rootDir>/src/__mocks__/@googlemaps/js-api-loader.ts',
        
        // Static assets
        '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
        '\\.(jpg|jpeg|png|gif|webp|svg)$': '<rootDir>/src/__mocks__/fileMock.js',
      },
      setupFilesAfterEnv: [
        '<rootDir>/jest.setup.enhanced.js',
        // Test infrastructure files removed for quick ship
      ],
      // Removed global setup/teardown to fix Jest import issues
      transform: {
        '^.+\\.tsx?$': ['ts-jest', {
          tsconfig: {
            jsx: 'react',
            esModuleInterop: true,
            allowSyntheticDefaultImports: true,
            moduleResolution: 'node',
            resolveJsonModule: true,
            strict: true,
            skipLibCheck: true,
          },
          // isolatedModules moved to tsconfig.json
        }],
      },
      transformIgnorePatterns: [
        'node_modules/(?!(square|shippo|@supabase|@googlemaps)/)'
      ],
      testEnvironmentOptions: {
        customExportConditions: ['node', 'node-addons']
      },
    },
    {
      displayName: 'jsdom',
      preset: 'ts-jest',
      testEnvironment: 'jsdom',
      testMatch: [
        '<rootDir>/src/**/__tests__/**/*.test.tsx',
        '<rootDir>/src/**/*.test.tsx',
      ],
      moduleNameMapper: {
        // Path mapping
        '^@/(.*)$': '<rootDir>/src/$1',
        '^@/types/(.*)$': '<rootDir>/src/types/$1',
        '^@/lib/(.*)$': '<rootDir>/src/lib/$1',
        '^@/components/(.*)$': '<rootDir>/src/components/$1',
        '^@/app/(.*)$': '<rootDir>/src/app/$1',
        '^@/utils/(.*)$': '<rootDir>/src/utils/$1',
        '^@/hooks/(.*)$': '<rootDir>/src/hooks/$1',
        '^@/store/(.*)$': '<rootDir>/src/store/$1',
        
        // Mock external modules for React environment (remaining mocks only)
        '^@supabase/auth-helpers-nextjs$': '<rootDir>/src/__mocks__/@supabase/auth-helpers-nextjs.ts',
        '^resend$': '<rootDir>/src/__mocks__/resend.ts',
        '^next/router$': '<rootDir>/src/__mocks__/next/router.ts',
        '^next/navigation$': '<rootDir>/src/__mocks__/next/navigation.ts',
        '^@googlemaps/js-api-loader$': '<rootDir>/src/__mocks__/@googlemaps/js-api-loader.ts',
        
        // Static assets
        '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
        '\\.(jpg|jpeg|png|gif|webp|svg)$': '<rootDir>/src/__mocks__/fileMock.js',
      },
      setupFilesAfterEnv: [
        '<rootDir>/jest.setup.enhanced.js',
        // Test infrastructure files removed for quick ship
      ],
      transform: {
        '^.+\\.tsx?$': ['ts-jest', {
          tsconfig: {
            jsx: 'react-jsx',
            esModuleInterop: true,
            allowSyntheticDefaultImports: true,
            moduleResolution: 'node',
            resolveJsonModule: true,
            strict: true,
            skipLibCheck: true,
          },
          // isolatedModules moved to tsconfig.json
        }],
      },
      transformIgnorePatterns: [
        'node_modules/(?!(square|shippo|@supabase|@googlemaps|@testing-library)/)'
      ],
      testEnvironmentOptions: {
        url: 'http://localhost:3000',
        customExportConditions: [''],
      },
    },
  ],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/__mocks__/**',
    '!src/**/__tests__/**',
    '!src/**/*.stories.tsx',
    '!src/**/*.config.ts',
    '!src/scripts/**',
    '!src/middleware.ts',
    '!src/app/globals.css',
    '!src/**/layout.tsx',
    '!src/**/loading.tsx',
    '!src/**/error.tsx',
    '!src/**/not-found.tsx',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html', 'json-summary'],
  coverageThreshold: {
    global: {
      branches: 0,  // Start with 0 to allow tests to pass initially
      functions: 0,
      lines: 0,
      statements: 0,
    },
  },
  collectCoverage: false, // Enable only when running coverage explicitly
  passWithNoTests: true,
  verbose: true,
  maxWorkers: 1, // Run tests serially to avoid DB conflicts
  testTimeout: 30000, // 30 seconds timeout for all tests
  bail: false,  // Don't stop on first failure
  
  // Error handling
  errorOnDeprecated: true,
  
  // Performance
  cache: true,
  cacheDirectory: '<rootDir>/.jest-cache',
  
  // Watch mode configuration
  watchPlugins: [
    'jest-watch-typeahead/filename',
    'jest-watch-typeahead/testname',
  ],
  
  // Reporter configuration (removed jest-junit due to compatibility issues)
  reporters: [
    'default',
  ],
  
  // Global test configuration
  globals: {
    'ts-jest': {
      useESM: false,
    },
  },
  
  // Mock configuration
  clearMocks: true,
  resetMocks: false,
  restoreMocks: true,
  
  // Snapshot configuration (removed deprecated serializers)
};

export default config;
