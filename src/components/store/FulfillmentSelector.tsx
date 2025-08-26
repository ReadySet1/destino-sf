import React from 'react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Truck, Store, HomeIcon } from 'lucide-react';

export type FulfillmentMethod = 'pickup' | 'local_delivery' | 'nationwide_shipping';

interface FulfillmentSelectorProps {
  selectedMethod: FulfillmentMethod;
  onSelectMethod: (method: FulfillmentMethod) => void;
  className?: string;
}

export function FulfillmentSelector({
  selectedMethod,
  onSelectMethod,
  className = '',
}: FulfillmentSelectorProps) {
  return (
    <div className={`mb-8 flex flex-col gap-2 bg-white/95 backdrop-blur-sm rounded-xl p-6 shadow-lg border border-destino-yellow/30 ${className}`}>
      <h3 className="text-lg font-medium mb-1 text-destino-charcoal">How would you like to receive your order?</h3>
      <RadioGroup
        value={selectedMethod}
        onValueChange={value => onSelectMethod(value as FulfillmentMethod)}
        className="fulfillment-options grid grid-cols-1 gap-4 sm:grid-cols-3"
      >
        <div
          className={`fulfillment-option relative flex flex-col justify-between items-start min-h-[120px] h-full w-full space-y-2 rounded-xl border p-5 transition-all duration-200 cursor-pointer shadow-sm focus-within:ring-2 hover:shadow-md transform hover:scale-[1.02] ${
            selectedMethod === 'pickup'
              ? 'border-destino-yellow bg-gradient-to-br from-destino-yellow/20 to-yellow-100/30 ring-2 ring-destino-yellow/40 shadow-md'
              : 'border-gray-200 bg-white/80 backdrop-blur-sm hover:border-destino-yellow/60'
          }`}
        >
          <RadioGroupItem value="pickup" id="pickup" className="absolute right-4 top-4" />
          <Store className="h-5 w-5 text-destino-orange" />
          <Label htmlFor="pickup" className="flex-1 cursor-pointer">
            <div className="font-medium text-destino-charcoal">Pickup</div>
            <div className="text-sm text-gray-600">Collect your order from our store</div>
          </Label>
        </div>

        <div
          className={`fulfillment-option relative flex flex-col justify-between items-start min-h-[120px] h-full w-full space-y-2 rounded-xl border p-5 transition-all duration-200 cursor-pointer shadow-sm focus-within:ring-2 hover:shadow-md transform hover:scale-[1.02] ${
            selectedMethod === 'local_delivery'
              ? 'border-destino-orange bg-gradient-to-br from-destino-orange/20 to-amber-100/30 ring-2 ring-destino-orange/40 shadow-md'
              : 'border-gray-200 bg-white/80 backdrop-blur-sm hover:border-destino-orange/60'
          }`}
        >
          <RadioGroupItem
            value="local_delivery"
            id="local_delivery"
            className="absolute right-4 top-4"
          />
          <HomeIcon className="h-5 w-5 text-destino-orange" />
          <Label htmlFor="local_delivery" className="flex-1 cursor-pointer">
            <div className="font-medium text-destino-charcoal">Local Delivery</div>
            <div className="text-sm text-gray-600">Same-day delivery to your door</div>
          </Label>
        </div>

        <div
          className={`fulfillment-option relative flex flex-col justify-between items-start min-h-[120px] h-full w-full space-y-2 rounded-xl border p-5 transition-all duration-200 cursor-pointer shadow-sm focus-within:ring-2 hover:shadow-md transform hover:scale-[1.02] ${
            selectedMethod === 'nationwide_shipping'
              ? 'border-blue-500 bg-gradient-to-br from-blue-100/50 to-slate-100/30 ring-2 ring-blue-400/40 shadow-md'
              : 'border-gray-200 bg-white/80 backdrop-blur-sm hover:border-blue-400/60'
          }`}
        >
          <RadioGroupItem
            value="nationwide_shipping"
            id="nationwide_shipping"
            className="absolute right-4 top-4"
          />
          <Truck className="h-5 w-5 text-blue-600" />
          <Label htmlFor="nationwide_shipping" className="flex-1 cursor-pointer">
            <div className="font-medium text-destino-charcoal">Shipping</div>
            <div className="text-sm text-gray-600">
              Standard shipping (3-5 business days)
            </div>
          </Label>
        </div>
      </RadioGroup>
    </div>
  );
}
