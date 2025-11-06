import mongoose from 'mongoose';

export interface IParkingSpot extends mongoose.Document {
  title: string;
  description: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  pricePerHour: number;
  images: string[];
  amenities: string[];
  availability: {
    startTime: string;
    endTime: string;
    days: string[];
  };
  host: mongoose.Types.ObjectId;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const parkingSpotSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Please provide a title'],
    maxlength: [100, 'Title cannot be more than 100 characters']
  },
  description: {
    type: String,
    required: [true, 'Please provide a description'],
    maxlength: [500, 'Description cannot be more than 500 characters']
  },
  address: {
    type: String,
    required: [true, 'Please provide an address']
  },
  city: {
    type: String,
    required: [true, 'Please provide a city']
  },
  state: {
    type: String,
    required: [true, 'Please provide a state']
  },
  zipCode: {
    type: String,
    required: [true, 'Please provide a zip code']
  },
  coordinates: {
    lat: {
      type: Number,
      required: true
    },
    lng: {
      type: Number,
      required: true
    }
  },
  pricePerHour: {
    type: Number,
    required: [true, 'Please provide a price per hour'],
    min: [0, 'Price cannot be negative']
  },
  images: [{
    type: String
  }],
  amenities: [{
    type: String,
    enum: ['covered', 'security', 'ev-charging', 'handicap-accessible', 'valet', '24-7-access']
  }],
  availability: {
    startTime: {
      type: String,
      required: true,
      default: '00:00'
    },
    endTime: {
      type: String,
      required: true,
      default: '23:59'
    },
    days: [{
      type: String,
      enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
    }]
  },
  host: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

parkingSpotSchema.index({ coordinates: '2dsphere' });
parkingSpotSchema.index({ city: 1, state: 1 });
parkingSpotSchema.index({ pricePerHour: 1 });

export default mongoose.models.ParkingSpot || mongoose.model<IParkingSpot>('ParkingSpot', parkingSpotSchema);