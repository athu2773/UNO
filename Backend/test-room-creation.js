const dotenv = require("dotenv");
dotenv.config();

const User = require("./models/User");
const Room = require("./models/Room");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");

async function testRoomCreation() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB"); // Create a test user
    const testUser = new User({
      username: "testuser",
      email: "test_" + Date.now() + "@example.com",
      password: "testpass123",
    });
    await testUser.save();
    console.log("Test user created:", testUser._id);

    // Generate token
    const token = jwt.sign(
      { id: testUser._id, email: testUser.email, username: testUser.username },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );
    console.log("Token generated:", token.substring(0, 50) + "...");

    // Test token verification
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log("Token verified successfully for user:", decoded.id);

    // Test room creation logic directly
    const { nanoid } = require("nanoid/non-secure");
    const { generateDeck } = require("./utils/unoLogic");

    const code = nanoid(6).toUpperCase();
    const deck = generateDeck();
    const hand = deck.splice(0, 7);

    const room = new Room({
      code,
      host: testUser._id,
      players: [{ user: testUser._id, hand, saidUno: false }],
      deck,
      discardPile: [],
      currentTurn: 0,
      direction: "clockwise",
      drawStack: 0,
      currentColor: null,
      status: "waiting",
    });

    await room.save();
    console.log("Room created successfully:", room.code);

    // Cleanup
    await User.findByIdAndDelete(testUser._id);
    await Room.findByIdAndDelete(room._id);
    console.log("Cleanup completed");
  } catch (error) {
    console.error("Test failed:", error);
  } finally {
    await mongoose.disconnect();
  }
}

testRoomCreation();
