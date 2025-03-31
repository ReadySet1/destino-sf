// eslint.config.js
import { FlatCompat } from '@eslint/eslintrc';
import _eslint from '@eslint/js';
import _tseslint from '@typescript-eslint/eslint-plugin'; // Keep for explicit plugin ref if needed
import _tseslintParser from '@typescript-eslint/parser';
import globals from 'globals';
import path from 'path'; // Needed for FlatCompat baseDirectory
import { fileURLToPath } from 'url'; // Needed for FlatCompat baseDirectory

// --- Setup for FlatCompat ---
// Mimic __dirname in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize FlatCompat
const compat = new FlatCompat({
  baseDirectory: __dirname, // Helps resolve plugins/configs relative to this file
  // Optional: If you used eslint:recommended before, you might want this
  // recommendedConfig: eslint.configs.recommended,
});
// ----------------------------

const config = [
  // 1. Global Ignores
  {
    ignores: [
      '**/dist/**',
      '**/build/**',
      '**/.next/**', // Important for Next.js
      '**/node_modules/**',
      '**/.cache/**',
      '**/coverage/**',
      '**/.*', // Careful: This ignores .github, .vscode etc. Consider specific dotfiles if needed.
      '!/.env*', // Example: Don't ignore .env files if you want to lint them (unlikely)
      '!/.prettierrc*', // Don't ignore prettier config
      'jest.config.js',
      'next.config.js', // or next.config.mjs
      'postcss.config.js',
      'tailwind.config.js',
      'sanity.config.ts',
      'sanity.cli.ts',
      '**/public/**',
      '**/*.generated.*',
      '**/package-lock.json',
      '**/yarn.lock',
      '**/pnpm-lock.yaml',
    ],
  },

  // 2. Core Configuration using FlatCompat for extends
  // This combines Next.js presets, TypeScript support, and Prettier compatibility
  ...compat.config({
    extends: [
      // Base Next.js rules (includes React, React Hooks, Next.js plugin)
      'next/core-web-vitals',
      // Recommended TypeScript rules specifically for Next.js
      // This often implicitly configures the parser and TS plugin
      // 'plugin:@typescript-eslint/recommended', // Often included/configured by 'next/typescript' or similar, check if needed
      // Disables ESLint formatting rules that conflict with Prettier
      'prettier',
    ],
    parser: '@typescript-eslint/parser', // Explicitly set the parser
    parserOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      // Link your tsconfig for type-aware rules (recommended for stricter checks)
      // project: './tsconfig.json',
    },
    plugins: [
       '@typescript-eslint', // Ensure the TS plugin is explicitly available
    ],
    rules: {
      // --- Your Custom Rule Overrides ---
      // Apply your specific preferences here
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }], // Allow unused prefixed with _
      '@typescript-eslint/no-explicit-any': 'warn', // Downgrade 'any' to a warning during development/refactoring
      '@typescript-eslint/explicit-function-return-type': 'off', // Keep off if you prefer inferred types

      // Example: If you still want to use <img> tags sometimes (not recommended by Next.js rules)
      // '@next/next/no-img-element': 'warn', // or 'off'

      // --- Other Recommended Rules (Optional) ---
      // You might want basic JS recommendations if not fully covered by Next.js presets
      // ...eslint.configs.recommended.rules, // Uncomment if needed, but check for overlap with Next.js
    },
  }),

  // 3. Language Options (Globals, Parser for specific file types)
  // Applied broadly, but the compat.config above might override some specifics
  {
    files: ['**/*.{js,jsx,ts,tsx}'],
    languageOptions: {
      // parser: tseslintParser, // Parser is often set within compat.config or by presets like next/typescript
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
      globals: {
        ...globals.browser, // For browser APIs like window, document, fetch
        ...globals.node,    // For Node.js APIs like process, require
        React: 'readonly', // If using JSX without importing React explicitly
      },
    },
    // You *could* put plugins and rules here too, but keeping them central
    // in the compat.config block is often cleaner for overrides.
  },

  // 4. Configuration SPECIFICALLY for Jest/test files
  {
    files: [
      '**/jest.setup.js',
      '**/jest.resolver.js',
      '**/*.test.{js,jsx,ts,tsx}',
      '**/__tests__/**/*.{js,jsx,ts,tsx}',
    ],
    languageOptions: {
      globals: {
        ...globals.jest, // Defines describe, it, expect, jest, etc.
      },
    },
    // Optional: Relax certain rules within tests if necessary
    rules: {
      // Example: Allow 'any' type more freely in tests
      // '@typescript-eslint/no-explicit-any': 'off',
      // Example: Allow potential side effects in test descriptions
      // '@typescript-eslint/no-empty-function': 'off',
    },
  },
];

export default config;