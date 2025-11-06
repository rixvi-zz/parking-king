import { z } from 'zod';

// Create booking schema
export const createBookingSchema = z.object({
  spotId: z.string().min(1, 'Parking spot ID is required'),
  vehicleId: z.string().min(1, 'Vehicle ID is required'),
  startTime: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, 'Invalid start time format'),
  endTime: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, 'Invalid end time format'),
  notes: z
    .string()
    .max(500, 'Notes must be less than 500 characters')
    .optional()
    .or(z.literal('')),
}).refine((data) => {
  const start = new Date(data.startTime);
  const end = new Date(data.endTime);
  const now = new Date();
  
  // Check if start time is in the future
  if (start <= now) {
    return false;
  }
  
  // Check if end time is after start time
  if (end <= start) {
    return false;
  }
  
  // Check minimum booking duration (1 hour)
  const durationHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
  if (durationHours < 1) {
    return false;
  }
  
  // Check maximum booking duration (30 days)
  const durationDays = durationHours / 24;
  if (durationDays > 30) {
    return false;
  }
  
  return true;
}, {
  message: 'Invalid booking time range',
  path: ['endTime'],
});

// Update booking schema
export const updateBookingSchema = z.object({
  id: z.string().min(1, 'Booking ID is required'),
  startTime: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, 'Invalid start time format')
    .optional(),
  endTime: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, 'Invalid end time format')
    .optional(),
  notes: z
    .string()
    .max(500, 'Notes must be less than 500 characters')
    .optional(),
}).refine((data) => {
  if (data.startTime && data.endTime) {
    const start = new Date(data.startTime);
    const end = new Date(data.endTime);
    const now = new Date();
    
    // Check if start time is in the future
    if (start <= now) {
      return false;
    }
    
    // Check if end time is after start time
    if (end <= start) {
      return false;
    }
    
    // Check minimum booking duration (1 hour)
    const durationHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
    if (durationHours < 1) {
      return false;
    }
    
    // Check maximum booking duration (30 days)
    const durationDays = durationHours / 24;
    if (durationDays > 30) {
      return false;
    }
  }
  
  return true;
}, {
  message: 'Invalid booking time range',
  path: ['endTime'],
});

// Cancel booking schema
export const cancelBookingSchema = z.object({
  id: z.string().min(1, 'Booking ID is required'),
  reason: z
    .string()
    .min(1, 'Cancellation reason is required')
    .max(500, 'Reason must be less than 500 characters')
    .trim(),
});

// Extend booking schema
export const extendBookingSchema = z.object({
  id: z.string().min(1, 'Booking ID is required'),
  newEndTime: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, 'Invalid end time format'),
}).refine((data) => {
  const newEnd = new Date(data.newEndTime);
  const now = new Date();
  
  // Check if new end time is in the future
  if (newEnd <= now) {
    return false;
  }
  
  return true;
}, {
  message: 'New end time must be in the future',
  path: ['newEndTime'],
});

// Search bookings schema
export const searchBookingsSchema = z.object({
  userId: z.string().min(1, 'User ID is required').optional(),
  spotId: z.string().min(1, 'Spot ID is required').optional(),
  status: z.enum(['pending', 'confirmed', 'active', 'completed', 'cancelled']).optional(),
  startDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid start date format')
    .optional(),
  endDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid end date format')
    .optional(),
  sortBy: z.enum(['startTime', 'endTime', 'createdAt', 'totalPrice']).default('startTime'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(20),
}).refine((data) => {
  if (data.startDate && data.endDate) {
    return new Date(data.startDate) <= new Date(data.endDate);
  }
  return true;
}, {
  message: 'End date must be after or equal to start date',
  path: ['endDate'],
});

// Booking payment schema
export const bookingPaymentSchema = z.object({
  bookingId: z.string().min(1, 'Booking ID is required'),
  paymentMethodId: z.string().min(1, 'Payment method ID is required'),
  amount: z
    .number()
    .min(0.01, 'Amount must be at least $0.01')
    .max(10000, 'Amount must be less than $10000')
    .multipleOf(0.01, 'Amount must be in cents'),
});

// Booking review schema
export const bookingReviewSchema = z.object({
  bookingId: z.string().min(1, 'Booking ID is required'),
  rating: z
    .number()
    .min(1, 'Rating must be at least 1')
    .max(5, 'Rating must be at most 5')
    .int('Rating must be a whole number'),
  comment: z
    .string()
    .min(10, 'Comment must be at least 10 characters')
    .max(1000, 'Comment must be less than 1000 characters')
    .trim(),
  wouldRecommend: z.boolean(),
});

// Check availability schema
export const checkAvailabilitySchema = z.object({
  spotId: z.string().min(1, 'Parking spot ID is required'),
  startTime: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, 'Invalid start time format'),
  endTime: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, 'Invalid end time format'),
}).refine((data) => {
  const start = new Date(data.startTime);
  const end = new Date(data.endTime);
  const now = new Date();
  
  // Check if start time is in the future
  if (start <= now) {
    return false;
  }
  
  // Check if end time is after start time
  if (end <= start) {
    return false;
  }
  
  // Check minimum booking duration (1 hour)
  const durationHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
  if (durationHours < 1) {
    return false;
  }
  
  return true;
}, {
  message: 'Invalid time range for availability check',
  path: ['endTime'],
});

// Booking ID schema
export const bookingIdSchema = z.object({
  id: z.string().min(1, 'Booking ID is required'),
});

// Export types
export type CreateBookingInput = z.infer<typeof createBookingSchema>;
export type UpdateBookingInput = z.infer<typeof updateBookingSchema>;
export type CancelBookingInput = z.infer<typeof cancelBookingSchema>;
export type ExtendBookingInput = z.infer<typeof extendBookingSchema>;
export type SearchBookingsInput = z.infer<typeof searchBookingsSchema>;
export type BookingPaymentInput = z.infer<typeof bookingPaymentSchema>;
export type BookingReviewInput = z.infer<typeof bookingReviewSchema>;
export type CheckAvailabilityInput = z.infer<typeof checkAvailabilitySchema>;
export type BookingIdInput = z.infer<typeof bookingIdSchema>;