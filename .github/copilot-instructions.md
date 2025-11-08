# Parking King - AI Coding Agent Instructions

## 🎯 Project Overview
**Parking King** is a full-stack Next.js 15 parking rental platform enabling users to book parking spots and hosts to manage listings. It uses MongoDB for persistence, JWT for auth, and React Leaflet for geolocation features.

## 🏗️ Architecture & Data Flow

### Core Components
- **Frontend**: Next.js App Router pages + React components (TypeScript)
- **Backend**: RESTful API routes in `src/app/api/` with MongoDB/Mongoose models
- **Database**: MongoDB with three main models: `User`, `ParkingSpot`, `Booking`, `Vehicle`
- **Auth**: JWT-based with refresh tokens, stored in HTTP-only cookies and localStorage

### Critical Data Models
1. **User** (`src/lib/models/User.ts`): Roles are `'user'` or `'host'`. Includes security fields (loginAttempts, lockUntil for brute-force protection)
2. **ParkingSpot** (`src/lib/models/ParkingSpot.ts`): Location is a `{lat, lng}` object. Owner must be a User with `host` role
3. **Booking** (`src/lib/models/Booking.ts`): Links User → ParkingSpot + Vehicle. Has status: `'pending'|'confirmed'|'cancelled'|'completed'`
4. **Vehicle** (`src/lib/models/Vehicle.ts`): User's vehicle info needed for bookings

### API Route Pattern
All API routes follow this structure:
```typescript
// src/app/api/[resource]/route.ts
export async function GET(request: NextRequest) {
  const user = await authenticateRequest(request); // Always check auth first
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  
  await connectDB(); // Establish MongoDB connection
  // ... handler logic
}
```

## 🔐 Security & Validation

### Input Validation (Zod)
- All user inputs must validate against schemas in `src/lib/validations/`
- Schemas use `validateRequest()` middleware in `src/lib/middleware/validation.ts`
- Example: `loginSchema` requires email + password; `registerSchema` enforces 8+ chars with uppercase, lowercase, number, special char

### Authentication Flow
1. Client posts credentials to `/api/auth/login`
2. Server returns access token (15m) + refresh token (7d, in secure cookie)
3. Client stores access token in localStorage, sends in `Authorization: Bearer <token>` header
4. `authenticateRequest()` helper extracts + verifies JWT from request
5. Refresh flow: expired token → POST `/api/auth/refresh` → get new access token
6. All tokens use issuer `'parking-king'` and audience `'parking-king-users'`

### Security Headers
Every API response includes headers from `src/lib/security/headers.ts`:
- CSP, X-Frame-Options, HSTS (production), Permissions-Policy
- Do NOT remove these headers from responses

### Rate Limiting
- Auth routes use `withRateLimit(rateLimiters.auth)` 
- Configured in `src/lib/middleware/validation.ts`
- Failed login attempts lock account (5 attempts → 15-min lockout)

## 🧪 Testing Strategy

### Test Setup
- Jest with dual environments: `jsdom` (components) + `node` (API/models)
- Config: `jest.config.js` with 70% coverage threshold
- Test utils in `src/__tests__/test-utils.tsx` provide mock data (mockUser, mockHost, mockParkingSpot)

### Running Tests
```bash
npm test                 # All tests
npm run test:watch      # Watch mode
npm run test:coverage   # Coverage report
npm run test:db         # Verify DB connection
npm run test:complete   # Integration test (auth + bookings + spots)
```

### Test File Location
- Component tests: `src/__tests__/components/*.test.tsx`
- API tests: `src/__tests__/api/*.test.ts` (use MongoMemoryServer)
- Model tests: `src/__tests__/models/*.test.ts`

### Mocking Strategy
- Use `MongoMemoryServer` for integration tests
- Mock external services (e.g., `jest.mock('@/lib/database')`)
- Tests must clean up: `beforeEach(async () => User.deleteMany({}))`

## 🛠️ Developer Workflows

### Build & Run
```bash
npm run dev              # Start dev server (port 3000)
npm run build            # Production build
npm run lint             # ESLint check
npm run lint --fix       # Auto-fix lint issues
```

### Database
- Connection URI: `process.env.MONGODB_URI` (required)
- DB name: `parking_king` (hardcoded in `connectDB()`)
- Use `connectDB()` in API routes, test scripts use MongoMemoryServer

### Environment Variables (required)
```
MONGODB_URI=mongodb+srv://...
JWT_SECRET=<secret-key>
JWT_REFRESH_SECRET=<refresh-secret>
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
NODE_ENV=development|production
```

