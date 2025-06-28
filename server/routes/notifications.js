const express = require('express');
const { body, validationResult } = require('express-validator');
const Notification = require('../models/Notification');
const User = require('../models/User');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const { logger } = require('../utils/logger');

const router = express.Router();

// Get notifications for current user
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 20, type, read } = req.query;
    
    const query = { recipient: req.user.id };
    if (type) query.type = type;
    if (read !== undefined) query.isRead = read === 'true';
    
    const notifications = await Notification.find(query)
      .populate('sender', 'firstName lastName')
      .populate('relatedBook', 'title author')
      .populate('relatedBorrowing', 'book dueDate')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);
    
    const total = await Notification.countDocuments(query);
    const unreadCount = await Notification.countDocuments({
      recipient: req.user.id,
      isRead: false
    });
    
    res.json({
      notifications,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total,
      unreadCount
    });
  } catch (error) {
    logger.error('Error fetching notifications:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get notification by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id)
      .populate('sender', 'firstName lastName')
      .populate('relatedBook', 'title author')
      .populate('relatedBorrowing', 'book dueDate');
    
    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }
    
    // Check if user owns this notification
    if (notification.recipient.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    res.json(notification);
  } catch (error) {
    logger.error('Error fetching notification:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Mark notification as read
router.put('/:id/read', authenticateToken, async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);
    
    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }
    
    // Check if user owns this notification
    if (notification.recipient.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    notification.isRead = true;
    notification.readAt = new Date();
    await notification.save();
    
    res.json(notification);
  } catch (error) {
    logger.error('Error marking notification as read:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Mark all notifications as read
router.put('/read-all', authenticateToken, async (req, res) => {
  try {
    await Notification.updateMany(
      { recipient: req.user.id, isRead: false },
      { isRead: true, readAt: new Date() }
    );
    
    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    logger.error('Error marking all notifications as read:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete notification
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);
    
    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }
    
    // Check if user owns this notification
    if (notification.recipient.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    await Notification.findByIdAndDelete(req.params.id);
    
    res.json({ message: 'Notification deleted successfully' });
  } catch (error) {
    logger.error('Error deleting notification:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete all read notifications
router.delete('/read-all', authenticateToken, async (req, res) => {
  try {
    await Notification.deleteMany({
      recipient: req.user.id,
      isRead: true
    });
    
    res.json({ message: 'All read notifications deleted' });
  } catch (error) {
    logger.error('Error deleting read notifications:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create notification (Admin/Staff only)
router.post('/', [
  authenticateToken,
  authorizeRoles(['admin', 'staff']),
  body('recipientId').isMongoId(),
  body('type').isIn(['info', 'warning', 'success', 'error', 'reminder', 'overdue', 'fine']),
  body('title').trim().isLength({ min: 1, max: 200 }),
  body('message').trim().isLength({ min: 1, max: 1000 }),
  body('relatedBook').optional().isMongoId(),
  body('relatedBorrowing').optional().isMongoId()
], async (req, res) => {
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
      relatedBorrowing
    } = req.body;
    
    // Check if recipient exists
    const recipient = await User.findById(recipientId);
    if (!recipient) {
      return res.status(404).json({ message: 'Recipient not found' });
    }
    
    const notification = new Notification({
      recipient: recipientId,
      sender: req.user.id,
      type,
      title,
      message,
      relatedBook,
      relatedBorrowing,
      isRead: false
    });
    
    await notification.save();
    
    const populatedNotification = await Notification.findById(notification._id)
      .populate('sender', 'firstName lastName')
      .populate('recipient', 'firstName lastName email')
      .populate('relatedBook', 'title author')
      .populate('relatedBorrowing', 'book dueDate');
    
    res.status(201).json(populatedNotification);
  } catch (error) {
    logger.error('Error creating notification:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all notifications (Admin only)
router.get('/admin/all', [authenticateToken, authorizeRoles(['admin'])], async (req, res) => {
  try {
    const { page = 1, limit = 20, type, recipientId, read } = req.query;
    
    const query = {};
    if (type) query.type = type;
    if (recipientId) query.recipient = recipientId;
    if (read !== undefined) query.isRead = read === 'true';
    
    const notifications = await Notification.find(query)
      .populate('sender', 'firstName lastName')
      .populate('recipient', 'firstName lastName email')
      .populate('relatedBook', 'title author')
      .populate('relatedBorrowing', 'book dueDate')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);
    
    const total = await Notification.countDocuments(query);
    
    res.json({
      notifications,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    logger.error('Error fetching all notifications:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get notification statistics (Admin only)
router.get('/admin/statistics', [authenticateToken, authorizeRoles(['admin'])], async (req, res) => {
  try {
    const totalNotifications = await Notification.countDocuments();
    const unreadNotifications = await Notification.countDocuments({ isRead: false });
    const readNotifications = await Notification.countDocuments({ isRead: true });
    
    const notificationsByType = await Notification.aggregate([
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 }
        }
      }
    ]);
    
    const notificationsByDay = await Notification.aggregate([
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
            day: { $dayOfMonth: '$createdAt' }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': -1, '_id.month': -1, '_id.day': -1 } },
      { $limit: 30 }
    ]);
    
    res.json({
      totalNotifications,
      unreadNotifications,
      readNotifications,
      notificationsByType,
      notificationsByDay
    });
  } catch (error) {
    logger.error('Error fetching notification statistics:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update notification preferences (User)
router.put('/preferences', [
  authenticateToken,
  body('emailNotifications').optional().isBoolean(),
  body('pushNotifications').optional().isBoolean(),
  body('notificationTypes').optional().isArray()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    const { emailNotifications, pushNotifications, notificationTypes } = req.body;
    
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
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
    
    res.json({ message: 'Notification preferences updated successfully' });
  } catch (error) {
    logger.error('Error updating notification preferences:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router; 