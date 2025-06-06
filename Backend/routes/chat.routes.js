// routes/chat.routes.js
const express = require("express");
const router = express.Router();
const chatController = require("../controllers/chat.controller");
const { isAuthenticated } = require("../middlewares/auth.middleware");

// Send a new chat message
router.post("/", isAuthenticated, chatController.sendMessage);

// Get chat messages for a room (optionally with pagination)
router.get("/:roomCode", isAuthenticated, chatController.getMessages);

module.exports = router;
