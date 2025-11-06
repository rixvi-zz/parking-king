import jwt from 'jsonwebtoken';
import { NextRequest } from 'next/server';

const JWT_SECRET = process.env.JWT_SECRET!;

export interface JWTPayload {
  userId: string;
  email: string;
  role: string;
  iat?: number;
  exp?: number;
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

// Generate JWT token
export function generateToken(userId: string, email: string, role: string): string {
  if (!JWT_SECRET) {
    throw new Error('JWT_SECRET is not defined');
  }
  
  const payload: JWTPayload = {
    userId,
    email,
    role
  };
  
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

// Verify JWT token
export function verifyToken(token: string): JWTPayload | null {
  if (!JWT_SECRET) {
    throw new Error('JWT_SECRET is not defined');
  }
  
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
  } catch (error) {
    return null;
  }
}

// Get token from request headers or cookies
export function getTokenFromRequest(request: NextRequest): string | null {
  // Check Authorization header first
  const authHeader = request.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  
  // Check cookies as fallback
  const token = request.cookies.get('auth-token')?.value;
  return token || null;
}

// Authenticate request and return user payload
export async function authenticateRequest(request: NextRequest): Promise<JWTPayload | null> {
  const token = getTokenFromRequest(request);
  if (!token) return null;
  
  return verifyToken(token);
}

// Middleware helper for protected routes
export function requireAuth(handler: (request: NextRequest, user: JWTPayload) => Promise<Response>) {
  return async (request: NextRequest) => {
    const user = await authenticateRequest(request);
    
    if (!user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { 
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
    
    return handler(request, user);
  };
}