import React from 'react';
import { SpotlightPick } from '@/types/spotlight';

// Test data factories for consistent test data across test files
export const createMockSpotlightPick = (overrides: Partial<SpotlightPick> = {}): SpotlightPick => ({
  id: 'mock-pick-1',
  position: 1,
  productId: 'mock-product-1',
  customTitle: null,
  customDescription: null,
  customImageUrl: null,
  customPrice: null,
  personalizeText: null,
  customLink: null,
  showNewFeatureModal: false,
  newFeatureTitle: null,
  newFeatureDescription: null,
  newFeatureBadgeText: null,
  isCustom: false,
  isActive: true,
  createdAt: new Date('2024-01-01T00:00:00Z'),
  updatedAt: new Date('2024-01-01T00:00:00Z'),
  product: {
    id: 'mock-product-1',
    name: 'Mock Product',
    description: 'Mock product description',
    images: ['https://example.com/mock-image.jpg'],
    price: 12.99,
    slug: 'mock-product-slug',
    category: {
      name: 'MOCK_CATEGORY',
      slug: 'mock-category',
    },
  },
  ...overrides,
});

export const createMockCustomSpotlightPick = (overrides: Partial<SpotlightPick> = {}): SpotlightPick => ({
  id: 'mock-custom-pick-1',
  position: 2,
  productId: null,
  customTitle: 'Custom Mock Pick',
  customDescription: 'Custom mock description',
  customImageUrl: 'https://example.com/custom-mock.jpg',
  customPrice: 18.99,
  personalizeText: 'Custom personalize text',
  customLink: null,
  showNewFeatureModal: false,
  newFeatureTitle: null,
  newFeatureDescription: null,
  newFeatureBadgeText: null,
  isCustom: true,
  isActive: true,
  createdAt: new Date('2024-01-01T00:00:00Z'),
  updatedAt: new Date('2024-01-01T00:00:00Z'),
  product: null,
  ...overrides,
});

// Common test data
export const mockSpotlightPicksData: SpotlightPick[] = [
  createMockSpotlightPick({
    id: 'pick-empanadas',
    position: 1,
    product: {
      id: 'empanadas-1',
      name: 'Empanadas- Huacatay Chicken (frozen- 4 pack)',
      description: 'Delicious frozen empanadas with huacatay chicken filling',
      images: ['https://example.com/empanadas.jpg'],
      price: 18.00,
      slug: 'empanadas-huacatay-chicken',
      category: {
        name: 'EMPANADAS',
        slug: 'empanadas',
      },
    },
  }),
  createMockSpotlightPick({
    id: 'pick-salsa',
    position: 2,
    product: {
      id: 'salsa-1',
      name: 'Ají Amarillo Salsa (7oz)',
      description: 'Authentic Peruvian ají amarillo salsa',
      images: ['https://example.com/salsa.jpg'],
      price: 8.00,
      slug: 'aji-amarillo-salsa',
      category: {
        name: 'CONDIMENTS',
        slug: 'condiments',
      },
    },
  }),
  createMockCustomSpotlightPick({
    id: 'pick-alfajores',
    position: 3,
    customTitle: 'Alfajores- Pride (6-pack)',
    customDescription: 'Special pride edition alfajores',
    customPrice: 10.00,
    customImageUrl: 'https://example.com/alfajores-pride.jpg',
  }),
  createMockCustomSpotlightPick({
    id: 'pick-subscription',
    position: 4,
    customTitle: 'Monthly Subscription',
    customDescription: 'Coming soon - Click to learn more!',
    customPrice: null,
    customImageUrl: 'https://example.com/subscription.jpg',
  }),
];

// Mock API responses
export const createMockApiResponse = (
  data: any,
  success: boolean = true,
  error?: string
) => ({
  ok: success,
  status: success ? 200 : 400,
  json: async () => ({
    success,
    data: success ? data : undefined,
    error: error || (success ? undefined : 'Mock error'),
  }),
});

// Helper to setup fetch mocks
export const setupFetchMock = (
  mockFetch: jest.MockedFunction<typeof fetch>,
  response: any
) => {
  mockFetch.mockResolvedValueOnce(response as Response);
};

