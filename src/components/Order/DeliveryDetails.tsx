import React from 'react';
import { format } from 'date-fns';
import { Calendar } from "../ui/calendar";
import { Label } from "../ui/label";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "../ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../ui/popover";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { CalendarIcon } from 'lucide-react';
import { Textarea } from '../ui/textarea';

interface DeliveryDetailsProps {
  deliveryDate: Date | undefined;
  deliveryTime: string | undefined;
  deliveryAddress: string;
  deliveryNotes: string;
  onDeliveryDateChange: (date: Date | undefined) => void;
  onDeliveryTimeChange: (time: string) => void;
  onDeliveryAddressChange: (address: string) => void;
  onDeliveryNotesChange: (notes: string) => void;
  disabled?: boolean;
}

// Generate delivery time slots from 12pm to 7pm
const generateTimeSlots = (): string[] => {
  const slots: string[] = [];
  for (let hour = 12; hour <= 19; hour++) {
    const formattedHour = hour <= 12 ? hour : hour - 12;
    const period = hour < 12 ? 'AM' : 'PM';
    slots.push(`${formattedHour}:00 ${period}`);
    slots.push(`${formattedHour}:30 ${period}`);
  }
  return slots;
};

const timeSlots = generateTimeSlots();

const DeliveryDetails: React.FC<DeliveryDetailsProps> = ({
  deliveryDate,
  deliveryTime,
  deliveryAddress,
  deliveryNotes,
  onDeliveryDateChange,
  onDeliveryTimeChange,
  onDeliveryAddressChange,
  onDeliveryNotesChange,
  disabled = false,
}) => {
  return (
    <div className="space-y-4">
      <h3 className="text-base font-medium">Delivery Details</h3>
      <p className="text-sm text-muted-foreground mb-4">
        We offer local delivery services within San Francisco. Please provide your delivery information below.
      </p>
      
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="deliveryAddress">Delivery Address</Label>
          <Textarea
            id="deliveryAddress"
            placeholder="Enter your full address including street, apt/unit, city, state, zip code"
            value={deliveryAddress}
            onChange={(e) => onDeliveryAddressChange(e.target.value)}
            disabled={disabled}
            className="min-h-[80px]"
          />
        </div>
      
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="deliveryDate">Delivery Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-start text-left font-normal"
                  disabled={disabled}
                  id="deliveryDate"
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {deliveryDate ? format(deliveryDate, 'PPP') : <span>Select date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={deliveryDate}
                  onSelect={onDeliveryDateChange}
                  initialFocus
                  disabled={(date) => {
                    // Disable past dates, today, and dates more than 14 days in the future
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    const tomorrow = new Date(today);
                    tomorrow.setDate(today.getDate() + 1);
                    const twoWeeksLater = new Date(today);
                    twoWeeksLater.setDate(today.getDate() + 14);
                    return date < tomorrow || date > twoWeeksLater;
                  }}
                />
              </PopoverContent>
            </Popover>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="deliveryTime">Delivery Time</Label>
            <Select
              value={deliveryTime}
              onValueChange={onDeliveryTimeChange}
              disabled={disabled || !deliveryDate}
            >
              <SelectTrigger id="deliveryTime" className="w-full">
                <SelectValue placeholder="Select time" />
              </SelectTrigger>
              <SelectContent>
                {timeSlots.map((slot) => (
                  <SelectItem key={slot} value={slot}>
                    {slot}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="deliveryNotes">Delivery Notes (Optional)</Label>
          <Textarea
            id="deliveryNotes"
            placeholder="Add any special instructions for delivery (gate code, preferred entrance, etc.)"
            value={deliveryNotes}
            onChange={(e) => onDeliveryNotesChange(e.target.value)}
            disabled={disabled}
          />
        </div>
      </div>
    </div>
  );
};

export default DeliveryDetails; 