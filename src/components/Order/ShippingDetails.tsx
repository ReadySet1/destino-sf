import React from 'react';
import { Label } from "../ui/label";
import { Textarea } from '../ui/textarea';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "../ui/select";

interface ShippingDetailsProps {
  shippingAddress: string;
  shippingMethod: string;
  shippingNotes: string;
  onShippingAddressChange: (address: string) => void;
  onShippingMethodChange: (method: string) => void;
  onShippingNotesChange: (notes: string) => void;
  disabled?: boolean;
}

const SHIPPING_METHODS = [
  { id: 'standard', name: 'Standard Shipping (3-5 business days)', price: 5.99 },
  { id: 'express', name: 'Express Shipping (1-2 business days)', price: 12.99 },
  { id: 'priority', name: 'Priority Shipping (Next day delivery)', price: 19.99 },
];

const ShippingDetails: React.FC<ShippingDetailsProps> = ({
  shippingAddress,
  shippingMethod,
  shippingNotes,
  onShippingAddressChange,
  onShippingMethodChange,
  onShippingNotesChange,
  disabled = false,
}) => {
  return (
    <div className="space-y-4">
      <h3 className="text-base font-medium">Shipping Details</h3>
      <p className="text-sm text-muted-foreground mb-4">
        We ship nationwide. Please provide your shipping information below.
      </p>
      
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="shippingAddress">Shipping Address</Label>
          <Textarea
            id="shippingAddress"
            placeholder="Enter your full address including street, apt/unit, city, state, zip code"
            value={shippingAddress}
            onChange={(e) => onShippingAddressChange(e.target.value)}
            disabled={disabled}
            className="min-h-[80px]"
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="shippingMethod">Shipping Method</Label>
          <Select
            value={shippingMethod}
            onValueChange={onShippingMethodChange}
            disabled={disabled}
          >
            <SelectTrigger id="shippingMethod" className="w-full">
              <SelectValue placeholder="Select shipping method" />
            </SelectTrigger>
            <SelectContent>
              {SHIPPING_METHODS.map((method) => (
                <SelectItem key={method.id} value={method.id}>
                  {method.name} (${method.price.toFixed(2)})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="shippingNotes">Shipping Notes (Optional)</Label>
          <Textarea
            id="shippingNotes"
            placeholder="Add any special instructions for delivery (leave at door, call before delivery, etc.)"
            value={shippingNotes}
            onChange={(e) => onShippingNotesChange(e.target.value)}
            disabled={disabled}
          />
        </div>
      </div>
    </div>
  );
};

export default ShippingDetails; 