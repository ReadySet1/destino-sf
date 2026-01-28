/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { SpotlightPickCard } from '@/components/admin/SpotlightPicks/SpotlightPickCard';
import { SpotlightPick } from '@/types/spotlight';

// Mock Lucide React icons
jest.mock('lucide-react', () => ({
  Trash2: ({ className, ...props }: any) => (
    <div data-testid="trash-icon" className={className} {...props}>
      Trash
    </div>
  ),
  Package: ({ className, ...props }: any) => (
    <div data-testid="package-icon" className={className} {...props}>
      Package
    </div>
  ),
  DollarSign: ({ className, ...props }: any) => (
    <div data-testid="dollar-icon" className={className} {...props}>
      $
    </div>
  ),
  Loader2: ({ className, ...props }: any) => (
    <div data-testid="loader-icon" className={className} {...props}>
      Loading
    </div>
  ),
  Search: ({ className, ...props }: any) => (
    <div data-testid="search-icon" className={className} {...props}>
      Search
    </div>
  ),
  Filter: ({ className, ...props }: any) => (
    <div data-testid="filter-icon" className={className} {...props}>
      Filter
    </div>
  ),
  Check: ({ className, ...props }: any) => (
    <div data-testid="check-icon" className={className} {...props}>
      Check
    </div>
  ),
}));

// Mock Next.js Image component
jest.mock('next/image', () => {
  return function MockImage({ src, alt, ...props }: any) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={alt} {...props} />;
  };
});

// Mock Dialog components from Radix UI
jest.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children, open }: any) => <div data-testid="dialog">{children}</div>,
  DialogTrigger: ({ children, asChild }: any) => (
    <div data-testid="dialog-trigger">{children}</div>
  ),
  DialogContent: ({ children }: any) =>
    children ? <div data-testid="dialog-content">{children}</div> : null,
  DialogHeader: ({ children }: any) => <div data-testid="dialog-header">{children}</div>,
  DialogTitle: ({ children }: any) => <div data-testid="dialog-title">{children}</div>,
}));

// Mock the Select components
jest.mock('@/components/ui/select', () => ({
  Select: ({ children, onValueChange, value }: any) => (
    <div data-testid="category-select" data-value={value}>
      {children}
    </div>
  ),
  SelectContent: ({ children }: any) => <div>{children}</div>,
  SelectItem: ({ children, value }: any) => <div data-value={value}>{children}</div>,
  SelectTrigger: ({ children }: any) => <div>{children}</div>,
  SelectValue: ({ placeholder }: any) => <div>{placeholder}</div>,
}));

// Mock utils
jest.mock('@/lib/utils/product-description', () => ({
  sanitizeProductDescription: (desc: string) => desc,
}));

// Mock fetch for products and categories API
global.fetch = jest.fn();

