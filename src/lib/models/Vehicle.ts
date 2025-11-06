import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IVehicle extends Document {
  _id: Types.ObjectId;
  user: Types.ObjectId;
  name: string;
  number: string;
  type: 'car' | 'bike' | 'truck' | 'suv' | 'other';
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const VehicleSchema = new Schema<IVehicle>({
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: [100, 'Vehicle name cannot exceed 100 characters']
  },
  number: {
    type: String,
    required: true,
    trim: true,
    uppercase: true,
    maxlength: [20, 'Vehicle number cannot exceed 20 characters']
  },
  type: {
    type: String,
    required: true,
    enum: ['car', 'bike', 'truck', 'suv', 'other'],
    default: 'car'
  },
  isDefault: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Compound index to ensure unique vehicle numbers per user
VehicleSchema.index({ user: 1, number: 1 }, { unique: true });

// Pre-save middleware to ensure only one default vehicle per user
VehicleSchema.pre('save', async function(this: IVehicle, next) {
  // If this is a new vehicle and no default is set, check if it should be default
  if (this.isNew) {
    const existingVehicles = await mongoose.model('Vehicle').countDocuments({ user: this.user });
    if (existingVehicles === 0) {
      this.isDefault = true;
    }
  }
  
  if (this.isDefault && this.isModified('isDefault')) {
    // Remove default status from other vehicles of the same user
    await mongoose.model('Vehicle').updateMany(
      { user: this.user, _id: { $ne: this._id } },
      { isDefault: false }
    );
  }
  next();
});

// Static method to get user's vehicles
VehicleSchema.statics.getUserVehicles = async function(userId: Types.ObjectId) {
  return this.find({ user: userId }).sort({ isDefault: -1, createdAt: -1 });
};

// Static method to get user's default vehicle
VehicleSchema.statics.getDefaultVehicle = async function(userId: Types.ObjectId) {
  return this.findOne({ user: userId, isDefault: true });
};

const Vehicle = mongoose.models.Vehicle || mongoose.model<IVehicle>('Vehicle', VehicleSchema);

export default Vehicle;