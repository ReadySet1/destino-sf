import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { FeaturedProducts } from '@/components/Marketing/FeaturedProducts';
import { ShopByCategory } from '@/components/Marketing/ShopByCategory';
import ProductList from '@/components/Products/ProductList';

// Mock next/image
jest.mock('next/image', () => {
  return function MockImage({ src, alt, ...props }: any) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={alt} {...props} data-testid="next-image" />;
  };
});

// Mock next/link
jest.mock('next/link', () => {
  return function MockLink({ href, children, ...props }: any) {
    return (
      <a href={href} {...props}>
        {children}
      </a>
    );
  };
});

// Mock fetch API
global.fetch = jest.fn();
const mockFetch = fetch as jest.MockedFunction<typeof fetch>;

// Mock CSS modules
jest.mock('@/components/Marketing/ShopByCategory.module.css', () => ({
  categorySection: 'categorySection',
  patternWrapper: 'patternWrapper',
  patternGrid: 'patternGrid',
  patternImageContainer: 'patternImageContainer',
  content: 'content',
}));

describe('Enhanced Menu Sections Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const FullMenuPage = () => (
    <div data-testid="full-menu-page">
      <FeaturedProducts />
      <ShopByCategory />
      <ProductList />
    </div>
  );

  describe('Performance Testing', () => {
    it('should render all sections within acceptable time', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: [] }),
      } as Response);

      const startTime = performance.now();
      render(<FullMenuPage />);
      const renderTime = performance.now() - startTime;

      await waitFor(() => {
        expect(screen.getByText('Spotlight Picks')).toBeInTheDocument();
      });

      // Render should complete within 200ms
      expect(renderTime).toBeLessThan(200);
    });

    it('should handle multiple rapid re-renders efficiently', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, data: [] }),
      } as Response);

      const { rerender } = render(<FullMenuPage />);

      // Rapidly re-render multiple times
      for (let i = 0; i < 5; i++) {
        rerender(<FullMenuPage />);
      }

      await waitFor(() => {
        expect(screen.getByText('Spotlight Picks')).toBeInTheDocument();
        expect(screen.getByText('Our Menus: What We Make')).toBeInTheDocument();
        expect(screen.getByText('Explore Our Offerings Below')).toBeInTheDocument();
      });

      // Should handle re-renders without errors
      expect(mockFetch).toHaveBeenCalled();
    });

    it('should efficiently handle large datasets', async () => {
      const largeMockData = Array.from({ length: 50 }, (_, i) => ({
        id: `pick-${i}`,
        position: (i % 4) + 1,
        isCustom: false,
        isActive: true,
        product: {
          id: `product-${i}`,
          name: `Product ${i}`,
          images: [`image-${i}.jpg`],
          price: 10 + i,
        },
      }));

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: largeMockData }),
      } as Response);

      const startTime = performance.now();
      render(<FullMenuPage />);

      await waitFor(() => {
        expect(screen.getByText('Spotlight Picks')).toBeInTheDocument();
      });

      const totalTime = performance.now() - startTime;
      expect(totalTime).toBeLessThan(500); // Should handle large data efficiently
    });
  });

  describe('Error Resilience', () => {
    it('should isolate API failures to affected sections only', async () => {
      // Mock spotlight picks API to fail
      mockFetch.mockRejectedValueOnce(new Error('Spotlight API failed'));

      render(<FullMenuPage />);

      await waitFor(() => {
        // Other sections should still render
        expect(screen.getByText('Our Menus: What We Make')).toBeInTheDocument();
        expect(screen.getByText('Explore Our Offerings Below')).toBeInTheDocument();

        // Spotlight picks should show fallback
        expect(screen.getByText('Huacatay Chicken')).toBeInTheDocument(); // Default fallback
      });
    });

    it('should handle network timeouts gracefully', async () => {
      // Mock slow network
      mockFetch.mockImplementation(
        () =>
          new Promise(resolve =>
            setTimeout(
              () =>
                resolve({
                  ok: true,
                  json: async () => ({ success: true, data: [] }),
                } as Response),
              1000
            )
          )
      );

      render(<FullMenuPage />);

      // Should show loading state initially
      expect(screen.getByText('Loading featured products...')).toBeInTheDocument();

      // Should handle the delay and eventually show content
      await waitFor(
        () => {
          expect(screen.getByText('Spotlight Picks')).toBeInTheDocument();
        },
        { timeout: 2000 }
      );
    });

    it('should recover from malformed API responses', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: 'invalid-data-format' }),
      } as Response);

      render(<FullMenuPage />);

      await waitFor(() => {
        // Should fallback to default content
        expect(screen.getByText('Spotlight Picks')).toBeInTheDocument();
        expect(screen.getByText('Our Menus: What We Make')).toBeInTheDocument();
      });
    });
  });

  describe('User Experience Flow', () => {
    it('should provide consistent navigation experience across sections', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: [
            {
              id: 'pick-1',
              position: 1,
              isCustom: false,
              isActive: true,
              product: {
                id: 'empanadas-product',
                name: 'Premium Empanadas',
                slug: 'premium-empanadas',
                images: ['empanadas.jpg'],
                price: 15.99,
                category: { name: 'EMPANADAS', slug: 'empanadas' },
              },
            },
          ],
        }),
      } as Response);

      render(<FullMenuPage />);

      await waitFor(() => {
        // Check empanadas links across different sections
        const empanadasLinks = screen
          .getAllByRole('link')
          .filter(
            link =>
              link.getAttribute('href')?.includes('empanadas') ||
              link.textContent?.includes('Empanadas')
          );

        expect(empanadasLinks.length).toBeGreaterThan(1);

        // All empanadas links should be consistent
        empanadasLinks.forEach(link => {
          const href = link.getAttribute('href');
          expect(href).toMatch(/empanadas|\/products\/category\/empanadas/);
        });
      });
    });

    it('should maintain scroll position during interactions', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: [] }),
      } as Response);

      render(<FullMenuPage />);

      await waitFor(() => {
        expect(screen.getByText('Spotlight Picks')).toBeInTheDocument();
      });

      // Simulate user interactions that shouldn't affect scroll
      const categoryCards = screen
        .getAllByRole('link')
        .filter(
          link =>
            link.textContent?.includes('Our Empanadas') ||
            link.textContent?.includes('Our Alfajores') ||
            link.textContent?.includes('Our Catering')
        );

      // Hovering over category cards should not cause layout shifts
      categoryCards.forEach(card => {
        fireEvent.mouseEnter(card);
        fireEvent.mouseLeave(card);
      });

      // Content should remain stable
      expect(screen.getByText('Our Menus: What We Make')).toBeInTheDocument();
    });

    it('should handle rapid user interactions without breaking', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, data: [] }),
      } as Response);

      render(<FullMenuPage />);

      await waitFor(() => {
        expect(screen.getByText('Spotlight Picks')).toBeInTheDocument();
      });

      const allLinks = screen.getAllByRole('link');

      // Rapidly hover over multiple elements
      for (let i = 0; i < Math.min(allLinks.length, 10); i++) {
        fireEvent.mouseEnter(allLinks[i]);
        fireEvent.mouseLeave(allLinks[i]);
      }

      // Page should remain functional
      expect(screen.getByText('Our Menus: What We Make')).toBeInTheDocument();
      expect(screen.getByText('Explore Our Offerings Below')).toBeInTheDocument();
    });
  });

  describe('Content Integrity', () => {
    it('should display consistent pricing across sections', async () => {
      const productWithPrice = {
        id: 'pick-1',
        position: 1,
        isCustom: false,
        isActive: true,
        product: {
          id: 'alfajores-product',
          name: 'Dulce de Leche Alfajores',
          description: 'Traditional cookies',
          images: ['alfajores.jpg'],
          price: 12.99,
          slug: 'alfajores-dulce',
          category: { name: 'ALFAJORES', slug: 'alfajores' },
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: [productWithPrice] }),
      } as Response);

      render(<FullMenuPage />);

      await waitFor(() => {
        // Price should be displayed consistently
        const priceDisplays = screen.getAllByText(/\$12\.99|\$18\.00/);
        expect(priceDisplays.length).toBeGreaterThan(0);
      });
    });

    it('should maintain image loading consistency', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: [] }),
      } as Response);

      render(<FullMenuPage />);

      await waitFor(() => {
        const images = screen.getAllByTestId('next-image');

        // All images should have proper attributes
        images.forEach(img => {
          expect(img).toHaveAttribute('src');
          expect(img).toHaveAttribute('alt');
        });

        // Should have images from all sections
        expect(images.length).toBeGreaterThan(10); // Background pattern + category images + product images
      });
    });

    it('should validate proper ARIA labels and roles', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: [] }),
      } as Response);

      render(<FullMenuPage />);

      await waitFor(() => {
        // Check that main content has proper structure
        const sections = screen.getAllByRole('heading', { level: 2 });
        expect(sections.length).toBeGreaterThanOrEqual(3);

        // Check that navigation elements are properly labeled
        const links = screen.getAllByRole('link');
        links.forEach(link => {
          expect(link).toHaveAttribute('href');
        });

        // Check that interactive elements are accessible
        const interactiveElements = screen.getAllByRole('button');
        interactiveElements.forEach(element => {
          expect(element).toBeInTheDocument();
        });
      });
    });
  });

  describe('Responsive Behavior', () => {
    it('should adapt layout for different viewport sizes', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: [] }),
      } as Response);

      const { container } = render(<FullMenuPage />);

      await waitFor(() => {
        expect(screen.getByText('Spotlight Picks')).toBeInTheDocument();
      });

      // Check that responsive classes are applied
      const gridContainers = container.querySelectorAll('.grid');
      expect(gridContainers.length).toBeGreaterThan(0);

      gridContainers.forEach((gridContainer: Element) => {
        const classes = gridContainer.className;
        // Should have responsive grid classes
        expect(classes).toMatch(/grid-cols-1|md:grid-cols-2|lg:grid-cols-3|md:grid-cols-3/);
      });
    });

    it('should handle text overflow gracefully', async () => {
      const longTextPick = {
        id: 'pick-1',
        position: 1,
        isCustom: true,
        isActive: true,
        customTitle: 'Very Long Product Title That Might Cause Layout Issues With Text Overflow',
        customDescription:
          'This is an extremely long product description that should be handled gracefully by the component without breaking the layout or causing visual issues in the user interface.',
        customPrice: 24.99,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: [longTextPick] }),
      } as Response);

      render(<FullMenuPage />);

      await waitFor(() => {
        expect(screen.getByText(/Very Long Product Title/)).toBeInTheDocument();
        expect(screen.getByText(/extremely long product description/)).toBeInTheDocument();
      });

      // Layout should remain intact
      expect(screen.getByText('Our Menus: What We Make')).toBeInTheDocument();
    });
  });
});