describe('SpotlightPickCard', () => {
  const mockOnProductSelect = jest.fn();
  const mockOnClear = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    // Setup default fetch mocks for products and categories
    (fetch as jest.Mock).mockImplementation((url: string) => {
      if (url.includes('/api/products')) {
        return Promise.resolve({
          ok: true,
          json: async () => [
            {
              id: 'product-123',
              name: 'Test Product',
              description: 'Test description',
              images: ['https://example.com/test.jpg'],
              price: 12.99,
              categoryId: 'cat-1',
              category: { id: 'cat-1', name: 'Test Category' },
              active: true,
            },
            {
              id: 'product-456',
              name: 'Another Product',
              description: 'Another description',
              images: ['https://example.com/another.jpg'],
              price: 15.99,
              categoryId: 'cat-2',
              category: { id: 'cat-2', name: 'Another Category' },
              active: true,
            },
          ],
        });
      }
      if (url.includes('/api/categories')) {
        return Promise.resolve({
          ok: true,
          json: async () => [
            { id: 'cat-1', name: 'Test Category', slug: 'test-category' },
            { id: 'cat-2', name: 'Another Category', slug: 'another-category' },
          ],
        });
      }
      return Promise.resolve({ ok: false });
    });
  });

  const mockActivePick: SpotlightPick = {
    id: 'pick-1',
    position: 1,
    productId: 'product-123',
    isActive: true,
    createdAt: new Date('2024-01-01T00:00:00Z'),
    updatedAt: new Date('2024-01-01T00:00:00Z'),
    product: {
      id: 'product-123',
      name: 'Dulce de Leche Alfajores',
      description: 'Traditional Argentine cookies',
      images: ['https://example.com/alfajor.jpg'],
      price: 12.99,
      slug: 'alfajores-dulce-de-leche',
      category: {
        name: 'ALFAJORES',
        slug: 'alfajores',
      },
    },
  };

  const mockEmptyPick: SpotlightPick = {
    id: 'empty-3',
    position: 3,
    productId: '',
    isActive: false,
    product: {
      id: '',
      name: 'No product selected',
      description: null,
      images: [],
      price: 0,
      slug: null,
      category: undefined,
    },
  };

  describe('Active Spotlight Pick', () => {
    it('should render active spotlight pick correctly', async () => {
      render(
        <SpotlightPickCard
          pick={mockActivePick}
          onProductSelect={mockOnProductSelect}
          onClear={mockOnClear}
          isLoading={false}
        />
      );

      // Check position badge
      expect(screen.getByText('Position 1')).toBeInTheDocument();

      // Check product name (appears in multiple places, so use getAllByText)
      const productNames = screen.getAllByText('Dulce de Leche Alfajores');
      expect(productNames.length).toBeGreaterThan(0);

      // Check category name
      expect(screen.getByText('ALFAJORES')).toBeInTheDocument();

      // Check price
      expect(screen.getByText('12.99')).toBeInTheDocument();

      // Check active status
      expect(screen.getByText('Active')).toBeInTheDocument();

      // Check clear button is present
      expect(screen.getByTestId('trash-icon')).toBeInTheDocument();
    });

    it('should display product selector label', async () => {
      render(
        <SpotlightPickCard
          pick={mockActivePick}
          onProductSelect={mockOnProductSelect}
          onClear={mockOnClear}
          isLoading={false}
        />
      );

      // Check product selector label
      expect(screen.getByText('Select Product:')).toBeInTheDocument();
    });

    it('should call onClear when clear button is clicked', () => {
      render(
        <SpotlightPickCard
          pick={mockActivePick}
          onProductSelect={mockOnProductSelect}
          onClear={mockOnClear}
          isLoading={false}
        />
      );

      const clearButton = screen.getByTestId('trash-icon').closest('button');
      fireEvent.click(clearButton!);

      expect(mockOnClear).toHaveBeenCalledTimes(1);
    });
  });

  describe('Empty Spotlight Pick', () => {
    it('should render empty state correctly', () => {
      render(
        <SpotlightPickCard
          pick={mockEmptyPick}
          onProductSelect={mockOnProductSelect}
          onClear={mockOnClear}
          isLoading={false}
        />
      );

      // Check position badge
      expect(screen.getByText('Position 3')).toBeInTheDocument();

      // Check empty state content
      expect(screen.getByText('No Product Selected')).toBeInTheDocument();
      expect(screen.getByText('Tap the button above to choose a product')).toBeInTheDocument();

      // Clear button should not be present for empty picks
      expect(screen.queryByTestId('trash-icon')).not.toBeInTheDocument();
    });

    it('should display product selector for empty pick', () => {
      render(
        <SpotlightPickCard
          pick={mockEmptyPick}
          onProductSelect={mockOnProductSelect}
          onClear={mockOnClear}
          isLoading={false}
        />
      );

      // Check product selector label
      expect(screen.getByText('Select Product:')).toBeInTheDocument();

      // Check dialog trigger for product selector
      expect(screen.getByTestId('dialog-trigger')).toBeInTheDocument();
    });
  });

  describe('Loading States', () => {
    it('should disable clear button when loading', () => {
      render(
        <SpotlightPickCard
          pick={mockActivePick}
          onProductSelect={mockOnProductSelect}
          onClear={mockOnClear}
          isLoading={true}
        />
      );

      const clearButton = screen.getByTestId('trash-icon').closest('button');
      expect(clearButton).toBeDisabled();
    });

    it('should show loading state in product selector when fetching products', async () => {
      // Delay the fetch response to capture loading state
      let resolvePromise: () => void;
      const delayedPromise = new Promise<void>(resolve => {
        resolvePromise = resolve;
      });

      (fetch as jest.Mock).mockImplementation(() =>
        delayedPromise.then(() => ({
          ok: true,
          json: async () => [],
        }))
      );

      render(
        <SpotlightPickCard
          pick={mockActivePick}
          onProductSelect={mockOnProductSelect}
          onClear={mockOnClear}
          isLoading={false}
        />
      );

      // Check that loading text is shown initially while products are loading
      // Use getAllByText since it might appear multiple places
      const loadingElements = screen.getAllByText('Loading products...');
      expect(loadingElements.length).toBeGreaterThan(0);

      // Resolve the promise to clean up
      resolvePromise!();
    });
  });

  describe('Product Fetching', () => {
    it('should fetch products with correct query params on component mount', async () => {
      render(
        <SpotlightPickCard
          pick={mockActivePick}
          onProductSelect={mockOnProductSelect}
          onClear={mockOnClear}
          isLoading={false}
        />
      );

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith('/api/products?onlyActive=false&includePrivate=true');
      });
    });

    it('should fetch categories on component mount', async () => {
      render(
        <SpotlightPickCard
          pick={mockActivePick}
          onProductSelect={mockOnProductSelect}
          onClear={mockOnClear}
          isLoading={false}
        />
      );

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith('/api/categories');
      });
    });

    it('should handle fetch error gracefully', async () => {
      (fetch as jest.Mock).mockRejectedValue(new Error('Fetch failed'));

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      render(
        <SpotlightPickCard
          pick={mockActivePick}
          onProductSelect={mockOnProductSelect}
          onClear={mockOnClear}
          isLoading={false}
        />
      );

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('Error fetching data:', expect.any(Error));
      });

      consoleSpy.mockRestore();
    });
  });

  describe('Product Image Display', () => {
    it('should display product image when available', () => {
      render(
        <SpotlightPickCard
          pick={mockActivePick}
          onProductSelect={mockOnProductSelect}
          onClear={mockOnClear}
          isLoading={false}
        />
      );

      const image = screen.getByAltText('Dulce de Leche Alfajores');
      expect(image).toBeInTheDocument();
      expect(image).toHaveAttribute('src', 'https://example.com/alfajor.jpg');
    });

    it('should display fallback icon when no image available', () => {
      const pickWithoutImage = {
        ...mockActivePick,
        product: {
          ...mockActivePick.product,
          images: [],
        },
      };

      render(
        <SpotlightPickCard
          pick={pickWithoutImage}
          onProductSelect={mockOnProductSelect}
          onClear={mockOnClear}
          isLoading={false}
        />
      );

      // There should be at least one package-icon for the fallback
      const packageIcons = screen.getAllByTestId('package-icon');
      expect(packageIcons.length).toBeGreaterThan(0);
    });
  });

  describe('Product Selector Button', () => {
    it('should show product name when product is selected after loading', async () => {
      render(
        <SpotlightPickCard
          pick={mockActivePick}
          onProductSelect={mockOnProductSelect}
          onClear={mockOnClear}
          isLoading={false}
        />
      );

      // Wait for loading to complete
      await waitFor(() => {
        expect(screen.queryByText('Loading products...')).not.toBeInTheDocument();
      });

      // The button should show the current product name
      const dialogTrigger = screen.getByTestId('dialog-trigger');
      expect(dialogTrigger).toHaveTextContent('Dulce de Leche Alfajores');
    });

    it('should show product name in button when empty pick has placeholder name', async () => {
      render(
        <SpotlightPickCard
          pick={mockEmptyPick}
          onProductSelect={mockOnProductSelect}
          onClear={mockOnClear}
          isLoading={false}
        />
      );

      // Wait for loading to complete
      await waitFor(() => {
        expect(screen.queryByText('Loading products...')).not.toBeInTheDocument();
      });

      // The button shows the product name from pick.product.name
      // For empty picks, this is "No product selected"
      const dialogTrigger = screen.getByTestId('dialog-trigger');
      expect(dialogTrigger).toHaveTextContent('No product selected');
    });

    it('should show "Choose a product" when product name is not set', async () => {
      const pickWithNoProductName: SpotlightPick = {
        id: 'empty-4',
        position: 4 as 1 | 2 | 3 | 4,
        productId: '',
        isActive: false,
        product: {
          id: '',
          name: '', // Empty string name
          description: null,
          images: [],
          price: 0,
          slug: null,
          category: undefined,
        },
      };

      render(
        <SpotlightPickCard
          pick={pickWithNoProductName}
          onProductSelect={mockOnProductSelect}
          onClear={mockOnClear}
          isLoading={false}
        />
      );

      // Wait for loading to complete
      await waitFor(() => {
        expect(screen.queryByText('Loading products...')).not.toBeInTheDocument();
      });

      const dialogTrigger = screen.getByTestId('dialog-trigger');
      expect(dialogTrigger).toHaveTextContent('Choose a product');
    });
  });
});
