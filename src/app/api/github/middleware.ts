import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { createGitHubError, getCurrentRateLimit, isRateLimited } from '@/lib/github-client';
import { GitHubError } from '@/types/github';

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
 * Get GitHub token from request or environment
 */
export function getGitHubToken(req: NextRequest): string | null {
  // Check authorization header first
  const authHeader = req.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  
  // Otherwise try to get from environment
  return process.env.GITHUB_ACCESS_TOKEN || null;
}

/**
 * GitHub Auth middleware to validate token
 */
export async function withGitHubAuth(
  req: NextRequest,
  handler: (req: NextRequest, token: string) => Promise<NextResponse>
): Promise<NextResponse> {
  try {
    // Get token from request or environment
    const token = getGitHubToken(req);
    
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