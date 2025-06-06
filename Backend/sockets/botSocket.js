// File: sockets/botSocket.js

const botService = require("../services/bot.service");

function setupBotSockets(io) {
  io.on("connection", (socket) => {
    console.log(`Bot socket connected: ${socket.id}`);

    // Listen for bot action requests, e.g. bot making a move in a room
    socket.on("botMakeMove", async ({ roomId, botPlayerId }) => {
      try {
        const move = await botService.makeBotMove(roomId, botPlayerId);

        // Emit move back to room players
        io.to(roomId).emit("botMoveMade", { botPlayerId, move });
      } catch (error) {
        console.error("Error in botMakeMove:", error);
        socket.emit("botError", { message: error.message });
      }
    });

    // Optional: Handle bot joining room, leaving, etc.

    socket.on("disconnect", () => {
      console.log(`Bot socket disconnected: ${socket.id}`);
      // Cleanup if needed
    });
  });
}

module.exports = { setupBotSockets };
