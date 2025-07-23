import React from 'react';
import { CreditCardIcon, BanknoteIcon } from 'lucide-react';

// Define the PaymentMethod enum to match the one in Prisma schema
enum PaymentMethod {
  SQUARE = 'SQUARE',
  CASH = 'CASH',
}

interface PaymentMethodSelectorProps {
  selectedMethod: PaymentMethod;
  onSelectMethod: (method: PaymentMethod) => void;
  showCash?: boolean;
}

export function PaymentMethodSelector({
  selectedMethod,
  onSelectMethod,
  showCash = true,
}: PaymentMethodSelectorProps) {
  const paymentMethods = [
    {
      id: PaymentMethod.SQUARE,
      name: 'Credit Card',
      description: 'Pay securely with your credit or debit card via Square',
      icon: <CreditCardIcon className="h-5 w-5" />,
      available: true,
    },
    {
      id: PaymentMethod.CASH,
      name: 'Cash',
      description: 'Pay with cash at pickup',
      icon: <BanknoteIcon className="h-5 w-5" />,
      available: showCash,
    },
  ];

  // Filter out unavailable payment methods
  const availableMethods = paymentMethods.filter(method => method.available);

  return (
    <div className="space-y-2">
      <h3 className="text-base font-semibold">Payment Method</h3>

      <div className="grid gap-3">
        {availableMethods.map(method => (
          <div
            key={method.id}
            className={`
              flex items-start p-3 border rounded-md cursor-pointer transition-colors
              ${
                selectedMethod === method.id
                  ? 'border-blue-500 bg-blue-50 shadow-sm'
                  : 'border-gray-200 hover:bg-gray-50'
              }
            `}
            onClick={() => onSelectMethod(method.id)}
          >
            <div className="flex-shrink-0 w-10 h-6 flex items-center justify-center">
              {method.icon}
            </div>

            <div className="ml-3">
              <div className="flex items-center">
                <h4 className="font-medium">{method.name}</h4>
                {selectedMethod === method.id && (
                  <span className="ml-2 text-xs px-2 py-0.5 bg-blue-500 text-white rounded-full">
                    Selected
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-500">{method.description}</p>
            </div>

            <div className="ml-auto flex items-center h-full">
              <div className="h-4 w-4 rounded-full border border-gray-300 flex items-center justify-center">
                {selectedMethod === method.id && (
                  <div className="h-2 w-2 rounded-full bg-blue-500"></div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
