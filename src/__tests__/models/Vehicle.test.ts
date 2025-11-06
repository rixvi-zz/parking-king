/**
 * @jest-environment node
 */

import mongoose from 'mongoose'
import { MongoMemoryServer } from 'mongodb-memory-server'
import Vehicle from '@/lib/models/Vehicle'
import User from '@/lib/models/User'

describe('Vehicle Model', () => {
  let mongoServer: MongoMemoryServer
  let testUser: any

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
    await Vehicle.deleteMany({})
    await User.deleteMany({})
    
    // Create test user
    testUser = new User({
      name: 'Test User',
      email: 'test@example.com',
      password: 'password123',
      role: 'user',
    })
    await testUser.save()
  })

  describe('Vehicle Creation', () => {
    it('should create a valid vehicle', async () => {
      const vehicleData = {
        user: testUser._id,
        name: 'My Honda Civic',
        number: 'ABC123',
        type: 'car',
        isDefault: true,
      }

      const vehicle = new Vehicle(vehicleData)
      const savedVehicle = await vehicle.save()

      expect(savedVehicle._id).toBeDefined()
      expect(savedVehicle.name).toBe(vehicleData.name)
      expect(savedVehicle.number).toBe(vehicleData.number)
      expect(savedVehicle.type).toBe(vehicleData.type)
      expect(savedVehicle.isDefault).toBe(vehicleData.isDefault)
      expect(savedVehicle.createdAt).toBeDefined()
      expect(savedVehicle.updatedAt).toBeDefined()
    })

    it('should uppercase vehicle number', async () => {
      const vehicleData = {
        user: testUser._id,
        name: 'My Car',
        number: 'abc123',
        type: 'car',
        isDefault: false,
      }

      const vehicle = new Vehicle(vehicleData)
      const savedVehicle = await vehicle.save()

      expect(savedVehicle.number).toBe('ABC123')
    })

    it('should create different vehicle types', async () => {
      const types = ['car', 'bike', 'truck', 'suv', 'other']
      
      for (const type of types) {
        const vehicleData = {
          user: testUser._id,
          name: `My ${type}`,
          number: `${type.toUpperCase()}123`,
          type,
          isDefault: false,
        }

        const vehicle = new Vehicle(vehicleData)
        const savedVehicle = await vehicle.save()

        expect(savedVehicle.type).toBe(type)
      }
    })
  })

  describe('Vehicle Validation', () => {
    it('should require user', async () => {
      const vehicleData = {
        name: 'My Car',
        number: 'ABC123',
        type: 'car',
      }

      const vehicle = new Vehicle(vehicleData)
      
      await expect(vehicle.save()).rejects.toThrow()
    })

    it('should require name', async () => {
      const vehicleData = {
        user: testUser._id,
        number: 'ABC123',
        type: 'car',
      }

      const vehicle = new Vehicle(vehicleData)
      
      await expect(vehicle.save()).rejects.toThrow()
    })

    it('should require number', async () => {
      const vehicleData = {
        user: testUser._id,
        name: 'My Car',
        type: 'car',
      }

      const vehicle = new Vehicle(vehicleData)
      
      await expect(vehicle.save()).rejects.toThrow()
    })

    it('should validate vehicle type enum', async () => {
      const vehicleData = {
        user: testUser._id,
        name: 'My Vehicle',
        number: 'ABC123',
        type: 'invalid-type',
      }

      const vehicle = new Vehicle(vehicleData)
      
      await expect(vehicle.save()).rejects.toThrow()
    })

    it('should enforce unique vehicle number per user', async () => {
      const vehicleData = {
        user: testUser._id,
        name: 'My Car',
        number: 'ABC123',
        type: 'car',
      }

      const vehicle1 = new Vehicle(vehicleData)
      await vehicle1.save()

      const vehicle2 = new Vehicle({ ...vehicleData, name: 'Another Car' })
      
      await expect(vehicle2.save()).rejects.toThrow()
    })

    it('should allow same vehicle number for different users', async () => {
      // Create another user
      const anotherUser = new User({
        name: 'Another User',
        email: 'another@example.com',
        password: 'password123',
        role: 'user',
      })
      await anotherUser.save()

      const vehicleData1 = {
        user: testUser._id,
        name: 'My Car',
        number: 'ABC123',
        type: 'car',
      }

      const vehicleData2 = {
        user: anotherUser._id,
        name: 'My Car',
        number: 'ABC123',
        type: 'car',
      }

      const vehicle1 = new Vehicle(vehicleData1)
      const vehicle2 = new Vehicle(vehicleData2)

      await vehicle1.save()
      await expect(vehicle2.save()).resolves.toBeTruthy()
    })

    it('should validate name length', async () => {
      const vehicleData = {
        user: testUser._id,
        name: 'A'.repeat(101), // Too long
        number: 'ABC123',
        type: 'car',
      }

      const vehicle = new Vehicle(vehicleData)
      
      await expect(vehicle.save()).rejects.toThrow()
    })

    it('should validate number length', async () => {
      const vehicleData = {
        user: testUser._id,
        name: 'My Car',
        number: 'A'.repeat(21), // Too long
        type: 'car',
      }

      const vehicle = new Vehicle(vehicleData)
      
      await expect(vehicle.save()).rejects.toThrow()
    })
  })

  describe('Default Vehicle Management', () => {
    it('should set first vehicle as default automatically', async () => {
      const vehicleData = {
        user: testUser._id,
        name: 'My Car',
        number: 'ABC123',
        type: 'car',
        isDefault: false, // Even if set to false
      }

      const vehicle = new Vehicle(vehicleData)
      await vehicle.save()

      // Since it's the first vehicle, it should be set as default
      const count = await Vehicle.countDocuments({ user: testUser._id })
      if (count === 1) {
        expect(vehicle.isDefault).toBe(true)
      }
    })

    it('should remove default from other vehicles when setting new default', async () => {
      // Create first vehicle as default
      const vehicle1 = new Vehicle({
        user: testUser._id,
        name: 'First Car',
        number: 'ABC123',
        type: 'car',
        isDefault: true,
      })
      await vehicle1.save()

      // Create second vehicle as default
      const vehicle2 = new Vehicle({
        user: testUser._id,
        name: 'Second Car',
        number: 'DEF456',
        type: 'car',
        isDefault: true,
      })
      await vehicle2.save()

      // Check that first vehicle is no longer default
      const updatedVehicle1 = await Vehicle.findById(vehicle1._id)
      expect(updatedVehicle1?.isDefault).toBe(false)
      expect(vehicle2.isDefault).toBe(true)
    })
  })

  describe('Vehicle Static Methods', () => {
    beforeEach(async () => {
      // Create test vehicles sequentially to ensure proper default handling
      const firstVehicle = new Vehicle({
        user: testUser._id,
        name: 'First Car',
        number: 'ABC123',
        type: 'car',
        isDefault: true,
      })
      await firstVehicle.save()
      
      const secondVehicle = new Vehicle({
        user: testUser._id,
        name: 'Second Car',
        number: 'DEF456',
        type: 'bike',
        isDefault: false,
      })
      await secondVehicle.save()
    })

    it('should get user vehicles sorted by default first', async () => {
      const vehicles = await Vehicle.getUserVehicles(testUser._id)
      
      expect(vehicles).toHaveLength(2)
      expect(vehicles[0].isDefault).toBe(true)
      expect(vehicles[0].name).toBe('First Car')
    })

    it('should get default vehicle', async () => {
      const defaultVehicle = await Vehicle.getDefaultVehicle(testUser._id)
      
      expect(defaultVehicle).toBeTruthy()
      expect(defaultVehicle?.isDefault).toBe(true)
      expect(defaultVehicle?.name).toBe('First Car')
    })

    it('should return null if no default vehicle', async () => {
      // Remove default from all vehicles
      await Vehicle.updateMany({ user: testUser._id }, { isDefault: false })
      
      const defaultVehicle = await Vehicle.getDefaultVehicle(testUser._id)
      expect(defaultVehicle).toBeNull()
    })
  })
})