import React from 'react';
import { Card, CardContent } from '@/components/ui/card';

interface DietaryLegendProps {
  className?: string;
}

const DietaryLegend: React.FC<DietaryLegendProps> = ({ className = '' }) => {
  return (
    <Card className={`bg-gray-50 border-gray-200 shadow-sm ${className}`}>
      <CardContent className="py-6 px-8">
        <div className="flex flex-wrap items-center gap-8 justify-center text-base text-gray-600">
          <span className="font-semibold text-gray-800 text-lg">Dietary Indicators:</span>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center justify-center w-8 h-8 bg-green-100 text-green-700 text-sm font-bold rounded-md border border-green-200">
              GF
            </span>
            <span className="font-medium">Gluten Free</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center justify-center w-8 h-8 bg-orange-100 text-orange-700 text-sm font-bold rounded-md border border-orange-200">
              VG
            </span>
            <span className="font-medium">Vegetarian</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center justify-center w-8 h-8 bg-blue-100 text-blue-700 text-sm font-bold rounded-md border border-blue-200">
              V
            </span>
            <span className="font-medium">Vegan</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default DietaryLegend;
