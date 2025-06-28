const express = require('express');
const { body, validationResult } = require('express-validator');
const Fine = require('../models/Fine');
const Borrowing = require('../models/Borrowing');
const User = require('../models/User');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const { logger } = require('../utils/logger');
const { sendFineNotification } = require('../services/emailService');

const router = express.Router();

// Get all fines (Admin/Staff only)
router.get('/', [authenticateToken, authorizeRoles(['admin', 'staff'])], async (req, res) => {
  try {
    const { page = 1, limit = 10, status, studentId, search } = req.query;
    
    const query = {};
    if (status) query.status = status;
    if (studentId) query.student = studentId;
    if (search) {
      query.$or = [
        { 'student.firstName': { $regex: search, $options: 'i' } },
        { 'student.lastName': { $regex: search, $options: 'i' } },
        { 'student.registrationNumber': { $regex: search, $options: 'i' } }
      ];
    }
    
    const fines = await Fine.find(query)
      .populate('student', 'firstName lastName email registrationNumber')
      .populate('borrowing', 'book dueDate')
      .populate('book', 'title author isbn')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);
    
    const total = await Fine.countDocuments(query);
    
    res.json({
      fines,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    logger.error('Error fetching fines:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get fines for current user
router.get('/my-fines', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    
    const query = { student: req.user.id };
    if (status) query.status = status;
    
    const fines = await Fine.find(query)
      .populate('borrowing', 'book dueDate')
      .populate('book', 'title author isbn')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);
    
    const total = await Fine.countDocuments(query);
    
    res.json({
      fines,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    logger.error('Error fetching user fines:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get fine by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const fine = await Fine.findById(req.params.id)
      .populate('student', 'firstName lastName email registrationNumber')
      .populate('borrowing', 'book dueDate')
      .populate('book', 'title author isbn');
    
    if (!fine) {
      return res.status(404).json({ message: 'Fine not found' });
    }
    
    // Check if user has permission to view this fine
    if (req.user.role !== 'admin' && req.user.role !== 'staff' && 
        fine.student._id.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    res.json(fine);
  } catch (error) {
    logger.error('Error fetching fine:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create fine manually (Admin/Staff only)
router.post('/', [
  authenticateToken,
  authorizeRoles(['admin', 'staff']),
  body('studentId').isMongoId(),
  body('borrowingId').isMongoId(),
  body('amount').isFloat({ min: 0 }),
  body('reason').trim().isLength({ min: 1, max: 500 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    const { studentId, borrowingId, amount, reason } = req.body;
    
    // Check if borrowing exists and belongs to student
    const borrowing = await Borrowing.findById(borrowingId);
    if (!borrowing || borrowing.student.toString() !== studentId) {
      return res.status(400).json({ message: 'Invalid borrowing record' });
    }
    
    // Check if fine already exists for this borrowing
    const existingFine = await Fine.findOne({ borrowing: borrowingId });
    if (existingFine) {
      return res.status(400).json({ message: 'Fine already exists for this borrowing' });
    }
    
    const fine = new Fine({
      student: studentId,
      borrowing: borrowingId,
      book: borrowing.book,
      amount,
      reason,
      status: 'pending',
      createdBy: req.user.id
    });
    
    await fine.save();
    
    // Update user's total fines
    await User.findByIdAndUpdate(studentId, {
      $inc: { totalFinesPaid: amount }
    });
    
    // Send notification
    try {
      await sendFineNotification(fine);
    } catch (emailError) {
      logger.error('Error sending fine notification:', emailError);
    }
    
    const populatedFine = await Fine.findById(fine._id)
      .populate('student', 'firstName lastName email')
      .populate('borrowing', 'book dueDate')
      .populate('book', 'title author');
    
    res.status(201).json(populatedFine);
  } catch (error) {
    logger.error('Error creating fine:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update fine status (Admin/Staff only)
router.put('/:id/status', [
  authenticateToken,
  authorizeRoles(['admin', 'staff']),
  body('status').isIn(['pending', 'paid', 'waived', 'disputed']),
  body('notes').optional().trim().isLength({ max: 500 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    const { status, notes } = req.body;
    
    const fine = await Fine.findById(req.params.id);
    if (!fine) {
      return res.status(404).json({ message: 'Fine not found' });
    }
    
    fine.status = status;
    if (notes) fine.notes = notes;
    fine.updatedBy = req.user.id;
    fine.updatedAt = new Date();
    
    if (status === 'paid') {
      fine.paidAt = new Date();
      fine.paidBy = req.user.id;
    }
    
    await fine.save();
    
    const updatedFine = await Fine.findById(fine._id)
      .populate('student', 'firstName lastName email')
      .populate('borrowing', 'book dueDate')
      .populate('book', 'title author');
    
    res.json(updatedFine);
  } catch (error) {
    logger.error('Error updating fine status:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Pay fine (Student)
router.post('/:id/pay', [
  authenticateToken,
  body('paymentMethod').isIn(['cash', 'card', 'online']),
  body('transactionId').optional().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    const { paymentMethod, transactionId } = req.body;
    
    const fine = await Fine.findById(req.params.id);
    if (!fine) {
      return res.status(404).json({ message: 'Fine not found' });
    }
    
    // Check if user owns this fine
    if (fine.student.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    if (fine.status === 'paid') {
      return res.status(400).json({ message: 'Fine is already paid' });
    }
    
    fine.status = 'paid';
    fine.paidAt = new Date();
    fine.paymentMethod = paymentMethod;
    if (transactionId) fine.transactionId = transactionId;
    fine.paidBy = req.user.id;
    
    await fine.save();
    
    // Update user's total fines paid
    await User.findByIdAndUpdate(req.user.id, {
      $inc: { totalFinesPaid: fine.amount }
    });
    
    const updatedFine = await Fine.findById(fine._id)
      .populate('borrowing', 'book dueDate')
      .populate('book', 'title author');
    
    res.json(updatedFine);
  } catch (error) {
    logger.error('Error paying fine:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Dispute fine (Student)
router.post('/:id/dispute', [
  authenticateToken,
  body('reason').trim().isLength({ min: 10, max: 1000 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    const { reason } = req.body;
    
    const fine = await Fine.findById(req.params.id);
    if (!fine) {
      return res.status(404).json({ message: 'Fine not found' });
    }
    
    // Check if user owns this fine
    if (fine.student.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    if (fine.status === 'paid') {
      return res.status(400).json({ message: 'Cannot dispute a paid fine' });
    }
    
    fine.status = 'disputed';
    fine.disputeReason = reason;
    fine.disputedAt = new Date();
    fine.disputedBy = req.user.id;
    
    await fine.save();
    
    const updatedFine = await Fine.findById(fine._id)
      .populate('borrowing', 'book dueDate')
      .populate('book', 'title author');
    
    res.json(updatedFine);
  } catch (error) {
    logger.error('Error disputing fine:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get fine statistics (Admin only)
router.get('/statistics/overview', [authenticateToken, authorizeRoles(['admin'])], async (req, res) => {
  try {
    const totalFines = await Fine.countDocuments();
    const pendingFines = await Fine.countDocuments({ status: 'pending' });
    const paidFines = await Fine.countDocuments({ status: 'paid' });
    const waivedFines = await Fine.countDocuments({ status: 'waived' });
    const disputedFines = await Fine.countDocuments({ status: 'disputed' });
    
    const totalAmount = await Fine.aggregate([
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    
    const paidAmount = await Fine.aggregate([
      { $match: { status: 'paid' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    
    const monthlyStats = await Fine.aggregate([
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' }
        }
      },
      { $sort: { '_id.year': -1, '_id.month': -1 } },
      { $limit: 12 }
    ]);
    
    res.json({
      totalFines,
      pendingFines,
      paidFines,
      waivedFines,
      disputedFines,
      totalAmount: totalAmount[0]?.total || 0,
      paidAmount: paidAmount[0]?.total || 0,
      monthlyStats
    });
  } catch (error) {
    logger.error('Error fetching fine statistics:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router; 