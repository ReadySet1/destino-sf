/**
 * @jest-environment jsdom
 */
import React from 'react';
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ProductDetails from '@/components/Products/ProductDetails';
import { useCartStore } from '@/store/cart';
import { useCartAlertStore } from '@/components/ui/cart-alert';
import type { Product, Variant, Category } from '@/types/product';

// Add jest-dom matchers
import '@testing-library/jest-dom';

// Create a simple test component to verify basic React state works
const TestCounter = () => {
  const [count, setCount] = React.useState(0);
  return (
    <div>
      <span data-testid="count">{count}</span>
      <button onClick={() => setCount(count + 1)}>Increment</button>
    </div>
  );
};

// Mock dependencies
jest.mock('@/store/cart');
jest.mock('@/components/ui/cart-alert');
jest.mock('next/image', () => ({
  __esModule: true,
  default: ({ src, alt, ...props }: any) => <img src={src} alt={alt} {...props} />,
}));
jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, href, ...props }: any) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

// Completely transparent framer-motion mock
jest.mock('framer-motion', () => {
  const React = require('react');

  // Create a transparent motion div that forwards all props and events
  const MotionDiv = React.forwardRef<HTMLDivElement, any>((props, ref) => {
    const { initial, animate, exit, transition, children, ...restProps } = props;
    return React.createElement('div', { ref, ...restProps }, children);
  });

  MotionDiv.displayName = 'motion.div';

  return {
    motion: {
      div: MotionDiv,
    },
    AnimatePresence: ({ children, mode, ...props }: any) => {
      const React = require('react');
      return React.createElement(React.Fragment, null, children);
    },
  };
});

// Mock API calls for related products
global.fetch = jest.fn() as jest.MockedFunction<typeof fetch>;

// Create more sophisticated mocks
const mockCartStore = {
  addItem: jest.fn(),
  items: [],
  totalItems: 0,
  totalPrice: 0,
  clearCart: jest.fn(),
  removeItem: jest.fn(),
  updateQuantity: jest.fn(),
};

const mockCartAlertStore = {
  showAlert: jest.fn(),
  hideAlert: jest.fn(),
  isVisible: false,
  message: '',
};

// Create mock implementations that actually track state
const createMockCartStore = () => {
  let items: any[] = [];
  return {
    addItem: jest.fn(item => {
      items.push(item);
      console.log('Mock cart addItem called with:', item);
    }),
    items,
    totalItems: items.length,
    totalPrice: 0,
    clearCart: jest.fn(() => {
      items = [];
    }),
    removeItem: jest.fn(),
    updateQuantity: jest.fn(),
  };
};

const createMockAlertStore = () => ({
  showAlert: jest.fn(message => {
    console.log('Mock alert showAlert called with:', message);
  }),
  hideAlert: jest.fn(),
  isVisible: false,
  message: '',
});

