import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/database';
import ParkingSpot from '@/lib/models/ParkingSpot';
import { authenticateRequest } from '@/lib/auth';

// GET /api/parking-spots - Get all parking spots with filtering
export async function GET(request: NextRequest) {
  try {
    await connectDB();
    
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const city = searchParams.get('city');
    const state = searchParams.get('state');
    const minPrice = searchParams.get('minPrice');
    const maxPrice = searchParams.get('maxPrice');
    const amenities = searchParams.get('amenities');
    const search = searchParams.get('search');
    const lat = searchParams.get('lat');
    const lng = searchParams.get('lng');
    const radius = searchParams.get('radius'); // in kilometers

    // Build query
    const query: any = { active: true };
    
    if (city) {
      query.city = new RegExp(city, 'i');
    }
    
    if (state) {
      query.state = new RegExp(state, 'i');
    }
    
    if (minPrice || maxPrice) {
      query.pricePerHour = {};
      if (minPrice) query.pricePerHour.$gte = parseFloat(minPrice);
      if (maxPrice) query.pricePerHour.$lte = parseFloat(maxPrice);
    }
    
    if (amenities) {
      const amenityList = amenities.split(',');
      query.amenities = { $in: amenityList };
    }
    
    if (search) {
      query.$text = { $search: search };
    }

    // Location-based search
    if (lat && lng && radius) {
      const latitude = parseFloat(lat);
      const longitude = parseFloat(lng);
      const radiusKm = parseFloat(radius);
      
      // Find spots within radius (using simple distance calculation)
      query.$expr = {
        $lte: [
          {
            $multiply: [
              6371, // Earth's radius in km
              {
                $acos: {
                  $add: [
                    {
                      $multiply: [
                        { $sin: { $multiply: [{ $divide: [latitude, 180] }, Math.PI] } },
                        { $sin: { $multiply: [{ $divide: ["$location.lat", 180] }, Math.PI] } }
                      ]
                    },
                    {
                      $multiply: [
                        { $cos: { $multiply: [{ $divide: [latitude, 180] }, Math.PI] } },
                        { $cos: { $multiply: [{ $divide: ["$location.lat", 180] }, Math.PI] } },
                        { $cos: { $multiply: [{ $divide: [{ $subtract: [longitude, "$location.lng"] }, 180] }, Math.PI] } }
                      ]
                    }
                  ]
                }
              }
            ]
          },
          radiusKm
        ]
      };
    }

    const skip = (page - 1) * limit;
    
    const [spots, total] = await Promise.all([
      ParkingSpot.find(query)
        .populate('owner', 'name email')
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
    console.error('Get parking spots error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/parking-spots - Create new parking spot (Host only)
export async function POST(request: NextRequest) {
  try {
    await connectDB();
    
    const user = await authenticateRequest(request);
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    if (user.role !== 'host') {
      return NextResponse.json(
        { error: 'Only hosts can create parking spots' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      title,
      description,
      pricePerHour,
      location,
      address,
      city,
      state,
      zipCode,
      images = [],
      amenities = [],
      availability = {
        startTime: '00:00',
        endTime: '23:59',
        days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
      }
    } = body;

    // Validate required fields
    if (!title || !description || !pricePerHour || !location || !address || !city || !state || !zipCode) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate location
    if (!location.lat || !location.lng) {
      return NextResponse.json(
        { error: 'Invalid location coordinates' },
        { status: 400 }
      );
    }

    // Create parking spot
    const parkingSpot = new ParkingSpot({
      title: title.trim(),
      description: description.trim(),
      owner: user.userId,
      pricePerHour: parseFloat(pricePerHour),
      location: {
        lat: parseFloat(location.lat),
        lng: parseFloat(location.lng)
      },
      address: address.trim(),
      city: city.trim(),
      state: state.trim(),
      zipCode: zipCode.trim(),
      images,
      amenities,
      availability,
      active: true
    });

    await parkingSpot.save();

    // Populate owner info for response
    await parkingSpot.populate('owner', 'name email');

    return NextResponse.json({
      success: true,
      message: 'Parking spot created successfully',
      data: parkingSpot
    }, { status: 201 });

  } catch (error: any) {
    console.error('Create parking spot error:', error);
    
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