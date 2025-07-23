import { setupPasswordAction } from '@/app/actions/auth';
import { FormMessage } from '@/components/form-message';
import { SubmitButton } from '@/components/submit-button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AuthContainer } from '@/components/auth-container';
import { Lock, Eye, EyeOff } from 'lucide-react';
import { PasswordStrengthIndicator } from '@/components/password-strength-indicator';
import { ToastHandler } from '@/components/auth/ToastHandler';

// Updated PageProps type for Next.js 15.3+
type PageProps = {
  params: Promise<{}>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export default async function SetupPasswordPage({ searchParams }: PageProps) {
  // Await the searchParams Promise to get the actual values
  const resolvedSearchParams = await searchParams;
  const message = resolvedSearchParams.message?.toString();
  const error = resolvedSearchParams.error?.toString();
  const success = resolvedSearchParams.success?.toString();
  const email = resolvedSearchParams.email?.toString();

  // Use success message if available, otherwise use error or regular message
  const displayMessage = success || error || message;
  const messageType = success ? 'success' : error ? 'error' : undefined;

  return (
    <AuthContainer
      title="Set Up Your Password"
      subtitle="Welcome! Please create a secure password for your account"
    >
      <ToastHandler />
      <div className="pt-2">
        <form action={setupPasswordAction} className="space-y-5">
          {email && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
              <p className="text-sm text-blue-800">
                Setting up password for: <strong>{email}</strong>
              </p>
            </div>
          )}

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-4 w-4 text-muted-foreground" />
                </div>
                <Input
                  type="password"
                  name="password"
                  id="password"
                  placeholder="Create a strong password"
                  required
                  className="pl-10 pr-10"
                  minLength={8}
                />
              </div>
              <PasswordStrengthIndicator />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-4 w-4 text-muted-foreground" />
                </div>
                <Input
                  type="password"
                  name="confirmPassword"
                  id="confirmPassword"
                  placeholder="Confirm your password"
                  required
                  className="pl-10"
                  minLength={8}
                />
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="text-xs text-gray-600 space-y-1">
              <p className="font-medium">Password requirements:</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>At least 8 characters long</li>
                <li>Include uppercase and lowercase letters</li>
                <li>Include at least one number</li>
                <li>Include at least one special character</li>
              </ul>
            </div>
          </div>

          <SubmitButton className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-medium h-11">
            Set Up Password
          </SubmitButton>

          <FormMessage message={displayMessage} type={messageType} className="text-center mt-2" />
        </form>
      </div>
    </AuthContainer>
  );
}
