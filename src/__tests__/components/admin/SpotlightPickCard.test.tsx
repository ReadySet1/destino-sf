import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { SpotlightPickCard } from '@/components/admin/SpotlightPicks/SpotlightPickCard';
import { SpotlightPick } from '@/types/spotlight';

// Mock Lucide React icons
jest.mock('lucide-react', () => ({
  Edit: () => <div data-testid="edit-icon">Edit</div>,
  Trash2: () => <div data-testid="trash-icon">Trash</div>,
  Package: () => <div data-testid="package-icon">Package</div>,
  DollarSign: () => <div data-testid="dollar-icon">$</div>,
}));

// Mock Next.js Image component
jest.mock('next/image', () => {
  return function MockImage({ src, alt, ...props }: any) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={alt} {...props} />;
  };
});

describe('SpotlightPickCard', () => {
  const mockOnEdit = jest.fn();
  const mockOnClear = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockProductBasedPick: SpotlightPick = {
    id: 'pick-1',
    position: 1,
    productId: 'product-123',
    customTitle: null,
    customDescription: null,
    customImageUrl: null,
    customPrice: null,
    personalizeText: 'Perfect for your special occasion',
    isCustom: false,
    isActive: true,
    createdAt: new Date('2024-01-01T00:00:00Z'),
    updatedAt: new Date('2024-01-01T00:00:00Z'),
    product: {
      id: 'product-123',
      name: 'Dulce de Leche Alfajores',
      description: 'Traditional Argentine cookies',
      images: ['https://example.com/alfajor.jpg'],
      price: 12.99,
      slug: 'alfajores-gluten-free-1-dozen-packet',
      category: {
        name: 'ALFAJORES',
        slug: 'alfajores',
      },
    },
  };

  const mockCustomPick: SpotlightPick = {
    id: 'pick-2',
    position: 2,
    productId: null,
    customTitle: 'Custom Empanadas Special',
    customDescription: 'Hand-made empanadas with premium fillings',
    customImageUrl: 'https://example.com/custom-empanadas.jpg',
    customPrice: 18.99,
    personalizeText: 'Made fresh daily just for you!',
    isCustom: true,
    isActive: true,
    createdAt: new Date('2024-01-01T00:00:00Z'),
    updatedAt: new Date('2024-01-01T00:00:00Z'),
    product: null,
  };

  const mockEmptyPick: SpotlightPick = {
    id: 'pick-3',
    position: 3,
    productId: null,
    customTitle: null,
    customDescription: null,
    customImageUrl: null,
    customPrice: null,
    personalizeText: null,
    isCustom: false,
    isActive: false,
    createdAt: new Date('2024-01-01T00:00:00Z'),
    updatedAt: new Date('2024-01-01T00:00:00Z'),
    product: null,
  };

  describe('Product-based Spotlight Pick', () => {
    it('should render product-based spotlight pick correctly', () => {
      render(
        <SpotlightPickCard
          pick={mockProductBasedPick}
          onEdit={mockOnEdit}
          onClear={mockOnClear}
          isLoading={false}
        />
      );

      // Check position badge
      expect(screen.getByText('Position 1')).toBeInTheDocument();

      // Check product badge
      expect(screen.getByText('Product')).toBeInTheDocument();

      // Check product name
      expect(screen.getByText('Dulce de Leche Alfajores')).toBeInTheDocument();

      // Check category name
      expect(screen.getByText('ALFAJORES')).toBeInTheDocument();

      // Check description
      expect(screen.getByText('Traditional Argentine cookies')).toBeInTheDocument();

      // Check personalize text with quotes
      expect(
        screen.getByText(content => content.includes('Perfect for your special occasion'))
      ).toBeInTheDocument();

      // Check price
      expect(screen.getByText('12.99')).toBeInTheDocument();

      // Check active status
      expect(screen.getByText('Active')).toBeInTheDocument();
    });

    it('should display edit and clear buttons for active pick', () => {
      render(
        <SpotlightPickCard
          pick={mockProductBasedPick}
          onEdit={mockOnEdit}
          onClear={mockOnClear}
          isLoading={false}
        />
      );

      expect(screen.getByTestId('edit-icon')).toBeInTheDocument();
      expect(screen.getByTestId('trash-icon')).toBeInTheDocument();
    });

    it('should call onEdit when edit button is clicked', () => {
      render(
        <SpotlightPickCard
          pick={mockProductBasedPick}
          onEdit={mockOnEdit}
          onClear={mockOnClear}
          isLoading={false}
        />
      );

      const editButton = screen.getByTestId('edit-icon').closest('button');
      fireEvent.click(editButton!);

      expect(mockOnEdit).toHaveBeenCalledTimes(1);
    });

    it('should call onClear when clear button is clicked', () => {
      render(
        <SpotlightPickCard
          pick={mockProductBasedPick}
          onEdit={mockOnEdit}
          onClear={mockOnClear}
          isLoading={false}
        />
      );

      const clearButton = screen.getByTestId('trash-icon').closest('button');
      fireEvent.click(clearButton!);

      expect(mockOnClear).toHaveBeenCalledTimes(1);
    });

    it('should NOT display product slug tag', () => {
      render(
        <SpotlightPickCard
          pick={mockProductBasedPick}
          onEdit={mockOnEdit}
          onClear={mockOnClear}
          isLoading={false}
        />
      );

      // Verify that the product slug is NOT displayed as a badge
      expect(screen.queryByText('alfajores-gluten-free-1-dozen-packet')).not.toBeInTheDocument();
    });
  });

  describe('Custom Spotlight Pick', () => {
    it('should render custom spotlight pick correctly', () => {
      render(
        <SpotlightPickCard
          pick={mockCustomPick}
          onEdit={mockOnEdit}
          onClear={mockOnClear}
          isLoading={false}
        />
      );

      // Check position badge
      expect(screen.getByText('Position 2')).toBeInTheDocument();

      // Check custom badge
      expect(screen.getByText('Custom')).toBeInTheDocument();

      // Check custom title
      expect(screen.getByText('Custom Empanadas Special')).toBeInTheDocument();

      // Check custom description
      expect(screen.getByText('Hand-made empanadas with premium fillings')).toBeInTheDocument();

      // Check personalize text with quotes
      expect(
        screen.getByText(content => content.includes('Made fresh daily just for you!'))
      ).toBeInTheDocument();

      // Check custom price
      expect(screen.getByText('18.99')).toBeInTheDocument();

      // Check custom image
      const image = screen.getByTestId('spotlight-image');
      expect(image).toHaveAttribute('src', 'https://example.com/custom-empanadas.jpg');
      expect(image).toHaveAttribute('alt', 'Custom Empanadas Special');
    });

    it('should not display product slug for custom pick', () => {
      render(
        <SpotlightPickCard
          pick={mockCustomPick}
          onEdit={mockOnEdit}
          onClear={mockOnClear}
          isLoading={false}
        />
      );

      // Should not have any product slug badge
      expect(screen.queryByText(/alfajores-dulce-de-leche/)).not.toBeInTheDocument();
    });
  });

  describe('Empty Spotlight Pick', () => {
    it('should render empty state correctly', () => {
      render(
        <SpotlightPickCard
          pick={mockEmptyPick}
          onEdit={mockOnEdit}
          onClear={mockOnClear}
          isLoading={false}
        />
      );

      // Check position badge
      expect(screen.getByText('Position 3')).toBeInTheDocument();

      // Check empty state
      expect(screen.getByText('Empty Position')).toBeInTheDocument();
      expect(screen.getByText('Click edit to add content')).toBeInTheDocument();

      // Check package icon for empty state
      expect(screen.getByTestId('package-icon')).toBeInTheDocument();

      // Should not display clear button for empty pick
      expect(screen.queryByTestId('trash-icon')).not.toBeInTheDocument();

      // Should still display edit button
      expect(screen.getByTestId('edit-icon')).toBeInTheDocument();
    });
  });

  describe('Loading State', () => {
    it('should disable buttons when loading', () => {
      render(
        <SpotlightPickCard
          pick={mockProductBasedPick}
          onEdit={mockOnEdit}
          onClear={mockOnClear}
          isLoading={true}
        />
      );

      const editButton = screen.getByTestId('edit-icon').closest('button');
      const clearButton = screen.getByTestId('trash-icon').closest('button');

      expect(editButton).toBeDisabled();
      expect(clearButton).toBeDisabled();
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing image gracefully', () => {
      const pickWithoutImage = {
        ...mockProductBasedPick,
        product: {
          ...mockProductBasedPick.product!,
          images: [],
        },
      };

      render(
        <SpotlightPickCard
          pick={pickWithoutImage}
          onEdit={mockOnEdit}
          onClear={mockOnClear}
          isLoading={false}
        />
      );

      // Should show package icon when no image
      expect(screen.getByTestId('package-icon')).toBeInTheDocument();
    });

    it('should handle missing description gracefully', () => {
      const pickWithoutDescription = {
        ...mockProductBasedPick,
        product: {
          ...mockProductBasedPick.product!,
          description: null,
        },
      };

      render(
        <SpotlightPickCard
          pick={pickWithoutDescription}
          onEdit={mockOnEdit}
          onClear={mockOnClear}
          isLoading={false}
        />
      );

      // Should still render other content
      expect(screen.getByText('Dulce de Leche Alfajores')).toBeInTheDocument();
      expect(screen.queryByText('Traditional Argentine cookies')).not.toBeInTheDocument();
    });

    it('should handle missing personalize text gracefully', () => {
      const pickWithoutPersonalizeText = {
        ...mockProductBasedPick,
        personalizeText: null,
      };

      render(
        <SpotlightPickCard
          pick={pickWithoutPersonalizeText}
          onEdit={mockOnEdit}
          onClear={mockOnClear}
          isLoading={false}
        />
      );

      // Should not display personalize text
      expect(screen.queryByText('"Perfect for your special occasion"')).not.toBeInTheDocument();
    });

    it('should handle missing category gracefully', () => {
      const pickWithoutCategory = {
        ...mockProductBasedPick,
        product: {
          ...mockProductBasedPick.product!,
          category: undefined,
        },
      };

      render(
        <SpotlightPickCard
          pick={pickWithoutCategory}
          onEdit={mockOnEdit}
          onClear={mockOnClear}
          isLoading={false}
        />
      );

      // Should not display category name
      expect(screen.queryByText('ALFAJORES')).not.toBeInTheDocument();
    });

    it('should render untitled when no title is available', () => {
      const pickWithoutTitle = {
        ...mockCustomPick,
        customTitle: null,
      };

      render(
        <SpotlightPickCard
          pick={pickWithoutTitle}
          onEdit={mockOnEdit}
          onClear={mockOnClear}
          isLoading={false}
        />
      );

      expect(screen.getByText('Untitled')).toBeInTheDocument();
    });
  });
});
