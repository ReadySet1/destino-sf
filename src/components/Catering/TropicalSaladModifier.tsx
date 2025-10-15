'use client';

import React from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { BoxedLunchModifier } from '@/types/catering';
import { formatPrice } from '@/lib/catering/boxed-lunch-utils';

interface TropicalSaladModifierProps {
  modifiers: BoxedLunchModifier[];
  selectedModifierId?: string;
  onSelect: (modifierId?: string) => void;
  className?: string;
}

export const TropicalSaladModifier: React.FC<TropicalSaladModifierProps> = ({
  modifiers,
  selectedModifierId,
  onSelect,
  className = '',
}) => {
  const handleValueChange = (value: string) => {
    if (value === 'none') {
      onSelect(undefined);
    } else {
      onSelect(value);
    }
  };

  return (
    <div className={`space-y-2 ${className}`}>
      <label className="text-sm font-medium text-gray-700">Add Protein (Optional)</label>

      <Select onValueChange={handleValueChange} value={selectedModifierId || 'none'}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Add protein (optional)" />
        </SelectTrigger>

        <SelectContent>
          <SelectItem value="none" className="font-medium">
            No protein
          </SelectItem>

          {modifiers.map(modifier => (
            <SelectItem
              key={modifier.id}
              value={modifier.id}
              className="flex items-center justify-between py-3"
            >
              <div className="flex items-center justify-between w-full">
                <span className="font-medium">{modifier.name}</span>
                <div className="flex items-center gap-2 ml-2">
                  <span className="text-sm font-semibold text-green-600">
                    +{formatPrice(modifier.price)}
                  </span>
                  {modifier.dietaryInfo && (
                    <Badge
                      variant="outline"
                      className="text-xs border-blue-500 text-blue-700 bg-blue-50"
                    >
                      {modifier.dietaryInfo.toUpperCase()}
                    </Badge>
                  )}
                </div>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {selectedModifierId && (
        <div className="text-xs text-gray-600 bg-gray-50 p-2 rounded">
          💡 The protein will be added to your Tropical Salad
        </div>
      )}
    </div>
  );
};

export default TropicalSaladModifier;
