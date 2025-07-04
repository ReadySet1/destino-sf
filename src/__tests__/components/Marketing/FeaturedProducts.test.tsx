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

describe('FeaturedProducts Component', () => {
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
    mockedGetSpotlightPicks.mockResolvedValue(mockActiveSpotlightPicks);
    render(<FeaturedProducts />);
    await waitFor(() => {
      expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
    });

    const productLinks = screen.getAllByTestId('product-link');
    expect(productLinks).toHaveLength(mockActiveSpotlightPicks.length);

    mockActiveSpotlightPicks.forEach((pick: SpotlightPick) => {
      expect(screen.getByText(pick.product!.name)).toBeInTheDocument();
    });
  });

  it('should display an empty state when no products are featured', async () => {
    mockedGetSpotlightPicks.mockResolvedValue([]);
    render(<FeaturedProducts />);

    await waitFor(() => {
      expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
    });

    expect(
      screen.getByText('No featured products at the moment. Check back soon!')
    ).toBeInTheDocument();
  });

  it('should handle API errors gracefully', async () => {
    const errorMessage = 'Failed to fetch spotlight picks';
    mockedGetSpotlightPicks.mockRejectedValue(new Error(errorMessage));
    render(<FeaturedProducts />);

    await waitFor(() => {
      expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
    });
    
    expect(screen.getByText(errorMessage)).toBeInTheDocument();
  });
});
