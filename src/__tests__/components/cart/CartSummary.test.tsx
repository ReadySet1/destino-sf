import React from 'react';
import { render, screen } from '@testing-library/react';
import { CartSummary, CartSummaryProps } from '@/components/Store/CartSummary';

describe('CartSummary', () => {
  const defaultProps: CartSummaryProps = {
    subtotal: 100,
    totalItems: 3,
    cartType: 'regular'
  };

  describe('Cart total calculations', () => {
    it('should calculate tax correctly with default tax rate (8.25%)', () => {
      render(<CartSummary {...defaultProps} />);
      
      // Tax should be 100 * 0.0825 = $8.25
      expect(screen.getByText('$8.25')).toBeInTheDocument();
    });

    it('should calculate total correctly (subtotal + tax)', () => {
      render(<CartSummary {...defaultProps} />);
      
      // Total should be 100 + 8.25 = $108.25
      expect(screen.getByText('$108.25')).toBeInTheDocument();
    });

    it('should handle zero subtotal correctly', () => {
      render(<CartSummary {...defaultProps} subtotal={0} totalItems={0} />);
      
      expect(screen.getByText('Subtotal (0 items)')).toBeInTheDocument();
      // Tax row should show $0.00
      const taxElements = screen.getAllByText('$0.00');
      expect(taxElements).toHaveLength(3); // subtotal, tax, and total
    });

    it('should handle decimal subtotals correctly', () => {
      render(<CartSummary {...defaultProps} subtotal={25.50} totalItems={2} />);
      
      // Tax should be 25.50 * 0.0825 = $2.10 (rounded)
      expect(screen.getByText('$2.10')).toBeInTheDocument();
      // Total should be 25.50 + 2.10 = $27.60
      expect(screen.getByText('$27.60')).toBeInTheDocument();
    });

    it('should calculate correctly with large amounts', () => {
      render(<CartSummary {...defaultProps} subtotal={1000} totalItems={10} />);
      
      // Tax should be 1000 * 0.0825 = $82.50
      expect(screen.getByText('$82.50')).toBeInTheDocument();
      // Total should be 1000 + 82.50 = $1,082.50
      expect(screen.getByText('$1,082.50')).toBeInTheDocument();
    });
  });

  describe('Display formatting', () => {
    it('should display subtotal with correct item count', () => {
      render(<CartSummary {...defaultProps} totalItems={5} />);
      
      expect(screen.getByText('Subtotal (5 items)')).toBeInTheDocument();
    });

    it('should display singular item correctly', () => {
      render(<CartSummary {...defaultProps} totalItems={1} />);
      
      expect(screen.getByText('Subtotal (1 items)')).toBeInTheDocument();
    });

    it('should display tax row', () => {
      render(<CartSummary {...defaultProps} />);
      
      expect(screen.getByText('Tax')).toBeInTheDocument();
    });

    it('should display total row with bold styling', () => {
      render(<CartSummary {...defaultProps} />);
      
      const totalElement = screen.getByText('Total').closest('div');
      expect(totalElement).toHaveClass('font-bold');
    });

    it('should show border separator above total', () => {
      render(<CartSummary {...defaultProps} />);
      
      const totalElement = screen.getByText('Total').closest('div');
      expect(totalElement).toHaveClass('border-t');
    });
  });

  describe('Cart type variations', () => {
    it('should display "Order Summary" for regular cart type', () => {
      render(<CartSummary {...defaultProps} cartType="regular" />);
      
      expect(screen.getByText('Order Summary')).toBeInTheDocument();
    });

    it('should display "Catering Summary" for catering cart type', () => {
      render(<CartSummary {...defaultProps} cartType="catering" />);
      
      expect(screen.getByText('Catering Summary')).toBeInTheDocument();
    });

    it('should apply amber styling for catering cart type', () => {
      render(<CartSummary {...defaultProps} cartType="catering" />);
      
      const container = screen.getByText('Catering Summary').closest('div');
      expect(container).toHaveClass('border-amber-200');
      
      const header = screen.getByText('Catering Summary');
      expect(header).toHaveClass('text-amber-700');
    });

    it('should use default styling for regular cart type', () => {
      render(<CartSummary {...defaultProps} cartType="regular" />);
      
      const container = screen.getByText('Order Summary').closest('div');
      expect(container).not.toHaveClass('border-amber-200');
      
      const header = screen.getByText('Order Summary');
      expect(header).not.toHaveClass('text-amber-700');
    });

    it('should default to regular cart type when not specified', () => {
      const { cartType, ...propsWithoutCartType } = defaultProps;
      render(<CartSummary {...propsWithoutCartType} />);
      
      expect(screen.getByText('Order Summary')).toBeInTheDocument();
    });
  });

  describe('Edge cases', () => {
    it('should handle negative subtotals gracefully', () => {
      render(<CartSummary {...defaultProps} subtotal={-10} totalItems={1} />);
      
      // Should still display the values, even if negative
      expect(screen.getByText('-$10.00')).toBeInTheDocument();
      // Tax should also be negative
      expect(screen.getByText('-$0.83')).toBeInTheDocument();
    });

    it('should handle very small amounts correctly', () => {
      render(<CartSummary {...defaultProps} subtotal={0.01} totalItems={1} />);
      
      const dollarElements = screen.getAllByText('$0.01');
      expect(dollarElements).toHaveLength(2); // subtotal and total
      // Tax should be 0.01 * 0.0825 = $0.00 (rounded)
      expect(screen.getByText('$0.00')).toBeInTheDocument();
    });

    it('should format large numbers with commas', () => {
      render(<CartSummary {...defaultProps} subtotal={1234.56} totalItems={1} />);
      
      expect(screen.getByText('$1,234.56')).toBeInTheDocument();
      // Tax: 1234.56 * 0.0825 = $101.85
      expect(screen.getByText('$101.85')).toBeInTheDocument();
      // Total: 1234.56 + 101.85 = $1,336.41
      expect(screen.getByText('$1,336.41')).toBeInTheDocument();
    });
  });

  describe('Component structure', () => {
    it('should have proper semantic structure', () => {
      render(<CartSummary {...defaultProps} />);
      
      // Should have a heading
      expect(screen.getByRole('heading', { level: 2 })).toBeInTheDocument();
    });

    it('should apply correct CSS classes', () => {
      render(<CartSummary {...defaultProps} />);
      
      const container = screen.getByText('Order Summary').closest('div');
      expect(container).toHaveClass('rounded-lg', 'border', 'p-4', 'bg-white', 'shadow-sm');
    });

    it('should have proper spacing between elements', () => {
      render(<CartSummary {...defaultProps} />);
      
      const summarySection = screen.getByText('Subtotal (3 items)').closest('div')?.parentElement;
      expect(summarySection).toHaveClass('space-y-1');
    });
  });
}); 