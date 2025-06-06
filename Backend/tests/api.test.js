// Basic backend API tests for UNO app
const request = require("supertest");
const app = require("../server");
const mongoose = require("mongoose");

describe("UNO API - Health & Auth", () => {
  it("should return 404 for unknown route", async () => {
    const res = await request(app).get("/api/unknown");
    expect(res.statusCode).toBe(404);
  });

  it("should not allow access to protected route without token", async () => {
    const res = await request(app).get("/api/user/me");
    expect(res.statusCode).toBe(401);
  });
});

afterAll(async () => {
  await mongoose.disconnect();
});

// Add more tests for /api/auth, /api/game, /api/friends, /api/tournaments, etc.
// Example: Registration, login, create room, join room, friend request, etc.
