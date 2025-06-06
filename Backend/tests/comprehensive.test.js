// Comprehensive backend API tests for UNO app
const request = require("supertest");
const mongoose = require("mongoose");
const app = require("../server");
const User = require("../models/User");
const Room = require("../models/Room");

describe("UNO App - Comprehensive Backend Tests", () => {
  let userToken;
  let userId;
  let roomId;

  beforeAll(async () => {
    // Clear test data
    await User.deleteMany({});
    await Room.deleteMany({});
  });

  afterAll(async () => {
    await mongoose.disconnect();
  });

  describe("Authentication & User Management", () => {
    it("should register a new user", async () => {
      const res = await request(app).post("/api/auth/register").send({
        username: "testuser",
        email: "test@example.com",
        password: "password123",
      });

      expect(res.statusCode).toBe(201);
      expect(res.body.token).toBeDefined();
      userToken = res.body.token;
      userId = res.body.user._id;
    });

    it("should login with valid credentials", async () => {
      const res = await request(app).post("/api/auth/login").send({
        email: "test@example.com",
        password: "password123",
      });

      expect(res.statusCode).toBe(200);
      expect(res.body.token).toBeDefined();
      userToken = res.body.token; // <-- Ensure token is updated after login
    });

    it("should get user profile with valid token", async () => {
      const res = await request(app)
        .get("/api/user/me")
        .set("Authorization", `Bearer ${userToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.username).toBe("testuser");
    });
  });

  describe("Game Room Management", () => {
    it("should create a new game room", async () => {
      const res = await request(app)
        .post("/api/game/create-room")
        .set("Authorization", `Bearer ${userToken}`);

      expect(res.statusCode).toBe(201);
      expect(res.body.code).toBeDefined();
      expect(res.body.code).toHaveLength(6);
      roomId = res.body._id;
    });

    it("should get room details", async () => {
      const res = await request(app)
        .get(`/api/game/room/${roomId}`)
        .set("Authorization", `Bearer ${userToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.host).toBe(userId);
    });

    it("should list user's rooms", async () => {
      console.log('[TEST DEBUG] userToken before /api/game/rooms:', userToken);
      const res = await request(app)
        .get("/api/game/rooms")
        .set("Authorization", `Bearer ${userToken}`);

      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe("Friends System", () => {
    it("should get friends list", async () => {
      const res = await request(app)
        .get("/api/friends")
        .set("Authorization", `Bearer ${userToken}`);

      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it("should get friend requests", async () => {
      const res = await request(app)
        .get("/api/friends/requests")
        .set("Authorization", `Bearer ${userToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.received).toBeDefined();
      expect(res.body.sent).toBeDefined();
    });
  });

  describe("Statistics", () => {
    it("should get user statistics", async () => {
      const res = await request(app)
        .get("/api/stats")
        .set("Authorization", `Bearer ${userToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.gamesPlayed).toBeDefined();
    });

    it("should get leaderboard", async () => {
      const res = await request(app)
        .get("/api/stats/leaderboard")
        .set("Authorization", `Bearer ${userToken}`);

      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe("Tournaments", () => {
    it("should get tournaments list", async () => {
      const res = await request(app)
        .get("/api/tournaments")
        .set("Authorization", `Bearer ${userToken}`);

      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe("Notifications", () => {
    it("should get user notifications", async () => {
      const res = await request(app)
        .get("/api/notifications")
        .set("Authorization", `Bearer ${userToken}`);

      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe("Error Handling", () => {
    it("should return 401 for protected routes without token", async () => {
      const res = await request(app).get("/api/user/me");
      expect(res.statusCode).toBe(401);
    });

    it("should return 404 for non-existent routes", async () => {
      const res = await request(app).get("/api/nonexistent");
      expect(res.statusCode).toBe(404);
    });

    it("should return 400 for invalid registration data", async () => {
      const res = await request(app).post("/api/auth/register").send({
        username: "",
        email: "invalid-email",
        password: "123",
      });

      expect(res.statusCode).toBe(400);
    });
  });
});