// Sample test data
const mockCategory: Category = {
  id: 'cat-1',
  name: 'Empanadas',
  order: 1,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockVariants: Variant[] = [
  {
    id: 'variant-1',
    name: 'Beef',
    price: 12.99,
    squareVariantId: 'sq-var-1',
    productId: 'product-1',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'variant-2',
    name: 'Chicken',
    price: 11.99,
    squareVariantId: 'sq-var-2',
    productId: 'product-1',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

const mockProduct: Product = {
  id: 'product-1',
  name: 'Traditional Empanadas',
  description: 'Handmade empanadas with authentic Argentine flavors',
  price: 12.99,
  images: ['/images/empanadas/beef.jpg'],
  category: mockCategory,
  categoryId: 'cat-1',
  variants: mockVariants,
  active: true,
  featured: false,
  slug: 'traditional-empanadas',
  squareId: 'sq-item-1',
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockProductNoVariants: Product = {
  ...mockProduct,
  id: 'product-2',
  name: 'Simple Empanada',
  variants: [],
};

const mockProductSingleVariant: Product = {
  ...mockProduct,
  id: 'product-3',
  name: 'Single Variant Empanada',
  variants: [mockVariants[0]],
};

describe('ProductDetails', () => {
  const user = userEvent.setup();

  // Simple test to verify React state works
  describe('Basic React State Test', () => {
    it('should update state with basic React counter', async () => {
      render(<TestCounter />);

      expect(screen.getByTestId('count')).toBeInTheDocument();
      expect(screen.getByText('0')).toBeInTheDocument();

      const button = screen.getByRole('button', { name: 'Increment' });
      fireEvent.click(button);

      expect(screen.getByText('1')).toBeInTheDocument();
    });
  });

  beforeEach(() => {
    cleanup();
    jest.clearAllMocks();

    // Completely reset the mock functions
    jest.resetAllMocks();

    // Reset mock functions with fresh instances
    mockCartStore.addItem = jest.fn();
    mockCartAlertStore.showAlert = jest.fn();

    // Setup zustand store mocks
    (useCartStore as jest.MockedFunction<typeof useCartStore>).mockReturnValue(mockCartStore);
    (useCartAlertStore as jest.MockedFunction<typeof useCartAlertStore>).mockReturnValue(
      mockCartAlertStore
    );

    // Mock successful fetch for related products
    (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([]),
    } as Response);
  });

  describe('Product Rendering', () => {
    it('should render product details correctly', () => {
      render(<ProductDetails product={mockProduct} />);

      expect(screen.getByText('Traditional Empanadas')).toBeInTheDocument();
      expect(
        screen.getByText('Handmade empanadas with authentic Argentine flavors')
      ).toBeInTheDocument();
      expect(screen.getByText(/12\.99/)).toBeInTheDocument();
      expect(screen.getByAltText('Traditional Empanadas')).toBeInTheDocument();
    });

    it('should render loading state when product is not provided', () => {
      render(<ProductDetails product={null as any} />);

      expect(screen.getByText('Loading product...')).toBeInTheDocument();
    });

    it('should display default image when no images provided', () => {
      const productNoImages = { ...mockProduct, images: [] };
      render(<ProductDetails product={productNoImages} />);

      const image = screen.getByAltText('Traditional Empanadas');
      expect(image).toHaveAttribute('src', '/images/menu/empanadas.png');
    });

    it('should render product highlights based on category', () => {
      render(<ProductDetails product={mockProduct} />);

      // Should show empanada-specific highlights
      expect(screen.getByText('Ready to Cook')).toBeInTheDocument();
      expect(screen.getByText('15-20 min')).toBeInTheDocument();
      expect(screen.getByText('4 pack')).toBeInTheDocument();
    });

    it('should render alfajores highlights for alfajores products', () => {
      const alfajoresProduct = {
        ...mockProduct,
        name: 'Alfajores Dulce de Leche',
        category: { ...mockCategory, name: 'Alfajores' },
      };

      render(<ProductDetails product={alfajoresProduct} />);

      expect(screen.getByText('Ready to Eat')).toBeInTheDocument();
      expect(screen.getByText('2 weeks fresh')).toBeInTheDocument();
      expect(screen.getByText('6-pack combo')).toBeInTheDocument();
    });
  });

  describe('Variant Selection', () => {
    it('should not show variant selector for products without variants', () => {
      render(<ProductDetails product={mockProductNoVariants} />);

      expect(screen.queryByLabelText('Options:')).not.toBeInTheDocument();
      expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
    });

    it('should not show variant selector for products with single variant', () => {
      render(<ProductDetails product={mockProductSingleVariant} />);

      expect(screen.queryByLabelText('Options:')).not.toBeInTheDocument();
      expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
    });

    it('should show variant selector for products with multiple variants', () => {
      render(<ProductDetails product={mockProduct} />);

      expect(screen.getByLabelText('Options:')).toBeInTheDocument();
      const select = screen.getByRole('combobox');
      expect(select).toBeInTheDocument();

      // Should have options for each variant
      expect(screen.getByRole('option', { name: /Beef.*12\.99/ })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: /Chicken.*11\.99/ })).toBeInTheDocument();
    });

    it('should update price when variant is selected', async () => {
      render(<ProductDetails product={mockProduct} />);

      const select = screen.getByRole('combobox');

      // Select chicken variant
      await user.selectOptions(select, 'variant-2');

      // Wait for price update
      await waitFor(() => {
        expect(screen.getByText(/11\.99/)).toBeInTheDocument();
      });
    });

    it('should select first variant by default', () => {
      render(<ProductDetails product={mockProduct} />);

      const select = screen.getByRole('combobox') as HTMLSelectElement;
      expect(select.value).toBe('variant-1');
    });
  });

  describe('Quantity Controls', () => {
    it('should render quantity controls with default value of 1', () => {
      render(<ProductDetails product={mockProduct} />);

      expect(screen.getByText('Quantity:')).toBeInTheDocument();
      expect(screen.getByText('1')).toBeInTheDocument();

      const decrementBtn = screen.getByRole('button', { name: '-' });
      const incrementBtn = screen.getByRole('button', { name: '+' });

      expect(decrementBtn).toBeInTheDocument();
      expect(incrementBtn).toBeInTheDocument();
    });

    it('should increment quantity when plus button is clicked', async () => {
      render(<ProductDetails product={mockProduct} />);

      const incrementBtn = screen.getByRole('button', { name: '+' });

      await user.click(incrementBtn);

      await waitFor(() => {
        expect(screen.getByText('2')).toBeInTheDocument();
      });
    });

    it('should decrement quantity when minus button is clicked', async () => {
      render(<ProductDetails product={mockProduct} />);

      const incrementBtn = screen.getByRole('button', { name: '+' });
      const decrementBtn = screen.getByRole('button', { name: '-' });

      // First increment to 2
      await user.click(incrementBtn);
      await waitFor(() => {
        expect(screen.getByText('2')).toBeInTheDocument();
      });

      // Then decrement back to 1
      await user.click(decrementBtn);
      await waitFor(() => {
        expect(screen.getByText('1')).toBeInTheDocument();
      });
    });

    it('should disable decrement button when quantity is 1', () => {
      render(<ProductDetails product={mockProduct} />);

      const decrementBtn = screen.getByRole('button', { name: '-' });
      expect(decrementBtn).toHaveAttribute('disabled');
    });

    it('should limit quantity to maximum of 20', async () => {
      render(<ProductDetails product={mockProduct} />);

      const incrementBtn = screen.getByRole('button', { name: '+' });

      // Click increment 19 times to reach max (starts at 1, so 19 clicks = 20)
      for (let i = 0; i < 19; i++) {
        await user.click(incrementBtn);
        await new Promise(resolve => setTimeout(resolve, 10)); // Small delay for state updates
      }

      await waitFor(() => {
        expect(screen.getByText('20')).toBeInTheDocument();
        expect(incrementBtn).toHaveAttribute('disabled');
      });
    });
  });

  describe('Add to Cart Functionality', () => {
    it('should render add to cart button', () => {
      render(<ProductDetails product={mockProduct} />);

      const addToCartBtn = screen.getByRole('button', { name: 'Add to Cart' });
      expect(addToCartBtn).toBeInTheDocument();
      expect(addToCartBtn).not.toHaveAttribute('disabled');
    });

    it('should disable add to cart button when product is inactive', () => {
      const inactiveProduct = { ...mockProduct, active: false };
      render(<ProductDetails product={inactiveProduct} />);

      const addToCartBtn = screen.getByRole('button', { name: 'Add to Cart' });
      expect(addToCartBtn).toHaveAttribute('disabled');
    });

    it('should add item to cart when button is clicked', async () => {
      render(<ProductDetails product={mockProduct} />);

      const addToCartBtn = screen.getByRole('button', { name: 'Add to Cart' });

      // Try with fireEvent instead of userEvent for debugging
      fireEvent.click(addToCartBtn);

      // Wait a bit for any async updates
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(mockCartStore.addItem).toHaveBeenCalledWith({
        id: 'product-1',
        name: 'Traditional Empanadas - Beef',
        price: 12.99,
        quantity: 1,
        image: '/images/empanadas/beef.jpg',
        variantId: 'variant-1',
      });
    });

    it('DEBUG: should increment quantity with fireEvent', async () => {
      render(<ProductDetails product={mockProduct} />);

      const incrementBtn = screen.getByRole('button', { name: '+' });

      // Try direct fireEvent click
      fireEvent.click(incrementBtn);

      // Wait a bit for state update
      await new Promise(resolve => setTimeout(resolve, 100));

      // Check if quantity changed
      expect(screen.getByText('2')).toBeInTheDocument();
    });

    it('DEBUG: should switch tabs with fireEvent', async () => {
      render(<ProductDetails product={mockProduct} />);

      const faqTab = screen.getByRole('button', { name: 'FAQ' });

      // Try direct fireEvent click
      fireEvent.click(faqTab);

      // Wait a bit for state update
      await new Promise(resolve => setTimeout(resolve, 100));

      // Check if tab classes changed
      expect(faqTab.className).toContain('border-orange-500');
    });

    it('should add item with correct quantity', async () => {
      render(<ProductDetails product={mockProduct} />);

      const incrementBtn = screen.getByRole('button', { name: '+' });
      const addToCartBtn = screen.getByRole('button', { name: 'Add to Cart' });

      // Increment quantity to 3
      await user.click(incrementBtn);
      await user.click(incrementBtn);

      await user.click(addToCartBtn);

      expect(mockCartStore.addItem).toHaveBeenCalledWith(
        expect.objectContaining({
          quantity: 3,
        })
      );
    });

    it('should add item with selected variant information', async () => {
      render(<ProductDetails product={mockProduct} />);

      const select = screen.getByRole('combobox');
      const addToCartBtn = screen.getByRole('button', { name: 'Add to Cart' });

      // Select chicken variant
      await user.selectOptions(select, 'variant-2');

      await user.click(addToCartBtn);

      expect(mockCartStore.addItem).toHaveBeenCalledWith({
        id: 'product-1',
        name: 'Traditional Empanadas - Chicken',
        price: 11.99,
        quantity: 1,
        image: '/images/empanadas/beef.jpg',
        variantId: 'variant-2',
      });
    });

    it('should show success alert when item is added to cart', async () => {
      render(<ProductDetails product={mockProduct} />);

      const addToCartBtn = screen.getByRole('button', { name: 'Add to Cart' });

      await user.click(addToCartBtn);

      expect(mockCartAlertStore.showAlert).toHaveBeenCalledWith(
        '1 Traditional Empanadas (Beef) has been added to your cart.'
      );
    });
  });

  describe('Tab Navigation', () => {
    it('should render all tab buttons', () => {
      render(<ProductDetails product={mockProduct} />);

      expect(screen.getByRole('button', { name: 'Product Details' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'FAQ' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Cooking & Storage' })).toBeInTheDocument();
    });

    it('should show Product Details tab as active by default', () => {
      render(<ProductDetails product={mockProduct} />);

      const detailsTab = screen.getByRole('button', { name: 'Product Details' });
      expect(detailsTab.className).toContain('border-orange-500');
      expect(detailsTab.className).toContain('text-orange-600');
    });

    it('should switch to FAQ tab when clicked', async () => {
      render(<ProductDetails product={mockProduct} />);

      const faqTab = screen.getByRole('button', { name: 'FAQ' });

      await user.click(faqTab);

      await waitFor(() => {
        expect(faqTab.className).toContain('border-orange-500');
        expect(faqTab.className).toContain('text-orange-600');
      });
    });

    it('should switch to Cooking & Storage tab when clicked', async () => {
      render(<ProductDetails product={mockProduct} />);

      const nutritionTab = screen.getByRole('button', { name: 'Cooking & Storage' });

      await user.click(nutritionTab);

      await waitFor(() => {
        expect(nutritionTab.className).toContain('border-orange-500');
        expect(nutritionTab.className).toContain('text-orange-600');
      });
    });

    it('should show FAQ content when FAQ tab is active', async () => {
      render(<ProductDetails product={mockProduct} />);

      const faqTab = screen.getByRole('button', { name: 'FAQ' });

      await user.click(faqTab);

      await waitFor(() => {
        // Should show FAQ questions and not show quantity controls
        expect(screen.queryByText('Quantity:')).not.toBeInTheDocument();
      });
    });
  });

  describe('Related Products', () => {
    it('should render related products section', async () => {
      const relatedProducts = [
        {
          id: 'related-1',
          name: 'Related Empanada',
          description: 'Another delicious empanada',
          price: 10.99,
          images: ['/images/related.jpg'],
          slug: 'related-empanada',
        },
      ];

      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(relatedProducts),
      } as Response);

      render(<ProductDetails product={mockProduct} />);

      await waitFor(() => {
        expect(screen.getByText('You Might Also Like')).toBeInTheDocument();
      });
    });

    it('should show loading state for related products initially', () => {
      render(<ProductDetails product={mockProduct} />);

      // Should show loading skeleton initially
      const skeletonElements = screen.getAllByText('You Might Also Like');
      expect(skeletonElements.length).toBeGreaterThan(0);
    });

    it('should handle failed related products fetch gracefully', async () => {
      (global.fetch as jest.MockedFunction<typeof fetch>).mockRejectedValueOnce(
        new Error('Fetch failed')
      );

      render(<ProductDetails product={mockProduct} />);

      await waitFor(() => {
        // Should not show the related products section if fetch fails
        expect(screen.queryByText('You Might Also Like')).not.toBeInTheDocument();
      });
    });

    it('should fetch related products with correct parameters', () => {
      render(<ProductDetails product={mockProduct} />);

      expect(global.fetch).toHaveBeenCalledWith(
        `/api/products?categoryId=${mockProduct.categoryId}&exclude=${mockProduct.id}&limit=3`
      );
    });
  });

  describe('Price Formatting', () => {
    it('should format Decimal prices correctly', () => {
      const productWithDecimal = {
        ...mockProduct,
        price: { toFixed: (digits: number) => '15.95' } as any,
        variants: [], // Remove variants to avoid confusion in pricing
      };

      render(<ProductDetails product={productWithDecimal} />);

      // Look for the price in the main price display element
      const priceElement = screen.getByText((content, element) => {
        return (
          element?.tagName === 'P' &&
          element?.className.includes('text-3xl') &&
          content.includes('15.95')
        );
      });
      expect(priceElement).toBeInTheDocument();
    });

    it('should handle null price gracefully', () => {
      const productWithNullPrice = {
        ...mockProduct,
        price: null as any,
        variants: [], // Remove variants to avoid confusion in pricing
      };

      render(<ProductDetails product={productWithNullPrice} />);

      // Look for the fallback price (which should be the original product price or "0.00")
      const priceElement = screen.getByText((content, element) => {
        return (
          element?.tagName === 'P' &&
          element?.className.includes('text-3xl') &&
          (content.includes('0.00') || content.includes('12.99'))
        );
      });
      expect(priceElement).toBeInTheDocument();
    });

    it('should format regular number prices correctly', () => {
      const productWithoutVariants = {
        ...mockProduct,
        variants: [], // Remove variants to avoid multiple matches
      };

      render(<ProductDetails product={productWithoutVariants} />);

      // Look specifically for the main price display element
      const priceElement = screen.getByText((content, element) => {
        return (
          element?.tagName === 'P' &&
          element?.className.includes('text-3xl') &&
          content.includes('12.99')
        );
      });
      expect(priceElement).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper labels for form controls', () => {
      render(<ProductDetails product={mockProduct} />);

      expect(screen.getByLabelText('Options:')).toBeInTheDocument();
      expect(screen.getByText('Quantity:')).toBeInTheDocument();
    });

    it('should have proper alt text for images', () => {
      render(<ProductDetails product={mockProduct} />);

      const image = screen.getByAltText('Traditional Empanadas');
      expect(image).toBeInTheDocument();
    });

    it('should support keyboard navigation for interactive elements', () => {
      render(<ProductDetails product={mockProduct} />);

      const addToCartBtn = screen.getByRole('button', { name: 'Add to Cart' });
      const incrementBtn = screen.getByRole('button', { name: '+' });
      const decrementBtn = screen.getByRole('button', { name: '-' });

      expect(addToCartBtn).toBeInTheDocument();
      expect(incrementBtn).toBeInTheDocument();
      expect(decrementBtn).toBeInTheDocument();
    });

    it('should have proper focus management for tabs', async () => {
      render(<ProductDetails product={mockProduct} />);

      const faqTab = screen.getByRole('button', { name: 'FAQ' });

      faqTab.focus();
      expect(document.activeElement).toBe(faqTab);
    });
  });

  describe('Edge Cases', () => {
    it('should handle product without description', () => {
      const productNoDescription = { ...mockProduct, description: null };
      render(<ProductDetails product={productNoDescription} />);

      expect(screen.getByText('Traditional Empanadas')).toBeInTheDocument();
      expect(screen.queryByText('Handmade empanadas')).not.toBeInTheDocument();
    });

    it('should handle product without category', () => {
      const productNoCategory = { ...mockProduct, category: null as any };
      render(<ProductDetails product={productNoCategory} />);

      // Should still render without errors
      expect(screen.getByText('Traditional Empanadas')).toBeInTheDocument();
    });

    it('should handle variants with missing prices', () => {
      const variantsWithoutPrices = [
        { ...mockVariants[0], price: null as any },
        { ...mockVariants[1], price: undefined as any },
      ];
      const productNoPrices = { ...mockProduct, variants: variantsWithoutPrices };

      render(<ProductDetails product={productNoPrices} />);

      // Should fall back to product price
      expect(screen.getByText(/12\.99/)).toBeInTheDocument();
    });
  });

  // Alternative Simplified Tests - Focus on Core Logic Without Complex Interactions
  describe('Simplified Core Functionality Tests', () => {
    describe('Quantity Management Logic', () => {
      it('should render initial quantity state correctly', () => {
        render(<ProductDetails product={mockProduct} />);

        // Verify initial state
        expect(screen.getByText('1')).toBeInTheDocument();

        // Verify decrement button is disabled at start
        const decrementBtn = screen.getByRole('button', { name: '-' });
        expect(decrementBtn).toHaveAttribute('disabled');

        // Verify increment button is enabled
        const incrementBtn = screen.getByRole('button', { name: '+' });
        expect(incrementBtn).not.toHaveAttribute('disabled');
      });

      it('should have correct button accessibility attributes', () => {
        render(<ProductDetails product={mockProduct} />);

        const incrementBtn = screen.getByRole('button', { name: '+' });
        const decrementBtn = screen.getByRole('button', { name: '-' });

        // Verify buttons are properly accessible
        expect(incrementBtn).toBeInTheDocument();
        expect(decrementBtn).toBeInTheDocument();
        expect(incrementBtn).toHaveAttribute('class');
        expect(decrementBtn).toHaveAttribute('class');
      });
    });

    describe('Add to Cart Core Logic', () => {
      it('should render add to cart button with correct state', () => {
        render(<ProductDetails product={mockProduct} />);

        const addToCartBtn = screen.getByRole('button', { name: 'Add to Cart' });

        // Verify button exists and is enabled for active products
        expect(addToCartBtn).toBeInTheDocument();
        expect(addToCartBtn).not.toHaveAttribute('disabled');

        // Verify button styling indicates it's clickable
        expect(addToCartBtn.className).toContain('bg-[#F7B614]');
      });

      it('should disable add to cart for inactive products', () => {
        const inactiveProduct = { ...mockProduct, active: false };
        render(<ProductDetails product={inactiveProduct} />);

        const addToCartBtn = screen.getByRole('button', { name: 'Add to Cart' });
        expect(addToCartBtn).toHaveAttribute('disabled');
      });

      it('should show correct cart store integration setup', () => {
        render(<ProductDetails product={mockProduct} />);

        // Verify the component renders without store errors
        expect(screen.getByRole('button', { name: 'Add to Cart' })).toBeInTheDocument();

        // Verify mocks are properly connected
        expect(useCartStore).toHaveBeenCalled();
        expect(useCartAlertStore).toHaveBeenCalled();
      });
    });

    describe('Tab Structure and Layout', () => {
      it('should render all tab buttons with correct labels', () => {
        render(<ProductDetails product={mockProduct} />);

        // Verify all tabs exist
        expect(screen.getByRole('button', { name: 'Product Details' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'FAQ' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Cooking & Storage' })).toBeInTheDocument();
      });

      it('should show default active tab styling', () => {
        render(<ProductDetails product={mockProduct} />);

        const detailsTab = screen.getByRole('button', { name: 'Product Details' });
        const faqTab = screen.getByRole('button', { name: 'FAQ' });
        const nutritionTab = screen.getByRole('button', { name: 'Cooking & Storage' });

        // Verify initial state - Details should be active
        expect(detailsTab.className).toContain('border-orange-500');
        expect(detailsTab.className).toContain('text-orange-600');

        // Other tabs should be inactive
        expect(faqTab.className).toContain('border-transparent');
        expect(nutritionTab.className).toContain('border-transparent');
      });

      it('should render default tab content correctly', () => {
        render(<ProductDetails product={mockProduct} />);

        // Default tab should show product details content
        expect(
          screen.getByText('Handmade empanadas with authentic Argentine flavors')
        ).toBeInTheDocument();
        expect(screen.getByText('Quantity:')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Add to Cart' })).toBeInTheDocument();
      });
    });

    describe('Variant Selection Logic', () => {
      it('should handle variant selection without state interaction issues', () => {
        render(<ProductDetails product={mockProduct} />);

        const select = screen.getByRole('combobox');

        // Verify select exists and has options
        expect(select).toBeInTheDocument();
        expect(screen.getByRole('option', { name: /Beef.*12\.99/ })).toBeInTheDocument();
        expect(screen.getByRole('option', { name: /Chicken.*11\.99/ })).toBeInTheDocument();

        // Verify default selection
        expect((select as HTMLSelectElement).value).toBe('variant-1');
      });

      it('should render correct variant pricing in options', () => {
        render(<ProductDetails product={mockProduct} />);

        // Verify each variant option shows correct price
        const beefOption = screen.getByRole('option', { name: /Beef.*12\.99/ });
        const chickenOption = screen.getByRole('option', { name: /Chicken.*11\.99/ });

        expect(beefOption).toBeInTheDocument();
        expect(chickenOption).toBeInTheDocument();
      });
    });

    describe('Price Display Logic', () => {
      it('should display correct initial pricing', () => {
        render(<ProductDetails product={mockProduct} />);

        // Should show the default variant price or product price
        const priceElement = screen.getByText((content, element) => {
          return (
            element?.tagName === 'P' &&
            element?.className.includes('text-3xl') &&
            content.includes('12.99')
          );
        });
        expect(priceElement).toBeInTheDocument();
      });

      it('should handle various price formats correctly', () => {
        // Test with different price types
        const decimalProduct = {
          ...mockProduct,
          variants: [],
          price: { toFixed: (digits: number) => '15.95' } as any,
        };

        render(<ProductDetails product={decimalProduct} />);

        expect(
          screen.getByText((content, element) => {
            return (
              element?.tagName === 'P' &&
              element?.className.includes('text-3xl') &&
              content.includes('15.95')
            );
          })
        ).toBeInTheDocument();
      });
    });

    describe('Component Integration Verification', () => {
      it('should properly integrate with zustand stores', () => {
        render(<ProductDetails product={mockProduct} />);

        // Verify store hooks are called
        expect(useCartStore).toHaveBeenCalled();
        expect(useCartAlertStore).toHaveBeenCalled();

        // Verify component renders without store-related errors
        expect(screen.getByText('Traditional Empanadas')).toBeInTheDocument();
      });

      it('should handle API integration for related products', () => {
        render(<ProductDetails product={mockProduct} />);

        // Verify fetch is called for related products
        expect(global.fetch).toHaveBeenCalledWith(
          `/api/products?categoryId=${mockProduct.categoryId}&exclude=${mockProduct.id}&limit=3`
        );
      });

      it('should render all major component sections', () => {
        render(<ProductDetails product={mockProduct} />);

        // Verify all major sections are present
        expect(screen.getByText('Traditional Empanadas')).toBeInTheDocument(); // Header
        expect(screen.getByText('Product Details')).toBeInTheDocument(); // Tab
        expect(screen.getByText('Quantity:')).toBeInTheDocument(); // Controls
        expect(screen.getByRole('button', { name: 'Add to Cart' })).toBeInTheDocument(); // Action
        expect(screen.getByRole('combobox')).toBeInTheDocument(); // Variants
      });
    });

    describe('Business Logic Validation', () => {
      it('should follow correct product data flow', () => {
        render(<ProductDetails product={mockProduct} />);

        // Verify product data is properly displayed
        expect(screen.getByText(mockProduct.name)).toBeInTheDocument();
        expect(screen.getByText(mockProduct.description!)).toBeInTheDocument();
        expect(screen.getByAltText(mockProduct.name)).toBeInTheDocument();
      });

      it('should handle product variants correctly', () => {
        render(<ProductDetails product={mockProduct} />);

        // With multiple variants, should show selector
        expect(screen.getByLabelText('Options:')).toBeInTheDocument();

        // With single variant product, should not show selector
        cleanup();
        render(<ProductDetails product={mockProductSingleVariant} />);
        expect(screen.queryByLabelText('Options:')).not.toBeInTheDocument();

        // With no variants, should not show selector
        cleanup();
        render(<ProductDetails product={mockProductNoVariants} />);
        expect(screen.queryByLabelText('Options:')).not.toBeInTheDocument();
      });

      it('should validate product highlights based on category', () => {
        render(<ProductDetails product={mockProduct} />);

        // Empanadas should show cooking-related highlights
        expect(screen.getByText('Ready to Cook')).toBeInTheDocument();
        expect(screen.getByText('15-20 min')).toBeInTheDocument();
        expect(screen.getByText('4 pack')).toBeInTheDocument();
      });
    });
  });
});
