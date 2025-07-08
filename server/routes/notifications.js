const express = require("express");
const { body, validationResult } = require("express-validator");
const Notification = require("../models/Notification");
const User = require("../models/User");
const { authenticateToken, authorizeRoles } = require("../middleware/auth");
const { logger } = require("../utils/logger");
const mongoose = require("mongoose");

const router = express.Router();

// Get notifications for current user
router.get("/", authenticateToken, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      type,
      read,
      sentReceived = "received",
    } = req.query;

    let query = {};
    let notifications = [];
    let total = 0;
    let unreadCount = 0;

    // Robust ObjectId handling with detailed logging
    logger.info("Raw req.user.id:", req.user.id, "Type:", typeof req.user.id);

    let userId;
    if (typeof req.user.id === "string") {
      if (mongoose.isValidObjectId(req.user.id)) {
        userId = new mongoose.Types.ObjectId(req.user.id);
        logger.info("Converted string to ObjectId:", userId);
      } else {
        logger.error("Invalid ObjectId string:", req.user.id);
        return res.status(400).json({ message: "Invalid user ID format" });
      }
    } else if (req.user.id instanceof mongoose.Types.ObjectId) {
      userId = req.user.id;
      logger.info("Already an ObjectId:", userId);
    } else {
      logger.error(
        "Unexpected req.user.id type:",
        typeof req.user.id,
        "Value:",
        req.user.id
      );
      return res.status(400).json({ message: "Invalid user ID type" });
    }

    logger.info("Final userId:", userId, "Type:", typeof userId);

    if (sentReceived === "sent") {
      // Group sent notifications (group by content, not recipient)
      const groupedNotifications = await Notification.aggregate([
        { $match: { sender: userId } },
        {
          $group: {
            _id: {
              sender: "$sender",
              type: "$type",
              title: "$title",
              message: "$message",
              relatedBook: "$relatedBook",
              relatedBorrowing: "$relatedBorrowing",
            },
            createdAt: { $min: "$createdAt" },
            recipients: { $push: "$recipient" },
            recipientCount: { $sum: 1 },
            firstId: { $first: "$_id" },
          },
        },
        {
          $project: {
            _id: "$firstId",
            sender: "$_id.sender",
            type: "$_id.type",
            title: "$_id.title",
            message: "$_id.message",
            relatedBook: "$_id.relatedBook",
            relatedBorrowing: "$_id.relatedBorrowing",
            createdAt: 1,
            recipients: 1,
            recipientCount: 1,
          },
        },
        { $sort: { createdAt: -1 } },
        { $skip: (page - 1) * limit },
        { $limit: limit * 1 },
      ]);
      logger.info(
        "Raw aggregation result:",
        JSON.stringify(groupedNotifications, null, 2)
      );
      logger.info(
        "Final notifications returned for sent filter",
        groupedNotifications.map((n) => ({
          _id: n._id,
          recipients: n.recipients,
          recipientCount: n.recipientCount,
          title: n.title,
          sender: n.sender,
        }))
      );
      notifications = await Notification.populate(groupedNotifications, [
        { path: "sender", select: "firstName lastName role" },
        { path: "recipients", select: "firstName lastName role" },
        { path: "relatedBook", select: "title author" },
        { path: "relatedBorrowing", select: "book dueDate" },
      ]);
      logger.info(
        "Populated notifications:",
        JSON.stringify(notifications, null, 2)
      );
      total = notifications.length;
    } else if (sentReceived === "all") {
      // Get grouped sent notifications (group by content, not recipient)
      const sentAgg = await Notification.aggregate([
        { $match: { sender: userId } },
        {
          $group: {
            _id: {
              sender: "$sender",
              type: "$type",
              title: "$title",
              message: "$message",
              relatedBook: "$relatedBook",
              relatedBorrowing: "$relatedBorrowing",
            },
            createdAt: { $min: "$createdAt" },
            recipients: { $push: "$recipient" },
            recipientCount: { $sum: 1 },
            firstId: { $first: "$_id" },
          },
        },
        {
          $project: {
            _id: "$firstId",
            sender: "$_id.sender",
            type: "$_id.type",
            title: "$_id.title",
            message: "$_id.message",
            relatedBook: "$_id.relatedBook",
            relatedBorrowing: "$_id.relatedBorrowing",
            createdAt: 1,
            recipients: 1,
            recipientCount: 1,
          },
        },
      ]);
      logger.info(
        "Raw aggregation result (all):",
        JSON.stringify(sentAgg, null, 2)
      );
      logger.info(
        "Final notifications returned for all filter",
        sentAgg.map((n) => ({
          _id: n._id,
          recipients: n.recipients,
          recipientCount: n.recipientCount,
          title: n.title,
          sender: n.sender,
        }))
      );
      const sentGrouped = await Notification.populate(sentAgg, [
        { path: "sender", select: "firstName lastName role" },
        { path: "recipients", select: "firstName lastName role" },
        { path: "relatedBook", select: "title author" },
        { path: "relatedBorrowing", select: "book dueDate" },
      ]);
      // Get received notifications (where user is recipient and sender is not user)
      const received = await Notification.find({
        recipient: userId,
        sender: { $ne: userId },
      })
        .populate("sender", "firstName lastName role")
        .populate("recipient", "firstName lastName role")
        .populate("relatedBook", "title author")
        .populate("relatedBorrowing", "book dueDate");
      // Merge and sort
      notifications = [...sentGrouped, ...received].sort(
        (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
      );
      logger.info(
        "Populated notifications (all):",
        JSON.stringify(notifications, null, 2)
      );
      total = notifications.length;
    } else {
      // received
      query.recipient = userId;
      query.sender = { $ne: userId };
      if (type) query.type = type;
      if (read !== undefined) query.isRead = read === "true";
      notifications = await Notification.find(query)
        .populate("sender", "firstName lastName role")
        .populate("recipient", "firstName lastName role")
        .populate("relatedBook", "title author")
        .populate("relatedBorrowing", "book dueDate")
        .sort({ createdAt: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit);
      logger.info(
        "Notification sender:",
        notifications.map((n) => n.sender),
        "recipient:",
        notifications.map((n) => n.recipient)
      );
      total = await Notification.countDocuments(query);
    }

    unreadCount = await Notification.countDocuments({
      recipient: userId,
      isRead: false,
    });

    // Paginate after merging for 'all'
    if (sentReceived === "all") {
      notifications = notifications.slice((page - 1) * limit, page * limit);
    }

    logger.info("Final response notifications:", notifications.length);

    res.json({
      notifications,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total,
      unreadCount,
    });
  } catch (error) {
    logger.error("Error fetching notifications:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Get notification by ID
router.get("/:id", authenticateToken, async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id)
      .populate("sender", "firstName lastName role")
      .populate("relatedBook", "title author")
      .populate("relatedBorrowing", "book dueDate");

    if (!notification) {
      return res.status(404).json({ message: "Notification not found" });
    }

    // Check if user owns this notification
    if (notification.recipient.toString() !== req.user.id) {
      return res.status(403).json({ message: "Access denied" });
    }

    res.json(notification);
  } catch (error) {
    logger.error("Error fetching notification:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Mark notification as read
router.put("/:id/read", authenticateToken, async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);

    if (!notification) {
      return res.status(404).json({ message: "Notification not found" });
    }

    // Check if user owns this notification
    if (notification.recipient.toString() !== req.user.id) {
      return res.status(403).json({ message: "Access denied" });
    }

    notification.isRead = true;
    notification.readAt = new Date();
    await notification.save();

    res.json(notification);
  } catch (error) {
    logger.error("Error marking notification as read:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Mark all notifications as read
router.put("/read-all", authenticateToken, async (req, res) => {
  try {
    await Notification.updateMany(
      { recipient: req.user.id, isRead: false },
      { isRead: true, readAt: new Date() }
    );

    res.json({ message: "All notifications marked as read" });
  } catch (error) {
    logger.error("Error marking all notifications as read:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Delete notification
router.delete("/:id", authenticateToken, async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);

    if (!notification) {
      return res.status(404).json({ message: "Notification not found" });
    }

    // Check if user owns this notification
    if (notification.recipient.toString() !== req.user.id) {
      return res.status(403).json({ message: "Access denied" });
    }

    await Notification.findByIdAndDelete(req.params.id);

    res.json({ message: "Notification deleted successfully" });
  } catch (error) {
    logger.error("Error deleting notification:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Delete all read notifications
router.delete("/read-all", authenticateToken, async (req, res) => {
  try {
    await Notification.deleteMany({
      recipient: req.user.id,
      isRead: true,
    });

    res.json({ message: "All read notifications deleted" });
  } catch (error) {
    logger.error("Error deleting read notifications:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Create notification (Admin/Staff only)
router.post(
  "/",
  [
    authenticateToken,
    authorizeRoles("admin", "staff"),
    body("recipientId").isMongoId(),
    body("type").isIn([
      "info",
      "warning",
      "success",
      "error",
      "reminder",
      "overdue",
      "fine",
    ]),
    body("title").trim().isLength({ min: 1, max: 200 }),
    body("message").trim().isLength({ min: 1, max: 1000 }),
    body("relatedBook").optional().isMongoId(),
    body("relatedBorrowing").optional().isMongoId(),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const {
        recipientId,
        type,
        title,
        message,
        relatedBook,
        relatedBorrowing,
      } = req.body;

      // Check if recipient exists
      const recipient = await User.findById(recipientId);
      if (!recipient) {
        return res.status(404).json({ message: "Recipient not found" });
      }

      const notification = new Notification({
        recipient: recipientId,
        sender: req.user.id,
        type,
        title,
        message,
        relatedBook,
        relatedBorrowing,
        isRead: false,
      });

      await notification.save();

      const populatedNotification = await Notification.findById(
        notification._id
      )
        .populate("sender", "firstName lastName role")
        .populate("recipient", "firstName lastName email")
        .populate("relatedBook", "title author")
        .populate("relatedBorrowing", "book dueDate");

      res.status(201).json(populatedNotification);
    } catch (error) {
      logger.error("Error creating notification:", error);
      res.status(500).json({ message: "Server error" });
    }
  }
);

// Get all notifications (Admin only)
router.get(
  "/admin/all",
  [authenticateToken, authorizeRoles("admin")],
  async (req, res) => {
    try {
      const { page = 1, limit = 20, type, recipientId, read } = req.query;

      const query = {};
      if (type) query.type = type;
      if (recipientId) query.recipient = recipientId;
      if (read !== undefined) query.isRead = read === "true";

      const notifications = await Notification.find(query)
        .populate("sender", "firstName lastName role")
        .populate("recipient", "firstName lastName email")
        .populate("relatedBook", "title author")
        .populate("relatedBorrowing", "book dueDate")
        .sort({ createdAt: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit);

      const total = await Notification.countDocuments(query);

      res.json({
        notifications,
        totalPages: Math.ceil(total / limit),
        currentPage: page,
        total,
      });
    } catch (error) {
      logger.error("Error fetching all notifications:", error);
      res.status(500).json({ message: "Server error" });
    }
  }
);

// Get notification statistics (Admin only)
router.get(
  "/admin/statistics",
  [authenticateToken, authorizeRoles("admin")],
  async (req, res) => {
    try {
      const totalNotifications = await Notification.countDocuments();
      const unreadNotifications = await Notification.countDocuments({
        isRead: false,
      });
      const readNotifications = await Notification.countDocuments({
        isRead: true,
      });

      const notificationsByType = await Notification.aggregate([
        {
          $group: {
            _id: "$type",
            count: { $sum: 1 },
          },
        },
      ]);

      const notificationsByDay = await Notification.aggregate([
        {
          $group: {
            _id: {
              year: { $year: "$createdAt" },
              month: { $month: "$createdAt" },
              day: { $dayOfMonth: "$createdAt" },
            },
            count: { $sum: 1 },
          },
        },
        { $sort: { "_id.year": -1, "_id.month": -1, "_id.day": -1 } },
        { $limit: 30 },
      ]);

      res.json({
        totalNotifications,
        unreadNotifications,
        readNotifications,
        notificationsByType,
        notificationsByDay,
      });
    } catch (error) {
      logger.error("Error fetching notification statistics:", error);
      res.status(500).json({ message: "Server error" });
    }
  }
);

// Update notification preferences (User)
router.put(
  "/preferences",
  [
    authenticateToken,
    body("emailNotifications").optional().isBoolean(),
    body("pushNotifications").optional().isBoolean(),
    body("notificationTypes").optional().isArray(),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { emailNotifications, pushNotifications, notificationTypes } =
        req.body;

      const user = await User.findById(req.user.id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Update notification preferences
      if (emailNotifications !== undefined) {
        user.emailNotifications = emailNotifications;
      }
      if (pushNotifications !== undefined) {
        user.pushNotifications = pushNotifications;
      }
      if (notificationTypes) {
        user.notificationTypes = notificationTypes;
      }

      await user.save();

      res.json({ message: "Notification preferences updated successfully" });
    } catch (error) {
      logger.error("Error updating notification preferences:", error);
      res.status(500).json({ message: "Server error" });
    }
  }
);

// Broadcast notification to all admins (admin/staff/student only)
router.post(
  "/broadcast-admins",
  [
    authenticateToken,
    authorizeRoles("admin", "staff", "student"),
    body("type").isIn([
      "lend",
      "return",
      "reminder",
      "overdue",
      "fine",
      "system",
      "review",
    ]),
    body("title").trim().isLength({ min: 1, max: 200 }),
    body("message").trim().isLength({ min: 1, max: 1000 }),
    body("relatedBook").optional().isMongoId(),
    body("relatedBorrowing").optional().isMongoId(),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }
      const { type, title, message, relatedBook, relatedBorrowing } = req.body;
      // Find all admins
      const admins = await User.find({ role: "admin" }).select("_id");
      if (!admins.length) {
        return res.status(404).json({ message: "No admin users found" });
      }
      // Create notifications for each admin
      const notifications = await Promise.all(
        admins.map((admin) =>
          Notification.create({
            recipient: admin._id,
            sender: req.user.id,
            type,
            title,
            message,
            relatedBook,
            relatedBorrowing,
            isRead: false,
          })
        )
      );
      // Debug: Log all created notifications for admins
      logger.info(
        "Created notifications for admins:",
        notifications.map((n) => n._id)
      );
      // Do NOT create a notification for the sender themselves (student does not send to self)
      res.status(201).json({
        message: `Notification sent to ${notifications.length} admins.`,
      });
    } catch (error) {
      logger.error("Error broadcasting notification to admins:", error);
      res.status(500).json({ message: "Server error" });
    }
  }
);

// Admin broadcast to all, by role, by department, or specific users
router.post(
  "/admin/broadcast",
  [
    authenticateToken,
    authorizeRoles("admin"),
    body("type").isIn([
      "info",
      "warning",
      "success",
      "error",
      "reminder",
      "overdue",
      "fine",
      "system",
    ]),
    body("title").trim().isLength({ min: 1, max: 200 }),
    body("message").trim().isLength({ min: 1, max: 1000 }),
    body("recipients").isObject(),
    body("recipients.all").optional().isBoolean(),
    body("recipients.roles").optional().isArray(),
    body("recipients.departments").optional().isArray(),
    body("recipients.userIds").optional().isArray(),
    body("relatedBook").optional().isMongoId(),
    body("relatedBorrowing").optional().isMongoId(),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const {
        type,
        title,
        message,
        recipients,
        relatedBook,
        relatedBorrowing,
      } = req.body;

      let targetUsers = [];

      // Build query based on recipient criteria
      if (recipients.all) {
        // Send to all users
        targetUsers = await User.find({}).select("_id");
      } else {
        let query = {};

        // Filter by roles
        if (recipients.roles && recipients.roles.length > 0) {
          query.role = { $in: recipients.roles };
        }

        // Filter by departments
        if (recipients.departments && recipients.departments.length > 0) {
          query["academicCredentials.department"] = {
            $in: recipients.departments,
          };
        }

        // Get users based on query
        if (Object.keys(query).length > 0) {
          targetUsers = await User.find(query).select("_id");
        }

        // Add specific user IDs
        if (recipients.userIds && recipients.userIds.length > 0) {
          const specificUsers = await User.find({
            _id: { $in: recipients.userIds },
          }).select("_id");
          targetUsers = [...targetUsers, ...specificUsers];
        }
      }

      // Remove duplicates and force all to string
      let uniqueUserIds = targetUsers.map((u) => u._id.toString());
      uniqueUserIds = [...new Set(uniqueUserIds)];

      // Always include the sender (admin) as a recipient
      if (!uniqueUserIds.includes(req.user.id.toString())) {
        uniqueUserIds.push(req.user.id.toString());
      }

      logger.info("Admin broadcast uniqueUserIds:", uniqueUserIds);

      // Create notifications for each user
      const notifications = await Promise.all(
        uniqueUserIds.map((userId) =>
          Notification.create({
            recipient: userId,
            sender: req.user.id,
            type,
            title,
            message,
            relatedBook,
            relatedBorrowing,
            isRead: false,
          })
        )
      );

      logger.info(
        "Admin broadcast created notifications:",
        notifications.map((n) => ({
          _id: n._id,
          recipient: n.recipient,
          sender: n.sender,
        }))
      );

      // Debug: Log all created notifications
      logger.info(
        "Admin broadcast created notifications:",
        notifications.map((n) => n._id)
      );

      res.status(201).json({
        message: `Notification sent to ${notifications.length} users.`,
        count: notifications.length,
      });
    } catch (error) {
      logger.error("Error broadcasting notification:", error);
      res.status(500).json({ message: "Server error" });
    }
  }
);

// Admin delete all matching notifications (Delete for All)
router.delete(
  "/admin/delete-for-all",
  [authenticateToken, authorizeRoles("admin")],
  async (req, res) => {
    try {
      const { sender, type, title, message, relatedBook, relatedBorrowing } =
        req.body;
      if (!sender || !type || !title || !message) {
        return res.status(400).json({ message: "Missing required fields" });
      }
      const query = {
        sender,
        type,
        title,
        message,
        relatedBook: relatedBook || null,
        relatedBorrowing: relatedBorrowing || null,
      };
      const result = await Notification.deleteMany(query);
      res.json({
        message: `Deleted ${result.deletedCount} notifications for all users.`,
      });
    } catch (error) {
      logger.error("Error deleting notifications for all:", error);
      res.status(500).json({ message: "Server error" });
    }
  }
);

// Admin delete any notification
router.delete(
  "/admin/:id",
  [authenticateToken, authorizeRoles("admin")],
  async (req, res) => {
    try {
      const notification = await Notification.findById(req.params.id);

      if (!notification) {
        return res.status(404).json({ message: "Notification not found" });
      }

      await Notification.findByIdAndDelete(req.params.id);

      res.json({ message: "Notification deleted successfully" });
    } catch (error) {
      logger.error("Error deleting notification:", error);
      res.status(500).json({ message: "Server error" });
    }
  }
);

module.exports = router;
