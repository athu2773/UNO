// File: middlewares/bot.middleware.js

/**
 * Middleware to check if the current player is a bot.
 * Can be used to automate bot actions or skip certain validations for bots.
 */

const BOT_USER_IDS = new Set([
  // Add bot user IDs here or fetch dynamically
]);

// Middleware to identify bot user from socket or request user id
function checkBotPlayer(req, res, next) {
  const userId = req.user?._id?.toString() || null;

  if (userId && BOT_USER_IDS.has(userId)) {
    req.isBot = true;
  } else {
    req.isBot = false;
  }

  next();
}

// For socket.io, a similar function
function checkBotSocket(socket, next) {
  const userId = socket.user?._id?.toString() || null;

  if (userId && BOT_USER_IDS.has(userId)) {
    socket.isBot = true;
  } else {
    socket.isBot = false;
  }

  next();
}

module.exports = {
  checkBotPlayer,
  checkBotSocket,
};
