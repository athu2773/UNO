const express = require("express");
const router = express.Router();
const Notification = require("../models/Notification");
const { isAuthenticated: auth } = require("../middlewares/auth.middleware");

// Get all notifications for a user
router.get("/", auth, async (req, res) => {
  try {
    const notifications = await Notification.find({ userId: req.user.id })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();
    res.json(Array.isArray(notifications) ? notifications : []);
  } catch (error) {
    res.status(500).json([]);
  }
});

// Get unread notification count
router.get("/count", auth, async (req, res) => {
  try {
    const count = await Notification.countDocuments({
      userId: req.user.id,
      read: false,
    });

    res.json({
      success: true,
      count,
    });
  } catch (error) {
    console.error("Error fetching notification count:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch notification count",
    });
  }
});

// Mark a notification as read
router.put("/:id/read", auth, async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      { read: true },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found",
      });
    }

    res.json({
      success: true,
      notification,
    });
  } catch (error) {
    console.error("Error marking notification as read:", error);
    res.status(500).json({
      success: false,
      message: "Failed to mark notification as read",
    });
  }
});

// Mark all notifications as read
router.put("/read-all", auth, async (req, res) => {
  try {
    await Notification.updateMany(
      { userId: req.user.id, read: false },
      { read: true }
    );

    res.json({
      success: true,
      message: "All notifications marked as read",
    });
  } catch (error) {
    console.error("Error marking all notifications as read:", error);
    res.status(500).json({
      success: false,
      message: "Failed to mark all notifications as read",
    });
  }
});

// Delete a notification
router.delete("/:id", auth, async (req, res) => {
  try {
    const notification = await Notification.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.id,
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found",
      });
    }

    res.json({
      success: true,
      message: "Notification deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting notification:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete notification",
    });
  }
});

// Create a new notification (internal API)
router.post("/", auth, async (req, res) => {
  try {
    const { userId, type, title, message, data, actionUrl, actionText } =
      req.body;

    const notification = new Notification({
      userId,
      type,
      title,
      message,
      data,
      actionUrl,
      actionText,
    });

    await notification.save();

    // Emit socket event for real-time notification
    const io = req.app.get("io");
    if (io) {
      io.to(`user_${userId}`).emit("newNotification", notification);
    }

    res.json({
      success: true,
      notification,
    });
  } catch (error) {
    console.error("Error creating notification:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create notification",
    });
  }
});

// Utility function to create notifications (can be used by other modules)
const createNotification = async (
  userId,
  type,
  title,
  message,
  data = {},
  actionUrl = null,
  actionText = null
) => {
  try {
    const notification = new Notification({
      userId,
      type,
      title,
      message,
      data,
      actionUrl,
      actionText,
    });

    await notification.save();
    return notification;
  } catch (error) {
    console.error("Error creating notification:", error);
    throw error;
  }
};

// Bulk create notifications
const createBulkNotifications = async (notifications) => {
  try {
    const result = await Notification.insertMany(notifications);
    return result;
  } catch (error) {
    console.error("Error creating bulk notifications:", error);
    throw error;
  }
};

module.exports = {
  router,
  createNotification,
  createBulkNotifications,
  Notification,
};
