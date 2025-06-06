const express = require("express");
const router = express.Router();
const Friendship = require("../models/Friendship");
const User = require("../models/User");
const { isAuthenticated: auth } = require("../middlewares/auth.middleware");

// Get user's friends list
router.get("/", auth, async (req, res) => {
  try {
    const { status = "accepted" } = req.query;

    const friendships = await Friendship.find({
      $or: [{ requester: req.user.id }, { recipient: req.user.id }],
      status: status,
    })
      .populate("requester", "username email lastActive isOnline")
      .populate("recipient", "username email lastActive isOnline")
      .sort({ updatedAt: -1 });

    // Format the response to show friend details
    const friends = friendships.map((friendship) => {
      const friend =
        friendship.requester._id.toString() === req.user.id
          ? friendship.recipient
          : friendship.requester;

      return {
        id: friendship._id,
        friend: friend,
        friendshipDate: friendship.updatedAt,
        status: friendship.status,
      };
    });

    res.json(friends);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get pending friend requests (received)
router.get("/requests/received", auth, async (req, res) => {
  try {
    const requests = await Friendship.find({
      recipient: req.user.id,
      status: "pending",
    })
      .populate("requester", "username email")
      .sort({ createdAt: -1 });

    res.json(requests);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get pending friend requests (sent)
router.get("/requests/sent", auth, async (req, res) => {
  try {
    const requests = await Friendship.find({
      requester: req.user.id,
      status: "pending",
    })
      .populate("recipient", "username email")
      .sort({ createdAt: -1 });

    res.json(requests);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Send friend request
router.post("/request", auth, async (req, res) => {
  try {
    const { friendId } = req.body;

    if (friendId === req.user.id) {
      return res
        .status(400)
        .json({ message: "Cannot send friend request to yourself" });
    }

    // Check if user exists
    const friend = await User.findById(friendId);
    if (!friend) {
      return res.status(404).json({ message: "User not found" });
    }

    // Check if friendship already exists
    const existingFriendship = await Friendship.findOne({
      $or: [
        { requester: req.user.id, recipient: friendId },
        { requester: friendId, recipient: req.user.id },
      ],
    });

    if (existingFriendship) {
      if (existingFriendship.status === "accepted") {
        return res.status(400).json({ message: "Already friends" });
      } else if (existingFriendship.status === "pending") {
        return res.status(400).json({ message: "Friend request already sent" });
      } else if (existingFriendship.status === "blocked") {
        return res.status(400).json({ message: "Cannot send friend request" });
      }
    }

    const friendship = new Friendship({
      requester: req.user.id,
      recipient: friendId,
      status: "pending",
    });

    await friendship.save();
    await friendship.populate("recipient", "username email");

    res.status(201).json({ message: "Friend request sent", friendship });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Send friend request by username
router.post("/request/username", auth, async (req, res) => {
  try {
    const { username } = req.body;

    const friend = await User.findOne({ username: username });
    if (!friend) {
      return res.status(404).json({ message: "User not found" });
    }

    if (friend._id.toString() === req.user.id) {
      return res
        .status(400)
        .json({ message: "Cannot send friend request to yourself" });
    }

    // Check if friendship already exists
    const existingFriendship = await Friendship.findOne({
      $or: [
        { requester: req.user.id, recipient: friend._id },
        { requester: friend._id, recipient: req.user.id },
      ],
    });

    if (existingFriendship) {
      if (existingFriendship.status === "accepted") {
        return res.status(400).json({ message: "Already friends" });
      } else if (existingFriendship.status === "pending") {
        return res.status(400).json({ message: "Friend request already sent" });
      } else if (existingFriendship.status === "blocked") {
        return res.status(400).json({ message: "Cannot send friend request" });
      }
    }

    const friendship = new Friendship({
      requester: req.user.id,
      recipient: friend._id,
      status: "pending",
    });

    await friendship.save();
    await friendship.populate("recipient", "username email");

    res.status(201).json({ message: "Friend request sent", friendship });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Accept friend request
router.post("/request/:requestId/accept", auth, async (req, res) => {
  try {
    const friendship = await Friendship.findOne({
      _id: req.params.requestId,
      recipient: req.user.id,
      status: "pending",
    });

    if (!friendship) {
      return res.status(404).json({ message: "Friend request not found" });
    }

    friendship.status = "accepted";
    await friendship.save();

    await friendship.populate("requester", "username email");

    res.json({ message: "Friend request accepted", friendship });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Decline friend request
router.post("/request/:requestId/decline", auth, async (req, res) => {
  try {
    const friendship = await Friendship.findOne({
      _id: req.params.requestId,
      recipient: req.user.id,
      status: "pending",
    });

    if (!friendship) {
      return res.status(404).json({ message: "Friend request not found" });
    }

    friendship.status = "declined";
    await friendship.save();

    res.json({ message: "Friend request declined" });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Remove friend
router.delete("/:friendshipId", auth, async (req, res) => {
  try {
    const friendship = await Friendship.findOne({
      _id: req.params.friendshipId,
      $or: [{ requester: req.user.id }, { recipient: req.user.id }],
      status: "accepted",
    });

    if (!friendship) {
      return res.status(404).json({ message: "Friendship not found" });
    }

    await Friendship.findByIdAndDelete(req.params.friendshipId);

    res.json({ message: "Friend removed successfully" });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Block user
router.post("/block", auth, async (req, res) => {
  try {
    const { userId } = req.body;

    if (userId === req.user.id) {
      return res.status(400).json({ message: "Cannot block yourself" });
    }

    // Find existing friendship
    let friendship = await Friendship.findOne({
      $or: [
        { requester: req.user.id, recipient: userId },
        { requester: userId, recipient: req.user.id },
      ],
    });

    if (friendship) {
      friendship.status = "blocked";
      friendship.blockedBy = req.user.id;
      await friendship.save();
    } else {
      // Create new blocked relationship
      friendship = new Friendship({
        requester: req.user.id,
        recipient: userId,
        status: "blocked",
        blockedBy: req.user.id,
      });
      await friendship.save();
    }

    res.json({ message: "User blocked successfully" });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Unblock user
router.post("/unblock", auth, async (req, res) => {
  try {
    const { userId } = req.body;

    const friendship = await Friendship.findOne({
      $or: [
        { requester: req.user.id, recipient: userId },
        { requester: userId, recipient: req.user.id },
      ],
      status: "blocked",
      blockedBy: req.user.id,
    });

    if (!friendship) {
      return res
        .status(404)
        .json({ message: "Blocked relationship not found" });
    }

    await Friendship.findByIdAndDelete(friendship._id);

    res.json({ message: "User unblocked successfully" });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Get blocked users
router.get("/blocked", auth, async (req, res) => {
  try {
    const blocked = await Friendship.find({
      blockedBy: req.user.id,
      status: "blocked",
    })
      .populate("requester", "username email")
      .populate("recipient", "username email")
      .sort({ updatedAt: -1 });

    const blockedUsers = blocked.map((friendship) => {
      const blockedUser =
        friendship.requester._id.toString() === req.user.id
          ? friendship.recipient
          : friendship.requester;

      return {
        id: friendship._id,
        user: blockedUser,
        blockedDate: friendship.updatedAt,
      };
    });

    res.json(blockedUsers);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Search users for friend requests
router.get("/search", auth, async (req, res) => {
  try {
    const { query, limit = 10 } = req.query;

    if (!query || query.length < 2) {
      return res
        .status(400)
        .json({ message: "Search query must be at least 2 characters" });
    }

    const users = await User.find({
      _id: { $ne: req.user.id }, // Exclude current user
      $or: [
        { username: { $regex: query, $options: "i" } },
        { email: { $regex: query, $options: "i" } },
      ],
    })
      .select("username email")
      .limit(parseInt(limit));

    // Get existing friendships to show current status
    const userIds = users.map((user) => user._id);
    const existingFriendships = await Friendship.find({
      $or: [
        { requester: req.user.id, recipient: { $in: userIds } },
        { requester: { $in: userIds }, recipient: req.user.id },
      ],
    });

    const usersWithStatus = users.map((user) => {
      const friendship = existingFriendships.find(
        (f) =>
          (f.requester.toString() === req.user.id &&
            f.recipient.toString() === user._id.toString()) ||
          (f.recipient.toString() === req.user.id &&
            f.requester.toString() === user._id.toString())
      );

      let status = "none";
      if (friendship) {
        if (friendship.status === "accepted") {
          status = "friends";
        } else if (friendship.status === "pending") {
          status =
            friendship.requester.toString() === req.user.id
              ? "sent"
              : "received";
        } else if (friendship.status === "blocked") {
          status = "blocked";
        }
      }

      return {
        ...user.toJSON(),
        friendshipStatus: status,
      };
    });

    res.json(usersWithStatus);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get online friends
router.get("/online", auth, async (req, res) => {
  try {
    const friendships = await Friendship.find({
      $or: [{ requester: req.user.id }, { recipient: req.user.id }],
      status: "accepted",
    })
      .populate("requester", "username isOnline lastActive")
      .populate("recipient", "username isOnline lastActive");

    const onlineFriends = friendships
      .map((friendship) => {
        const friend =
          friendship.requester._id.toString() === req.user.id
            ? friendship.recipient
            : friendship.requester;
        return friend;
      })
      .filter((friend) => friend.isOnline)
      .sort((a, b) => a.username.localeCompare(b.username));

    res.json(onlineFriends);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
