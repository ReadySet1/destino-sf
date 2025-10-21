'use client';

import { signUpAction } from '@/app/actions';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SubmitButton } from '@/components/submit-button';
import Link from 'next/link';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Mail, Lock, User, Phone } from 'lucide-react';
import { AuthContainer } from '@/components/auth-container';

interface SignUpResult {
  error?: string;
}

export default function Signup() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(formData: FormData) {
    try {
      setIsLoading(true);
      const result = (await signUpAction(formData)) as SignUpResult;

      if (result?.error) {
        toast.error(result.error);
        return;
      }

      toast.success(
        'Account created successfully! Please check your email to verify your account.'
      );
      router.push('/sign-in');
    } catch (error) {
      toast.error('Something went wrong. Please try again.');
      console.error('Sign up error:', error);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <AuthContainer title="Create an Account" subtitle="Sign up to experience Destino SF">
      <div className="pt-2">
        <form action={handleSubmit} className="space-y-5">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-4 w-4 text-muted-foreground" />
                </div>
                <Input
                  id="name"
                  name="name"
                  type="text"
                  autoComplete="name"
                  placeholder="Your full name"
                  className="pl-10"
                  disabled={isLoading}
                />
              </div>
            </div>

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
                  autoComplete="email"
                  placeholder="you@example.com"
                  required
                  className="pl-10"
                  disabled={isLoading}
                  data-testid="email"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number (Optional)</Label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                </div>
                <Input
                  id="phone"
                  name="phone"
                  type="tel"
                  autoComplete="tel"
                  placeholder="Your phone number"
                  className="pl-10"
                  disabled={isLoading}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-4 w-4 text-muted-foreground" />
                </div>
                <Input
                  id="password"
                  type="password"
                  name="password"
                  placeholder="Your password"
                  minLength={6}
                  required
                  className="pl-10"
                  disabled={isLoading}
                  data-testid="password"
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Password must be at least 6 characters
              </p>
            </div>
          </div>

          <SubmitButton
            className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-medium h-11"
            loading={isLoading}
            pendingText="Creating account..."
            data-testid="register-button"
          >
            Sign up
          </SubmitButton>
        </form>
      </div>

      <div className="flex flex-col space-y-4 pt-6">
        <div className="text-center text-sm">
          Already have an account?{' '}
          <Link
            className="text-primary hover:text-primary/90 underline underline-offset-4 font-medium"
            href="/sign-in"
          >
            Sign in
          </Link>
        </div>
      </div>
    </AuthContainer>
  );
}
