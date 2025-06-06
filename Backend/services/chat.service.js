// File: services/chat.service.js
const Message = require("../models/Message");

/**
 * Save a chat message to the database
 * @param {Object} messageData - { roomCode, sender, content, timestamp }
 * @returns {Promise<Message>} saved message document
 */
async function saveMessage(messageData) {
  const message = new Message(messageData);
  return await message.save();
}

/**
 * Get chat messages for a specific room
 * @param {String} roomCode - Room code identifier
 * @param {Number} limit - Number of messages to retrieve
 * @returns {Promise<Array>} List of message documents
 */
async function getMessagesByRoom(roomCode, limit = 50) {
  return await Message.find({ roomCode })
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean()
    .exec();
}

module.exports = {
  saveMessage,
  getMessagesByRoom,
};
