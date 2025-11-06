import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/database';
import User from '@/lib/models/User';
import { validateRequest, rateLimiters, withRateLimit } from '@/lib/middleware/validation';
import { loginSchema } from '@/lib/validations/auth';
import { 
  createAccessToken, 
  createRefreshToken, 
  securityHeaders, 
  secureCookieOptions, 
  refreshCookieOptions 
} from '@/lib/auth/jwt';

// Rate limited login handler
const rateLimitedHandler = withRateLimit(rateLimiters.auth);

export async function POST(request: NextRequest) {
  return rateLimitedHandler(async (request: NextRequest) => {
    return validateRequest(loginSchema)(async (validatedData) => {
      try {
        await connectDB();
        
        const { email, password } = validatedData;

        // Find user by email
        const user = await User.findOne({ email }).select('+password');
        if (!user) {
          return NextResponse.json(
            { error: 'Invalid credentials' },
            { status: 401, headers: securityHeaders }
          );
        }

        // Check if account is locked
        if (user.lockUntil && user.lockUntil > Date.now()) {
          const lockTimeRemaining = Math.ceil((user.lockUntil - Date.now()) / 1000 / 60);
          return NextResponse.json(
            { 
              error: 'Account temporarily locked',
              message: `Account is locked for ${lockTimeRemaining} more minutes due to multiple failed login attempts.`
            },
            { status: 423, headers: securityHeaders }
          );
        }

        // Check password
        const isPasswordValid = await user.comparePassword(password);
        if (!isPasswordValid) {
          // Increment failed login attempts
          const maxAttempts = 5;
          const lockTime = 15 * 60 * 1000; // 15 minutes

          user.loginAttempts = (user.loginAttempts || 0) + 1;
          
          if (user.loginAttempts >= maxAttempts) {
            user.lockUntil = new Date(Date.now() + lockTime);
            await user.save();
            
            return NextResponse.json(
              { 
                error: 'Account locked',
                message: 'Account has been locked for 15 minutes due to multiple failed login attempts.'
              },
              { status: 423, headers: securityHeaders }
            );
          }
          
          await user.save();
          
          return NextResponse.json(
            { 
              error: 'Invalid credentials',
              attemptsRemaining: maxAttempts - user.loginAttempts
            },
            { status: 401, headers: securityHeaders }
          );
        }

        // Reset failed login attempts on successful login
        if (user.loginAttempts > 0) {
          user.loginAttempts = 0;
          user.lockUntil = undefined;
        }

        // Update last login
        user.lastLogin = new Date();
        
        // Increment token version if needed (for security)
        if (!user.tokenVersion) {
          user.tokenVersion = 1;
        }
        
        await user.save();

        // Create tokens
        const accessToken = createAccessToken({
          userId: user._id.toString(),
          email: user.email,
          role: user.role || 'user',
        });

        const refreshToken = createRefreshToken({
          userId: user._id.toString(),
          tokenVersion: user.tokenVersion,
        });

        // Create response
        const response = NextResponse.json({
          success: true,
          message: 'Login successful',
          user: {
            id: user._id.toString(),
            name: user.name,
            email: user.email,
            role: user.role || 'user',
            createdAt: user.createdAt,
            lastLogin: user.lastLogin,
          },
          accessToken,
        }, {
          status: 200,
          headers: securityHeaders,
        });

        // Set secure cookies
        response.cookies.set('access_token', accessToken, secureCookieOptions);
        response.cookies.set('refresh_token', refreshToken, refreshCookieOptions);

        return response;

      } catch (error) {
        console.error('Login error:', error);
        return NextResponse.json(
          { error: 'Internal server error' },
          { status: 500, headers: securityHeaders }
        );
      }
    }, request);
  })(request);
}