/**
 * @jest-environment jsdom
 */
import React from 'react';
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AddToCartButton } from '@/components/store/AddToCartButton';
import type { Product } from '@/types/product';

// Add jest-dom matchers
import '@testing-library/jest-dom';

// Mock dependencies
jest.mock('@/hooks/useSmartCart', () => ({
  useSmartCart: () => ({
    addToCart: jest.fn(),
    isInAnyCart: jest.fn().mockReturnValue(false),
  }),
}));

// Mock sonner toast
jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

// Helper to create mock products
function createMockProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: 'test-product-id',
    squareId: 'square-123',
    name: 'Test Product',
    description: 'A test product',
    price: 10.99,
    images: ['/test-image.jpg'],
    slug: 'test-product',
    categoryId: 'category-123',
    featured: false,
    active: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    isAvailable: true,
    ...overrides,
  };
}

describe('AddToCartButton', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('VIEW_ONLY state', () => {
    it('shows "View Only" disabled button when product has view_only evaluatedAvailability', () => {
      const product = createMockProduct({
        evaluatedAvailability: {
          currentState: 'view_only',
          appliedRulesCount: 1,
        },
      });

      render(<AddToCartButton product={product} />);

      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
      expect(button).toHaveTextContent('View Only');
    });

    it('shows view-only message when showAvailabilityMessages is true', () => {
      const product = createMockProduct({
        evaluatedAvailability: {
          currentState: 'view_only',
          appliedRulesCount: 1,
        },
      });

      render(<AddToCartButton product={product} showAvailabilityMessages={true} />);

      expect(screen.getByText(/view.?only/i)).toBeInTheDocument();
      expect(screen.getByText(/currently available for viewing only/i)).toBeInTheDocument();
    });

    it('does not show view-only message when showAvailabilityMessages is false', () => {
      const product = createMockProduct({
        evaluatedAvailability: {
          currentState: 'view_only',
          appliedRulesCount: 1,
        },
      });

      render(<AddToCartButton product={product} showAvailabilityMessages={false} />);

      expect(screen.getByText(/view.?only/i)).toBeInTheDocument();
      // Message should not be shown
      expect(screen.queryByText(/currently available for viewing only/i)).not.toBeInTheDocument();
    });
  });

  describe('AVAILABLE state', () => {
    it('shows "Add to Cart" enabled button when product is available via evaluatedAvailability', () => {
      const product = createMockProduct({
        evaluatedAvailability: {
          currentState: 'available',
          appliedRulesCount: 0,
        },
      });

      render(<AddToCartButton product={product} />);

      const button = screen.getByRole('button');
      expect(button).not.toBeDisabled();
      expect(button).toHaveTextContent('Add to Cart');
    });

    it('shows "Add to Cart" enabled button when product has no evaluatedAvailability but isAvailable is true', () => {
      const product = createMockProduct({
        isAvailable: true,
        // No evaluatedAvailability - falls back to database fields
      });

      render(<AddToCartButton product={product} />);

      const button = screen.getByRole('button');
      expect(button).not.toBeDisabled();
      expect(button).toHaveTextContent('Add to Cart');
    });
  });

  describe('PRE_ORDER state', () => {
    it('shows pre-order button when product has pre_order evaluatedAvailability and isPreorder flag', () => {
      const product = createMockProduct({
        isPreorder: true,
        preorderEndDate: new Date('2025-02-01'),
        evaluatedAvailability: {
          currentState: 'pre_order',
          appliedRulesCount: 1,
        },
      });

      render(<AddToCartButton product={product} />);

      // Should render PreOrderButton which has different content
      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('shows "Pre-Order Only" fallback button when no settings available', () => {
      const product = createMockProduct({
        isPreorder: false, // No preorder settings
        evaluatedAvailability: {
          currentState: 'pre_order',
          appliedRulesCount: 1,
        },
      });

      render(<AddToCartButton product={product} />);

      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
      expect(button).toHaveTextContent('Pre-Order Only');
    });
  });

  describe('HIDDEN state', () => {
    it('renders nothing when product has hidden state', () => {
      const product = createMockProduct({
        evaluatedAvailability: {
          currentState: 'hidden',
          appliedRulesCount: 1,
        },
      });

      const { container } = render(<AddToCartButton product={product} />);

      expect(container.firstChild).toBeNull();
    });
  });

  describe('COMING_SOON state', () => {
    it('shows "Coming Soon" disabled button', () => {
      const product = createMockProduct({
        evaluatedAvailability: {
          currentState: 'coming_soon',
          appliedRulesCount: 1,
        },
      });

      render(<AddToCartButton product={product} />);

      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
      expect(button).toHaveTextContent('Coming Soon');
    });
  });

  describe('SOLD_OUT state', () => {
    it('shows "Sold Out" disabled button', () => {
      const product = createMockProduct({
        evaluatedAvailability: {
          currentState: 'sold_out',
          appliedRulesCount: 1,
        },
      });

      render(<AddToCartButton product={product} />);

      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
      expect(button).toHaveTextContent('Sold Out');
    });
  });

  describe('RESTRICTED state', () => {
    it('shows "Restricted" disabled button', () => {
      const product = createMockProduct({
        evaluatedAvailability: {
          currentState: 'restricted',
          appliedRulesCount: 1,
        },
      });

      render(<AddToCartButton product={product} />);

      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
      expect(button).toHaveTextContent('Restricted');
    });
  });

  describe('Fallback to database fields', () => {
    it('shows HIDDEN when isAvailable is false and isPreorder is false', () => {
      const product = createMockProduct({
        isAvailable: false,
        isPreorder: false,
        // No evaluatedAvailability
      });

      const { container } = render(<AddToCartButton product={product} />);

      // HIDDEN state renders null
      expect(container.firstChild).toBeNull();
    });

    it('shows PRE_ORDER when isPreorder is true (fallback)', () => {
      const product = createMockProduct({
        isAvailable: true,
        isPreorder: true,
        preorderEndDate: new Date('2025-02-01'),
        // No evaluatedAvailability - falls back to DB fields
      });

      render(<AddToCartButton product={product} />);

      // Should show pre-order button
      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('shows COMING_SOON when itemState is SEASONAL', () => {
      const product = createMockProduct({
        isAvailable: true,
        itemState: 'SEASONAL',
        // No evaluatedAvailability - falls back to DB fields
      });

      render(<AddToCartButton product={product} />);

      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
      expect(button).toHaveTextContent('Coming Soon');
    });
  });

  describe('Button click behavior', () => {
    it('calls addToCart when Add to Cart is clicked', async () => {
      const mockAddToCart = jest.fn();
      jest
        .spyOn(require('@/hooks/useSmartCart'), 'useSmartCart')
        .mockReturnValue({
          addToCart: mockAddToCart,
          isInAnyCart: jest.fn().mockReturnValue(false),
        });

      const product = createMockProduct({
        evaluatedAvailability: {
          currentState: 'available',
          appliedRulesCount: 0,
        },
      });

      render(<AddToCartButton product={product} />);

      const button = screen.getByRole('button');
      fireEvent.click(button);

      expect(mockAddToCart).toHaveBeenCalled();
    });

    it('shows "In Cart" when product is already in cart', () => {
      jest
        .spyOn(require('@/hooks/useSmartCart'), 'useSmartCart')
        .mockReturnValue({
          addToCart: jest.fn(),
          isInAnyCart: jest.fn().mockReturnValue(true),
        });

      const product = createMockProduct({
        evaluatedAvailability: {
          currentState: 'available',
          appliedRulesCount: 0,
        },
      });

      render(<AddToCartButton product={product} />);

      expect(screen.getByText('In Cart')).toBeInTheDocument();
    });
  });

  describe('DES-104: View Only products cannot be added to cart by customers', () => {
    it('prevents adding View Only products to cart for non-admin users', () => {
      // This is the main bug fix - products with view_only state from the server
      // should show "View Only" disabled button, NOT "Add to Cart"
      const product = createMockProduct({
        name: 'Gingerbread Alfajores',
        evaluatedAvailability: {
          currentState: 'view_only',
          appliedRulesCount: 1,
        },
      });

      render(<AddToCartButton product={product} />);

      const button = screen.getByRole('button');

      // Must be disabled
      expect(button).toBeDisabled();

      // Must show "View Only" not "Add to Cart"
      expect(button).toHaveTextContent('View Only');
      expect(button).not.toHaveTextContent('Add to Cart');
    });

    it('uses server-evaluated availability instead of making API calls', () => {
      // The component should NOT use useAvailability hook anymore
      // Instead it should use getEffectiveAvailabilityState from utils
      // This test verifies the component works without any API mocking

      const product = createMockProduct({
        evaluatedAvailability: {
          currentState: 'view_only',
          appliedRulesCount: 1,
        },
      });

      // No API mocking needed - the component uses local evaluation
      render(<AddToCartButton product={product} />);

      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
      expect(button).toHaveTextContent('View Only');
    });
  });
});
