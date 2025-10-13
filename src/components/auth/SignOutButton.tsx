'use client';

import { useTransition } from 'react';
import { signOutAction } from '@/app/actions/auth';

interface SignOutButtonProps {
  children: React.ReactNode;
  className?: string;
  onSignOutStart?: () => void;
}

/**
 * Client-side sign-out button that clears localStorage before signing out
 * This prevents user data leakage between different user sessions
 */
export function SignOutButton({ children, className, onSignOutStart }: SignOutButtonProps) {
  const [isPending, startTransition] = useTransition();

  const handleSignOut = async () => {
    if (onSignOutStart) {
      onSignOutStart();
    }

    // SECURITY FIX: Clear all checkout-related localStorage data before signing out
    // This prevents data leakage when a user logs out and another user logs in
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem('regularCheckoutData');
        localStorage.removeItem('cateringCheckoutData');
      } catch (error) {
        // Silently handle localStorage errors (e.g., in private browsing mode)
        if (process.env.NODE_ENV === 'development') {
          console.error('Error clearing checkout data on logout:', error);
        }
      }
    }

    // Use startTransition to prevent UI flicker during sign-out
    startTransition(async () => {
      await signOutAction();
    });
  };

  return (
    <button
      type="button"
      onClick={handleSignOut}
      disabled={isPending}
      className={className}
    >
      {children}
    </button>
  );
}
