/**
 * @jest-environment node
 */

// Set up test environment variables before importing modules
process.env.JWT_SECRET = 'test-jwt-secret'
process.env.NEXTAUTH_SECRET = 'test-nextauth-secret'

import { NextRequest } from 'next/server'
import { POST as registerHandler } from '@/app/api/auth/register/route'
import { POST as loginHandler } from '@/app/api/auth/login/route'
import mongoose from 'mongoose'
import { MongoMemoryServer } from 'mongodb-memory-server'
import User from '@/lib/models/User'

// Mock the database connection
jest.mock('@/lib/database', () => ({
  connectDB: jest.fn().mockResolvedValue(undefined),
}))

describe('/api/auth', () => {
  let mongoServer: MongoMemoryServer

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
    await User.deleteMany({})
  })

  describe('POST /api/auth/register', () => {
    it('should register a new user successfully', async () => {
      const userData = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123',
        role: 'user',
      }

      const request = new NextRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        body: JSON.stringify(userData),
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const response = await registerHandler(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.message).toBe('User registered successfully')
      expect(data.user.email).toBe(userData.email)
      expect(data.user.name).toBe(userData.name)
      expect(data.user.role).toBe(userData.role)
      expect(data.user.password).toBeUndefined() // Password should not be returned
      expect(data.token).toBeDefined()
    })

    it('should register a host successfully', async () => {
      const userData = {
        name: 'Test Host',
        email: 'host@example.com',
        password: 'password123',
        role: 'host',
      }

      const request = new NextRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        body: JSON.stringify(userData),
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const response = await registerHandler(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.user.role).toBe('host')
    })

    it('should return 400 for missing required fields', async () => {
      const userData = {
        name: 'Test User',
        // Missing email, password, role
      }

      const request = new NextRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        body: JSON.stringify(userData),
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const response = await registerHandler(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Name, email, and password are required')
    })

    it('should return 400 for invalid email format', async () => {
      const userData = {
        name: 'Test User',
        email: 'invalid-email',
        password: 'password123',
        role: 'user',
      }

      const request = new NextRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        body: JSON.stringify(userData),
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const response = await registerHandler(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Please provide a valid email address')
    })

    it('should return 409 for duplicate email', async () => {
      // Create first user
      const userData = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123',
        role: 'user',
      }

      const user = new User(userData)
      await user.save()

      // Try to register with same email
      const request = new NextRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        body: JSON.stringify(userData),
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const response = await registerHandler(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('User already exists with this email')
    })
  })

  describe('POST /api/auth/login', () => {
    let testUser: any

    beforeEach(async () => {
      // Create test user
      testUser = new User({
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123',
        role: 'user',
      })
      await testUser.save()
    })

    it('should login successfully with correct credentials', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'password123',
      }

      const request = new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        body: JSON.stringify(loginData),
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const response = await loginHandler(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.message).toBe('Login successful')
      expect(data.user.email).toBe(loginData.email)
      expect(data.user.password).toBeUndefined()
      expect(data.token).toBeDefined()
    })

    it('should return 400 for missing credentials', async () => {
      const loginData = {
        email: 'test@example.com',
        // Missing password
      }

      const request = new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        body: JSON.stringify(loginData),
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const response = await loginHandler(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Email and password are required')
    })

    it('should return 401 for invalid email', async () => {
      const loginData = {
        email: 'nonexistent@example.com',
        password: 'password123',
      }

      const request = new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        body: JSON.stringify(loginData),
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const response = await loginHandler(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Invalid email or password')
    })

    it('should return 401 for invalid password', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'wrongpassword',
      }

      const request = new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        body: JSON.stringify(loginData),
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const response = await loginHandler(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Invalid email or password')
    })
  })
})