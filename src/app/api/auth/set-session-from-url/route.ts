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
    
    // Create Supabase client
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
    
    // Create a response with explicit no-cache headers
    const response = NextResponse.json({ success: true });
    response.headers.set('Cache-Control', 'no-store, max-age=0');
    
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