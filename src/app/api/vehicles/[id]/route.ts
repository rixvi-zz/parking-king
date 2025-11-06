import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/database';
import Vehicle from '@/lib/models/Vehicle';
import { authenticateRequest } from '@/lib/auth';

// GET /api/vehicles/[id] - Get single vehicle
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

    const vehicle = await Vehicle.findById(params.id);
    if (!vehicle) {
      return NextResponse.json({ error: 'Vehicle not found' }, { status: 404 });
    }

    // Check if user owns the vehicle
    if (vehicle.user.toString() !== user.userId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    return NextResponse.json({ vehicle });
  } catch (error) {
    console.error('Error fetching vehicle:', error);
    return NextResponse.json(
      { error: 'Failed to fetch vehicle' },
      { status: 500 }
    );
  }
}

// PUT /api/vehicles/[id] - Update vehicle
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

    const vehicle = await Vehicle.findById(params.id);
    if (!vehicle) {
      return NextResponse.json({ error: 'Vehicle not found' }, { status: 404 });
    }

    // Check if user owns the vehicle
    if (vehicle.user.toString() !== user.userId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const body = await request.json();
    const { name, number, type, isDefault } = body;

    // Validate required fields
    if (!name || !number || !type) {
      return NextResponse.json(
        { error: 'Name, number, and type are required' },
        { status: 400 }
      );
    }

    // Check if vehicle number already exists for this user (excluding current vehicle)
    if (number.toUpperCase() !== vehicle.number) {
      const existingVehicle = await Vehicle.findOne({
        user: user.userId,
        number: number.toUpperCase(),
        _id: { $ne: params.id }
      });

      if (existingVehicle) {
        return NextResponse.json(
          { error: 'Vehicle with this number already exists' },
          { status: 409 }
        );
      }
    }

    // Update vehicle
    vehicle.name = name.trim();
    vehicle.number = number.toUpperCase().trim();
    vehicle.type = type;
    vehicle.isDefault = isDefault || false;

    await vehicle.save();

    return NextResponse.json({
      message: 'Vehicle updated successfully',
      vehicle
    });

  } catch (error) {
    console.error('Error updating vehicle:', error);
    
    // Handle duplicate key error
    if (error.code === 11000) {
      return NextResponse.json(
        { error: 'Vehicle with this number already exists' },
        { status: 409 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to update vehicle' },
      { status: 500 }
    );
  }
}

// DELETE /api/vehicles/[id] - Delete vehicle
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

    const vehicle = await Vehicle.findById(params.id);
    if (!vehicle) {
      return NextResponse.json({ error: 'Vehicle not found' }, { status: 404 });
    }

    // Check if user owns the vehicle
    if (vehicle.user.toString() !== user.userId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Check if vehicle is used in any active bookings
    const Booking = require('@/lib/models/Booking').default;
    const activeBookings = await Booking.countDocuments({
      vehicle: params.id,
      status: { $in: ['pending', 'confirmed', 'active'] }
    });

    if (activeBookings > 0) {
      return NextResponse.json(
        { error: 'Cannot delete vehicle with active bookings' },
        { status: 400 }
      );
    }

    await Vehicle.findByIdAndDelete(params.id);

    // If this was the default vehicle, make another vehicle default
    if (vehicle.isDefault) {
      const remainingVehicles = await Vehicle.find({ user: user.userId });
      if (remainingVehicles.length > 0) {
        remainingVehicles[0].isDefault = true;
        await remainingVehicles[0].save();
      }
    }

    return NextResponse.json({
      message: 'Vehicle deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting vehicle:', error);
    return NextResponse.json(
      { error: 'Failed to delete vehicle' },
      { status: 500 }
    );
  }
}