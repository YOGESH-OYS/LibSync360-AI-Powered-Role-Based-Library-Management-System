const mongoose = require("mongoose");

const bookSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    author: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    isbn: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      match: [
        /^[0-9-]{10,17}$/,
        "Please enter a valid ISBN (10-13 digits with optional hyphens)",
      ],
    },
    publisher: {
      type: String,
      trim: true,
      maxlength: 100,
    },
    publicationYear: {
      type: Number,
      min: -1000,
      max: new Date().getFullYear(),
    },
    edition: {
      type: String,
      trim: true,
    },
    // Book details
    description: {
      type: String,
      trim: true,
      maxlength: 2000,
    },
    genre: [
      {
        type: String,
        trim: true,
        maxlength: 50,
      },
    ],
    subjects: [
      {
        type: String,
        trim: true,
        maxlength: 100,
      },
    ],
    language: {
      type: String,
      default: "English",
      trim: true,
    },
    pages: {
      type: Number,
      min: 1,
    },
    // Physical properties
    format: {
      type: String,
      enum: ["hardcover", "paperback", "ebook", "audiobook"],
      default: "paperback",
    },
    condition: {
      type: String,
      enum: ["excellent", "good", "fair", "poor"],
      default: "good",
    },
    // Location and availability
    location: {
      shelf: {
        type: String,
        trim: true,
      },
      row: {
        type: String,
        trim: true,
      },
      section: {
        type: String,
        trim: true,
      },
    },
    totalCopies: {
      type: Number,
      required: true,
      min: 1,
      default: 1,
    },
    availableCopies: {
      type: Number,
      required: true,
      min: 0,
      default: 1,
    },
    // Lending rules
    lendingPeriod: {
      type: Number,
      default: 60, // days
      min: 1,
      max: 365,
    },
    canBeReserved: {
      type: Boolean,
      default: true,
    },
    // AI and analytics
    aiEmbedding: {
      type: [Number], // Vector for semantic search
      sparse: true,
    },
    popularityScore: {
      type: Number,
      default: 0,
      min: 0,
    },
    averageRating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    totalRatings: {
      type: Number,
      default: 0,
      min: 0,
    },
    // Metadata
    tags: [
      {
        type: String,
        trim: true,
        maxlength: 50,
      },
    ],
    coverImage: {
      type: String,
      trim: true,
    },
    // Status
    isActive: {
      type: Boolean,
      default: true,
    },
    isReference: {
      type: Boolean,
      default: false,
    },
    // Timestamps
    addedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    lastUpdatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual for availability status
bookSchema.virtual("isAvailable").get(function () {
  return this.availableCopies > 0;
});

// Virtual for availability percentage
bookSchema.virtual("availabilityPercentage").get(function () {
  return this.totalCopies > 0
    ? (this.availableCopies / this.totalCopies) * 100
    : 0;
});

// Virtual for current borrowings
bookSchema.virtual("currentBorrowings", {
  ref: "Borrowing",
  localField: "_id",
  foreignField: "book",
  match: { returnedAt: null },
});

// Virtual for reviews
bookSchema.virtual("reviews", {
  ref: "Review",
  localField: "_id",
  foreignField: "book",
});

// Indexes
bookSchema.index({ title: "text", author: "text", description: "text" });
bookSchema.index({ genre: 1 });
bookSchema.index({ subjects: 1 });
bookSchema.index({ availableCopies: 1 });
bookSchema.index({ popularityScore: -1 });
bookSchema.index({ averageRating: -1 });
bookSchema.index({ isActive: 1 });

// Pre-save middleware to update availability
bookSchema.pre("save", function (next) {
  if (this.isModified("totalCopies") || this.isModified("availableCopies")) {
    if (this.availableCopies > this.totalCopies) {
      this.availableCopies = this.totalCopies;
    }
    if (this.availableCopies < 0) {
      this.availableCopies = 0;
    }
  }
  next();
});

// Static method to search books
bookSchema.statics.searchBooks = async function (query, filters = {}) {
  const searchQuery = { isActive: true };

  if (query) {
    // Use regex search for better compatibility
    searchQuery.$or = [
      { title: { $regex: query, $options: "i" } },
      { author: { $regex: query, $options: "i" } },
      { isbn: { $regex: query, $options: "i" } },
      { description: { $regex: query, $options: "i" } },
    ];
  }

  // Apply filters
  if (filters.genre) {
    searchQuery.genre = {
      $in: Array.isArray(filters.genre) ? filters.genre : [filters.genre],
    };
  }

  if (filters.subjects) {
    searchQuery.subjects = {
      $in: Array.isArray(filters.subjects)
        ? filters.subjects
        : [filters.subjects],
    };
  }

  if (filters.format) {
    searchQuery.format = filters.format;
  }

  if (filters.availableOnly) {
    searchQuery.availableCopies = { $gt: 0 };
  }

  if (filters.minRating) {
    searchQuery.averageRating = { $gte: filters.minRating };
  }

  return await this.find(searchQuery)
    .populate("addedBy", "firstName lastName")
    .sort({ popularityScore: -1, averageRating: -1 })
    .limit(filters.limit || 50);
};

// Static method to get popular books
bookSchema.statics.getPopularBooks = async function (limit = 10) {
  return await this.find({ isActive: true })
    .sort({ popularityScore: -1, averageRating: -1 })
    .limit(limit)
    .populate("addedBy", "firstName lastName");
};

// Static method to get recently added books
bookSchema.statics.getRecentBooks = async function (limit = 10) {
  return await this.find({ isActive: true })
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate("addedBy", "firstName lastName");
};

// Instance method to update availability
bookSchema.methods.updateAvailability = async function (change) {
  this.availableCopies = Math.max(
    0,
    Math.min(this.totalCopies, this.availableCopies + change)
  );
  return await this.save();
};

// Instance method to update rating
bookSchema.methods.updateRating = async function (newRating) {
  const totalRating = this.averageRating * this.totalRatings + newRating;
  this.totalRatings += 1;
  this.averageRating = totalRating / this.totalRatings;
  return await this.save();
};

// Instance method to update popularity score
bookSchema.methods.updatePopularityScore = async function () {
  // Calculate popularity based on borrowings, ratings, and recent activity
  const Borrowing = mongoose.model("Borrowing");
  const recentBorrowings = await Borrowing.countDocuments({
    book: this._id,
    borrowedAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }, // Last 30 days
  });

  this.popularityScore =
    recentBorrowings * 0.4 + this.averageRating * 0.3 + this.totalRatings * 0.3;
  return await this.save();
};

module.exports = mongoose.model("Book", bookSchema);
