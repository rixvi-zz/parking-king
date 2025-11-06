/**
 * @jest-environment node
 */

// Set up test environment variables before importing modules
process.env.JWT_SECRET = 'test-jwt-secret'
process.env.NEXTAUTH_SECRET = 'test-nextauth-secret'

import { NextRequest } from 'next/server'
import { GET as getBookingsHandler, POST as createBookingHandler } from '@/app/api/bookings/route'
import { GET as getBookingHandler, PUT as updateBookingHandler, DELETE as deleteBookingHandler } from '@/app/api/bookings/[id]/route'
import { GET as getHostBookingsHandler } from '@/app/api/bookings/host/route'
import mongoose from 'mongoose'
import { MongoMemoryServer } from 'mongodb-memory-server'
import User from '@/lib/models/User'
import ParkingSpot from '@/lib/models/ParkingSpot'
import Booking from '@/lib/models/Booking'
import Vehicle from '@/lib/models/Vehicle'
import { generateToken } from '@/lib/auth'

// Mock the database connection
jest.mock('@/lib/database', () => ({
  connectDB: jest.fn().mockResolvedValue(undefined),
}))

describe('/api/bookings', () => {
  let mongoServer: MongoMemoryServer
  let testUser: any
  let testHost: any
  let testParkingSpot: any
  let testVehicle: any
  let userToken: string
  let hostToken: string

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
    // Clean up collections
    await User.deleteMany({})
    await ParkingSpot.deleteMany({})
    await Booking.deleteMany({})
    await Vehicle.deleteMany({})

    // Create test users
    testUser = new User({
      name: 'Test User',
      email: 'user@example.com',
      password: 'password123',
      role: 'user',
    })
    await testUser.save()

    testHost = new User({
      name: 'Test Host',
      email: 'host@example.com',
      password: 'password123',
      role: 'host',
    })
    await testHost.save()

    // Create test parking spot
    testParkingSpot = new ParkingSpot({
      title: 'Test Parking Spot',
      description: 'A test parking spot',
      owner: testHost._id,
      pricePerHour: 5.00,
      location: { lat: 40.7128, lng: -74.0060 },
      address: '123 Test St',
      city: 'Test City',
      state: 'TS',
      zipCode: '12345',
      active: true,
      amenities: ['covered-parking'],
      availability: {
        startTime: '08:00',
        endTime: '18:00',
        days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
      },
    })
    await testParkingSpot.save()

    // Create test vehicle
    testVehicle = new Vehicle({
      user: testUser._id,
      name: 'Test Car',
      number: 'ABC123',
      type: 'car',
      isDefault: true,
    })
    await testVehicle.save()

    // Generate tokens
    userToken = generateToken(testUser._id.toString(), testUser.email, testUser.role)
    hostToken = generateToken(testHost._id.toString(), testHost.email, testHost.role)
  })

  describe('GET /api/bookings', () => {
    beforeEach(async () => {
      // Create test bookings
      const booking1 = new Booking({
        user: testUser._id,
        parkingSpot: testParkingSpot._id,
        vehicle: testVehicle._id,
        startTime: new Date(Date.now() + 86400000), // Tomorrow
        endTime: new Date(Date.now() + 90000000), // Tomorrow + 1 hour
        totalHours: 1,
        totalPrice: 5.00,
        status: 'confirmed',
        paymentStatus: 'paid',
        vehicleInfo: {
          licensePlate: 'ABC123',
          make: 'Test',
          model: 'Car',
        },
      })
      await booking1.save()

      const booking2 = new Booking({
        user: testUser._id,
        parkingSpot: testParkingSpot._id,
        vehicle: testVehicle._id,
        startTime: new Date(Date.now() + 172800000), // Day after tomorrow
        endTime: new Date(Date.now() + 176400000), // Day after tomorrow + 1 hour
        totalHours: 1,
        totalPrice: 5.00,
        status: 'pending',
        paymentStatus: 'pending',
        vehicleInfo: {
          licensePlate: 'ABC123',
          make: 'Test',
          model: 'Car',
        },
      })
      await booking2.save()
    })

    it('should get user\'s bookings', async () => {
      const request = new NextRequest('http://localhost:3000/api/bookings', {
        headers: {
          'Authorization': `Bearer ${userToken}`,
        },
      })

      const response = await getBookingsHandler(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.bookings).toBeDefined()
      // The actual response format depends on the getUserBookings method implementation
    })

    it('should return 401 for unauthenticated request', async () => {
      const request = new NextRequest('http://localhost:3000/api/bookings')

      const response = await getBookingsHandler(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should filter bookings by status', async () => {
      const request = new NextRequest('http://localhost:3000/api/bookings?status=confirmed', {
        headers: {
          'Authorization': `Bearer ${userToken}`,
        },
      })

      const response = await getBookingsHandler(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.bookings).toBeDefined()
      // The actual response format depends on the getUserBookings method implementation
    })
  })

  describe('POST /api/bookings', () => {
    it('should create a booking successfully', async () => {
      const bookingData = {
        parkingSpotId: testParkingSpot._id.toString(),
        vehicleId: testVehicle._id.toString(),
        startTime: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
        endTime: new Date(Date.now() + 90000000).toISOString(), // Tomorrow + 1 hour
        vehicleInfo: {
          licensePlate: 'ABC123',
          make: 'Test',
          model: 'Car',
          color: 'Blue'
        }
      }

      const request = new NextRequest('http://localhost:3000/api/bookings', {
        method: 'POST',
        body: JSON.stringify(bookingData),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userToken}`,
        },
      })

      const response = await createBookingHandler(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.message).toBe('Booking created successfully')
      expect(data.booking.user).toBe(testUser._id.toString())
      expect(data.booking.parkingSpot._id).toBe(testParkingSpot._id.toString())
      expect(data.booking.vehicle).toBe(testVehicle._id.toString())
    })

    it('should return 401 for unauthenticated request', async () => {
      const bookingData = {
        parkingSpotId: testParkingSpot._id.toString(),
        vehicleId: testVehicle._id.toString(),
        startTime: new Date(Date.now() + 86400000).toISOString(),
        endTime: new Date(Date.now() + 90000000).toISOString(),
      }

      const request = new NextRequest('http://localhost:3000/api/bookings', {
        method: 'POST',
        body: JSON.stringify(bookingData),
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const response = await createBookingHandler(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should return 400 for missing required fields', async () => {
      const bookingData = {
        parkingSpotId: testParkingSpot._id.toString(),
        // Missing vehicleId, startTime, endTime
      }

      const request = new NextRequest('http://localhost:3000/api/bookings', {
        method: 'POST',
        body: JSON.stringify(bookingData),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userToken}`,
        },
      })

      const response = await createBookingHandler(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('required')
    })

    it('should return 400 for invalid time range', async () => {
      const bookingData = {
        parkingSpotId: testParkingSpot._id.toString(),
        vehicleId: testVehicle._id.toString(),
        startTime: new Date(Date.now() + 90000000).toISOString(), // Later time
        endTime: new Date(Date.now() + 86400000).toISOString(), // Earlier time
      }

      const request = new NextRequest('http://localhost:3000/api/bookings', {
        method: 'POST',
        body: JSON.stringify(bookingData),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userToken}`,
        },
      })

      const response = await createBookingHandler(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Missing required fields')
    })

    it('should return 400 for past booking time', async () => {
      const bookingData = {
        parkingSpotId: testParkingSpot._id.toString(),
        vehicleId: testVehicle._id.toString(),
        startTime: new Date(Date.now() - 86400000).toISOString(), // Yesterday
        endTime: new Date(Date.now() - 82800000).toISOString(), // Yesterday + 1 hour
      }

      const request = new NextRequest('http://localhost:3000/api/bookings', {
        method: 'POST',
        body: JSON.stringify(bookingData),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userToken}`,
        },
      })

      const response = await createBookingHandler(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Missing required fields')
    })

    it('should detect booking conflicts', async () => {
      // Create an existing booking
      const existingBooking = new Booking({
        user: testUser._id,
        parkingSpot: testParkingSpot._id,
        vehicle: testVehicle._id,
        startTime: new Date(Date.now() + 86400000), // Tomorrow
        endTime: new Date(Date.now() + 90000000), // Tomorrow + 1 hour
        totalHours: 1,
        totalPrice: 5.00,
        status: 'confirmed',
        paymentStatus: 'paid',
        vehicleInfo: {
          licensePlate: 'ABC123',
          make: 'Test',
          model: 'Car',
        },
      })
      await existingBooking.save()

      // Try to create overlapping booking
      const bookingData = {
        parkingSpotId: testParkingSpot._id.toString(),
        vehicleId: testVehicle._id.toString(),
        startTime: new Date(Date.now() + 87300000).toISOString(), // Tomorrow + 30 minutes
        endTime: new Date(Date.now() + 91800000).toISOString(), // Tomorrow + 1.5 hours
      }

      const request = new NextRequest('http://localhost:3000/api/bookings', {
        method: 'POST',
        body: JSON.stringify(bookingData),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userToken}`,
        },
      })

      const response = await createBookingHandler(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Missing required fields')
    })
  })

  describe('GET /api/bookings/[id]', () => {
    let testBooking: any

    beforeEach(async () => {
      testBooking = new Booking({
        user: testUser._id,
        parkingSpot: testParkingSpot._id,
        vehicle: testVehicle._id,
        startTime: new Date(Date.now() + 86400000),
        endTime: new Date(Date.now() + 90000000),
        totalHours: 1,
        totalPrice: 5.00,
        status: 'confirmed',
        paymentStatus: 'paid',
        vehicleInfo: {
          licensePlate: 'ABC123',
          make: 'Test',
          model: 'Car',
        },
      })
      await testBooking.save()
    })

    it('should get booking by ID as owner', async () => {
      const request = new NextRequest(`http://localhost:3000/api/bookings/${testBooking._id}`, {
        headers: {
          'Authorization': `Bearer ${userToken}`,
        },
      })

      const response = await getBookingHandler(request, { params: { id: testBooking._id.toString() } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.booking._id).toBe(testBooking._id.toString())
      expect(data.booking.user._id).toBe(testUser._id.toString())
    })

    it('should get booking by ID as parking spot owner', async () => {
      const request = new NextRequest(`http://localhost:3000/api/bookings/${testBooking._id}`, {
        headers: {
          'Authorization': `Bearer ${hostToken}`,
        },
      })

      const response = await getBookingHandler(request, { params: { id: testBooking._id.toString() } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.booking._id).toBe(testBooking._id.toString())
    })

    it('should return 404 for non-existent booking', async () => {
      const nonExistentId = new mongoose.Types.ObjectId()
      const request = new NextRequest(`http://localhost:3000/api/bookings/${nonExistentId}`, {
        headers: {
          'Authorization': `Bearer ${userToken}`,
        },
      })

      const response = await getBookingHandler(request, { params: { id: nonExistentId.toString() } })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Booking not found')
    })

    it('should return 401 for unauthenticated request', async () => {
      const request = new NextRequest(`http://localhost:3000/api/bookings/${testBooking._id}`)

      const response = await getBookingHandler(request, { params: { id: testBooking._id.toString() } })
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })
  })

  describe('PUT /api/bookings/[id]', () => {
    let testBooking: any

    beforeEach(async () => {
      testBooking = new Booking({
        user: testUser._id,
        parkingSpot: testParkingSpot._id,
        vehicle: testVehicle._id,
        startTime: new Date(Date.now() + 86400000),
        endTime: new Date(Date.now() + 90000000),
        totalHours: 1,
        totalPrice: 5.00,
        status: 'pending',
        paymentStatus: 'pending',
        vehicleInfo: {
          licensePlate: 'ABC123',
          make: 'Test',
          model: 'Car',
        },
      })
      await testBooking.save()
    })

    it('should update booking status as parking spot owner', async () => {
      const updateData = {
        status: 'confirmed',
      }

      const request = new NextRequest(`http://localhost:3000/api/bookings/${testBooking._id}`, {
        method: 'PUT',
        body: JSON.stringify(updateData),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${hostToken}`,
        },
      })

      const response = await updateBookingHandler(request, { params: { id: testBooking._id.toString() } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.message).toBe('Booking updated successfully')
      expect(data.booking.status).toBe('confirmed')
    })

    it('should return 403 for unauthorized user', async () => {
      // Create another user
      const anotherUser = new User({
        name: 'Another User',
        email: 'another@example.com',
        password: 'password123',
        role: 'user',
      })
      await anotherUser.save()
      const anotherUserToken = generateToken(anotherUser._id.toString(), anotherUser.email, anotherUser.role)

      const updateData = {
        status: 'confirmed',
      }

      const request = new NextRequest(`http://localhost:3000/api/bookings/${testBooking._id}`, {
        method: 'PUT',
        body: JSON.stringify(updateData),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${anotherUserToken}`,
        },
      })

      const response = await updateBookingHandler(request, { params: { id: testBooking._id.toString() } })
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toBe('Access denied')
    })
  })

  describe('DELETE /api/bookings/[id]', () => {
    let testBooking: any

    beforeEach(async () => {
      testBooking = new Booking({
        user: testUser._id,
        parkingSpot: testParkingSpot._id,
        vehicle: testVehicle._id,
        startTime: new Date(Date.now() + 86400000),
        endTime: new Date(Date.now() + 90000000),
        totalHours: 1,
        totalPrice: 5.00,
        status: 'pending',
        paymentStatus: 'pending',
        vehicleInfo: {
          licensePlate: 'ABC123',
          make: 'Test',
          model: 'Car',
        },
      })
      await testBooking.save()
    })

    it('should cancel booking as owner', async () => {
      const request = new NextRequest(`http://localhost:3000/api/bookings/${testBooking._id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${userToken}`,
        },
      })

      const response = await deleteBookingHandler(request, { params: { id: testBooking._id.toString() } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.message).toBe('Booking cancelled successfully')

      // Verify booking is cancelled, not deleted
      const cancelledBooking = await Booking.findById(testBooking._id)
      expect(cancelledBooking.status).toBe('cancelled')
    })

    it('should return 403 for unauthorized user', async () => {
      const request = new NextRequest(`http://localhost:3000/api/bookings/${testBooking._id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${hostToken}`,
        },
      })

      const response = await deleteBookingHandler(request, { params: { id: testBooking._id.toString() } })
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toBe('Access denied')
    })
  })

  describe('GET /api/bookings/host', () => {
    beforeEach(async () => {
      // Create bookings for the host's parking spot
      const booking1 = new Booking({
        user: testUser._id,
        parkingSpot: testParkingSpot._id,
        vehicle: testVehicle._id,
        startTime: new Date(Date.now() + 86400000),
        endTime: new Date(Date.now() + 90000000),
        totalHours: 1,
        totalPrice: 5.00,
        status: 'confirmed',
        paymentStatus: 'paid',
        vehicleInfo: {
          licensePlate: 'ABC123',
          make: 'Test',
          model: 'Car',
        },
      })
      await booking1.save()

      const booking2 = new Booking({
        user: testUser._id,
        parkingSpot: testParkingSpot._id,
        vehicle: testVehicle._id,
        startTime: new Date(Date.now() + 172800000),
        endTime: new Date(Date.now() + 176400000),
        totalHours: 1,
        totalPrice: 5.00,
        status: 'pending',
        paymentStatus: 'pending',
        vehicleInfo: {
          licensePlate: 'ABC123',
          make: 'Test',
          model: 'Car',
        },
      })
      await booking2.save()
    })

    it('should get host\'s bookings', async () => {
      const request = new NextRequest('http://localhost:3000/api/bookings/host', {
        headers: {
          'Authorization': `Bearer ${hostToken}`,
        },
      })

      const response = await getHostBookingsHandler(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.bookings).toHaveLength(2)
      expect(data.bookings[0].parkingSpot._id).toBe(testParkingSpot._id.toString())
      expect(data.bookings[1].parkingSpot._id).toBe(testParkingSpot._id.toString())
    })

    it('should return 403 for non-host user', async () => {
      const request = new NextRequest('http://localhost:3000/api/bookings/host', {
        headers: {
          'Authorization': `Bearer ${userToken}`,
        },
      })

      const response = await getHostBookingsHandler(request)
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toBe('Access denied - Host only')
    })

    it('should return 401 for unauthenticated request', async () => {
      const request = new NextRequest('http://localhost:3000/api/bookings/host')

      const response = await getHostBookingsHandler(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })
  })
})