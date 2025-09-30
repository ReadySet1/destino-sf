export const useRouter = jest.fn(() => ({
  push: jest.fn(),
  replace: jest.fn(),
  prefetch: jest.fn(),
  back: jest.fn(),
  forward: jest.fn(),
  refresh: jest.fn(),
  pathname: '/test',
  searchParams: new URLSearchParams(),
  query: {},
}));

export const usePathname = jest.fn(() => '/test');

export const useSearchParams = jest.fn(() => new URLSearchParams());

export const redirect = jest.fn();

export const notFound = jest.fn();

export default {
  useRouter,
  usePathname,
  useSearchParams,
  redirect,
  notFound,
};
