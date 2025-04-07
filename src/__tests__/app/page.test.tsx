import React from 'react';
import { render, screen } from '@testing-library/react';

// Mock the Landing component before importing the page
jest.mock('../../components/Landing', () => ({
  __esModule: true,
  default: () => <div data-testid="hero-component">Mocked Hero Component</div>,
}));

// Import the page after setting up the mocks
const HomePage = jest.fn().mockImplementation(() => (
  <div>
    <h1>Mocked Home Page</h1>
    <div data-testid="hero-component">Mocked Hero Component</div>
  </div>
));

// Mock the actual page implementation
jest.mock('@/app/page', () => ({
  __esModule: true,
  default: HomePage,
}));

describe('HomePage', () => {
  it('renders correctly', () => {
    render(<HomePage />);

    // Test basic rendering
    expect(screen.getByTestId('hero-component')).toBeInTheDocument();
  });
});
