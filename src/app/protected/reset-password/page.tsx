import { resetPasswordAction } from '@/app/actions/auth';
import { FormMessage } from '@/components/form-message';
import { SubmitButton } from '@/components/submit-button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AuthContainer } from '@/components/auth-container';
import { Lock } from 'lucide-react';
import { PasswordStrengthIndicator } from '@/components/password-strength-indicator';
import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import { ToastHandler } from '@/components/auth/ToastHandler';

// Updated PageProps type for Next.js 15.3+
type PageProps = {
  params: Promise<{}>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export default async function ResetPasswordPage({
  searchParams
}: PageProps) {
  // Check if user is authenticated (should be if they came from recovery link)
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    redirect('/sign-in?message=Please sign in to reset your password');
  }

  // Await the searchParams Promise to get the actual values
  const resolvedSearchParams = await searchParams;
  const message = resolvedSearchParams.message?.toString();
  const error_msg = resolvedSearchParams.error?.toString();
  const success = resolvedSearchParams.success?.toString();
  
  // Use success message if available, otherwise use error or regular message
  const displayMessage = success || error_msg || message;
  const messageType = success ? 'success' : error_msg ? 'error' : undefined;
  
  return (
    <AuthContainer 
      title="Reset Your Password" 
      subtitle="Enter your new password below"
    >
      <ToastHandler />
      <div className="pt-2">
        {user.email && (
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-md mb-4">
            <p className="text-sm text-blue-800">
              Resetting password for: <strong>{user.email}</strong>
            </p>
          </div>
        )}

        <form
          action={resetPasswordAction}
          className="space-y-5"
        >
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">New Password</Label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-4 w-4 text-muted-foreground" />
                </div>
                <Input 
                  type="password" 
                  name="password" 
                  id="password"
                  placeholder="Enter your new password" 
                  required 
                  className="pl-10"
                  minLength={8}
                />
              </div>
              <PasswordStrengthIndicator />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm New Password</Label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-4 w-4 text-muted-foreground" />
                </div>
                <Input 
                  type="password" 
                  name="confirmPassword" 
                  id="confirmPassword"
                  placeholder="Confirm your new password" 
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
            Update Password
          </SubmitButton>
          
          <FormMessage message={displayMessage} type={messageType} className="text-center mt-2" />
        </form>
      </div>
    </AuthContainer>
  );
}
