import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const error = requestUrl.searchParams.get('error');
  
  // Enhanced logging for troubleshooting
  console.log('Auth callback received', { 
    path: requestUrl.pathname,
    hasCode: !!code, 
    error: error || 'none',
    searchParams: Object.fromEntries(requestUrl.searchParams.entries())
  });

  if (error) {
    console.error('OAuth provider returned an error:', error);
    return NextResponse.redirect(new URL(`/?error=${error}`, request.url));
  }

  try {
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
    
    if (code) {
      // Exchange the code for a session
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);
      
      if (error) {
        console.error('Error exchanging code for session:', error);
        return NextResponse.redirect(new URL(`/?error=auth_callback_error&message=${encodeURIComponent(error.message)}`, request.url));
      }
      
      // Success - Log that we got the session
      console.log('Successfully exchanged code for session', { user: data.session?.user.email });
      
      // Redirect to dashboard
      return NextResponse.redirect(new URL('/dashboard', request.url));
    } else {
      // If no code provided, check if we might be in a fragment URL case
      // Use client-side script to handle the fragment, since Next.js route handlers can't access URL fragments
      return new NextResponse(
        `
        <!DOCTYPE html>
        <html>
          <head>
            <title>Authenticating...</title>
          </head>
          <body>
            <p>Authenticating...</p>
            <script>
              // Check if we have a hash fragment with access_token
              if (window.location.hash && window.location.hash.includes('access_token=')) {
                // We have a token in the URL fragment - Supabase might be using implicit flow
                console.log('Token found in URL fragment, attempting to set session');
                
                // Use Supabase JS client to set the session from the hash
                try {
                  fetch('/api/auth/set-session-from-url', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ url: window.location.href })
                  })
                  .then(response => response.json())
                  .then(data => {
                    if (data.success) {
                      window.location.href = '/dashboard';
                    } else {
                      window.location.href = '/?error=' + encodeURIComponent(data.error || 'session_error');
                    }
                  })
                  .catch(error => {
                    console.error('Error setting session from URL:', error);
                    window.location.href = '/?error=session_fetch_error';
                  });
                } catch (err) {
                  console.error('Error in auth fragment handling:', err);
                  window.location.href = '/?error=auth_fragment_error';
                }
              } else {
                console.error('No authentication code or token found');
                window.location.href = '/?error=no_auth_params';
              }
            </script>
          </body>
        </html>
        `,
        {
          headers: {
            'Content-Type': 'text/html',
          },
        }
      );
    }
  } catch (err) {
    console.error('Callback error:', err);
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.redirect(new URL(`/?error=auth_exception&message=${encodeURIComponent(message)}`, request.url));
  }
} 