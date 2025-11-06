import jwt from 'jsonwebtoken';
import { NextRequest } from 'next/server';

// JWT configuration
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '15m';
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

// Token blacklist (in production, use Redis or database)
const tokenBlacklist = new Set<string>();

// JWT payload interface
export interface JWTPayload {
  userId: string;
  email: string;
  role?: string;
  iat?: number;
  exp?: number;
  jti?: string; // JWT ID for blacklisting
}

// Refresh token payload interface
export interface RefreshTokenPayload {
  userId: string;
  tokenVersion: number;
  iat?: number;
  exp?: number;
  jti?: string;
}

// Generate a unique JWT ID
function generateJTI(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

// Create access token
export function createAccessToken(payload: Omit<JWTPayload, 'iat' | 'exp' | 'jti'>): string {
  const jti = generateJTI();
  
  return jwt.sign(
    { ...payload, jti },
    JWT_SECRET,
    {
      expiresIn: JWT_EXPIRES_IN,
      issuer: 'parking-king',
      audience: 'parking-king-users',
    }
  );
}

// Create refresh token
export function createRefreshToken(payload: Omit<RefreshTokenPayload, 'iat' | 'exp' | 'jti'>): string {
  const jti = generateJTI();
  
  return jwt.sign(
    { ...payload, jti },
    JWT_REFRESH_SECRET,
    {
      expiresIn: JWT_REFRESH_EXPIRES_IN,
      issuer: 'parking-king',
      audience: 'parking-king-users',
    }
  );
}

// Verify access token
export function verifyAccessToken(token: string): JWTPayload | null {
  try {
    // Check if token is blacklisted
    if (tokenBlacklist.has(token)) {
      return null;
    }

    const decoded = jwt.verify(token, JWT_SECRET, {
      issuer: 'parking-king',
      audience: 'parking-king-users',
    }) as JWTPayload;

    return decoded;
  } catch (error) {
    console.error('JWT verification error:', error);
    return null;
  }
}

// Verify refresh token
export function verifyRefreshToken(token: string): RefreshTokenPayload | null {
  try {
    // Check if token is blacklisted
    if (tokenBlacklist.has(token)) {
      return null;
    }

    const decoded = jwt.verify(token, JWT_REFRESH_SECRET, {
      issuer: 'parking-king',
      audience: 'parking-king-users',
    }) as RefreshTokenPayload;

    return decoded;
  } catch (error) {
    console.error('Refresh token verification error:', error);
    return null;
  }
}

// Blacklist a token
export function blacklistToken(token: string): void {
  tokenBlacklist.add(token);
  
  // In production, you should:
  // 1. Store blacklisted tokens in Redis with TTL equal to token expiration
  // 2. Or store in database with cleanup job
  // 3. Consider using a more efficient data structure for large scale
}

// Extract token from request
export function extractTokenFromRequest(request: NextRequest): string | null {
  // Check Authorization header
  const authHeader = request.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  // Check cookies (for browser requests)
  const cookieToken = request.cookies.get('access_token')?.value;
  if (cookieToken) {
    return cookieToken;
  }

  return null;
}

// Get user from request
export function getUserFromRequest(request: NextRequest): JWTPayload | null {
  const token = extractTokenFromRequest(request);
  if (!token) {
    return null;
  }

  return verifyAccessToken(token);
}

// Token refresh utility
export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export function refreshTokens(refreshToken: string, currentTokenVersion: number): TokenPair | null {
  const payload = verifyRefreshToken(refreshToken);
  
  if (!payload) {
    return null;
  }

  // Check token version (for security - invalidate all tokens when needed)
  if (payload.tokenVersion !== currentTokenVersion) {
    return null;
  }

  // Blacklist the old refresh token
  blacklistToken(refreshToken);

  // Create new tokens
  const newAccessToken = createAccessToken({
    userId: payload.userId,
    email: '', // You'll need to fetch this from database
  });

  const newRefreshToken = createRefreshToken({
    userId: payload.userId,
    tokenVersion: currentTokenVersion,
  });

  return {
    accessToken: newAccessToken,
    refreshToken: newRefreshToken,
  };
}

// JWT middleware for API routes
export function requireAuth(handler: (request: NextRequest, user: JWTPayload) => Promise<Response>) {
  return async (request: NextRequest): Promise<Response> => {
    const user = getUserFromRequest(request);
    
    if (!user) {
      return new Response(
        JSON.stringify({
          error: 'Unauthorized',
          message: 'Valid authentication token required',
        }),
        {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    return handler(request, user);
  };
}

// Role-based authorization middleware
export function requireRole(roles: string[]) {
  return (handler: (request: NextRequest, user: JWTPayload) => Promise<Response>) => {
    return requireAuth(async (request: NextRequest, user: JWTPayload) => {
      if (!user.role || !roles.includes(user.role)) {
        return new Response(
          JSON.stringify({
            error: 'Forbidden',
            message: 'Insufficient permissions',
          }),
          {
            status: 403,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }

      return handler(request, user);
    });
  };
}

// Optional auth middleware (doesn't fail if no token)
export function optionalAuth(handler: (request: NextRequest, user?: JWTPayload) => Promise<Response>) {
  return async (request: NextRequest): Promise<Response> => {
    const user = getUserFromRequest(request);
    return handler(request, user || undefined);
  };
}

// Token validation utilities
export const tokenValidation = {
  // Check if token is expired
  isExpired: (token: string): boolean => {
    try {
      const decoded = jwt.decode(token) as any;
      if (!decoded || !decoded.exp) return true;
      
      return Date.now() >= decoded.exp * 1000;
    } catch {
      return true;
    }
  },

  // Get token expiration time
  getExpirationTime: (token: string): number | null => {
    try {
      const decoded = jwt.decode(token) as any;
      return decoded?.exp ? decoded.exp * 1000 : null;
    } catch {
      return null;
    }
  },

  // Get time until expiration
  getTimeUntilExpiration: (token: string): number | null => {
    const expTime = tokenValidation.getExpirationTime(token);
    if (!expTime) return null;
    
    return Math.max(0, expTime - Date.now());
  },

  // Check if token needs refresh (expires in less than 5 minutes)
  needsRefresh: (token: string): boolean => {
    const timeUntilExp = tokenValidation.getTimeUntilExpiration(token);
    if (!timeUntilExp) return true;
    
    return timeUntilExp < 5 * 60 * 1000; // 5 minutes
  },
};

// Security headers for JWT responses
export const securityHeaders = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
};

// Secure cookie options
export const secureCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  path: '/',
  maxAge: 15 * 60, // 15 minutes for access token
};

export const refreshCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  path: '/api/auth',
  maxAge: 7 * 24 * 60 * 60, // 7 days for refresh token
};

// Logout utility
export function logout(accessToken?: string, refreshToken?: string): void {
  if (accessToken) {
    blacklistToken(accessToken);
  }
  if (refreshToken) {
    blacklistToken(refreshToken);
  }
}

// Clean up expired blacklisted tokens (call periodically)
export function cleanupBlacklist(): void {
  // In production, this would be handled by Redis TTL or database cleanup job
  // For in-memory implementation, we can't easily determine which tokens are expired
  // without decoding them, so this is a placeholder
  console.log('Blacklist cleanup would run here in production');
}