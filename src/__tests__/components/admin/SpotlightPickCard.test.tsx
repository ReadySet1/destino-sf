/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { SpotlightPickCard } from '@/components/admin/SpotlightPicks/SpotlightPickCard';
import { SpotlightPick } from '@/types/spotlight';

// Mock Lucide React icons
jest.mock('lucide-react', () => ({
  Trash2: () => <div data-testid="trash-icon">Trash</div>,
  Package: () => <div data-testid="package-icon">Package</div>,
  DollarSign: () => <div data-testid="dollar-icon">$</div>,
  Loader2: () => <div data-testid="loader-icon">Loading</div>,
}));

// Mock Next.js Image component
jest.mock('next/image', () => {
  return function MockImage({ src, alt, ...props }: any) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={alt} {...props} />;
  };
});

// Mock the Select components
jest.mock('@/components/ui/select', () => ({
  Select: ({ children, onValueChange, value }: any) => (
    <div data-testid="product-select" data-value={value} onClick={() => onValueChange('product-123')}>
      {children}
    </div>
  ),
  SelectContent: ({ children }: any) => <div>{children}</div>,
  SelectItem: ({ children, value }: any) => <div data-value={value}>{children}</div>,
  SelectTrigger: ({ children }: any) => <div>{children}</div>,
  SelectValue: ({ placeholder }: any) => <div>{placeholder}</div>,
}));

// Mock fetch for products API
global.fetch = jest.fn();

describe('SpotlightPickCard', () => {
  const mockOnProductSelect = jest.fn();
  const mockOnClear = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        products: [
          {
            id: 'product-123',
            name: 'Test Product',
            price: 12.99,
            category: { name: 'Test Category' },
          },
        ],
      }),
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

      // Check product name
      expect(screen.getByText('Dulce de Leche Alfajores')).toBeInTheDocument();

      // Check category name
      expect(screen.getByText('ALFAJORES')).toBeInTheDocument();

      // Check description
      expect(screen.getByText('Traditional Argentine cookies')).toBeInTheDocument();

      // Check price
      expect(screen.getByText('12.99')).toBeInTheDocument();

      // Check active status
      expect(screen.getByText('Active')).toBeInTheDocument();

      // Check clear button is present
      expect(screen.getByTestId('trash-icon')).toBeInTheDocument();
    });

    it('should display product selector', async () => {
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

      // Check product selector is present
      expect(screen.getByTestId('product-select')).toBeInTheDocument();
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

    it('should call onProductSelect when product is changed', () => {
      render(
        <SpotlightPickCard
          pick={mockActivePick}
          onProductSelect={mockOnProductSelect}
          onClear={mockOnClear}
          isLoading={false}
        />
      );

      const productSelect = screen.getByTestId('product-select');
      fireEvent.click(productSelect);

      expect(mockOnProductSelect).toHaveBeenCalledWith('product-123');
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
      expect(screen.getByText('Choose a product from the dropdown above')).toBeInTheDocument();
      expect(screen.getByTestId('package-icon')).toBeInTheDocument();

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

      // Check product selector is present
      expect(screen.getByTestId('product-select')).toBeInTheDocument();
    });
  });

  describe('Loading States', () => {
    it('should disable product selector when loading', () => {
      render(
        <SpotlightPickCard
          pick={mockActivePick}
          onClear={jest.fn()}
          isLoading
        />
      );

      // Check that the product selector is disabled
      const productSelect = screen.getByTestId('product-select');
      expect(productSelect).toBeDisabled();

      // Check that updating text is shown
      const loadingText = within(productSelect).getByText('Loading products...');
      expect(loadingText).toBeInTheDocument();
      expect(screen.getByTestId('loader-icon')).toBeInTheDocument();
    });

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

    it('should disable product selector when loading', () => {
      render(
        <SpotlightPickCard
          pick={mockActivePick}
          onProductSelect={jest.fn()}
          onClear={jest.fn()}
          isLoading
          isUpdating
        />
      );

      // Check that the product selector is disabled
      const productSelect = screen.getByTestId('product-select');
      expect(productSelect).toBeDisabled();

      // Check that updating text is shown
      const loadingText = within(productSelect).getByText('Loading products...');
      expect(loadingText).toBeInTheDocument();
      expect(screen.getByTestId('loader-icon')).toBeInTheDocument();
    });
  });

  describe('Product Fetching', () => {
    it('should fetch products on component mount', async () => {
      render(
        <SpotlightPickCard
          pick={mockActivePick}
          onProductSelect={mockOnProductSelect}
          onClear={mockOnClear}
          isLoading={false}
        />
      );

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith('/api/products');
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
        expect(consoleSpy).toHaveBeenCalledWith('Error fetching products:', expect.any(Error));
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

      expect(screen.getByTestId('package-icon')).toBeInTheDocument();
    });
  });
});
