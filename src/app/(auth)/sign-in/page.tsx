import { signInAction } from '@/app/actions';
import { FormMessage } from '@/components/form-message';
import { SubmitButton } from '@/components/submit-button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Link from 'next/link';
import { Lock, Mail } from 'lucide-react';

// Define the shape of the resolved search params
type ResolvedSearchParams = {
  message?: string;
};

export default async function Login({
  searchParams,
}: {
  searchParams: Promise<ResolvedSearchParams>;
}) {
  const resolvedSearchParams = await searchParams;
  const message = resolvedSearchParams.message;

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="m-auto w-full max-w-md p-8 bg-white rounded-xl shadow-lg">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Welcome Back</h1>
          <p className="text-sm text-gray-600 mt-1">Sign in to your delicious account</p>
        </div>

        <form action={signInAction} className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium text-gray-900">
                Email
              </Label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-500" />
                </div>
                <Input
                  name="email"
                  id="email"
                  placeholder="you@example.com"
                  required
                  className="pl-10 border-gray-200 focus:border-gray-500 focus:ring-gray-500 rounded-lg"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label htmlFor="password" className="text-sm font-medium text-gray-900">
                  Password
                </Label>
                <Link
                  className="text-xs text-gray-600 hover:text-black hover:underline transition"
                  href="/forgot-password"
                >
                  Forgot Password?
                </Link>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-500" />
                </div>
                <Input
                  type="password"
                  name="password"
                  id="password"
                  placeholder="Your password"
                  required
                  className="pl-10 border-gray-200 focus:border-gray-500 focus:ring-gray-500 rounded-lg"
                />
              </div>
            </div>
          </div>

          <SubmitButton className="w-full py-2.5 px-4 bg-black hover:bg-gray-800 text-white font-medium rounded-lg transition duration-200 shadow-md hover:shadow-lg">
            Sign in
          </SubmitButton>

          <FormMessage message={message} className="text-center" />

          <div className="text-center text-sm text-gray-700 mt-4">
            Don&apos;t have an account?{' '}
            <Link
              className="font-medium text-gray-600 hover:text-black hover:underline transition"
              href="/sign-up"
            >
              Sign up
            </Link>
          </div>
        </form>

        <div className="mt-8 pt-6 border-t border-gray-200 text-center text-xs text-gray-500">
          Taste the tradition at Destino SF
        </div>
      </div>
    </div>
  );
}
