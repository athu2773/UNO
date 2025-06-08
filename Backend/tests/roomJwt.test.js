require("dotenv").config();
const request = require("supertest");
const app = require("../server");
const User = require("../models/User");
const Room = require("../models/Room");
describe("Room JWT", () => {
  let userToken;
  let roomToken;
  let roomId;

  beforeAll(async () => {
    if (global.cleanupMongoDB) {
      await global.cleanupMongoDB();
    }

    // Clear existing test data
    await User.deleteMany({});
    await Room.deleteMany({});

    console.log("Starting Room JWT tests...");
    console.log("JWT_SECRET in test:", process.env.JWT_SECRET);
    console.log("ROOM_JWT_SECRET in test:", process.env.ROOM_JWT_SECRET);

    // Test User Registration
    const registerRes = await request(app).post("/api/auth/register").send({
      username: "roomjwtuser",
      email: "roomjwt@example.com",
      password: "testpass123",
    });
    console.log("Register response status:", registerRes.status);

    // Test User Login
    const loginRes = await request(app)
      .post("/api/auth/login")
      .send({ email: "roomjwt@example.com", password: "testpass123" });
    console.log("Login response status:", loginRes.status);
    console.log("Login response body:", loginRes.body);

    userToken = loginRes.body.token;
    console.log("User token:", userToken);
  });
  // Test case: Room creation
  it("should create a room and return a roomToken", async () => {
    console.log("Creating room with user token:", userToken);
    const res = await request(app)
      .post("/api/game/create-room")
      .set("Authorization", `Bearer ${userToken}`);
    console.log("Create room response status:", res.status);
    console.log("Create room response body:", res.body);
    expect(res.statusCode).toBe(201);
    expect(res.body.roomToken).toBeDefined();
    roomToken = res.body.roomToken;
    roomId = res.body._id;
    console.log("Room token:", roomToken);
    console.log("Room ID:", roomId);
  });

  // Test case: Valid room token access
  it("should allow access to room-protected route with valid roomToken", async () => {
    console.log("Testing room-protected route with token:", roomToken);
    const res = await request(app)
      .get(`/api/game/room-protected/${roomId}`)
      .set("Authorization", `Bearer ${roomToken}`);
    console.log("Room-protected response status:", res.status);
    console.log("Room-protected response body:", res.body);
    expect(res.statusCode).toBe(200);
    expect(res.body.room).toBeDefined();
    expect(res.body.room.roomId).toBe(roomId);
  });

  // Test case: Invalid room token access
  it("should reject access to room-protected route with invalid roomToken", async () => {
    const res = await request(app)
      .get(`/api/game/room-protected/${roomId}`)
      .set("Authorization", "Bearer invalidtoken");
    expect(res.statusCode).toBe(401);
    expect(res.body.message).toMatch(/room token/i);
  });
});
