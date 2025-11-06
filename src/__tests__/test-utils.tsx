import React from 'react'
import { render, RenderOptions } from '@testing-library/react'
import { AuthProvider } from '@/contexts/AuthContext'

// Mock user data for testing
export const mockUser = {
  id: '507f1f77bcf86cd799439011',
  name: 'Test User',
  email: 'test@example.com',
  role: 'user' as const,
}

export const mockHost = {
  id: '507f1f77bcf86cd799439012',
  name: 'Test Host',
  email: 'host@example.com',
  role: 'host' as const,
}

// Mock parking spot data
export const mockParkingSpot = {
  _id: '507f1f77bcf86cd799439013',
  title: 'Test Parking Spot',
  description: 'A great parking spot for testing',
  owner: mockHost.id,
  pricePerHour: 5.00,
  location: {
    lat: 40.7128,
    lng: -74.0060,
  },
  address: '123 Test Street',
  city: 'Test City',
  state: 'TS',
  zipCode: '12345',
  active: true,
  images: ['https://example.com/image1.jpg'],
  amenities: ['covered-parking', 'security-camera'],
  availability: {
    startTime: '08:00',
    endTime: '18:00',
    days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
  },
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
}

// Mock parking spots array for component tests
export const mockParkingSpots = [
  {
    id: '507f1f77bcf86cd799439013',
    title: 'Downtown Parking',
    description: 'Convenient downtown parking spot',
    price: 8,
    address: '123 Main St, Downtown',
    available: true,
    features: ['Covered', 'Security Camera'],
    rating: 4.5,
    reviewCount: 23,
    distance: 0.3,
    imageUrl: 'https://example.com/spot1.jpg',
  },
  {
    id: '507f1f77bcf86cd799439014',
    title: 'Airport Parking',
    description: 'Long-term airport parking',
    price: 12,
    address: '456 Airport Blvd',
    available: false,
    features: ['EV Charging', 'Covered'],
    rating: 4.2,
    reviewCount: 15,
    distance: 2.1,
  },
  {
    id: '507f1f77bcf86cd799439015',
    title: 'Mall Parking',
    description: 'Shopping mall parking',
    price: 5,
    address: '789 Mall Dr',
    available: true,
    features: ['Handicap Accessible'],
  },
]

// Mock vehicle data
export const mockVehicle = {
  _id: '507f1f77bcf86cd799439014',
  user: mockUser.id,
  name: 'Test Car',
  number: 'ABC123',
  type: 'car' as const,
  isDefault: true,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
}

// Mock booking data
export const mockBooking = {
  _id: '507f1f77bcf86cd799439015',
  user: mockUser.id,
  parkingSpot: mockParkingSpot._id,
  vehicle: mockVehicle._id,
  startTime: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
  endTime: new Date(Date.now() + 90000000).toISOString(), // Tomorrow + 1 hour
  totalHours: 1,
  totalPrice: 5.00,
  status: 'pending' as const,
  paymentStatus: 'pending' as const,
  vehicleInfo: {
    licensePlate: 'ABC123',
    make: 'Test',
    model: 'Car',
  },
  referenceNumber: 'PK12345678',
  formattedDuration: '1 hour',
  createdAt: new Date().toISOString(),
}

// Mock AuthContext Provider for testing
interface MockAuthProviderProps {
  children: React.ReactNode
  user?: typeof mockUser | typeof mockHost | null
  loading?: boolean
  authValue?: Partial<{
    login: jest.Mock
    logout: jest.Mock
    register: jest.Mock
  }>
}

export const MockAuthProvider: React.FC<MockAuthProviderProps> = ({
  children,
  user = null,
  loading = false,
  authValue = {}
}) => {
  // Just return children since we'll mock useAuth directly
  return <>{children}</>;
}

// Custom render function that includes providers
interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  user?: typeof mockUser | typeof mockHost | null
  loading?: boolean
  authValue?: Partial<{
    login: jest.Mock
    logout: jest.Mock
    register: jest.Mock
  }>
}

export const renderWithProviders = (
  ui: React.ReactElement,
  options: CustomRenderOptions = {}
) => {
  const { user, loading, authValue, ...renderOptions } = options

  // Set global mock auth state
  global.mockAuthState = {
    user: user || null,
    loading: loading || false,
    token: user ? 'mock-token' : null,
    login: jest.fn(),
    logout: jest.fn(),
    register: jest.fn(),
    isAuthenticated: !!user,
    ...authValue,
  };

  const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <MockAuthProvider user={user} loading={loading} authValue={authValue}>
      {children}
    </MockAuthProvider>
  )

  return render(ui, { wrapper: Wrapper, ...renderOptions })
}

// Mock API responses
export const mockApiResponse = (data: any, status = 200) => {
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(data),
    text: () => Promise.resolve(JSON.stringify(data)),
  } as Response)
}

// Mock fetch for API testing
export const mockFetch = (response: any, status = 200) => {
  ;(global.fetch as jest.Mock).mockResolvedValueOnce(mockApiResponse(response, status))
}

// Mock error response
export const mockErrorResponse = (error: string, status = 400) => {
  return mockApiResponse({ error }, status)
}

// Helper to wait for async operations
export const waitFor = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

// Re-export everything from React Testing Library
export * from '@testing-library/react'
export { default as userEvent } from '@testing-library/user-event'