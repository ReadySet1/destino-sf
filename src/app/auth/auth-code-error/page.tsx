import Link from 'next/link';
import { AuthContainer } from '@/components/auth-container';

export default function AuthCodeErrorPage() {
  return (
    <AuthContainer 
      title="Authentication Error" 
      subtitle="There was a problem with your authentication link"
    >
      <div className="space-y-4">
        <div className="p-4 bg-red-50 border border-red-200 rounded-md">
          <h3 className="font-medium text-red-900 mb-2">Authentication Failed</h3>
          <p className="text-sm text-red-800">
            The authentication link you used may have expired or is invalid. 
            This can happen if:
          </p>
          <ul className="list-disc list-inside mt-2 text-sm text-red-800 space-y-1">
            <li>The link has expired (links are valid for a limited time)</li>
            <li>The link has already been used</li>
            <li>There was a network error during authentication</li>
          </ul>
        </div>

        <div className="space-y-2">
          <Link
            href="/sign-in"
            className="block w-full text-center bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700"
          >
            Try Signing In Again
          </Link>
          
          <Link
            href="/forgot-password"
            className="block w-full text-center bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700"
          >
            Request New Password Reset
          </Link>

          <Link
            href="/"
            className="block w-full text-center text-gray-600 hover:text-gray-800"
          >
            Return to Home
          </Link>
        </div>
      </div>
    </AuthContainer>
  );
} 