'use client';

import { signUpAction } from '@/app/actions';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Link from 'next/link';
import { SmtpMessage } from '../smtp-message';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

interface SignUpResult {
  error?: string;
}

export default function Signup() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(formData: FormData) {
    try {
      setIsLoading(true);
      const result = await signUpAction(formData) as SignUpResult;
      
      if (result?.error) {
        toast.error(result.error);
        return;
      }

      toast.success('Account created successfully! Please check your email to verify your account.');
      router.push('/sign-in');
    } catch (error) {
      toast.error('Something went wrong. Please try again.');
      console.error('Sign up error:', error);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <>
      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Sign up</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Already have an account?{' '}
          <Link className="font-medium text-primary hover:text-primary/90 underline underline-offset-4" href="/sign-in">
            Sign in
          </Link>
        </p>
      </div>

      <form action={handleSubmit} className="space-y-6">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              required
              className="w-full"
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              name="password"
              placeholder="Your password"
              minLength={6}
              required
              className="w-full"
              disabled={isLoading}
            />
          </div>
        </div>

        <button
          type="submit"
          className="w-full bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 h-10 px-4 py-2"
          disabled={isLoading}
        >
          {isLoading ? 'Creating account...' : 'Sign up'}
        </button>
      </form>

      <div className="mt-6">
        <SmtpMessage />
      </div>
    </>
  );
}