// Helper to setup fetch mock with multiple responses
export const setupFetchMockSequence = (
  mockFetch: jest.MockedFunction<typeof fetch>,
  responses: any[]
) => {
  responses.forEach(response => {
    mockFetch.mockResolvedValueOnce(response as Response);
  });
};

// Test assertions helpers
export const expectSpotlightPickToBeRendered = (
  screen: any,
  pick: SpotlightPick
) => {
  if (pick.isCustom && pick.customTitle) {
    expect(screen.getByText(pick.customTitle)).toBeInTheDocument();
    if (pick.customDescription) {
      expect(screen.getByText(pick.customDescription)).toBeInTheDocument();
    }
  } else if (pick.product) {
    expect(screen.getByText(pick.product.name)).toBeInTheDocument();
    if (pick.product.description) {
      expect(screen.getByText(pick.product.description)).toBeInTheDocument();
    }
  }

  if (pick.personalizeText) {
    expect(screen.getByText(new RegExp(pick.personalizeText))).toBeInTheDocument();
  }
};

export const expectCategoryToBeRendered = (
  screen: any,
  categoryName: string,
  categorySlug: string
) => {
  expect(screen.getByText(categoryName)).toBeInTheDocument();
  
  const link = screen.getByText(categoryName).closest('a');
  if (categorySlug === 'catering') {
    expect(link).toHaveAttribute('href', '/catering');
  } else {
    expect(link).toHaveAttribute('href', `/products/category/${categorySlug}`);
  }
};

// Mock implementations for common dependencies
export const mockNextImage = () => {
  return function MockImage({ src, alt, ...props }: any) {
    const img = document.createElement('img');
    img.src = src;
    img.alt = alt;
    img.setAttribute('data-testid', 'next-image');
    Object.assign(img, props);
    return img;
  };
};

export const mockNextLink = () => {
  return function MockLink({ href, children, ...props }: any) {
    const a = document.createElement('a');
    a.href = href;
    a.textContent = children;
    Object.assign(a, props);
    return a;
  };
};

export const mockLucideIcons = () => ({
  ArrowRight: () => ({ 'data-testid': 'arrow-right-icon', children: '→' }),
  Edit: () => ({ 'data-testid': 'edit-icon', children: 'Edit' }),
  Trash2: () => ({ 'data-testid': 'trash-icon', children: 'Trash' }),
  Package: () => ({ 'data-testid': 'package-icon', children: 'Package' }),
  DollarSign: () => ({ 'data-testid': 'dollar-icon', children: '$' }),
  Star: () => ({ 'data-testid': 'star-icon', children: '★' }),
  CheckCircle: () => ({ 'data-testid': 'check-circle-icon', children: '✓' }),
  AlertCircle: () => ({ 'data-testid': 'alert-circle-icon', children: '!' }),
  Plus: () => ({ 'data-testid': 'plus-icon', children: '+' }),
  Eye: () => ({ 'data-testid': 'eye-icon', children: '👁' }),
  RefreshCw: () => ({ 'data-testid': 'refresh-icon', children: '↻' }),
});

export const mockDancingScriptFont = () => ({
  Dancing_Script: () => ({
    className: 'mocked-dancing-script',
  }),
});

export const mockCSSModules = (moduleNames: string[]) => {
  const mockModule: Record<string, string> = {};
  moduleNames.forEach(name => {
    mockModule[name] = name;
  });
  return mockModule;
};

// Test setup helpers
export const setupCommonMocks = () => {
  // Mock Next.js dependencies
  jest.mock('next/image', () => mockNextImage());
  jest.mock('next/link', () => mockNextLink());
  jest.mock('next/font/google', () => mockDancingScriptFont());
  
  // Mock Lucide React icons
  jest.mock('lucide-react', () => mockLucideIcons());
  
  // Mock global fetch
  global.fetch = jest.fn();
  
  return {
    mockFetch: fetch as jest.MockedFunction<typeof fetch>,
  };
};

export const cleanupMocks = () => {
  jest.clearAllMocks();
  jest.resetAllMocks();
};

