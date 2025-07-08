const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    // Notification content
    type: {
      type: String,
      enum: [
        "lend",
        "return",
        "reminder",
        "overdue",
        "fine",
        "system",
        "review",
      ],
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000,
    },
    // Related entities
    relatedBook: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Book",
    },
    relatedBorrowing: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Borrowing",
    },
    relatedFine: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Fine",
    },
    // Delivery status
    isRead: {
      type: Boolean,
      default: false,
    },
    readAt: {
      type: Date,
    },
    isSent: {
      type: Boolean,
      default: false,
    },
    sentAt: {
      type: Date,
    },
    // Delivery methods
    sentVia: [
      {
        method: {
          type: String,
          enum: ["email", "sms", "push", "in_app"],
          required: true,
        },
        sentAt: {
          type: Date,
          default: Date.now,
        },
        status: {
          type: String,
          enum: ["pending", "sent", "failed", "delivered"],
          default: "pending",
        },
        errorMessage: String,
      },
    ],
    // Priority and scheduling
    priority: {
      type: String,
      enum: ["low", "medium", "high", "urgent"],
      default: "medium",
    },
    scheduledFor: {
      type: Date,
    },
    // Metadata
    metadata: {
      type: Map,
      of: String,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual for notification age
notificationSchema.virtual("age").get(function () {
  const now = new Date();
  const created = new Date(this.createdAt);
  const diffTime = now - created;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  return `${Math.floor(diffDays / 30)} months ago`;
});

// Indexes
notificationSchema.index({ recipient: 1, isRead: 1 });
notificationSchema.index({ recipient: 1, createdAt: -1 });
notificationSchema.index({ type: 1 });
notificationSchema.index({ isSent: 1 });
notificationSchema.index({ scheduledFor: 1 });
notificationSchema.index({ priority: 1 });

// Static method to get user notifications
notificationSchema.statics.getUserNotifications = async function (
  userId,
  filters = {}
) {
  const query = { recipient: userId };

  if (filters.isRead !== undefined) {
    query.isRead = filters.isRead;
  }

  if (filters.type) {
    query.type = filters.type;
  }

  return await this.find(query)
    .populate("relatedBook", "title author coverImage")
    .populate("relatedBorrowing", "book dueDate")
    .populate("relatedFine", "amount reason")
    .sort({ createdAt: -1 })
    .limit(filters.limit || 50);
};

// Static method to get unread notifications count
notificationSchema.statics.getUnreadCount = async function (userId) {
  return await this.countDocuments({ recipient: userId, isRead: false });
};

// Static method to get pending notifications
notificationSchema.statics.getPendingNotifications = async function () {
  const now = new Date();
  return await this.find({
    $or: [{ isSent: false }, { scheduledFor: { $lte: now } }],
  })
    .populate("recipient", "email firstName lastName")
    .populate("relatedBook", "title author")
    .populate("relatedBorrowing", "book dueDate")
    .sort({ priority: -1, createdAt: 1 });
};

// Instance method to mark as read
notificationSchema.methods.markAsRead = async function () {
  this.isRead = true;
  this.readAt = new Date();
  return await this.save();
};

// Instance method to mark as sent
notificationSchema.methods.markAsSent = async function (method = "email") {
  this.isSent = true;
  this.sentAt = new Date();

  // Update or add sentVia record
  const existingMethod = this.sentVia.find((v) => v.method === method);
  if (existingMethod) {
    existingMethod.sentAt = new Date();
    existingMethod.status = "sent";
  } else {
    this.sentVia.push({
      method,
      sentAt: new Date(),
      status: "sent",
    });
  }

  return await this.save();
};

// Instance method to mark delivery failed
notificationSchema.methods.markDeliveryFailed = async function (
  method,
  errorMessage
) {
  const existingMethod = this.sentVia.find((v) => v.method === method);
  if (existingMethod) {
    existingMethod.status = "failed";
    existingMethod.errorMessage = errorMessage;
  } else {
    this.sentVia.push({
      method,
      sentAt: new Date(),
      status: "failed",
      errorMessage,
    });
  }

  return await this.save();
};

// Static method to create notification
notificationSchema.statics.createNotification = async function (
  notificationData
) {
  const notification = new this({
    recipient: notificationData.recipientId,
    type: notificationData.type,
    title: notificationData.title,
    message: notificationData.message,
    relatedBook: notificationData.bookId,
    relatedBorrowing: notificationData.borrowingId,
    relatedFine: notificationData.fineId,
    priority: notificationData.priority || "medium",
    scheduledFor: notificationData.scheduledFor,
    metadata: notificationData.metadata,
  });

  return await notification.save();
};

module.exports = mongoose.model("Notification", notificationSchema);
