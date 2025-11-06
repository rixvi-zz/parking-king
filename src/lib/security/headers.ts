import { NextResponse } from 'next/server';

// Security headers configuration
export const securityHeaders = {
  // Prevent MIME type sniffing
  'X-Content-Type-Options': 'nosniff',
  
  // Prevent clickjacking attacks
  'X-Frame-Options': 'DENY',
  
  // Enable XSS protection
  'X-XSS-Protection': '1; mode=block',
  
  // Control referrer information
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  
  // Permissions policy (formerly Feature Policy)
  'Permissions-Policy': [
    'geolocation=(self)',
    'microphone=()',
    'camera=()',
    'payment=(self)',
    'usb=()',
    'magnetometer=()',
    'gyroscope=()',
    'speaker=(self)',
    'vibrate=()',
    'fullscreen=(self)',
    'sync-xhr=()',
  ].join(', '),
  
  // Strict Transport Security (HTTPS only)
  ...(process.env.NODE_ENV === 'production' && {
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
  }),
  
  // Content Security Policy
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://maps.googleapis.com https://cdn.jsdelivr.net",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: blob: https: http:",
    "media-src 'self' data: blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "upgrade-insecure-requests",
  ].join('; '),
  
  // Cross-Origin policies
  'Cross-Origin-Embedder-Policy': 'credentialless',
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Resource-Policy': 'same-origin',
};

// Development-specific headers (less restrictive)
export const developmentHeaders = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'SAMEORIGIN',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://maps.googleapis.com https://cdn.jsdelivr.net",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: blob: https: http:",
    "media-src 'self' data: blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'self'",
  ].join('; '),
};

// Get appropriate headers based on environment
export function getSecurityHeaders() {
  return process.env.NODE_ENV === 'production' ? securityHeaders : developmentHeaders;
}

// Apply security headers to response
export function withSecurityHeaders(response: NextResponse): NextResponse {
  const headers = getSecurityHeaders();
  
  Object.entries(headers).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  
  return response;
}

// CORS configuration
export interface CORSOptions {
  allowedOrigins?: string[];
  allowedMethods?: string[];
  allowedHeaders?: string[];
  exposedHeaders?: string[];
  credentials?: boolean;
  maxAge?: number;
  preflightContinue?: boolean;
  optionsSuccessStatus?: number;
}

export const defaultCORSOptions: CORSOptions = {
  allowedOrigins: process.env.NODE_ENV === 'production' 
    ? [process.env.NEXT_PUBLIC_APP_URL || 'https://parking-king.com']
    : ['http://localhost:3000', 'http://127.0.0.1:3000'],
  allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
    'Origin',
    'Cache-Control',
    'X-File-Name',
  ],
  exposedHeaders: [
    'X-RateLimit-Limit',
    'X-RateLimit-Remaining',
    'X-RateLimit-Reset',
  ],
  credentials: true,
  maxAge: 86400, // 24 hours
  optionsSuccessStatus: 200,
};

// Apply CORS headers
export function applyCORSHeaders(
  response: NextResponse, 
  origin: string | null, 
  options: CORSOptions = defaultCORSOptions
): NextResponse {
  const {
    allowedOrigins = [],
    allowedMethods = [],
    allowedHeaders = [],
    exposedHeaders = [],
    credentials = false,
    maxAge = 86400,
  } = options;

  // Check if origin is allowed
  const isOriginAllowed = !origin || 
    allowedOrigins.length === 0 || 
    allowedOrigins.includes('*') || 
    allowedOrigins.includes(origin);

  if (isOriginAllowed) {
    response.headers.set('Access-Control-Allow-Origin', origin || '*');
  }

  if (allowedMethods.length > 0) {
    response.headers.set('Access-Control-Allow-Methods', allowedMethods.join(', '));
  }

  if (allowedHeaders.length > 0) {
    response.headers.set('Access-Control-Allow-Headers', allowedHeaders.join(', '));
  }

  if (exposedHeaders.length > 0) {
    response.headers.set('Access-Control-Expose-Headers', exposedHeaders.join(', '));
  }

  if (credentials) {
    response.headers.set('Access-Control-Allow-Credentials', 'true');
  }

  response.headers.set('Access-Control-Max-Age', maxAge.toString());

  return response;
}

// Handle preflight requests
export function handlePreflight(
  origin: string | null, 
  options: CORSOptions = defaultCORSOptions
): NextResponse {
  const response = new NextResponse(null, { status: 200 });
  return applyCORSHeaders(response, origin, options);
}

// Middleware to add security and CORS headers
export function withSecurityAndCORS(
  handler: (request: Request) => Promise<NextResponse>,
  corsOptions?: CORSOptions
) {
  return async (request: Request): Promise<NextResponse> => {
    const origin = request.headers.get('origin');

    // Handle preflight requests
    if (request.method === 'OPTIONS') {
      return handlePreflight(origin, corsOptions);
    }

    // Execute the handler
    const response = await handler(request);

    // Apply security headers
    withSecurityHeaders(response);

    // Apply CORS headers
    applyCORSHeaders(response, origin, corsOptions);

    return response;
  };
}

// Rate limiting headers
export function addRateLimitHeaders(
  response: NextResponse,
  limit: number,
  remaining: number,
  resetTime: number
): NextResponse {
  response.headers.set('X-RateLimit-Limit', limit.toString());
  response.headers.set('X-RateLimit-Remaining', remaining.toString());
  response.headers.set('X-RateLimit-Reset', resetTime.toString());
  
  if (remaining === 0) {
    response.headers.set('Retry-After', Math.ceil((resetTime - Date.now()) / 1000).toString());
  }
  
  return response;
}

// Security middleware for API routes
export function secureAPIRoute(
  handler: (request: Request) => Promise<NextResponse>,
  options?: {
    cors?: CORSOptions;
    requireAuth?: boolean;
    rateLimit?: {
      windowMs: number;
      maxRequests: number;
    };
  }
) {
  return withSecurityAndCORS(handler, options?.cors);
}

// Content Security Policy nonce generator
export function generateCSPNonce(): string {
  return Buffer.from(crypto.getRandomValues(new Uint8Array(16))).toString('base64');
}

// Update CSP with nonce
export function updateCSPWithNonce(csp: string, nonce: string): string {
  return csp.replace(
    /'unsafe-inline'/g,
    `'nonce-${nonce}' 'unsafe-inline'`
  );
}