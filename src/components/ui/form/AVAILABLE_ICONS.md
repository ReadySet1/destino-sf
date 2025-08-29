# Available FormIcons

## Currently Available Icons

When using FormIcons in your admin pages, these icons are available:

### Layout & Navigation
- `FormIcons.arrowLeft` - Back/previous navigation
- `FormIcons.home` - Home/dashboard
- `FormIcons.grid` - Grid/layout view

### Actions
- `FormIcons.plus` - Add/create new items
- `FormIcons.save` - Save/submit forms
- `FormIcons.refresh` - Refresh/sync data
- `FormIcons.archive` - Archive/view archived items

### Content Types
- `FormIcons.info` - Information/details
- `FormIcons.user` - User/profile related
- `FormIcons.package` - Products/inventory
- `FormIcons.truck` - Shipping/delivery
- `FormIcons.image` - Media/images
- `FormIcons.creditCard` - Payment/billing

### States & Indicators
- `FormIcons.check` - Success/confirmation
- `FormIcons.warning` - Warnings/alerts
- `FormIcons.shield` - Security/protection

## Usage

```tsx
import { FormIcons } from '@/components/ui/form';

// In FormSection
<FormSection 
  title="User Details" 
  icon={FormIcons.user}
>

// In FormButton
<FormButton leftIcon={FormIcons.save}>
  Save Changes
</FormButton>
```

## Adding New Icons

If you need a new icon:

1. Add the Lucide React import to `src/components/ui/form/FormIcons.tsx`
2. Add the icon to the FormIcons object with `className="w-full h-full"`
3. Update this documentation
4. Clear Next.js cache: `rm -rf .next`

Example:
```tsx
// In FormIcons.tsx
import { Settings } from 'lucide-react';

export const FormIcons = {
  // ... existing icons
  settings: <Settings className="w-full h-full" />,
} as const;
```
