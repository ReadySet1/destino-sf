import React from 'react';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import { Label } from '../ui/label';
import { Card } from '../ui/card';
import { Truck, Store, Package } from 'lucide-react';

export type FulfillmentMethod = 'pickup' | 'delivery' | 'shipping';

interface FulfillmentSelectorProps {
  selectedMethod: FulfillmentMethod;
  onMethodChange: (method: FulfillmentMethod) => void;
  disabled?: boolean;
}

const FulfillmentSelector: React.FC<FulfillmentSelectorProps> = ({
  selectedMethod,
  onMethodChange,
  disabled = false,
}) => {
  return (
    <div className="space-y-4">
      <h3 className="text-base font-medium">How would you like to receive your order?</h3>

      <RadioGroup
        value={selectedMethod}
        onValueChange={value => onMethodChange(value as FulfillmentMethod)}
        className="grid grid-cols-1 md:grid-cols-3 gap-4"
        disabled={disabled}
      >
        <Card
          className={`relative p-4 cursor-pointer border-2 ${selectedMethod === 'pickup' ? 'border-primary' : 'border-border'}`}
        >
          <RadioGroupItem value="pickup" id="pickup" className="absolute right-4 top-4" />
          <div className="flex flex-col items-center text-center p-2">
            <Store className="h-8 w-8 mb-2 text-primary" />
            <Label htmlFor="pickup" className="font-medium">
              Pickup
            </Label>
            <p className="text-sm text-muted-foreground mt-1">
              Pick up your order at our store in San Francisco
            </p>
            <p className="text-sm font-medium mt-2">Free</p>
          </div>
        </Card>

        <Card
          className={`relative p-4 cursor-pointer border-2 ${selectedMethod === 'delivery' ? 'border-primary' : 'border-border'}`}
        >
          <RadioGroupItem value="delivery" id="delivery" className="absolute right-4 top-4" />
          <div className="flex flex-col items-center text-center p-2">
            <Truck className="h-8 w-8 mb-2 text-primary" />
            <Label htmlFor="delivery" className="font-medium">
              Local Delivery
            </Label>
            <p className="text-sm text-muted-foreground mt-1">Delivery within San Francisco</p>
            <p className="text-sm font-medium mt-2">$8.99</p>
          </div>
        </Card>

        <Card
          className={`relative p-4 cursor-pointer border-2 ${selectedMethod === 'shipping' ? 'border-primary' : 'border-border'}`}
        >
          <RadioGroupItem value="shipping" id="shipping" className="absolute right-4 top-4" />
          <div className="flex flex-col items-center text-center p-2">
            <Package className="h-8 w-8 mb-2 text-primary" />
            <Label htmlFor="shipping" className="font-medium">
              Shipping
            </Label>
            <p className="text-sm text-muted-foreground mt-1">Ship to your address nationwide</p>
            <p className="text-sm font-medium mt-2">From $5.99</p>
          </div>
        </Card>
      </RadioGroup>
    </div>
  );
};

export default FulfillmentSelector;
