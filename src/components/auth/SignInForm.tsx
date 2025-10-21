'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useFormStatus } from 'react-dom';
import { signInAction, magicLinkSignInAction } from '@/app/actions/auth';
import { SubmitButton } from '@/components/submit-button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Link from 'next/link';
import { Lock, Mail, Wand2 } from 'lucide-react';
import { toast } from 'sonner';

type SignInMethod = 'password' | 'magic-link';

interface SignInFormProps {
  redirectUrl?: string;
}

// Separate form components to properly use useFormStatus hook
function PasswordForm({ redirectUrl }: { redirectUrl?: string }) {
  const { pending } = useFormStatus();

  return (
    <form action={signInAction} className="space-y-5">
      {redirectUrl && <input type="hidden" name="redirect" value={redirectUrl} />}
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email" className="text-sm font-medium">
            Email
          </Label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Mail className="h-4 w-4 text-muted-foreground" />
            </div>
            <Input
              name="email"
              id="email"
              placeholder="you@example.com"
              type="email"
              autoComplete="email"
              required
              className="pl-10"
              disabled={pending}
              data-testid="email"
            />
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <Label htmlFor="password" className="text-sm font-medium">
              Password
            </Label>
            <Link
              className="text-xs text-primary hover:text-primary/90 underline underline-offset-4"
              href="/forgot-password"
            >
              Forgot Password?
            </Link>
          </div>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Lock className="h-4 w-4 text-muted-foreground" />
            </div>
            <Input
              type="password"
              name="password"
              id="password"
              placeholder="Your password"
              autoComplete="current-password"
              required
              className="pl-10"
              disabled={pending}
              data-testid="password"
            />
          </div>
        </div>
      </div>

      <SubmitButton
        className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-medium h-11"
        pendingText="Signing in..."
        data-testid="login-button"
      >
        Sign in
      </SubmitButton>
    </form>
  );
}

function MagicLinkForm({ redirectUrl }: { redirectUrl?: string }) {
  const { pending } = useFormStatus();

  return (
    <form action={magicLinkSignInAction} className="space-y-5">
      {redirectUrl && <input type="hidden" name="redirect" value={redirectUrl} />}
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="magic-email" className="text-sm font-medium">
            Email
          </Label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Mail className="h-4 w-4 text-muted-foreground" />
            </div>
            <Input
              name="email"
              id="magic-email"
              placeholder="you@example.com"
              type="email"
              autoComplete="email"
              required
              className="pl-10"
              disabled={pending}
            />
          </div>
          <p className="text-xs text-gray-500 flex items-center gap-1">
            <Wand2 className="w-3 h-3" />
            We&apos;ll send you a secure link to sign in without a password
          </p>
        </div>
      </div>

      <SubmitButton
        className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-medium h-11"
        pendingText="Sending..."
      >
        <Wand2 className="w-4 h-4 mr-2" />
        Send Magic Link
      </SubmitButton>
    </form>
  );
}

export function SignInForm({ redirectUrl }: SignInFormProps) {
  const [method, setMethod] = useState<SignInMethod>('password');
  const searchParams = useSearchParams();

  // Show toast notification for magic link success
  useEffect(() => {
    const successMessage = searchParams.get('success');
    const errorMessage = searchParams.get('error');

    if (successMessage && successMessage.toLowerCase().includes('magic link')) {
      toast.success('Magic Link Sent! 🪄', {
        description: 'Check your email for a secure sign-in link. It will expire in 1 hour.',
        duration: 5000,
        action: {
          label: 'Got it',
          onClick: () => {
            // Optional: Could clear the URL params here
          },
        },
      });
    } else if (successMessage) {
      toast.success('Success!', {
        description: successMessage,
        duration: 4000,
      });
    } else if (errorMessage) {
      toast.error('Error', {
        description: errorMessage,
        duration: 4000,
      });
    }
  }, [searchParams]);

  return (
    <div className="space-y-6">
      {/* Sign-in method tabs */}
      <div className="flex bg-gray-100 rounded-lg p-1" role="tablist">
        <button
          type="button"
          className={`flex-1 py-2 px-4 text-sm font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 transition-all ${
            method === 'password'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
          role="tab"
          aria-selected={method === 'password'}
          onClick={() => setMethod('password')}
        >
          <Lock className="w-4 h-4 inline mr-2" />
          Password
        </button>
        <button
          type="button"
          className={`flex-1 py-2 px-4 text-sm font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 transition-all ${
            method === 'magic-link'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
          role="tab"
          aria-selected={method === 'magic-link'}
          onClick={() => setMethod('magic-link')}
        >
          <Wand2 className="w-4 h-4 inline mr-2" />
          Magic Link
        </button>
      </div>

      {/* Password form */}
      {method === 'password' && <PasswordForm redirectUrl={redirectUrl} />}

      {/* Magic Link form */}
      {method === 'magic-link' && <MagicLinkForm redirectUrl={redirectUrl} />}
    </div>
  );
}
