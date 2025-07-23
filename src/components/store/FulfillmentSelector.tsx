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
    <div className={`mb-8 flex flex-col gap-2 ${className}`}>
      <h3 className="text-lg font-medium mb-1">How would you like to receive your order?</h3>
      <RadioGroup
        value={selectedMethod}
        onValueChange={value => onSelectMethod(value as FulfillmentMethod)}
        className="fulfillment-options grid grid-cols-1 gap-4 sm:grid-cols-3"
      >
        <div
          className={`fulfillment-option relative flex flex-col justify-between items-start min-h-[120px] h-full w-full space-y-2 rounded-xl border p-5 transition-colors duration-150 cursor-pointer shadow-sm focus-within:ring-2 focus-within:ring-primary/60 hover:border-primary/60 ${
            selectedMethod === 'pickup'
              ? 'border-primary bg-primary/5 ring-2 ring-primary/40'
              : 'border-border bg-white'
          }`}
        >
          <RadioGroupItem value="pickup" id="pickup" className="absolute right-4 top-4" />
          <Store className="h-5 w-5 text-primary" />
          <Label htmlFor="pickup" className="flex-1 cursor-pointer">
            <div className="font-medium">Pickup</div>
            <div className="text-sm text-muted-foreground">Collect your order from our store</div>
          </Label>
        </div>

        <div
          className={`fulfillment-option relative flex flex-col justify-between items-start min-h-[120px] h-full w-full space-y-2 rounded-xl border p-5 transition-colors duration-150 cursor-pointer shadow-sm focus-within:ring-2 focus-within:ring-primary/60 hover:border-primary/60 ${
            selectedMethod === 'local_delivery'
              ? 'border-primary bg-primary/5 ring-2 ring-primary/40'
              : 'border-border bg-white'
          }`}
        >
          <RadioGroupItem
            value="local_delivery"
            id="local_delivery"
            className="absolute right-4 top-4"
          />
          <HomeIcon className="h-5 w-5 text-primary" />
          <Label htmlFor="local_delivery" className="flex-1 cursor-pointer">
            <div className="font-medium">Local Delivery</div>
            <div className="text-sm text-muted-foreground">Same-day delivery to your door</div>
          </Label>
        </div>

        <div
          className={`fulfillment-option relative flex flex-col justify-between items-start min-h-[120px] h-full w-full space-y-2 rounded-xl border p-5 transition-colors duration-150 cursor-pointer shadow-sm focus-within:ring-2 focus-within:ring-primary/60 hover:border-primary/60 ${
            selectedMethod === 'nationwide_shipping'
              ? 'border-primary bg-primary/5 ring-2 ring-primary/40'
              : 'border-border bg-white'
          }`}
        >
          <RadioGroupItem
            value="nationwide_shipping"
            id="nationwide_shipping"
            className="absolute right-4 top-4"
          />
          <Truck className="h-5 w-5 text-primary" />
          <Label htmlFor="nationwide_shipping" className="flex-1 cursor-pointer">
            <div className="font-medium">Shipping</div>
            <div className="text-sm text-muted-foreground">
              Standard shipping (3-5 business days)
            </div>
          </Label>
        </div>
      </RadioGroup>
    </div>
  );
}
