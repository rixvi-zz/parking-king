/**
 * @jest-environment node
 */

import mongoose from 'mongoose'
import { MongoMemoryServer } from 'mongodb-memory-server'
import ParkingSpot from '@/lib/models/ParkingSpot'
import User from '@/lib/models/User'

describe('ParkingSpot Model', () => {
  let mongoServer: MongoMemoryServer
  let testHost: any

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
    await ParkingSpot.deleteMany({})
    await User.deleteMany({})
    
    // Create test host
    testHost = new User({
      name: 'Test Host',
      email: 'host@example.com',
      password: 'password123',
      role: 'host',
    })
    await testHost.save()
  })

  describe('ParkingSpot Creation', () => {
    it('should create a valid parking spot', async () => {
      const spotData = {
        title: 'Great Parking Spot',
        description: 'A wonderful place to park your car',
        owner: testHost._id,
        pricePerHour: 5.50,
        location: {
          lat: 40.7128,
          lng: -74.0060,
        },
        address: '123 Main Street',
        city: 'New York',
        state: 'NY',
        zipCode: '10001',
        images: ['https://example.com/image1.jpg'],
        amenities: ['covered-parking', 'security-camera'],
        availability: {
          startTime: '08:00',
          endTime: '18:00',
          days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
        },
      }

      const spot = new ParkingSpot(spotData)
      const savedSpot = await spot.save()

      expect(savedSpot._id).toBeDefined()
      expect(savedSpot.title).toBe(spotData.title)
      expect(savedSpot.description).toBe(spotData.description)
      expect(savedSpot.pricePerHour).toBe(spotData.pricePerHour)
      expect(savedSpot.location.lat).toBe(spotData.location.lat)
      expect(savedSpot.location.lng).toBe(spotData.location.lng)
      expect(savedSpot.active).toBe(true) // Default value
      expect(savedSpot.createdAt).toBeDefined()
      expect(savedSpot.updatedAt).toBeDefined()
    })

    it('should create spot with minimal required fields', async () => {
      const spotData = {
        title: 'Simple Spot',
        description: 'Basic parking spot',
        owner: testHost._id,
        pricePerHour: 3.00,
        location: {
          lat: 40.7128,
          lng: -74.0060,
        },
        address: '456 Simple St',
        city: 'Simple City',
        state: 'SC',
        zipCode: '12345',
      }

      const spot = new ParkingSpot(spotData)
      const savedSpot = await spot.save()

      expect(savedSpot.title).toBe(spotData.title)
      expect(savedSpot.images).toEqual([])
      expect(savedSpot.amenities).toEqual([])
      expect(savedSpot.active).toBe(true)
    })
  })

  describe('ParkingSpot Validation', () => {
    const baseSpotData = {
      title: 'Test Spot',
      description: 'Test description',
      owner: null as any,
      pricePerHour: 5.00,
      location: {
        lat: 40.7128,
        lng: -74.0060,
      },
      address: '123 Test St',
      city: 'Test City',
      state: 'TS',
      zipCode: '12345',
    }

    beforeEach(() => {
      baseSpotData.owner = testHost._id
    })

    it('should require title', async () => {
      const spotData = { ...baseSpotData }
      delete (spotData as any).title

      const spot = new ParkingSpot(spotData)
      await expect(spot.save()).rejects.toThrow()
    })

    it('should require description', async () => {
      const spotData = { ...baseSpotData }
      delete (spotData as any).description

      const spot = new ParkingSpot(spotData)
      await expect(spot.save()).rejects.toThrow()
    })

    it('should require owner', async () => {
      const spotData = { ...baseSpotData }
      delete (spotData as any).owner

      const spot = new ParkingSpot(spotData)
      await expect(spot.save()).rejects.toThrow()
    })

    it('should require pricePerHour', async () => {
      const spotData = { ...baseSpotData }
      delete (spotData as any).pricePerHour

      const spot = new ParkingSpot(spotData)
      await expect(spot.save()).rejects.toThrow()
    })

    it('should validate price range', async () => {
      // Test negative price
      const negativePrice = { ...baseSpotData, pricePerHour: -1 }
      const spot1 = new ParkingSpot(negativePrice)
      await expect(spot1.save()).rejects.toThrow()

      // Test price too high
      const highPrice = { ...baseSpotData, pricePerHour: 1001 }
      const spot2 = new ParkingSpot(highPrice)
      await expect(spot2.save()).rejects.toThrow()
    })

    it('should validate location coordinates', async () => {
      // Test invalid latitude
      const invalidLat = {
        ...baseSpotData,
        location: { lat: 91, lng: -74.0060 }
      }
      const spot1 = new ParkingSpot(invalidLat)
      await expect(spot1.save()).rejects.toThrow()

      // Test invalid longitude
      const invalidLng = {
        ...baseSpotData,
        location: { lat: 40.7128, lng: 181 }
      }
      const spot2 = new ParkingSpot(invalidLng)
      await expect(spot2.save()).rejects.toThrow()
    })

    it('should validate title length', async () => {
      const longTitle = { ...baseSpotData, title: 'A'.repeat(101) }
      const spot = new ParkingSpot(longTitle)
      await expect(spot.save()).rejects.toThrow()
    })

    it('should validate description length', async () => {
      const longDescription = { ...baseSpotData, description: 'A'.repeat(501) }
      const spot = new ParkingSpot(longDescription)
      await expect(spot.save()).rejects.toThrow()
    })

    it('should validate amenities enum', async () => {
      const invalidAmenities = {
        ...baseSpotData,
        amenities: ['invalid-amenity']
      }
      const spot = new ParkingSpot(invalidAmenities)
      await expect(spot.save()).rejects.toThrow()
    })

    it('should validate image URLs', async () => {
      const invalidImages = {
        ...baseSpotData,
        images: ['not-a-url']
      }
      const spot = new ParkingSpot(invalidImages)
      await expect(spot.save()).rejects.toThrow()
    })

    it('should validate availability time format', async () => {
      const invalidTime = {
        ...baseSpotData,
        availability: {
          startTime: '25:00', // Invalid hour
          endTime: '18:00',
          days: ['monday']
        }
      }
      const spot = new ParkingSpot(invalidTime)
      await expect(spot.save()).rejects.toThrow()
    })

    it('should validate availability days', async () => {
      const invalidDays = {
        ...baseSpotData,
        availability: {
          startTime: '08:00',
          endTime: '18:00',
          days: ['invalid-day']
        }
      }
      const spot = new ParkingSpot(invalidDays)
      await expect(spot.save()).rejects.toThrow()
    })
  })

  describe('ParkingSpot Search and Filtering', () => {
    beforeEach(async () => {
      // Create test spots
      const spots = [
        {
          title: 'Downtown Parking',
          description: 'Great downtown location',
          owner: testHost._id,
          pricePerHour: 8.00,
          location: { lat: 40.7128, lng: -74.0060 },
          address: '123 Downtown St',
          city: 'New York',
          state: 'NY',
          zipCode: '10001',
          amenities: ['covered-parking', 'security-camera'],
          active: true,
        },
        {
          title: 'Cheap Parking',
          description: 'Budget-friendly option',
          owner: testHost._id,
          pricePerHour: 3.00,
          location: { lat: 40.7589, lng: -73.9851 },
          address: '456 Budget Ave',
          city: 'New York',
          state: 'NY',
          zipCode: '10002',
          amenities: ['well-lit'],
          active: true,
        },
        {
          title: 'Inactive Spot',
          description: 'This spot is inactive',
          owner: testHost._id,
          pricePerHour: 5.00,
          location: { lat: 40.7505, lng: -73.9934 },
          address: '789 Inactive St',
          city: 'New York',
          state: 'NY',
          zipCode: '10003',
          active: false,
        },
      ]

      await ParkingSpot.create(spots)
    })

    it('should search by text', async () => {
      const results = await ParkingSpot.searchSpots({
        search: 'downtown',
        page: 1,
        limit: 10,
      })

      expect(results.spots).toHaveLength(1)
      expect(results.spots[0].title).toBe('Downtown Parking')
    })

    it('should filter by price range', async () => {
      const results = await ParkingSpot.searchSpots({
        minPrice: 2,
        maxPrice: 5,
        page: 1,
        limit: 10,
      })

      expect(results.spots).toHaveLength(1)
      expect(results.spots[0].title).toBe('Cheap Parking')
    })

    it('should filter by amenities', async () => {
      const results = await ParkingSpot.searchSpots({
        amenities: ['covered-parking'],
        page: 1,
        limit: 10,
      })

      expect(results.spots).toHaveLength(1)
      expect(results.spots[0].title).toBe('Downtown Parking')
    })

    it('should filter by location', async () => {
      const results = await ParkingSpot.searchSpots({
        city: 'New York',
        state: 'NY',
        page: 1,
        limit: 10,
      })

      expect(results.spots).toHaveLength(2) // Only active spots
    })

    it('should only return active spots by default', async () => {
      const results = await ParkingSpot.searchSpots({
        page: 1,
        limit: 10,
      })

      expect(results.spots).toHaveLength(2)
      results.spots.forEach(spot => {
        expect(spot.active).toBe(true)
      })
    })

    it('should handle pagination', async () => {
      const results = await ParkingSpot.searchSpots({
        page: 1,
        limit: 1,
      })

      expect(results.spots).toHaveLength(1)
      expect(results.total).toBe(2)
      expect(results.pages).toBe(2)
      expect(results.hasNext).toBe(true)
      expect(results.hasPrev).toBe(false)
    })
  })

  describe('ParkingSpot Geospatial Features', () => {
    beforeEach(async () => {
      // Create spots at different locations
      const spots = [
        {
          title: 'Close Spot',
          description: 'Very close to center',
          owner: testHost._id,
          pricePerHour: 5.00,
          location: { lat: 40.7128, lng: -74.0060 }, // NYC center
          address: '123 Close St',
          city: 'New York',
          state: 'NY',
          zipCode: '10001',
        },
        {
          title: 'Far Spot',
          description: 'Far from center',
          owner: testHost._id,
          pricePerHour: 3.00,
          location: { lat: 40.8176, lng: -73.9782 }, // Bronx
          address: '456 Far Ave',
          city: 'Bronx',
          state: 'NY',
          zipCode: '10453',
        },
      ]

      await ParkingSpot.create(spots)
    })

    it('should find spots near location', async () => {
      const results = await ParkingSpot.searchSpots({
        lat: 40.7128,
        lng: -74.0060,
        radius: 5, // 5km radius
        page: 1,
        limit: 10,
      })

      expect(results.spots).toHaveLength(1)
      expect(results.spots[0].title).toBe('Close Spot')
    })

    it('should find spots within larger radius', async () => {
      const results = await ParkingSpot.searchSpots({
        lat: 40.7128,
        lng: -74.0060,
        radius: 20, // 20km radius
        page: 1,
        limit: 10,
      })

      expect(results.spots).toHaveLength(2)
    })
  })
})