/**
 * @jest-environment node
 */

// Set up test environment variables before importing modules
process.env.JWT_SECRET = 'test-jwt-secret'
process.env.NEXTAUTH_SECRET = 'test-nextauth-secret'

import { NextRequest } from 'next/server'
import { GET as getParkingSpotsHandler, POST as createParkingSpotHandler } from '@/app/api/parking-spots/route'
import { GET as getParkingSpotHandler, PUT as updateParkingSpotHandler, DELETE as deleteParkingSpotHandler } from '@/app/api/parking-spots/[id]/route'
import { GET as getMyParkingSpotsHandler } from '@/app/api/parking-spots/my-spots/route'
import mongoose from 'mongoose'
import { MongoMemoryServer } from 'mongodb-memory-server'
import User from '@/lib/models/User'
import ParkingSpot from '@/lib/models/ParkingSpot'
import { generateToken } from '@/lib/auth'

// Mock the database connection
jest.mock('@/lib/database', () => ({
  connectDB: jest.fn().mockResolvedValue(undefined),
}))

describe('/api/parking-spots', () => {
  let mongoServer: MongoMemoryServer
  let testUser: any
  let testHost: any
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

    // Generate tokens
    userToken = generateToken(testUser._id.toString(), testUser.email, testUser.role)
    hostToken = generateToken(testHost._id.toString(), testHost.email, testHost.role)
  })

  describe('GET /api/parking-spots', () => {
    beforeEach(async () => {
      // Create test parking spots
      const parkingSpot1 = new ParkingSpot({
        title: 'Downtown Parking',
        description: 'Convenient downtown parking spot',
        owner: testHost._id,
        pricePerHour: 8.00,
        location: { lat: 40.7128, lng: -74.0060 },
        address: '123 Main St',
        city: 'New York',
        state: 'NY',
        zipCode: '10001',
        active: true,
        amenities: ['covered-parking', 'security-camera'],
        availability: {
          startTime: '08:00',
          endTime: '18:00',
          days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
        },
      })
      await parkingSpot1.save()

      const parkingSpot2 = new ParkingSpot({
        title: 'Airport Parking',
        description: 'Close to airport',
        owner: testHost._id,
        pricePerHour: 12.00,
        location: { lat: 40.6892, lng: -74.1745 },
        address: '456 Airport Rd',
        city: 'Newark',
        state: 'NJ',
        zipCode: '07114',
        active: true,
        amenities: ['covered-parking'],
        availability: {
          startTime: '06:00',
          endTime: '22:00',
          days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
        },
      })
      await parkingSpot2.save()
    })

    it('should get all parking spots without authentication', async () => {
      const request = new NextRequest('http://localhost:3000/api/parking-spots')

      const response = await getParkingSpotsHandler(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data).toHaveLength(2)
      expect(data.data[0].title).toBe('Airport Parking')
      expect(data.data[1].title).toBe('Downtown Parking')
    })

    it('should filter parking spots by city', async () => {
      const request = new NextRequest('http://localhost:3000/api/parking-spots?city=New York')

      const response = await getParkingSpotsHandler(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data).toHaveLength(1)
      expect(data.data[0].city).toBe('New York')
    })

    it('should filter parking spots by price range', async () => {
      const request = new NextRequest('http://localhost:3000/api/parking-spots?minPrice=10&maxPrice=15')

      const response = await getParkingSpotsHandler(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data).toHaveLength(1)
      expect(data.data[0].pricePerHour).toBe(12.00)
    })
  })

  describe('POST /api/parking-spots', () => {
    it('should create a parking spot as host', async () => {
      const parkingSpotData = {
        title: 'New Parking Spot',
        description: 'A brand new parking spot',
        pricePerHour: 10.00,
        location: { lat: 40.7589, lng: -73.9851 },
        address: '789 Broadway',
        city: 'New York',
        state: 'NY',
        zipCode: '10003',
        amenities: ['covered-parking'],
        availability: {
          startTime: '09:00',
          endTime: '17:00',
          days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
        },
      }

      const request = new NextRequest('http://localhost:3000/api/parking-spots', {
        method: 'POST',
        body: JSON.stringify(parkingSpotData),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${hostToken}`,
        },
      })

      const response = await createParkingSpotHandler(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.message).toBe('Parking spot created successfully')
      expect(data.data.title).toBe(parkingSpotData.title)
      expect(data.data.owner._id).toBe(testHost._id.toString())
    })

    it('should return 401 for unauthenticated request', async () => {
      const parkingSpotData = {
        title: 'New Parking Spot',
        description: 'A brand new parking spot',
        pricePerHour: 10.00,
      }

      const request = new NextRequest('http://localhost:3000/api/parking-spots', {
        method: 'POST',
        body: JSON.stringify(parkingSpotData),
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const response = await createParkingSpotHandler(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should return 403 for non-host user', async () => {
      const parkingSpotData = {
        title: 'New Parking Spot',
        description: 'A brand new parking spot',
        pricePerHour: 10.00,
      }

      const request = new NextRequest('http://localhost:3000/api/parking-spots', {
        method: 'POST',
        body: JSON.stringify(parkingSpotData),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userToken}`,
        },
      })

      const response = await createParkingSpotHandler(request)
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toBe('Only hosts can create parking spots')
    })

    it('should return 400 for missing required fields', async () => {
      const parkingSpotData = {
        title: 'New Parking Spot',
        // Missing required fields
      }

      const request = new NextRequest('http://localhost:3000/api/parking-spots', {
        method: 'POST',
        body: JSON.stringify(parkingSpotData),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${hostToken}`,
        },
      })

      const response = await createParkingSpotHandler(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('required')
    })
  })

  describe('GET /api/parking-spots/[id]', () => {
    let testParkingSpot: any

    beforeEach(async () => {
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
    })

    it('should get parking spot by ID', async () => {
      const request = new NextRequest(`http://localhost:3000/api/parking-spots/${testParkingSpot._id}`)

      const response = await getParkingSpotHandler(request, { params: { id: testParkingSpot._id.toString() } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data.title).toBe('Test Parking Spot')
      expect(data.data._id).toBe(testParkingSpot._id.toString())
    })

    it('should return 404 for non-existent parking spot', async () => {
      const nonExistentId = new mongoose.Types.ObjectId()
      const request = new NextRequest(`http://localhost:3000/api/parking-spots/${nonExistentId}`)

      const response = await getParkingSpotHandler(request, { params: { id: nonExistentId.toString() } })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Parking spot not found')
    })

    it('should return 404 for invalid parking spot ID', async () => {
      const invalidId = new mongoose.Types.ObjectId()
      const request = new NextRequest(`http://localhost:3000/api/parking-spots/${invalidId}`)

      const response = await getParkingSpotHandler(request, { params: { id: invalidId.toString() } })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Parking spot not found')
    })
  })

  describe('PUT /api/parking-spots/[id]', () => {
    let testParkingSpot: any

    beforeEach(async () => {
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
    })

    it('should update parking spot as owner', async () => {
      const updateData = {
        title: 'Updated Parking Spot',
        pricePerHour: 7.50,
      }

      const request = new NextRequest(`http://localhost:3000/api/parking-spots/${testParkingSpot._id}`, {
        method: 'PUT',
        body: JSON.stringify(updateData),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${hostToken}`,
        },
      })

      const response = await updateParkingSpotHandler(request, { params: { id: testParkingSpot._id.toString() } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.message).toBe('Parking spot updated successfully')
      expect(data.data.title).toBe('Updated Parking Spot')
      expect(data.data.pricePerHour).toBe(7.50)
    })

    it('should return 403 for non-owner', async () => {
      const updateData = {
        title: 'Updated Parking Spot',
      }

      const request = new NextRequest(`http://localhost:3000/api/parking-spots/${testParkingSpot._id}`, {
        method: 'PUT',
        body: JSON.stringify(updateData),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userToken}`,
        },
      })

      const response = await updateParkingSpotHandler(request, { params: { id: testParkingSpot._id.toString() } })
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toBe('You can only update your own parking spots')
    })
  })

  describe('DELETE /api/parking-spots/[id]', () => {
    let testParkingSpot: any

    beforeEach(async () => {
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
    })

    it('should delete parking spot as owner', async () => {
      const request = new NextRequest(`http://localhost:3000/api/parking-spots/${testParkingSpot._id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${hostToken}`,
        },
      })

      const response = await deleteParkingSpotHandler(request, { params: { id: testParkingSpot._id.toString() } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.message).toBe('Parking spot deleted successfully')

      // Verify it's actually deleted
      const deletedSpot = await ParkingSpot.findById(testParkingSpot._id)
      expect(deletedSpot).toBeNull()
    })

    it('should return 403 for non-owner', async () => {
      const request = new NextRequest(`http://localhost:3000/api/parking-spots/${testParkingSpot._id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${userToken}`,
        },
      })

      const response = await deleteParkingSpotHandler(request, { params: { id: testParkingSpot._id.toString() } })
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toBe('You can only delete your own parking spots')
    })
  })

  describe('GET /api/parking-spots/my-spots', () => {
    beforeEach(async () => {
      // Create parking spots for the host
      const parkingSpot1 = new ParkingSpot({
        title: 'Host Spot 1',
        description: 'First host parking spot',
        owner: testHost._id,
        pricePerHour: 8.00,
        location: { lat: 40.7128, lng: -74.0060 },
        address: '123 Main St',
        city: 'New York',
        state: 'NY',
        zipCode: '10001',
        active: true,
        amenities: ['covered-parking'],
        availability: {
          startTime: '08:00',
          endTime: '18:00',
          days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
        },
      })
      await parkingSpot1.save()

      const parkingSpot2 = new ParkingSpot({
        title: 'Host Spot 2',
        description: 'Second host parking spot',
        owner: testHost._id,
        pricePerHour: 10.00,
        location: { lat: 40.7589, lng: -73.9851 },
        address: '456 Broadway',
        city: 'New York',
        state: 'NY',
        zipCode: '10003',
        active: false,
        amenities: ['security-camera'],
        availability: {
          startTime: '09:00',
          endTime: '17:00',
          days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
        },
      })
      await parkingSpot2.save()
    })

    it('should get host\'s own parking spots', async () => {
      const request = new NextRequest('http://localhost:3000/api/parking-spots/my-spots', {
        headers: {
          'Authorization': `Bearer ${hostToken}`,
        },
      })

      const response = await getMyParkingSpotsHandler(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data).toHaveLength(2)
      expect(data.data[0].title).toBe('Host Spot 2')
      expect(data.data[1].title).toBe('Host Spot 1')
    })

    it('should return empty array for user with no parking spots', async () => {
      const request = new NextRequest('http://localhost:3000/api/parking-spots/my-spots', {
        headers: {
          'Authorization': `Bearer ${userToken}`,
        },
      })

      const response = await getMyParkingSpotsHandler(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data).toHaveLength(0)
    })

    it('should return 401 for unauthenticated request', async () => {
      const request = new NextRequest('http://localhost:3000/api/parking-spots/my-spots')

      const response = await getMyParkingSpotsHandler(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })
  })
})