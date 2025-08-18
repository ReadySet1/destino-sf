import { createClient } from '@/utils/supabase/client';

export interface AuthErrorResult {
  success: boolean;
  requiresAuth: boolean;
  error?: string;
}

/**
 * Handle authentication errors with specific error handling
 */
export async function handleAuthError(error: any, context: string): Promise<AuthErrorResult> {
  if (
    error?.code === 'refresh_token_not_found' ||
    error?.message?.includes('Invalid Refresh Token')
  ) {
    console.warn(`Auth token refresh failed in ${context}:`, {
      error: error.message,
      code: error.code,
      timestamp: new Date().toISOString(),
    });

    return {
      success: false,
      requiresAuth: true,
      error: 'Session expired. Please sign in again.',
    };
  }

  if (error?.code === 'session_not_found' || error?.message?.includes('session not found')) {
    console.warn(`Session not found in ${context}:`, error);
    return {
      success: false,
      requiresAuth: true,
      error: 'No active session. Please sign in.',
    };
  }

  console.error(`Auth error in ${context}:`, error);
  return {
    success: false,
    requiresAuth: false,
    error: 'Authentication error occurred.',
  };
}

/**
 * Attempt to refresh the session with retry logic
 */
export async function refreshSessionWithRetry(maxRetries: number = 3): Promise<AuthErrorResult> {
  const supabase = createClient();

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`Session refresh attempt ${attempt}/${maxRetries}`);

      const {
        data: { session },
        error,
      } = await supabase.auth.refreshSession();

      if (error) {
        console.warn(`Session refresh attempt ${attempt} failed:`, error);

        if (attempt === maxRetries) {
          return await handleAuthError(error, 'session-refresh');
        }

        // Wait before retrying (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
        continue;
      }

      if (session) {
        console.log('Session refresh successful');
        return { success: true, requiresAuth: false };
      }
    } catch (error) {
      console.error(`Session refresh attempt ${attempt} threw error:`, error);

      if (attempt === maxRetries) {
        return await handleAuthError(error, 'session-refresh-exception');
      }
    }
  }

  return {
    success: false,
    requiresAuth: true,
    error: 'Failed to refresh session after multiple attempts.',
  };
}

/**
 * Check if user has valid session and optionally refresh
 */
export async function validateSession(
  refreshIfNeeded: boolean = true
): Promise<AuthErrorResult & { session?: any }> {
  const supabase = createClient();

  try {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error) {
      if (
        refreshIfNeeded &&
        (error.message?.includes('refresh') || error.code === 'refresh_token_not_found')
      ) {
        console.log('Session invalid, attempting refresh...');
        const refreshResult = await refreshSessionWithRetry();

        if (refreshResult.success) {
          // Get the user again after successful refresh
          const {
            data: { user: newUser },
            error: newError,
          } = await supabase.auth.getUser();

          if (newError) {
            return await handleAuthError(newError, 'post-refresh-session-check');
          }

          return {
            success: true,
            requiresAuth: false,
            session: { user: newUser },
          };
        }

        return refreshResult;
      }

      return await handleAuthError(error, 'session-validation');
    }

    if (!user) {
      return {
        success: false,
        requiresAuth: true,
        error: 'No authenticated user found.',
      };
    }

    return {
      success: true,
      requiresAuth: false,
      session: { user },
    };
  } catch (error) {
    console.error('Session validation error:', error);
    return await handleAuthError(error, 'session-validation-exception');
  }
}

/**
 * Clear invalid session data
 */
export async function clearInvalidSession(): Promise<void> {
  try {
    const supabase = createClient();
    await supabase.auth.signOut();

    // Clear local storage
    if (typeof window !== 'undefined') {
      localStorage.removeItem('supabase.auth.token');
      sessionStorage.removeItem('supabase.auth.token');
    }

    console.log('Invalid session cleared');
  } catch (error) {
    console.error('Error clearing invalid session:', error);
  }
}
