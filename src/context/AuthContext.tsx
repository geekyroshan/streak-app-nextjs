"use client";

import React, { createContext, useContext, useEffect, useState, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import type { User, Session } from '@supabase/supabase-js';
import { clearAuthCookies, clearLocalSession } from '@/middleware/auth';

// Move useSearchParams to a separate component
import { useSearchParams } from 'next/navigation';

function SearchParamsHandler({ setAuthInitialized }: { setAuthInitialized: React.Dispatch<React.SetStateAction<boolean>> }) {
  const searchParams = useSearchParams();
  
  useEffect(() => {
    const fresh = searchParams?.get('fresh');
    if (fresh === 'true') {
      console.log('Auth context: Fresh login detected, waiting for auth initialization');
    }
  }, [searchParams]);
  
  return null;
}

type AuthContextType = {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  error: string | null;
  signInWithGitHub: () => Promise<void>;
  signOut: () => Promise<void>;
  hasGitHubToken: boolean;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [authInitialized, setAuthInitialized] = useState<boolean>(false);
  const [hasGitHubToken, setHasGitHubToken] = useState<boolean>(false);
  const router = useRouter();

  // This effect handles both the initial session setup and auth state changes
  useEffect(() => {
    console.log('Setting up auth context...');
    let mounted = true;
    
    // Keep track of auth state initialization
    let initialSessionChecked = false;
    let initializationRetries = 0;
    let tokenRetries = 0;
    const MAX_RETRIES = 3;
    const MAX_TOKEN_RETRIES = 5;
    
    // Function to check for GitHub token
    const checkGitHubToken = async (userId: string): Promise<boolean> => {
      if (!mounted) return false;
      
      try {
        console.log('Auth context: Checking for GitHub token in database');
        const { data, error } = await supabase
          .from('users')
          .select('github_access_token')
          .eq('auth_id', userId)
          .single();
          
        if (error) {
          console.error('Auth context: Error checking GitHub token:', error);
          return false;
        }
        
        const hasToken = !!data?.github_access_token;
        console.log('Auth context: GitHub token available:', hasToken);
        setHasGitHubToken(hasToken);
        return hasToken;
      } catch (err) {
        console.error('Auth context: Failed to check GitHub token:', err);
        return false;
      }
    };
    
    // Function to handle new session data
    const handleSessionUpdate = async (newSession: Session | null) => {
      if (!mounted) return;
      
      console.log('Auth context: Handling session update, session exists:', !!newSession);
      if (newSession?.user) {
        console.log('Auth context: User ID in session:', newSession.user.id);
        console.log('Auth context: User email:', newSession.user.email);
        console.log('Auth context: User metadata available:', !!newSession.user.user_metadata);
        console.log('Auth context: Provider token available:', !!newSession.provider_token);
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
          
          // First check if user already exists to avoid overwriting github_username
          const { data: existingUser, error: lookupError } = await supabase
            .from('users')
            .select('id, auth_id, github_username, github_access_token')
            .eq('auth_id', newSession.user.id)
            .single();
          
          // Extract GitHub username from metadata
          const githubUsername = newSession.user.user_metadata?.user_name || null;
          console.log('GitHub username from metadata:', githubUsername);
          
          // Extract GitHub access token
          const githubAccessToken = newSession.provider_token || null;
          console.log('GitHub access token available in context:', !!githubAccessToken);
          
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
            github_username: githubUsername,
            github_access_token: githubAccessToken
          };
          
          // Preserve existing github_username if needed
          if (!userData.github_username && existingUser?.github_username) {
            console.log('Preserving existing github_username:', existingUser.github_username);
            userData.github_username = existingUser.github_username;
          }
          
          // Preserve existing token if needed
          if (!userData.github_access_token && existingUser?.github_access_token) {
            console.log('Preserving existing github_access_token');
            userData.github_access_token = existingUser.github_access_token;
          } else if (userData.github_access_token) {
            console.log('Storing new github_access_token in context');
          } else {
            console.warn('No github_access_token available in context to store!');
          }
          
          // Upsert user data
          const { error } = await supabase.from('users').upsert(
            userData, 
            { onConflict: 'auth_id', ignoreDuplicates: false }
          );
          
          if (error) {
            console.error('Error updating user record:', error);
          } else {
            console.log('Successfully created/updated user record');
            // Check for GitHub token after update
            await checkGitHubToken(newSession.user.id);
          }
        } catch (err) {
          console.error('Error updating user record:', err);
        }
        
        // If we don't have a token yet and still have retries, try again
        if (!hasGitHubToken && tokenRetries < MAX_TOKEN_RETRIES) {
          console.log(`Auth context: GitHub token not found, retry ${tokenRetries + 1}/${MAX_TOKEN_RETRIES}`);
          tokenRetries++;
          
          // Wait and retry checking for the token
          setTimeout(async () => {
            if (newSession?.user && mounted) {
              const hasToken = await checkGitHubToken(newSession.user.id);
              
              if (hasToken) {
                console.log('Auth context: GitHub token found on retry');
                setIsLoading(false);
              } else if (tokenRetries >= MAX_TOKEN_RETRIES) {
                console.warn('Auth context: Max token retries reached, proceeding anyway');
                setIsLoading(false);
              }
            }
          }, 1500); // 1.5 second delay between retries
        } else {
          // If we have the token or have exhausted retries, stop loading
          setIsLoading(false);
        }
      }
      
      // Only set loading to false after we've handled the session
      if (initialSessionChecked) {
        // If no user, set loading to false immediately
        if (!newSession?.user) {
          setIsLoading(false);
        }
        // If there is a user, loading will be set to false after token check
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
        
        // If we have a session with a user, check for GitHub token
        if (data.session?.user) {
          await checkGitHubToken(data.session.user.id);
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
            setHasGitHubToken(false);
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
  }, [hasGitHubToken]);

  const signInWithGitHub = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Get the site URL from environment variable or fallback to window.location.origin
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'github',
        options: {
          redirectTo: `${siteUrl}/auth/callback`,
          // Request necessary scopes for GitHub API access
          scopes: 'read:user user:email repo',
        },
      });

      if (error) {
        console.error('GitHub sign-in error:', error);
        setError(error.message);
      } else {
        console.log('Sign-in initiated, redirecting to GitHub...');
      }
    } catch (err) {
      console.error('Error during GitHub sign-in:', err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const signOut = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Sign out error:', error);
        setError(error.message);
      } else {
        // Clear session data
        setUser(null);
        setSession(null);
        setHasGitHubToken(false);
        
        // Clear cookies and local session data
        await clearAuthCookies();
        clearLocalSession();
        
        // Redirect to landing page
        router.push('/?logout=success');
      }
    } catch (err) {
      console.error('Error during sign out:', err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const value = {
    user,
    session,
    isLoading,
    error,
    signInWithGitHub,
    signOut,
    hasGitHubToken,
  };

  return (
    <AuthContext.Provider value={value}>
      {/* Wrap search params in Suspense */}
      <Suspense fallback={null}>
        <SearchParamsHandler setAuthInitialized={setAuthInitialized} />
      </Suspense>
      
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}