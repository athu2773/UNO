// File: controllers/auth.controller.js
const jwt = require("jsonwebtoken");
const User = require("../models/User");

// Helper to generate JWT
const generateToken = (user) => {
  return jwt.sign(
    { id: user._id, email: user.email, username: user.username },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
};

// Helper to generate Room JWT
const generateRoomToken = (room) => {
  return jwt.sign(
    { roomId: room._id, code: room.code, host: room.host },
    process.env.ROOM_JWT_SECRET,
    { expiresIn: "1d" }
  );
};

// Called after successful Google OAuth login (Passport strategy)
exports.googleCallback = async (req, res) => {
  try {
    // User attached to req by passport after successful OAuth
    const user = req.user;
    if (!user)
      return res.status(401).json({ message: "Authentication failed" });

    // Generate JWT token for frontend usage
    const token = generateToken(user);

    // Redirect to dashboard or send token as JSON (choose approach)
    // Example: send token in query (you might want to set in cookie or header)
    res.redirect(`${process.env.FRONTEND_URL}/dashboard?token=${token}`);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error during login" });
  }
};

// Token refresh (optional)
exports.refreshToken = (req, res) => {
  const { token } = req.body;
  if (!token) return res.status(400).json({ message: "Token required" });
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET, {
      ignoreExpiration: true,
    });
    const newToken = jwt.sign(
      { id: payload.id, email: payload.email, username: payload.username },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );
    res.json({ token: newToken });
  } catch (err) {
    res.status(401).json({ message: "Invalid token" });
  }
};

// User registration
exports.register = async (req, res) => {
  try {
    const { username, email, password } = req.body;
    if (!username || !email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }
    // Check if user exists
    let user = await User.findOne({ $or: [{ email }, { username }] });
    if (user) {
      return res.status(400).json({ message: "User already exists" });
    }
    // Create user
    user = new User({ username, email, password });
    await user.save();
    // Generate token
    const token = jwt.sign(
      { id: user._id, email: user.email, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );
    res.status(201).json({ token, user });
  } catch (err) {
    res.status(500).json({ message: "Server error during registration" });
  }
};

// User login
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "Email and password are required" });
    }
    const user = await User.findOne({ email }).select("+password");
    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }
    const token = jwt.sign(
      { id: user._id, email: user.email, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );
    res.status(200).json({ token, user });
  } catch (err) {
    res.status(500).json({ message: "Server error during login" });
  }
};

module.exports = {
  ...exports,
  generateRoomToken,
};
