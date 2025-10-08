# DatePickerField Component

## Overview

A reusable, accessible date picker component that matches the admin design system. Uses a Popover to show/hide the calendar picker, similar to the Select component pattern.

## Location

`src/components/ui/date-picker-field.tsx`

## Features

✅ **Design System Consistency**
- Matches Input component height (`h-11`)
- Uses Popover pattern (like Select component)
- Orange highlight color (`#FF8C42`) for selected dates
- Proper spacing and typography

✅ **TypeScript Safety**
- Fully typed props with JSDoc comments
- Type-safe date handling with date-fns
- Proper generic types for React Hook Form Controller

✅ **Accessibility**
- ARIA labels support
- Keyboard navigation
- Focus management
- Screen reader friendly

✅ **Validation & Edge Cases**
- Disable past dates option
- Min/max date constraints
- Custom disabled date function
- End date must be after start date (automatic)

✅ **Integration**
- Works seamlessly with React Hook Form Controller
- Controlled and uncontrolled mode support
- Error state styling
- Timezone-aware (uses date-fns with enUS locale)

## Components

### DatePickerField

Single date picker with popover.

**Props:**

```typescript
interface DatePickerFieldProps {
  value: Date | null | undefined;
  onSelect: (date: Date | undefined) => void;
  placeholder?: string;
  disabled?: ((date: Date) => boolean) | boolean;
  minDate?: Date;
  maxDate?: Date;
  disablePastDates?: boolean;
  className?: string;
  error?: boolean;
  ariaLabel?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}
```

**Example Usage:**

```tsx
import { DatePickerField } from '@/components/ui/date-picker-field';
import { Controller } from 'react-hook-form';

// With React Hook Form
<Controller
  name="startDate"
  control={control}
  render={({ field }) => (
    <DatePickerField
      value={field.value}
      onSelect={field.onChange}
      placeholder="Select start date"
      disablePastDates
      ariaLabel="Rule start date"
    />
  )}
/>

// Standalone
<DatePickerField
  value={selectedDate}
  onSelect={setSelectedDate}
  placeholder="Pick a date"
  minDate={new Date()}
/>
```

### DateRangePickerField

Date range picker with automatic end date validation.

**Props:**

```typescript
interface DateRangePickerFieldProps {
  startDate: Date | null | undefined;
  endDate: Date | null | undefined;
  onStartDateChange: (date: Date | undefined) => void;
  onEndDateChange: (date: Date | undefined) => void;
  startPlaceholder?: string;
  endPlaceholder?: string;
  className?: string;
  errors?: {
    startDate?: boolean;
    endDate?: boolean;
  };
  disablePastDates?: boolean;
}
```

**Example Usage:**

```tsx
<DateRangePickerField
  startDate={startDate}
  endDate={endDate}
  onStartDateChange={setStartDate}
  onEndDateChange={setEndDate}
  disablePastDates={true}
  errors={{
    startDate: !!errors.startDate,
    endDate: !!errors.endDate
  }}
/>
```

## Implementation in AvailabilityForm

The calendar component has been updated in the Availability Rule Editor:

### Before (Lines 555-647)
- Always-visible inline calendars
- Took up significant vertical space
- Two large calendar sections side-by-side
- No consistent height with other inputs

### After (Lines 555-623)
- Popover-based date pickers
- Compact button trigger (h-11 height)
- Calendar shows on click
- Matches other form input patterns
- Better responsive design
- Automatic date range validation with visual feedback

## Updated Files

1. **Created:** `src/components/ui/date-picker-field.tsx`
   - New DatePickerField component
   - New DateRangePickerField component
   - Full TypeScript types
   - Comprehensive JSDoc documentation

2. **Updated:** `src/components/admin/availability/AvailabilityForm.tsx`
   - Replaced inline Calendar components with DatePickerField
   - Updated imports (removed Calendar, added DatePickerField)
   - Added date range validation in submit handler
   - Added visual validation feedback for invalid date ranges
   - Updated pre-order delivery date picker

