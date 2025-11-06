import { NextRequest, NextResponse } from 'next/server';
import { z, ZodError } from 'zod';

// Validation middleware for API routes
export function validateRequest<T>(schema: z.ZodSchema<T>) {
  return async (
    request: NextRequest,
    handler: (validatedData: T, request: NextRequest) => Promise<NextResponse>
  ): Promise<NextResponse> => {
    try {
      let data: unknown;

      // Parse request data based on method
      if (request.method === 'GET' || request.method === 'DELETE') {
        // Parse query parameters
        const url = new URL(request.url);
        const queryParams: Record<string, any> = {};
        
        url.searchParams.forEach((value, key) => {
          // Handle array parameters (e.g., features[]=covered&features[]=security)
          if (key.endsWith('[]')) {
            const arrayKey = key.slice(0, -2);
            if (!queryParams[arrayKey]) {
              queryParams[arrayKey] = [];
            }
            queryParams[arrayKey].push(value);
          } else {
            // Try to parse numbers and booleans
            if (value === 'true') {
              queryParams[key] = true;
            } else if (value === 'false') {
              queryParams[key] = false;
            } else if (!isNaN(Number(value)) && value !== '') {
              queryParams[key] = Number(value);
            } else {
              queryParams[key] = value;
            }
          }
        });

        data = queryParams;
      } else {
        // Parse JSON body for POST, PUT, PATCH
        const contentType = request.headers.get('content-type');
        
        if (contentType?.includes('application/json')) {
          data = await request.json();
        } else if (contentType?.includes('application/x-www-form-urlencoded')) {
          const formData = await request.formData();
          const formObject: Record<string, any> = {};
          
          formData.forEach((value, key) => {
            if (formObject[key]) {
              // Handle multiple values for the same key
              if (Array.isArray(formObject[key])) {
                formObject[key].push(value);
              } else {
                formObject[key] = [formObject[key], value];
              }
            } else {
              formObject[key] = value;
            }
          });
          
          data = formObject;
        } else {
          data = {};
        }
      }

      // Validate the data
      const validatedData = schema.parse(data);
      
      // Call the handler with validated data
      return await handler(validatedData, request);
      
    } catch (error) {
      if (error instanceof ZodError) {
        // Return validation errors
        return NextResponse.json(
          {
            error: 'Validation failed',
            details: error.errors.map(err => ({
              field: err.path.join('.'),
              message: err.message,
              code: err.code,
            })),
          },
          { status: 400 }
        );
      }

      // Handle JSON parsing errors
      if (error instanceof SyntaxError) {
        return NextResponse.json(
          {
            error: 'Invalid JSON format',
            message: 'Request body must be valid JSON',
          },
          { status: 400 }
        );
      }

      // Handle other errors
      console.error('Validation middleware error:', error);
      return NextResponse.json(
        {
          error: 'Internal server error',
          message: 'An unexpected error occurred during validation',
        },
        { status: 500 }
      );
    }
  };
}

