'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { AuthContainer } from '@/components/auth-container';

export default function AuthDebugPage() {
  const [urlInfo, setUrlInfo] = useState<any>(null);
  const [authState, setAuthState] = useState<any>(null);
  const [sessionInfo, setSessionInfo] = useState<any>(null);
  const supabase = createClient();

  useEffect(() => {
    // Parse URL information
    const url = window.location.href;
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const searchParams = new URLSearchParams(window.location.search);

    const urlData = {
      fullUrl: url,
      pathname: window.location.pathname,
      search: window.location.search,
      hash: window.location.hash,
      hashParams: Object.fromEntries(hashParams.entries()),
      searchParams: Object.fromEntries(searchParams.entries()),
    };

    setUrlInfo(urlData);

    // Get current auth state
    const getAuthState = async () => {
      try {
        const { data: { user }, error } = await supabase.auth.getUser();
        const { data: { session } } = await supabase.auth.getSession();
        
        setAuthState({ user, error });
        setSessionInfo(session);
      } catch (error) {
        setAuthState({ error });
      }
    };

    getAuthState();
  }, [supabase.auth]);

  const handleSetSession = async () => {
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const accessToken = hashParams.get('access_token');
    const refreshToken = hashParams.get('refresh_token');

    if (accessToken && refreshToken) {
      try {
        const { data, error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });

        if (error) {
          alert(`Error setting session: ${error.message}`);
        } else {
          alert('Session set successfully!');
          window.location.reload();
        }
      } catch (error) {
        alert(`Error: ${error}`);
      }
    } else {
      alert('No access_token or refresh_token found in URL');
    }
  };

  return (
    <AuthContainer 
      title="Auth Debug" 
      subtitle="Debug magic link authentication"
    >
      <div className="space-y-6">
        {/* URL Information */}
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
          <h3 className="font-medium text-blue-900 mb-2">URL Information</h3>
          <pre className="text-xs bg-white p-2 rounded border overflow-auto max-h-40">
            {JSON.stringify(urlInfo, null, 2)}
          </pre>
        </div>

        {/* Auth State */}
        <div className="p-4 bg-green-50 border border-green-200 rounded-md">
          <h3 className="font-medium text-green-900 mb-2">Auth State</h3>
          <pre className="text-xs bg-white p-2 rounded border overflow-auto max-h-40">
            {JSON.stringify(authState, null, 2)}
          </pre>
        </div>

        {/* Session Information */}
        <div className="p-4 bg-purple-50 border border-purple-200 rounded-md">
          <h3 className="font-medium text-purple-900 mb-2">Session Information</h3>
          <pre className="text-xs bg-white p-2 rounded border overflow-auto max-h-40">
            {JSON.stringify(sessionInfo, null, 2)}
          </pre>
        </div>

        {/* Actions */}
        <div className="space-y-2">
          <button
            onClick={handleSetSession}
            className="w-full bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Try Setting Session from URL Tokens
          </button>
          
          <button
            onClick={() => window.location.reload()}
            className="w-full bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700"
          >
            Reload Page
          </button>

          <button
            onClick={() => {
              window.history.replaceState(null, '', window.location.pathname);
              window.location.reload();
            }}
            className="w-full bg-orange-600 text-white px-4 py-2 rounded hover:bg-orange-700"
          >
            Clear URL and Reload
          </button>
        </div>
      </div>
    </AuthContainer>
  );
} 