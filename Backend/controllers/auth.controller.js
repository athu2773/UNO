// File: controllers/auth.controller.js
const jwt = require("jsonwebtoken");
const User = require("../models/User");

// Helper to generate JWT
const generateToken = (user) => {
  return jwt.sign(
    { id: user._id, email: user.email, name: user.name },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
};

// Called after successful Google OAuth login (Passport strategy)
exports.googleCallback = async (req, res) => {
  try {
    // User attached to req by passport after successful OAuth
    const user = req.user;
    if (!user) return res.status(401).json({ message: "Authentication failed" });

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
    const payload = jwt.verify(token, process.env.JWT_SECRET, { ignoreExpiration: true });
    const newToken = jwt.sign(
      { id: payload.id, email: payload.email, name: payload.name },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );
    res.json({ token: newToken });
  } catch (err) {
    res.status(401).json({ message: "Invalid token" });
  }
};
