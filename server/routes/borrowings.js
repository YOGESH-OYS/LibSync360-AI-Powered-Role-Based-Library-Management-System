const express = require('express');
const { body, validationResult } = require('express-validator');
const { verifyToken, requireStaff, requireSelfOrAdmin } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const { logger } = require('../utils/logger');
const { sendBookLentNotification } = require('../services/emailService');

const Borrowing = require('../models/Borrowing');
const Book = require('../models/Book');
const User = require('../models/User');
const Fine = require('../models/Fine');
const Notification = require('../models/Notification');

const router = express.Router();

// @route   POST /api/borrowings/lend
// @desc    Lend a book to a student (Staff only)
// @access  Private (Staff/Admin)
router.post('/lend', verifyToken, requireStaff, [
  body('studentId', 'Student ID is required').notEmpty(),
  body('bookId', 'Book ID is required').notEmpty()
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array()
    });
  }

  const { studentId, bookId } = req.body;

  try {
    // Find student
    const student = await User.findOne({
      _id: studentId,
      role: 'student',
      isActive: true
    });

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found or inactive'
      });
    }

    // Find book
    const book = await Book.findById(bookId);
    if (!book || !book.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Book not found or inactive'
      });
    }

    // Check book availability
    if (book.availableCopies <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Book is not available for borrowing'
      });
    }

    // Check if student has unpaid fines
    const unpaidFines = await Fine.find({
      student: studentId,
      isPaid: false
    });

    if (unpaidFines.length > 0) {
      const totalUnpaid = unpaidFines.reduce((sum, fine) => sum + fine.amount, 0);
      return res.status(400).json({
        success: false,
        message: `Student has unpaid fines totaling ₹${totalUnpaid}. Please clear fines before borrowing.`
      });
    }

    // Check if student has reached borrowing limit (optional)
    const currentBorrowings = await Borrowing.countDocuments({
      student: studentId,
      status: { $in: ['borrowed', 'overdue'] }
    });

    const maxBorrowings = 5; // Configurable
    if (currentBorrowings >= maxBorrowings) {
      return res.status(400).json({
        success: false,
        message: `Student has reached the maximum borrowing limit of ${maxBorrowings} books`
      });
    }

    // Create borrowing record
    const borrowing = new Borrowing({
      student: studentId,
      book: bookId,
      staff: req.user.id
    });

    await borrowing.save();

    // Update book availability
    await book.updateAvailability(-1);

    // Update student statistics
    student.totalBooksBorrowed += 1;
    await student.save();

    // Send notification
    try {
      await sendBookLentNotification(borrowing);
      
      // Create in-app notification
      await Notification.createNotification({
        recipientId: studentId,
        type: 'lend',
        title: 'Book Successfully Borrowed',
        message: `You have successfully borrowed "${book.title}" by ${book.author}`,
        relatedBook: bookId,
        relatedBorrowing: borrowing._id,
        priority: 'low'
      });

      // Update borrowing notification record
      await borrowing.addNotification({
        type: 'lend',
        sentVia: 'email'
      });
    } catch (notificationError) {
      logger.error('Failed to send lending notification:', notificationError);
    }

    // Populate borrowing details for response
    await borrowing.populate([
      { path: 'student', select: 'firstName lastName email registrationNumber' },
      { path: 'book', select: 'title author isbn coverImage' },
      { path: 'staff', select: 'firstName lastName' }
    ]);

    logger.logBorrowingOperation('lend', borrowing._id, req.user.id, {
      studentId,
      bookId,
      dueDate: borrowing.dueDate
    });

    res.status(201).json({
      success: true,
      message: 'Book lent successfully',
      borrowing
    });
  } catch (error) {
    logger.error('Lend book error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
}));

