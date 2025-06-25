/**
 * @jest-environment jsdom
 */
import React from 'react';
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ProductCard from '@/components/Products/ProductCard';
import { useCartStore } from '@/store/cart';
import { useCartAlertStore } from '@/components/ui/cart-alert';
import * as imageUtils from '@/lib/image-utils';
import { Product, Variant } from '@/types/product';

// Add jest-dom matchers
import '@testing-library/jest-dom';

// Mock dependencies  
jest.mock('@/store/cart', () => ({
  useCartStore: jest.fn(),
}));
jest.mock('@/components/ui/cart-alert', () => ({
  useCartAlertStore: jest.fn(),
}));
jest.mock('@/lib/image-utils');
jest.mock('next/image', () => ({
  __esModule: true,
  default: ({ src, alt, onError, ...props }: any) => (
    <img
      src={src}
      alt={alt}
      onError={onError}
      data-testid="product-image"
      {...props}
    />
  ),
}));
jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ href, children, ...props }: any) => (
    <a href={href} data-testid="product-link" {...props}>
      {children}
    </a>
  ),
}));

// Mock ImagePlaceholder component
jest.mock('@/components/Products/ImagePlaceholder', () => ({
  ImagePlaceholder: ({ productName, category, size, className }: any) => (
    <div 
      data-testid="image-placeholder"
      data-product-name={productName}
      data-category={category}
      data-size={size}
      className={className}
    >
      Placeholder for {productName}
    </div>
  ),
}));

const mockCartStore = {
  addItem: jest.fn(),
  removeItem: jest.fn(),
  updateQuantity: jest.fn(),
  clearCart: jest.fn(),
  items: [],
  totalItems: 0,
  totalPrice: 0,
};

const mockCartAlertStore = {
  showAlert: jest.fn(),
};

const mockImageUtils = {
  getProductImageConfig: jest.fn(),
  getPlaceholderCategory: jest.fn(),
  getDefaultImageForCategory: jest.fn(),
};

