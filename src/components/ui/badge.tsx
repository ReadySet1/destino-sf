import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/slug';

const badgeVariants = cva(
  'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2',
  {
    variants: {
      variant: {
        default:
          'bg-indigo-100 text-indigo-800 hover:bg-indigo-200 focus:ring-indigo-500',
        primary:
          'bg-blue-100 text-blue-800 hover:bg-blue-200 focus:ring-blue-500',
        secondary:
          'bg-purple-100 text-purple-800 hover:bg-purple-200 focus:ring-purple-500',
        success:
          'bg-green-100 text-green-800 hover:bg-green-200 focus:ring-green-500',
        warning:
          'bg-yellow-100 text-yellow-800 hover:bg-yellow-200 focus:ring-yellow-500',
        danger:
          'bg-red-100 text-red-800 hover:bg-red-200 focus:ring-red-500',
        outline:
          'text-gray-900 border border-gray-200 hover:bg-gray-100 focus:ring-gray-500',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
