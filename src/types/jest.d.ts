/// <reference types="jest" />
/// <reference types="@testing-library/jest-dom" />

declare global {
  namespace jest {
    interface Matchers<R> {
      toBeInTheDocument(): R;
      toHaveAttribute(attr: string, value?: string): R;
    }
  }
}

declare module '@jest/expect' {
  interface Matchers<R> {
    toBeInTheDocument(): R;
    toHaveAttribute(attr: string, value?: string): R;
  }
}

export {};
