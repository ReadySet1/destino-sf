/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { FeaturedProducts } from '@/components/Marketing/FeaturedProducts';
import { mockActiveSpotlightPicks } from '@/__tests__/mocks/spotlight';
import { SpotlightPick } from '@/types/spotlight';

// Mock fetch globally
const mockFetch = jest.fn() as jest.MockedFunction<typeof fetch>;
global.fetch = mockFetch;

describe.skip('FeaturedProducts Component', () => {
  beforeEach(() => {
    // Reset mocks before each test
    mockFetch.mockClear();
  });

  it('should display loading state initially', () => {
    mockFetch.mockImplementation(() => new Promise(() => {})); // Never resolves
    render(<FeaturedProducts />);
    expect(screen.getByText('Loading our featured products...')).toBeInTheDocument();
  });

  it('should display products after successful fetch', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        items: mockActiveSpotlightPicks,
        count: mockActiveSpotlightPicks.length,
      }),
    } as Response);

    render(<FeaturedProducts />);
    await waitFor(() => {
      expect(screen.queryByText('Loading our featured products...')).not.toBeInTheDocument();
    });

    // Check that products are displayed
    mockActiveSpotlightPicks.forEach((pick: SpotlightPick) => {
      if (pick.product?.name) {
        expect(screen.getByText(pick.product.name)).toBeInTheDocument();
      }
    });
  });

  it('should display an empty state when no products are featured', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        items: [],
        count: 0,
      }),
    } as Response);

    render(<FeaturedProducts />);

    await waitFor(() => {
      expect(screen.queryByText('Loading our featured products...')).not.toBeInTheDocument();
    });

    expect(screen.getByText('Check back soon for our featured products!')).toBeInTheDocument();
  });

  it('should handle API errors gracefully', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({
        success: false,
        error: 'Server error',
      }),
    } as Response);

    render(<FeaturedProducts />);

    await waitFor(() => {
      expect(screen.queryByText('Loading our featured products...')).not.toBeInTheDocument();
    });

    // Since the component doesn't display error messages, it shows empty state
    expect(screen.getByText('Check back soon for our featured products!')).toBeInTheDocument();
  });
});
