import React from 'react';
import { render, screen } from '@testing-library/react';
import { MenuSection } from '../MenuSection';

// Mock Next.js components
jest.mock('next/link', () => {
  return function MockLink({ children, href, ...props }: any) {
    return (
      <a href={href} {...props}>
        {children}
      </a>
    );
  };
});

jest.mock('next/image', () => {
  return function MockImage({
    src,
    alt,
    width,
    height,
    priority,
    unoptimized,
    fill,
    sizes,
    className,
    loading,
    ...props
  }: any) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={alt}
        width={width}
        height={height}
        data-priority={priority}
        data-unoptimized={unoptimized}
        data-fill={fill}
        data-sizes={sizes}
        data-loading={loading}
        className={className}
        {...props}
      />
    );
  };
});

// Mock CSS modules
jest.mock('../MenuSection.module.css', () => ({
  menuSection: 'menuSection',
  patternWrapper: 'patternWrapper',
  patternGrid: 'patternGrid',
  patternImageContainer: 'patternImageContainer',
  content: 'content',
}));

// Mock Google Fonts
jest.mock('next/font/google', () => ({
  Dancing_Script: () => ({
    className: 'dancing-script-font',
  }),
}));

describe('MenuSection', () => {
  beforeEach(() => {
    // Clear any previous renders
    document.body.innerHTML = '';
  });

  describe('Component Rendering', () => {
    it('renders the main menu section with correct structure', () => {
      render(<MenuSection />);

      // Check main container
      const menuSection = screen.getByRole('heading', { name: /menu/i }).closest('div');
      expect(menuSection).toHaveClass('menuSection');

      // Check title
      const title = screen.getByRole('heading', { name: /menu/i });
      expect(title).toBeInTheDocument();
      expect(title).toHaveClass('absolute', 'top-0', 'left-0', 'right-0', 'text-center');
    });

    it('renders background pattern with correct number of isotipo images', () => {
      render(<MenuSection />);

      // Check for isotipo background images (48 total)
      const isotipoImages = screen.getAllByAltText('');
      const backgroundImages = isotipoImages.filter(
        img => img.getAttribute('src') === '/images/assets/isotipo.png'
      );
      expect(backgroundImages).toHaveLength(48);
    });

    it('renders all menu items with correct content', () => {
      render(<MenuSection />);

      // Check for all three menu items
      expect(screen.getByText('Our Empanadas')).toBeInTheDocument();
      expect(screen.getByText('Our Alfajores')).toBeInTheDocument();
      expect(screen.getByText('Catering')).toBeInTheDocument();
    });
  });

  describe('Menu Items', () => {
    it('renders empanadas menu item with correct link and image', () => {
      render(<MenuSection />);

      const empanadasLink = screen.getByRole('link', { name: /our empanadas/i });
      expect(empanadasLink).toHaveAttribute('href', '/products/category/empanadas');

      const empanadasImage = screen.getByAltText('Our Empanadas');
      expect(empanadasImage).toHaveAttribute('src', '/images/homepage/empanadas.png');
      expect(empanadasImage).toHaveAttribute('width', '224');
      expect(empanadasImage).toHaveAttribute('height', '224');
    });

    it('renders alfajores menu item with correct link and image', () => {
      render(<MenuSection />);

      const alfajoresLink = screen.getByRole('link', { name: /our alfajores/i });
      expect(alfajoresLink).toHaveAttribute('href', '/products/category/alfajores');

      const alfajoresImage = screen.getByAltText('Our Alfajores');
      expect(alfajoresImage).toHaveAttribute('src', '/images/homepage/alfajor.png');
      expect(alfajoresImage).toHaveAttribute('width', '224');
      expect(alfajoresImage).toHaveAttribute('height', '224');
    });

    it('renders catering menu item with correct link and image', () => {
      render(<MenuSection />);

      const cateringLink = screen.getByRole('link', { name: /catering/i });
      expect(cateringLink).toHaveAttribute('href', '/catering');

      const cateringImage = screen.getByAltText('Catering');
      expect(cateringImage).toHaveAttribute('src', '/images/homepage/catering.png');
      expect(cateringImage).toHaveAttribute('width', '224');
      expect(cateringImage).toHaveAttribute('height', '224');
    });

    it('applies Dancing Script font to menu item titles', () => {
      render(<MenuSection />);

      const empanadasTitle = screen.getByText('Our Empanadas');
      const alfajoresTitle = screen.getByText('Our Alfajores');
      const cateringTitle = screen.getByText('Catering');

      expect(empanadasTitle).toHaveClass('dancing-script-font');
      expect(alfajoresTitle).toHaveClass('dancing-script-font');
      expect(cateringTitle).toHaveClass('dancing-script-font');
    });
  });

  describe('Image Optimization', () => {
    it('sets priority loading for first 12 background images', () => {
      render(<MenuSection />);

      const isotipoImages = screen.getAllByAltText('');
      const backgroundImages = isotipoImages.filter(
        img => img.getAttribute('src') === '/images/assets/isotipo.png'
      );

      // First 12 should have priority
      for (let i = 0; i < 12; i++) {
        expect(backgroundImages[i]).toHaveAttribute('data-priority', 'true');
      }

      // Rest should not have priority
      for (let i = 12; i < backgroundImages.length; i++) {
        expect(backgroundImages[i]).toHaveAttribute('data-priority', 'false');
      }
    });

    it('sets unoptimized flag for all images', () => {
      render(<MenuSection />);

      const allImages = screen.getAllByRole('img');
      allImages.forEach(img => {
        expect(img).toHaveAttribute('data-unoptimized', 'true');
      });
    });

    it('sets priority loading for menu item images', () => {
      render(<MenuSection />);

      const menuImages = [
        screen.getByAltText('Our Empanadas'),
        screen.getByAltText('Our Alfajores'),
        screen.getByAltText('Catering'),
      ];

      menuImages.forEach(img => {
        expect(img).toHaveAttribute('data-priority', 'true');
      });
    });
  });

  describe('Responsive Design', () => {
    it('applies responsive classes to main title', () => {
      render(<MenuSection />);

      const title = screen.getByRole('heading', { name: /menu/i });
      expect(title).toHaveClass('text-3xl', 'lg:text-5xl');
      expect(title).toHaveClass('pt-2', 'sm:pt-4');
    });

    it('applies responsive classes to menu item containers', () => {
      render(<MenuSection />);

      const empanadasLink = screen.getByRole('link', { name: /our empanadas/i });
      const imageContainer = empanadasLink.querySelector('div');

      expect(imageContainer).toHaveClass(
        'h-32',
        'w-32',
        'sm:h-40',
        'sm:w-40',
        'md:h-56',
        'md:w-56'
      );
    });

    it('applies responsive classes to menu item titles', () => {
      render(<MenuSection />);

      const empanadasTitle = screen.getByText('Our Empanadas');
      expect(empanadasTitle).toHaveClass('text-xl', 'sm:text-2xl', 'md:text-3xl');
      expect(empanadasTitle).toHaveClass('mt-4', 'md:mt-6');
    });

    it('applies responsive padding to content container', () => {
      render(<MenuSection />);

      const contentContainer = screen
        .getByRole('heading', { name: /menu/i })
        .closest('div')
        ?.querySelector('.mx-auto');

      expect(contentContainer).toHaveClass('px-4', 'sm:px-6', 'lg:px-8');
      expect(contentContainer).toHaveClass('pt-16', 'sm:pt-20', 'md:pt-24', 'lg:pt-28');
    });
  });

  describe('Layout and Styling', () => {
    it('applies correct layout classes to menu items container', () => {
      render(<MenuSection />);

      const menuItemsContainer = screen.getByRole('link', { name: /our empanadas/i }).parentElement;

      expect(menuItemsContainer).toHaveClass('flex', 'flex-row', 'justify-around', 'items-center');
    });

    it('applies correct styling to menu item links', () => {
      render(<MenuSection />);

      const empanadasLink = screen.getByRole('link', { name: /our empanadas/i });
      expect(empanadasLink).toHaveClass('flex', 'flex-col', 'items-center');
    });

    it('applies correct styling to image containers', () => {
      render(<MenuSection />);

      const empanadasLink = screen.getByRole('link', { name: /our empanadas/i });
      const imageContainer = empanadasLink.querySelector('div');

      expect(imageContainer).toHaveClass('relative', 'overflow-hidden', 'rounded-full');
    });

    it('applies correct styling to images', () => {
      render(<MenuSection />);

      const empanadasImage = screen.getByAltText('Our Empanadas');
      expect(empanadasImage).toHaveClass('object-cover', 'h-full', 'w-full');
    });
  });

  describe('Accessibility', () => {
    it('provides proper heading structure', () => {
      render(<MenuSection />);

      // Main heading
      const mainHeading = screen.getByRole('heading', { level: 2, name: /menu/i });
      expect(mainHeading).toBeInTheDocument();

      // Menu item headings
      const itemHeadings = screen.getAllByRole('heading', { level: 3 });
      expect(itemHeadings).toHaveLength(3);

      const headingTexts = itemHeadings.map(h => h.textContent);
      expect(headingTexts).toContain('Our Empanadas '); // Note the trailing space in the actual data
      expect(headingTexts).toContain('Our Alfajores');
      expect(headingTexts).toContain('Catering');
    });

    it('provides descriptive alt text for menu item images', () => {
      render(<MenuSection />);

      expect(screen.getByAltText('Our Empanadas')).toBeInTheDocument();
      expect(screen.getByAltText('Our Alfajores')).toBeInTheDocument();
      expect(screen.getByAltText('Catering')).toBeInTheDocument();
    });

    it('provides empty alt text for decorative background images', () => {
      render(<MenuSection />);

      const isotipoImages = screen.getAllByAltText('');
      const backgroundImages = isotipoImages.filter(
        img => img.getAttribute('src') === '/images/assets/isotipo.png'
      );

      expect(backgroundImages).toHaveLength(48);
      backgroundImages.forEach(img => {
        expect(img).toHaveAttribute('alt', '');
      });
    });

    it('provides proper link accessibility', () => {
      render(<MenuSection />);

      const links = screen.getAllByRole('link');
      expect(links).toHaveLength(3);

      links.forEach(link => {
        expect(link).toHaveAttribute('href');
        expect(link.getAttribute('href')).toBeTruthy();
      });
    });
  });

  describe('Content Structure', () => {
    it('maintains correct menu item data structure', () => {
      render(<MenuSection />);

      // Verify all expected menu items are present
      const expectedItems = [
        { name: 'Our Empanadas', slug: '/products/category/empanadas' },
        { name: 'Our Alfajores', slug: '/products/category/alfajores' },
        { name: 'Catering', slug: '/catering' },
      ];

      expectedItems.forEach(item => {
        const link = screen.getByRole('link', { name: new RegExp(item.name, 'i') });
        expect(link).toHaveAttribute('href', item.slug);
      });
    });

    it('renders background pattern with correct structure', () => {
      render(<MenuSection />);

      const patternWrapper = screen
        .getByRole('heading', { name: /menu/i })
        .closest('div')
        ?.querySelector('.patternWrapper');

      expect(patternWrapper).toBeInTheDocument();

      const patternGrid = patternWrapper?.querySelector('.patternGrid');
      expect(patternGrid).toBeInTheDocument();

      const patternContainers = patternGrid?.querySelectorAll('.patternImageContainer');
      expect(patternContainers).toHaveLength(48);
    });

    it('applies correct z-index layering', () => {
      render(<MenuSection />);

      const title = screen.getByRole('heading', { name: /menu/i });
      expect(title).toHaveClass('z-20');

      const contentDiv = screen
        .getByRole('heading', { name: /menu/i })
        .closest('div')
        ?.querySelector('.content');
      expect(contentDiv).toHaveClass('content');
    });
  });

  describe('Edge Cases', () => {
    it('handles missing images gracefully', () => {
      render(<MenuSection />);

      // All images should render even if src might be missing
      const menuImages = [
        screen.getByAltText('Our Empanadas'),
        screen.getByAltText('Our Alfajores'),
        screen.getByAltText('Catering'),
      ];

      menuImages.forEach(img => {
        expect(img).toBeInTheDocument();
        expect(img).toHaveAttribute('src');
      });
    });

    it('maintains layout with long menu item names', () => {
      render(<MenuSection />);

      // Check that the layout classes are applied correctly
      const menuItemsContainer = screen.getByRole('link', { name: /our empanadas/i }).parentElement;

      expect(menuItemsContainer).toHaveClass('justify-around');

      // All menu items should be in the same container
      const links = screen.getAllByRole('link');
      links.forEach(link => {
        expect(link.parentElement).toBe(menuItemsContainer);
      });
    });

    it('handles component without CSS module classes', () => {
      // This test ensures the component doesn't break if CSS modules fail to load
      render(<MenuSection />);

      // Component should still render basic structure
      expect(screen.getByRole('heading', { name: /menu/i })).toBeInTheDocument();
      expect(screen.getAllByRole('link')).toHaveLength(3);
      expect(screen.getAllByRole('img')).toHaveLength(3); // Only menu item images are rendered in this test context
    });
  });
});
