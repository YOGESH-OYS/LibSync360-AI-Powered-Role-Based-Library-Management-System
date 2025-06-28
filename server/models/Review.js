const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  book: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Book',
    required: true
  },
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  // Review content
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  title: {
    type: String,
    trim: true,
    maxlength: 100
  },
  content: {
    type: String,
    trim: true,
    maxlength: 1000
  },
  // AI analysis
  sentimentScore: {
    type: Number,
    min: -1,
    max: 1
  },
  sentimentLabel: {
    type: String,
    enum: ['positive', 'neutral', 'negative']
  },
  aiAnalysis: {
    keywords: [String],
    topics: [String],
    summary: String
  },
  // Metadata
  helpfulVotes: {
    type: Number,
    default: 0,
    min: 0
  },
  totalVotes: {
    type: Number,
    default: 0,
    min: 0
  },
  // Status
  isApproved: {
    type: Boolean,
    default: true
  },
  isAnonymous: {
    type: Boolean,
    default: false
  },
  // Moderation
  moderatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  moderatedAt: {
    type: Date
  },
  moderationNotes: {
    type: String,
    trim: true,
    maxlength: 500
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for helpful percentage
reviewSchema.virtual('helpfulPercentage').get(function() {
  return this.totalVotes > 0 ? (this.helpfulVotes / this.totalVotes) * 100 : 0;
});

// Indexes
reviewSchema.index({ book: 1, createdAt: -1 });
reviewSchema.index({ student: 1, createdAt: -1 });
reviewSchema.index({ rating: 1 });
reviewSchema.index({ sentimentScore: 1 });
reviewSchema.index({ isApproved: 1 });

// Compound index for unique student-book review
reviewSchema.index({ book: 1, student: 1 }, { unique: true });

// Static method to get book reviews
reviewSchema.statics.getBookReviews = async function(bookId, filters = {}) {
  const query = { book: bookId, isApproved: true };
  
  if (filters.rating) {
    query.rating = filters.rating;
  }
  
  if (filters.sentiment) {
    query.sentimentLabel = filters.sentiment;
  }
  
  return await this.find(query)
    .populate('student', 'firstName lastName')
    .sort({ createdAt: -1 })
    .limit(filters.limit || 50);
};

// Static method to get student reviews
reviewSchema.statics.getStudentReviews = async function(studentId) {
  return await this.find({ student: studentId })
    .populate('book', 'title author coverImage')
    .sort({ createdAt: -1 });
};

// Static method to get reviews by sentiment
reviewSchema.statics.getReviewsBySentiment = async function(sentiment, limit = 10) {
  return await this.find({ 
    sentimentLabel: sentiment, 
    isApproved: true 
  })
    .populate('book', 'title author coverImage')
    .populate('student', 'firstName lastName')
    .sort({ createdAt: -1 })
    .limit(limit);
};

// Instance method to vote helpful
reviewSchema.methods.voteHelpful = async function(isHelpful) {
  this.totalVotes += 1;
  if (isHelpful) {
    this.helpfulVotes += 1;
  }
  return await this.save();
};

// Instance method to update sentiment analysis
reviewSchema.methods.updateSentimentAnalysis = async function(analysisData) {
  this.sentimentScore = analysisData.sentimentScore;
  this.sentimentLabel = analysisData.sentimentLabel;
  this.aiAnalysis = analysisData.aiAnalysis;
  return await this.save();
};

// Instance method to moderate review
reviewSchema.methods.moderateReview = async function(moderationData) {
  this.isApproved = moderationData.isApproved;
  this.moderatedBy = moderationData.moderatedBy;
  this.moderatedAt = new Date();
  this.moderationNotes = moderationData.notes;
  return await this.save();
};

module.exports = mongoose.model('Review', reviewSchema); 