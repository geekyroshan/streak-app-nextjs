"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
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
  const [authInitialized, setAuthInitialized] = useState<boolean>(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  // Handle fresh parameter for forced reload after auth
  useEffect(() => {
    const fresh = searchParams?.get('fresh');
    if (fresh === 'true' && !authInitialized) {
      console.log('Auth context: Fresh login detected, waiting for auth initialization');
    }
  }, [searchParams, authInitialized]);

  // This effect handles both the initial session setup and auth state changes
  useEffect(() => {
    console.log('Setting up auth context...');
    let mounted = true;
    
    // Keep track of auth state initialization
    let initialSessionChecked = false;
    let initializationRetries = 0;
    const MAX_RETRIES = 3;
    
    // Function to handle new session data
    const handleSessionUpdate = async (newSession: Session | null) => {
      if (!mounted) return;
      
      console.log('Auth context: Handling session update, session exists:', !!newSession);
      if (newSession?.user) {
        console.log('Auth context: User ID in session:', newSession.user.id);
        console.log('Auth context: User email:', newSession.user.email);
        console.log('Auth context: User metadata available:', !!newSession.user.user_metadata);
      }
      
      // Update state with session data
      setSession(newSession);
      setUser(newSession?.user ?? null);
      
      // If there's a valid session and user data, create/update the user record in Supabase
      if (newSession?.user) {
        try {
          console.log('Creating/updating user record in database');
          console.log('User ID:', newSession.user.id);
          console.log('User metadata:', JSON.stringify(newSession.user.user_metadata, null, 2));
          
          // Create user object with all required fields including github_username
          const userData = {
            id: newSession.user.id,
            email: newSession.user.email,
            auth_id: newSession.user.id,
            last_login: new Date().toISOString(),
            avatar_url: newSession.user.user_metadata?.avatar_url || null,
            display_name: newSession.user.user_metadata?.full_name || 
                        newSession.user.user_metadata?.user_name || 
                        newSession.user.user_metadata?.name || 
                        'GitHub User',
            github_username: newSession.user.user_metadata?.user_name || null
          };
          
          // Upsert user data
          const { error } = await supabase.from('users').upsert(
            userData, 
            { onConflict: 'auth_id', ignoreDuplicates: false }
          );
          
          if (error) {
            console.error('Error updating user record:', error);
          } else {
            console.log('Successfully created/updated user record');
          }
        } catch (err) {
          console.error('Error updating user record:', err);
        }
      }
      
      // Only set loading to false after we've handled the session
      if (initialSessionChecked) {
        setIsLoading(false);
        setAuthInitialized(true);
      }
    };

    // Get the initial session
    const setupInitialSession = async () => {
      try {
        console.log('Fetching initial session...');
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Error retrieving initial session:', error);
          setError(error.message);
          setIsLoading(false);
          return;
        }
        
        console.log('Initial session retrieved:', data.session ? 'Session exists' : 'No session');
        initialSessionChecked = true;
        
        if (!data.session && initializationRetries < MAX_RETRIES) {
          console.log(`Auth context: No session found, retry attempt ${initializationRetries + 1}/${MAX_RETRIES}`);
          initializationRetries++;
          // Wait 1 second and try again
          setTimeout(setupInitialSession, 1000);
          return;
        }
        
        // Handle the session data
        await handleSessionUpdate(data.session);
      } catch (err) {
        console.error('Error during initial session setup:', err);
        setError(err instanceof Error ? err.message : 'An unknown error occurred');
        setIsLoading(false);
      }
    };

    // Start the session setup process
    setupInitialSession();

    // Subscribe to auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        console.log('Auth state changed:', event);
        
        // Handle different auth events
        switch (event) {
          case 'SIGNED_IN':
            console.log('User signed in, updating session');
            await handleSessionUpdate(newSession);
            // Force a reload after sign-in to ensure components have the latest auth state
            if (window.location.href.indexOf('fresh=true') === -1) {
              console.log('Auth context: Redirecting with fresh=true after sign in');
              const currentPath = window.location.pathname;
              window.location.href = `${currentPath}?fresh=true&_=${Date.now()}`;
            }
            break;
            
          case 'SIGNED_OUT':
            console.log('User signed out, clearing session');
            setUser(null);
            setSession(null);
            setIsLoading(false);
            break;
            
          case 'TOKEN_REFRESHED':
            console.log('Token refreshed, updating session');
            await handleSessionUpdate(newSession);
            break;
            
          case 'USER_UPDATED':
            console.log('User updated, updating session');
            await handleSessionUpdate(newSession);
            break;
            
          default:
            console.log('Other auth event:', event);
            await handleSessionUpdate(newSession);
        }
      }
    );

    // Clean up subscription on unmount
    return () => {
      console.log('Cleaning up auth context...');
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
          skipBrowserRedirect: false
        }
      });
      
      if (error) {
        throw error;
      }
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
      
      // Clear local state first
      setUser(null);
      setSession(null);
      
      // Clear cookies and local storage
      clearAuthCookies();
      clearLocalSession();
      
      // Sign out from Supabase
      const { error } = await supabase.auth.signOut({
        scope: 'global'
      });
      
      if (error) {
        throw error;
      }
      
      console.log('Sign out successful, redirecting');
      
      // Use a more direct and reliable approach to redirect
      // Force a hard reload to the root URL to ensure clean state
      window.location.replace('/');
    } catch (err) {
      console.error('Error signing out:', err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
      setIsLoading(false);
      
      // Even on error, attempt to redirect to ensure the user isn't stuck
      window.location.replace('/');
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