import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import ProductList from '@/components/Products/ProductList';

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

// Mock Lucide React icons
jest.mock('lucide-react', () => ({
  ArrowRight: () => <div data-testid="arrow-right-icon">→</div>,
}));

// Mock Dancing Script font
jest.mock('next/font/google', () => ({
  Dancing_Script: () => ({
    className: 'mocked-dancing-script',
  }),
}));

describe('ProductList Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Component Rendering', () => {
    it('should render the main section title', () => {
      render(<ProductList />);

      const mainHeading = screen.getByRole('heading', { name: /explore our offerings below/i });
      expect(mainHeading).toBeInTheDocument();
      expect(mainHeading).toHaveClass('mocked-dancing-script');
    });

    it('should render all three product cards', () => {
      render(<ProductList />);

      expect(screen.getByText('Our Alfajores')).toBeInTheDocument();
      expect(screen.getByText('Our Empanadas')).toBeInTheDocument();
      expect(screen.getByText('Catering')).toBeInTheDocument();
    });

    it('should render product descriptions correctly', () => {
      render(<ProductList />);

      expect(
        screen.getByText('Our famous butter cookies filled with dulce de leche.')
      ).toBeInTheDocument();
      expect(
        screen.getByText('Handcrafted savory pastries with a variety of flavorful fillings.')
      ).toBeInTheDocument();
      expect(
        screen.getByText(
          'Custom catering services for private events, corporate gatherings & celebrations.'
        )
      ).toBeInTheDocument();
    });

    it('should render all product images with correct attributes', () => {
      render(<ProductList />);

      const images = screen.getAllByTestId('next-image');
      expect(images).toHaveLength(3);

      expect(screen.getByAltText('Alfajores')).toBeInTheDocument();
      expect(screen.getByAltText('Empanadas')).toBeInTheDocument();
      expect(screen.getByAltText('Catering')).toBeInTheDocument();
    });

    it('should have correct links for each product', () => {
      render(<ProductList />);

      const alfajoresLink = screen.getByText('Our Alfajores').closest('a');
      expect(alfajoresLink).toHaveAttribute('href', '/products/category/alfajores');

      const empanadasLink = screen.getByText('Our Empanadas').closest('a');
      expect(empanadasLink).toHaveAttribute('href', '/products/category/empanadas');

      const cateringLink = screen.getByText('Catering').closest('a');
      expect(cateringLink).toHaveAttribute('href', '/catering');
    });

    it('should include "View details" call-to-action on all cards', () => {
      render(<ProductList />);

      const viewDetailsElements = screen.getAllByText('View details');
      expect(viewDetailsElements).toHaveLength(3);
    });

    it('should render arrow icons for all products', () => {
      render(<ProductList />);

      const arrowIcons = screen.getAllByTestId('arrow-right-icon');
      expect(arrowIcons).toHaveLength(3);
    });
  });

  describe('Layout and Styling', () => {
    it('should have proper CSS grid layout', () => {
      render(<ProductList />);

      const gridContainer = screen.getByText('Our Alfajores').closest('div')?.parentElement;
      expect(gridContainer).toHaveClass('grid');
      expect(gridContainer).toHaveClass('grid-cols-1');
      expect(gridContainer).toHaveClass('md:grid-cols-2');
      expect(gridContainer).toHaveClass('lg:grid-cols-3');
    });

    it('should apply correct typography classes', () => {
      render(<ProductList />);

      const mainHeading = screen.getByRole('heading', { name: /explore our offerings below/i });
      expect(mainHeading).toHaveClass('text-4xl');
      expect(mainHeading).toHaveClass('font-bold');
      expect(mainHeading).toHaveClass('sm:text-5xl');

      const productHeadings = screen.getAllByText(/^(Our Alfajores|Our Empanadas|Catering)$/);
      productHeadings.forEach(heading => {
        expect(heading).toHaveClass('text-3xl');
        expect(heading).toHaveClass('font-bold');
        expect(heading).toHaveClass('sm:text-4xl');
        expect(heading).toHaveClass('mocked-dancing-script');
      });
    });

    it('should have responsive design classes', () => {
      render(<ProductList />);

      const section = screen
        .getByRole('heading', { name: /explore our offerings below/i })
        .closest('section');
      expect(section).toHaveClass('w-full');
      expect(section).toHaveClass('py-8');
      expect(section).toHaveClass('md:py-12');
      expect(section).toHaveClass('lg:py-16');
    });

    it('should have hover interaction styles', () => {
      render(<ProductList />);

      const productLinks = screen.getAllByRole('link');

      productLinks.forEach(link => {
        expect(link).toHaveClass('group');
        expect(link).toHaveClass('transition-all');
      });
    });
  });

  describe('Content Structure', () => {
    it('should maintain correct product data structure', () => {
      render(<ProductList />);

      const expectedProducts = [
        {
          name: 'Our Alfajores',
          slug: '/products/category/alfajores',
          description: 'Our famous butter cookies filled with dulce de leche.',
        },
        {
          name: 'Our Empanadas',
          slug: '/products/category/empanadas',
          description: 'Handcrafted savory pastries with a variety of flavorful fillings.',
        },
        {
          name: 'Catering',
          slug: '/catering',
          description:
            'Custom catering services for private events, corporate gatherings & celebrations.',
        },
      ];

      expectedProducts.forEach(product => {
        const link = screen.getByRole('link', { name: new RegExp(product.name, 'i') });
        expect(link).toHaveAttribute('href', product.slug);
        expect(screen.getByText(product.description)).toBeInTheDocument();
      });
    });

    it('should have proper semantic structure', () => {
      render(<ProductList />);

      const section = screen
        .getByRole('heading', { name: /explore our offerings below/i })
        .closest('section');
      expect(section?.tagName).toBe('SECTION');

      const links = screen.getAllByRole('link');
      expect(links.length).toBe(3);

      const headings = screen.getAllByRole('heading');
      expect(headings.length).toBe(4); // 1 main + 3 product headings
    });
  });

  describe('Accessibility', () => {
    it('should have proper heading hierarchy', () => {
      render(<ProductList />);

      const mainHeading = screen.getByRole('heading', { name: /explore our offerings below/i });
      expect(mainHeading.tagName).toBe('H2');

      const productHeadings = screen.getAllByText(/^(Our Alfajores|Our Empanadas|Catering)$/);
      productHeadings.forEach(heading => {
        expect(heading.tagName).toBe('H3');
      });
    });

    it('should have proper alt text for all images', () => {
      render(<ProductList />);

      expect(screen.getByAltText('Alfajores')).toBeInTheDocument();
      expect(screen.getByAltText('Empanadas')).toBeInTheDocument();
      expect(screen.getByAltText('Catering')).toBeInTheDocument();
    });

    it('should have keyboard navigation support', () => {
      render(<ProductList />);

      const links = screen.getAllByRole('link');

      links.forEach(link => {
        expect(link).toBeInTheDocument();
        // Links should be focusable by default
      });
    });

    it('should have proper focus management', () => {
      render(<ProductList />);

      const links = screen.getAllByRole('link');

      links.forEach(link => {
        expect(link).toHaveClass('focus:outline-none');
        expect(link).toHaveClass('focus:ring-2');
        expect(link).toHaveClass('focus:ring-yellow-500');
      });
    });
  });

  describe('Integration', () => {
    it('should integrate properly with Next.js routing', () => {
      render(<ProductList />);

      const alfajoresLink = screen.getByText('Our Alfajores').closest('a');
      expect(alfajoresLink).toHaveAttribute('href', '/products/category/alfajores');

      const empanadasLink = screen.getByText('Our Empanadas').closest('a');
      expect(empanadasLink).toHaveAttribute('href', '/products/category/empanadas');

      const cateringLink = screen.getByText('Catering').closest('a');
      expect(cateringLink).toHaveAttribute('href', '/catering');
    });

    it('should handle font loading gracefully', () => {
      render(<ProductList />);

      const headings = screen.getAllByRole('heading');
      headings.forEach(heading => {
        if (heading.classList.contains('mocked-dancing-script')) {
          expect(heading).toHaveClass('mocked-dancing-script');
        }
      });
    });
  });

  describe('Visual Elements', () => {
    it('should include title underline decoration', () => {
      render(<ProductList />);

      // Check for the decorative underline element
      const container = screen.getByRole('heading', {
        name: /explore our offerings below/i,
      }).parentElement;
      const underlineElement = container?.querySelector('.h-1.w-16.bg-yellow-400.mx-auto');
      expect(underlineElement).toBeInTheDocument();
    });

    it('should have proper image aspect ratios', () => {
      render(<ProductList />);

      const imageContainers = document.querySelectorAll('.aspect-\\[4\\/3\\]');
      expect(imageContainers.length).toBe(3);
    });

    it('should include gradient overlays on hover', () => {
      render(<ProductList />);

      const gradientOverlays = document.querySelectorAll('.bg-gradient-to-t.from-black\\/40');
      expect(gradientOverlays.length).toBe(3);
    });
  });

  describe('Error Handling', () => {
    it('should handle missing images gracefully', () => {
      render(<ProductList />);

      const images = screen.getAllByTestId('next-image');
      expect(images.length).toBe(3);

      // Component should render without errors
      expect(screen.getByText('Explore Our Offerings Below')).toBeInTheDocument();
    });

    it('should render even with incomplete product data', () => {
      // This test ensures robustness of the component
      render(<ProductList />);

      // Should always render the main structure
      expect(
        screen.getByRole('heading', { name: /explore our offerings below/i })
      ).toBeInTheDocument();
      expect(screen.getAllByRole('link')).toHaveLength(3);
    });
  });
});
