// File: services/user.service.js

const User = require("../models/User");

/**
 * Get user by ID with friends populated
 * @param {String} userId
 * @returns {Promise<User>}
 */
async function getUserById(userId) {
  return User.findById(userId).populate("friends", "name email");
}

/**
 * Update user profile fields (e.g. name, email)
 * @param {String} userId
 * @param {Object} updateData - fields to update
 * @returns {Promise<User>}
 */
async function updateUser(userId, updateData) {
  return User.findByIdAndUpdate(userId, updateData, { new: true });
}

/**
 * Add friend by friend's userId
 * @param {String} userId
 * @param {String} friendId
 * @returns {Promise<User>}
 */
async function addFriend(userId, friendId) {
  if (userId === friendId) throw new Error("Cannot add yourself as friend");

  const user = await User.findById(userId);
  if (!user) throw new Error("User not found");

  if (user.friends.includes(friendId)) {
    throw new Error("Already friends");
  }

  user.friends.push(friendId);
  await user.save();

  return user;
}

/**
 * Remove friend by friend's userId
 * @param {String} userId
 * @param {String} friendId
 * @returns {Promise<User>}
 */
async function removeFriend(userId, friendId) {
  const user = await User.findById(userId);
  if (!user) throw new Error("User not found");

  user.friends = user.friends.filter(f => f.toString() !== friendId);
  await user.save();

  return user;
}

/**
 * Get user's friend list with basic info
 * @param {String} userId
 * @returns {Promise<User[]>}
 */
async function getFriends(userId) {
  const user = await User.findById(userId).populate("friends", "name email");
  if (!user) throw new Error("User not found");

  return user.friends;
}

module.exports = {
  getUserById,
  updateUser,
  addFriend,
  removeFriend,
  getFriends,
};
