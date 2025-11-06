import { Schema, model, models, Document } from "mongoose";
import bcrypt from "bcryptjs";

export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  role: "user" | "host" | "admin";
  createdAt: Date;
  updatedAt: Date;
  lastLogin?: Date;
  loginAttempts?: number;
  lockUntil?: Date;
  tokenVersion?: number;
  emailVerified?: boolean;
  emailVerificationToken?: string;
  passwordResetToken?: string;
  passwordResetExpires?: Date;
  twoFactorSecret?: string;
  twoFactorEnabled?: boolean;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const UserSchema = new Schema({
  name: { type: String, required: true, trim: true },
  email: { 
    type: String, 
    required: true, 
    unique: true, 
    lowercase: true, 
    trim: true,
    validate: {
      validator: function(v: string) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
      },
      message: 'Invalid email format'
    }
  },
  password: { type: String, required: true, minlength: 6, select: false },
  role: { type: String, enum: ["user", "host", "admin"], default: "user" },
  
  // Security fields
  lastLogin: { type: Date },
  loginAttempts: { type: Number, default: 0 },
  lockUntil: { type: Date },
  tokenVersion: { type: Number, default: 1 },
  
  // Email verification
  emailVerified: { type: Boolean, default: false },
  emailVerificationToken: { type: String, select: false },
  
  // Password reset
  passwordResetToken: { type: String, select: false },
  passwordResetExpires: { type: Date, select: false },
  
  // Two-factor authentication
  twoFactorSecret: { type: String, select: false },
  twoFactorEnabled: { type: Boolean, default: false },
}, { timestamps: true });

// Hash password before saving
UserSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error: any) {
    next(error);
  }
});

// Compare password method
UserSchema.methods.comparePassword = async function(candidatePassword: string): Promise<boolean> {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Remove password from JSON output
UserSchema.methods.toJSON = function() {
  const userObject = this.toObject();
  delete userObject.password;
  return userObject;
};

// Static method to find user by email
UserSchema.statics.findByEmail = async function(email: string) {
  return this.findOne({ email: email.toLowerCase() });
};

export default models.User || model<IUser>("User", UserSchema);