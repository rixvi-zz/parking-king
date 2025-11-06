import { NextRequest, NextResponse } from 'next/server';
import { getSecurityHeaders, applyCORSHeaders, defaultCORSOptions } from '@/lib/security/headers';

// Paths that don't need authentication
const publicPaths = [
  '/',
  '/login',
  '/register',
  '/search',
  '/api/auth/login',
  '/api/auth/register',
  '/api/parking-spots/search',
  '/api/health',
];

// Paths that require authentication
const protectedPaths = [
  '/dashboard',
  '/profile',
  '/bookings',
  '/host',
  '/api/bookings',
  '/api/vehicles',
  '/api/user',
];

// API paths that need CORS
const apiPaths = [
  '/api/',
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const origin = request.headers.get('origin');

  // Create response
  let response = NextResponse.next();

  // Apply security headers to all requests
  const securityHeaders = getSecurityHeaders();
  Object.entries(securityHeaders).forEach(([key, value]) => {
    response.headers.set(key, value);
  });

  // Apply CORS headers to API routes
  if (apiPaths.some(path => pathname.startsWith(path))) {
    response = applyCORSHeaders(response, origin, defaultCORSOptions);
    
    // Handle preflight requests
    if (request.method === 'OPTIONS') {
      return new NextResponse(null, { 
        status: 200,
        headers: response.headers,
      });
    }
  }

  // Authentication check for protected routes
  if (protectedPaths.some(path => pathname.startsWith(path))) {
    const token = request.cookies.get('access_token')?.value || 
                  request.headers.get('authorization')?.replace('Bearer ', '');

    if (!token) {
      // Redirect to login for page routes
      if (!pathname.startsWith('/api/')) {
        const loginUrl = new URL('/login', request.url);
        loginUrl.searchParams.set('redirect', pathname);
        return NextResponse.redirect(loginUrl);
      }
      
      // Return 401 for API routes
      return NextResponse.json(
        { error: 'Authentication required' },
        { 
          status: 401,
          headers: response.headers,
        }
      );
    }
  }

  // Add additional security headers for sensitive pages
  if (pathname.startsWith('/dashboard') || pathname.startsWith('/profile')) {
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
  }

  // Add CSP nonce for pages that need it
  if (pathname.startsWith('/dashboard') || pathname.startsWith('/host')) {
    const nonce = Buffer.from(crypto.getRandomValues(new Uint8Array(16))).toString('base64');
    response.headers.set('X-CSP-Nonce', nonce);
  }

  return response;
}

// Configure which paths the middleware should run on
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};