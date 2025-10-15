'use client';

import Link from 'next/link';
import { forgotPasswordAction } from '../../actions/auth';
import { Label } from '@/components/ui/label';
import { SubmitButton } from '../../../components/submit-button';
import { FormMessage } from '../../../components/form-message';
import { Input } from '@/components/ui/input';
import { Mail } from 'lucide-react';
import { AuthContainer } from '@/components/auth-container';
import { ToastHandler } from '@/components/auth/ToastHandler';
import { useFormStatus } from 'react-dom';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function ForgotPasswordForm() {
  const { pending } = useFormStatus();

  return (
    <form action={forgotPasswordAction} className="space-y-5">
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Mail className="h-4 w-4 text-muted-foreground" />
            </div>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="you@example.com"
              required
              className="pl-10"
              disabled={pending}
            />
          </div>
        </div>
      </div>

      <SubmitButton
        className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-medium h-11"
        pendingText="Sending reset link..."
      >
        Reset Password
      </SubmitButton>
    </form>
  );
}

function ForgotPasswordContent() {
  const searchParams = useSearchParams();
  const message = searchParams.get('message');
  const success = searchParams.get('success');

  // Use success message if available, otherwise use the regular message
  const displayMessage = success || message || undefined;

  return (
    <>
      <ToastHandler />
      <div className="pt-2">
        <ForgotPasswordForm />

        <FormMessage
          message={displayMessage}
          className="text-center mt-2"
          type={success ? 'success' : displayMessage?.includes('error') ? 'error' : undefined}
        />
      </div>

      <div className="flex flex-col space-y-4 pt-6">
        <div className="text-center text-sm">
          Remember your password?{' '}
          <Link
            className="text-primary hover:text-primary/90 underline underline-offset-4 font-medium"
            href="/sign-in"
          >
            Sign in
          </Link>
        </div>
      </div>
    </>
  );
}

export default function ForgotPassword() {
  return (
    <AuthContainer
      title="Reset Password"
      subtitle="Enter your email to receive a password reset link"
    >
      <Suspense fallback={<div>Loading...</div>}>
        <ForgotPasswordContent />
      </Suspense>
    </AuthContainer>
  );
}
