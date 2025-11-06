import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IBooking extends Document {
  _id: Types.ObjectId;
  user: Types.ObjectId;
  parkingSpot: Types.ObjectId;
  vehicle: Types.ObjectId;
  startTime: Date;
  endTime: Date;
  totalHours: number;
  totalPrice: number;
  status: 'pending' | 'confirmed' | 'active' | 'completed' | 'cancelled';
  paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded';
  paymentIntentId?: string;
  vehicleInfo: {
    licensePlate: string;
    make?: string;
    model?: string;
    color?: string;
  };
  specialInstructions?: string;
  createdAt: Date;
  updatedAt: Date;
}

const BookingSchema = new Schema<IBooking>({
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  parkingSpot: {
    type: Schema.Types.ObjectId,
    ref: 'ParkingSpot',
    required: true,
    index: true
  },
  startTime: {
    type: Date,
    required: true,
    validate: {
      validator: function(this: IBooking, value: Date) {
        return value > new Date();
      },
      message: 'Start time must be in the future'
    }
  },
  endTime: {
    type: Date,
    required: true,
    validate: {
      validator: function(this: IBooking, value: Date) {
        return value > this.startTime;
      },
      message: 'End time must be after start time'
    }
  },
  totalHours: {
    type: Number,
    min: [0.5, 'Minimum booking is 30 minutes'],
    max: [168, 'Maximum booking is 7 days']
  },
  totalPrice: {
    type: Number,
    min: [0, 'Price cannot be negative']
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'active', 'completed', 'cancelled'],
    default: 'pending',
    index: true
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'failed', 'refunded'],
    default: 'pending',
    index: true
  },
  paymentIntentId: {
    type: String,
    sparse: true
  },
  vehicle: {
    type: Schema.Types.ObjectId,
    ref: 'Vehicle',
    required: true,
    index: true
  },
  vehicleInfo: {
    licensePlate: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      maxlength: [20, 'License plate cannot exceed 20 characters']
    },
    make: {
      type: String,
      trim: true,
      maxlength: [50, 'Vehicle make cannot exceed 50 characters']
    },
    model: {
      type: String,
      trim: true,
      maxlength: [50, 'Vehicle model cannot exceed 50 characters']
    },
    color: {
      type: String,
      trim: true,
      maxlength: [30, 'Vehicle color cannot exceed 30 characters']
    }
  },
  specialInstructions: {
    type: String,
    trim: true,
    maxlength: [500, 'Special instructions cannot exceed 500 characters']
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Compound indexes for efficient queries
BookingSchema.index({ user: 1, createdAt: -1 });
BookingSchema.index({ parkingSpot: 1, startTime: 1, endTime: 1 });
BookingSchema.index({ status: 1, startTime: 1 });
BookingSchema.index({ paymentStatus: 1, createdAt: -1 });

// Prevent overlapping bookings for the same parking spot
BookingSchema.index(
  { 
    parkingSpot: 1, 
    startTime: 1, 
    endTime: 1 
  },
  {
    partialFilterExpression: {
      status: { $in: ['confirmed', 'active'] }
    }
  }
);

// Virtual for duration in minutes
BookingSchema.virtual('durationMinutes').get(function(this: IBooking) {
  return Math.round((this.endTime.getTime() - this.startTime.getTime()) / (1000 * 60));
});

// Virtual for formatted duration
BookingSchema.virtual('formattedDuration').get(function(this: IBooking) {
  const hours = Math.floor(this.totalHours);
  const minutes = Math.round((this.totalHours - hours) * 60);
  
  if (hours === 0) {
    return `${minutes} minutes`;
  } else if (minutes === 0) {
    return `${hours} hour${hours > 1 ? 's' : ''}`;
  } else {
    return `${hours} hour${hours > 1 ? 's' : ''} ${minutes} minutes`;
  }
});

// Virtual for booking reference number
BookingSchema.virtual('referenceNumber').get(function(this: IBooking) {
  return `PK${this._id.toString().slice(-8).toUpperCase()}`;
});

// Pre-save middleware to calculate total hours and price
BookingSchema.pre('save', async function(this: IBooking, next) {
  if (this.isNew || this.isModified('startTime') || this.isModified('endTime') || this.isModified('parkingSpot')) {
    // Calculate total hours
    const diffMs = this.endTime.getTime() - this.startTime.getTime();
    this.totalHours = Math.round((diffMs / (1000 * 60 * 60)) * 100) / 100; // Round to 2 decimal places
    
    // Validate duration
    if (this.totalHours < 0.5) {
      return next(new Error('Minimum booking duration is 30 minutes'));
    }
    
    if (this.totalHours > 168) {
      return next(new Error('Maximum booking duration is 7 days'));
    }
    
    // Get parking spot to calculate price
    try {
      const ParkingSpot = mongoose.model('ParkingSpot');
      const spot = await ParkingSpot.findById(this.parkingSpot);
      if (spot) {
        this.totalPrice = Math.round(this.totalHours * spot.pricePerHour * 100) / 100;
      } else {
        return next(new Error('Parking spot not found'));
      }
    } catch (error) {
      return next(error as Error);
    }
  }
  next();
});

// Static method to check availability
BookingSchema.statics.checkAvailability = async function(
  parkingSpotId: Types.ObjectId,
  startTime: Date,
  endTime: Date,
  excludeBookingId?: Types.ObjectId
) {
  const query: any = {
    parkingSpot: parkingSpotId,
    status: { $in: ['confirmed', 'active'] },
    $or: [
      {
        startTime: { $lt: endTime },
        endTime: { $gt: startTime }
      }
    ]
  };
  
  if (excludeBookingId) {
    query._id = { $ne: excludeBookingId };
  }
  
  const conflictingBooking = await this.findOne(query);
  return !conflictingBooking;
};

// Static method to get user's bookings with pagination
BookingSchema.statics.getUserBookings = async function(
  userId: Types.ObjectId,
  page: number = 1,
  limit: number = 10,
  status?: string
) {
  const query: any = { user: userId };
  if (status) {
    query.status = status;
  }
  
  const skip = (page - 1) * limit;
  
  const [bookings, total] = await Promise.all([
    this.find(query)
      .populate('parkingSpot', 'title address city state pricePerHour images')
      .populate('vehicle', 'name number type')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    this.countDocuments(query)
  ]);
  
  return {
    bookings,
    total,
    page,
    pages: Math.ceil(total / limit),
    hasNext: page < Math.ceil(total / limit),
    hasPrev: page > 1
  };
};

// Static method to get host's bookings
BookingSchema.statics.getHostBookings = async function(
  hostId: Types.ObjectId,
  page: number = 1,
  limit: number = 10,
  status?: string
) {
  const ParkingSpot = mongoose.model('ParkingSpot');
  const hostSpots = await ParkingSpot.find({ owner: hostId }).select('_id');
  const spotIds = hostSpots.map(spot => spot._id);
  
  const query: any = { parkingSpot: { $in: spotIds } };
  if (status) {
    query.status = status;
  }
  
  const skip = (page - 1) * limit;
  
  const [bookings, total] = await Promise.all([
    this.find(query)
      .populate('user', 'name email')
      .populate('parkingSpot', 'title address city state pricePerHour')
      .populate('vehicle', 'name number type')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    this.countDocuments(query)
  ]);
  
  return {
    bookings,
    total,
    page,
    pages: Math.ceil(total / limit),
    hasNext: page < Math.ceil(total / limit),
    hasPrev: page > 1
  };
};

const Booking = mongoose.models.Booking || mongoose.model<IBooking>('Booking', BookingSchema);

export default Booking;