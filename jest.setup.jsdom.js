require('@testing-library/jest-dom')

// Global variable to store mock auth state
global.mockAuthState = {
    user: null,
    loading: false,
    token: null,
    isAuthenticated: false,
};

// Mock AuthContext
jest.mock('@/contexts/AuthContext', () => ({
    useAuth: () => global.mockAuthState,
    AuthProvider: ({ children }) => children,
}));

// Mock Next.js router
jest.mock('next/navigation', () => ({
    useRouter() {
        return {
            push: jest.fn(),
            replace: jest.fn(),
            prefetch: jest.fn(),
            back: jest.fn(),
            forward: jest.fn(),
            refresh: jest.fn(),
        }
    },
    useSearchParams() {
        return new URLSearchParams()
    },
    usePathname() {
        return '/'
    },
    useParams() {
        return {}
    },
}))

// Mock next-auth
jest.mock('next-auth/react', () => ({
    useSession() {
        return {
            data: null,
            status: 'unauthenticated',
        }
    },
    signIn: jest.fn(),
    signOut: jest.fn(),
    SessionProvider: ({ children }) => children,
}))

// Mock Leaflet (since it requires DOM)
jest.mock('react-leaflet', () => ({
    MapContainer: ({ children }) => {
        const React = require('react');
        return React.createElement('div', { 'data-testid': 'map-container' }, children);
    },
    TileLayer: () => {
        const React = require('react');
        return React.createElement('div', { 'data-testid': 'tile-layer' });
    },
    Marker: () => {
        const React = require('react');
        return React.createElement('div', { 'data-testid': 'marker' });
    },
    Popup: ({ children }) => {
        const React = require('react');
        return React.createElement('div', { 'data-testid': 'popup' }, children);
    },
}))

jest.mock('leaflet', () => ({
    map: jest.fn(() => ({
        setView: jest.fn().mockReturnThis(),
        remove: jest.fn(),
    })),
    tileLayer: jest.fn(() => ({
        addTo: jest.fn(),
    })),
    marker: jest.fn(() => ({
        addTo: jest.fn().mockReturnThis(),
        bindPopup: jest.fn().mockReturnThis(),
        openPopup: jest.fn().mockReturnThis(),
        on: jest.fn(),
    })),
    Icon: {
        Default: {
            prototype: {},
            mergeOptions: jest.fn(),
        },
    },
    icon: jest.fn(() => ({})),
    divIcon: jest.fn(() => ({})),
}))

// Mock fetch globally
global.fetch = jest.fn()

// Setup test environment
beforeEach(() => {
    if (global.fetch && typeof global.fetch.mockClear === 'function') {
        global.fetch.mockClear()
    }
})

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation(query => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
    })),
})