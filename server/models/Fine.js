const mongoose = require('mongoose');

const fineSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  borrowing: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Borrowing',
    required: true
  },
  // Fine details
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  reason: {
    type: String,
    enum: ['overdue', 'damage', 'loss', 'other'],
    required: true
  },
  description: {
    type: String,
    trim: true,
    maxlength: 500
  },
  // Payment details
  isPaid: {
    type: Boolean,
    default: false
  },
  paidAmount: {
    type: Number,
    default: 0,
    min: 0
  },
  paidAt: {
    type: Date
  },
  paidTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  paymentMethod: {
    type: String,
    enum: ['cash', 'card', 'online', 'other'],
    default: 'cash'
  },
  // Status
  status: {
    type: String,
    enum: ['pending', 'paid', 'waived', 'disputed'],
    default: 'pending'
  },
  // Waiver details
  waivedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  waivedAt: {
    type: Date
  },
  waiverReason: {
    type: String,
    trim: true,
    maxlength: 200
  },
  // Dispute details
  disputedAt: {
    type: Date
  },
  disputeReason: {
    type: String,
    trim: true,
    maxlength: 500
  },
  disputeResolvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  disputeResolvedAt: {
    type: Date
  },
  // Notifications
  notificationsSent: [{
    type: {
      type: String,
      enum: ['created', 'reminder', 'paid', 'waived'],
      required: true
    },
    sentAt: {
      type: Date,
      default: Date.now
    },
    sentVia: {
      type: String,
      enum: ['email', 'sms', 'push'],
      default: 'email'
    }
  }]
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for outstanding amount
fineSchema.virtual('outstandingAmount').get(function() {
  return this.amount - this.paidAmount;
});

// Virtual for is fully paid
fineSchema.virtual('isFullyPaid').get(function() {
  return this.paidAmount >= this.amount;
});

// Indexes
fineSchema.index({ student: 1, status: 1 });
fineSchema.index({ borrowing: 1 });
fineSchema.index({ isPaid: 1 });
fineSchema.index({ status: 1 });
fineSchema.index({ createdAt: -1 });

// Static method to get student fines
fineSchema.statics.getStudentFines = async function(studentId, status = null) {
  const query = { student: studentId };
  if (status) {
    query.status = status;
  }
  
  return await this.find(query)
    .populate('borrowing', 'book dueDate returnedAt')
    .populate('paidTo', 'firstName lastName')
    .populate('waivedBy', 'firstName lastName')
    .sort({ createdAt: -1 });
};

// Static method to get unpaid fines
fineSchema.statics.getUnpaidFines = async function() {
  return await this.find({
    $or: [
      { isPaid: false },
      { status: 'pending' }
    ]
  }).populate('student', 'firstName lastName email registrationNumber')
    .populate('borrowing', 'book dueDate')
    .sort({ createdAt: -1 });
};

// Static method to get fines by date range
fineSchema.statics.getFinesByDateRange = async function(startDate, endDate) {
  return await this.find({
    createdAt: {
      $gte: startDate,
      $lte: endDate
    }
  }).populate('student', 'firstName lastName')
    .populate('borrowing', 'book')
    .sort({ createdAt: -1 });
};

// Instance method to pay fine
fineSchema.methods.payFine = async function(paymentData) {
  this.paidAmount = (this.paidAmount || 0) + paymentData.amount;
  this.paidAt = new Date();
  this.paidTo = paymentData.staffId;
  this.paymentMethod = paymentData.method || 'cash';
  
  if (this.paidAmount >= this.amount) {
    this.isPaid = true;
    this.status = 'paid';
  }
  
  return await this.save();
};

// Instance method to waive fine
fineSchema.methods.waiveFine = async function(waiverData) {
  this.status = 'waived';
  this.waivedBy = waiverData.staffId;
  this.waivedAt = new Date();
  this.waiverReason = waiverData.reason;
  
  return await this.save();
};

// Instance method to dispute fine
fineSchema.methods.disputeFine = async function(disputeData) {
  this.status = 'disputed';
  this.disputedAt = new Date();
  this.disputeReason = disputeData.reason;
  
  return await this.save();
};

// Instance method to resolve dispute
fineSchema.methods.resolveDispute = async function(resolutionData) {
  this.disputeResolvedBy = resolutionData.staffId;
  this.disputeResolvedAt = new Date();
  this.status = resolutionData.status; // 'paid', 'waived', or 'pending'
  
  if (resolutionData.amount) {
    this.amount = resolutionData.amount;
  }
  
  return await this.save();
};

// Instance method to add notification record
fineSchema.methods.addNotification = async function(notificationData) {
  this.notificationsSent.push({
    type: notificationData.type,
    sentAt: new Date(),
    sentVia: notificationData.sentVia || 'email'
  });
  
  return await this.save();
};

module.exports = mongoose.model('Fine', fineSchema); 