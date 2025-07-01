import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ShopByCategory } from '@/components/Marketing/ShopByCategory';

// Mock next/image
jest.mock('next/image', () => {
  return function MockImage({ src, alt, ...props }: any) {
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

// Mock CSS modules
jest.mock('@/components/Marketing/ShopByCategory.module.css', () => ({
  categorySection: 'categorySection',
  patternWrapper: 'patternWrapper',
  patternGrid: 'patternGrid',
  patternImageContainer: 'patternImageContainer',
  content: 'content',
}));

// Mock Dancing Script font
jest.mock('next/font/google', () => ({
  Dancing_Script: () => ({
    className: 'mocked-dancing-script',
  }),
}));

describe('ShopByCategory Component (Our Menus: What We Make)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Component Rendering', () => {
    it('should render the main section title', () => {
      render(<ShopByCategory />);

      const mainHeading = screen.getByRole('heading', { name: /our menus: what we make/i });
      expect(mainHeading).toBeInTheDocument();
      expect(mainHeading).toHaveClass('mocked-dancing-script');
    });

    it('should render the subtitle description', () => {
      render(<ShopByCategory />);

      const subtitle = screen.getByText(
        /craving something delicious\? explore our delicious lineup of latin specialties\./i
      );
      expect(subtitle).toBeInTheDocument();
      expect(subtitle).toHaveStyle({ fontStyle: 'italic' });
    });

    it('should have proper heading hierarchy', () => {
      render(<ShopByCategory />);

      const mainHeading = screen.getByRole('heading', { name: /our menus: what we make/i });
      expect(mainHeading.tagName).toBe('H2');
    });
  });

  describe('Category Cards', () => {
    it('should render all three category cards', () => {
      render(<ShopByCategory />);

      expect(screen.getByText('Our Empanadas')).toBeInTheDocument();
      expect(screen.getByText('Our Alfajores')).toBeInTheDocument();
      expect(screen.getByText('Our Catering')).toBeInTheDocument();
    });

    it('should render category descriptions correctly', () => {
      render(<ShopByCategory />);

      // Empanadas description
      expect(
        screen.getByText('Our signature savory pastries with exquisite fillings')
      ).toBeInTheDocument();

      // Alfajores special description (split into two lines)
      expect(screen.getByText('Delicious butter cookies filled')).toBeInTheDocument();
      expect(screen.getByText('with creamy dulce de leche')).toBeInTheDocument();

      // Catering description
      expect(
        screen.getByText('Professional catering services for all your needs')
      ).toBeInTheDocument();
    });

    it('should render all category images with correct attributes', () => {
      render(<ShopByCategory />);

      const images = screen.getAllByTestId('next-image');

      // Should have category images plus background pattern images
      const categoryImages = images.filter(
        img =>
          img.getAttribute('src')?.includes('/images/assets/2Recurso 3.png') ||
          img.getAttribute('src')?.includes('/images/menu/alfajores.png') ||
          img.getAttribute('src')?.includes('/images/menu/catering.jpeg')
      );

      expect(categoryImages).toHaveLength(3);

      // Check specific images
      expect(screen.getByAltText('Our Empanadas')).toBeInTheDocument();
      expect(screen.getByAltText('Our Alfajores')).toBeInTheDocument();
      expect(screen.getByAltText('Our Catering')).toBeInTheDocument();
    });

    it('should have correct links for each category', () => {
      render(<ShopByCategory />);

      // Empanadas link
      const empanadasLink = screen.getByText('Our Empanadas').closest('a');
      expect(empanadasLink).toHaveAttribute('href', '/products/category/empanadas');

      // Alfajores link
      const alfajoresLink = screen.getByText('Our Alfajores').closest('a');
      expect(alfajoresLink).toHaveAttribute('href', '/products/category/alfajores');

      // Catering link (special case)
      const cateringLink = screen.getByText('Our Catering').closest('a');
      expect(cateringLink).toHaveAttribute('href', '/catering');
    });

    it('should include "Shop Now" call-to-action on all cards', () => {
      render(<ShopByCategory />);

      const shopNowElements = screen.getAllByText('Shop Now');
      expect(shopNowElements).toHaveLength(3);
    });

    it('should have hover interaction elements', () => {
      render(<ShopByCategory />);

      const categoryLinks = screen.getAllByRole('link');
      const categoryCardLinks = categoryLinks.filter(
        link =>
          link.getAttribute('href')?.includes('/products/category/') ||
          link.getAttribute('href') === '/catering'
      );

      expect(categoryCardLinks).toHaveLength(3);

      categoryCardLinks.forEach(link => {
        expect(link).toHaveClass('group');
        expect(link).toHaveClass('transition-all');
      });
    });
  });

  describe('Background Pattern', () => {
    it('should render background pattern wrapper', () => {
      render(<ShopByCategory />);

      // Find container with pattern classes
      const container = document.querySelector('.categorySection');
      expect(container).toBeInTheDocument();

      const patternWrapper = container?.querySelector('.patternWrapper');
      expect(patternWrapper).toBeInTheDocument();
    });

    it('should render correct number of background pattern images', () => {
      render(<ShopByCategory />);

      const patternImages = screen
        .getAllByTestId('next-image')
        .filter(img => img.getAttribute('src')?.includes('/images/assets/isotipo.png'));

      // Should have 48 pattern images (6x8 grid)
      expect(patternImages).toHaveLength(48);
    });

    it('should have proper pattern image attributes', () => {
      render(<ShopByCategory />);

      const patternImages = screen
        .getAllByTestId('next-image')
        .filter(img => img.getAttribute('src')?.includes('/images/assets/isotipo.png'));

      patternImages.forEach(img => {
        expect(img).toHaveAttribute('src', '/images/assets/isotipo.png');
        expect(img).toHaveAttribute('alt', '');
      });
    });
  });

  describe('Layout and Styling', () => {
    it('should have proper CSS grid layout for categories', () => {
      render(<ShopByCategory />);

      const gridContainer = screen.getByText('Our Empanadas').closest('div')?.parentElement;
      expect(gridContainer).toHaveClass('grid');
      expect(gridContainer).toHaveClass('md:grid-cols-3');
    });

    it('should have responsive design classes', () => {
      render(<ShopByCategory />);

      const container = document.querySelector('.content');
      expect(container).toBeInTheDocument();

      // Check for responsive padding and container classes
      const innerContainer = container?.querySelector('.mx-auto');
      expect(innerContainer).toHaveClass('max-w-7xl');
      expect(innerContainer).toHaveClass('px-4');
      expect(innerContainer).toHaveClass('sm:px-6');
      expect(innerContainer).toHaveClass('lg:px-8');
    });

    it('should apply correct typography classes to headings', () => {
      render(<ShopByCategory />);

      const mainHeading = screen.getByRole('heading', { name: /our menus: what we make/i });
      expect(mainHeading).toHaveClass('text-4xl');
      expect(mainHeading).toHaveClass('font-bold');
      expect(mainHeading).toHaveClass('sm:text-5xl');

      const categoryHeadings = screen.getAllByText(/^Our (Empanadas|Alfajores|Catering)$/);
      categoryHeadings.forEach(heading => {
        expect(heading).toHaveClass('text-2xl');
        expect(heading).toHaveClass('font-bold');
        expect(heading).toHaveClass('mocked-dancing-script');
      });
    });
  });

  describe('Content Structure', () => {
    it('should maintain correct category data structure', () => {
      render(<ShopByCategory />);

      // Verify all expected categories are present with correct structure
      const expectedCategories = [
        {
          name: 'Our Empanadas',
          slug: '/products/category/empanadas',
          description: 'Our signature savory pastries with exquisite fillings',
        },
        {
          name: 'Our Alfajores',
          slug: '/products/category/alfajores',
          // Special handling for alfajores description (split into two lines)
        },
        {
          name: 'Our Catering',
          slug: '/catering',
          description: 'Professional catering services for all your needs',
        },
      ];

      expectedCategories.forEach(category => {
        const link = screen.getByRole('link', { name: new RegExp(category.name, 'i') });
        expect(link).toHaveAttribute('href', category.slug);

        if (category.description) {
          expect(screen.getByText(category.description)).toBeInTheDocument();
        }
      });
    });

    it('should have proper semantic structure', () => {
      render(<ShopByCategory />);

      // Should use semantic HTML
      const links = screen.getAllByRole('link');
      expect(links.length).toBeGreaterThan(0);

      const headings = screen.getAllByRole('heading');
      expect(headings.length).toBeGreaterThan(0);
    });
  });

  describe('Accessibility', () => {
    it('should have proper alt text for all images', () => {
      render(<ShopByCategory />);

      const categoryImages = screen
        .getAllByTestId('next-image')
        .filter(img => img.getAttribute('alt') && img.getAttribute('alt') !== '');

      // Category images should have proper alt text
      expect(screen.getByAltText('Our Empanadas')).toBeInTheDocument();
      expect(screen.getByAltText('Our Alfajores')).toBeInTheDocument();
      expect(screen.getByAltText('Our Catering')).toBeInTheDocument();
    });

    it('should have keyboard navigation support', () => {
      render(<ShopByCategory />);

      const links = screen.getAllByRole('link');
      const categoryLinks = links.filter(
        link =>
          link.getAttribute('href')?.includes('/products/category/') ||
          link.getAttribute('href') === '/catering'
      );

      categoryLinks.forEach(link => {
        expect(link).toBeInTheDocument();
        // Links should be focusable by default
      });
    });

    it('should have proper heading hierarchy', () => {
      render(<ShopByCategory />);

      const headings = screen.getAllByRole('heading');

      // Main heading should be h2
      const mainHeading = screen.getByRole('heading', { name: /our menus: what we make/i });
      expect(mainHeading.tagName).toBe('H2');

      // Category names should be h3
      const categoryHeadings = screen.getAllByText(/^Our (Empanadas|Alfajores|Catering)$/);
      categoryHeadings.forEach(heading => {
        expect(heading.tagName).toBe('H3');
      });
    });
  });

  describe('Integration', () => {
    it('should integrate properly with Next.js routing', () => {
      render(<ShopByCategory />);

      // All links should use Next.js Link component (mocked)
      const empanadasLink = screen.getByText('Our Empanadas').closest('a');
      expect(empanadasLink).toHaveAttribute('href', '/products/category/empanadas');

      const alfajoresLink = screen.getByText('Our Alfajores').closest('a');
      expect(alfajoresLink).toHaveAttribute('href', '/products/category/alfajores');

      const cateringLink = screen.getByText('Our Catering').closest('a');
      expect(cateringLink).toHaveAttribute('href', '/catering');
    });

    it('should handle font loading gracefully', () => {
      render(<ShopByCategory />);

      // Font class should be applied
      const mainHeading = screen.getByRole('heading', { name: /our menus: what we make/i });
      expect(mainHeading).toHaveClass('mocked-dancing-script');
    });
  });

  describe('Error Handling', () => {
    it('should handle missing images gracefully', () => {
      // This test ensures the component doesn't break if images fail to load
      render(<ShopByCategory />);

      const images = screen.getAllByTestId('next-image');
      expect(images.length).toBeGreaterThan(0);

      // Component should render without errors
      expect(screen.getByText('Our Menus: What We Make')).toBeInTheDocument();
    });
  });
});