// Accessibility test helpers
export const expectProperHeadingHierarchy = (screen: any) => {
  const allHeadings = screen.getAllByRole('heading');
  
  // Check that we have h2 main headings
  const h2Headings = allHeadings.filter((h: any) => h.tagName === 'H2');
  expect(h2Headings.length).toBeGreaterThanOrEqual(1);
  
  // Check that subsection headings are h3 or lower
  const h3Headings = allHeadings.filter((h: any) => h.tagName === 'H3');
  
  return { h2Headings, h3Headings, allHeadings };
};

export const expectProperImageAltText = (screen: any) => {
  const images = screen.getAllByTestId('next-image');
  
  images.forEach((img: any) => {
    expect(img).toHaveAttribute('alt');
    const altText = img.getAttribute('alt');
    
    // Alt text should not be empty for content images
    if (altText !== '') {
      expect(altText).toBeTruthy();
    }
  });
  
  return images;
};

export const expectKeyboardNavigation = (screen: any) => {
  const links = screen.getAllByRole('link');
  
  links.forEach((link: any) => {
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href');
  });
  
  const buttons = screen.getAllByRole('button');
  
  buttons.forEach((button: any) => {
    expect(button).toBeInTheDocument();
  });
  
  return { links, buttons };
};

// Performance test helpers
export const measureRenderTime = (renderFn: () => void): number => {
  const startTime = performance.now();
  renderFn();
  const endTime = performance.now();
  return endTime - startTime;
};

export const expectFastRender = (renderTime: number, maxTime: number = 100) => {
  expect(renderTime).toBeLessThan(maxTime);
};

// Error handling test helpers
export const expectGracefulFallback = async (
  screen: any,
  fallbackText: string | RegExp
) => {
  expect(screen.getByText(fallbackText)).toBeInTheDocument();
};

export const expectErrorBoundary = (screen: any) => {
  // Check that the component doesn't crash completely
  expect(screen.container.firstChild).toBeInTheDocument();
};

// Integration test helpers
export const waitForDataToLoad = async (
  screen: any,
  expectedText: string | RegExp,
  timeout: number = 3000
) => {
  await screen.findByText(expectedText, {}, { timeout });
};

export const expectConsistentNavigation = (
  screen: any,
  expectedRoutes: Array<{ text: string; href: string }>
) => {
  expectedRoutes.forEach(({ text, href }) => {
    const elements = screen.getAllByText(text);
    expect(elements.length).toBeGreaterThan(0);
    
    elements.forEach((element: any) => {
      const link = element.closest('a');
      if (link) {
        expect(link).toHaveAttribute('href', href);
      }
    });
  });
};

// Mock data factories for consistent test data
export const createMockSpotlightPick = (overrides: Partial<SpotlightPick> = {}): SpotlightPick => ({
  id: 'mock-pick-1',
  position: 1,
  isCustom: false,
  isActive: true,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  productId: 'mock-product-1',
  product: {
    id: 'mock-product-1',
    name: 'Mock Alfajores',
    description: 'Delicious mock alfajores',
    images: ['mock-alfajore.jpg'],
    price: 12.99,
    slug: 'mock-alfajores',
    category: {
      name: 'ALFAJORES',
      slug: 'alfajores',
    },
  },
  ...overrides,
});

export const createCustomSpotlightPick = (overrides: Partial<SpotlightPick> = {}): SpotlightPick => ({
  id: 'custom-pick-1',
  position: 2,
  isCustom: true,
  isActive: true,
  customTitle: 'Custom Special',
  customDescription: 'Limited time offer',
  customImageUrl: 'custom-special.jpg',
  customPrice: 24.99,
  personalizeText: 'Perfect for special occasions!',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  ...overrides,
});

export const createInactiveSpotlightPick = (overrides: Partial<SpotlightPick> = {}): SpotlightPick => ({
  ...createMockSpotlightPick(),
  id: 'inactive-pick',
  position: 3,
  isActive: false,
  ...overrides,
});

export const createNewFeatureSpotlightPick = (overrides: Partial<SpotlightPick> = {}): SpotlightPick => ({
  ...createMockSpotlightPick(),
  id: 'new-feature-pick',
  position: 4,
  showNewFeatureModal: true,
  newFeatureTitle: 'New Premium Fillings',
  newFeatureDescription: 'Discover our new premium empanada fillings',
  newFeatureBadgeText: 'NEW',
  ...overrides,
});

