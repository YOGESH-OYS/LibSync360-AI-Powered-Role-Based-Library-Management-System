const mongoose = require('mongoose');

const borrowingSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  book: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Book',
    required: true
  },
  staff: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  // Lending details
  borrowedAt: {
    type: Date,
    default: Date.now,
    required: true
  },
  dueDate: {
    type: Date,
    required: true
  },
  returnedAt: {
    type: Date
  },
  // Return details
  returnedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  returnCondition: {
    type: String,
    enum: ['excellent', 'good', 'fair', 'poor', 'damaged'],
    default: 'good'
  },
  returnNotes: {
    type: String,
    trim: true,
    maxlength: 500
  },
  // Fine tracking
  fineAmount: {
    type: Number,
    default: 0,
    min: 0
  },
  finePaid: {
    type: Boolean,
    default: false
  },
  finePaidAt: {
    type: Date
  },
  // Status
  status: {
    type: String,
    enum: ['borrowed', 'returned', 'overdue', 'lost'],
    default: 'borrowed'
  },
  // Extensions
  extensions: [{
    extendedAt: {
      type: Date,
      default: Date.now
    },
    extendedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    newDueDate: {
      type: Date,
      required: true
    },
    reason: {
      type: String,
      trim: true,
      maxlength: 200
    }
  }],
  // Notifications
  notificationsSent: [{
    type: {
      type: String,
      enum: ['lend', 'reminder', 'overdue', 'fine'],
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

// Virtual for days overdue
borrowingSchema.virtual('daysOverdue').get(function() {
  if (this.returnedAt || this.status === 'returned') {
    return 0;
  }
  const now = new Date();
  const due = new Date(this.dueDate);
  const diffTime = now - due;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays);
});

// Virtual for is overdue
borrowingSchema.virtual('isOverdue').get(function() {
  return this.daysOverdue > 0;
});

// Virtual for calculated fine
borrowingSchema.virtual('calculatedFine').get(function() {
  if (this.returnedAt || this.status === 'returned') {
    return this.fineAmount;
  }
  const dailyFine = parseInt(process.env.DAILY_FINE_AMOUNT) || 5;
  return this.daysOverdue * dailyFine;
});

// Indexes
borrowingSchema.index({ student: 1, status: 1 });
borrowingSchema.index({ book: 1, status: 1 });
borrowingSchema.index({ dueDate: 1 });
borrowingSchema.index({ status: 1, dueDate: 1 });
borrowingSchema.index({ borrowedAt: -1 });

// Pre-save middleware to calculate due date
borrowingSchema.pre('save', function(next) {
  if (this.isNew && !this.dueDate) {
    const lendingPeriod = parseInt(process.env.LENDING_PERIOD_DAYS) || 60;
    this.dueDate = new Date(Date.now() + lendingPeriod * 24 * 60 * 60 * 1000);
  }
  next();
});

// Static method to get overdue borrowings
borrowingSchema.statics.getOverdueBorrowings = async function() {
  const now = new Date();
  return await this.find({
    dueDate: { $lt: now },
    returnedAt: null,
    status: { $ne: 'returned' }
  }).populate('student', 'firstName lastName email registrationNumber')
    .populate('book', 'title author isbn')
    .populate('staff', 'firstName lastName');
};

// Static method to get borrowings due soon
borrowingSchema.statics.getBorrowingsDueSoon = async function(days = 2) {
  const now = new Date();
  const dueDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
  
  return await this.find({
    dueDate: { $gte: now, $lte: dueDate },
    returnedAt: null,
    status: { $ne: 'returned' }
  }).populate('student', 'firstName lastName email registrationNumber')
    .populate('book', 'title author isbn')
    .populate('staff', 'firstName lastName');
};

// Static method to get student borrowings
borrowingSchema.statics.getStudentBorrowings = async function(studentId, status = null) {
  const query = { student: studentId };
  if (status) {
    query.status = status;
  }
  
  return await this.find(query)
    .populate('book', 'title author isbn coverImage')
    .populate('staff', 'firstName lastName')
    .sort({ borrowedAt: -1 });
};

// Instance method to return book
borrowingSchema.methods.returnBook = async function(returnData) {
  this.returnedAt = new Date();
  this.returnedTo = returnData.staffId;
  this.returnCondition = returnData.condition || 'good';
  this.returnNotes = returnData.notes;
  this.status = 'returned';
  
  // Calculate final fine
  this.fineAmount = this.calculatedFine;
  
  return await this.save();
};

// Instance method to extend due date
borrowingSchema.methods.extendDueDate = async function(extensionData) {
  const extension = {
    extendedAt: new Date(),
    extendedBy: extensionData.staffId,
    newDueDate: extensionData.newDueDate,
    reason: extensionData.reason
  };
  
  this.extensions.push(extension);
  this.dueDate = extensionData.newDueDate;
  
  return await this.save();
};

// Instance method to mark as lost
borrowingSchema.methods.markAsLost = async function(lostData) {
  this.status = 'lost';
  this.returnNotes = lostData.notes || 'Book marked as lost';
  this.fineAmount = lostData.fineAmount || 0;
  
  return await this.save();
};

// Instance method to pay fine
borrowingSchema.methods.payFine = async function(paymentData) {
  this.finePaid = true;
  this.finePaidAt = new Date();
  this.fineAmount = paymentData.amount || this.fineAmount;
  
  return await this.save();
};

// Instance method to add notification record
borrowingSchema.methods.addNotification = async function(notificationData) {
  this.notificationsSent.push({
    type: notificationData.type,
    sentAt: new Date(),
    sentVia: notificationData.sentVia || 'email'
  });
  
  return await this.save();
};

module.exports = mongoose.model('Borrowing', borrowingSchema); 