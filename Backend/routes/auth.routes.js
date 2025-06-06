// File: routes/auth.routes.js
const express = require("express");
const passport = require("passport");
const jwt = require("jsonwebtoken");

const router = express.Router();

// Google OAuth login route
router.get(
  "/google",
  passport.authenticate("google", {
    scope: ["profile", "email"],
    session: false,
  })
);

// Google OAuth callback route
router.get(
  "/google/callback",
  passport.authenticate("google", { session: false, failureRedirect: "/" }),
  (req, res) => {
    // User authenticated, generate JWT token
    const payload = {
      id: req.user._id,
      name: req.user.name,
      email: req.user.email,
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: "7d",
    }); // Redirect to frontend dashboard with token (or send JSON if API)
    // Example: redirect with token in query or fragment
    res.redirect(`${process.env.CLIENT_URL}/?token=${token}`);
  }
);

// Route to verify token and get current user info
router.get("/me", (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader)
    return res.status(401).json({ message: "Authorization header missing" });

  const token = authHeader.split(" ")[1];
  if (!token)
    return res.status(401).json({ message: "Token missing from header" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    res.json({ user: decoded });
  } catch (err) {
    return res.status(401).json({ message: "Invalid token" });
  }
});

module.exports = router;
