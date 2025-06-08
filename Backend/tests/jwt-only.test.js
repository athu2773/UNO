require("dotenv").config();
const jwt = require("jsonwebtoken");

describe("JWT Only Tests", () => {
  // Test user JWT generation and verification
  it("should generate and verify user JWT", () => {
    // Create test user payload
    const payload = {
      id: "12345",
      email: "test@example.com",
      username: "testuser",
    };

    // Generate JWT token
    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    // Verify token was created
    expect(token).toBeDefined();
    expect(typeof token).toBe("string");

    // Decode and verify token contents
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    expect(decoded.id).toBe("12345");
    expect(decoded.email).toBe("test@example.com");
    expect(decoded.username).toBe("testuser");
  });

  // Test room JWT generation and verification
  it("should generate and verify room JWT", () => {
    // Create test room payload
    const payload = {
      roomId: "room123",
      code: "ABC123",
      host: "12345",
    };

    // Generate room-specific JWT
    const token = jwt.sign(payload, process.env.ROOM_JWT_SECRET, {
      expiresIn: "1d",
    });

    // Token validation
    expect(token).toBeDefined();
    expect(typeof token).toBe("string");

    // Verify room token contents
    const decoded = jwt.verify(token, process.env.ROOM_JWT_SECRET);
    expect(decoded.roomId).toBe("room123");
    expect(decoded.code).toBe("ABC123");
    expect(decoded.host).toBe("12345");
  });

  // Test JWT validation failures
  it("should reject invalid tokens", () => {
    // Test malformed token
    expect(() => {
      jwt.verify("invalid.token.here", process.env.JWT_SECRET);
    }).toThrow("invalid token");

    // Test valid token with wrong secret
    expect(() => {
      jwt.verify("valid.token.format", "wrong_secret");
    }).toThrow();
  });
});
