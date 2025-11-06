import { z } from 'zod';

// Create vehicle schema
export const createVehicleSchema = z.object({
  make: z
    .string()
    .min(1, 'Make is required')
    .max(50, 'Make must be less than 50 characters')
    .trim(),
  model: z
    .string()
    .min(1, 'Model is required')
    .max(50, 'Model must be less than 50 characters')
    .trim(),
  year: z
    .number()
    .min(1900, 'Year must be 1900 or later')
    .max(new Date().getFullYear() + 1, `Year cannot be later than ${new Date().getFullYear() + 1}`)
    .int('Year must be a whole number'),
  color: z
    .string()
    .min(1, 'Color is required')
    .max(30, 'Color must be less than 30 characters')
    .trim(),
  licensePlate: z
    .string()
    .min(1, 'License plate is required')
    .max(15, 'License plate must be less than 15 characters')
    .regex(/^[A-Z0-9\-\s]+$/i, 'License plate can only contain letters, numbers, hyphens, and spaces')
    .transform(val => val.toUpperCase().trim()),
  type: z.enum(['car', 'suv', 'truck', 'motorcycle', 'rv', 'trailer'], {
    errorMap: () => ({ message: 'Please select a valid vehicle type' }),
  }),
  dimensions: z.object({
    length: z
      .number()
      .min(1, 'Length must be at least 1 foot')
      .max(100, 'Length must be less than 100 feet')
      .optional(),
    width: z
      .number()
      .min(1, 'Width must be at least 1 foot')
      .max(20, 'Width must be less than 20 feet')
      .optional(),
    height: z
      .number()
      .min(1, 'Height must be at least 1 foot')
      .max(20, 'Height must be less than 20 feet')
      .optional(),
  }).optional(),
  weight: z
    .number()
    .min(100, 'Weight must be at least 100 lbs')
    .max(100000, 'Weight must be less than 100000 lbs')
    .optional(),
  isElectric: z.boolean().default(false),
  notes: z
    .string()
    .max(500, 'Notes must be less than 500 characters')
    .optional()
    .or(z.literal('')),
});

// Update vehicle schema (all fields optional except ID)
export const updateVehicleSchema = createVehicleSchema.partial().extend({
  id: z.string().min(1, 'Vehicle ID is required'),
});

// Vehicle search schema
export const searchVehiclesSchema = z.object({
  userId: z.string().min(1, 'User ID is required').optional(),
  make: z.string().max(50, 'Make must be less than 50 characters').optional(),
  model: z.string().max(50, 'Model must be less than 50 characters').optional(),
  type: z.enum(['car', 'suv', 'truck', 'motorcycle', 'rv', 'trailer']).optional(),
  yearRange: z.object({
    min: z.number().min(1900).optional(),
    max: z.number().max(new Date().getFullYear() + 1).optional(),
  }).optional(),
  isElectric: z.boolean().optional(),
  sortBy: z.enum(['make', 'model', 'year', 'createdAt']).default('make'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(20),
});

// Vehicle compatibility check schema
export const vehicleCompatibilitySchema = z.object({
  vehicleId: z.string().min(1, 'Vehicle ID is required'),
  spotId: z.string().min(1, 'Parking spot ID is required'),
});

// Bulk vehicle import schema
export const bulkVehicleImportSchema = z.object({
  vehicles: z
    .array(createVehicleSchema.omit({ licensePlate: true }).extend({
      licensePlate: z
        .string()
        .min(1, 'License plate is required')
        .max(15, 'License plate must be less than 15 characters')
        .regex(/^[A-Z0-9\-\s]+$/i, 'License plate can only contain letters, numbers, hyphens, and spaces'),
    }))
    .min(1, 'At least one vehicle is required')
    .max(50, 'Maximum 50 vehicles can be imported at once'),
}).refine((data) => {
  // Check for duplicate license plates
  const licensePlates = data.vehicles.map(v => v.licensePlate.toUpperCase().trim());
  const uniquePlates = new Set(licensePlates);
  return uniquePlates.size === licensePlates.length;
}, {
  message: 'Duplicate license plates found in import data',
  path: ['vehicles'],
});

// Vehicle verification schema
export const vehicleVerificationSchema = z.object({
  id: z.string().min(1, 'Vehicle ID is required'),
  verificationDocuments: z
    .array(z.object({
      type: z.enum(['registration', 'insurance', 'inspection']),
      url: z.string().url('Please provide a valid document URL'),
      expirationDate: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid expiration date format')
        .optional(),
    }))
    .min(1, 'At least one verification document is required')
    .max(10, 'Maximum 10 documents allowed'),
});

// Vehicle ID schema
export const vehicleIdSchema = z.object({
  id: z.string().min(1, 'Vehicle ID is required'),
});

// License plate validation schema
export const licensePlateSchema = z.object({
  licensePlate: z
    .string()
    .min(1, 'License plate is required')
    .max(15, 'License plate must be less than 15 characters')
    .regex(/^[A-Z0-9\-\s]+$/i, 'License plate can only contain letters, numbers, hyphens, and spaces')
    .transform(val => val.toUpperCase().trim()),
});

// Vehicle statistics schema
export const vehicleStatsSchema = z.object({
  userId: z.string().min(1, 'User ID is required').optional(),
  startDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid start date format')
    .optional(),
  endDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid end date format')
    .optional(),
}).refine((data) => {
  if (data.startDate && data.endDate) {
    return new Date(data.startDate) <= new Date(data.endDate);
  }
  return true;
}, {
  message: 'End date must be after or equal to start date',
  path: ['endDate'],
});

// Export types
export type CreateVehicleInput = z.infer<typeof createVehicleSchema>;
export type UpdateVehicleInput = z.infer<typeof updateVehicleSchema>;
export type SearchVehiclesInput = z.infer<typeof searchVehiclesSchema>;
export type VehicleCompatibilityInput = z.infer<typeof vehicleCompatibilitySchema>;
export type BulkVehicleImportInput = z.infer<typeof bulkVehicleImportSchema>;
export type VehicleVerificationInput = z.infer<typeof vehicleVerificationSchema>;
export type VehicleIdInput = z.infer<typeof vehicleIdSchema>;
export type LicensePlateInput = z.infer<typeof licensePlateSchema>;
export type VehicleStatsInput = z.infer<typeof vehicleStatsSchema>;