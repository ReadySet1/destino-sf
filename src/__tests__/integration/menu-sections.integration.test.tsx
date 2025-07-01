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

describe('Menu Sections Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const TestPage = () => (
    <div>
      <FeaturedProducts />
      <ShopByCategory />
      <ProductList />
    </div>
  );

  describe('Full Page Integration', () => {
    it('should render all menu sections together without conflicts', async () => {
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
                id: 'product-1',
                name: 'Test Product',
                images: ['test.jpg'],
                price: 10.99,
              },
            },
          ],
        }),
      } as Response);

      render(<TestPage />);

      await waitFor(() => {
        // Spotlight Picks section
        expect(screen.getByText('Spotlight Picks')).toBeInTheDocument();

        // Our Menus section
        expect(screen.getByText('Our Menus: What We Make')).toBeInTheDocument();

        // Product List section
        expect(screen.getByText('Explore Our Offerings Below')).toBeInTheDocument();
      });
    });

    it('should maintain consistent navigation links across sections', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: [] }),
      } as Response);

      render(<TestPage />);

      await waitFor(() => {
        // Check that all sections have consistent navigation
        const empanadasLinks = screen.getAllByText('Our Empanadas');
        const alfajoresLinks = screen.getAllByText('Our Alfajores');
        const cateringLinks = screen.getAllByText(/Catering|Our Catering/);

        expect(empanadasLinks.length).toBeGreaterThan(0);
        expect(alfajoresLinks.length).toBeGreaterThan(0);
        expect(cateringLinks.length).toBeGreaterThan(0);
      });
    });

    it('should handle API failures gracefully without breaking other sections', async () => {
      mockFetch.mockRejectedValueOnce(new Error('API Error'));

      render(<TestPage />);

      await waitFor(() => {
        // Spotlight picks should fallback to defaults
        expect(screen.getByText('Spotlight Picks')).toBeInTheDocument();

        // Other sections should still render normally
        expect(screen.getByText('Our Menus: What We Make')).toBeInTheDocument();
        expect(screen.getByText('Explore Our Offerings Below')).toBeInTheDocument();
      });
    });

    it('should have proper semantic structure across all sections', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: [] }),
      } as Response);

      render(<TestPage />);

      await waitFor(() => {
        const headings = screen.getAllByRole('heading');

        // Should have main headings for each section
        expect(headings.length).toBeGreaterThanOrEqual(3);

        // Check heading hierarchy (all main section headings should be h2)
        const mainHeadings = headings.filter(
          h =>
            h.textContent?.includes('Spotlight Picks') ||
            h.textContent?.includes('Our Menus: What We Make') ||
            h.textContent?.includes('Explore Our Offerings Below')
        );

        mainHeadings.forEach(heading => {
          expect(heading.tagName).toBe('H2');
        });
      });
    });
  });

  describe('Cross-Section Data Consistency', () => {
    it('should show consistent product information across sections', async () => {
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
                id: 'alfajores-product',
                name: 'Our Alfajores',
                description: 'Butter cookies with dulce de leche',
                images: ['alfajores.jpg'],
                price: 12.99,
                category: { name: 'ALFAJORES', slug: 'alfajores' },
              },
            },
          ],
        }),
      } as Response);

      render(<TestPage />);

      await waitFor(() => {
        // Alfajores should appear in multiple sections
        const alfajoresReferences = screen.getAllByText(/alfajores/i);
        expect(alfajoresReferences.length).toBeGreaterThan(1);
      });
    });

    it('should maintain consistent link destinations across sections', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: [] }),
      } as Response);

      render(<TestPage />);

      await waitFor(() => {
        // Check empanadas links
        const empanadasLinks = screen
          .getAllByRole('link')
          .filter(link => link.getAttribute('href') === '/products/category/empanadas');
        expect(empanadasLinks.length).toBeGreaterThan(0);

        // Check alfajores links
        const alfajoresLinks = screen
          .getAllByRole('link')
          .filter(link => link.getAttribute('href') === '/products/category/alfajores');
        expect(alfajoresLinks.length).toBeGreaterThan(0);

        // Check catering links
        const cateringLinks = screen
          .getAllByRole('link')
          .filter(link => link.getAttribute('href') === '/catering');
        expect(cateringLinks.length).toBeGreaterThan(0);
      });
    });
  });

  describe('User Interaction Flow', () => {
    it('should support navigation from spotlight picks to category pages', async () => {
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
                id: 'product-1',
                name: 'Empanadas',
                slug: 'empanadas-beef',
                images: ['empanadas.jpg'],
                price: 15.99,
                category: { name: 'EMPANADAS', slug: 'empanadas' },
              },
            },
          ],
        }),
      } as Response);

      render(<TestPage />);

      await waitFor(() => {
        // User can click on spotlight pick
        const spotlightCard = screen.getByText('Empanadas').closest('div');
        expect(spotlightCard).toBeInTheDocument();

        // And also navigate via menu sections
        const menuEmpanadas = screen.getByText('Our Empanadas');
        expect(menuEmpanadas.closest('a')).toHaveAttribute('href', '/products/category/empanadas');
      });
    });

    it('should provide multiple paths to the same content', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: [] }),
      } as Response);

      render(<TestPage />);

      await waitFor(() => {
        // Users should be able to reach catering through multiple routes
        const cateringLinks = screen
          .getAllByRole('link')
          .filter(link => link.getAttribute('href') === '/catering');

        // Should have catering links in both ShopByCategory and ProductList
        expect(cateringLinks.length).toBeGreaterThanOrEqual(2);
      });
    });
  });

  describe('Performance and Loading', () => {
    it('should handle staggered loading of sections gracefully', async () => {
      // Simulate slow API response
      let resolveSpotlightPromise: (value: any) => void;
      const spotlightPromise = new Promise(resolve => {
        resolveSpotlightPromise = resolve;
      });

      mockFetch.mockReturnValueOnce(spotlightPromise as any);

      render(<TestPage />);

      // Other sections should render immediately
      expect(screen.getByText('Our Menus: What We Make')).toBeInTheDocument();
      expect(screen.getByText('Explore Our Offerings Below')).toBeInTheDocument();

      // Spotlight section should show loading
      expect(screen.getByText('Loading featured products...')).toBeInTheDocument();

      // Resolve the API call
      resolveSpotlightPromise!({
        ok: true,
        json: async () => ({ success: true, data: [] }),
      });

      await waitFor(() => {
        expect(screen.getByText('Spotlight Picks')).toBeInTheDocument();
        expect(screen.queryByText('Loading featured products...')).not.toBeInTheDocument();
      });
    });

    it('should not block rendering of static sections due to API failures', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const startTime = Date.now();
      render(<TestPage />);

      // Static sections should render immediately
      expect(screen.getByText('Our Menus: What We Make')).toBeInTheDocument();
      expect(screen.getByText('Explore Our Offerings Below')).toBeInTheDocument();

      const renderTime = Date.now() - startTime;
      expect(renderTime).toBeLessThan(100); // Should be nearly instant

      await waitFor(() => {
        // Spotlight picks should eventually show fallback content
        expect(screen.getByText('Spotlight Picks')).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility Integration', () => {
    it('should maintain proper heading hierarchy across all sections', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: [] }),
      } as Response);

      render(<TestPage />);

      await waitFor(() => {
        const allHeadings = screen.getAllByRole('heading');

        // Check that main section headings are h2
        const h2Headings = allHeadings.filter(h => h.tagName === 'H2');
        expect(h2Headings.length).toBeGreaterThanOrEqual(3);

        // Check that subsection headings are h3
        const h3Headings = allHeadings.filter(h => h.tagName === 'H3');
        expect(h3Headings.length).toBeGreaterThan(0);
      });
    });

    it('should provide proper navigation landmarks', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: [] }),
      } as Response);

      render(<TestPage />);

      await waitFor(() => {
        // Check for proper section structure
        const sections = document.querySelectorAll('section');
        expect(sections.length).toBeGreaterThan(0);

        // Check for proper link structure
        const links = screen.getAllByRole('link');
        expect(links.length).toBeGreaterThan(0);

        links.forEach(link => {
          expect(link).toHaveAttribute('href');
        });
      });
    });
  });

  describe('Error Boundaries and Resilience', () => {
    it('should isolate errors between sections', async () => {
      // Mock console.error to avoid test noise
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      mockFetch.mockRejectedValueOnce(new Error('Spotlight API failed'));

      render(<TestPage />);

      await waitFor(() => {
        // Even if spotlight fails, other sections should work
        expect(screen.getByText('Our Menus: What We Make')).toBeInTheDocument();
        expect(screen.getByText('Explore Our Offerings Below')).toBeInTheDocument();
      });

      consoleSpy.mockRestore();
    });

    it('should provide fallback content for failed sections', async () => {
      mockFetch.mockRejectedValueOnce(new Error('API Error'));

      render(<TestPage />);

      await waitFor(() => {
        // Spotlight should show fallback content
        expect(screen.getByText('Spotlight Picks')).toBeInTheDocument();

        // Should show default fallback items
        expect(screen.getByText(/Huacatay Chicken/)).toBeInTheDocument();
      });
    });
  });
});
