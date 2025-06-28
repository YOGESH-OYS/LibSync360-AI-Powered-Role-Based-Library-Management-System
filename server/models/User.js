const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 3,
    maxlength: 50
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  role: {
    type: String,
    enum: ['admin', 'staff', 'student'],
    default: 'student',
    required: true
  },
  // Student-specific fields
  registrationNumber: {
    type: String,
    unique: true,
    sparse: true,
    trim: true
  },
  rollNumber: {
    type: String,
    trim: true
  },
  academicCredentials: {
    department: {
      type: String,
      trim: true
    },
    year: {
      type: Number,
      min: 1,
      max: 5
    },
    semester: {
      type: Number,
      min: 1,
      max: 10
    },
    cgpa: {
      type: Number,
      min: 0,
      max: 10
    }
  },
  // Profile information
  firstName: {
    type: String,
    required: true,
    trim: true,
    maxlength: 50
  },
  lastName: {
    type: String,
    required: true,
    trim: true,
    maxlength: 50
  },
  phone: {
    type: String,
    trim: true,
    match: [/^[0-9+\-\s()]+$/, 'Please enter a valid phone number']
  },
  address: {
    street: String,
    city: String,
    state: String,
    zipCode: String,
    country: String
  },
  // Account status
  isActive: {
    type: Boolean,
    default: true
  },
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  // Statistics
  totalBooksBorrowed: {
    type: Number,
    default: 0
  },
  totalFinesPaid: {
    type: Number,
    default: 0
  },
  // Timestamps
  lastLogin: {
    type: Date
  },
  passwordChangedAt: {
    type: Date
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for full name
userSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

// Virtual for current borrowings count
userSchema.virtual('currentBorrowingsCount', {
  ref: 'Borrowing',
  localField: '_id',
  foreignField: 'student',
  count: true,
  match: { returnedAt: null }
});

// Virtual for unpaid fines
userSchema.virtual('unpaidFines', {
  ref: 'Fine',
  localField: '_id',
  foreignField: 'student',
  match: { isPaid: false }
});

// Indexes - only add indexes that aren't already created by unique: true
userSchema.index({ role: 1 });
userSchema.index({ isActive: 1 });
userSchema.index({ 'academicCredentials.department': 1 });

// Pre-save middleware to hash password
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    this.passwordChangedAt = Date.now() - 1000; // Ensure token is created after password change
    next();
  } catch (error) {
    next(error);
  }
});

// Instance method to check password
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Instance method to check if password was changed after token was issued
userSchema.methods.changedPasswordAfter = function(JWTTimestamp) {
  if (this.passwordChangedAt) {
    const changedTimestamp = parseInt(this.passwordChangedAt.getTime() / 1000, 10);
    return JWTTimestamp < changedTimestamp;
  }
  return false;
};

// Static method to create admin user
userSchema.statics.createAdmin = async function(adminData) {
  const admin = new this({
    ...adminData,
    role: 'admin',
    isEmailVerified: true,
    isActive: true
  });
  return await admin.save();
};

// Static method to create staff user
userSchema.statics.createStaff = async function(staffData) {
  const staff = new this({
    ...staffData,
    role: 'staff',
    isEmailVerified: true,
    isActive: true
  });
  return await staff.save();
};

// Static method to create student user
userSchema.statics.createStudent = async function(studentData) {
  const student = new this({
    ...studentData,
    role: 'student',
    isActive: true
  });
  return await student.save();
};

// Method to get user statistics
userSchema.methods.getStatistics = async function() {
  await this.populate('currentBorrowingsCount');
  await this.populate('unpaidFines');
  
  return {
    totalBooksBorrowed: this.totalBooksBorrowed,
    currentBorrowings: this.currentBorrowingsCount,
    totalFinesPaid: this.totalFinesPaid,
    unpaidFines: this.unpaidFines.length
  };
};

module.exports = mongoose.model('User', userSchema); 