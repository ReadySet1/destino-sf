import React from 'react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Truck, Store, HomeIcon } from 'lucide-react';

export type FulfillmentMethod = 'pickup' | 'delivery' | 'shipping';

interface FulfillmentSelectorProps {
  selectedMethod: FulfillmentMethod;
  onChange: (method: FulfillmentMethod) => void;
  className?: string;
}

export function FulfillmentSelector({
  selectedMethod,
  onChange,
  className = '',
}: FulfillmentSelectorProps) {
  return (
    <div className={`space-y-4 ${className}`}>
      <h3 className="text-lg font-medium">How would you like to receive your order?</h3>
      
      <RadioGroup
        value={selectedMethod}
        onValueChange={(value) => onChange(value as FulfillmentMethod)}
        className="grid grid-cols-1 gap-4 sm:grid-cols-3"
      >
        <div className={`relative flex items-center space-x-2 rounded-lg border p-4 ${
          selectedMethod === 'pickup' ? 'border-primary bg-primary/5' : 'border-border'
        }`}>
          <RadioGroupItem value="pickup" id="pickup" className="absolute right-4 top-4" />
          <Store className="h-5 w-5 text-primary" />
          <Label htmlFor="pickup" className="flex-1 cursor-pointer">
            <div className="font-medium">Pickup</div>
            <div className="text-sm text-muted-foreground">
              Collect your order from our store
            </div>
          </Label>
        </div>

        <div className={`relative flex items-center space-x-2 rounded-lg border p-4 ${
          selectedMethod === 'delivery' ? 'border-primary bg-primary/5' : 'border-border'
        }`}>
          <RadioGroupItem value="delivery" id="delivery" className="absolute right-4 top-4" />
          <HomeIcon className="h-5 w-5 text-primary" />
          <Label htmlFor="delivery" className="flex-1 cursor-pointer">
            <div className="font-medium">Local Delivery</div>
            <div className="text-sm text-muted-foreground">
              Same-day delivery to your door
            </div>
          </Label>
        </div>

        <div className={`relative flex items-center space-x-2 rounded-lg border p-4 ${
          selectedMethod === 'shipping' ? 'border-primary bg-primary/5' : 'border-border'
        }`}>
          <RadioGroupItem value="shipping" id="shipping" className="absolute right-4 top-4" />
          <Truck className="h-5 w-5 text-primary" />
          <Label htmlFor="shipping" className="flex-1 cursor-pointer">
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