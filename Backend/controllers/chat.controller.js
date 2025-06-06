// File: controllers/chat.controller.js
const Message = require("../models/Message");

// Send a chat message
exports.sendMessage = async (req, res) => {
  try {
    const { roomId, content } = req.body;
    const senderId = req.user._id;

    if (!roomId || !content) {
      return res.status(400).json({ message: "roomId and content are required" });
    }

    const message = await Message.create({
      roomId,
      sender: senderId,
      content,
    });

    res.status(201).json({ message });
  } catch (err) {
    console.error("Send message error:", err);
    res.status(500).json({ message: "Server error while sending message" });
  }
};

// Get messages for a room (with optional pagination)
exports.getMessages = async (req, res) => {
  try {
    const { roomId } = req.params;
    const limit = parseInt(req.query.limit) || 50;

    if (!roomId) {
      return res.status(400).json({ message: "roomId is required" });
    }

    const messages = await Message.find({ roomId })
      .sort({ createdAt: 1 })
      .limit(limit)
      .populate("sender", "name");

    res.json({ messages });
  } catch (err) {
    console.error("Get messages error:", err);
    res.status(500).json({ message: "Server error while fetching messages" });
  }
};
