# Master Fix Plan: Calendar Month Display Issue

## 🎯 Feature/Fix Overview

**Name**: Calendar Month Display Rendering Fix

**Type**: Bug Fix

**Priority**: High

**Estimated Complexity**: Small (1-2 days)

**Sprint/Milestone**: Current Sprint - UI/UX Critical Fixes

### Problem Statement
The calendar component in the Availability Management page is displaying corrupted month text, showing fragmented characters instead of proper month names. This affects the date picker functionality in the availability rule creation form.

### Success Criteria
- [ ] Calendar displays proper month names (e.g., "December 2024")
- [ ] Date selection works correctly without visual artifacts
- [ ] All date pickers throughout the application function properly
- [ ] No console errors related to date formatting

### Dependencies
- **Blocked by**: None
- **Blocks**: Availability rule creation workflow
- **Related PRs/Issues**: N/A

---

## 📋 Planning Phase

### 1. Code Structure & References

#### Affected Files
```tsx
src/
├── components/
│   ├── ui/
│   │   └── calendar.tsx                    // Main calendar component
│   └── admin/
│       └── availability/
│           └── AvailabilityForm.tsx        // Form using the calendar
├── lib/
│   └── slug.ts                            // Utility import (check cn function)
└── app/
    └── (dashboard)/
        └── admin/
            └── products/
                └── availability/
                    └── page.tsx            // Main page with the issue
```

### 2. Root Cause Analysis

The issue appears to be related to:

1. **Locale Configuration Mismatch**: The calendar is importing `enUS` from `date-fns/locale` but there might be a version compatibility issue
2. **date-fns v4.x Breaking Changes**: date-fns v4 introduced significant changes in locale handling
3. **react-day-picker Integration**: The DayPicker component might not be properly configured for date-fns v4

### 3. Technical Solution

#### Fix Option 1: Update Locale Import (Recommended)
```tsx
// components/ui/calendar.tsx
// Update the import to use the new date-fns v4 locale structure
import { enUS } from 'date-fns/locale/en-US';

// OR if the above doesn't work, try:
import enUS from 'date-fns/locale/en-US';
```

#### Fix Option 2: Update Calendar Component Implementation
```tsx
// components/ui/calendar.tsx
'use client';

import * as React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { DayPicker } from 'react-day-picker';
import { format } from 'date-fns';
import { enUS } from 'date-fns/locale/en-US';

import { cn } from '@/lib/utils'; // Fixed import path
import { buttonVariants } from '@/components/ui/button';

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

function Calendar({ 
  className, 
  classNames, 
  showOutsideDays = true, 
  ...props 
}: CalendarProps) {
  return (
    <DayPicker
      locale={enUS}
      showOutsideDays={showOutsideDays}
      className={cn('p-3 relative bg-background border-0', className)}
      classNames={{
        months: 'flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0',
        month: 'space-y-4',
        caption: 'flex justify-center pt-1 relative items-center',
        caption_label: 'text-sm font-medium',
        nav: 'space-x-1 flex items-center',
        nav_button: cn(
          buttonVariants({ variant: 'outline' }),
          'h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100'
        ),
        nav_button_previous: 'absolute left-1',
        nav_button_next: 'absolute right-1',
        table: 'w-full border-collapse space-y-1',
        head_row: 'flex',
        head_cell: 'text-muted-foreground rounded-md w-9 font-normal text-[0.8rem]',
        row: 'flex w-full mt-2',
        cell: 'h-9 w-9 text-center text-sm p-0 relative [&:has([aria-selected].day-range-end)]:rounded-r-md [&:has([aria-selected].day-outside)]:bg-accent/50 [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20',
        day: cn(
          buttonVariants({ variant: 'ghost' }),
          'h-9 w-9 p-0 font-normal aria-selected:opacity-100'
        ),
        day_range_end: 'day-range-end',
        day_selected:
          'bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground',
        day_today: 'bg-accent text-accent-foreground',
        day_outside:
          'day-outside text-muted-foreground aria-selected:bg-accent/50 aria-selected:text-muted-foreground',
        day_disabled: 'text-muted-foreground opacity-50',
        day_range_middle: 'aria-selected:bg-accent aria-selected:text-accent-foreground',
        day_hidden: 'invisible',
        ...classNames,
      }}
      components={{
        IconLeft: ({ ...props }) => <ChevronLeft className="h-4 w-4" />,
        IconRight: ({ ...props }) => <ChevronRight className="h-4 w-4" />,
      }}
      formatters={{
        // Add custom formatters for date-fns v4 compatibility
        formatCaption: (date, options) => {
          return format(date, 'LLLL yyyy', { locale: options?.locale });
        },
      }}
      {...props}
    />
  );
}
Calendar.displayName = 'Calendar';

export { Calendar };
```

#### Fix Option 3: Downgrade to Compatible Versions (Quick Fix)
```json
// package.json
{
  "dependencies": {
    "date-fns": "^3.6.0",  // Downgrade from 4.1.0
    "react-day-picker": "8.10.1"  // Keep current version
  }
}
```

---

## 🧪 Testing Strategy

