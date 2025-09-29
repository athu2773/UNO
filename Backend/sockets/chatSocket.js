const chatService = require("../services/chat.service");
const socketAuth = require("../middlewares/socketAuth.middleware");

function setupChatSockets(io) {
  io.use(socketAuth); 
  io.on("connection", (socket) => {
    console.log(
      `User connected to chat: ${socket.user._id}, socketId: ${socket.id}`
    );

    // Handle sending message
    socket.on("sendMessage", async ({ roomId, message }) => {
      try {
        // Find the room by code to get the ObjectId
        const Room = require("../models/Room");
        const room = await Room.findOne({ code: roomId });

        if (!room) {
          socket.emit("error", { message: "Room not found" });
          return;
        } // Save message in DB with the room's ObjectId
        const savedMessage = await chatService.saveMessage({
          sender: socket.user._id,
          roomId: room._id,
          content: message,
        });

        // Populate the sender data and format for frontend
        await savedMessage.populate("sender", "name email picture");

        const formattedMessage = {
          id: savedMessage._id.toString(),
          userId: savedMessage.sender._id.toString(),
          username: savedMessage.sender.name,
          content: savedMessage.content,
          timestamp: savedMessage.timestamp || savedMessage.createdAt,
          type: "user",
        };

        // Broadcast to all in the room including sender
        io.to(roomId).emit("receiveMessage", formattedMessage);
      } catch (error) {
        console.error("Error saving chat message:", error);
        socket.emit("error", { message: "Failed to send message" });
      }
    });

    socket.on("disconnect", () => {
      console.log(`User disconnected from chat: ${socket.user._id}`);
    });
  });
}

module.exports = { setupChatSockets };
