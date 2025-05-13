import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';

export async function POST(request: Request) {
  try {
    const { url } = await request.json();
    
    if (!url) {
      return NextResponse.json(
        { success: false, error: 'No URL provided' },
        { status: 400 }
      );
    }
    
    console.log('Setting session from URL:', url);
    
    // Create Supabase client with explicit await
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
    
    // Extract tokens from URL
    const accessToken = extractParameterFromUrl(url, 'access_token');
    const refreshToken = extractParameterFromUrl(url, 'refresh_token');
    
    if (!accessToken || !refreshToken) {
      console.error('Missing tokens in URL:', { hasAccessToken: !!accessToken, hasRefreshToken: !!refreshToken });
      return NextResponse.json(
        { success: false, error: 'Missing authentication tokens' },
        { status: 400 }
      );
    }
    
    // Set the auth session from the URL (this works with both URL fragments and query params)
    const { data, error } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
    
    if (error) {
      console.error('Error setting session:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }
    
    // Verify we got a valid user session
    if (!data.session || !data.session.user) {
      console.error('Failed to establish user session');
      return NextResponse.json(
        { success: false, error: 'Failed to establish user session' },
        { status: 500 }
      );
    }
    
    console.log('Session successfully established for user:', data.session.user.email);
    
    // Log user metadata to debug github_username
    console.log('User metadata from session:', data.session.user.user_metadata);
    const githubUsername = data.session.user.user_metadata?.user_name || 
                            data.session.user.user_metadata?.preferred_username || null;
    console.log('GitHub username from metadata:', githubUsername);
    
    // Extract GitHub access token from provider token or OAuth access token
    const githubAccessToken = data.session.provider_token || 
                             data.session.access_token || 
                             extractParameterFromUrl(url, 'access_token') || 
                             null;
    console.log('GitHub access token available:', !!githubAccessToken);
    
    // Ensure the user record exists in our database after successful authentication
    try {
      // First check if user already exists
      const { data: existingUser, error: lookupError } = await supabase
        .from('users')
        .select('id, auth_id, github_username, github_access_token')
        .eq('auth_id', data.session.user.id)
        .single();
        
      if (lookupError && lookupError.code !== 'PGRST116') { // PGRST116 is "no rows returned" error
        console.error('Error checking for existing user:', lookupError);
      }
      
      console.log('Existing user check result:', existingUser || 'No user found');
      
      // Prepare user data with Github username from metadata
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
        github_username: githubUsername,
        github_access_token: githubAccessToken
      };
      
      // Ensure we're not overwriting existing github_username with null
      if (!userData.github_username && existingUser?.github_username) {
        console.log('Preserving existing github_username:', existingUser.github_username);
        userData.github_username = existingUser.github_username;
      }
      
      // Ensure we're not overwriting existing github_access_token with null
      if (!userData.github_access_token && existingUser?.github_access_token) {
        console.log('Preserving existing github_access_token');
        userData.github_access_token = existingUser.github_access_token;
      } else if (userData.github_access_token) {
        console.log('Storing new github_access_token');
      } else {
        console.error('No github_access_token available to store!');
      }
      
      const { error: upsertError } = await supabase.from('users').upsert(
        userData,
        { onConflict: 'auth_id' }
      );
      
      if (upsertError) {
        console.error('Error ensuring user record exists:', upsertError);
      } else {
        console.log('User record created/updated in database with github_username:', userData.github_username);
        console.log('GitHub token stored:', !!userData.github_access_token);
      }
    } catch (upsertErr) {
      console.error('Exception creating user record:', upsertErr);
      // Don't fail the auth process if the user record creation fails
    }
    
    // Create a response with explicit no-cache headers
    const response = NextResponse.json({ success: true });
    response.headers.set('Cache-Control', 'no-store, max-age=0');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
    
    return response;
  } catch (error) {
    console.error('Error in set-session-from-url:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// Helper function to extract parameters from URL (works with both fragments and query params)
function extractParameterFromUrl(url: string, param: string): string {
  // Try to extract from URL fragment
  const hashMatch = new RegExp(`#.*${param}=([^&]*)(&|$)`).exec(url);
  if (hashMatch) return hashMatch[1];
  
  // Try to extract from URL query parameters
  const queryMatch = new RegExp(`[?&]${param}=([^&]*)(&|$)`).exec(url);
  if (queryMatch) return queryMatch[1];
  
  return '';
} 