import { NextRequest, NextResponse } from 'next/server';

// Root path handler that detects and redirects GitHub OAuth codes
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  
  // Check if this appears to be a GitHub OAuth callback
  if (code && state) {
    console.log('Root handler: Detected OAuth code, redirecting to proper callback handler');
    
    // Preserve all params in the redirect
    const callbackUrl = new URL('/auth/callback', request.url);
    url.searchParams.forEach((value, key) => {
      callbackUrl.searchParams.append(key, value);
    });
    
    return NextResponse.redirect(callbackUrl, {
      // Add cache-control headers to ensure no caching of this redirect
      headers: {
        'Cache-Control': 'no-store, max-age=0, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
  }
  
  // Otherwise, let the request continue to page.tsx
  return NextResponse.next();
} 