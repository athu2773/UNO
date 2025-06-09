// fix-db-index.js - Fix the googleId index issue
require("dotenv").config();
const mongoose = require("mongoose");

async function fixDatabase() {
  try {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Connected to MongoDB");

    const db = mongoose.connection.db;

    // Drop the problematic googleId index
    try {
      console.log("Dropping googleId_1 index...");
      await db.collection("users").dropIndex("googleId_1");
      console.log("✅ Successfully dropped googleId_1 index");
    } catch (error) {
      if (error.message.includes("index not found")) {
        console.log("ℹ️ googleId_1 index not found (already dropped)");
      } else {
        console.error("Error dropping index:", error.message);
      }
    }

    // Recreate the index as sparse
    try {
      console.log("Creating new sparse googleId index...");
      await db
        .collection("users")
        .createIndex({ googleId: 1 }, { unique: true, sparse: true });
      console.log("✅ Successfully created new sparse googleId index");
    } catch (error) {
      console.error("Error creating index:", error.message);
    }

    // Clean up any users with null googleId that might cause issues
    try {
      console.log("Cleaning up users with null googleId...");
      const result = await db
        .collection("users")
        .updateMany({ googleId: null }, { $unset: { googleId: "" } });
      console.log(`✅ Updated ${result.modifiedCount} users`);
    } catch (error) {
      console.error("Error cleaning up users:", error.message);
    }

    console.log("✅ Database fix completed successfully");
  } catch (error) {
    console.error("❌ Database fix failed:", error);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB");
  }
}

if (require.main === module) {
  fixDatabase();
}

module.exports = fixDatabase;
