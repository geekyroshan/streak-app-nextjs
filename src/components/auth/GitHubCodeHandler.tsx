"use client";

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';

export function GitHubCodeHandler() {
  const searchParams = useSearchParams();
  
  useEffect(() => {
    // Check if we have a GitHub OAuth code in the URL
    const code = searchParams?.get('code');
    
    if (code) {
      console.log('GitHub OAuth code detected in URL, redirecting to auth callback');
      // Redirect to the auth callback route with the code
      window.location.href = `/auth/callback?code=${code}`;
    }
  }, [searchParams]);
  
  // This component doesn't render anything
  return null;
} 