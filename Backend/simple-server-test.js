// simple-server-test.js - Test basic server connectivity
require("dotenv").config();
const axios = require("axios");

const testServer = async () => {
  console.log("Testing server connectivity...");

  try {
    // Test 1: Basic GET request to root
    console.log("\n1. Testing root endpoint...");
    const rootResponse = await axios.get("http://localhost:8080");
    console.log("✅ Root endpoint reachable:", rootResponse.status);
  } catch (error) {
    console.log("❌ Root endpoint error:", error.message);
  }

  try {
    // Test 2: Test auth route exists
    console.log("\n2. Testing /api/auth/register endpoint...");
    const registerResponse = await axios.post(
      "http://localhost:8080/api/auth/register",
      {
        username: "testuser",
        email: "test@example.com",
        password: "testpass123",
      }
    );
    console.log(
      "✅ Register endpoint response:",
      registerResponse.status,
      registerResponse.data
    );
  } catch (error) {
    console.log(
      "❌ Register endpoint error:",
      error.response?.status,
      error.response?.data || error.message
    );
  }

  try {
    // Test 3: Test login endpoint
    console.log("\n3. Testing /api/auth/login endpoint...");
    const loginResponse = await axios.post(
      "http://localhost:8080/api/auth/login",
      {
        email: "test@example.com",
        password: "testpass123",
      }
    );
    console.log(
      "✅ Login endpoint response:",
      loginResponse.status,
      loginResponse.data
    );
  } catch (error) {
    console.log(
      "❌ Login endpoint error:",
      error.response?.status,
      error.response?.data || error.message
    );
  }
};

testServer();
