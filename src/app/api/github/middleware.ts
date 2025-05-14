import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { createGitHubError, getCurrentRateLimit, isRateLimited } from '@/lib/github-client';
import { GitHubError } from '@/types/github';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

/**
 * GitHub API error response builder
 */
export function githubErrorResponse(error: GitHubError, status: number = 500) {
  return NextResponse.json(
    { error },
    { status, headers: { 'Cache-Control': 'no-store' } }
  );
}

/**
 * Get GitHub token from request, database, or environment
 */
export async function getGitHubToken(req: NextRequest): Promise<string | null> {
  // Check authorization header first
  const authHeader = req.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  
  try {
    // Try to get token from the current user in the database
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
    
    console.log('GitHub middleware: Attempting to get user session');
    
    // Get the current session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.error('GitHub middleware: Error retrieving session:', sessionError);
    }
    
    if (session?.user) {
      console.log('GitHub middleware: Session found, user ID:', session.user.id);
      console.log('GitHub middleware: User email:', session.user.email);
      
      // Get the user's GitHub token from the database
      const { data: userData, error } = await supabase
        .from('users')
        .select('github_access_token, github_username')
        .eq('auth_id', session.user.id)
        .single();
      
      if (error) {
        console.error('GitHub middleware: Error retrieving GitHub token from database:', error);
      } else if (!userData) {
        console.warn('GitHub middleware: User not found in database:', session.user.id);
      } else {
        console.log('GitHub middleware: User record found, GitHub username:', userData.github_username);
        console.log('GitHub middleware: GitHub token present in DB:', !!userData.github_access_token);
        
        if (userData.github_access_token) {
          console.log('GitHub middleware: Successfully retrieved GitHub token from database');
          return userData.github_access_token;
        } else {
          console.warn('GitHub middleware: No GitHub token found in database for user:', session.user.email);
          
          // If provider token is available in the session, use it
          if (session.provider_token) {
            console.log('GitHub middleware: Using provider_token from session as fallback');
            return session.provider_token;
          }
        }
      }
    } else {
      console.warn('GitHub middleware: No active session found');
    }
  } catch (error) {
    console.error('GitHub middleware: Error while trying to get GitHub token from database:', error);
  }
  
  // Otherwise try to get from environment
  const envToken = process.env.GITHUB_ACCESS_TOKEN;
  if (envToken) {
    console.log('GitHub middleware: Using GitHub token from environment variable as fallback');
    return envToken;
  }
  
  console.error('GitHub middleware: No GitHub token available from any source');
  return null;
}

/**
 * GitHub Auth middleware to validate token
 */
export async function withGitHubAuth(
  req: NextRequest,
  handler: (req: NextRequest, token: string) => Promise<NextResponse>
): Promise<NextResponse> {
  try {
    // Get token from request, database, or environment
    const token = await getGitHubToken(req);
    
    if (!token) {
      return githubErrorResponse(
        createGitHubError('GitHub API token is required', 'UNAUTHORIZED'),
        401
      );
    }
    
    // Check rate limit
    if (isRateLimited()) {
      return githubErrorResponse(
        createGitHubError(
          'GitHub API rate limit exceeded, please try again later',
          'RATE_LIMITED'
        ),
        429
      );
    }
    
    // Call the handler with the token
    return await handler(req, token);
  } catch (error: any) {
    console.error('GitHub API middleware error:', error);
    
    return githubErrorResponse(
      createGitHubError(
        error.message || 'Internal server error',
        error.code || 'INTERNAL_SERVER_ERROR',
        error.status
      ),
      error.status || 500
    );
  }
}

/**
 * Add rate limit info to response headers
 */
export function addRateLimitHeaders(response: NextResponse): NextResponse {
  const rateLimit = getCurrentRateLimit();
  
  if (rateLimit) {
    response.headers.set('X-RateLimit-Limit', rateLimit.limit.toString());
    response.headers.set('X-RateLimit-Remaining', rateLimit.remaining.toString());
    response.headers.set('X-RateLimit-Reset', rateLimit.reset.toString());
  }
  
  return response;
}

/**
 * Add caching headers to response based on age
 */
export function addCacheHeaders(response: NextResponse, maxAge: number = 60): NextResponse {
  response.headers.set('Cache-Control', `public, max-age=${maxAge}, s-maxage=${maxAge * 2}`);
  response.headers.set('Vary', 'Accept, Authorization');
  
  return response;
} 