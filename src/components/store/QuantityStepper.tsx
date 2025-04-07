import { Minus, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface QuantityStepperProps {
  value: number;
  min?: number;
  max?: number;
  onChange: (value: number) => void;
}

export function QuantityStepper({ value, min = 1, max = 99, onChange }: QuantityStepperProps) {
  const handleDecrement = () => {
    if (value > min) {
      onChange(value - 1);
    }
  };

  const handleIncrement = () => {
    if (value < max) {
      onChange(value + 1);
    }
  };

  return (
    <div className="inline-flex items-center rounded-md border">
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 rounded-none border-r"
        onClick={handleDecrement}
        disabled={value <= min}
        type="button"
      >
        <Minus className="h-3 w-3" />
      </Button>

      <div className="w-10 text-center text-sm">
        <span>{value}</span>
      </div>

      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 rounded-none border-l"
        onClick={handleIncrement}
        disabled={value >= max}
        type="button"
      >
        <Plus className="h-3 w-3" />
      </Button>
    </div>
  );
}
