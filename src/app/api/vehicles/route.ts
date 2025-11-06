import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/database';
import Vehicle from '@/lib/models/Vehicle';
import { authenticateRequest } from '@/lib/auth';

// GET /api/vehicles - Get user's vehicles
export async function GET(request: NextRequest) {
  try {
    const user = await authenticateRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const vehicles = await Vehicle.getUserVehicles(user.userId);

    return NextResponse.json({ vehicles });
  } catch (error) {
    console.error('Error fetching vehicles:', error);
    return NextResponse.json(
      { error: 'Failed to fetch vehicles' },
      { status: 500 }
    );
  }
}

// POST /api/vehicles - Add new vehicle
export async function POST(request: NextRequest) {
  try {
    const user = await authenticateRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const body = await request.json();
    const { name, number, type, isDefault } = body;

    // Validate required fields
    if (!name || !number || !type) {
      return NextResponse.json(
        { error: 'Name, number, and type are required' },
        { status: 400 }
      );
    }

    // Check if vehicle number already exists for this user
    const existingVehicle = await Vehicle.findOne({
      user: user.userId,
      number: number.toUpperCase()
    });

    if (existingVehicle) {
      return NextResponse.json(
        { error: 'Vehicle with this number already exists' },
        { status: 409 }
      );
    }

    // If this is the user's first vehicle, make it default
    const vehicleCount = await Vehicle.countDocuments({ user: user.userId });
    const shouldBeDefault = vehicleCount === 0 || isDefault;

    const vehicle = new Vehicle({
      user: user.userId,
      name: name.trim(),
      number: number.toUpperCase().trim(),
      type,
      isDefault: shouldBeDefault
    });

    await vehicle.save();

    return NextResponse.json({
      message: 'Vehicle added successfully',
      vehicle
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating vehicle:', error);
    
    // Handle duplicate key error
    if (error.code === 11000) {
      return NextResponse.json(
        { error: 'Vehicle with this number already exists' },
        { status: 409 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to create vehicle' },
      { status: 500 }
    );
  }
}