/// <reference types="jest" />
/// <reference types="@testing-library/jest-dom" />

// Enhanced Jest Mock Types with proper generics
export type MockedFunction<T extends (...args: any[]) => any> = jest.MockedFunction<T>;

export type MockedObject<T> = {
  [K in keyof T]: T[K] extends (...args: any[]) => any
    ? jest.MockedFunction<T[K]>
    : T[K] extends object
    ? MockedObject<T[K]>
    : T[K];
};

// Utility types for better mock type inference
export type DeepMocked<T> = {
  [K in keyof T]: T[K] extends (...args: any[]) => any
    ? jest.MockedFunction<T[K]>
    : T[K] extends object
    ? DeepMocked<T[K]>
    : T[K];
} & T;

// Mock factory types
export interface MockFactory<T> {
  create: (overrides?: Partial<T>) => T;
  createMany: (count: number, overrides?: Partial<T>) => T[];
  build: () => T;
  buildMany: (count: number) => T[];
}

// API Mock Response Types
export interface MockApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  statusCode?: number;
  headers?: Record<string, string>;
}

export interface MockApiRequest<T = any> {
  method: string;
  path: string;
  body?: T;
  headers?: Record<string, string>;
  query?: Record<string, string>;
}

// Database Mock Types
export interface MockDatabaseOperation<T = any> {
  table: string;
  operation: 'create' | 'update' | 'delete' | 'select';
  data?: T;
  where?: Partial<T>;
  result?: T | T[] | null;
}

// Component Mock Types
export interface MockComponentProps<T = Record<string, any>> {
  props: T;
  children?: React.ReactNode;
  testId?: string;
}

export type MockComponent<P = any> = React.FC<P> & {
  displayName?: string;
  mockImplementation?: jest.MockedFunction<React.FC<P>>;
};

// Event Handler Mock Types
export interface MockEventHandlers {
  onClick?: jest.MockedFunction<(event: React.MouseEvent) => void>;
  onChange?: jest.MockedFunction<(event: React.ChangeEvent<HTMLInputElement>) => void>;
  onSubmit?: jest.MockedFunction<(event: React.FormEvent) => void>;
  onBlur?: jest.MockedFunction<(event: React.FocusEvent) => void>;
  onFocus?: jest.MockedFunction<(event: React.FocusEvent) => void>;
  onKeyDown?: jest.MockedFunction<(event: React.KeyboardEvent) => void>;
  onKeyUp?: jest.MockedFunction<(event: React.KeyboardEvent) => void>;
}

// Form Validation Mock Types
export interface MockFormValidation<T = any> {
  isValid: boolean;
  errors: Record<keyof T, string[]>;
  values: T;
  touched: Record<keyof T, boolean>;
  dirty: Record<keyof T, boolean>;
}

// Enhanced Jest Global Types
declare global {
  namespace jest {
    interface Matchers<R> {
      // Testing Library DOM matchers
      toBeInTheDocument(): R;
      toHaveAttribute(attr: string, value?: string): R;
      toHaveClass(className: string): R;
      toHaveStyle(style: string | Record<string, any>): R;
      toHaveTextContent(text: string | RegExp): R;
      toHaveValue(value: string | number): R;
      toBeVisible(): R;
      toBeDisabled(): R;
      toBeEnabled(): R;
      toBeChecked(): R;
      toBeRequired(): R;
      toHaveDisplayValue(value: string | RegExp | (string | RegExp)[]): R;
      toHaveFocus(): R;
      toBeValid(): R;
      toBeInvalid(): R;
      
      // Custom business logic matchers
      toBeValidOrder(): R;
      toBeValidProduct(): R;
      toBeValidAddress(): R;
      toHaveValidPaymentMethod(): R;
      toMatchShippingRate(): R;
      toHaveCorrectTotalPrice(): R;
      toBePastDate(): R;
      toBeFutureDate(): R;
      toBeWithinDeliveryZone(): R;
      
      // Database matchers
      toExistInDatabase(): R;
      toHaveBeenCreatedInDatabase(): R;
      toHaveBeenUpdatedInDatabase(): R;
      toHaveBeenDeletedFromDatabase(): R;
      
      // API response matchers
      toBeSuccessfulApiResponse(): R;
      toBeErrorApiResponse(): R;
      toHaveStatusCode(code: number): R;
      toHaveResponseHeader(header: string, value?: string): R;
    }
  }
}

// Enhanced Jest Expect module
declare module '@jest/expect' {
  interface Matchers<R> {
    toBeInTheDocument(): R;
    toHaveAttribute(attr: string, value?: string): R;
    toHaveClass(className: string): R;
    toHaveStyle(style: string | Record<string, any>): R;
    toHaveTextContent(text: string | RegExp): R;
    toHaveValue(value: string | number): R;
    toBeVisible(): R;
    toBeDisabled(): R;
    toBeEnabled(): R;
    toBeChecked(): R;
    toBeRequired(): R;
    toHaveDisplayValue(value: string | RegExp | (string | RegExp)[]): R;
    toHaveFocus(): R;
    toBeValid(): R;
    toBeInvalid(): R;
    toBeValidOrder(): R;
    toBeValidProduct(): R;
    toBeValidAddress(): R;
    toHaveValidPaymentMethod(): R;
    toMatchShippingRate(): R;
    toHaveCorrectTotalPrice(): R;
    toBePastDate(): R;
    toBeFutureDate(): R;
    toBeWithinDeliveryZone(): R;
    toExistInDatabase(): R;
    toHaveBeenCreatedInDatabase(): R;
    toHaveBeenUpdatedInDatabase(): R;
    toHaveBeenDeletedFromDatabase(): R;
    toBeSuccessfulApiResponse(): R;
    toBeErrorApiResponse(): R;
    toHaveStatusCode(code: number): R;
    toHaveResponseHeader(header: string, value?: string): R;
  }
}

// Mock Utility Functions
export interface MockUtilities {
  createMockFunction: <T extends (...args: any[]) => any>() => jest.MockedFunction<T>;
  createMockObject: <T>(obj: T) => MockedObject<T>;
  createDeepMock: <T>(obj: T) => DeepMocked<T>;
  resetAllMocks: () => void;
  clearAllMocks: () => void;
  restoreAllMocks: () => void;
}

// Test Environment Types
export interface TestEnvironment {
  NODE_ENV: 'test';
  DATABASE_URL: string;
  USE_SQUARE_SANDBOX: string;
  SQUARE_SANDBOX_TOKEN: string;
  SHIPPO_API_KEY: string;
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  NEXTAUTH_SECRET: string;
  NEXTAUTH_URL: string;
}

// Test Configuration Types
export interface TestConfig {
  environment: TestEnvironment;
  database: {
    reset: boolean;
    seed: boolean;
    isolation: boolean;
  };
  mocks: {
    square: boolean;
    shippo: boolean;
    supabase: boolean;
    googleMaps: boolean;
    resend: boolean;
  };
  coverage: {
    threshold: number;
    include: string[];
    exclude: string[];
  };
}

export {};
