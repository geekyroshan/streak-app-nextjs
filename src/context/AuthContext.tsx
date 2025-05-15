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
        
        if (mounted) {
          setHasGitHubToken(hasToken);
        }
        return hasToken;
      } catch (err) {
        console.error('Auth context: Failed to check GitHub token:', err);
        return false;
      }
    };
    
    // Function to handle new user data
    const handleUserUpdate = async (newUser: User | null) => {
      if (!mounted) return;
      
      console.log('Auth context: Handling user update, user exists:', !!newUser);
      if (newUser) {
        console.log('Auth context: User ID:', newUser.id);
        console.log('Auth context: User email:', newUser.email);
        console.log('Auth context: User metadata available:', !!newUser.user_metadata);
      }
      
      // Update state with user data
      setUser(newUser);
      
      // If there's a valid user, create/update the user record in Supabase
      if (newUser) {
        try {
          console.log('Creating/updating user record in database');
          console.log('User ID:', newUser.id);
          console.log('User metadata:', JSON.stringify(newUser.user_metadata, null, 2));
          
          // Get current session to access provider token
          const { data: sessionData } = await supabase.auth.getSession();
          const currentSession = sessionData.session;
          
          // Save current session for context
          if (mounted && currentSession) {
            setSession(currentSession);
          }
          
          // First check if user already exists to avoid overwriting github_username
          const { data: existingUser, error: lookupError } = await supabase
            .from('users')
            .select('id, auth_id, github_username, github_access_token')
            .eq('auth_id', newUser.id)
            .single();
          
          // Extract GitHub username from metadata
          const githubUsername = newUser.user_metadata?.user_name || null;
          console.log('GitHub username from metadata:', githubUsername);
          
          // Extract GitHub access token
          const githubAccessToken = currentSession?.provider_token || null;
          console.log('GitHub access token available in context:', !!githubAccessToken);
          
          // Create user object with all required fields including github_username
          const userData = {
            id: newUser.id,
            email: newUser.email,
            auth_id: newUser.id,
            last_login: new Date().toISOString(),
            avatar_url: newUser.user_metadata?.avatar_url || null,
            display_name: newUser.user_metadata?.full_name || 
                        newUser.user_metadata?.user_name || 
                        newUser.user_metadata?.name || 
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
            const hasToken = await checkGitHubToken(newUser.id);
            
            if (mounted) {
              // Set loading state - only finish loading if we have token or explicitly don't
              setIsLoading(false);
              setAuthInitialized(true);
            }
          }
        } catch (err) {
          console.error('Error updating user record:', err);
          if (mounted) {
            setIsLoading(false);
            setAuthInitialized(true);
          }
        }
      } else {
        // No user, set loading to false immediately
        if (mounted) {
          setIsLoading(false);
          setAuthInitialized(true);
        }
      }
    };

    // Setup initial auth state using getUser() instead of getSession()
    const setupInitialAuth = async () => {
      try {
        console.log('Fetching authenticated user data...');
        // Get authenticated user - this is more secure than getSession()
        const { data: { user: authUser }, error: userError } = await supabase.auth.getUser();
        
        if (userError) {
          console.error('Error retrieving user:', userError);
          setError(userError.message);
          setIsLoading(false);
          return;
        }
        
        // Also get session for provider token
        const { data: { session: authSession }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('Error retrieving session:', sessionError);
        } else if (authSession) {
          setSession(authSession);
        }
        
        console.log('Initial auth state retrieved:', authUser ? 'User exists' : 'No user');
        
        // Handle the user data
        await handleUserUpdate(authUser);
      } catch (err) {
        console.error('Error during initial auth setup:', err);
        setError(err instanceof Error ? err.message : 'An unknown error occurred');
        setIsLoading(false);
      }
    };

    // Start the auth setup process
    setupInitialAuth();

    // Subscribe to auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        console.log('Auth state changed:', event);
        
        // Handle different auth events
        switch (event) {
          case 'SIGNED_IN':
            console.log('User signed in, updating session');
            // Get the authenticated user object
            const { data: { user: newUser } } = await supabase.auth.getUser();
            setSession(newSession);
            await handleUserUpdate(newUser);
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
            setSession(newSession);
            break;
            
          case 'USER_UPDATED':
            console.log('User updated, updating session');
            const { data: { user: updatedUser } } = await supabase.auth.getUser();
            setSession(newSession);
            await handleUserUpdate(updatedUser);
            break;
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