// Category data for menu testing
export interface MockCategory {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  slug: string;
}

export const createMockCategories = (): MockCategory[] => [
  {
    id: '1',
    name: 'Our Empanadas',
    description: 'Our signature savory pastries with exquisite fillings',
    imageUrl: '/images/assets/2Recurso 3.png',
    slug: 'empanadas',
  },
  {
    id: '2',
    name: 'Our Alfajores',
    description: 'Delicious butter cookies filled with creamy dulce de leche',
    imageUrl: '/images/menu/alfajores.png',
    slug: 'alfajores',
  },
  {
    id: '3',
    name: 'Our Catering',
    description: 'Professional catering services for all your needs',
    imageUrl: '/images/menu/catering.jpeg',
    slug: 'catering',
  },
];

// Product data for ProductList testing
export interface MockProduct {
  name: string;
  imageSrc: string;
  altText: string;
  description: string;
  slug: string;
}

export const createMockProducts = (): MockProduct[] => [
  {
    name: 'Our Alfajores',
    imageSrc: '/images/menu/alfajores.png',
    altText: 'Alfajores',
    description: 'Our famous butter cookies filled with dulce de leche.',
    slug: '/products/category/alfajores',
  },
  {
    name: 'Our Empanadas',
    imageSrc: '/images/menu/empanadas.png',
    altText: 'Empanadas',
    description: 'Handcrafted savory pastries with a variety of flavorful fillings.',
    slug: '/products/category/empanadas',
  },
  {
    name: 'Catering',
    imageSrc: '/images/menu/catering.jpeg',
    altText: 'Catering',
    description: 'Custom catering services for private events, corporate gatherings & celebrations.',
    slug: '/catering',
  },
];

// Helper functions for common test scenarios
export const setupMockFetch = (mockData: any, shouldSucceed = true) => {
  const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
  
  if (shouldSucceed) {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        data: mockData,
      }),
    } as Response);
  } else {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({
        success: false,
        error: 'Mock API error',
      }),
    } as Response);
  }
};

export const setupMockFetchError = (error: Error) => {
  const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
  mockFetch.mockRejectedValueOnce(error);
};

// Common assertions for menu components
export const expectHeadingHierarchy = (container: HTMLElement) => {
  const headings = container.querySelectorAll('h1, h2, h3, h4, h5, h6');
  const headingLevels = Array.from(headings).map(h => parseInt(h.tagName.charAt(1)));
  
  // Check that heading levels are in logical order (no skipping levels)
  for (let i = 1; i < headingLevels.length; i++) {
    const current = headingLevels[i];
    const previous = headingLevels[i - 1];
    
    // Current heading should not skip more than one level from previous
    expect(current - previous).toBeLessThanOrEqual(1);
  }
};

export const expectAccessibleImages = (container: HTMLElement) => {
  const images = container.querySelectorAll('img');
  
  images.forEach(img => {
    // All images should have alt text (even if empty for decorative images)
    expect(img).toHaveAttribute('alt');
    
    // Images with meaningful content should have descriptive alt text
    const alt = img.getAttribute('alt');
    if (alt && alt.trim()) {
      expect(alt.trim().length).toBeGreaterThan(0);
    }
  });
};

