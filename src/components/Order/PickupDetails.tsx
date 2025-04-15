import React from 'react';
import { format } from 'date-fns';
import { Calendar } from '@/components/ui/calendar';
import { Label } from '@/components/ui/label';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { CalendarIcon } from 'lucide-react';

interface PickupDetailsProps {
  pickupDate: Date | undefined;
  pickupTime: string | undefined;
  onPickupDateChange: (date: Date | undefined) => void;
  onPickupTimeChange: (time: string) => void;
  disabled?: boolean;
}

// Generate pickup time slots from 10am to 7pm
const generateTimeSlots = (): string[] => {
  const slots: string[] = [];
  for (let hour = 10; hour <= 19; hour++) {
    const formattedHour = hour <= 12 ? hour : hour - 12;
    const period = hour < 12 ? 'AM' : 'PM';
    slots.push(`${formattedHour}:00 ${period}`);
    slots.push(`${formattedHour}:30 ${period}`);
  }
  return slots;
};

const timeSlots = generateTimeSlots();

const PickupDetails: React.FC<PickupDetailsProps> = ({
  pickupDate,
  pickupTime,
  onPickupDateChange,
  onPickupTimeChange,
  disabled = false,
}) => {
  return (
    <div className="space-y-4">
      <h3 className="text-base font-medium">Pickup Details</h3>
      <p className="text-sm text-muted-foreground mb-4">
        Select when you would like to pick up your order at our store.
      </p>
      
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="pickupDate">Pickup Date</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="w-full justify-start text-left font-normal"
                disabled={disabled}
                id="pickupDate"
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {pickupDate ? format(pickupDate, 'PPP') : <span>Select date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={pickupDate}
                onSelect={onPickupDateChange}
                initialFocus
                disabled={(date) => {
                  // Disable past dates and dates more than 14 days in the future
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);
                  const twoWeeksLater = new Date(today);
                  twoWeeksLater.setDate(today.getDate() + 14);
                  return date < today || date > twoWeeksLater;
                }}
              />
            </PopoverContent>
          </Popover>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="pickupTime">Pickup Time</Label>
          <Select
            value={pickupTime}
            onValueChange={onPickupTimeChange}
            disabled={disabled || !pickupDate}
          >
            <SelectTrigger id="pickupTime" className="w-full">
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
    </div>
  );
};

export default PickupDetails; 