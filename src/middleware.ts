import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Main middleware function that checks authentication for protected routes
 * and redirects unauthenticated users to the login page
 */
export async function middleware(request: NextRequest) {
  console.log('Middleware executing for:', request.nextUrl.pathname);
  
  // List of public routes that don't require authentication
  const publicRoutes = ['/', '/login', '/auth/callback'];
  
  // Check if the current path is public or has a public prefix
  const isPublicRoute = publicRoutes.some(route => 
    request.nextUrl.pathname === route) || 
    request.nextUrl.pathname.startsWith('/auth/') ||
    request.nextUrl.pathname.startsWith('/api/auth/');
  
  // Don't check auth for public routes, images or other static assets
  if (
    isPublicRoute ||
    request.nextUrl.pathname.includes('.') ||
    request.nextUrl.pathname.startsWith('/_next')
    // We've removed the blanket exclusion for all API routes
  ) {
    console.log(`Middleware: allowing public access to ${request.nextUrl.pathname}`);
    return NextResponse.next();
  }

  try {
    // Create a response object
    const res = NextResponse.next();
    
    // Create a Supabase client for the middleware
    // This is fine as it uses a different method for handling cookies
    const supabase = createMiddlewareClient({ req: request, res });
    
    // Get the user's session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.error("Error getting session in middleware:", sessionError);
      return redirectToLogin(request, 'session_error');
    }
    
    console.log('Middleware auth check:', { 
      path: request.nextUrl.pathname, 
      hasSession: !!session,
      userId: session?.user?.id?.slice(0, 8) || 'none', // Only log part of the ID for privacy
    });

    // If no session and trying to access protected route, redirect to login
    if (!session || !session.user) {
      console.log(`Redirecting unauthenticated user from ${request.nextUrl.pathname} to /`);
      return redirectToLogin(request);
    }
    
    // Check if the session is expired
    if (session.expires_at && isSessionExpired(session.expires_at)) {
      console.log('Session expired, redirecting to login');
      return redirectToLogin(request, 'session_expired');
    }
    
    // User is authenticated, allow access to protected route
    // Add the user ID to the headers for potential server component use
    res.headers.set('x-user-id', session.user.id);
    
    // Add cache control headers to prevent caching of protected pages
    res.headers.set('Cache-Control', 'no-store, max-age=0, must-revalidate');
    res.headers.set('Pragma', 'no-cache');
    res.headers.set('Expires', '0');
    
    return res;
  } catch (error) {
    console.error('Middleware auth error:', error);
    // If auth check fails, redirect to login
    return redirectToLogin(request, 'auth_middleware_error');
  }
}

/**
 * Helper function to redirect unauthenticated users to the login page
 */
function redirectToLogin(request: NextRequest, error?: string): NextResponse {
  const redirectUrl = new URL('/', request.url);
  
  // Add the error query parameter if provided
  if (error) {
    redirectUrl.searchParams.set('error', error);
  }
  
  // Add the original URL as a redirect parameter
  redirectUrl.searchParams.set('redirect', request.nextUrl.pathname);
  
  const response = NextResponse.redirect(redirectUrl);
  
  // Add cache control headers to prevent caching
  response.headers.set('Cache-Control', 'no-store, max-age=0, must-revalidate');
  response.headers.set('Pragma', 'no-cache');
  response.headers.set('Expires', '0');
  
  return response;
}

/**
 * Helper function to check if a session is expired
 */
function isSessionExpired(expiresAt: number): boolean {
  // Convert seconds to milliseconds (Supabase expires_at is in seconds)
  const expiryTime = expiresAt * 1000;
  const currentTime = Date.now();
  
  // Return true if the session is expired
  return currentTime >= expiryTime;
}

// Specify the paths that this middleware should run on
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}; 