### Unit Tests
```tsx
// components/ui/__tests__/calendar.test.tsx
import { render, screen } from '@testing-library/react';
import { Calendar } from '../calendar';

describe('Calendar', () => {
  it('displays month names correctly', () => {
    render(<Calendar />);
    const currentMonth = new Date().toLocaleDateString('en-US', { 
      month: 'long', 
      year: 'numeric' 
    });
    expect(screen.getByText(currentMonth)).toBeInTheDocument();
  });

  it('renders without corrupted text', () => {
    const { container } = render(<Calendar />);
    const captionLabel = container.querySelector('.rdp-caption_label');
    expect(captionLabel?.textContent).toMatch(/^[A-Za-z\s0-9]+$/);
  });
});
```

### Integration Tests
```tsx
// Test the calendar within AvailabilityForm
describe('AvailabilityForm Calendar Integration', () => {
  it('allows date selection without visual artifacts', async () => {
    render(<AvailabilityForm productId="test-123" />);
    
    const dateButton = screen.getByText('Select start date');
    await userEvent.click(dateButton);
    
    // Calendar should open with proper month display
    expect(screen.getByRole('grid')).toBeInTheDocument();
    expect(screen.queryByText(/[^\w\s]/)).not.toBeInTheDocument();
  });
});
```

### Manual Testing Checklist
- [ ] Open Availability Management page
- [ ] Click "Create Rule" button
- [ ] Click on date picker fields
- [ ] Verify month names display correctly
- [ ] Navigate between months using arrows
- [ ] Select dates successfully
- [ ] Test in different browsers (Chrome, Firefox, Safari)

---

## 🔧 Implementation Steps

### Step 1: Debug Current Issue
```tsx
// Add debugging to calendar.tsx temporarily
console.log('Locale object:', enUS);
console.log('DayPicker version:', DayPicker.version);
```

### Step 2: Apply Fix
1. Update the locale import in `calendar.tsx`
2. Fix the incorrect import path (`@/lib/slug` → `@/lib/utils`)
3. Add formatters if needed for date-fns v4

### Step 3: Update Related Components
```tsx
// Update AvailabilityForm.tsx date formatting
import { format } from 'date-fns';
import { enUS } from 'date-fns/locale/en-US';

// Use the locale consistently
format(field.value, 'PPP', { locale: enUS })
```

### Step 4: Verify All Date Pickers
Check these locations for similar issues:
- Pre-order expected delivery date picker
- Seasonal configuration date inputs
- Any other date selection components

---

## 🚀 Deployment & Rollback

### Pre-Deployment Checklist
- [ ] All calendar instances tested locally
- [ ] No console errors or warnings
- [ ] Cross-browser testing completed
- [ ] Unit tests passing
- [ ] Visual regression tests (if applicable)

### Rollback Strategy
If the fix causes issues:
1. Revert the calendar.tsx changes
2. Pin date-fns to previous working version
3. Clear Next.js cache: `rm -rf .next`
4. Rebuild: `pnpm build`

---

## 📊 Performance Considerations

### Bundle Size Impact
- Monitor bundle size changes after fix
- Consider lazy loading calendar component if not already implemented

### Optimization Opportunities
```tsx
// Lazy load the calendar for better performance
const Calendar = dynamic(() => import('@/components/ui/calendar'), {
  ssr: false,
  loading: () => <div className="h-[300px] animate-pulse bg-muted rounded" />
});
```

---

## 🎨 UI/UX Considerations

### Visual Consistency
- Ensure calendar styling matches the design system
- Verify dark mode compatibility
- Check mobile responsiveness

### Accessibility
- [ ] Keyboard navigation works properly
- [ ] Screen reader announces dates correctly
- [ ] Focus indicators are visible
- [ ] ARIA labels are present

---

## 📝 Documentation Updates

### Code Comments
```tsx
// Add version compatibility note
/**
 * Calendar component using react-day-picker v8 with date-fns v4
 * Note: Locale import must use the full path for date-fns v4
 * @see https://date-fns.org/v4.0.0/docs/Upgrade-Guide
 */
```

### README Update
Add to troubleshooting section:
```markdown
## Troubleshooting

### Calendar Display Issues
If month names appear corrupted:
1. Check date-fns version compatibility
2. Verify locale imports use correct v4 syntax
3. Clear Next.js cache and rebuild
```

---

## ✅ Final Verification

### Success Metrics
- Zero rendering artifacts in calendar
- All date pickers functional
- No performance degradation
- No new TypeScript errors

### Post-Fix Monitoring
- Monitor error tracking (Sentry) for calendar-related issues
- Check user feedback for date selection problems
- Verify no regression in other date-dependent features

---

## 🔍 Quick Fix Summary

**Immediate Action Required:**
1. Update `src/components/ui/calendar.tsx`:
   - Fix import: `import { enUS } from 'date-fns/locale/en-US';`
   - Fix utils import: `import { cn } from '@/lib/utils';`
2. Test the calendar in the Availability Management page
3. If issues persist, consider downgrading date-fns to v3.6.0

**Estimated Time:** 1-2 hours for fix and testing