// @route   POST /api/borrowings/return
// @desc    Return a borrowed book (Staff only)
// @access  Private (Staff/Admin)
router.post('/return/:borrowingId', verifyToken, requireStaff, [
  body('condition', 'Book condition is required').isIn(['excellent', 'good', 'fair', 'poor', 'damaged']),
  body('notes').optional().isLength({ max: 500 })
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array()
    });
  }

  const { borrowingId } = req.params;
  const { condition, notes } = req.body;

  try {
    // Find borrowing
    const borrowing = await Borrowing.findById(borrowingId)
      .populate('student', 'firstName lastName email')
      .populate('book', 'title author isbn')
      .populate('staff', 'firstName lastName');

    if (!borrowing) {
      return res.status(404).json({
        success: false,
        message: 'Borrowing record not found'
      });
    }

    if (borrowing.status === 'returned') {
      return res.status(400).json({
        success: false,
        message: 'Book has already been returned'
      });
    }

    // Return the book
    await borrowing.returnBook({
      staffId: req.user.id,
      condition,
      notes
    });

    // Update book availability
    const book = await Book.findById(borrowing.book._id);
    await book.updateAvailability(1);

    // Calculate and handle fines
    let fineAmount = 0;
    if (borrowing.fineAmount > 0) {
      fineAmount = borrowing.fineAmount;
      
      // Create fine record if not exists
      let fine = await Fine.findOne({ borrowing: borrowing._id });
      if (!fine) {
        fine = new Fine({
          student: borrowing.student._id,
          borrowing: borrowing._id,
          amount: fineAmount,
          reason: 'overdue'
        });
        await fine.save();
      }
    }

    // Send return notification
    try {
      await Notification.createNotification({
        recipientId: borrowing.student._id,
        type: 'return',
        title: 'Book Returned Successfully',
        message: `Your book "${borrowing.book.title}" has been returned successfully.${fineAmount > 0 ? ` Fine amount: ₹${fineAmount}` : ''}`,
        relatedBook: borrowing.book._id,
        relatedBorrowing: borrowing._id,
        priority: 'low'
      });
    } catch (notificationError) {
      logger.error('Failed to create return notification:', notificationError);
    }

    logger.logBorrowingOperation('return', borrowing._id, req.user.id, {
      condition,
      fineAmount
    });

    res.json({
      success: true,
      message: 'Book returned successfully',
      borrowing,
      fineAmount
    });
  } catch (error) {
    logger.error('Return book error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
}));

