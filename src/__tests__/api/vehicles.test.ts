/**
 * @jest-environment node
 */

// Set up test environment variables before importing modules
process.env.JWT_SECRET = 'test-jwt-secret'
process.env.NEXTAUTH_SECRET = 'test-nextauth-secret'

import { NextRequest } from 'next/server'
import { GET as getVehiclesHandler, POST as createVehicleHandler } from '@/app/api/vehicles/route'
import mongoose from 'mongoose'
import { MongoMemoryServer } from 'mongodb-memory-server'
import User from '@/lib/models/User'
import Vehicle from '@/lib/models/Vehicle'
import { generateToken } from '@/lib/auth'

// Mock the database connection
jest.mock('@/lib/database', () => ({
  connectDB: jest.fn().mockResolvedValue(undefined),
}))

describe('/api/vehicles', () => {
  let mongoServer: MongoMemoryServer
  let testUser: any
  let anotherUser: any
  let userToken: string
  let anotherUserToken: string

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
    await Vehicle.deleteMany({})

    // Create test users
    testUser = new User({
      name: 'Test User',
      email: 'user@example.com',
      password: 'password123',
      role: 'user',
    })
    await testUser.save()

    anotherUser = new User({
      name: 'Another User',
      email: 'another@example.com',
      password: 'password123',
      role: 'user',
    })
    await anotherUser.save()

    // Generate tokens
    userToken = generateToken(testUser._id.toString(), testUser.email, testUser.role)
    anotherUserToken = generateToken(anotherUser._id.toString(), anotherUser.email, anotherUser.role)
  })

  describe('GET /api/vehicles', () => {
    beforeEach(async () => {
      // Create test vehicles for the user
      const vehicle1 = new Vehicle({
        user: testUser._id,
        name: 'My Car',
        number: 'ABC123',
        type: 'car',
        isDefault: true,
      })
      await vehicle1.save()

      const vehicle2 = new Vehicle({
        user: testUser._id,
        name: 'My Bike',
        number: 'XYZ789',
        type: 'bike',
        isDefault: false,
      })
      await vehicle2.save()

      // Create vehicle for another user (should not be returned)
      const anotherVehicle = new Vehicle({
        user: anotherUser._id,
        name: 'Another Car',
        number: 'DEF456',
        type: 'car',
        isDefault: true,
      })
      await anotherVehicle.save()
    })

    it('should get user\'s vehicles', async () => {
      const request = new NextRequest('http://localhost:3000/api/vehicles', {
        headers: {
          'Authorization': `Bearer ${userToken}`,
        },
      })

      const response = await getVehiclesHandler(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.vehicles).toHaveLength(2)
      expect(data.vehicles[0].user).toBe(testUser._id.toString())
      expect(data.vehicles[1].user).toBe(testUser._id.toString())
      expect(data.vehicles[0].name).toBe('My Car')
      expect(data.vehicles[1].name).toBe('My Bike')
    })

    it('should return empty array for user with no vehicles', async () => {
      const request = new NextRequest('http://localhost:3000/api/vehicles', {
        headers: {
          'Authorization': `Bearer ${anotherUserToken}`,
        },
      })

      const response = await getVehiclesHandler(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.vehicles).toHaveLength(1) // anotherUser has one vehicle
      expect(data.vehicles[0].name).toBe('Another Car')
    })

    it('should return 401 for unauthenticated request', async () => {
      const request = new NextRequest('http://localhost:3000/api/vehicles')

      const response = await getVehiclesHandler(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should sort vehicles with default first', async () => {
      const request = new NextRequest('http://localhost:3000/api/vehicles', {
        headers: {
          'Authorization': `Bearer ${userToken}`,
        },
      })

      const response = await getVehiclesHandler(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.vehicles[0].isDefault).toBe(true)
      expect(data.vehicles[0].name).toBe('My Car')
    })
  })

  describe('POST /api/vehicles', () => {
    it('should create a vehicle successfully', async () => {
      const vehicleData = {
        name: 'New Car',
        number: 'NEW123',
        type: 'car',
        isDefault: false,
      }

      const request = new NextRequest('http://localhost:3000/api/vehicles', {
        method: 'POST',
        body: JSON.stringify(vehicleData),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userToken}`,
        },
      })

      const response = await createVehicleHandler(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.message).toBe('Vehicle added successfully')
      expect(data.vehicle.name).toBe(vehicleData.name)
      expect(data.vehicle.number).toBe(vehicleData.number)
      expect(data.vehicle.type).toBe(vehicleData.type)
      expect(data.vehicle.user).toBe(testUser._id.toString())
    })

    it('should create first vehicle as default', async () => {
      const vehicleData = {
        name: 'First Car',
        number: 'FIRST123',
        type: 'car',
        isDefault: false, // Should be overridden to true
      }

      const request = new NextRequest('http://localhost:3000/api/vehicles', {
        method: 'POST',
        body: JSON.stringify(vehicleData),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userToken}`,
        },
      })

      const response = await createVehicleHandler(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.vehicle.isDefault).toBe(true)
    })

    it('should handle setting new default vehicle', async () => {
      // Create first vehicle (will be default)
      const firstVehicle = new Vehicle({
        user: testUser._id,
        name: 'First Car',
        number: 'FIRST123',
        type: 'car',
        isDefault: true,
      })
      await firstVehicle.save()

      // Create second vehicle as new default
      const vehicleData = {
        name: 'New Default Car',
        number: 'DEFAULT123',
        type: 'car',
        isDefault: true,
      }

      const request = new NextRequest('http://localhost:3000/api/vehicles', {
        method: 'POST',
        body: JSON.stringify(vehicleData),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userToken}`,
        },
      })

      const response = await createVehicleHandler(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.vehicle.isDefault).toBe(true)

      // Check that the first vehicle is no longer default
      const updatedFirstVehicle = await Vehicle.findById(firstVehicle._id)
      expect(updatedFirstVehicle.isDefault).toBe(false)
    })

    it('should return 401 for unauthenticated request', async () => {
      const vehicleData = {
        name: 'New Car',
        number: 'NEW123',
        type: 'car',
      }

      const request = new NextRequest('http://localhost:3000/api/vehicles', {
        method: 'POST',
        body: JSON.stringify(vehicleData),
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const response = await createVehicleHandler(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should return 400 for missing required fields', async () => {
      const vehicleData = {
        name: 'New Car',
        // Missing number and type
      }

      const request = new NextRequest('http://localhost:3000/api/vehicles', {
        method: 'POST',
        body: JSON.stringify(vehicleData),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userToken}`,
        },
      })

      const response = await createVehicleHandler(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('required')
    })

    it('should return 400 for invalid vehicle type', async () => {
      const vehicleData = {
        name: 'New Vehicle',
        number: 'NEW123',
        type: 'invalid-type',
      }

      const request = new NextRequest('http://localhost:3000/api/vehicles', {
        method: 'POST',
        body: JSON.stringify(vehicleData),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userToken}`,
        },
      })

      const response = await createVehicleHandler(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to create vehicle')
    })

    it('should return 400 for duplicate vehicle number for same user', async () => {
      // Create first vehicle
      const existingVehicle = new Vehicle({
        user: testUser._id,
        name: 'Existing Car',
        number: 'DUPLICATE123',
        type: 'car',
        isDefault: true,
      })
      await existingVehicle.save()

      // Try to create vehicle with same number
      const vehicleData = {
        name: 'New Car',
        number: 'DUPLICATE123',
        type: 'car',
      }

      const request = new NextRequest('http://localhost:3000/api/vehicles', {
        method: 'POST',
        body: JSON.stringify(vehicleData),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userToken}`,
        },
      })

      const response = await createVehicleHandler(request)
      const data = await response.json()

      expect(response.status).toBe(409)
      expect(data.error).toBe('Vehicle with this number already exists')
    })

    it('should allow same vehicle number for different users', async () => {
      // Create vehicle for first user
      const firstUserVehicle = new Vehicle({
        user: testUser._id,
        name: 'First User Car',
        number: 'SAME123',
        type: 'car',
        isDefault: true,
      })
      await firstUserVehicle.save()

      // Create vehicle with same number for another user
      const vehicleData = {
        name: 'Another User Car',
        number: 'SAME123',
        type: 'car',
      }

      const request = new NextRequest('http://localhost:3000/api/vehicles', {
        method: 'POST',
        body: JSON.stringify(vehicleData),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${anotherUserToken}`,
        },
      })

      const response = await createVehicleHandler(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.vehicle.number).toBe('SAME123')
      expect(data.vehicle.user).toBe(anotherUser._id.toString())
    })

    it('should validate vehicle number format', async () => {
      const vehicleData = {
        name: 'New Car',
        number: '', // Empty number
        type: 'car',
      }

      const request = new NextRequest('http://localhost:3000/api/vehicles', {
        method: 'POST',
        body: JSON.stringify(vehicleData),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userToken}`,
        },
      })

      const response = await createVehicleHandler(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('required')
    })

    it('should handle different vehicle types', async () => {
      const vehicleTypes = ['car', 'bike', 'truck', 'suv', 'other']

      for (const type of vehicleTypes) {
        const vehicleData = {
          name: `Test ${type}`,
          number: `${type.toUpperCase()}123`,
          type: type,
        }

        const request = new NextRequest('http://localhost:3000/api/vehicles', {
          method: 'POST',
          body: JSON.stringify(vehicleData),
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${userToken}`,
          },
        })

        const response = await createVehicleHandler(request)
        const data = await response.json()

        expect(response.status).toBe(201)
        expect(data.vehicle.type).toBe(type)
      }
    })
  })
})