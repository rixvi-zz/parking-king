import { Schema, model, models, Types, Document } from "mongoose";

export interface IParkingSpot extends Document {
  title: string;
  description: string;
  owner: Types.ObjectId;
  pricePerHour: number;
  location: {
    lat: number;
    lng: number;
  };
  address: string;
  city: string;
  state: string;
  zipCode: string;
  active: boolean;
  images: string[];
  amenities: string[];
  availability: {
    startTime: string;
    endTime: string;
    days: string[];
  };
  createdAt: Date;
  updatedAt: Date;
}

const ParkingSpotSchema = new Schema({
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true,
    maxlength: [100, 'Title cannot exceed 100 characters']
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  owner: {
    type: Types.ObjectId,
    ref: "User",
    required: [true, 'Owner is required']
  },
  pricePerHour: {
    type: Number,
    required: [true, 'Price per hour is required'],
    min: [0, 'Price cannot be negative'],
    max: [1000, 'Price cannot exceed $1000 per hour']
  },
  location: {
    lat: {
      type: Number,
      required: [true, 'Latitude is required'],
      min: [-90, 'Invalid latitude'],
      max: [90, 'Invalid latitude']
    },
    lng: {
      type: Number,
      required: [true, 'Longitude is required'],
      min: [-180, 'Invalid longitude'],
      max: [180, 'Invalid longitude']
    }
  },
  address: {
    type: String,
    required: [true, 'Address is required'],
    trim: true
  },
  city: {
    type: String,
    required: [true, 'City is required'],
    trim: true
  },
  state: {
    type: String,
    required: [true, 'State is required'],
    trim: true
  },
  zipCode: {
    type: String,
    required: [true, 'Zip code is required'],
    trim: true
  },
  active: {
    type: Boolean,
    default: true
  },
  images: [{
    type: String,
    validate: {
      validator: function(v: string) {
        return /^https?:\/\/.+\.(jpg|jpeg|png|gif|webp)$/i.test(v);
      },
      message: 'Invalid image URL format'
    }
  }],
  amenities: [{
    type: String,
    enum: [
      'covered-parking',
      'security-camera',
      'ev-charging',
      'handicap-accessible',
      'valet-service',
      '24-7-access',
      'well-lit',
      'gated',
      'attendant'
    ]
  }],
  availability: {
    startTime: {
      type: String,
      default: '00:00',
      validate: {
        validator: function(v: string) {
          return /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(v);
        },
        message: 'Invalid time format (HH:MM)'
      }
    },
    endTime: {
      type: String,
      default: '23:59',
      validate: {
        validator: function(v: string) {
          return /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(v);
        },
        message: 'Invalid time format (HH:MM)'
      }
    },
    days: [{
      type: String,
      enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
    }]
  }
}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Create geospatial index for location-based queries
ParkingSpotSchema.index({ 
  "location.lat": 1, 
  "location.lng": 1 
});

// Index for search queries
ParkingSpotSchema.index({ 
  title: 'text', 
  description: 'text',
  city: 'text',
  state: 'text'
});

// Index for filtering
ParkingSpotSchema.index({ active: 1, pricePerHour: 1 });
ParkingSpotSchema.index({ owner: 1, active: 1 });

// Virtual for full address
ParkingSpotSchema.virtual('fullAddress').get(function() {
  return `${this.address}, ${this.city}, ${this.state} ${this.zipCode}`;
});

// Static method for searching spots
ParkingSpotSchema.statics.searchSpots = async function(options: {
  search?: string;
  minPrice?: number;
  maxPrice?: number;
  amenities?: string[];
  lat?: number;
  lng?: number;
  radius?: number; // in kilometers
  page?: number;
  limit?: number;
}) {
  const {
    search,
    minPrice,
    maxPrice,
    amenities,
    lat,
    lng,
    radius = 10,
    page = 1,
    limit = 10
  } = options;

  const query: any = { active: true };

  // Text search
  if (search) {
    query.$text = { $search: search };
  }

  // Price range filter
  if (minPrice !== undefined || maxPrice !== undefined) {
    query.pricePerHour = {};
    if (minPrice !== undefined) query.pricePerHour.$gte = minPrice;
    if (maxPrice !== undefined) query.pricePerHour.$lte = maxPrice;
  }

  // Amenities filter
  if (amenities && amenities.length > 0) {
    query.amenities = { $in: amenities };
  }

  // Location-based search
  if (lat !== undefined && lng !== undefined) {
    const radiusInRadians = radius / 6371; // Earth's radius in km
    query['location.lat'] = {
      $gte: lat - radiusInRadians * (180 / Math.PI),
      $lte: lat + radiusInRadians * (180 / Math.PI)
    };
    query['location.lng'] = {
      $gte: lng - radiusInRadians * (180 / Math.PI) / Math.cos(lat * Math.PI / 180),
      $lte: lng + radiusInRadians * (180 / Math.PI) / Math.cos(lat * Math.PI / 180)
    };
  }

  const skip = (page - 1) * limit;

  const [spots, total] = await Promise.all([
    this.find(query)
      .populate('owner', 'name')
      .sort(search ? { score: { $meta: 'textScore' } } : { createdAt: -1 })
      .skip(skip)
      .limit(limit),
    this.countDocuments(query)
  ]);

  return {
    spots,
    total,
    page,
    pages: Math.ceil(total / limit),
    hasNext: page < Math.ceil(total / limit),
    hasPrev: page > 1
  };
};

export default models.ParkingSpot || model<IParkingSpot>("ParkingSpot", ParkingSpotSchema);