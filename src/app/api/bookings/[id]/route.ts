import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/database';
import Booking from '@/lib/models/Booking';
import { authenticateRequest } from '@/lib/auth';

// GET /api/bookings/[id] - Get single booking
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await authenticateRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const booking = await Booking.findById(params.id)
      .populate('user', 'name email')
      .populate('parkingSpot', 'title address city state pricePerHour images owner');

    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    // Check if user owns the booking or owns the parking spot
    const isOwner = booking.user._id.toString() === user.userId;
    const isHost = booking.parkingSpot.owner.toString() === user.userId;

    if (!isOwner && !isHost) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    return NextResponse.json({ booking });
  } catch (error) {
    console.error('Error fetching booking:', error);
    return NextResponse.json(
      { error: 'Failed to fetch booking' },
      { status: 500 }
    );
  }
}

// PUT /api/bookings/[id] - Update booking
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await authenticateRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const booking = await Booking.findById(params.id).populate('parkingSpot');
    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    const body = await request.json();
    const { status, paymentStatus } = body;

    // Check permissions
    const isOwner = booking.user.toString() === user.userId;
    const isHost = booking.parkingSpot.owner.toString() === user.userId;

    if (!isOwner && !isHost) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Validate status transitions
    if (status) {
      const validTransitions: Record<string, string[]> = {
        'pending': ['confirmed', 'cancelled'],
        'confirmed': ['active', 'cancelled'],
        'active': ['completed', 'cancelled'],
        'completed': [],
        'cancelled': []
      };

      if (!validTransitions[booking.status]?.includes(status)) {
        return NextResponse.json(
          { error: `Cannot change status from ${booking.status} to ${status}` },
          { status: 400 }
        );
      }

      // Only hosts can confirm bookings
      if (status === 'confirmed' && !isHost) {
        return NextResponse.json(
          { error: 'Only hosts can confirm bookings' },
          { status: 403 }
        );
      }

      // Only users can cancel their own bookings (before confirmed)
      if (status === 'cancelled' && booking.status === 'pending' && !isOwner) {
        return NextResponse.json(
          { error: 'Only booking owner can cancel pending bookings' },
          { status: 403 }
        );
      }

      booking.status = status;
    }

    // Update payment status (typically handled by payment webhook)
    if (paymentStatus && ['paid', 'failed', 'refunded'].includes(paymentStatus)) {
      booking.paymentStatus = paymentStatus;
    }

    await booking.save();

    // Populate updated booking
    await booking.populate('user', 'name email');
    await booking.populate('parkingSpot', 'title address city state pricePerHour images owner');

    return NextResponse.json({
      message: 'Booking updated successfully',
      booking
    });

  } catch (error) {
    console.error('Error updating booking:', error);
    return NextResponse.json(
      { error: 'Failed to update booking' },
      { status: 500 }
    );
  }
}

// DELETE /api/bookings/[id] - Cancel booking
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await authenticateRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const booking = await Booking.findById(params.id).populate('parkingSpot');
    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    // Check if user owns the booking
    if (booking.user.toString() !== user.userId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Check if booking can be cancelled
    if (!['pending', 'confirmed'].includes(booking.status)) {
      return NextResponse.json(
        { error: 'Cannot cancel booking in current status' },
        { status: 400 }
      );
    }

    // Check cancellation policy (e.g., can't cancel within 1 hour of start time)
    const now = new Date();
    const startTime = new Date(booking.startTime);
    const timeDiff = startTime.getTime() - now.getTime();
    const hoursUntilStart = timeDiff / (1000 * 60 * 60);

    if (hoursUntilStart < 1) {
      return NextResponse.json(
        { error: 'Cannot cancel booking less than 1 hour before start time' },
        { status: 400 }
      );
    }

    // Update booking status to cancelled
    booking.status = 'cancelled';
    await booking.save();

    return NextResponse.json({
      message: 'Booking cancelled successfully',
      booking
    });

  } catch (error) {
    console.error('Error cancelling booking:', error);
    return NextResponse.json(
      { error: 'Failed to cancel booking' },
      { status: 500 }
    );
  }
}