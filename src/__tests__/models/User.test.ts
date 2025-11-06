/**
 * @jest-environment node
 */

import mongoose from 'mongoose'
import { MongoMemoryServer } from 'mongodb-memory-server'
import User from '@/lib/models/User'
import bcrypt from 'bcryptjs'

describe('User Model', () => {
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

  describe('User Creation', () => {
    it('should create a valid user', async () => {
      const userData = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123',
        role: 'user',
      }

      const user = new User(userData)
      const savedUser = await user.save()

      expect(savedUser._id).toBeDefined()
      expect(savedUser.name).toBe(userData.name)
      expect(savedUser.email).toBe(userData.email)
      expect(savedUser.role).toBe(userData.role)
      expect(savedUser.password).not.toBe(userData.password) // Should be hashed
      expect(savedUser.createdAt).toBeDefined()
      expect(savedUser.updatedAt).toBeDefined()
    })

    it('should hash password before saving', async () => {
      const userData = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123',
        role: 'user',
      }

      const user = new User(userData)
      await user.save()

      const isValidPassword = await bcrypt.compare(userData.password, user.password)
      expect(isValidPassword).toBe(true)
    })

    it('should create a host user', async () => {
      const userData = {
        name: 'Test Host',
        email: 'host@example.com',
        password: 'password123',
        role: 'host',
      }

      const user = new User(userData)
      const savedUser = await user.save()

      expect(savedUser.role).toBe('host')
    })
  })

  describe('User Validation', () => {
    it('should require name', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'password123',
        role: 'user',
      }

      const user = new User(userData)
      
      await expect(user.save()).rejects.toThrow()
    })

    it('should require email', async () => {
      const userData = {
        name: 'Test User',
        password: 'password123',
        role: 'user',
      }

      const user = new User(userData)
      
      await expect(user.save()).rejects.toThrow()
    })

    it('should require password', async () => {
      const userData = {
        name: 'Test User',
        email: 'test@example.com',
        role: 'user',
      }

      const user = new User(userData)
      
      await expect(user.save()).rejects.toThrow()
    })

    it('should validate email format', async () => {
      const userData = {
        name: 'Test User',
        email: 'invalid-email',
        password: 'password123',
        role: 'user',
      }

      const user = new User(userData)
      
      await expect(user.save()).rejects.toThrow()
    })

    it('should enforce unique email', async () => {
      const userData = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123',
        role: 'user',
      }

      const user1 = new User(userData)
      await user1.save()

      const user2 = new User({ ...userData, name: 'Another User' })
      
      await expect(user2.save()).rejects.toThrow()
    })

    it('should validate role enum', async () => {
      const userData = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123',
        role: 'invalid-role',
      }

      const user = new User(userData)
      
      await expect(user.save()).rejects.toThrow()
    })

    it('should validate password length', async () => {
      const userData = {
        name: 'Test User',
        email: 'test@example.com',
        password: '123', // Too short
        role: 'user',
      }

      const user = new User(userData)
      
      await expect(user.save()).rejects.toThrow()
    })
  })

  describe('User Methods', () => {
    it('should compare password correctly', async () => {
      const userData = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123',
        role: 'user',
      }

      const user = new User(userData)
      await user.save()

      const isValid = await user.comparePassword('password123')
      const isInvalid = await user.comparePassword('wrongpassword')

      expect(isValid).toBe(true)
      expect(isInvalid).toBe(false)
    })

    it('should find user by email', async () => {
      const userData = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123',
        role: 'user',
      }

      const user = new User(userData)
      await user.save()

      const foundUser = await User.findByEmail('test@example.com')
      expect(foundUser).toBeTruthy()
      expect(foundUser?.email).toBe(userData.email)

      const notFound = await User.findByEmail('notfound@example.com')
      expect(notFound).toBeNull()
    })
  })

  describe('User Updates', () => {
    it('should update user without rehashing password', async () => {
      const userData = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123',
        role: 'user',
      }

      const user = new User(userData)
      await user.save()
      const originalPassword = user.password

      user.name = 'Updated Name'
      await user.save()

      expect(user.name).toBe('Updated Name')
      expect(user.password).toBe(originalPassword) // Should not be rehashed
    })

    it('should hash new password on update', async () => {
      const userData = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123',
        role: 'user',
      }

      const user = new User(userData)
      await user.save()
      const originalPassword = user.password

      user.password = 'newpassword123'
      await user.save()

      expect(user.password).not.toBe(originalPassword)
      expect(user.password).not.toBe('newpassword123')
      
      const isValidNewPassword = await bcrypt.compare('newpassword123', user.password)
      expect(isValidNewPassword).toBe(true)
    })
  })
})