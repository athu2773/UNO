const io = require("socket.io-client");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const User = require("./models/User");
require("dotenv").config();

// Test socket connection with authentication
async function testSocketConnection() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB");

    // Create a test user
    const testUser = new User({
      username: "sockettest",
      email: "sockettest@example.com",
      password: "testpass123",
    });
    await testUser.save();
    console.log("Test user created:", testUser._id);

    // Generate a test token
    const token = jwt.sign(
      { id: testUser._id, email: testUser.email, username: testUser.username },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    console.log("Connecting to socket with token...");

    const socket = io("http://localhost:8080", {
      auth: { token },
    });

    socket.on("connect", () => {
      console.log("✅ Socket connected successfully!");

      // Test createRoom event
      console.log("Testing createRoom event...");
      socket.emit("createRoom", (response) => {
        console.log("CreateRoom response:", response);

        if (response.success) {
          console.log("✅ Room created successfully:", response.room.code);
        } else {
          console.log("❌ Room creation failed:", response.error);
        }

        socket.disconnect();
      });
    });

    socket.on("connect_error", (error) => {
      console.log("❌ Socket connection failed:", error.message);
      socket.disconnect();
    });
    socket.on("disconnect", () => {
      console.log("Socket disconnected");

      // Cleanup
      User.findByIdAndDelete(testUser._id).then(() => {
        console.log("Test user cleaned up");
        mongoose.disconnect();
        process.exit(0);
      });
    });

    // Timeout after 10 seconds
    setTimeout(() => {
      console.log("Test timeout");
      socket.disconnect();
      User.findByIdAndDelete(testUser._id).then(() => {
        mongoose.disconnect();
        process.exit(1);
      });
    }, 10000);
  } catch (error) {
    console.error("Test setup failed:", error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

testSocketConnection();
