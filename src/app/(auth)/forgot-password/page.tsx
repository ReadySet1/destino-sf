import Link from 'next/link';
import { forgotPasswordAction } from '../../actions';
import { Label } from '@/components/ui/label';
import { SubmitButton } from '../../../components/submit-button';
import { FormMessage } from '../../../components/form-message';
import { Input } from '@/components/ui/input';
import { Mail } from 'lucide-react';
import { AuthContainer } from '@/components/auth-container';

// Updated PageProps type for Next.js 15.3+
type PageProps = {
  params: Promise<{}>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export default async function ForgotPassword({
  searchParams
}: PageProps) {
  // Await the searchParams Promise to get the actual values
  const resolvedSearchParams = await searchParams;
  const message = resolvedSearchParams.message?.toString();
  const success = resolvedSearchParams.success?.toString();
  
  // Use success message if available, otherwise use the regular message
  const displayMessage = success || message;
  
  return (
    <AuthContainer 
      title="Reset Password" 
      subtitle="Enter your email to receive a password reset link"
    >
      <div className="pt-2">
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
                />
              </div>
            </div>
          </div>
          
          <SubmitButton className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-medium h-11">
            Reset Password
          </SubmitButton>
          
          <FormMessage 
            message={displayMessage} 
            className="text-center mt-2" 
            type={success ? 'success' : displayMessage?.includes('error') ? 'error' : undefined}
          />
        </form>
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
    </AuthContainer>
  );
}