3. **Created:** `docs/components/DatePickerField.md`
   - This documentation file

## Testing Checklist

Visit: `http://localhost:3000/admin/products/availability`

### Date Range Rule Type

- [ ] Click "Rule Type" → Select "Date Range"
- [ ] Click "Start Date" button → Calendar popover opens
- [ ] Select a date → Popover closes, date shows in button
- [ ] Click "End Date" button → Calendar opens
- [ ] Try selecting date before start date → Date should be disabled
- [ ] Select valid end date → Works correctly
- [ ] Select end date before start date → Error message shows below
- [ ] Calendar uses orange (#FF8C42) for selected dates

### Pre-Order State

- [ ] Select "Availability State" → "Pre-Order"
- [ ] Scroll to "Expected Delivery Date" field
- [ ] Click date button → Popover opens
- [ ] Try selecting yesterday → Date should be disabled (past dates)
- [ ] Select future date → Works correctly
- [ ] Selected date uses orange highlight

### Form Integration

- [ ] Fill out complete form with dates
- [ ] Submit form → Dates save correctly
- [ ] Edit existing rule → Dates load correctly
- [ ] Form validation prevents invalid date ranges

### Accessibility

- [ ] Tab through form → Date pickers receive focus
- [ ] Press Enter on date picker → Opens popover
- [ ] Navigate calendar with arrow keys
- [ ] Press Escape → Closes popover
- [ ] Screen reader announces dates correctly

### Responsive Design

- [ ] Desktop (1920px) → Two-column layout works
- [ ] Tablet (768px) → Columns stack properly
- [ ] Mobile (375px) → Single column, pickers full width
- [ ] Popover positions correctly on all screen sizes

## Design Tokens

```css
/* Button Trigger */
height: 2.75rem;           /* h-11 = 44px */
border-radius: 0.375rem;   /* rounded-md */

/* Selected Date */
background: #FF8C42;       /* Orange primary color */
color: #FFFFFF;

/* Error State */
border-color: #EF4444;     /* red-500 */
ring-color: #EF4444;

/* Popover */
z-index: 9999;
animation: fade-in, zoom-in, slide-in
```

## Migration Guide

To use this component in other admin forms:

1. **Import the component:**
   ```tsx
   import { DatePickerField } from '@/components/ui/date-picker-field';
   ```

2. **Replace existing Calendar usage:**
   ```tsx
   // Old
   <Calendar
     mode="single"
     selected={date}
     onSelect={setDate}
   />

   // New
   <DatePickerField
     value={date}
     onSelect={setDate}
     placeholder="Select date"
   />
   ```

3. **With React Hook Form:**
   ```tsx
   <Controller
     name="fieldName"
     control={control}
     render={({ field }) => (
       <DatePickerField
         value={field.value}
         onSelect={field.onChange}
         error={!!errors.fieldName}
       />
     )}
   />
   ```

## Future Enhancements

Potential improvements for future iterations:

- [ ] Date range presets ("Last 7 days", "This month", etc.)
- [ ] Time picker support for datetime fields
- [ ] Multiple date selection mode
- [ ] Custom date format display options
- [ ] i18n locale support beyond enUS
- [ ] Quick navigation (year/month dropdowns)
- [ ] Highlight special dates (holidays, etc.)
- [ ] Range selection in single component
- [ ] Integration with form validation libraries (Zod schemas)

## Related Components

- **Calendar** (`src/components/ui/calendar.tsx`) - Base calendar component using react-day-picker
- **Popover** (`src/components/ui/popover.tsx`) - Radix UI Popover primitive
- **Button** (`src/components/ui/button.tsx`) - Button component with variants
- **Input** (`src/components/ui/input.tsx`) - Text input component (height reference)

## References

- [react-day-picker Documentation](https://react-day-picker.js.org/)
- [date-fns Documentation](https://date-fns.org/)
- [Radix UI Popover](https://www.radix-ui.com/primitives/docs/components/popover)
- [React Hook Form Controller](https://react-hook-form.com/docs/usecontroller/controller)
