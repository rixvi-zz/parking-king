import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/database';
import Booking from '@/lib/models/Booking';
import ParkingSpot from '@/lib/models/ParkingSpot';
import { authenticateRequest } from '@/lib/auth';

// GET /api/bookings - Get user's bookings
export async function GET(request: NextRequest) {
  try {
    const user = await authenticateRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const status = searchParams.get('status') || undefined;

    const result = await Booking.getUserBookings(user.userId, page, limit, status);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching bookings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch bookings' },
      { status: 500 }
    );
  }
}

// POST /api/bookings - Create new booking
export async function POST(request: NextRequest) {
  try {
    const user = await authenticateRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const body = await request.json();
    const {
      parkingSpotId,
      vehicleId,
      startTime,
      endTime,
      vehicleInfo,
      specialInstructions
    } = body;

    // Validate required fields
    if (!parkingSpotId || !vehicleId || !startTime || !endTime || !vehicleInfo?.licensePlate) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Convert string dates to Date objects
    const start = new Date(startTime);
    const end = new Date(endTime);

    // Validate dates
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return NextResponse.json(
        { error: 'Invalid date format' },
        { status: 400 }
      );
    }

    if (start <= new Date()) {
      return NextResponse.json(
        { error: 'Start time must be in the future' },
        { status: 400 }
      );
    }

    if (end <= start) {
      return NextResponse.json(
        { error: 'End time must be after start time' },
        { status: 400 }
      );
    }

    // Check if parking spot exists and is active
    const parkingSpot = await ParkingSpot.findById(parkingSpotId);
    if (!parkingSpot) {
      return NextResponse.json(
        { error: 'Parking spot not found' },
        { status: 404 }
      );
    }

    if (!parkingSpot.active) {
      return NextResponse.json(
        { error: 'Parking spot is not available' },
        { status: 400 }
      );
    }

    // Check if user is trying to book their own spot
    if (parkingSpot.owner.toString() === user.userId) {
      return NextResponse.json(
        { error: 'You cannot book your own parking spot' },
        { status: 400 }
      );
    }

    // Verify vehicle belongs to user
    const Vehicle = require('@/lib/models/Vehicle').default;
    const vehicle = await Vehicle.findById(vehicleId);
    if (!vehicle || vehicle.user.toString() !== user.userId) {
      return NextResponse.json(
        { error: 'Invalid vehicle selected' },
        { status: 400 }
      );
    }

    // Check availability
    const isAvailable = await Booking.checkAvailability(parkingSpotId, start, end);
    if (!isAvailable) {
      return NextResponse.json(
        { error: 'Parking spot is not available for the selected time' },
        { status: 409 }
      );
    }

    // Calculate duration and validate minimum booking
    const durationMs = end.getTime() - start.getTime();
    const durationHours = durationMs / (1000 * 60 * 60);
    
    if (durationHours < 0.5) {
      return NextResponse.json(
        { error: 'Minimum booking duration is 30 minutes' },
        { status: 400 }
      );
    }

    if (durationHours > 168) {
      return NextResponse.json(
        { error: 'Maximum booking duration is 7 days' },
        { status: 400 }
      );
    }

    // Check parking spot availability schedule
    const startHour = start.getHours();
    const startMinute = start.getMinutes();
    const endHour = end.getHours();
    const endMinute = end.getMinutes();
    const startDay = start.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
    const endDay = end.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();

    if (parkingSpot.availability) {
      const { startTime: availStart, endTime: availEnd, days } = parkingSpot.availability;
      
      if (days && days.length > 0) {
        if (!days.includes(startDay) || !days.includes(endDay)) {
          return NextResponse.json(
            { error: 'Parking spot is not available on selected days' },
            { status: 400 }
          );
        }
      }

      if (availStart && availEnd) {
        const [availStartHour, availStartMin] = availStart.split(':').map(Number);
        const [availEndHour, availEndMin] = availEnd.split(':').map(Number);
        
        const startTimeMinutes = startHour * 60 + startMinute;
        const endTimeMinutes = endHour * 60 + endMinute;
        const availStartMinutes = availStartHour * 60 + availStartMin;
        const availEndMinutes = availEndHour * 60 + availEndMin;
        
        if (startTimeMinutes < availStartMinutes || endTimeMinutes > availEndMinutes) {
          return NextResponse.json(
            { error: `Parking spot is only available from ${availStart} to ${availEnd}` },
            { status: 400 }
          );
        }
      }
    }

    // Create booking
    const booking = new Booking({
      user: user.userId,
      parkingSpot: parkingSpotId,
      vehicle: vehicleId,
      startTime: start,
      endTime: end,
      vehicleInfo: {
        licensePlate: vehicleInfo.licensePlate.toUpperCase(),
        make: vehicleInfo.make,
        model: vehicleInfo.model,
        color: vehicleInfo.color
      },
      specialInstructions
    });

    await booking.save();

    // Populate the booking with parking spot details
    await booking.populate('parkingSpot', 'title address city state pricePerHour images owner');

    return NextResponse.json({
      message: 'Booking created successfully',
      booking
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating booking:', error);
    return NextResponse.json(
      { error: 'Failed to create booking' },
      { status: 500 }
    );
  }
}