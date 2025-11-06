import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/database';
import User from '@/lib/models/User';
import { 
  verifyRefreshToken, 
  createAccessToken, 
  createRefreshToken, 
  blacklistToken,
  securityHeaders, 
  secureCookieOptions, 
  refreshCookieOptions 
} from '@/lib/auth/jwt';

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    // Get refresh token from cookie or body
    let refreshToken = request.cookies.get('refresh_token')?.value;
    
    if (!refreshToken) {
      const body = await request.json();
      refreshToken = body.refreshToken;
    }

    if (!refreshToken) {
      return NextResponse.json(
        { error: 'Refresh token required' },
        { status: 401, headers: securityHeaders }
      );
    }

    // Verify refresh token
    const payload = verifyRefreshToken(refreshToken);
    if (!payload) {
      return NextResponse.json(
        { error: 'Invalid refresh token' },
        { status: 401, headers: securityHeaders }
      );
    }

    // Find user and check token version
    const user = await User.findById(payload.userId);
    if (!user || user.tokenVersion !== payload.tokenVersion) {
      return NextResponse.json(
        { error: 'Invalid refresh token' },
        { status: 401, headers: securityHeaders }
      );
    }

    // Blacklist the old refresh token
    blacklistToken(refreshToken);

    // Create new tokens
    const newAccessToken = createAccessToken({
      userId: user._id.toString(),
      email: user.email,
      role: user.role || 'user',
    });

    const newRefreshToken = createRefreshToken({
      userId: user._id.toString(),
      tokenVersion: user.tokenVersion,
    });

    // Create response
    const response = NextResponse.json({
      success: true,
      message: 'Tokens refreshed successfully',
      accessToken: newAccessToken,
    }, {
      status: 200,
      headers: securityHeaders,
    });

    // Set new secure cookies
    response.cookies.set('access_token', newAccessToken, secureCookieOptions);
    response.cookies.set('refresh_token', newRefreshToken, refreshCookieOptions);

    return response;

  } catch (error) {
    console.error('Token refresh error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: securityHeaders }
    );
  }
}

// Revoke all refresh tokens for a user (increment token version)
export async function DELETE(request: NextRequest) {
  try {
    await connectDB();

    // Get user ID from access token
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Authorization header required' },
        { status: 401, headers: securityHeaders }
      );
    }

    const accessToken = authHeader.substring(7);
    // You would verify the access token here and get the user ID
    // For now, we'll expect the user ID in the request body
    const body = await request.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID required' },
        { status: 400, headers: securityHeaders }
      );
    }

    // Increment token version to invalidate all refresh tokens
    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404, headers: securityHeaders }
      );
    }

    user.tokenVersion = (user.tokenVersion || 0) + 1;
    await user.save();

    return NextResponse.json({
      success: true,
      message: 'All refresh tokens revoked successfully',
    }, {
      status: 200,
      headers: securityHeaders,
    });

  } catch (error) {
    console.error('Token revocation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: securityHeaders }
    );
  }
}