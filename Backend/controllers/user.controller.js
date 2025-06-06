const User = require("../models/User");

// Get current logged-in user profile
const getProfile = async (req, res) => {
  try {
    const userId = req.user._id;
    const user = await User.findById(userId)
      .select("-googleId -__v")
      .populate("friends", "name email");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({ user });
  } catch (err) {
    console.error("Get profile error:", err);
    res.status(500).json({ message: "Server error fetching profile" });
  }
};

// Add a friend by userId
const addFriend = async (req, res) => {
  try {
    const userId = req.user._id;
    const { friendId } = req.body;

    if (userId.equals(friendId)) {
      return res.status(400).json({ message: "Cannot add yourself as a friend" });
    }

    const user = await User.findById(userId);
    const friend = await User.findById(friendId);

    if (!friend) {
      return res.status(404).json({ message: "Friend user not found" });
    }

    if (user.friends.includes(friendId)) {
      return res.status(400).json({ message: "User already in friends list" });
    }

    user.friends.push(friendId);
    await user.save();

    res.json({ message: "Friend added successfully" });
  } catch (err) {
    console.error("Add friend error:", err);
    res.status(500).json({ message: "Server error adding friend" });
  }
};

// Get friend list
const getFriends = async (req, res) => {
  try {
    const userId = req.user._id;
    const user = await User.findById(userId).populate("friends", "name email");
    res.json({ friends: user.friends });
  } catch (err) {
    console.error("Get friends error:", err);
    res.status(500).json({ message: "Server error fetching friends" });
  }
};

// Get user game history (win/loss)
const getGameHistory = async (req, res) => {
  try {
    const userId = req.user._id;

    const user = await User.findById(userId).select("history").populate({
      path: "history.gameId",
      select: "code status winner createdAt",
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({ history: user.history });
  } catch (err) {
    console.error("Get history error:", err);
    res.status(500).json({ message: "Server error fetching history" });
  }
};

module.exports = {
  getProfile,
  addFriend,
  getFriends,
  getGameHistory,
};
