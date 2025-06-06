const { createNotification } = require("../routes/notifications.routes");

const setupNotificationSockets = (io) => {
  io.on("connection", (socket) => {
    console.log("Client connected for notifications:", socket.id);

    // Join user-specific room for notifications
    socket.on("joinNotifications", (userId) => {
      socket.join(`user_${userId}`);
      console.log(`User ${userId} joined notification room`);
    });

    // Send notification to specific user
    socket.on("sendNotification", async (data) => {
      try {
        const {
          userId,
          type,
          title,
          message,
          notificationData,
          actionUrl,
          actionText,
        } = data;

        // Create notification in database
        const notification = await createNotification(
          userId,
          type,
          title,
          message,
          notificationData,
          actionUrl,
          actionText
        );

        // Send real-time notification
        io.to(`user_${userId}`).emit("newNotification", notification);
      } catch (error) {
        console.error("Error sending notification:", error);
      }
    });

    // Send bulk notifications
    socket.on("sendBulkNotifications", async (notifications) => {
      try {
        for (const notif of notifications) {
          const { userId, type, title, message, data, actionUrl, actionText } =
            notif;

          const notification = await createNotification(
            userId,
            type,
            title,
            message,
            data,
            actionUrl,
            actionText
          );

          io.to(`user_${userId}`).emit("newNotification", notification);
        }
      } catch (error) {
        console.error("Error sending bulk notifications:", error);
      }
    });

    // Mark notification as read (real-time update)
    socket.on("markNotificationRead", (data) => {
      const { userId, notificationId } = data;
      socket.to(`user_${userId}`).emit("notificationRead", { notificationId });
    });

    // Disconnect
    socket.on("disconnect", () => {
      console.log("Client disconnected from notifications:", socket.id);
    });
  });
};

// Helper functions to send notifications from other modules
const sendNotificationToUser = (
  io,
  userId,
  type,
  title,
  message,
  data = {},
  actionUrl = null,
  actionText = null
) => {
  createNotification(userId, type, title, message, data, actionUrl, actionText)
    .then((notification) => {
      io.to(`user_${userId}`).emit("newNotification", notification);
    })
    .catch((error) => {
      console.error("Error sending notification to user:", error);
    });
};

const sendNotificationToUsers = (
  io,
  userIds,
  type,
  title,
  message,
  data = {},
  actionUrl = null,
  actionText = null
) => {
  userIds.forEach((userId) => {
    sendNotificationToUser(
      io,
      userId,
      type,
      title,
      message,
      data,
      actionUrl,
      actionText
    );
  });
};

module.exports = {
  setupNotificationSockets,
  sendNotificationToUser,
  sendNotificationToUsers,
};
