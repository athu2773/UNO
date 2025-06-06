// File: sockets/chatSocket.js

const chatService = require("../services/chat.service");
const socketAuth = require("../middlewares/socketAuth.middleware");

function setupChatSockets(io) {
  io.use(socketAuth); // Authenticate sockets

  io.on("connection", (socket) => {
    console.log(`User connected to chat: ${socket.user.id}, socketId: ${socket.id}`);

    // Join rooms that user belongs to or join specific chat room
    socket.on("joinRoom", (roomId) => {
      socket.join(roomId);
      console.log(`User ${socket.user.id} joined chat room ${roomId}`);
    });

    // Handle sending message
    socket.on("sendMessage", async ({ roomId, message }) => {
      try {
        // Save message in DB
        const savedMessage = await chatService.saveMessage({
          sender: socket.user.id,
          room: roomId,
          message,
        });

        // Broadcast to all in the room including sender
        io.to(roomId).emit("receiveMessage", savedMessage);
      } catch (error) {
        console.error("Error saving chat message:", error);
        socket.emit("error", { message: "Failed to send message" });
      }
    });

    socket.on("disconnect", () => {
      console.log(`User disconnected from chat: ${socket.user.id}`);
    });
  });
}

module.exports = { setupChatSockets };
