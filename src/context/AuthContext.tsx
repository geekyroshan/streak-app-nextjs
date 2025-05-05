import React, { createContext, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import type { User, Session } from '@supabase/supabase-js';
import { clearAuthCookies, clearLocalSession } from '@/middleware/auth';

type AuthContextType = {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  error: string | null;
  signInWithGitHub: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const setupSession = async () => {
      setIsLoading(true);
      try {
        // Get the initial session
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          throw error;
        }
        
        if (data?.session) {
          setSession(data.session);
          setUser(data.session.user);
        }
      } catch (err) {
        console.error('Error retrieving session:', err);
        setError(err instanceof Error ? err.message : 'An unknown error occurred');
      } finally {
        setIsLoading(false);
      }
    };

    let mounted = true;
    setupSession();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        if (!mounted) return;
        
        console.log('Auth state changed:', event);
        setSession(newSession);
        setUser(newSession?.user ?? null);

        if (event === 'SIGNED_IN' && newSession) {
          // Update user record in database when signed in
          try {
            const { error } = await supabase.from('users').upsert({
              id: newSession.user.id,
              email: newSession.user.email,
              auth_id: newSession.user.id,
              last_login: new Date().toISOString(),
              avatar_url: newSession.user.user_metadata.avatar_url || null,
              display_name: newSession.user.user_metadata.full_name || newSession.user.user_metadata.user_name || null
            });

            if (error) throw error;
          } catch (err) {
            console.error('Error updating user record:', err);
          }
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signInWithGitHub = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'github',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          scopes: 'read:user user:email',
          skipBrowserRedirect: false // Ensure the browser is redirected
        }
      });
      
      if (error) {
        throw error;
      }
      
      // No need to manually redirect - Supabase will handle this
      // The auth callback route will capture the code and exchange it for a session
    } catch (err) {
      console.error('Error signing in with GitHub:', err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
      setIsLoading(false);
    }
  };

  const signOut = async () => {
    setIsLoading(true);
    setError(null);
    try {
      console.log('Signing out...');
      
      // First, clear local state
      setUser(null);
      setSession(null);
      
      // Clear all auth cookies using our utility
      clearAuthCookies();
      
      // Clear localStorage
      clearLocalSession();
      
      // Then, sign out from Supabase - this should clear session cookies
      const { error } = await supabase.auth.signOut({
        scope: 'global' // Sign out from all tabs and devices
      });
      
      if (error) {
        throw error;
      }
      
      console.log('Sign out successful, redirecting to landing page');
      
      // Force a page refresh to ensure all states are cleared
      window.location.href = '/?logout=success';
    } catch (err) {
      console.error('Error signing out:', err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
      setIsLoading(false);
    }
  };

  const value = {
    user,
    session,
    isLoading,
    error,
    signInWithGitHub,
    signOut
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function useUser() {
  const { user } = useAuth();
  return user;
} 