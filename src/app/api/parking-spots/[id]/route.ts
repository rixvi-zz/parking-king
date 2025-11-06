import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/database';
import ParkingSpot from '@/lib/models/ParkingSpot';
import { authenticateRequest } from '@/lib/auth';

// GET /api/parking-spots/[id] - Get single parking spot
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();
    
    const spot = await ParkingSpot.findById(params.id)
      .populate('owner', 'name email phone')
      .lean();
    
    if (!spot) {
      return NextResponse.json(
        { error: 'Parking spot not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: spot
    });

  } catch (error: any) {
    console.error('Get parking spot error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT /api/parking-spots/[id] - Update parking spot (Owner only)
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();
    
    const user = await authenticateRequest(request);
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const spot = await ParkingSpot.findById(params.id);
    if (!spot) {
      return NextResponse.json(
        { error: 'Parking spot not found' },
        { status: 404 }
      );
    }

    // Check if user is the owner
    if (spot.owner.toString() !== user.userId) {
      return NextResponse.json(
        { error: 'You can only update your own parking spots' },
        { status: 403 }
      );
    }

    const updateData = await request.json();
    
    // Update the spot
    Object.assign(spot, updateData);
    await spot.save();

    // Populate owner info for response
    await spot.populate('owner', 'name email');

    return NextResponse.json({
      success: true,
      message: 'Parking spot updated successfully',
      data: spot
    });

  } catch (error: any) {
    console.error('Update parking spot error:', error);
    
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map((err: any) => err.message);
      return NextResponse.json(
        { error: 'Validation error', details: errors },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/parking-spots/[id] - Delete parking spot (Owner only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();
    
    const user = await authenticateRequest(request);
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const spot = await ParkingSpot.findById(params.id);
    if (!spot) {
      return NextResponse.json(
        { error: 'Parking spot not found' },
        { status: 404 }
      );
    }

    // Check if user is the owner
    if (spot.owner.toString() !== user.userId) {
      return NextResponse.json(
        { error: 'You can only delete your own parking spots' },
        { status: 403 }
      );
    }

    await ParkingSpot.findByIdAndDelete(params.id);

    return NextResponse.json({
      success: true,
      message: 'Parking spot deleted successfully'
    });

  } catch (error: any) {
    console.error('Delete parking spot error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}