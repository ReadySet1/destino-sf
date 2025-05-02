'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

// Define specific types to replace "any"
type UserData = {
  id: string;
  email: string;
  created_at: string;
  [key: string]: unknown;
};

type ServerDebugData = {
  profile?: {
    found?: boolean;
    profile?: {
      isAdmin?: boolean;
      roleStringValue?: string;
      roleType?: string;
      roleUppercase?: string;
    };
  };
  [key: string]: unknown;
};

export default function AdminDebugPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [serverDebugData, setServerDebugData] = useState<ServerDebugData | null>(null);
  const [clientUser, setClientUser] = useState<UserData | null | undefined>(null);
  const supabase = createClient();

  // Get client-side auth data
  useEffect(() => {
    async function getClientAuth() {
      try {
        setLoading(true);

        // Get client-side user
        const { data: { user } } = await supabase.auth.getUser();
        setClientUser(user as unknown as UserData | undefined);

        // Fetch server-side debug data
        if (user) {
          const response = await fetch('/api/debug/admin-check');
          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Error fetching server debug data');
          }
          const data = await response.json();
          setServerDebugData(data);
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        setError(message);
        console.error('Debug fetch error:', err);
      } finally {
        setLoading(false);
      }
    }

    void getClientAuth();
  }, [supabase.auth]);

  const refreshData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get updated client-side user
      const { data: { user } } = await supabase.auth.getUser();
      setClientUser(user as unknown as UserData | undefined);

      // Fetch updated server-side debug data
      if (user) {
        const response = await fetch('/api/debug/admin-check');
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Error fetching server debug data');
        }
        const data = await response.json();
        setServerDebugData(data);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const makeAdminRequest = async () => {
    try {
      const response = await fetch('/admin', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      alert(
        `Admin page request status: ${response.status} ${response.statusText}\nRedirected to: ${response.url}`
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      alert(`Error accessing admin page: ${message}`);
    }
  };

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      // code here
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase.auth]);

  return (
    <div className="container mx-auto py-10 space-y-6">
      <h1 className="text-3xl font-bold">Admin Access Debug</h1>

      <div className="flex gap-4">
        <Button onClick={() => void refreshData()} disabled={loading}>
          {loading ? 'Loading...' : 'Refresh Data'}
        </Button>
        <Button onClick={() => void makeAdminRequest()} variant="outline">
          Test Admin Page Access
        </Button>
      </div>

      {error && (
        <Card className="bg-red-50">
          <CardHeader>
            <CardTitle className="text-red-500">Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p>{error}</p>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Client Auth Status</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p>Loading...</p>
            ) : clientUser ? (
              <div>
                <p>
                  <strong>User ID:</strong> {clientUser.id}
                </p>
                <p>
                  <strong>Email:</strong> {clientUser.email}
                </p>
                <p>
                  <strong>Created:</strong> {new Date(clientUser.created_at).toLocaleString()}
                </p>
                <pre className="bg-gray-100 p-3 rounded-md mt-3 overflow-auto max-h-60 text-xs">
                  {JSON.stringify(clientUser, null, 2)}
                </pre>
              </div>
            ) : (
              <p>Not authenticated</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Server Debug Data</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p>Loading...</p>
            ) : serverDebugData ? (
              <div className="overflow-auto max-h-96">
                <pre className="bg-gray-100 p-3 rounded-md text-xs">
                  {JSON.stringify(serverDebugData, null, 2)}
                </pre>
              </div>
            ) : (
              <p>No server data available</p>
            )}
          </CardContent>
        </Card>
      </div>

      {serverDebugData?.profile?.found && (
        <Card
          className={serverDebugData?.profile?.profile?.isAdmin ? 'bg-green-50' : 'bg-yellow-50'}
        >
          <CardHeader>
            <CardTitle>
              {serverDebugData?.profile?.profile?.isAdmin
                ? '✅ Admin Access Should Work'
                : '❌ Not an Admin'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p>
              <strong>Role:</strong> {serverDebugData?.profile?.profile?.roleStringValue}
            </p>
            <p>
              <strong>Role Type:</strong> {serverDebugData?.profile?.profile?.roleType}
            </p>
            <p>
              <strong>Role Uppercase:</strong> {serverDebugData?.profile?.profile?.roleUppercase}
            </p>
            <p>
              <strong>Is Admin:</strong> {serverDebugData?.profile?.profile?.isAdmin ? 'Yes' : 'No'}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
