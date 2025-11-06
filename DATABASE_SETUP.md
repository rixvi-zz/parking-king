# Database Setup Instructions

## Option 1: MongoDB Atlas (Recommended - Free Cloud Database)

1. Go to [MongoDB Atlas](https://www.mongodb.com/atlas) and create a free account
2. Create a new cluster (free tier M0)
3. Wait for cluster to be created (2-3 minutes)
4. Click "Connect" on your cluster
5. Add your IP address to the whitelist (or use 0.0.0.0/0 for development)
6. Create a database user with username and password
7. Choose "Connect your application"
8. Copy the connection string and replace in `.env.local`:

```
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/parking_king?retryWrites=true&w=majority
```

Replace `username` and `password` with your actual credentials.

## Option 2: Local MongoDB Installation

1. Download and install MongoDB Community Server from [MongoDB Download Center](https://www.mongodb.com/try/download/community)
2. Start MongoDB service
3. Update `.env.local`:

```
MONGODB_URI=mongodb://localhost:27017/parking_king
```

## Testing the Connection

Run the test script to verify your database connection:

```bash
npm run test:db
```

You should see "Mongo connected" if everything is working correctly.

## Database Models

The application uses the following MongoDB collections:

- **Users**: Store user accounts (customers and hosts)
- **ParkingSpots**: Store parking space listings
- **Bookings**: Store reservation data
- **Vehicles**: Store user vehicle information

All models are defined in `src/lib/models/` with proper TypeScript types and Mongoose schemas.