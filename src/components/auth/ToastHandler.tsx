'use client';

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { Shield, Wand2 } from 'lucide-react';

export function ToastHandler() {
  const searchParams = useSearchParams();

  useEffect(() => {
    const successMessage = searchParams.get('success');
    const errorMessage = searchParams.get('error');
    
    if (successMessage) {
      const isPasswordReset = successMessage.toLowerCase().includes('reset') || successMessage.toLowerCase().includes('password');
      const isMagicLink = successMessage.toLowerCase().includes('magic link');
      
      if (isMagicLink) {
        toast.success('Magic Link Sent! 🪄', {
          description: 'Check your email for a secure sign-in link. It will expire in 1 hour.',
          duration: 5000,
          action: {
            label: 'Got it',
            onClick: () => {}
          }
        });
      } else if (isPasswordReset) {
        toast.success('Password Reset Link Sent! 🔐', {
          description: 'Check your email for a link to reset your password. It will expire in 1 hour.',
          duration: 5000,
          action: {
            label: 'Got it',
            onClick: () => {}
          }
        });
      } else {
        toast.success('Success! ✅', {
          description: successMessage,
          duration: 4000,
        });
      }
    } else if (errorMessage) {
      toast.error('Error ❌', {
        description: errorMessage,
        duration: 4000,
      });
    }
  }, [searchParams]);

  return null; // This component only handles side effects
} 