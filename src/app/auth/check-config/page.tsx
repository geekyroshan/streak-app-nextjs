"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

export default function CheckOAuthConfig() {
  const [siteUrl, setSiteUrl] = useState<string>('');
  const [callbackUrl, setCallbackUrl] = useState<string>('');
  const [actualCallback, setActualCallback] = useState<string>('');
  const [isClient, setIsClient] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setIsClient(true);
    setSiteUrl(process.env.NEXT_PUBLIC_SITE_URL || window.location.origin);
    setCallbackUrl(`${process.env.NEXT_PUBLIC_SITE_URL || window.location.origin}/auth/callback`);
    
    // Extract actual callback URL from login button's configuration
    try {
      fetch('/api/auth/config')
        .then(res => res.json())
        .then(data => {
          if (data.callbackUrl) {
            setActualCallback(data.callbackUrl);
          }
        })
        .catch(err => console.error('Failed to fetch OAuth config:', err));
    } catch (err) {
      console.error('Error checking config:', err);
    }
  }, []);

  const handleTestSignIn = () => {
    // Trigger sign in to test our callback handling
    const testUrl = `${callbackUrl}?code=test-code&state=test-state`;
    window.location.href = testUrl;
  };

  const handleFixCallback = () => {
    // Show instructions to fix the callback URL
    alert("To fix the callback URL:\n\n1. Go to your GitHub OAuth App settings\n2. Update the Authorization callback URL to: " + callbackUrl + "\n3. Save changes");
  };

  if (!isClient) {
    return null;
  }

  return (
    <div className="container mx-auto p-8 max-w-3xl">
      <h1 className="text-3xl font-bold mb-6">GitHub OAuth Configuration Check</h1>
      
      <div className="bg-card p-6 rounded-lg border border-border mb-6">
        <h2 className="text-xl font-semibold mb-4">Current Configuration</h2>
        
        <div className="space-y-4">
          <div>
            <p className="font-medium">Site URL:</p>
            <code className="block bg-muted p-2 rounded mt-1">{siteUrl}</code>
          </div>
          
          <div>
            <p className="font-medium">Expected Callback URL:</p>
            <code className="block bg-muted p-2 rounded mt-1">{callbackUrl}</code>
          </div>

          <div>
            <p className="font-medium">Actual Callback URL (if available):</p>
            <code className="block bg-muted p-2 rounded mt-1">{actualCallback || 'Not available'}</code>
            
            {actualCallback && actualCallback !== callbackUrl && (
              <div className="mt-2 p-3 bg-destructive/10 text-destructive rounded">
                <p className="font-medium">⚠️ Mismatch Detected</p>
                <p className="text-sm mt-1">
                  Your actual callback URL doesn't match the expected one. This could be why GitHub OAuth redirects are not working properly.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
      
      <div className="bg-card p-6 rounded-lg border border-border mb-6">
        <h2 className="text-xl font-semibold mb-4">Troubleshooting</h2>
        
        <p className="mb-4">
          If you're having issues with GitHub OAuth redirects, make sure:
        </p>
        
        <ul className="list-disc pl-5 space-y-2 mb-6">
          <li>The callback URL in your GitHub OAuth App matches <code>{callbackUrl}</code></li>
          <li>Your <code>NEXT_PUBLIC_SITE_URL</code> environment variable is set correctly</li>
          <li>Both the root path handler and callback handler are working</li>
        </ul>
        
        <div className="flex gap-4">
          <Button variant="outline" onClick={handleFixCallback}>
            How to Fix Callback URL
          </Button>
          
          <Button onClick={handleTestSignIn}>
            Test Callback Handler
          </Button>
        </div>
      </div>
      
      <Button variant="secondary" onClick={() => router.push('/')}>
        Back to Home
      </Button>
    </div>
  );
} 