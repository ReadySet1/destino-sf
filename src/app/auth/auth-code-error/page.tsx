import Link from 'next/link';
import { AuthContainer } from '@/components/auth-container';
import { AlertCircle } from 'lucide-react';

export default function AuthCodeError() {
  return (
    <AuthContainer 
      title="Authentication Error" 
      subtitle="There was a problem with your authentication link"
    >
      <div className="text-center space-y-6">
        <div className="flex justify-center">
          <div className="rounded-full bg-red-100 p-3">
            <AlertCircle className="h-8 w-8 text-red-600" />
          </div>
        </div>
        
        <div className="space-y-3">
          <p className="text-sm text-gray-600">
            The authentication link may have expired or been used already.
          </p>
          
          <div className="space-y-2">
            <p className="text-xs text-gray-500">
              Please try one of the following:
            </p>
            <ul className="text-xs text-gray-500 space-y-1">
              <li>• Request a new password reset link</li>
              <li>• Make sure you&apos;re using the latest link from your email</li>
              <li>• Check if the link was copied completely</li>
            </ul>
          </div>
        </div>

        <div className="flex flex-col space-y-3">
          <Link
            href="/forgot-password"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
          >
            Request New Password Reset
          </Link>
          
          <Link
            href="/sign-in"
            className="text-sm text-primary hover:text-primary/90 underline underline-offset-4"
          >
            Back to Sign In
          </Link>
        </div>
      </div>
    </AuthContainer>
  );
} 