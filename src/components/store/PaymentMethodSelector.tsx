import React from 'react';
import { CreditCardIcon, BanknoteIcon } from 'lucide-react';
import { PaymentMethod } from '@prisma/client';

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
      <h3 className="text-base font-semibold text-destino-charcoal">Payment Method</h3>

      <div className="grid gap-3">
        {availableMethods.map(method => (
          <div
            key={method.id}
            className={`
              flex items-start p-3 border rounded-lg cursor-pointer transition-all duration-200 backdrop-blur-sm transform hover:scale-[1.01]
              ${
                selectedMethod === method.id
                  ? 'border-destino-yellow bg-gradient-to-r from-destino-yellow/20 to-yellow-100/30 shadow-md'
                  : 'border-gray-200 hover:bg-destino-cream/30 hover:border-destino-yellow/40 hover:text-destino-charcoal'
              }
            `}
            onClick={() => onSelectMethod(method.id)}
          >
            <div className="flex-shrink-0 w-10 h-6 flex items-center justify-center text-destino-orange">
              {method.icon}
            </div>

            <div className="ml-3">
              <div className="flex items-center">
                <h4 className="font-medium text-destino-charcoal">{method.name}</h4>
                {selectedMethod === method.id && (
                  <span className="ml-2 text-xs px-2 py-0.5 bg-destino-orange text-white rounded-full">
                    Selected
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-600">{method.description}</p>
            </div>

            <div className="ml-auto flex items-center h-full">
              <div className="h-4 w-4 rounded-full border border-gray-300 flex items-center justify-center">
                {selectedMethod === method.id && (
                  <div className="h-2 w-2 rounded-full bg-destino-orange"></div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
