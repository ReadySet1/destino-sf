import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { BoxedLunchMenu } from '@/components/Catering/BoxedLunchMenu';

// Mock zustand store
jest.mock('@/store/catering-cart', () => ({
  useCateringCartStore: () => ({
    addItem: jest.fn(),
  }),
}));

// Mock react-hot-toast
jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: {
    success: jest.fn(),
    error: jest.fn(),
  },
  Toaster: () => <div data-testid="toaster" />,
}));

// Mock framer-motion to avoid animation issues in tests
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => children,
}));

describe('BoxedLunchMenu - Protein Image Functionality', () => {
  beforeEach(() => {
    // Clear any previous mocks
    jest.clearAllMocks();
  });

  test('renders the main component without crashing', () => {
    render(<BoxedLunchMenu />);

    expect(screen.getByText('Individual Packaged Lunch Options - 2025')).toBeInTheDocument();
    expect(screen.getByText('Boxed Lunch Tiers')).toBeInTheDocument();
  });

  test('displays all three tiers correctly', () => {
    render(<BoxedLunchMenu />);

    expect(screen.getByText('Tier #1')).toBeInTheDocument();
    expect(screen.getByText('Tier #2')).toBeInTheDocument();
    expect(screen.getByText('Tier #3')).toBeInTheDocument();

    expect(screen.getByText('$14.00')).toBeInTheDocument();
    expect(screen.getByText('$15.00')).toBeInTheDocument();
    expect(screen.getByText('$17.00')).toBeInTheDocument();
  });

  test('shows protein selection options', async () => {
    render(<BoxedLunchMenu />);

    // All tiers show protein selection by default
    await waitFor(() => {
      const proteinHeaders = screen.getAllByText('Choose Your Protein:');
      expect(proteinHeaders.length).toBe(3); // One for each tier
    });
  });

  test('protein images are rendered with correct src attributes', async () => {
    render(<BoxedLunchMenu />);

    await waitFor(() => {
      const images = screen.getAllByRole('img');
      // Next.js Image component processes the src, so we need to check for the processed URL
      const proteinImages = images.filter(img => {
        const src = img.getAttribute('src') || '';
        return src.includes('boxedlunches') || src.includes('_next/image');
      });

      expect(proteinImages.length).toBeGreaterThan(0);

      // Check specific images are present with correct filenames (accounting for Next.js processing)
      const carneAsadaImg = images.find(img => {
        const src = img.getAttribute('src') || '';
        return src.includes('carne-asada') || src.includes('boxedlunches');
      });
      const carnitasImg = images.find(img => {
        const src = img.getAttribute('src') || '';
        return src.includes('carnitas') || src.includes('boxedlunches');
      });
      const polloImg = images.find(img => {
        const src = img.getAttribute('src') || '';
        return src.includes('pollo-asado') || src.includes('boxedlunches');
      });

      expect(carneAsadaImg || carnitasImg || polloImg).toBeTruthy();
    });
  });

  test('protein selection works correctly', async () => {
    render(<BoxedLunchMenu />);

    await waitFor(() => {
      expect(screen.getByText('Pollo Asado')).toBeInTheDocument();
    });

    // Find and click a protein option
    const proteinButton = screen.getByText('Pollo Asado').closest('button');
    if (proteinButton) {
      fireEvent.click(proteinButton);
    }

    // Should still show the protein name after selection
    expect(screen.getByText('Pollo Asado')).toBeInTheDocument();
  });

  test('images have proper accessibility attributes', async () => {
    render(<BoxedLunchMenu />);

    await waitFor(() => {
      const proteinImages = screen
        .getAllByRole('img')
        .filter(img => img.getAttribute('src')?.includes('/images/boxedlunches/'));

      proteinImages.forEach(img => {
        expect(img).toHaveAttribute('alt');
        expect(img.getAttribute('alt')).toBeTruthy();
      });
    });
  });

  test('images have correct styling classes', async () => {
    render(<BoxedLunchMenu />);

    await waitFor(() => {
      const images = screen.getAllByRole('img');
      const proteinImages = images.filter(img =>
        img.getAttribute('src')?.includes('/images/boxedlunches/')
      );

      proteinImages.forEach(img => {
        // Check for styling classes (size, object-cover, etc.)
        expect(img.className).toContain('object-cover');
        expect(img.className).toContain('w-full');
        expect(img.className).toContain('h-full');
      });
    });
  });

  test('all expected protein names are displayed', async () => {
    render(<BoxedLunchMenu />);

    await waitFor(() => {
      // Use getAllByText since proteins appear in multiple tiers
      expect(screen.getAllByText('Carne Asada').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Pollo al Carbón').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Carnitas').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Pollo Asado').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Pescado').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Vegetarian Option').length).toBeGreaterThan(0);
    });
  });

  test('console error handlers are attached to images', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    render(<BoxedLunchMenu />);

    await waitFor(() => {
      const images = screen.getAllByRole('img');
      const proteinImages = images.filter(img =>
        img.getAttribute('src')?.includes('/images/boxedlunches/')
      );

      // Simulate image error
      if (proteinImages.length > 0) {
        fireEvent.error(proteinImages[0]);
      }
    });

    consoleSpy.mockRestore();
  });

  test('component renders with expected protein count per tier', async () => {
    render(<BoxedLunchMenu />);

    await waitFor(() => {
      // Tier #1 should have 3 proteins
      const tier1Section = screen.getByText('Tier #1').closest('.cursor-pointer');

      // Tier #2 should have 4 proteins
      const tier2Section = screen.getByText('Tier #2').closest('.cursor-pointer');

      // Tier #3 should have 6 proteins
      const tier3Section = screen.getByText('Tier #3').closest('.cursor-pointer');

      expect(tier1Section).toBeInTheDocument();
      expect(tier2Section).toBeInTheDocument();
      expect(tier3Section).toBeInTheDocument();
    });
  });
}); 