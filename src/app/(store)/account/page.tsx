'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { createClient } from '@/utils/supabase/client';
import { AccountProfile } from '@/components/Store/AccountProfile';
import { OrderHistory } from '@/components/Store/OrderHistory';
import { Button } from '@/components/ui/button';
import type { User, Session, AuthChangeEvent } from '@supabase/supabase-js';

export default function AccountPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('profile');
  const supabase = createClient();

  useEffect(() => {
    const checkUser = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      setUser(session?.user || null);
      setIsLoading(false);
    };

    void checkUser();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event: AuthChangeEvent, session: Session | null) => {
        setUser(session?.user ?? null);
        setIsLoading(false);
      }
    );

    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, [supabase.auth]);

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      router.push('/');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="container mx-auto py-16 text-center">
        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-yellow-500"></div>
        <p className="mt-4 text-gray-600">Loading your account...</p>
      </div>
    );
  }

  // If user is not logged in, show sign in button
  if (!user) {
    return (
      <div className="container mx-auto py-16 text-center">
        <h1 className="mb-4 text-2xl font-bold">Account Access</h1>
        <p className="mb-6 text-gray-600">Please sign in to access your account.</p>
        <Button onClick={() => router.push('/sign-in')}>Sign In</Button>
      </div>
    );
  }

  return (
    <main className="container mx-auto py-8">
      <h1 className="mb-6 text-3xl font-bold">My Account</h1>

      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="w-full space-y-8 md:w-auto"
      >
        <TabsList className="grid w-full grid-cols-2 md:w-[400px]">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="orders">Orders</TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <AccountProfile user={user} onSignOut={handleSignOut} />
        </TabsContent>

        <TabsContent value="orders">
          <OrderHistory isActive={activeTab === 'orders'} />
        </TabsContent>
      </Tabs>
    </main>
  );
}
