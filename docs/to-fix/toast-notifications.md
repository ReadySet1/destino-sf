# Master Fix Planning: Toast Notification System Unification

## 🎯 Feature/Fix Overview

**Name**: Toast Notification System Unification

**Type**: Refactor / Tech Debt

**Priority**: High

### Problem Statement

The project currently has multiple toast notification implementations creating confusion and inconsistency:
1. **Sonner** toast library (used in ProductToasts.tsx and ToastHandler.tsx)
2. **React Hot Toast** library (referenced in Toaster.tsx and use-toast.tsx)
3. **Custom Radix UI implementation** (in /components/ui/toast.tsx and /hooks/use-toast.ts)

### Success Criteria

- [x] Single, unified toast notification system across the entire application
- [x] Consistent API for triggering toasts from any component
- [x] Preserved existing functionality (success, error, loading states)
- [x] TypeScript type safety for all toast operations
- [x] Clean removal of unused dependencies and code

------

## 📋 Planning Phase

### 1. Current State Analysis

#### Existing Implementations Found

```tsx
// Implementation #1: Sonner (CURRENTLY ACTIVE)
// Location: src/app/client-layout.tsx
<Toaster richColors position="top-center" />

// Files using Sonner:
- src/app/(dashboard)/admin/products/components/ProductToasts.tsx
- src/components/auth/ToastHandler.tsx
```

```tsx
// Implementation #2: React Hot Toast (PARTIALLY IMPLEMENTED)
// Location: src/components/Toaster.tsx
import { Toaster } from 'react-hot-toast';

// Location: src/components/ui/use-toast.tsx
import toast from 'react-hot-toast';
```

```tsx
// Implementation #3: Custom Radix UI (UNUSED)
// Location: src/hooks/use-toast.ts
// Location: src/components/ui/toast.tsx
// Location: src/components/ui/toaster.tsx
// Custom implementation with @radix-ui/react-toast
```

### 2. Recommended Solution: Standardize on Sonner

**Why Sonner?**
- Already integrated in client-layout.tsx
- Modern, performant, and actively maintained
- Better TypeScript support
- Cleaner API with promise-based toasts
- Rich animation and styling options
- Already working in production code

### 3. File Structure After Unification

```tsx
src/
├── app/
│   ├── client-layout.tsx              // Keep Sonner <Toaster />
│   └── (dashboard)/admin/products/
│       └── components/
│           └── ProductToasts.tsx      // Already using Sonner ✓
├── components/
│   ├── auth/
│   │   └── ToastHandler.tsx          // Already using Sonner ✓
│   └── ui/
│       └── toast-wrapper.tsx         // NEW: Centralized toast utilities
├── hooks/
│   └── use-toast.ts                  // NEW: Unified toast hook
└── lib/
    └── toast/
        ├── index.ts                   // Export all toast utilities
        └── types.ts                   // TypeScript types for toasts
```

### 4. Files to Remove

```
❌ src/components/Toaster.tsx           // React Hot Toast wrapper
❌ src/components/ui/use-toast.tsx       // React Hot Toast hook
❌ src/components/ui/toast.tsx           // Radix UI components
❌ src/components/ui/toaster.tsx         // Radix UI provider
❌ src/hooks/use-toast.ts                // Old custom implementation
```

------

## 🧪 Implementation Steps

### Step 1: Create Unified Toast Utilities

```tsx
// src/lib/toast/types.ts
export interface ToastOptions {
  title?: string;
  description?: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export type ToastType = 'success' | 'error' | 'info' | 'warning' | 'loading';
```

```tsx
// src/lib/toast/index.ts
import { toast as sonnerToast } from 'sonner';
import type { ToastOptions, ToastType } from './types';

export const toast = {
  success: (message: string, options?: ToastOptions) => {
    return sonnerToast.success(message, {
      description: options?.description,
      duration: options?.duration ?? 3000,
      action: options?.action,
    });
  },
  
  error: (message: string, options?: ToastOptions) => {
    return sonnerToast.error(message, {
      description: options?.description,
      duration: options?.duration ?? 5000,
      action: options?.action,
    });
  },
  
  info: (message: string, options?: ToastOptions) => {
    return sonnerToast.info(message, {
      description: options?.description,
      duration: options?.duration ?? 4000,
      action: options?.action,
    });
  },
  
  warning: (message: string, options?: ToastOptions) => {
    return sonnerToast.warning(message, {
      description: options?.description,
      duration: options?.duration ?? 4000,
      action: options?.action,
    });
  },
  
  loading: (message: string) => {
    return sonnerToast.loading(message);
  },
  
  promise: <T,>(
    promise: Promise<T>,
    messages: {
      loading: string;
      success: string | ((data: T) => string);
      error: string | ((error: any) => string);
    }
  ) => {
    return sonnerToast.promise(promise, messages);
  },
  
  dismiss: (toastId?: string | number) => {
    return sonnerToast.dismiss(toastId);
  },
};

export { toast as default };
```

```tsx
// src/hooks/use-toast.ts (NEW - unified hook)
import { useCallback } from 'react';
import { toast } from '@/lib/toast';
import type { ToastOptions } from '@/lib/toast/types';

export function useToast() {
  const showToast = useCallback((
    type: 'success' | 'error' | 'info' | 'warning',
    message: string,
    options?: ToastOptions
  ) => {
    return toast[type](message, options);
  }, []);

  const showLoadingToast = useCallback((message: string) => {
    return toast.loading(message);
  }, []);

  const dismissToast = useCallback((toastId?: string | number) => {
    toast.dismiss(toastId);
  }, []);

  const promiseToast = useCallback(<T,>(
    promise: Promise<T>,
    messages: {
      loading: string;
      success: string | ((data: T) => string);
      error: string | ((error: any) => string);
    }
  ) => {
    return toast.promise(promise, messages);
  }, []);

  return {
    toast: showToast,
    loading: showLoadingToast,
    dismiss: dismissToast,
    promise: promiseToast,
    // Direct access to toast methods
    success: (message: string, options?: ToastOptions) => 
      toast.success(message, options),
    error: (message: string, options?: ToastOptions) => 
      toast.error(message, options),
    info: (message: string, options?: ToastOptions) => 
      toast.info(message, options),
    warning: (message: string, options?: ToastOptions) => 
      toast.warning(message, options),
  };
}
```

