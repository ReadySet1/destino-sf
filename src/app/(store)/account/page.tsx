import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { createClient } from '@/utils/supabase/server';
import { prisma } from '@/lib/prisma';
import { AccountProfile, AccountProfileProps } from '@/components/Store/AccountProfile';
import { OrderHistory, OrderHistoryProps } from '@/components/Store/OrderHistory';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import type { Profile } from '@prisma/client';
import { handleSignOut } from './actions';

export default async function AccountPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="container mx-auto py-16 text-center">
        <h1 className="mb-4 text-2xl font-bold">Account Access</h1>
        <p className="mb-6 text-gray-600">Please sign in to access your account.</p>
        <Button asChild>
          <Link href="/sign-in">Sign In</Link>
        </Button>
      </div>
    );
  }

  let profile: Profile | null = null;
  try {
    profile = await prisma.profile.findUnique({
      where: { id: user.id },
    });
  } catch (error) {
    console.error('Failed to fetch profile:', error);
  }

  return (
    <main className="container mx-auto py-8">
      <h1 className="mb-6 text-3xl font-bold">My Account</h1>

      <Tabs defaultValue="profile" className="w-full space-y-8 md:w-auto">
        <TabsList className="grid w-full grid-cols-2 md:w-[400px]">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="orders">Orders</TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <AccountProfile {...({ user: user, profile: profile, onSignOut: handleSignOut } as AccountProfileProps)} />
        </TabsContent>

        <TabsContent value="orders">
          <OrderHistory {...({ userId: user.id } as OrderHistoryProps)} />
        </TabsContent>
      </Tabs>
    </main>
  );
}
