import { resetPasswordAction } from '@/app/actions';
import { FormMessage } from '@/components/form-message';
import { SubmitButton } from '@/components/submit-button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AuthContainer } from '@/components/auth-container';
import { Lock } from 'lucide-react';

// Updated PageProps type for Next.js 15.3+
type PageProps = {
  params: Promise<{}>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export default async function ResetPassword({
  searchParams
}: PageProps) {
  // Await the searchParams Promise to get the actual values
  const resolvedSearchParams = await searchParams;
  const message = resolvedSearchParams.message?.toString();
  const error = resolvedSearchParams.error?.toString();
  const success = resolvedSearchParams.success?.toString();
  
  // Use success message if available, otherwise use error or regular message
  const displayMessage = success || error || message;
  const messageType = success ? 'success' : error ? 'error' : undefined;
  
  return (
    <AuthContainer 
      title="Reset Password" 
      subtitle="Please enter your new password below"
    >
      <div className="pt-2">
        <form
          action={resetPasswordAction}
          className="space-y-5"
        >
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">New password</Label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-4 w-4 text-muted-foreground" />
                </div>
                <Input 
                  type="password" 
                  name="password" 
                  id="password"
                  placeholder="New password" 
                  required 
                  className="pl-10"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm password</Label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-4 w-4 text-muted-foreground" />
                </div>
                <Input 
                  type="password" 
                  name="confirmPassword" 
                  id="confirmPassword"
                  placeholder="Confirm password" 
                  required 
                  className="pl-10"
                />
              </div>
            </div>
          </div>
          
          <SubmitButton className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-medium h-11">
            Reset Password
          </SubmitButton>
          
          <FormMessage message={displayMessage} type={messageType} className="text-center mt-2" />
        </form>
      </div>
    </AuthContainer>
  );
}
