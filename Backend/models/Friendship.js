const mongoose = require("mongoose");

const friendshipSchema = new mongoose.Schema(
  {
    requester: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "accepted", "declined", "blocked"],
      default: "pending",
    },
    requestedAt: {
      type: Date,
      default: Date.now,
    },
    respondedAt: {
      type: Date,
    },
    // Mutual friend suggestions
    mutualFriends: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    // Friend activity tracking
    lastInteraction: {
      type: Date,
      default: Date.now,
    },
    gamesPlayedTogether: {
      type: Number,
      default: 0,
    },
    // Friend notes (private notes about the friend)
    notes: {
      type: String,
      maxlength: 500,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index to prevent duplicate friendships
friendshipSchema.index({ requester: 1, recipient: 1 }, { unique: true });

// Static methods for friendship management
friendshipSchema.statics.sendFriendRequest = async function (
  requesterId,
  recipientId
) {
  // Check if friendship already exists
  const existingFriendship = await this.findOne({
    $or: [
      { requester: requesterId, recipient: recipientId },
      { requester: recipientId, recipient: requesterId },
    ],
  });

  if (existingFriendship) {
    if (existingFriendship.status === "accepted") {
      throw new Error("Users are already friends");
    } else if (existingFriendship.status === "pending") {
      throw new Error("Friend request already sent");
    } else if (existingFriendship.status === "blocked") {
      throw new Error("Cannot send friend request to blocked user");
    }
  }

  const friendship = new this({
    requester: requesterId,
    recipient: recipientId,
    status: "pending",
  });

  await friendship.save();
  return friendship;
};

friendshipSchema.statics.respondToFriendRequest = async function (
  friendshipId,
  userId,
  response
) {
  const friendship = await this.findById(friendshipId);

  if (!friendship) {
    throw new Error("Friend request not found");
  }

  if (friendship.recipient.toString() !== userId.toString()) {
    throw new Error("Unauthorized to respond to this friend request");
  }

  if (friendship.status !== "pending") {
    throw new Error("Friend request has already been responded to");
  }

  friendship.status = response; // 'accepted' or 'declined'
  friendship.respondedAt = new Date();

  await friendship.save();
  return friendship;
};

friendshipSchema.statics.getFriends = async function (userId) {
  const friendships = await this.find({
    $or: [
      { requester: userId, status: "accepted" },
      { recipient: userId, status: "accepted" },
    ],
  }).populate("requester recipient", "name email picture lastSeen");

  return friendships.map((friendship) => {
    const friend =
      friendship.requester._id.toString() === userId.toString()
        ? friendship.recipient
        : friendship.requester;

    return {
      id: friend._id,
      name: friend.name,
      email: friend.email,
      picture: friend.picture,
      lastSeen: friend.lastSeen,
      friendshipId: friendship._id,
      gamesPlayedTogether: friendship.gamesPlayedTogether,
      lastInteraction: friendship.lastInteraction,
      notes: friendship.notes,
    };
  });
};

friendshipSchema.statics.getPendingRequests = async function (userId) {
  return await this.find({
    recipient: userId,
    status: "pending",
  }).populate("requester", "name email picture");
};

friendshipSchema.statics.getSentRequests = async function (userId) {
  return await this.find({
    requester: userId,
    status: "pending",
  }).populate("recipient", "name email picture");
};

module.exports = mongoose.model("Friendship", friendshipSchema);
