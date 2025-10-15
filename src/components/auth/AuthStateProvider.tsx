'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { User, Session } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';

interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

const AuthStateContext = createContext<AuthState | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthStateContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthStateProvider');
  }
  return context;
}

interface AuthStateProviderProps {
  children: React.ReactNode;
}

export function AuthStateProvider({ children }: AuthStateProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      try {
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        if (error) {
          console.warn('Error getting initial session:', error);
          setSession(null);
          setUser(null);
        } else {
          setSession(session);
          setUser(session?.user ?? null);
        }
      } catch (error) {
        console.error('Error in getInitialSession:', error);
        setSession(null);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    getInitialSession();

    // Listen for auth changes with enhanced error handling
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (process.env.NODE_ENV === 'development') {
        console.log('Auth state change:', event, session ? 'user authenticated' : 'no user');
      }

      try {
        if (event === 'SIGNED_IN' && session) {
          setUser(session.user);
          setSession(session);
          if (process.env.NODE_ENV === 'development') {
            console.log('User signed in successfully');
          }
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
          setSession(null);
          if (process.env.NODE_ENV === 'development') {
            console.log('User signed out');
          }
          // Optional: redirect to sign-in page
          // router.push('/sign-in');
        } else if (event === 'TOKEN_REFRESHED' && session) {
          setUser(session.user);
          setSession(session);
          if (process.env.NODE_ENV === 'development') {
            console.log('Token refreshed successfully');
          }
        } else if (event === 'USER_UPDATED' && session) {
          setUser(session.user);
          setSession(session);
          if (process.env.NODE_ENV === 'development') {
            console.log('User updated successfully');
          }
        } else if (event === 'PASSWORD_RECOVERY') {
          if (process.env.NODE_ENV === 'development') {
            console.log('Password recovery initiated');
          }
        }
      } catch (error) {
        console.error('Error handling auth state change:', error);
      }

      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase.auth, router]);

  const signOut = async () => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Error signing out:', error);
        throw error;
      }
      // Clear local state immediately
      setUser(null);
      setSession(null);
      router.push('/sign-in');
    } catch (error) {
      console.error('Sign out error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const refreshSession = async () => {
    try {
      setLoading(true);
      const {
        data: { session },
        error,
      } = await supabase.auth.refreshSession();

      if (error) {
        console.error('Error refreshing session:', error);
        // If refresh fails, sign out user
        await signOut();
        throw error;
      }

      if (session) {
        setSession(session);
        setUser(session.user);
        if (process.env.NODE_ENV === 'development') {
          console.log('Session refreshed successfully');
        }
      }
    } catch (error) {
      console.error('Refresh session error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const value: AuthState = {
    user,
    session,
    loading,
    signOut,
    refreshSession,
  };

  return <AuthStateContext.Provider value={value}>{children}</AuthStateContext.Provider>;
}
