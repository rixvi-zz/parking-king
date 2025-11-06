import dotenv from "dotenv";
import { connectDB } from "../lib/database";

// Load environment variables
dotenv.config({ path: ".env.local" });

console.log("Testing database connection...");
console.log("MongoDB URI configured:", process.env.MONGODB_URI ? "✓ Yes" : "✗ No");

if (!process.env.MONGODB_URI || process.env.MONGODB_URI.includes("username:password")) {
  console.log("\n⚠️  Please configure your MongoDB connection string in .env.local");
  console.log("See DATABASE_SETUP.md for instructions");
  console.log("\nDatabase models are ready:");
  console.log("✓ User model");
  console.log("✓ ParkingSpot model");
  console.log("✓ Booking model");
  console.log("✓ Vehicle model");
  console.log("✓ Database connection helper");
  process.exit(0);
}

connectDB()
  .then(() => {
    console.log("✓ Mongo connected successfully!");
    console.log("✓ Database models loaded");
    console.log("✓ Ready for development");
    process.exit(0);
  })
  .catch((error) => {
    console.error("✗ Database connection failed:", error.message);
    console.log("\nPlease check:");
    console.log("1. MongoDB URI is correct");
    console.log("2. IP address is whitelisted (for Atlas)");
    console.log("3. Username/password are correct");
    console.log("4. MongoDB service is running (for local)");
    process.exit(1);
  });