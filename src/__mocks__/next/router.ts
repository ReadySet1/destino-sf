const mockRouter = {
  push: jest.fn(),
  replace: jest.fn(),
  prefetch: jest.fn(),
  back: jest.fn(),
  forward: jest.fn(),
  reload: jest.fn(),
  route: '/test',
  pathname: '/test',
  query: {},
  asPath: '/test',
  basePath: '',
  isReady: true,
  isPreview: false,
  isLocaleDomain: false,
  events: {
    on: jest.fn(),
    off: jest.fn(),
    emit: jest.fn(),
  },
};

export const useRouter = jest.fn(() => mockRouter);

const routerMock = {
  useRouter,
};

export default routerMock;
