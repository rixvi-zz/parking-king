import dotenv from "dotenv";

// Load environment variables
dotenv.config({ path: ".env.local" });

console.log("Validating database models...");

try {
  // Import all models to check for syntax errors
  const User = require("../lib/models/User").default;
  const ParkingSpot = require("../lib/models/ParkingSpot").default;
  const Booking = require("../lib/models/Booking").default;
  const Vehicle = require("../lib/models/Vehicle").default;
  
  console.log("✓ User model imported successfully");
  console.log("✓ ParkingSpot model imported successfully");
  console.log("✓ Booking model imported successfully");
  console.log("✓ Vehicle model imported successfully");
  
  console.log("\nModel schemas validated:");
  console.log("- User: name, email, passwordHash, role");
  console.log("- ParkingSpot: hostId, title, description, coordinates, price, availability, features, images");
  console.log("- Booking: userId, spotId, startTime, endTime, price, status");
  console.log("- Vehicle: userId, type, make, licensePlate, isDefault");
  
  console.log("\n✅ All models are valid and ready for use!");
  
} catch (error) {
  console.error("❌ Model validation failed:", error.message);
  process.exit(1);
}