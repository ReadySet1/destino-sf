'use client';

import { useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';

export function AuthHandler() {
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const handleAuthCallback = async () => {
      // Check if we have auth tokens in the URL fragment
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const accessToken = hashParams.get('access_token');
      const refreshToken = hashParams.get('refresh_token');
      const tokenType = hashParams.get('token_type');
      const type = hashParams.get('type');

      if (accessToken && refreshToken && type === 'magiclink') {
        try {
          // Set the session using the tokens from the URL
          const { data, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (error) {
            console.error('Error setting session:', error);
            router.push('/auth/auth-code-error');
            return;
          }

          if (data.user) {
            console.log('Magic link authentication successful:', data.user.email);
            
            // Clear the URL fragment
            window.history.replaceState(null, '', window.location.pathname);
            
            // Redirect to setup password page
            router.push('/setup-password');
          }
        } catch (error) {
          console.error('Error handling magic link:', error);
          router.push('/auth/auth-code-error');
        }
      }
    };

    // Only run on client side
    if (typeof window !== 'undefined') {
      handleAuthCallback();
    }
  }, [router, supabase.auth]);

  // This component doesn't render anything
  return null;
} 