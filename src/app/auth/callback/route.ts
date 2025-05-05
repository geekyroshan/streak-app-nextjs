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
    // Use cookies with await to avoid Next.js warnings
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
      
      // Make sure we have time to create user record before redirecting
      if (data.session?.user) {
        try {
          // Log user metadata to debug github_username
          console.log('User metadata from callback:', data.session.user.user_metadata);
          const githubUsername = data.session.user.user_metadata?.user_name || null;
          console.log('GitHub username from metadata:', githubUsername);
          
          // First check if user already exists
          const { data: existingUser, error: lookupError } = await supabase
            .from('users')
            .select('id, auth_id, github_username')
            .eq('auth_id', data.session.user.id)
            .single();
            
          if (lookupError && lookupError.code !== 'PGRST116') { // PGRST116 is "no rows returned" error
            console.error('Error checking for existing user in callback:', lookupError);
          }
          
          console.log('Existing user check result in callback:', existingUser || 'No user found');
          
          // Prepare user data with preserved github_username if needed
          const userData = {
            id: data.session.user.id,
            email: data.session.user.email,
            auth_id: data.session.user.id,
            last_login: new Date().toISOString(),
            avatar_url: data.session.user.user_metadata?.avatar_url || null,
            display_name: data.session.user.user_metadata?.full_name || 
                    data.session.user.user_metadata?.user_name || 
                    data.session.user.user_metadata?.name || 
                    'GitHub User',
            github_username: githubUsername
          };
          
          // Ensure we're not overwriting existing github_username with null
          if (!userData.github_username && existingUser?.github_username) {
            console.log('Preserving existing github_username in callback:', existingUser.github_username);
            userData.github_username = existingUser.github_username;
          }
          
          // Ensure user record exists in the database
          const { error: upsertError } = await supabase.from('users').upsert(
            userData, 
            { onConflict: 'auth_id' }
          );
          
          if (upsertError) {
            console.error('Error upserting user record in callback:', upsertError);
          } else {
            console.log('User record created/updated in callback handler with github_username:', userData.github_username);
          }
        } catch (dbError) {
          console.error('Error creating user record in callback:', dbError);
          // Continue even if db update fails
        }
      }
      
      // Generate a unique timestamp to prevent caching
      const timestamp = Date.now();
      
      // Redirect to dashboard with a flag to force reload
      return NextResponse.redirect(new URL(`/dashboard?fresh=true&_=${timestamp}`, request.url), {
        // Add cache-control headers to ensure no caching of this redirect
        headers: {
          'Cache-Control': 'no-store, max-age=0, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
    } else {
      // If no code provided, use an improved client-side script
      return new NextResponse(
        `
        <!DOCTYPE html>
        <html>
          <head>
            <title>Authenticating...</title>
            <meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate" />
            <meta http-equiv="Pragma" content="no-cache" />
            <meta http-equiv="Expires" content="0" />
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
                      // Force reload to ensure fresh session state
                      // Add a random query param to bust any cache
                      const timestamp = Date.now();
                      window.location.href = '/dashboard?fresh=true&_=' + timestamp;
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
            // Prevent caching to ensure fresh state
            'Cache-Control': 'no-store, max-age=0, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
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