### Step 2: Update Import Statements

Search and replace all toast imports across the codebase:

```bash
# Find all files that might import toast utilities
grep -r "from 'react-hot-toast'" src/
grep -r "from '@/components/ui/toast'" src/
grep -r "from '@/components/ui/use-toast'" src/
grep -r "from '@/hooks/use-toast'" src/

# Replace with:
# import { toast } from '@/lib/toast';
# or
# import { useToast } from '@/hooks/use-toast';
```

### Step 3: Migration Examples

```tsx
// BEFORE (React Hot Toast)
import toast from 'react-hot-toast';
toast.success('Product created!');

// AFTER (Unified Sonner)
import { toast } from '@/lib/toast';
toast.success('Product created!');
```

```tsx
// BEFORE (Custom hook)
import { useToast } from '@/hooks/use-toast';
const { toast } = useToast();
toast({ title: 'Success', description: 'Action completed' });

// AFTER (Unified hook)
import { useToast } from '@/hooks/use-toast';
const { success } = useToast();
success('Success', { description: 'Action completed' });
```

### Step 4: Remove Unused Dependencies

```json
// package.json - Remove if no other usage
"react-hot-toast": "^2.5.2",  // Remove this
// Keep @radix-ui/react-toast if used elsewhere
```

```bash
# After removing from package.json
pnpm remove react-hot-toast
```

### Step 5: Testing Checklist

- [ ] Test ProductToasts.tsx with product operations
- [ ] Test ToastHandler.tsx with auth flows
- [ ] Test any Server Actions that trigger toasts
- [ ] Test error handling scenarios
- [ ] Test toast dismissal functionality
- [ ] Test promise-based toasts for async operations

------

## 🔒 Security & Performance Considerations

### Security
- [x] No XSS vulnerabilities (Sonner handles escaping)
- [x] No user input directly rendered without sanitization
- [x] Toast messages properly typed with TypeScript

### Performance
- [x] Single toast instance globally
- [x] Automatic cleanup of dismissed toasts
- [x] Debounced toast queue management
- [x] No memory leaks from event listeners

------

## 📊 Benefits of Unification

1. **Consistency**: Single API across entire application
2. **Maintainability**: One place to update toast behavior
3. **Bundle Size**: Removing unused libraries (~15-20KB savings)
4. **Developer Experience**: Clear, typed API with IntelliSense
5. **User Experience**: Consistent toast appearance and behavior

------

## 🚦 Implementation Checklist

### Pre-Development
- [ ] Backup current working implementation
- [ ] Document all files using toast notifications
- [ ] Create feature branch: `fix/unify-toast-system`

### Development Phase
- [ ] Create unified toast utilities in `/lib/toast/`
- [ ] Create new `useToast` hook
- [ ] Update existing Sonner implementations if needed
- [ ] Remove old toast implementations
- [ ] Update all import statements
- [ ] Remove unused dependencies

### Testing Phase
- [ ] Test all toast triggers
- [ ] Verify TypeScript types
- [ ] Check bundle size reduction
- [ ] Test in different browsers
- [ ] Mobile responsiveness check

### Pre-Deployment
- [ ] Code review
- [ ] Update documentation
- [ ] Clean up package.json
- [ ] Run full test suite
- [ ] Deploy to staging first

------

## 📝 MCP Commands for Implementation

```bash
# Step 1: Create new toast utilities
filesystem:create_directory path: /Users/ealanis/Development/current-projects/destino-sf/src/lib/toast

filesystem:write_file path: /Users/ealanis/Development/current-projects/destino-sf/src/lib/toast/types.ts
filesystem:write_file path: /Users/ealanis/Development/current-projects/destino-sf/src/lib/toast/index.ts

# Step 2: Create unified hook
filesystem:write_file path: /Users/ealanis/Development/current-projects/destino-sf/src/hooks/use-toast.ts

# Step 3: Remove old implementations
filesystem:move_file source: /Users/ealanis/Development/current-projects/destino-sf/src/components/Toaster.tsx destination: /Users/ealanis/Development/current-projects/destino-sf/src/components/Toaster.tsx.backup

# Step 4: Search for usage
filesystem:search_files path: /Users/ealanis/Development/current-projects/destino-sf/src pattern: "toast"

# Step 5: Update package.json
filesystem:edit_file path: /Users/ealanis/Development/current-projects/destino-sf/package.json
```

------

## 🔄 Rollback Plan

If issues arise:

1. **Immediate Rollback**: 
   - Restore backup files
   - Revert git commits
   - Re-install react-hot-toast if needed

2. **Feature Toggle Approach**:
   ```tsx
   const USE_NEW_TOAST = process.env.NEXT_PUBLIC_USE_NEW_TOAST === 'true';
   
   export const toast = USE_NEW_TOAST 
     ? newToastImplementation 
     : oldToastImplementation;
   ```

3. **Gradual Migration**:
   - Keep both systems temporarily
   - Migrate one section at a time
   - Monitor for issues before complete removal

------

## 📊 Success Metrics

- Zero toast-related errors in production
- Reduced bundle size by ~15-20KB
- Consistent toast behavior across all pages
- Improved developer feedback (easier to use)
- All existing functionality preserved