'use client';

import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface ChartProps {
  type: 'line' | 'bar' | 'pie';
  data: Array<Record<string, any>>;
  xAxisKey: string;
  yAxisKey: string;
  className?: string;
}

export function Chart({
  type,
  data,
  xAxisKey,
  yAxisKey,
  className,
}: ChartProps) {
  // This is a placeholder chart component
  // In a real implementation, you would use a charting library like Recharts, Chart.js, or D3
  
  return (
    <div className={cn('w-full', className)}>
      <div className="flex items-center justify-center h-full border border-dashed border-gray-300 rounded-lg">
        <div className="text-center space-y-2">
          <div className="text-sm font-medium text-gray-600">
            {type.charAt(0).toUpperCase() + type.slice(1)} Chart
          </div>
          <div className="text-xs text-gray-500">
            {data.length} data points
          </div>
          <div className="text-xs text-gray-400">
            Chart component placeholder - integrate with Recharts or similar
          </div>
        </div>
      </div>
    </div>
  );
}
