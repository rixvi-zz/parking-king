import mongoose from 'mongoose';

export interface IBooking extends mongoose.Document {
  user: mongoose.Types.ObjectId;
  parkingSpot: mongoose.Types.ObjectId;
  startTime: Date;
  endTime: Date;
  totalAmount: number;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  paymentStatus: 'pending' | 'paid' | 'refunded';
  createdAt: Date;
  updatedAt: Date;
}

const bookingSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  parkingSpot: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ParkingSpot',
    required: true
  },
  startTime: {
    type: Date,
    required: [true, 'Please provide a start time']
  },
  endTime: {
    type: Date,
    required: [true, 'Please provide an end time']
  },
  totalAmount: {
    type: Number,
    required: [true, 'Please provide total amount'],
    min: [0, 'Amount cannot be negative']
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'cancelled', 'completed'],
    default: 'pending'
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'refunded'],
    default: 'pending'
  }
}, {
  timestamps: true
});

bookingSchema.index({ user: 1, createdAt: -1 });
bookingSchema.index({ parkingSpot: 1, startTime: 1, endTime: 1 });

export default mongoose.models.Booking || mongoose.model<IBooking>('Booking', bookingSchema);