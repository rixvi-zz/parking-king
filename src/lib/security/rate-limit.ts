import { NextRequest, NextResponse } from 'next/server';

// Rate limiter class with sliding window algorithm
export class SlidingWindowRateLimiter {
  private windows: Map<string, number[]> = new Map();
  private windowSizeMs: number;
  private maxRequests: number;

  constructor(windowSizeMs: number, maxRequests: number) {
    this.windowSizeMs = windowSizeMs;
    this.maxRequests = maxRequests;
  }

  // Check if request is allowed
  isAllowed(identifier: string): boolean {
    const now = Date.now();
    const windowStart = now - this.windowSizeMs;

    // Get or create window for this identifier
    let window = this.windows.get(identifier) || [];

    // Remove old requests outside the window
    window = window.filter(timestamp => timestamp > windowStart);

    // Check if we're at the limit
    if (window.length >= this.maxRequests) {
      this.windows.set(identifier, window);
      return false;
    }

    // Add current request
    window.push(now);
    this.windows.set(identifier, window);

    return true;
  }

  // Get remaining requests in current window
  getRemainingRequests(identifier: string): number {
    const now = Date.now();
    const windowStart = now - this.windowSizeMs;
    const window = this.windows.get(identifier) || [];
    const activeRequests = window.filter(timestamp => timestamp > windowStart);
    
    return Math.max(0, this.maxRequests - activeRequests.length);
  }

  // Get time when window resets
  getResetTime(identifier: string): number {
    const window = this.windows.get(identifier) || [];
    if (window.length === 0) return Date.now();
    
    const oldestRequest = Math.min(...window);
    return oldestRequest + this.windowSizeMs;
  }

  // Clean up old windows (call periodically)
  cleanup(): void {
    const now = Date.now();
    const cutoff = now - this.windowSizeMs * 2; // Keep some buffer

    for (const [identifier, window] of this.windows.entries()) {
      const activeRequests = window.filter(timestamp => timestamp > cutoff);
      
      if (activeRequests.length === 0) {
        this.windows.delete(identifier);
      } else {
        this.windows.set(identifier, activeRequests);
      }
    }
  }
}

// Token bucket rate limiter for burst handling
export class TokenBucketRateLimiter {
  private buckets: Map<string, { tokens: number; lastRefill: number }> = new Map();
  private capacity: number;
  private refillRate: number; // tokens per second
  private refillInterval: number;

  constructor(capacity: number, refillRate: number) {
    this.capacity = capacity;
    this.refillRate = refillRate;
    this.refillInterval = 1000 / refillRate; // ms between token additions
  }

  isAllowed(identifier: string, tokensRequested: number = 1): boolean {
    const now = Date.now();
    let bucket = this.buckets.get(identifier) || { tokens: this.capacity, lastRefill: now };

    // Calculate tokens to add based on time elapsed
    const timeSinceLastRefill = now - bucket.lastRefill;
    const tokensToAdd = Math.floor(timeSinceLastRefill / this.refillInterval);
    
    if (tokensToAdd > 0) {
      bucket.tokens = Math.min(this.capacity, bucket.tokens + tokensToAdd);
      bucket.lastRefill = now;
    }

    // Check if we have enough tokens
    if (bucket.tokens >= tokensRequested) {
      bucket.tokens -= tokensRequested;
      this.buckets.set(identifier, bucket);
      return true;
    }

    this.buckets.set(identifier, bucket);
    return false;
  }

  getRemainingTokens(identifier: string): number {
    const bucket = this.buckets.get(identifier);
    return bucket ? bucket.tokens : this.capacity;
  }
}

// Predefined rate limiters for different use cases
export const rateLimiters = {
  // Authentication endpoints - very strict
  auth: new SlidingWindowRateLimiter(15 * 60 * 1000, 5), // 5 requests per 15 minutes
  
  // Password reset - strict
  passwordReset: new SlidingWindowRateLimiter(60 * 60 * 1000, 3), // 3 requests per hour
  
  // General API - moderate
  api: new SlidingWindowRateLimiter(60 * 1000, 100), // 100 requests per minute
  
  // Search endpoints - lenient
  search: new SlidingWindowRateLimiter(60 * 1000, 200), // 200 requests per minute
  
  // File uploads - strict
  upload: new SlidingWindowRateLimiter(60 * 1000, 10), // 10 uploads per minute
  
  // Booking creation - moderate
  booking: new SlidingWindowRateLimiter(60 * 1000, 20), // 20 bookings per minute
  
  // Email sending - very strict
  email: new SlidingWindowRateLimiter(60 * 60 * 1000, 5), // 5 emails per hour
};