## 📋 Project Conventions

### File Organization
- **Models**: `src/lib/models/*.ts` (Mongoose schemas + interfaces)
- **API Routes**: `src/app/api/[resource]/route.ts` (RESTful endpoints)
- **Validations**: `src/lib/validations/*.ts` (Zod schemas)
- **Components**: `src/components/*.tsx` (React components, always client-side with `'use client'`)
- **Auth Logic**: `src/lib/auth/jwt.ts` (token creation/verification)
- **Pages**: `src/app/[page]/page.tsx` (Next.js pages)

### Naming Conventions
- Components: PascalCase (e.g., `SearchFilters.tsx`)
- Utilities/helpers: camelCase (e.g., `validateEmail()`)
- Constants: UPPER_SNAKE_CASE (e.g., `JWT_SECRET`)
- API routes: follow Next.js pattern (`/api/resource/[id]/route.ts`)

### Code Patterns
1. **Protected Routes**: Wrap pages with `<ProtectedRoute requireAuth={true}>` component
2. **Auth Context**: Use `const { user, login, logout, isAuthenticated } = useAuth()` in components
3. **API Error Responses**: Always include `{ error: string }` and set appropriate HTTP status
4. **Pagination**: APIs support `?page=1&limit=10` query params
5. **Async Operations**: All async handlers catch errors and return JSON with error message

### Important Implementation Details
- **Password hashing**: Uses bcryptjs with salt rounds = 12 (in User model pre-save hook)
- **Timestamps**: Mongoose auto-adds `createdAt`, `updatedAt` with `{ timestamps: true }`
- **Geolocation**: Uses React Leaflet; coordinates in `{ lat, lng }` format (NOT `[lng, lat]`)
- **Image URLs**: Must validate against regex `/^https?:\/\/.+\.(jpg|jpeg|png|gif|webp)$/i`
- **Token Blacklisting**: Logout adds tokens to in-memory set (production should use Redis)

## 🔧 Common Tasks

### Adding a New API Endpoint
1. Create route file: `src/app/api/resource/route.ts`
2. Create Zod validation: `src/lib/validations/resource.ts`
3. Add test: `src/__tests__/api/resource.test.ts`
4. Use `authenticateRequest()` + `connectDB()` pattern
5. Return `NextResponse.json(data, { headers: securityHeaders })`

### Adding a New Model
1. Create `src/lib/models/ModelName.ts` with Interface + Schema
2. Use discriminator fields for role-based models (e.g., User role: 'user'|'host')
3. Add validation in schema (min/max, regex patterns, enum values)
4. Add test with MongoMemoryServer in `src/__tests__/models/`

### Creating Component Tests
1. Use `renderWithProviders()` from test-utils for Auth context
2. Mock API calls with `jest.mock()`
3. Test user interactions with `@testing-library/user-event`
4. Check for accessibility attributes

### Database Debugging
- Run `npm run test:db` to verify connection
- Run `npm run validate:models` to check schema integrity
- Use MongoDB Atlas UI or `mongosh` for manual queries

## ⚠️ Critical Gotchas

1. **Auth Header Case**: JWT verification uses `'Authorization': 'Bearer <token>'` (exact casing matters)
2. **Timezone Issues**: Don't forget Date objects in bookings need timezone awareness
3. **Mongoose `.select('+field')`**: Required to retrieve sensitive fields like `password`
4. **Next.js Client/Server**: Components default to server; use `'use client'` for interactive features
5. **Coordinate Format**: Maps expect `{ lat, lng }` but some libraries use `[lng, lat]` — check documentation
6. **Token Expiration**: Always handle 401 responses by refreshing token or redirecting to login
7. **CORS**: Not needed (same-origin requests); if adding external APIs, update CSP headers

## 📚 Key File References
- **Auth System**: `src/lib/auth/jwt.ts`, `src/contexts/AuthContext.tsx`, `src/app/api/auth/`
- **API Patterns**: `src/app/api/bookings/route.ts`, `src/app/api/parking-spots/route.ts`
- **Validation**: `src/lib/middleware/validation.ts`, `src/lib/validations/`
- **Security**: `src/lib/security/headers.ts`, `src/lib/security/rate-limit.ts`
- **Models**: `src/lib/models/` directory
- **Tests**: `src/__tests__/` directory with subdirectories mirroring source

---

**Last Updated**: Nov 2025 | **Stack**: Next.js 15, TypeScript, MongoDB, Mongoose, Jest, Zod
