import Link from 'next/link';
import { createClient } from '@/utils/supabase/server';
import { prisma } from '@/lib/db';
import { CheckoutForm } from '@/components/store/CheckoutForm';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { UserIcon, LogInIcon, UserPlusIcon } from 'lucide-react';

export default async function CheckoutPage() {
  const supabase = await createClient();
  let initialUserData: {
    id: string;
    email: string;
    name: string | null;
    phone: string | null;
  } | null = null;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    try {
      const profile = await prisma.profile.findUnique({
        where: { id: user.id },
        select: {
          id: true,
          email: true,
          name: true,
          phone: true,
        },
      });
      if (profile) {
        initialUserData = {
          id: profile.id,
          email: profile.email || user.email || '',
          name: profile.name,
          phone: profile.phone,
        };
      } else {
        initialUserData = {
          id: user.id,
          email: user.email || '',
          name: null,
          phone: null,
        };
        console.warn(`No profile found for user ID: ${user.id}. Using auth email only.`);
      }
    } catch (error) {
      console.error('Error fetching profile data with Prisma:', error);
      initialUserData = {
        id: user.id,
        email: user.email || '',
        name: null,
        phone: null,
      };
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-destino-cream via-white to-gray-50">
      {/* Header */}
      <div className="bg-white/95 backdrop-blur-sm border-b border-gray-200/50 px-4 py-6 shadow-sm">
        <div className="container mx-auto">
          <h1 className="text-2xl sm:text-3xl font-bold text-destino-charcoal">Checkout</h1>
          <p className="text-gray-600 mt-1">Complete your order securely</p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 sm:py-8">
        {!initialUserData ? (
          <Alert variant="default" className="mb-6 bg-gradient-to-r from-destino-yellow/20 to-yellow-100/50 border-destino-yellow/40 backdrop-blur-sm shadow-sm">
            <UserIcon className="h-4 w-4 text-destino-charcoal" />
            <AlertDescription className="text-destino-charcoal">
              Have an account?{' '}
              <Link
                href="/sign-in?redirect=/checkout"
                className="font-medium text-destino-orange hover:text-destino-charcoal transition-colors underline hover:no-underline"
              >
                <LogInIcon className="inline h-4 w-4 mr-1" />
                Log in
              </Link>{' '}
              for faster checkout or{' '}
              <Link
                href="/sign-up?redirect=/checkout"
                className="font-medium text-destino-orange hover:text-destino-charcoal transition-colors underline hover:no-underline"
              >
                <UserPlusIcon className="inline h-4 w-4 mr-1" />
                Sign up
              </Link>
              . You can also continue as a guest.
            </AlertDescription>
          </Alert>
        ) : (
          <Alert variant="default" className="mb-6 bg-gradient-to-r from-green-50 to-destino-cream/50 border-green-300/50 backdrop-blur-sm shadow-sm">
            <UserIcon className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-700">
              Logged in as {initialUserData.email}. Your details have been pre-filled.
            </AlertDescription>
          </Alert>
        )}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-12">
          <CheckoutForm initialUserData={initialUserData} />
        </div>
      </div>
    </main>
  );
}