// @route   GET /api/borrowings/student/:studentId
// @desc    Get student's borrowing history
// @access  Private (Self/Admin/Staff)
router.get('/student/:studentId', verifyToken, requireSelfOrAdmin, asyncHandler(async (req, res) => {
  const { studentId } = req.params;
  const { status, limit = 50, page = 1 } = req.query;

  try {
    const query = { student: studentId };
    if (status) {
      query.status = status;
    }

    const skip = (page - 1) * limit;
    
    const borrowings = await Borrowing.find(query)
      .populate('book', 'title author isbn coverImage')
      .populate('staff', 'firstName lastName')
      .sort({ borrowedAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Borrowing.countDocuments(query);

    res.json({
      success: true,
      borrowings,
      pagination: {
        current: parseInt(page),
        total: Math.ceil(total / limit),
        hasNext: skip + borrowings.length < total,
        hasPrev: page > 1
      }
    });
  } catch (error) {
    logger.error('Get student borrowings error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
}));

// @route   GET /api/borrowings/current
// @desc    Get current user's borrowings
// @access  Private
router.get('/current', verifyToken, asyncHandler(async (req, res) => {
  try {
    const borrowings = await Borrowing.getStudentBorrowings(req.user.id, 'borrowed');
    
    res.json({
      success: true,
      borrowings
    });
  } catch (error) {
    logger.error('Get current borrowings error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
}));

// @route   GET /api/borrowings/overdue
// @desc    Get all overdue borrowings (Staff/Admin only)
// @access  Private (Staff/Admin)
router.get('/overdue', verifyToken, requireStaff, asyncHandler(async (req, res) => {
  try {
    const overdueBorrowings = await Borrowing.getOverdueBorrowings();
    
    res.json({
      success: true,
      borrowings: overdueBorrowings,
      count: overdueBorrowings.length
    });
  } catch (error) {
    logger.error('Get overdue borrowings error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
}));

// @route   GET /api/borrowings/due-soon
// @desc    Get borrowings due soon (Staff/Admin only)
// @access  Private (Staff/Admin)
router.get('/due-soon', verifyToken, requireStaff, asyncHandler(async (req, res) => {
  const { days = 2 } = req.query;

  try {
    const borrowingsDueSoon = await Borrowing.getBorrowingsDueSoon(parseInt(days));
    
    res.json({
      success: true,
      borrowings: borrowingsDueSoon,
      count: borrowingsDueSoon.length
    });
  } catch (error) {
    logger.error('Get borrowings due soon error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
}));

// @route   POST /api/borrowings/:borrowingId/extend
// @desc    Extend due date (Staff/Admin only)
// @access  Private (Staff/Admin)
router.post('/:borrowingId/extend', verifyToken, requireStaff, [
  body('newDueDate', 'New due date is required').isISO8601(),
  body('reason', 'Reason is required').notEmpty().isLength({ max: 200 })
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array()
    });
  }

  const { borrowingId } = req.params;
  const { newDueDate, reason } = req.body;

  try {
    const borrowing = await Borrowing.findById(borrowingId)
      .populate('student', 'firstName lastName email')
      .populate('book', 'title author');

    if (!borrowing) {
      return res.status(404).json({
        success: false,
        message: 'Borrowing record not found'
      });
    }

    if (borrowing.status === 'returned') {
      return res.status(400).json({
        success: false,
        message: 'Cannot extend returned book'
      });
    }

    await borrowing.extendDueDate({
      staffId: req.user.id,
      newDueDate: new Date(newDueDate),
      reason
    });

    // Send notification
    try {
      await Notification.createNotification({
        recipientId: borrowing.student._id,
        type: 'system',
        title: 'Due Date Extended',
        message: `Your due date for "${borrowing.book.title}" has been extended to ${new Date(newDueDate).toLocaleDateString()}`,
        relatedBook: borrowing.book._id,
        relatedBorrowing: borrowing._id,
        priority: 'medium'
      });
    } catch (notificationError) {
      logger.error('Failed to create extension notification:', notificationError);
    }

    logger.logBorrowingOperation('extend', borrowing._id, req.user.id, {
      newDueDate,
      reason
    });

    res.json({
      success: true,
      message: 'Due date extended successfully',
      borrowing
    });
  } catch (error) {
    logger.error('Extend due date error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
}));

// @route   POST /api/borrowings/:borrowingId/mark-lost
// @desc    Mark book as lost (Staff/Admin only)
// @access  Private (Staff/Admin)
router.post('/:borrowingId/mark-lost', verifyToken, requireStaff, [
  body('fineAmount', 'Fine amount is required').isNumeric().isFloat({ min: 0 }),
  body('notes').optional().isLength({ max: 500 })
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array()
    });
  }

  const { borrowingId } = req.params;
  const { fineAmount, notes } = req.body;

  try {
    const borrowing = await Borrowing.findById(borrowingId)
      .populate('student', 'firstName lastName email')
      .populate('book', 'title author');

    if (!borrowing) {
      return res.status(404).json({
        success: false,
        message: 'Borrowing record not found'
      });
    }

    if (borrowing.status === 'returned') {
      return res.status(400).json({
        success: false,
        message: 'Cannot mark returned book as lost'
      });
    }

    await borrowing.markAsLost({
      fineAmount: parseFloat(fineAmount),
      notes: notes || 'Book marked as lost'
    });

    // Create fine record
    const fine = new Fine({
      student: borrowing.student._id,
      borrowing: borrowing._id,
      amount: parseFloat(fineAmount),
      reason: 'loss'
    });
    await fine.save();

    // Send notification
    try {
      await Notification.createNotification({
        recipientId: borrowing.student._id,
        type: 'fine',
        title: 'Book Marked as Lost',
        message: `Your book "${borrowing.book.title}" has been marked as lost. Fine amount: ₹${fineAmount}`,
        relatedBook: borrowing.book._id,
        relatedBorrowing: borrowing._id,
        relatedFine: fine._id,
        priority: 'high'
      });
    } catch (notificationError) {
      logger.error('Failed to create lost book notification:', notificationError);
    }

    logger.logBorrowingOperation('mark_lost', borrowing._id, req.user.id, {
      fineAmount,
      notes
    });

    res.json({
      success: true,
      message: 'Book marked as lost successfully',
      borrowing,
      fine
    });
  } catch (error) {
    logger.error('Mark book as lost error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
}));

// @route   GET /api/borrowings/:borrowingId
// @desc    Get specific borrowing details
// @access  Private (Self/Admin/Staff)
router.get('/:borrowingId', verifyToken, asyncHandler(async (req, res) => {
  const { borrowingId } = req.params;

  try {
    const borrowing = await Borrowing.findById(borrowingId)
      .populate('student', 'firstName lastName email registrationNumber')
      .populate('book', 'title author isbn coverImage description')
      .populate('staff', 'firstName lastName')
      .populate('returnedTo', 'firstName lastName');

    if (!borrowing) {
      return res.status(404).json({
        success: false,
        message: 'Borrowing record not found'
      });
    }

    // Check access permission
    if (req.user.role !== 'admin' && req.user.role !== 'staff' && 
        borrowing.student._id.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    res.json({
      success: true,
      borrowing
    });
  } catch (error) {
    logger.error('Get borrowing details error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
}));

module.exports = router; 