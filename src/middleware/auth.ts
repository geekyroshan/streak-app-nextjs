/**
 * Auth middleware utilities
 */
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { type Session } from '@supabase/supabase-js';

/**
 * Cookie options interface
 */
interface CookieOptions {
  name: string;
  domain?: string;
  path: string;
  sameSite: 'strict' | 'lax' | 'none';
  secure: boolean;
}

/**
 * Constants for cookie settings
 */
export const AUTH_COOKIE_OPTIONS: CookieOptions = {
  name: 'sb-auth-token',
  domain: process.env.NEXT_PUBLIC_COOKIE_DOMAIN || undefined,
  path: '/',
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production',
};

/**
 * Clear all auth-related cookies from the browser
 * This is used to ensure a clean logout
 */
export const clearAuthCookies = () => {
  // If running on the client, clear cookies using document.cookie
  if (typeof document !== 'undefined') {
    // Clear potential Supabase auth cookies by setting them to expire
    const cookiesToClear = [
      'sb-refresh-token',
      'sb-access-token',
      'supabase-auth-token',
      'sb-auth-token',
      'sb-provider-token',
    ];
    
    cookiesToClear.forEach(cookieName => {
      document.cookie = `${cookieName}=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT; ${AUTH_COOKIE_OPTIONS.secure ? 'Secure; ' : ''}SameSite=${AUTH_COOKIE_OPTIONS.sameSite}`;
      
      // Also try with the domain if set
      if (AUTH_COOKIE_OPTIONS.domain) {
        document.cookie = `${cookieName}=; Path=/; Domain=${AUTH_COOKIE_OPTIONS.domain}; Expires=Thu, 01 Jan 1970 00:00:01 GMT; ${AUTH_COOKIE_OPTIONS.secure ? 'Secure; ' : ''}SameSite=${AUTH_COOKIE_OPTIONS.sameSite}`;
      }
    });
    
    console.log('Auth cookies cleared');
  }
};

/**
 * Check if a session exists in local storage
 * This is a client-side only function
 */
export const hasLocalSession = (): boolean => {
  if (typeof localStorage === 'undefined') {
    return false;
  }
  
  // Check for Supabase session in localStorage
  const hasSupabaseSession = 
    localStorage.getItem('supabase.auth.token') !== null || 
    localStorage.getItem('sb-refresh-token') !== null;
    
  return hasSupabaseSession;
};

/**
 * Manually clear any stored session data in localStorage
 * This is a client-side only function
 */
export const clearLocalSession = (): void => {
  if (typeof localStorage === 'undefined') {
    return;
  }
  
  // Clear known Supabase localStorage keys
  const keysToRemove = [
    'supabase.auth.token',
    'sb-refresh-token',
    'sb-access-token',
    'supabase-auth',
  ];
  
  keysToRemove.forEach(key => {
    try {
      localStorage.removeItem(key);
    } catch (e) {
      console.error(`Error removing ${key} from localStorage:`, e);
    }
  });
  
  console.log('Local session data cleared');
};

/**
 * Complete logout helper that clears both cookies and local storage
 * and calls the Supabase signOut method
 */
export const completeSignOut = async (): Promise<void> => {
  try {
    // Clear cookies
    clearAuthCookies();
    
    // Clear localStorage
    clearLocalSession();
    
    // Sign out from Supabase
    const supabase = createClientComponentClient();
    await supabase.auth.signOut({ scope: 'global' });
    
    console.log('Complete sign out successful');
  } catch (error) {
    console.error('Error during complete sign out:', error);
  }
};

/**
 * Parse a JWT token and check if it has expired
 */
export const isTokenExpired = (token: string): boolean => {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));

    const { exp } = JSON.parse(jsonPayload);
    const currentTime = Math.floor(Date.now() / 1000);
    
    return currentTime >= exp;
  } catch (e) {
    console.error('Error parsing token:', e);
    // If we can't parse the token, assume it's expired
    return true;
  }
}; 