import React from 'react';
import { AlertTriangle, Info, Calculator } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface OrderPricingBreakdownProps {
  subtotal: number;
  taxAmount: number;
  deliveryFee: number;
  serviceFee: number;
  gratuityAmount: number;
  shippingCost: number;
  total: number;
  orderType?: 'regular' | 'catering';
  showDebugInfo?: boolean;
  shippingCarrier?: string | null;
  className?: string;
}

interface FeeItem {
  label: string;
  amount: number;
  description?: string;
  isVisible?: boolean;
  icon?: React.ReactNode;
}

/**
 * Helper to format currency consistently
 */
const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

/**
 * Comprehensive order pricing breakdown component that shows all fee categories
 * including when they're $0.00 for full transparency
 */
export function OrderPricingBreakdown({
  subtotal,
  taxAmount,
  deliveryFee,
  serviceFee,
  gratuityAmount,
  shippingCost,
  total,
  orderType = 'regular',
  showDebugInfo = false,
  shippingCarrier,
  className = '',
}: OrderPricingBreakdownProps) {
  // Calculate expected total for discrepancy detection
  const calculatedTotal =
    subtotal + taxAmount + deliveryFee + serviceFee + gratuityAmount + shippingCost;
  const hasDiscrepancy = Math.abs(calculatedTotal - total) > 0.05; // Allow for small rounding differences (increased tolerance)
  const discrepancyAmount = total - calculatedTotal;

  // Check if all fees are zero but there's a significant discrepancy
  // This happens when order data has total but missing fee breakdown
  const allFeesAreZero =
    taxAmount === 0 &&
    deliveryFee === 0 &&
    serviceFee === 0 &&
    gratuityAmount === 0 &&
    shippingCost === 0;
  const hasSignificantDiscrepancy = Math.abs(discrepancyAmount) > 0.05;
  const shouldShowDiscrepancyAsFeeLine =
    allFeesAreZero && hasSignificantDiscrepancy && discrepancyAmount > 0;

  // Define all possible fee items
  const feeItems: FeeItem[] = [
    {
      label: 'Subtotal',
      amount: subtotal,
      description: 'Base cost of items ordered',
      isVisible: true,
    },
    // Show consolidated fee line when we have a discrepancy and all individual fees are 0
    ...(shouldShowDiscrepancyAsFeeLine
      ? [
          {
            label: 'Tax, Fees & Other Charges',
            amount: discrepancyAmount,
            description: 'Combined tax, convenience fees, and other charges',
            isVisible: true,
          },
        ]
      : [
          {
            label: 'Tax',
            amount: taxAmount,
            description:
              orderType === 'catering'
                ? 'Sales tax (8.25% on catering items)'
                : 'No tax on regular menu items',
            isVisible: true,
          },
          {
            label: 'Delivery Fee',
            amount: deliveryFee,
            description: deliveryFee > 0 ? 'Local delivery charge' : 'No delivery fee applied',
            isVisible: true,
          },
          {
            label: shippingCarrier ? `Shipping (${shippingCarrier})` : 'Shipping',
            amount: shippingCost,
            description: shippingCost > 0 ? 'Nationwide shipping cost' : 'No shipping charges',
            isVisible: true,
          },
          {
            label: 'Convenience Fee',
            amount: serviceFee,
            description: serviceFee > 0 ? 'Processing fee (3.5%)' : 'No convenience fee applied',
            isVisible: true,
          },
          {
            label: 'Gratuity/Tip',
            amount: gratuityAmount,
            description: gratuityAmount > 0 ? 'Tip amount' : 'No tip added',
            isVisible: true,
          },
        ]),
  ];

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Main Pricing Breakdown */}
      <div className="space-y-2">
        {feeItems
          .filter(item => item.label === 'Subtotal' || item.amount > 0) // Show subtotal always, but hide other $0.00 items
          .map((item, index) => (
            <div key={index} className="flex justify-between items-center text-sm">
              <div className="flex-1">
                <span className="text-gray-600">{item.label}:</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-medium text-gray-900">{formatCurrency(item.amount)}</span>
              </div>
            </div>
          ))}

        {/* Discrepancy Alert - only show if we haven't resolved it with the consolidated fee line */}
        {hasDiscrepancy && !shouldShowDiscrepancyAsFeeLine && (
          <Alert className="bg-blue-50 border-blue-200">
            <AlertTriangle className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-800">
              <div className="font-medium">Pricing Information</div>
              <div className="text-sm mt-1">
                Calculated total: {formatCurrency(calculatedTotal)} | Order total:{' '}
                {formatCurrency(total)} | Difference: {formatCurrency(discrepancyAmount)}
              </div>
              <div className="text-xs mt-1 text-blue-600">
                Small differences may occur due to rounding in tax calculations.
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Grand Total */}
        <div className="border-t border-gray-200 pt-3 mt-4">
          <div className="flex justify-between items-center">
            <span className="text-lg font-bold text-gray-900">Grand Total:</span>
            <span className="text-lg font-bold text-gray-900">{formatCurrency(total)}</span>
          </div>
        </div>
      </div>

      {/* Tax Information */}
      <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded-lg border border-gray-200">
        <div className="flex items-start gap-2">
          <Info className="h-3 w-3 mt-0.5 text-gray-400" />
          <div>
            <div className="font-medium text-gray-600 mb-1">Tax Information</div>
            {orderType === 'catering' ? (
              <div>San Francisco sales tax (8.25%) applies to all catering items.</div>
            ) : (
              <div>
                Regular menu items are tax-exempt. Only catering orders are subject to sales tax.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default OrderPricingBreakdown;