// Input sanitization utilities
export const sanitizeInput = {
  // Remove HTML tags and dangerous characters
  html: (input: string): string => {
    return input
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/[<>'"&]/g, '') // Remove dangerous characters
      .trim();
  },

  // Sanitize email
  email: (input: string): string => {
    return input.toLowerCase().trim();
  },

  // Sanitize phone number
  phone: (input: string): string => {
    return input.replace(/[^\d\+\-\(\)\s]/g, '').trim();
  },

  // Sanitize alphanumeric input
  alphanumeric: (input: string): string => {
    return input.replace(/[^a-zA-Z0-9]/g, '').trim();
  },

  // Sanitize numeric input
  numeric: (input: string): string => {
    return input.replace(/[^\d\.\-]/g, '').trim();
  },

  // Sanitize URL
  url: (input: string): string => {
    try {
      const url = new URL(input);
      // Only allow http and https protocols
      if (url.protocol !== 'http:' && url.protocol !== 'https:') {
        throw new Error('Invalid protocol');
      }
      return url.toString();
    } catch {
      return '';
    }
  },

  // Sanitize file path
  filename: (input: string): string => {
    return input
      .replace(/[^a-zA-Z0-9\.\-_]/g, '') // Only allow safe characters
      .replace(/\.{2,}/g, '.') // Remove multiple dots
      .trim();
  },
};

// Rate limiting helper
export class RateLimiter {
  private requests: Map<string, number[]> = new Map();
  private windowMs: number;
  private maxRequests: number;

  constructor(windowMs: number = 60000, maxRequests: number = 100) {
    this.windowMs = windowMs;
    this.maxRequests = maxRequests;
  }

  isAllowed(identifier: string): boolean {
    const now = Date.now();
    const windowStart = now - this.windowMs;

    // Get existing requests for this identifier
    const requests = this.requests.get(identifier) || [];

    // Filter out old requests
    const recentRequests = requests.filter(time => time > windowStart);

    // Check if limit exceeded
    if (recentRequests.length >= this.maxRequests) {
      return false;
    }

    // Add current request
    recentRequests.push(now);
    this.requests.set(identifier, recentRequests);

    return true;
  }

  getRemainingRequests(identifier: string): number {
    const now = Date.now();
    const windowStart = now - this.windowMs;
    const requests = this.requests.get(identifier) || [];
    const recentRequests = requests.filter(time => time > windowStart);
    
    return Math.max(0, this.maxRequests - recentRequests.length);
  }

  getResetTime(identifier: string): number {
    const requests = this.requests.get(identifier) || [];
    if (requests.length === 0) return 0;
    
    const oldestRequest = Math.min(...requests);
    return oldestRequest + this.windowMs;
  }
}

// Create rate limiter instances for different endpoints
export const rateLimiters = {
  auth: new RateLimiter(15 * 60 * 1000, 5), // 5 requests per 15 minutes for auth
  api: new RateLimiter(60 * 1000, 100), // 100 requests per minute for general API
  search: new RateLimiter(60 * 1000, 50), // 50 requests per minute for search
  upload: new RateLimiter(60 * 1000, 10), // 10 requests per minute for uploads
};

// Rate limiting middleware
export function withRateLimit(limiter: RateLimiter) {
  return (handler: (request: NextRequest) => Promise<NextResponse>) => {
    return async (request: NextRequest): Promise<NextResponse> => {
      // Get client identifier (IP address or user ID)
      const forwarded = request.headers.get('x-forwarded-for');
      const ip = forwarded ? forwarded.split(',')[0] : request.ip || 'unknown';
      
      // Check rate limit
      if (!limiter.isAllowed(ip)) {
        return NextResponse.json(
          {
            error: 'Rate limit exceeded',
            message: 'Too many requests. Please try again later.',
            retryAfter: Math.ceil((limiter.getResetTime(ip) - Date.now()) / 1000),
          },
          { 
            status: 429,
            headers: {
              'Retry-After': Math.ceil((limiter.getResetTime(ip) - Date.now()) / 1000).toString(),
              'X-RateLimit-Limit': limiter['maxRequests'].toString(),
              'X-RateLimit-Remaining': limiter.getRemainingRequests(ip).toString(),
              'X-RateLimit-Reset': limiter.getResetTime(ip).toString(),
            }
          }
        );
      }

      return handler(request);
    };
  };
}

// CORS middleware
export function withCORS(allowedOrigins: string[] = []) {
  return (handler: (request: NextRequest) => Promise<NextResponse>) => {
    return async (request: NextRequest): Promise<NextResponse> => {
      const origin = request.headers.get('origin');
      
      // Handle preflight requests
      if (request.method === 'OPTIONS') {
        const response = new NextResponse(null, { status: 200 });
        
        if (allowedOrigins.length === 0 || (origin && allowedOrigins.includes(origin))) {
          response.headers.set('Access-Control-Allow-Origin', origin || '*');
        }
        
        response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
        response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        response.headers.set('Access-Control-Max-Age', '86400');
        
        return response;
      }

      // Handle actual requests
      const response = await handler(request);
      
      if (allowedOrigins.length === 0 || (origin && allowedOrigins.includes(origin))) {
        response.headers.set('Access-Control-Allow-Origin', origin || '*');
      }
      
      return response;
    };
  };
}