// Token bucket limiters for burst handling
export const tokenBucketLimiters = {
  // API with burst capability
  apiBurst: new TokenBucketRateLimiter(50, 10), // 50 token capacity, 10 tokens/second refill
  
  // Search with burst capability
  searchBurst: new TokenBucketRateLimiter(100, 20), // 100 token capacity, 20 tokens/second refill
};

// Get client identifier for rate limiting
export function getClientIdentifier(request: NextRequest): string {
  // Try to get user ID from token first (more accurate)
  const authHeader = request.headers.get('authorization');
  if (authHeader) {
    // You would decode the JWT here to get user ID
    // For now, we'll use IP + User-Agent as fallback
  }

  // Get IP address
  const forwarded = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');
  const ip = forwarded?.split(',')[0] || realIP || request.ip || 'unknown';

  // Get User-Agent for additional uniqueness
  const userAgent = request.headers.get('user-agent') || 'unknown';
  
  // Create a hash of IP + User-Agent for privacy
  const identifier = `${ip}:${userAgent.substring(0, 50)}`;
  
  return Buffer.from(identifier).toString('base64').substring(0, 32);
}

// Rate limiting middleware
export function withRateLimit(
  limiter: SlidingWindowRateLimiter | TokenBucketRateLimiter,
  options: {
    keyGenerator?: (request: NextRequest) => string;
    skipSuccessfulRequests?: boolean;
    skipFailedRequests?: boolean;
    onLimitReached?: (request: NextRequest) => NextResponse;
  } = {}
) {
  return function (handler: (request: NextRequest) => Promise<NextResponse>) {
    return async function (request: NextRequest): Promise<NextResponse> {
      const identifier = options.keyGenerator ? 
        options.keyGenerator(request) : 
        getClientIdentifier(request);

      // Check rate limit
      const isAllowed = limiter instanceof SlidingWindowRateLimiter ?
        limiter.isAllowed(identifier) :
        limiter.isAllowed(identifier);

      if (!isAllowed) {
        if (options.onLimitReached) {
          return options.onLimitReached(request);
        }

        const resetTime = limiter instanceof SlidingWindowRateLimiter ?
          limiter.getResetTime(identifier) :
          Date.now() + 60000; // Default 1 minute for token bucket

        const response = NextResponse.json(
          {
            error: 'Rate limit exceeded',
            message: 'Too many requests. Please try again later.',
            retryAfter: Math.ceil((resetTime - Date.now()) / 1000),
          },
          { status: 429 }
        );

        // Add rate limit headers
        if (limiter instanceof SlidingWindowRateLimiter) {
          response.headers.set('X-RateLimit-Limit', limiter['maxRequests'].toString());
          response.headers.set('X-RateLimit-Remaining', '0');
          response.headers.set('X-RateLimit-Reset', resetTime.toString());
        }
        
        response.headers.set('Retry-After', Math.ceil((resetTime - Date.now()) / 1000).toString());

        return response;
      }

      // Execute handler
      const response = await handler(request);

      // Add rate limit headers to successful responses
      if (limiter instanceof SlidingWindowRateLimiter) {
        const remaining = limiter.getRemainingRequests(identifier);
        const resetTime = limiter.getResetTime(identifier);
        
        response.headers.set('X-RateLimit-Limit', limiter['maxRequests'].toString());
        response.headers.set('X-RateLimit-Remaining', remaining.toString());
        response.headers.set('X-RateLimit-Reset', resetTime.toString());
      }

      return response;
    };
  };
}

// Cleanup function to be called periodically
export function cleanupRateLimiters(): void {
  Object.values(rateLimiters).forEach(limiter => {
    if (limiter instanceof SlidingWindowRateLimiter) {
      limiter.cleanup();
    }
  });
}

// Start cleanup interval (call this once in your app)
export function startRateLimitCleanup(): void {
  // Clean up every 5 minutes
  setInterval(cleanupRateLimiters, 5 * 60 * 1000);
}

// Rate limit configurations for different endpoints
export const rateLimitConfigs = {
  auth: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 5,
    message: 'Too many authentication attempts. Please try again in 15 minutes.',
  },
  
  api: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 100,
    message: 'API rate limit exceeded. Please slow down your requests.',
  },
  
  search: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 200,
    message: 'Search rate limit exceeded. Please wait before searching again.',
  },
  
  upload: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 10,
    message: 'Upload rate limit exceeded. Please wait before uploading again.',
  },
};