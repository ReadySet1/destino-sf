/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { SpotlightPicksManager } from '@/components/admin/SpotlightPicks/SpotlightPicksManager';
import { SpotlightPick } from '@/types/spotlight';

// Mock Lucide React icons
jest.mock('lucide-react', () => ({
  CheckCircle: ({ className }: any) => <div data-testid="check-circle-icon" className={className} />,
  AlertCircle: ({ className }: any) => <div data-testid="alert-circle-icon" className={className} />,
  Eye: ({ className }: any) => <div data-testid="eye-icon" className={className} />,
  RefreshCw: ({ className }: any) => <div data-testid="refresh-icon" className={className} />,
  Trash2: ({ className }: any) => <div data-testid="trash-icon" className={className} />,
  Package: ({ className }: any) => <div data-testid="package-icon" className={className} />,
  DollarSign: ({ className }: any) => <div data-testid="dollar-icon" className={className} />,
  Loader2: ({ className }: any) => <div data-testid="loader-icon" className={className} />,
  Search: ({ className }: any) => <div data-testid="search-icon" className={className} />,
  Filter: ({ className }: any) => <div data-testid="filter-icon" className={className} />,
  Check: ({ className }: any) => <div data-testid="check-icon" className={className} />,
}));

// Mock Next.js Image
jest.mock('next/image', () => {
  return function MockImage({ src, alt, ...props }: any) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={alt} {...props} />;
  };
});

// Mock sonner toast
const mockToastSuccess = jest.fn();
const mockToastError = jest.fn();
jest.mock('sonner', () => ({
  toast: {
    success: (msg: string) => mockToastSuccess(msg),
    error: (msg: string) => mockToastError(msg),
  },
}));

// Mock FeaturedProducts component
jest.mock('@/components/Marketing/FeaturedProducts', () => ({
  FeaturedProducts: () => <div data-testid="featured-products-preview">Featured Products Preview</div>,
}));

// Mock SpotlightPickCard component
jest.mock('@/components/admin/SpotlightPicks/SpotlightPickCard', () => ({
  SpotlightPickCard: ({ pick, onProductSelect, onClear, isLoading }: any) => (
    <div data-testid={`spotlight-card-${pick.position}`}>
      <span data-testid={`card-position-${pick.position}`}>Position {pick.position}</span>
      <span data-testid={`card-active-${pick.position}`}>{pick.isActive ? 'Active' : 'Inactive'}</span>
      {pick.product?.name && (
        <span data-testid={`card-product-${pick.position}`}>{pick.product.name}</span>
      )}
      <button
        data-testid={`select-product-${pick.position}`}
        onClick={() => onProductSelect('new-product-id')}
        disabled={isLoading}
      >
        Select Product
      </button>
      {pick.isActive && (
        <button
          data-testid={`clear-pick-${pick.position}`}
          onClick={onClear}
          disabled={isLoading}
        >
          Clear
        </button>
      )}
    </div>
  ),
}));

// Mock Dialog components
jest.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children, open }: any) => (open ? <div data-testid="preview-dialog">{children}</div> : null),
  DialogContent: ({ children }: any) => <div data-testid="dialog-content">{children}</div>,
  DialogHeader: ({ children }: any) => <div data-testid="dialog-header">{children}</div>,
  DialogTitle: ({ children }: any) => <div data-testid="dialog-title">{children}</div>,
}));

// Mock fetch
global.fetch = jest.fn();

