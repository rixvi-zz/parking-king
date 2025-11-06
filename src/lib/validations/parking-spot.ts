import { z } from 'zod';

// Coordinates schema
export const coordinatesSchema = z.object({
  latitude: z
    .number()
    .min(-90, 'Latitude must be between -90 and 90')
    .max(90, 'Latitude must be between -90 and 90'),
  longitude: z
    .number()
    .min(-180, 'Longitude must be between -180 and 180')
    .max(180, 'Longitude must be between -180 and 180'),
});

// Location schema
export const locationSchema = z.object({
  address: z
    .string()
    .min(5, 'Address must be at least 5 characters')
    .max(200, 'Address must be less than 200 characters')
    .trim(),
  city: z
    .string()
    .min(2, 'City must be at least 2 characters')
    .max(50, 'City must be less than 50 characters')
    .trim(),
  state: z
    .string()
    .min(2, 'State must be at least 2 characters')
    .max(50, 'State must be less than 50 characters')
    .trim(),
  zipCode: z
    .string()
    .regex(/^\d{5}(-\d{4})?$/, 'Please enter a valid ZIP code')
    .trim(),
  country: z
    .string()
    .min(2, 'Country must be at least 2 characters')
    .max(50, 'Country must be less than 50 characters')
    .trim(),
  coordinates: coordinatesSchema,
});

// Availability schema
export const availabilitySchema = z.object({
  startTime: z
    .string()
    .regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Please enter a valid time (HH:MM)'),
  endTime: z
    .string()
    .regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Please enter a valid time (HH:MM)'),
  daysOfWeek: z
    .array(z.number().min(0).max(6))
    .min(1, 'Please select at least one day')
    .max(7, 'Invalid days selection'),
  exceptions: z
    .array(z.object({
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format'),
      unavailable: z.boolean(),
      reason: z.string().max(100, 'Reason must be less than 100 characters').optional(),
    }))
    .optional(),
}).refine((data) => {
  const start = new Date(`2000-01-01T${data.startTime}:00`);
  const end = new Date(`2000-01-01T${data.endTime}:00`);
  return start < end;
}, {
  message: 'End time must be after start time',
  path: ['endTime'],
});

// Pricing schema
export const pricingSchema = z.object({
  hourlyRate: z
    .number()
    .min(0.01, 'Hourly rate must be at least $0.01')
    .max(1000, 'Hourly rate must be less than $1000')
    .multipleOf(0.01, 'Price must be in cents'),
  dailyRate: z
    .number()
    .min(0.01, 'Daily rate must be at least $0.01')
    .max(10000, 'Daily rate must be less than $10000')
    .multipleOf(0.01, 'Price must be in cents')
    .optional(),
  weeklyRate: z
    .number()
    .min(0.01, 'Weekly rate must be at least $0.01')
    .max(50000, 'Weekly rate must be less than $50000')
    .multipleOf(0.01, 'Price must be in cents')
    .optional(),
  monthlyRate: z
    .number()
    .min(0.01, 'Monthly rate must be at least $0.01')
    .max(200000, 'Monthly rate must be less than $200000')
    .multipleOf(0.01, 'Price must be in cents')
    .optional(),
});

// Features/amenities schema
export const featuresSchema = z.array(
  z.enum([
    'covered',
    'ev-charging',
    'security-camera',
    'gated',
    'handicap-accessible',
    'valet',
    '24-7-access',
    'lighting',
    'restroom',
    'car-wash',
  ])
).optional();

// Vehicle restrictions schema
export const vehicleRestrictionsSchema = z.object({
  maxHeight: z
    .number()
    .min(0.1, 'Max height must be at least 0.1 feet')
    .max(20, 'Max height must be less than 20 feet')
    .optional(),
  maxLength: z
    .number()
    .min(1, 'Max length must be at least 1 foot')
    .max(100, 'Max length must be less than 100 feet')
    .optional(),
  maxWeight: z
    .number()
    .min(100, 'Max weight must be at least 100 lbs')
    .max(100000, 'Max weight must be less than 100000 lbs')
    .optional(),
  allowedVehicleTypes: z
    .array(z.enum(['car', 'suv', 'truck', 'motorcycle', 'rv', 'trailer']))
    .min(1, 'Please select at least one vehicle type'),
});

// Create parking spot schema
export const createParkingSpotSchema = z.object({
  title: z
    .string()
    .min(5, 'Title must be at least 5 characters')
    .max(100, 'Title must be less than 100 characters')
    .trim(),
  description: z
    .string()
    .min(10, 'Description must be at least 10 characters')
    .max(1000, 'Description must be less than 1000 characters')
    .trim(),
  type: z.enum(['street', 'driveway', 'garage', 'lot', 'covered'], {
    errorMap: () => ({ message: 'Please select a valid parking spot type' }),
  }),
  location: locationSchema,
  availability: availabilitySchema,
  pricing: pricingSchema,
  features: featuresSchema,
  vehicleRestrictions: vehicleRestrictionsSchema.optional(),
  images: z
    .array(z.string().url('Please provide valid image URLs'))
    .min(1, 'Please provide at least one image')
    .max(10, 'Maximum 10 images allowed'),
  instructions: z
    .string()
    .max(500, 'Instructions must be less than 500 characters')
    .optional()
    .or(z.literal('')),
});

// Update parking spot schema (all fields optional except ID)
export const updateParkingSpotSchema = createParkingSpotSchema.partial().extend({
  id: z.string().min(1, 'Parking spot ID is required'),
});

// Search/filter schema
export const searchParkingSpotSchema = z.object({
  query: z.string().max(100, 'Search query must be less than 100 characters').optional(),
  location: z.object({
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
    radius: z.number().min(0.1).max(50).default(5), // radius in miles
  }).optional(),
  priceRange: z.object({
    min: z.number().min(0).optional(),
    max: z.number().min(0).optional(),
  }).optional(),
  features: featuresSchema,
  vehicleType: z.enum(['car', 'suv', 'truck', 'motorcycle', 'rv', 'trailer']).optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, 'Invalid start date format').optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, 'Invalid end date format').optional(),
  sortBy: z.enum(['price', 'distance', 'rating', 'newest']).default('distance'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(20),
}).refine((data) => {
  if (data.startDate && data.endDate) {
    return new Date(data.startDate) < new Date(data.endDate);
  }
  return true;
}, {
  message: 'End date must be after start date',
  path: ['endDate'],
});

// Parking spot ID schema
export const parkingSpotIdSchema = z.object({
  id: z.string().min(1, 'Parking spot ID is required'),
});

// Export types
export type CreateParkingSpotInput = z.infer<typeof createParkingSpotSchema>;
export type UpdateParkingSpotInput = z.infer<typeof updateParkingSpotSchema>;
export type SearchParkingSpotInput = z.infer<typeof searchParkingSpotSchema>;
export type ParkingSpotIdInput = z.infer<typeof parkingSpotIdSchema>;
export type LocationInput = z.infer<typeof locationSchema>;
export type AvailabilityInput = z.infer<typeof availabilitySchema>;
export type PricingInput = z.infer<typeof pricingSchema>;
export type VehicleRestrictionsInput = z.infer<typeof vehicleRestrictionsSchema>;