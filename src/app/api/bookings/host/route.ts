import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/database';
import Booking from '@/lib/models/Booking';
import { authenticateRequest } from '@/lib/auth';

// GET /api/bookings/host - Get host's bookings
export async function GET(request: NextRequest) {
  try {
    const user = await authenticateRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is a host
    if (user.role !== 'host') {
      return NextResponse.json({ error: 'Access denied - Host only' }, { status: 403 });
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const status = searchParams.get('status') || undefined;

    const result = await Booking.getHostBookings(user.userId, page, limit, status);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching host bookings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch bookings' },
      { status: 500 }
    );
  }
}