describe('SpotlightPicksManager', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockToastSuccess.mockClear();
    mockToastError.mockClear();

    // Default fetch mock for admin API
    (fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: [],
      }),
    });
  });

  const mockActivePicks: SpotlightPick[] = [
    {
      id: 'pick-1',
      position: 1,
      productId: 'product-1',
      isActive: true,
      product: {
        id: 'product-1',
        name: 'Dulce de Leche Alfajores',
        description: 'Traditional Argentine cookies',
        images: ['https://example.com/alfajor.jpg'],
        price: 12.99,
        slug: 'alfajores-dulce-de-leche',
        category: { name: 'ALFAJORES', slug: 'alfajores' },
      },
    },
    {
      id: 'pick-2',
      position: 2,
      productId: 'product-2',
      isActive: true,
      product: {
        id: 'product-2',
        name: 'Beef Empanadas',
        description: 'Savory beef empanadas',
        images: ['https://example.com/empanada.jpg'],
        price: 15.99,
        slug: 'beef-empanadas',
        category: { name: 'EMPANADAS', slug: 'empanadas' },
      },
    },
  ];

  describe('Initial Render', () => {
    it('should render with empty initial picks and show 4 position cards', () => {
      render(<SpotlightPicksManager initialPicks={[]} />);

      // Should show all 4 position cards
      expect(screen.getByTestId('spotlight-card-1')).toBeInTheDocument();
      expect(screen.getByTestId('spotlight-card-2')).toBeInTheDocument();
      expect(screen.getByTestId('spotlight-card-3')).toBeInTheDocument();
      expect(screen.getByTestId('spotlight-card-4')).toBeInTheDocument();
    });

    it('should render with populated initial picks', () => {
      render(<SpotlightPicksManager initialPicks={mockActivePicks} />);

      // Should show product names for active picks
      expect(screen.getByTestId('card-product-1')).toHaveTextContent('Dulce de Leche Alfajores');
      expect(screen.getByTestId('card-product-2')).toHaveTextContent('Beef Empanadas');

      // Should still have all 4 cards (positions 3 and 4 are empty)
      expect(screen.getByTestId('spotlight-card-3')).toBeInTheDocument();
      expect(screen.getByTestId('spotlight-card-4')).toBeInTheDocument();
    });

    it('should normalize picks to always show 4 positions', () => {
      const singlePick: SpotlightPick[] = [
        {
          id: 'pick-3',
          position: 3,
          productId: 'product-3',
          isActive: true,
          product: {
            id: 'product-3',
            name: 'Test Product',
            images: [],
            price: 10.99,
          },
        },
      ];

      render(<SpotlightPicksManager initialPicks={singlePick} />);

      // All 4 positions should be rendered
      expect(screen.getByTestId('card-position-1')).toHaveTextContent('Position 1');
      expect(screen.getByTestId('card-position-2')).toHaveTextContent('Position 2');
      expect(screen.getByTestId('card-position-3')).toHaveTextContent('Position 3');
      expect(screen.getByTestId('card-position-4')).toHaveTextContent('Position 4');

      // Only position 3 should be active
      expect(screen.getByTestId('card-active-3')).toHaveTextContent('Active');
      expect(screen.getByTestId('card-active-1')).toHaveTextContent('Inactive');
      expect(screen.getByTestId('card-active-2')).toHaveTextContent('Inactive');
      expect(screen.getByTestId('card-active-4')).toHaveTextContent('Inactive');
    });
  });

  describe('Statistics Display', () => {
    it('should display correct active picks count', () => {
      render(<SpotlightPicksManager initialPicks={mockActivePicks} />);

      // Should show 2 active picks
      expect(screen.getByText('2')).toBeInTheDocument();
      expect(screen.getByText('Active Picks')).toBeInTheDocument();
    });

    it('should display correct completion percentage', () => {
      render(<SpotlightPicksManager initialPicks={mockActivePicks} />);

      // 2 out of 4 = 50%
      expect(screen.getByText('50%')).toBeInTheDocument();
      expect(screen.getByText('Completion')).toBeInTheDocument();
    });

    it('should display 0% when no active picks', () => {
      render(<SpotlightPicksManager initialPicks={[]} />);

      expect(screen.getByText('0')).toBeInTheDocument();
      expect(screen.getByText('0%')).toBeInTheDocument();
    });
  });

  describe('Status Alerts', () => {
    it('should show warning alert when no active picks', () => {
      render(<SpotlightPicksManager initialPicks={[]} />);

      expect(
        screen.getByText(/No spotlight picks are currently active/i)
      ).toBeInTheDocument();
    });

    it('should show success alert when all 4 picks are active', () => {
      const allActivePicks: SpotlightPick[] = [
        { ...mockActivePicks[0], position: 1 },
        { ...mockActivePicks[1], position: 2 },
        {
          id: 'pick-3',
          position: 3,
          productId: 'p-3',
          isActive: true,
          product: { id: 'p-3', name: 'Product 3', images: [], price: 10 },
        },
        {
          id: 'pick-4',
          position: 4,
          productId: 'p-4',
          isActive: true,
          product: { id: 'p-4', name: 'Product 4', images: [], price: 10 },
        },
      ];

      render(<SpotlightPicksManager initialPicks={allActivePicks} />);

      expect(
        screen.getByText(/All spotlight pick positions are filled/i)
      ).toBeInTheDocument();
    });

    it('should not show any alert when partially filled', () => {
      render(<SpotlightPicksManager initialPicks={mockActivePicks} />);

      // Neither the warning nor the success alert should be shown
      expect(
        screen.queryByText(/No spotlight picks are currently active/i)
      ).not.toBeInTheDocument();
      expect(
        screen.queryByText(/All spotlight pick positions are filled/i)
      ).not.toBeInTheDocument();
    });
  });

  describe('Save Operation', () => {
    it('should call API when selecting a product', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: { ...mockActivePicks[0], position: 1 } }),
      }).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockActivePicks }),
      });

      render(<SpotlightPicksManager initialPicks={[]} />);

      // Click the select product button for position 1
      const selectButton = screen.getByTestId('select-product-1');
      fireEvent.click(selectButton);

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith('/api/admin/spotlight-picks', expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: expect.stringContaining('new-product-id'),
        }));
      });
    });

    it('should show success toast on successful save', async () => {
      (fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, data: [] }),
        });

      render(<SpotlightPicksManager initialPicks={[]} />);

      const selectButton = screen.getByTestId('select-product-1');
      fireEvent.click(selectButton);

      await waitFor(() => {
        expect(mockToastSuccess).toHaveBeenCalledWith('Spotlight pick updated successfully');
      });
    });

    it('should show error toast on failed save', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: false, error: 'Failed to save' }),
      });

      render(<SpotlightPicksManager initialPicks={[]} />);

      const selectButton = screen.getByTestId('select-product-1');
      fireEvent.click(selectButton);

      await waitFor(() => {
        expect(mockToastError).toHaveBeenCalledWith('Failed to save');
      });
    });
  });

  describe('Delete Operation', () => {
    it('should call DELETE API when clearing a pick', async () => {
      (fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, data: [] }),
        });

      render(<SpotlightPicksManager initialPicks={mockActivePicks} />);

      // Click the clear button for position 1
      const clearButton = screen.getByTestId('clear-pick-1');
      fireEvent.click(clearButton);

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith(
          '/api/admin/spotlight-picks?position=1',
          expect.objectContaining({ method: 'DELETE' })
        );
      });
    });

    it('should show success toast on successful delete', async () => {
      (fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, data: [] }),
        });

      render(<SpotlightPicksManager initialPicks={mockActivePicks} />);

      const clearButton = screen.getByTestId('clear-pick-1');
      fireEvent.click(clearButton);

      await waitFor(() => {
        expect(mockToastSuccess).toHaveBeenCalledWith('Spotlight pick cleared successfully!');
      });
    });

    it('should show error toast on failed delete', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: false, error: 'Delete failed' }),
      });

      render(<SpotlightPicksManager initialPicks={mockActivePicks} />);

      const clearButton = screen.getByTestId('clear-pick-1');
      fireEvent.click(clearButton);

      await waitFor(() => {
        expect(mockToastError).toHaveBeenCalledWith('Delete failed');
      });
    });
  });

  describe('Refresh Operation', () => {
    it('should call API when clicking refresh button', async () => {
      (fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, data: mockActivePicks }),
      });

      render(<SpotlightPicksManager initialPicks={[]} />);

      const refreshButton = screen.getByText('Refresh');
      fireEvent.click(refreshButton);

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith('/api/admin/spotlight-picks');
      });
    });
  });

  describe('Preview Modal', () => {
    it('should open preview modal when clicking Preview button', () => {
      render(<SpotlightPicksManager initialPicks={mockActivePicks} />);

      const previewButton = screen.getByText('Preview');
      fireEvent.click(previewButton);

      // Dialog should be open
      expect(screen.getByTestId('preview-dialog')).toBeInTheDocument();
      expect(screen.getByText('Spotlight Picks Preview')).toBeInTheDocument();
      expect(screen.getByTestId('featured-products-preview')).toBeInTheDocument();
    });
  });

  describe('Action Buttons', () => {
    it('should render Refresh button', () => {
      render(<SpotlightPicksManager initialPicks={[]} />);
      expect(screen.getByText('Refresh')).toBeInTheDocument();
    });

    it('should render Preview button', () => {
      render(<SpotlightPicksManager initialPicks={[]} />);
      expect(screen.getByText('Preview')).toBeInTheDocument();
    });

    it('should render View Live link', () => {
      render(<SpotlightPicksManager initialPicks={[]} />);
      const viewLiveLink = screen.getByText('View Live');
      expect(viewLiveLink).toBeInTheDocument();
      expect(viewLiveLink.closest('a')).toHaveAttribute('href', '/');
      expect(viewLiveLink.closest('a')).toHaveAttribute('target', '_blank');
    });
  });

  describe('Instructions Section', () => {
    it('should render How to Use section', () => {
      render(<SpotlightPicksManager initialPicks={[]} />);
      expect(screen.getByText('How to Use Spotlight Picks')).toBeInTheDocument();
    });

    it('should display best practices', () => {
      render(<SpotlightPicksManager initialPicks={[]} />);
      expect(screen.getByText('Best Practices')).toBeInTheDocument();
      expect(screen.getByText(/Product Selection:/)).toBeInTheDocument();
      expect(screen.getByText(/Automatic Content:/)).toBeInTheDocument();
    });
  });
});
