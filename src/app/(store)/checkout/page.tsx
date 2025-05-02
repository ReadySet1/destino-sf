import Link from 'next/link';
import { createClient } from '@/utils/supabase/server';
import { prisma } from '@/lib/prisma';
import { CheckoutForm } from '@/components/Store/CheckoutForm';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { UserIcon, LogInIcon, UserPlusIcon } from 'lucide-react';

export default async function CheckoutPage() {
  const supabase = await createClient();
  let initialUserData: { id: string; email: string; name: string | null; phone: string | null; } | null = null;
  
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    try {
      const profile = await prisma.profile.findUnique({
        where: { id: user.id },
        select: {
          id: true,
          email: true,
          name: true,
          phone: true,
        }
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
        console.error("Error fetching profile data with Prisma:", error);
        initialUserData = {
             id: user.id,
             email: user.email || '',
             name: null,
             phone: null,
         };
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Checkout</h1>
      {!initialUserData ? (
        <Alert variant="default" className="mb-6 bg-blue-50 border-blue-200">
          <UserIcon className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-700">
            Have an account?{' '}
            <Link href="/login?redirect=/checkout" className="font-medium text-blue-600 hover:underline">
              <LogInIcon className="inline h-4 w-4 mr-1" />Log in
            </Link>
            {' '}for faster checkout or{' '}
            <Link href="/signup?redirect=/checkout" className="font-medium text-blue-600 hover:underline">
              <UserPlusIcon className="inline h-4 w-4 mr-1" />Sign up
            </Link>.
            You can also continue as a guest.
          </AlertDescription>
        </Alert>
      ) : (
        <Alert variant="default" className="mb-6 bg-green-50 border-green-200">
          <UserIcon className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-700">
            Logged in as {initialUserData.email}. Your details have been pre-filled.
          </AlertDescription>
        </Alert>
      )}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        <CheckoutForm initialUserData={initialUserData} />
      </div>
    </div>
  );
}