import Link from 'next/link';
import { AuthContainer } from '@/components/auth-container';

export default function PasswordSetupTestPage() {
  return (
    <AuthContainer 
      title="Password Setup Test" 
      subtitle="Test the password setup flow"
    >
      <div className="space-y-4">
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
          <h3 className="font-medium text-blue-900 mb-2">Testing Instructions</h3>
          <ol className="list-decimal list-inside space-y-2 text-sm text-blue-800">
            <li>Go to the Admin Users page</li>
            <li>Create a new user or use an existing one</li>
            <li>Click &quot;Send Password Setup&quot; for that user</li>
            <li>Check the user&apos;s email for the invitation</li>
            <li>Click the link in the email to set up their password</li>
          </ol>
        </div>

        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-md">
          <h3 className="font-medium text-yellow-900 mb-2">Requirements</h3>
          <ul className="list-disc list-inside space-y-1 text-sm text-yellow-800">
            <li>Supabase project configured with SMTP settings</li>
            <li>Email templates configured in Supabase dashboard</li>
            <li>NEXT_PUBLIC_SITE_URL environment variable set</li>
            <li>SUPABASE_SERVICE_ROLE_KEY environment variable set</li>
          </ul>
        </div>

        <div className="space-y-2">
          <Link
            href="/admin/users"
            className="block w-full text-center bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700"
          >
            Go to Admin Users
          </Link>
          
          <Link
            href="/setup-password"
            className="block w-full text-center bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
          >
            Test Password Setup Page
          </Link>
        </div>
      </div>
    </AuthContainer>
  );
} 