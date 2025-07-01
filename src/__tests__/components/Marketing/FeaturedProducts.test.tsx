/**
 * @jest-environment jsdom
 */
import React from 'react';
import { describe, it, expect, beforeEach, jest, afterEach } from '@jest/globals';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FeaturedProducts } from '@/components/Marketing/FeaturedProducts';
import { SpotlightPick } from '@/types/spotlight';

// Add jest-dom matchers
import '@testing-library/jest-dom';

// Mock next/link
jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ href, children, ...props }: any) => (
    <a href={href} data-testid="product-link" {...props}>
      {children}
    </a>
  ),
}));

// Mock next/font/google
jest.mock('next/font/google', () => ({
  Dancing_Script: () => ({
    className: 'mock-dancing-script',
  }),
}));

// Mock next/image
jest.mock('next/image', () => {
  return function MockImage({ src, alt, ...props }: any) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={alt} {...props} data-testid="next-image" />;
  };
});

// Mock global fetch with proper typing
const mockFetch = jest.fn() as jest.MockedFunction<typeof fetch>;
global.fetch = mockFetch;

describe('FeaturedProducts Component', () => {
  const mockSpotlightPicks: SpotlightPick[] = [
    {
      id: 'pick-1',
      position: 1,
      productId: 'product-1',
      customTitle: null,
      customDescription: null,
      customImageUrl: null,
      customPrice: null,
      personalizeText: null,
      customLink: null,
      showNewFeatureModal: false,
      newFeatureTitle: null,
      newFeatureDescription: null,
      newFeatureBadgeText: null,
      isCustom: false,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      product: {
        id: 'product-1',
        name: 'Dulce de Leche Alfajores',
        description: 'Traditional Argentine cookies',
        images: ['/images/alfajores.jpg'],
        price: 12.99,
        slug: 'dulce-leche-alfajores',
        category: {
          name: 'ALFAJORES',
          slug: 'alfajores',
        },
      },
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: mockSpotlightPicks,
      }),
    } as Response);
  });

  describe('Basic Rendering', () => {
    it('should render spotlight picks after loading', async () => {
      render(<FeaturedProducts />);
      
      await waitFor(() => {
        expect(screen.getByText('Dulce de Leche Alfajores')).toBeInTheDocument();
      });
    });

    it('should display correct prices', async () => {
      render(<FeaturedProducts />);
      
      await waitFor(() => {
        expect(screen.getByText('$12.99')).toBeInTheDocument();
      });
    });
  });

  describe('Custom Link Functionality', () => {
    it('should render custom link products correctly', async () => {
      const customLinkPick = {
        ...mockSpotlightPicks[0],
        customLink: 'https://special-promotion.com',
      };
      
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          data: [customLinkPick],
        }),
      } as Response);

      render(<FeaturedProducts />);
      
      await waitFor(() => {
        const titleElement = screen.getByText('Dulce de Leche Alfajores');
        expect(titleElement).toBeInTheDocument();
        
        // The custom link product should render as a button, not a link
        const buttonElement = titleElement.closest('button');
        expect(buttonElement).toBeInTheDocument();
        expect(buttonElement?.className).toContain('text-left');
      });
    });
  });

  describe('New Feature Modal Functionality', () => {
    it('should display new feature badge and description', async () => {
      const newFeaturePick = {
        ...mockSpotlightPicks[0],
        showNewFeatureModal: true,
        newFeatureTitle: 'Amazing Feature',
        newFeatureDescription: 'Revolutionary new functionality',
        newFeatureBadgeText: 'BETA',
      };
      
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          data: [newFeaturePick],
        }),
      } as Response);

      render(<FeaturedProducts />);
      
      await waitFor(() => {
        expect(screen.getByText('BETA')).toBeInTheDocument();
        expect(screen.getByText('🚀 Revolutionary new functionality')).toBeInTheDocument();
      });
    });
  });
});
