import { signInAction } from '@/app/actions';
import { FormMessage } from '@/components/form-message';
import { SubmitButton } from '@/components/submit-button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Link from 'next/link';
import { Lock, Mail } from 'lucide-react';
import { AuthContainer } from '@/components/auth-container';

// Define the shape of the resolved search params
type ResolvedSearchParams = {
  message?: string;
  error?: string;
  redirect?: string;
};

export default async function Login({
  searchParams,
}: {
  searchParams: Promise<ResolvedSearchParams>;
}) {
  const resolvedSearchParams = await searchParams;
  // Check for both message and error parameters
  const message = resolvedSearchParams.message || resolvedSearchParams.error;
  // Determine message type based on which parameter is present
  const messageType = resolvedSearchParams.error ? 'error' : 'success';
  const redirectUrl = resolvedSearchParams.redirect;

  return (
    <AuthContainer 
      title="Welcome Back" 
      subtitle="Sign in to your Destino SF account"
    >
      <div className="pt-2">
        <form action={signInAction} className="space-y-5">
          {redirectUrl && (
            <input type="hidden" name="redirect" value={redirectUrl} />
          )}
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
                />
              </div>
            </div>
          </div>

          <SubmitButton className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-medium h-11">
            Sign in
          </SubmitButton>

          <FormMessage message={message} type={messageType} className="text-center mt-2" />
        </form>
      </div>
      
      <div className="flex flex-col space-y-4 pt-6">
        <div className="text-center text-sm">
          Don&apos;t have an account?{' '}
          <Link
            className="text-primary hover:text-primary/90 underline underline-offset-4 font-medium"
            href="/sign-up"
          >
            Sign up
          </Link>
        </div>
      </div>
    </AuthContainer>
  );
}
