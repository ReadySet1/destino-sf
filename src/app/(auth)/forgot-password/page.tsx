import Link from 'next/link';
import { forgotPasswordAction } from '../../actions';
import { Label } from '@/components/ui/label';
import { SubmitButton } from '../../../components/submit-button';
import { FormMessage } from '../../../components/form-message';
import { Input } from '@/components/ui/input';
import { Mail } from 'lucide-react';

export default async function ForgotPassword(props: { searchParams: Promise<string> }) {
  const searchParams = await props.searchParams;
  
  return (
    <div className="flex min-h-screen justify-center items-center">
      <div className="w-full max-w-sm px-4">
        <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
          <div className="space-y-1 pb-2 text-center">
            <h1 className="text-2xl font-bold">Reset Password</h1>
            <p className="text-sm text-muted-foreground">
              Enter your email to receive a password reset link
            </p>
          </div>
          
          <div className="pt-6">
            <form action={forgotPasswordAction} className="space-y-4">
              <div className="space-y-3">
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
              
              <SubmitButton className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-medium">
                Reset Password
              </SubmitButton>
              
              <FormMessage message={searchParams} className="text-center mt-2" />
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
            
            <div className="text-center text-xs text-muted-foreground pt-2">
              Taste the tradition at Destino SF
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
