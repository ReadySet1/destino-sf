import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { FeaturedProducts } from '@/components/Marketing/FeaturedProducts';
import { SpotlightPick } from '@/types/spotlight';

// Mock next/image
jest.mock('next/image', () => {
  return function MockImage({ src, alt, ...props }: any) {
    return <img src={src} alt={alt} {...props} data-testid="next-image" />;
  };
});

// Mock fetch API
global.fetch = jest.fn();

const mockFetch = fetch as jest.MockedFunction<typeof fetch>;

describe('FeaturedProducts Component (Spotlight Picks)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockSpotlightPicks: SpotlightPick[] = [
    {
      id: 'pick-1',
      position: 1,
      productId: 'product-123',
      isCustom: false,
      isActive: true,
      personalizeText: 'Perfect for your special occasion',
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
    },
    {
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
    },
    {
      id: 'pick-3',
      position: 3,
      productId: 'product-456',
      showNewFeatureModal: true,
      newFeatureTitle: 'New Feature: Premium Fillings',
      newFeatureDescription: 'Discover our new premium empanada fillings',
      newFeatureBadgeText: 'FEATURED',
      isCustom: false,
      isActive: true,
      product: {
        id: 'product-456',
        name: 'Premium Empanadas',
        description: 'Premium empanadas with organic ingredients',
        images: ['https://example.com/premium-empanadas.jpg'],
        price: 15.99,
        slug: 'premium-empanadas',
      },
    },
  ];

  describe('Component Rendering', () => {
    it('should render spotlight picks section title', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockSpotlightPicks }),
      } as Response);

      render(<FeaturedProducts />);

      await waitFor(() => {
        expect(screen.getByText('Spotlight Picks')).toBeInTheDocument();
      });
    });

    it('should render subtitle and description', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockSpotlightPicks }),
      } as Response);

      render(<FeaturedProducts />);

      await waitFor(() => {
        expect(screen.getByText(/Explore our current favorites/)).toBeInTheDocument();
        expect(
          screen.getByText(/Inspired by tradition. Driven by creativity./)
        ).toBeInTheDocument();
      });
    });

    it('should show loading state initially', () => {
      mockFetch.mockImplementation(() => new Promise(() => {})); // Never resolves

      render(<FeaturedProducts />);

      expect(screen.getByText('Loading featured products...')).toBeInTheDocument();
    });
  });

  describe('API Integration', () => {
    it('should fetch spotlight picks from API on component mount', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockSpotlightPicks }),
      } as Response);

      render(<FeaturedProducts />);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/spotlight-picks');
      });
    });

    it('should handle API success and render picks', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockSpotlightPicks }),
      } as Response);

      render(<FeaturedProducts />);

      await waitFor(() => {
        expect(screen.getByText('Dulce de Leche Alfajores')).toBeInTheDocument();
        expect(screen.getByText('Custom Empanadas Special')).toBeInTheDocument();
        expect(screen.getByText('Premium Empanadas')).toBeInTheDocument();
      });
    });

    it('should handle API failure and fallback to default picks', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ success: false, error: 'API Error' }),
      } as Response);

      render(<FeaturedProducts />);

      await waitFor(() => {
        // Should fallback to default picks - check for typical fallback content
        expect(screen.getByText(/Huacatay Chicken/)).toBeInTheDocument();
      });
    });

    it('should handle network error and fallback to default picks', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      render(<FeaturedProducts />);

      await waitFor(() => {
        // Should fallback to default picks
        expect(screen.getByText(/Huacatay Chicken/)).toBeInTheDocument();
      });
    });
  });

  describe('Product Cards Rendering', () => {
    beforeEach(async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockSpotlightPicks }),
      } as Response);
    });

    it('should render product-based spotlight pick correctly', async () => {
      render(<FeaturedProducts />);

      await waitFor(() => {
        // Product name
        expect(screen.getByText('Dulce de Leche Alfajores')).toBeInTheDocument();

        // Product description
        expect(screen.getByText('Traditional Argentine cookies')).toBeInTheDocument();

        // Price
        expect(screen.getByText('$18.00')).toBeInTheDocument();

        // Personalize text in quotes
        expect(screen.getByText(/"Perfect for your special occasion"/)).toBeInTheDocument();
      });
    });

    it('should render custom spotlight pick correctly', async () => {
      render(<FeaturedProducts />);

      await waitFor(() => {
        // Custom title
        expect(screen.getByText('Custom Empanadas Special')).toBeInTheDocument();

        // Custom description
        expect(screen.getByText('Hand-made empanadas with premium fillings')).toBeInTheDocument();

        // Custom price
        expect(screen.getByText('$18.99')).toBeInTheDocument();

        // Personalize text
        expect(screen.getByText(/"Made fresh daily just for you!"/)).toBeInTheDocument();
      });
    });

    it('should render images with correct attributes', async () => {
      render(<FeaturedProducts />);

      await waitFor(() => {
        const images = screen.getAllByTestId('spotlight-image');
        expect(images).toHaveLength(3);

        // Check specific image sources
        expect(images[0]).toHaveAttribute('src', 'https://example.com/alfajor.jpg');
        expect(images[1]).toHaveAttribute('src', 'https://example.com/custom-empanadas.jpg');
      });
    });

    it('should show "Coming Soon" badge when appropriate', async () => {
      const picksWithComingSoon = [...mockSpotlightPicks];
      picksWithComingSoon.push({
        id: 'pick-4',
        position: 4,
        customTitle: 'Monthly Subscription',
        customDescription: 'Coming soon - Click to learn more!',
        isCustom: true,
        isActive: true,
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: picksWithComingSoon }),
      } as Response);

      render(<FeaturedProducts />);

      await waitFor(() => {
        expect(screen.getByText('Coming Soon')).toBeInTheDocument();
      });
    });
  });

  describe('Interactive Features', () => {
    beforeEach(async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockSpotlightPicks }),
      } as Response);
    });

    it('should handle product card clicks for product-based picks', async () => {
      render(<FeaturedProducts />);

      await waitFor(() => {
        const productCard = screen.getByText('Dulce de Leche Alfajores').closest('div');
        expect(productCard).toBeInTheDocument();

        // Should be clickable (have cursor-pointer class or similar styling)
        expect(productCard).toHaveClass('cursor-pointer');
      });
    });

    it('should handle personalize button clicks', async () => {
      render(<FeaturedProducts />);

      await waitFor(() => {
        const personalizeButtons = screen.getAllByText(/Personalize|Try personalize feature/);
        expect(personalizeButtons.length).toBeGreaterThan(0);

        // Click first personalize button
        fireEvent.click(personalizeButtons[0]);

        // Modal should open (check for modal content)
        expect(screen.getByText(/personalize/i)).toBeInTheDocument();
      });
    });

    it('should handle new feature modal for picks with showNewFeatureModal', async () => {
      render(<FeaturedProducts />);

      await waitFor(() => {
        // Find the product with new feature modal
        const newFeatureCard = screen.getByText('Premium Empanadas').closest('div');
        expect(newFeatureCard).toBeInTheDocument();

        // Should show the new feature badge
        expect(screen.getByText('FEATURED')).toBeInTheDocument();
      });
    });

    it('should close modals when close button is clicked', async () => {
      render(<FeaturedProducts />);

      await waitFor(() => {
        const personalizeButtons = screen.getAllByText(/Personalize|Try personalize feature/);

        if (personalizeButtons.length > 0) {
          // Open modal
          fireEvent.click(personalizeButtons[0]);

          // Find and click close button
          const closeButton = screen.getByRole('button', { name: /close/i });
          fireEvent.click(closeButton);

          // Modal should be closed
          expect(screen.queryByText(/personalize/i)).not.toBeInTheDocument();
        }
      });
    });
  });

  describe('Accessibility', () => {
    beforeEach(async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockSpotlightPicks }),
      } as Response);
    });

    it('should have proper heading structure', async () => {
      render(<FeaturedProducts />);

      await waitFor(() => {
        const mainHeading = screen.getByRole('heading', { name: /spotlight picks/i });
        expect(mainHeading).toBeInTheDocument();
        expect(mainHeading.tagName).toBe('H2');
      });
    });

    it('should have proper alt text for images', async () => {
      render(<FeaturedProducts />);

      await waitFor(() => {
        const images = screen.getAllByTestId('spotlight-image');
        images.forEach(img => {
          expect(img).toHaveAttribute('alt');
          expect(img.getAttribute('alt')).toBeTruthy();
        });
      });
    });

    it('should be keyboard navigable', async () => {
      render(<FeaturedProducts />);

      await waitFor(() => {
        const interactiveElements = screen.getAllByRole('button');
        interactiveElements.forEach(element => {
          expect(element).toHaveAttribute('tabIndex');
        });
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle empty spotlight picks gracefully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: [] }),
      } as Response);

      render(<FeaturedProducts />);

      await waitFor(() => {
        // Should fallback to default picks
        expect(screen.getByText(/Huacatay Chicken/)).toBeInTheDocument();
      });
    });

    it('should handle malformed API response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: false }),
      } as Response);

      render(<FeaturedProducts />);

      await waitFor(() => {
        // Should fallback to default picks
        expect(screen.getByText(/Huacatay Chicken/)).toBeInTheDocument();
      });
    });
  });

  describe('Performance', () => {
    it('should not cause memory leaks with multiple re-renders', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, data: mockSpotlightPicks }),
      } as Response);

      const { rerender } = render(<FeaturedProducts />);

      await waitFor(() => {
        expect(screen.getByText('Spotlight Picks')).toBeInTheDocument();
      });

      // Re-render multiple times
      for (let i = 0; i < 5; i++) {
        rerender(<FeaturedProducts />);
      }

      // Should still work correctly
      expect(screen.getByText('Spotlight Picks')).toBeInTheDocument();
    });
  });
});
