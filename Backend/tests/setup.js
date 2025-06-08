process.env.JWT_SECRET = "masai";
process.env.ROOM_JWT_SECRET = "test-room-secret-key";

// Verify
console.log("Test environment loaded:");
console.log("JWT_SECRET:", process.env.JWT_SECRET);
console.log("ROOM_JWT_SECRET:", process.env.ROOM_JWT_SECRET);

// MongoDB cleanup function that will be called from test files
const mongoose = require("mongoose");

global.cleanupMongoDB = async () => {
  try {
    const db = mongoose.connection.db;
    if (db) {
      // Drop the problematic index
      try {
        await db.collection("users").dropIndex("googleId_1");
      } catch (error) {
        // Index might not exist, that's okay
      }

      // Optional: Clear collections for clean test state
      await db.collection("users").deleteMany({});
      await db.collection("rooms").deleteMany({});
    }
  } catch (error) {
    console.log("Cleanup error (non-critical):", error.message);
  }
};
