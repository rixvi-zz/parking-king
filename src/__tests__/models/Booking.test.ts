/**
 * @jest-environment node
 */

import mongoose from 'mongoose'
import { MongoMemoryServer } from 'mongodb-memory-server'
import Booking from '@/lib/models/Booking'
import User from '@/lib/models/User'
import ParkingSpot from '@/lib/models/ParkingSpot'
import Vehicle from '@/lib/models/Vehicle'

describe('Booking Model', () => {
  let mongoServer: MongoMemoryServer
  let testUser: any
  let testHost: any
  let testSpot: any
  let testVehicle: any

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create()
    const mongoUri = mongoServer.getUri()
    await mongoose.connect(mongoUri)
  })

  afterAll(async () => {
    await mongoose.disconnect()
    await mongoServer.stop()
  })

  beforeEach(async () => {
    await Booking.deleteMany({})
    await Vehicle.deleteMany({})
    await ParkingSpot.deleteMany({})
    await User.deleteMany({})
    
    // Create test user
    testUser = new User({
      name: 'Test User',
      email: 'user@example.com',
      password: 'password123',
      role: 'user',
    })
    await testUser.save()

    // Create test host
    testHost = new User({
      name: 'Test Host',
      email: 'host@example.com',
      password: 'password123',
      role: 'host',
    })
    await testHost.save()

    // Create test parking spot
    testSpot = new ParkingSpot({
      title: 'Test Parking Spot',
      description: 'Great spot for testing',
      owner: testHost._id,
      pricePerHour: 5.00,
      location: { lat: 40.7128, lng: -74.0060 },
      address: '123 Test St',
      city: 'Test City',
      state: 'TS',
      zipCode: '12345',
    })
    await testSpot.save()

    // Create test vehicle
    testVehicle = new Vehicle({
      user: testUser._id,
      name: 'Test Car',
      number: 'ABC123',
      type: 'car',
      isDefault: true,
    })
    await testVehicle.save()
  })

  describe('Booking Creation', () => {
    it('should create a valid booking', async () => {
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      tomorrow.setHours(10, 0, 0, 0)

      const endTime = new Date(tomorrow)
      endTime.setHours(12, 0, 0, 0)

      const bookingData = {
        user: testUser._id,
        parkingSpot: testSpot._id,
        vehicle: testVehicle._id,
        startTime: tomorrow,
        endTime: endTime,
        vehicleInfo: {
          licensePlate: 'ABC123',
          make: 'Honda',
          model: 'Civic',
          color: 'Blue',
        },
        specialInstructions: 'Please park carefully',
      }

      const booking = new Booking(bookingData)
      const savedBooking = await booking.save()

      expect(savedBooking._id).toBeDefined()
      expect(savedBooking.totalHours).toBe(2)
      expect(savedBooking.totalPrice).toBe(10.00) // 2 hours * $5/hour
      expect(savedBooking.status).toBe('pending')
      expect(savedBooking.paymentStatus).toBe('pending')
      expect(savedBooking.vehicleInfo.licensePlate).toBe('ABC123')
      expect(savedBooking.createdAt).toBeDefined()
    })

    it('should calculate total hours and price automatically', async () => {
      const startTime = new Date()
      startTime.setDate(startTime.getDate() + 1)
      startTime.setHours(9, 30, 0, 0)

      const endTime = new Date(startTime)
      endTime.setHours(11, 45, 0, 0) // 2.25 hours later

      const bookingData = {
        user: testUser._id,
        parkingSpot: testSpot._id,
        vehicle: testVehicle._id,
        startTime,
        endTime,
        vehicleInfo: {
          licensePlate: 'ABC123',
        },
      }

      const booking = new Booking(bookingData)
      await booking.save()

      expect(booking.totalHours).toBe(2.25)
      expect(booking.totalPrice).toBe(11.25) // 2.25 hours * $5/hour
    })

    it('should uppercase license plate', async () => {
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      tomorrow.setHours(10, 0, 0, 0)

      const endTime = new Date(tomorrow)
      endTime.setHours(11, 0, 0, 0)

      const bookingData = {
        user: testUser._id,
        parkingSpot: testSpot._id,
        vehicle: testVehicle._id,
        startTime: tomorrow,
        endTime: endTime,
        vehicleInfo: {
          licensePlate: 'abc123',
        },
      }

      const booking = new Booking(bookingData)
      await booking.save()

      expect(booking.vehicleInfo.licensePlate).toBe('ABC123')
    })
  })

  describe('Booking Validation', () => {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    tomorrow.setHours(10, 0, 0, 0)

    const endTime = new Date(tomorrow)
    endTime.setHours(11, 0, 0, 0)

    const baseBookingData = {
      user: null as any,
      parkingSpot: null as any,
      vehicle: null as any,
      startTime: tomorrow,
      endTime: endTime,
      vehicleInfo: {
        licensePlate: 'ABC123',
      },
    }

    beforeEach(() => {
      baseBookingData.user = testUser._id
      baseBookingData.parkingSpot = testSpot._id
      baseBookingData.vehicle = testVehicle._id
    })

    it('should require user', async () => {
      const bookingData = { ...baseBookingData }
      delete (bookingData as any).user

      const booking = new Booking(bookingData)
      await expect(booking.save()).rejects.toThrow()
    })

    it('should require parking spot', async () => {
      const bookingData = { ...baseBookingData }
      delete (bookingData as any).parkingSpot

      const booking = new Booking(bookingData)
      await expect(booking.save()).rejects.toThrow()
    })

    it('should require vehicle', async () => {
      const bookingData = { ...baseBookingData }
      delete (bookingData as any).vehicle

      const booking = new Booking(bookingData)
      await expect(booking.save()).rejects.toThrow()
    })

    it('should require start time', async () => {
      const bookingData = { ...baseBookingData }
      delete (bookingData as any).startTime

      const booking = new Booking(bookingData)
      await expect(booking.save()).rejects.toThrow()
    })

    it('should require end time', async () => {
      const bookingData = { ...baseBookingData }
      delete (bookingData as any).endTime

      const booking = new Booking(bookingData)
      await expect(booking.save()).rejects.toThrow()
    })

    it('should validate start time is in future', async () => {
      const pastTime = new Date()
      pastTime.setHours(pastTime.getHours() - 1)

      const bookingData = {
        ...baseBookingData,
        startTime: pastTime,
      }

      const booking = new Booking(bookingData)
      await expect(booking.save()).rejects.toThrow()
    })

    it('should validate end time is after start time', async () => {
      const startTime = new Date()
      startTime.setDate(startTime.getDate() + 1)
      startTime.setHours(12, 0, 0, 0)

      const endTime = new Date(startTime)
      endTime.setHours(10, 0, 0, 0) // Before start time

      const bookingData = {
        ...baseBookingData,
        startTime,
        endTime,
      }

      const booking = new Booking(bookingData)
      await expect(booking.save()).rejects.toThrow()
    })

    it('should validate minimum booking duration', async () => {
      const startTime = new Date()
      startTime.setDate(startTime.getDate() + 1)
      startTime.setHours(10, 0, 0, 0)

      const endTime = new Date(startTime)
      endTime.setMinutes(15) // Only 15 minutes

      const bookingData = {
        ...baseBookingData,
        startTime,
        endTime,
      }

      const booking = new Booking(bookingData)
      await expect(booking.save()).rejects.toThrow()
    })

    it('should validate maximum booking duration', async () => {
      const startTime = new Date()
      startTime.setDate(startTime.getDate() + 1)

      const endTime = new Date(startTime)
      endTime.setDate(endTime.getDate() + 8) // 8 days later

      const bookingData = {
        ...baseBookingData,
        startTime,
        endTime,
      }

      const booking = new Booking(bookingData)
      await expect(booking.save()).rejects.toThrow()
    })

    it('should validate status enum', async () => {
      const bookingData = {
        ...baseBookingData,
        status: 'invalid-status',
      }

      const booking = new Booking(bookingData)
      await expect(booking.save()).rejects.toThrow()
    })

    it('should validate payment status enum', async () => {
      const bookingData = {
        ...baseBookingData,
        paymentStatus: 'invalid-payment-status',
      }

      const booking = new Booking(bookingData)
      await expect(booking.save()).rejects.toThrow()
    })

    it('should require license plate', async () => {
      const bookingData = {
        ...baseBookingData,
        vehicleInfo: {},
      }

      const booking = new Booking(bookingData)
      await expect(booking.save()).rejects.toThrow()
    })

    it('should validate license plate length', async () => {
      const bookingData = {
        ...baseBookingData,
        vehicleInfo: {
          licensePlate: 'A'.repeat(21), // Too long
        },
      }

      const booking = new Booking(bookingData)
      await expect(booking.save()).rejects.toThrow()
    })

    it('should validate special instructions length', async () => {
      const bookingData = {
        ...baseBookingData,
        specialInstructions: 'A'.repeat(501), // Too long
      }

      const booking = new Booking(bookingData)
      await expect(booking.save()).rejects.toThrow()
    })
  })

  describe('Booking Availability Checking', () => {
    it('should detect conflicting bookings', async () => {
      const startTime1 = new Date()
      startTime1.setDate(startTime1.getDate() + 1)
      startTime1.setHours(10, 0, 0, 0)

      const endTime1 = new Date(startTime1)
      endTime1.setHours(12, 0, 0, 0)

      // Create first booking
      const booking1 = new Booking({
        user: testUser._id,
        parkingSpot: testSpot._id,
        vehicle: testVehicle._id,
        startTime: startTime1,
        endTime: endTime1,
        status: 'confirmed',
        vehicleInfo: { licensePlate: 'ABC123' },
      })
      await booking1.save()

      // Try to create overlapping booking
      const startTime2 = new Date(startTime1)
      startTime2.setHours(11, 0, 0, 0) // Overlaps with first booking

      const endTime2 = new Date(startTime2)
      endTime2.setHours(13, 0, 0, 0)

      const isAvailable = await Booking.checkAvailability(
        testSpot._id,
        startTime2,
        endTime2
      )

      expect(isAvailable).toBe(false)
    })

    it('should allow non-overlapping bookings', async () => {
      const startTime1 = new Date()
      startTime1.setDate(startTime1.getDate() + 1)
      startTime1.setHours(10, 0, 0, 0)

      const endTime1 = new Date(startTime1)
      endTime1.setHours(12, 0, 0, 0)

      // Create first booking
      const booking1 = new Booking({
        user: testUser._id,
        parkingSpot: testSpot._id,
        vehicle: testVehicle._id,
        startTime: startTime1,
        endTime: endTime1,
        status: 'confirmed',
        vehicleInfo: { licensePlate: 'ABC123' },
      })
      await booking1.save()

      // Try to create non-overlapping booking
      const startTime2 = new Date(endTime1)
      startTime2.setHours(13, 0, 0, 0) // After first booking

      const endTime2 = new Date(startTime2)
      endTime2.setHours(15, 0, 0, 0)

      const isAvailable = await Booking.checkAvailability(
        testSpot._id,
        startTime2,
        endTime2
      )

      expect(isAvailable).toBe(true)
    })

    it('should ignore cancelled bookings for availability', async () => {
      const startTime = new Date()
      startTime.setDate(startTime.getDate() + 1)
      startTime.setHours(10, 0, 0, 0)

      const endTime = new Date(startTime)
      endTime.setHours(12, 0, 0, 0)

      // Create cancelled booking
      const booking1 = new Booking({
        user: testUser._id,
        parkingSpot: testSpot._id,
        vehicle: testVehicle._id,
        startTime,
        endTime,
        status: 'cancelled',
        vehicleInfo: { licensePlate: 'ABC123' },
      })
      await booking1.save()

      // Check availability for same time slot
      const isAvailable = await Booking.checkAvailability(
        testSpot._id,
        startTime,
        endTime
      )

      expect(isAvailable).toBe(true)
    })
  })

  describe('Booking Virtual Fields', () => {
    it('should calculate duration in minutes', async () => {
      const startTime = new Date()
      startTime.setDate(startTime.getDate() + 1)
      startTime.setHours(10, 0, 0, 0)

      const endTime = new Date(startTime)
      endTime.setHours(11, 30, 0, 0) // 1.5 hours = 90 minutes

      const booking = new Booking({
        user: testUser._id,
        parkingSpot: testSpot._id,
        vehicle: testVehicle._id,
        startTime,
        endTime,
        vehicleInfo: { licensePlate: 'ABC123' },
      })
      await booking.save()

      expect(booking.durationMinutes).toBe(90)
    })

    it('should format duration correctly', async () => {
      const startTime = new Date()
      startTime.setDate(startTime.getDate() + 1)
      startTime.setHours(10, 0, 0, 0)

      const endTime = new Date(startTime)
      endTime.setHours(12, 30, 0, 0) // 2.5 hours

      const booking = new Booking({
        user: testUser._id,
        parkingSpot: testSpot._id,
        vehicle: testVehicle._id,
        startTime,
        endTime,
        vehicleInfo: { licensePlate: 'ABC123' },
      })
      await booking.save()

      expect(booking.formattedDuration).toBe('2 hours 30 minutes')
    })

    it('should generate reference number', async () => {
      const startTime = new Date()
      startTime.setDate(startTime.getDate() + 1)
      startTime.setHours(10, 0, 0, 0)

      const endTime = new Date(startTime)
      endTime.setHours(11, 0, 0, 0)

      const booking = new Booking({
        user: testUser._id,
        parkingSpot: testSpot._id,
        vehicle: testVehicle._id,
        startTime,
        endTime,
        vehicleInfo: { licensePlate: 'ABC123' },
      })
      await booking.save()

      expect(booking.referenceNumber).toMatch(/^PK[A-Z0-9]{8}$/)
    })
  })

  describe('Booking Static Methods', () => {
    beforeEach(async () => {
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)

      // Create test bookings
      const bookings = [
        {
          user: testUser._id,
          parkingSpot: testSpot._id,
          vehicle: testVehicle._id,
          startTime: new Date(tomorrow.setHours(10, 0, 0, 0)),
          endTime: new Date(tomorrow.setHours(11, 0, 0, 0)),
          status: 'confirmed',
          vehicleInfo: { licensePlate: 'ABC123' },
        },
        {
          user: testUser._id,
          parkingSpot: testSpot._id,
          vehicle: testVehicle._id,
          startTime: new Date(tomorrow.setHours(14, 0, 0, 0)),
          endTime: new Date(tomorrow.setHours(15, 0, 0, 0)),
          status: 'pending',
          vehicleInfo: { licensePlate: 'ABC123' },
        },
      ]

      await Booking.create(bookings)
    })

    it('should get user bookings with pagination', async () => {
      const result = await Booking.getUserBookings(testUser._id, 1, 10)

      expect(result.bookings).toHaveLength(2)
      expect(result.total).toBe(2)
      expect(result.page).toBe(1)
      expect(result.pages).toBe(1)
      expect(result.hasNext).toBe(false)
      expect(result.hasPrev).toBe(false)
    })

    it('should filter user bookings by status', async () => {
      const result = await Booking.getUserBookings(testUser._id, 1, 10, 'confirmed')

      expect(result.bookings).toHaveLength(1)
      expect(result.bookings[0].status).toBe('confirmed')
    })

    it('should get host bookings', async () => {
      const result = await Booking.getHostBookings(testHost._id, 1, 10)

      expect(result.bookings).toHaveLength(2)
      expect(result.total).toBe(2)
    })

    it('should filter host bookings by status', async () => {
      const result = await Booking.getHostBookings(testHost._id, 1, 10, 'pending')

      expect(result.bookings).toHaveLength(1)
      expect(result.bookings[0].status).toBe('pending')
    })
  })
})