'use client';

import * as React from 'react';
import { format } from 'date-fns';
import { enUS } from 'date-fns/locale/en-US';
import { CalendarIcon } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface DatePickerFieldProps {
  /** The selected date value */
  value: Date | null | undefined;
  /** Callback when date is selected */
  onSelect: (date: Date | undefined) => void;
  /** Placeholder text when no date is selected */
  placeholder?: string;
  /** Function to disable specific dates */
  disabled?: ((date: Date) => boolean) | boolean;
  /** Minimum selectable date */
  minDate?: Date;
  /** Maximum selectable date */
  maxDate?: Date;
  /** Disable all dates before today */
  disablePastDates?: boolean;
  /** Additional className for the button trigger */
  className?: string;
  /** Error state styling */
  error?: boolean;
  /** ARIA label for accessibility */
  ariaLabel?: string;
  /** Control the open state externally */
  open?: boolean;
  /** Callback when open state changes */
  onOpenChange?: (open: boolean) => void;
}

/**
 * DatePickerField - A consistent date picker component for admin forms
 *
 * Follows the admin design patterns:
 * - Uses Popover to show/hide calendar (matches Select component pattern)
 * - Consistent height (h-11) with other form inputs
 * - Orange highlight for selected dates
 * - Proper TypeScript types and validation
 * - Accessibility support
 *
 * @example
 * ```tsx
 * <DatePickerField
 *   value={startDate}
 *   onSelect={setStartDate}
 *   placeholder="Select start date"
 *   minDate={new Date()}
 * />
 * ```
 */
export function DatePickerField({
  value,
  onSelect,
  placeholder = 'Pick a date',
  disabled,
  minDate,
  maxDate,
  disablePastDates = false,
  className,
  error = false,
  ariaLabel,
  open,
  onOpenChange,
}: DatePickerFieldProps) {
  // Internal state for controlled/uncontrolled behavior
  const [isOpen, setIsOpen] = React.useState(false);

  // Use external control if provided, otherwise use internal state
  const isControlled = open !== undefined;
  const isPopoverOpen = isControlled ? open : isOpen;
  const setPopoverOpen = isControlled ? onOpenChange || (() => {}) : setIsOpen;

  // Get today at midnight for past date comparison
  const today = React.useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  // Build the disabled date function
  const getDisabledDate = React.useCallback((date: Date): boolean => {
    // If disabled is a boolean and true, disable all dates
    if (typeof disabled === 'boolean') {
      return disabled;
    }

    // If disabled is a function, use it
    if (typeof disabled === 'function') {
      return disabled(date);
    }

    // Disable past dates if requested
    if (disablePastDates && date < today) {
      return true;
    }

    // Apply min/max date constraints
    if (minDate && date < minDate) {
      return true;
    }
    if (maxDate && date > maxDate) {
      return true;
    }

    return false;
  }, [disabled, minDate, maxDate, disablePastDates, today]);

  return (
    <Popover open={isPopoverOpen} onOpenChange={setPopoverOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className={cn(
            // Match Input component height and styling
            'w-full h-11 justify-start text-left font-normal',
            // Placeholder styling
            !value && 'text-muted-foreground',
            // Error state styling (matches Input error state)
            error && 'border-red-500 focus-visible:ring-red-500',
            // Disabled state
            typeof disabled === 'boolean' && disabled && 'cursor-not-allowed opacity-50',
            className
          )}
          aria-label={ariaLabel || placeholder}
          disabled={typeof disabled === 'boolean' ? disabled : false}
        >
          <CalendarIcon className="mr-2 h-4 w-4 flex-shrink-0" />
          <span className="truncate">
            {value ? format(value, 'PPP', { locale: enUS }) : placeholder}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-auto p-0"
        align="start"
        side="bottom"
        sideOffset={4}
      >
        <Calendar
          mode="single"
          selected={value || undefined}
          onSelect={onSelect}
          disabled={getDisabledDate}
          initialFocus
          // Default to the selected date or today
          defaultMonth={value || undefined}
          classNames={{
            // Customize selected day to use orange color
            day_selected:
              'bg-[#FF8C42] text-white hover:bg-[#FF8C42] hover:text-white focus:bg-[#FF8C42] focus:text-white',
            // Ensure day hover states work well
            day: cn(
              'h-9 w-9 p-0 font-normal aria-selected:opacity-100',
              'hover:bg-accent hover:text-accent-foreground',
              'focus:bg-accent focus:text-accent-foreground'
            ),
          }}
        />
      </PopoverContent>
    </Popover>
  );
}

/**
 * DateRangePickerField - A date range picker for start/end dates
 *
 * Automatically ensures end date is after start date
 */
export interface DateRangePickerFieldProps {
  /** Start date value */
  startDate: Date | null | undefined;
  /** End date value */
  endDate: Date | null | undefined;
  /** Callback when start date changes */
  onStartDateChange: (date: Date | undefined) => void;
  /** Callback when end date changes */
  onEndDateChange: (date: Date | undefined) => void;
  /** Placeholder for start date */
  startPlaceholder?: string;
  /** Placeholder for end date */
  endPlaceholder?: string;
  /** Additional className */
  className?: string;
  /** Error states */
  errors?: {
    startDate?: boolean;
    endDate?: boolean;
  };
  /** Disable past dates for start date */
  disablePastDates?: boolean;
}

export function DateRangePickerField({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  startPlaceholder = 'Select start date',
  endPlaceholder = 'Select end date',
  className,
  errors,
  disablePastDates = false,
}: DateRangePickerFieldProps) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (
    <div className={cn('grid grid-cols-1 lg:grid-cols-2 gap-6', className)}>
      {/* Start Date */}
      <div className="space-y-3">
        <DatePickerField
          value={startDate}
          onSelect={onStartDateChange}
          placeholder={startPlaceholder}
          minDate={disablePastDates ? today : undefined}
          error={errors?.startDate}
          ariaLabel="Start date"
        />
      </div>

      {/* End Date */}
      <div className="space-y-3">
        <DatePickerField
          value={endDate}
          onSelect={onEndDateChange}
          placeholder={endPlaceholder}
          // End date must be after start date
          minDate={startDate || (disablePastDates ? today : undefined)}
          error={errors?.endDate}
          ariaLabel="End date"
        />
      </div>
    </div>
  );
}
