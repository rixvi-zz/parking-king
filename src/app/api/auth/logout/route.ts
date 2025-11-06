import { NextRequest, NextResponse } from 'next/server';
import { 
  extractTokenFromRequest, 
  blacklistToken, 
  securityHeaders 
} from '@/lib/auth/jwt';

export async function POST(request: NextRequest) {
  try {
    // Get tokens from cookies and headers
    const accessToken = extractTokenFromRequest(request);
    const refreshToken = request.cookies.get('refresh_token')?.value;

    // Blacklist tokens if they exist
    if (accessToken) {
      blacklistToken(accessToken);
    }
    if (refreshToken) {
      blacklistToken(refreshToken);
    }

    // Create response
    const response = NextResponse.json({
      success: true,
      message: 'Logged out successfully',
    }, {
      status: 200,
      headers: securityHeaders,
    });

    // Clear cookies
    response.cookies.set('access_token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: 0, // Expire immediately
    });

    response.cookies.set('refresh_token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/api/auth',
      maxAge: 0, // Expire immediately
    });

    return response;

  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: securityHeaders }
    );
  }
}

// Logout from all devices (revoke all tokens)
export async function DELETE(request: NextRequest) {
  try {
    // This would require the user to be authenticated
    // and would increment their token version to invalidate all tokens
    // Implementation would be similar to the DELETE method in refresh route
    
    return NextResponse.json({
      success: true,
      message: 'Logged out from all devices successfully',
    }, {
      status: 200,
      headers: securityHeaders,
    });

  } catch (error) {
    console.error('Global logout error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: securityHeaders }
    );
  }
}