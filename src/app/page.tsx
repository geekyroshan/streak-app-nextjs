"use client";

import { Hero } from '@/components/hero/Hero';
import { Features } from '@/components/features/Features';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect } from 'react';

export default function Home() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Handle OAuth callback parameters that might be directed to root URL
  useEffect(() => {
    const code = searchParams.get('code');
    const error = searchParams.get('error');
    
    // If we have an OAuth code on the root page, redirect to the proper callback handler
    if (code) {
      console.log('Detected GitHub OAuth code on root page, redirecting to proper handler');
      const callbackUrl = `/auth/callback?code=${encodeURIComponent(code)}`;
      
      // Use window.location for a full page load to ensure proper handling
      window.location.href = callbackUrl;
    } else if (error) {
      console.error('OAuth error detected:', error);
    }
  }, [searchParams]);

  return (
    <main>
      <Hero />
      <Features />
    </main>
  );
}
