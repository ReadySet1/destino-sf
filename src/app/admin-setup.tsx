'use client';

import { useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { toast } from 'sonner';

interface User {
  id: string;
  email: string;
  name?: string;
  role?: string;
  // add other properties as needed
}

export default function AdminSetup() {
  const [isLoading, setIsLoading] = useState(false);
  const [secretKey, setSecretKey] = useState('');
  const [userId, setUserId] = useState('');
  const [email, setEmail] = useState('');
  const [userInfo, setUserInfo] = useState<User | null>(null);
  const supabase = createClient();

  const fetchUserInfo = async () => {
    try {
      const { data, error } = await supabase.auth.getUser();
      if (error) throw error;

      setUserInfo(data.user as User);
      if (data.user?.id) setUserId(data.user.id);
      if (data.user?.email) setEmail(data.user?.email);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast.error(`Error fetching user info: ${  errorMessage}`);
    }
  };

  const promoteToAdmin = async () => {
    if (!secretKey) {
      toast.error('Please enter the secret key');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/admin/promote-admin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          secretKey,
          userId: userId || undefined,
          email: email || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to promote user to admin');
      }

      toast.success(data.message || 'Successfully promoted to admin');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container max-w-xl mx-auto py-10">
      <Card>
        <CardHeader>
          <CardTitle>Admin Setup</CardTitle>
          <CardDescription>Promote your user account to an admin role</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Button variant="outline" onClick={() => void fetchUserInfo()} className="mb-4 w-full">
              Fetch Current User Info
            </Button>

            {userInfo && (
              <div className="bg-gray-50 p-4 rounded-md overflow-auto max-h-40">
                <pre className="text-xs">{JSON.stringify(userInfo, null, 2)}</pre>
              </div>
            )}
          </div>

          <div className="grid gap-2">
            <label htmlFor="userId" className="text-sm">
              User ID (will use current user if empty)
            </label>
            <Input
              id="userId"
              value={userId}
              onChange={e => setUserId(e.target.value)}
              placeholder="User ID from Supabase Auth"
            />
          </div>

          <div className="grid gap-2">
            <label htmlFor="email" className="text-sm">
              Email (required if creating new profile)
            </label>
            <Input
              id="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="User email"
            />
          </div>

          <div className="grid gap-2">
            <label htmlFor="secretKey" className="text-sm">
              Secret Key (required)
            </label>
            <Input
              id="secretKey"
              value={secretKey}
              onChange={e => setSecretKey(e.target.value)}
              type="password"
              placeholder="Enter the secret key"
            />
          </div>
        </CardContent>
        <CardFooter>
          <Button onClick={() => void promoteToAdmin()} disabled={isLoading} className="w-full">
            {isLoading ? 'Processing...' : 'Promote to Admin'}
          </Button>
        </CardFooter>
      </Card>

      <div className="mt-6 text-sm text-gray-500">
        <p>
          Note: After promoting your account to admin, you may need to refresh or sign in again to
          see the admin dashboard.
        </p>
        <p className="mt-2">
          Default secret key: <code>destino-sf-admin-secret</code> (change this in production)
        </p>
      </div>
    </div>
  );
}
