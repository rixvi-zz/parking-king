import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/database';
import ParkingSpot from '@/lib/models/ParkingSpot';
import { authenticateRequest } from '@/lib/auth';

// GET /api/parking-spots/my-spots - Get current user's parking spots
export async function GET(request: NextRequest) {
  try {
    await connectDB();
    
    const user = await authenticateRequest(request);
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const active = searchParams.get('active');

    // Build query
    const query: any = { owner: user.userId };
    
    if (active !== null) {
      query.active = active === 'true';
    }

    const skip = (page - 1) * limit;
    
    const [spots, total] = await Promise.all([
      ParkingSpot.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      ParkingSpot.countDocuments(query)
    ]);

    return NextResponse.json({
      success: true,
      data: spots,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error: any) {
    console.error('Get my parking spots error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}