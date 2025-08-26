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
    <div className="inline-flex items-center rounded-lg border border-destino-yellow/40 bg-white shadow-sm">
      <Button
        variant="ghost"
        size="icon"
        className="h-10 w-10 sm:h-8 sm:w-8 rounded-l-lg rounded-r-none border-r border-destino-yellow/40 hover:bg-destino-cream/50 hover:text-destino-charcoal touch-manipulation transition-colors"
        onClick={handleDecrement}
        disabled={value <= min}
        type="button"
        aria-label="Decrease quantity"
      >
        <Minus className="h-4 w-4 sm:h-3 sm:w-3" />
      </Button>

      <div className="w-12 sm:w-10 h-10 sm:h-8 flex items-center justify-center text-sm font-medium bg-destino-cream/30 text-destino-charcoal">
        <span>{value}</span>
      </div>

      <Button
        variant="ghost"
        size="icon"
        className="h-10 w-10 sm:h-8 sm:w-8 rounded-r-lg rounded-l-none border-l border-destino-yellow/40 hover:bg-destino-cream/50 hover:text-destino-charcoal touch-manipulation transition-colors"
        onClick={handleIncrement}
        disabled={value >= max}
        type="button"
        aria-label="Increase quantity"
      >
        <Plus className="h-4 w-4 sm:h-3 sm:w-3" />
      </Button>
    </div>
  );
}
