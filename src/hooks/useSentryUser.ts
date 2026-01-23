/**
 * useSentryUser Hook
 *
 * Automatically sets Sentry user context when authentication state changes.
 * This ensures error reports are associated with the correct user.
 *
 * @see DES-59 Enhanced Sentry Error Tracking
 */

'use client';

import { useEffect, useCallback } from 'react';
import * as Sentry from '@sentry/nextjs';
import { createClient } from '@/utils/supabase/client';
import type { User } from '@supabase/supabase-js';

export interface SentryUserContext {
  id: string;
  email?: string;
  username?: string;
  role?: string;
}

/**
 * Hook to sync Sentry user context with authentication state
 *
 * @example
 * ```tsx
 * function App() {
 *   useSentryUser();
 *   return <div>...</div>;
 * }
 * ```
 */
export function useSentryUser(): void {
  const setSentryUser = useCallback((user: User | null) => {
    if (user) {
      // Set user context in Sentry
      const userContext: SentryUserContext = {
        id: user.id,
        email: user.email,
        username: user.user_metadata?.full_name || user.email?.split('@')[0],
        role: user.user_metadata?.role || 'customer',
      };

      Sentry.setUser(userContext);

      // Set additional tags for filtering
      Sentry.setTag('user.authenticated', 'true');
      Sentry.setTag('user.role', userContext.role || 'unknown');

      // Add breadcrumb for authentication
      Sentry.addBreadcrumb({
        type: 'user',
        category: 'auth',
        message: 'User authenticated',
        level: 'info',
        data: {
          userId: user.id,
          email: user.email ? `${user.email.substring(0, 3)}...` : undefined,
        },
      });
    } else {
      // Clear user context when logged out
      Sentry.setUser(null);
      Sentry.setTag('user.authenticated', 'false');
      Sentry.setTag('user.role', 'anonymous');

      Sentry.addBreadcrumb({
        type: 'user',
        category: 'auth',
        message: 'User signed out',
        level: 'info',
      });
    }
  }, []);

  useEffect(() => {
    const supabase = createClient();

    // Get initial session
    const initializeUser = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        setSentryUser(session?.user || null);
      } catch (error) {
        console.error('[useSentryUser] Failed to get session:', error);
        setSentryUser(null);
      }
    };

    initializeUser();

    // Subscribe to auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSentryUser(session?.user || null);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [setSentryUser]);
}

/**
 * Set Sentry user context imperatively (for server-side or non-hook contexts)
 */
export function setSentryUserContext(
  user: { id: string; email?: string; role?: string } | null
): void {
  if (user) {
    Sentry.setUser({
      id: user.id,
      email: user.email,
    });
    Sentry.setTag('user.authenticated', 'true');
    Sentry.setTag('user.role', user.role || 'unknown');
  } else {
    Sentry.setUser(null);
    Sentry.setTag('user.authenticated', 'false');
    Sentry.setTag('user.role', 'anonymous');
  }
}

/**
 * Clear Sentry user context
 */
export function clearSentryUserContext(): void {
  Sentry.setUser(null);
  Sentry.setTag('user.authenticated', 'false');
  Sentry.setTag('user.role', 'anonymous');
}
