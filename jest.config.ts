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
        
        // Mock external modules that don't work in Node.js
        '^square$': '<rootDir>/src/__mocks__/square.ts',
        '^shippo$': '<rootDir>/src/__mocks__/shippo.ts',
        '^@supabase/supabase-js$': '<rootDir>/src/__mocks__/@supabase/supabase-js.ts',
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
        '<rootDir>/src/__tests__/setup/test-db-setup.ts',
        '<rootDir>/src/__tests__/setup/enhanced-mocks.ts'
      ],
      globalSetup: '<rootDir>/src/__tests__/setup/global-setup.ts',
      globalTeardown: '<rootDir>/src/__tests__/setup/global-teardown.ts',
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
          isolatedModules: true,
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
        
        // Mock external modules for React environment
        '^square$': '<rootDir>/src/__mocks__/square.ts',
        '^shippo$': '<rootDir>/src/__mocks__/shippo.ts',
        '^@supabase/supabase-js$': '<rootDir>/src/__mocks__/@supabase/supabase-js.ts',
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
        '<rootDir>/src/__tests__/setup/jsdom-setup.ts',
        '<rootDir>/src/__tests__/setup/enhanced-mocks.ts'
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
          isolatedModules: true,
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
  
  // Reporter configuration
  reporters: [
    'default',
    [
      'jest-junit',
      {
        outputDirectory: './coverage',
        outputName: 'junit.xml',
        ancestorSeparator: ' › ',
        uniqueOutputName: 'false',
        suiteNameTemplate: '{filepath}',
        classNameTemplate: '{classname}',
        titleTemplate: '{title}',
      },
    ],
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
  
  // Snapshot configuration
  snapshotSerializers: [
    '@testing-library/jest-dom/serializers',
  ],
};

export default config;
