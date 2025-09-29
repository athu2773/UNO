const jwt = require("jsonwebtoken");
const User = require("../models/User");

async function socketAuthMiddleware(socket, next) {
  try {
    const token = socket.handshake.auth.token || socket.handshake.query.token;

    if (!token) {
      const err = new Error("Authentication token is missing");
      err.data = { content: "Please provide a valid token" };
      return next(err);
    }

    // Verify JWT
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Attach user info to socket object for later use
    const user = await User.findById(decoded.id);
    if (!user) {
      const err = new Error("User not found");
      err.data = { content: "User does not exist" };
      return next(err);
    }

    socket.user = {
      _id: user._id,
      name: user.name,
      email: user.email,
      googleId: user.googleId,
    };

    next();
  } catch (error) {
    console.error("Socket auth error:", error);
    const err = new Error("Authentication error");
    err.data = { content: error.message };
    next(err);
  }
}

module.exports = socketAuthMiddleware;