export const expectFocusableElements = (container: HTMLElement) => {
  const focusableElements = container.querySelectorAll(
    'a, button, input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );
  
  focusableElements.forEach(element => {
    // Focusable elements should be reachable via keyboard navigation
    expect(element).not.toHaveAttribute('tabindex', '-1');
  });
};

export const expectResponsiveClasses = (element: HTMLElement, expectedClasses: string[]) => {
  expectedClasses.forEach(className => {
    expect(element).toHaveClass(className);
  });
};

// API response helpers
export const createSuccessfulApiResponse = (data: any) => ({
  ok: true,
  status: 200,
  json: async () => ({
    success: true,
    data,
  }),
});

export const createErrorApiResponse = (error: string, status = 500) => ({
  ok: false,
  status,
  json: async () => ({
    success: false,
    error,
  }),
});

// Test data sets for various scenarios
export const getCompleteSpotlightPicksSet = (): SpotlightPick[] => [
  createMockSpotlightPick({ position: 1 }),
  createCustomSpotlightPick({ position: 2 }),
  createNewFeatureSpotlightPick({ position: 3 }),
  createMockSpotlightPick({ 
    position: 4, 
    id: 'pick-4',
    productId: 'product-4',
    product: {
      id: 'product-4',
      name: 'Premium Empanadas',
      description: 'Our signature empanadas',
      images: ['empanada.jpg'],
      price: 18.99,
      slug: 'premium-empanadas',
      category: {
        name: 'EMPANADAS',
        slug: 'empanadas',
      },
    },
  }),
];

export const getPartialSpotlightPicksSet = (): SpotlightPick[] => [
  createMockSpotlightPick({ position: 1 }),
  createCustomSpotlightPick({ position: 3 }), // Position 2 missing
];

export const getInactiveSpotlightPicksSet = (): SpotlightPick[] => [
  createInactiveSpotlightPick({ position: 1 }),
  createInactiveSpotlightPick({ position: 2 }),
];

// Performance testing helpers
export const measureRenderTime = (renderFn: () => void): number => {
  const start = performance.now();
  renderFn();
  const end = performance.now();
  return end - start;
};

export const expectPerformantRender = (renderFn: () => void, maxTimeMs = 100) => {
  const renderTime = measureRenderTime(renderFn);
  expect(renderTime).toBeLessThan(maxTimeMs);
};

// Mock Next.js router for navigation testing
export const createMockRouter = (overrides = {}) => ({
  push: jest.fn(),
  replace: jest.fn(),
  back: jest.fn(),
  forward: jest.fn(),
  refresh: jest.fn(),
  pathname: '/',
  query: {},
  asPath: '/',
  ...overrides,
});

// Setup utilities for common test patterns
export const setupMockModules = () => {
  // Mock Next.js Image component
  jest.mock('next/image', () => {
    return function MockImage({ src, alt, ...props }: any) {
      return <img src={src} alt={alt} {...props} data-testid="next-image" />;
    };
  });

  // Mock Next.js Link component
  jest.mock('next/link', () => {
    return function MockLink({ href, children, ...props }: any) {
      return (
        <a href={href} {...props}>
          {children}
        </a>
      );
    };
  });

  // Mock Next.js fonts
  jest.mock('next/font/google', () => ({
    Dancing_Script: () => ({
      className: 'mocked-dancing-script',
    }),
  }));

  // Mock Lucide React icons
  jest.mock('lucide-react', () => ({
    ArrowRight: () => <div data-testid="arrow-right-icon">→</div>,
    Star: () => <div data-testid="star-icon">⭐</div>,
    Heart: () => <div data-testid="heart-icon">❤️</div>,
    ChevronDown: () => <div data-testid="chevron-down-icon">▼</div>,
    ChevronRight: () => <div data-testid="chevron-right-icon">▶</div>,
    Package: () => <div data-testid="package-icon">📦</div>,
    Image: () => <div data-testid="image-icon">🖼️</div>,
  }));
};

// Accessibility testing helpers
export const runBasicAccessibilityChecks = (container: HTMLElement) => {
  expectHeadingHierarchy(container);
  expectAccessibleImages(container);
  expectFocusableElements(container);
};

// Wait for async operations in tests
export const waitForApiCall = () => {
  return new Promise(resolve => setTimeout(resolve, 0));
};

// Clean up utilities
export const cleanupMocks = () => {
  jest.clearAllMocks();
  jest.restoreAllMocks();
};

export default {
  createMockSpotlightPick,
  createCustomSpotlightPick,
  createInactiveSpotlightPick,
  createNewFeatureSpotlightPick,
  createMockCategories,
  createMockProducts,
  setupMockFetch,
  setupMockFetchError,
  expectHeadingHierarchy,
  expectAccessibleImages,
  expectFocusableElements,
  expectResponsiveClasses,
  createSuccessfulApiResponse,
  createErrorApiResponse,
  getCompleteSpotlightPicksSet,
  getPartialSpotlightPicksSet,
  getInactiveSpotlightPicksSet,
  measureRenderTime,
  expectPerformantRender,
  createMockRouter,
  setupMockModules,
  runBasicAccessibilityChecks,
  waitForApiCall,
  cleanupMocks,
}; 