describe('ProductCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    (useCartStore as jest.MockedFunction<typeof useCartStore>).mockReturnValue(mockCartStore);
    (useCartAlertStore as jest.MockedFunction<typeof useCartAlertStore>).mockReturnValue(mockCartAlertStore);
    
    // Setup default image utils mocks
    (imageUtils.getProductImageConfig as jest.MockedFunction<typeof imageUtils.getProductImageConfig>)
      .mockReturnValue({ src: '/test-image.jpg', alt: 'Test Product', placeholder: false });
    (imageUtils.getPlaceholderCategory as jest.MockedFunction<typeof imageUtils.getPlaceholderCategory>)
      .mockReturnValue('food');
    (imageUtils.getDefaultImageForCategory as jest.MockedFunction<typeof imageUtils.getDefaultImageForCategory>)
      .mockReturnValue('/default-image.jpg');
  });

  const createMockProduct = (overrides: Partial<Product> = {}): Product => ({
    id: '1',
    name: 'Test Empanada',
    description: 'Delicious test empanada',
    price: 10.99,
    images: ['/test-image.jpg'],
    featured: false,
    category: {
      id: 'cat-1',
      name: 'Empanadas',
      order: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    variants: undefined, // Fix: use undefined instead of null
    slug: 'test-empanada',
    isActive: true,
    squareId: undefined, // Fix: use undefined instead of null
    squareVariationId: undefined, // Fix: use undefined instead of null
    categoryId: 'cat-1',
    createdAt: new Date(),
    updatedAt: new Date(),
    servingSize: undefined, // Fix: use undefined instead of null
    isVegetarian: false,
    isVegan: false,
    isGlutenFree: false,
    availability: undefined, // Fix: use undefined instead of null
    ...overrides,
  });

  const createMockVariant = (overrides: Partial<Variant> = {}): Variant => ({
    id: 'var-1',
    name: 'Small',
    price: 8.99,
    productId: '1',
    product: {} as Product,
    squareVariantId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  });

  describe('Basic Rendering', () => {
    it('should render product card with basic information', () => {
      const product = createMockProduct();
      render(<ProductCard product={product} />);
      
      expect(screen.getByText('Test Empanada')).toBeInTheDocument();
      expect(screen.getByText('Delicious test empanada')).toBeInTheDocument();
      expect(screen.getByText('$10.99')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /add to cart/i })).toBeInTheDocument();
    });

    it('should render product image when available', () => {
      const product = createMockProduct();
      render(<ProductCard product={product} />);
      
      const image = screen.getByTestId('product-image');
      expect(image).toHaveAttribute('src', '/test-image.jpg');
      expect(image).toHaveAttribute('alt', 'Test Empanada');
    });

    it('should render placeholder when image is not available', () => {
      (imageUtils.getProductImageConfig as jest.MockedFunction<typeof imageUtils.getProductImageConfig>)
        .mockReturnValue({ src: '', alt: '', placeholder: true });
      
      const product = createMockProduct({ images: [] });
      render(<ProductCard product={product} />);
      
      expect(screen.getByTestId('image-placeholder')).toBeInTheDocument();
      expect(screen.queryByTestId('product-image')).not.toBeInTheDocument();
    });

    it('should render featured badge when product is featured', () => {
      const product = createMockProduct({ featured: true });
      render(<ProductCard product={product} />);
      
      expect(screen.getByText('Featured')).toBeInTheDocument();
    });

    it('should not render featured badge when product is not featured', () => {
      const product = createMockProduct({ featured: false });
      render(<ProductCard product={product} />);
      
      expect(screen.queryByText('Featured')).not.toBeInTheDocument();
    });
  });

  describe('Product Links', () => {
    it('should link to product detail page', () => {
      const product = createMockProduct();
      render(<ProductCard product={product} />);
      
      const links = screen.getAllByTestId('product-link');
      expect(links.length).toBeGreaterThan(0);
      expect(links[0]).toHaveAttribute('href', '/products/1');
    });

    it('should handle string product id correctly', () => {
      const product = createMockProduct({ id: 'string-id' });
      render(<ProductCard product={product} />);
      
      const links = screen.getAllByTestId('product-link');
      expect(links[0]).toHaveAttribute('href', '/products/string-id');
    });
  });

  describe('Price Formatting', () => {
    it('should format regular price correctly', () => {
      const product = createMockProduct({ price: 15.99 });
      render(<ProductCard product={product} />);
      
      expect(screen.getByText('$15.99')).toBeInTheDocument();
    });

    it('should handle null price', () => {
      const product = createMockProduct({ price: null as any });
      render(<ProductCard product={product} />);
      
      expect(screen.getByText('$0.00')).toBeInTheDocument();
    });

    it('should handle undefined price', () => {
      const product = createMockProduct({ price: undefined as any });
      render(<ProductCard product={product} />);
      
      expect(screen.getByText('$0.00')).toBeInTheDocument();
    });

    it('should handle NaN price', () => {
      const product = createMockProduct({ price: NaN });
      render(<ProductCard product={product} />);
      
      expect(screen.getByText('$0.00')).toBeInTheDocument();
    });
  });

  describe('Variants Handling', () => {
    it('should display variant selector when variants exist', () => {
      const product = createMockProduct({
        variants: [
          createMockVariant({ id: 'var-1', name: 'Small', price: 8.99 }),
          createMockVariant({ id: 'var-2', name: 'Large', price: 12.99 }),
        ],
      });
      
      render(<ProductCard product={product} />);
      
      const select = screen.getByRole('combobox');
      expect(select).toBeInTheDocument();
    });

    it('should not display variant selector when no variants', () => {
      const product = createMockProduct({ variants: null });
      render(<ProductCard product={product} />);
      
      expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
    });

    it('should display variant options correctly', () => {
      const product = createMockProduct({
        variants: [
          createMockVariant({ id: 'var-1', name: 'Small', price: 8.99 }),
          createMockVariant({ id: 'var-2', name: 'Large', price: 12.99 }),
        ],
      });
      
      render(<ProductCard product={product} />);
      
      expect(screen.getByText('Small - $8.99')).toBeInTheDocument();
      expect(screen.getByText('Large - $12.99')).toBeInTheDocument();
    });

    it('should update price when variant is selected', async () => {
      const user = userEvent.setup();
      const product = createMockProduct({
        price: 10.99,
        variants: [
          createMockVariant({ id: 'var-1', name: 'Small', price: 8.99 }),
          createMockVariant({ id: 'var-2', name: 'Large', price: 12.99 }),
        ],
      });
      
      render(<ProductCard product={product} />);
      
      // Initially shows first variant price
      expect(screen.getByText('$8.99')).toBeInTheDocument();
      
      const select = screen.getByRole('combobox');
      await user.selectOptions(select, 'var-2');
      
      expect(screen.getByText('$12.99')).toBeInTheDocument();
    });

    it('should filter out variants without id', () => {
      const product = createMockProduct({
        variants: [
          createMockVariant({ id: 'var-1', name: 'Small', price: 8.99 }),
          createMockVariant({ id: '', name: 'Invalid', price: 9.99 }),
          createMockVariant({ id: 'var-2', name: 'Large', price: 12.99 }),
        ],
      });
      
      render(<ProductCard product={product} />);
      
      expect(screen.getByText('Small - $8.99')).toBeInTheDocument();
      expect(screen.getByText('Large - $12.99')).toBeInTheDocument();
      expect(screen.queryByText('Invalid - $9.99')).not.toBeInTheDocument();
    });
  });

  describe('Image Error Handling', () => {
    it('should show placeholder when image fails to load', async () => {
      (imageUtils.getProductImageConfig as jest.MockedFunction<typeof imageUtils.getProductImageConfig>)
        .mockReturnValue({ src: '/test-image.jpg', placeholder: false });
      
      const product = createMockProduct();
      render(<ProductCard product={product} />);
      
      const image = screen.getByTestId('product-image');
      
      // Simulate image error
      fireEvent.error(image);
      
      await waitFor(() => {
        expect(screen.getByTestId('image-placeholder')).toBeInTheDocument();
      });
    });

    it('should call image utils with correct parameters', () => {
      const product = createMockProduct({
        name: 'Beef Empanada',
        images: ['/beef.jpg'],
        category: { id: 'cat-1', name: 'Empanadas' },
      });
      
      render(<ProductCard product={product} />);
      
      expect(imageUtils.getProductImageConfig).toHaveBeenCalledWith(
        'Beef Empanada',
        ['/beef.jpg'],
        'Empanadas'
      );
    });
  });

  describe('Add to Cart Functionality', () => {
    it('should add item to cart when button is clicked', async () => {
      const user = userEvent.setup();
      const product = createMockProduct();
      
      render(<ProductCard product={product} />);
      
      const addButton = screen.getByRole('button', { name: /add to cart/i });
      await user.click(addButton);
      
      expect(mockCartStore.addItem).toHaveBeenCalledWith({
        id: '1',
        name: 'Test Empanada',
        price: 10.99,
        quantity: 1,
        image: '/test-image.jpg',
        variantId: undefined,
      });
    });

    it('should add item with variant when variant is selected', async () => {
      const user = userEvent.setup();
      const product = createMockProduct({
        variants: [
          createMockVariant({ id: 'var-1', name: 'Small', price: 8.99 }),
        ],
      });
      
      render(<ProductCard product={product} />);
      
      const addButton = screen.getByRole('button', { name: /add to cart/i });
      await user.click(addButton);
      
      expect(mockCartStore.addItem).toHaveBeenCalledWith({
        id: '1',
        name: 'Test Empanada - Small',
        price: 8.99,
        quantity: 1,
        image: '/test-image.jpg',
        variantId: 'var-1',
      });
    });

    it('should show cart alert after adding item', async () => {
      const user = userEvent.setup();
      const product = createMockProduct();
      
      render(<ProductCard product={product} />);
      
      const addButton = screen.getByRole('button', { name: /add to cart/i });
      await user.click(addButton);
      
      expect(mockCartAlertStore.showAlert).toHaveBeenCalledWith(
        '1 Test Empanada has been added to your cart.'
      );
    });

    it('should show cart alert with variant name', async () => {
      const user = userEvent.setup();
      const product = createMockProduct({
        variants: [
          createMockVariant({ id: 'var-1', name: 'Small', price: 8.99 }),
        ],
      });
      
      render(<ProductCard product={product} />);
      
      const addButton = screen.getByRole('button', { name: /add to cart/i });
      await user.click(addButton);
      
      expect(mockCartAlertStore.showAlert).toHaveBeenCalledWith(
        '1 Test Empanada (Small) has been added to your cart.'
      );
    });
  });

  describe('Price Display with Decimal Objects', () => {
    it('should handle Decimal price object', async () => {
      const user = userEvent.setup();
      const decimalPrice = {
        toNumber: jest.fn().mockReturnValue(15.99),
      };
      
      const product = createMockProduct({ price: decimalPrice as any });
      
      render(<ProductCard product={product} />);
      
      expect(screen.getByText('$15.99')).toBeInTheDocument();
      
      const addButton = screen.getByRole('button', { name: /add to cart/i });
      await user.click(addButton);
      
      expect(mockCartStore.addItem).toHaveBeenCalledWith(
        expect.objectContaining({ price: 15.99 })
      );
    });

    it('should handle variant with Decimal price', async () => {
      const user = userEvent.setup();
      const decimalPrice = {
        toNumber: jest.fn().mockReturnValue(12.50),
      };
      
      const product = createMockProduct({
        variants: [
          { ...createMockVariant(), price: decimalPrice as any },
        ],
      });
      
      render(<ProductCard product={product} />);
      
      expect(screen.getByText('$12.50')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle product without description', () => {
      const product = createMockProduct({ description: null });
      render(<ProductCard product={product} />);
      
      expect(screen.getByText('Test Empanada')).toBeInTheDocument();
      expect(screen.queryByText('Delicious test empanada')).not.toBeInTheDocument();
    });

    it('should handle product without category', () => {
      const product = createMockProduct({ category: null });
      render(<ProductCard product={product} />);
      
      expect(screen.getByText('Test Empanada')).toBeInTheDocument();
      expect(imageUtils.getProductImageConfig).toHaveBeenCalledWith(
        'Test Empanada',
        ['/test-image.jpg'],
        undefined
      );
    });

    it('should handle empty images array', () => {
      const product = createMockProduct({ images: [] });
      render(<ProductCard product={product} />);
      
      expect(imageUtils.getProductImageConfig).toHaveBeenCalledWith(
        'Test Empanada',
        [],
        'Empanadas'
      );
    });

    it('should handle null images', () => {
      const product = createMockProduct({ images: null as any });
      render(<ProductCard product={product} />);
      
      expect(imageUtils.getProductImageConfig).toHaveBeenCalledWith(
        'Test Empanada',
        null,
        'Empanadas'
      );
    });
  });
}); 