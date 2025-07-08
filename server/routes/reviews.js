const express = require("express");
const { body, validationResult } = require("express-validator");
const Review = require("../models/Review");
const Book = require("../models/Book");
const User = require("../models/User");
const { authenticateToken, authorizeRoles } = require("../middleware/auth");
const { logger } = require("../utils/logger");
const { analyzeSentiment } = require("../services/aiService");

const router = express.Router();

// Get reviews for a book
router.get("/book/:bookId", async (req, res) => {
  try {
    const { page = 1, limit = 10, rating, sort = "newest" } = req.query;

    const query = { book: req.params.bookId, isActive: true };
    if (rating) query.rating = parseInt(rating);

    let sortOption = {};
    switch (sort) {
      case "newest":
        sortOption = { createdAt: -1 };
        break;
      case "oldest":
        sortOption = { createdAt: 1 };
        break;
      case "highest":
        sortOption = { rating: -1 };
        break;
      case "lowest":
        sortOption = { rating: 1 };
        break;
      case "helpful":
        sortOption = { helpfulCount: -1 };
        break;
      default:
        sortOption = { createdAt: -1 };
    }

    const reviews = await Review.find(query)
      .populate("user", "firstName lastName")
      .sort(sortOption)
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Review.countDocuments(query);

    // Get rating distribution
    const ratingDistribution = await Review.aggregate([
      { $match: { book: req.params.bookId, isActive: true } },
      {
        $group: {
          _id: "$rating",
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: -1 } },
    ]);

    res.json({
      reviews,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total,
      ratingDistribution,
    });
  } catch (error) {
    logger.error("Error fetching book reviews:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Get user's reviews
router.get("/my-reviews", authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;

    const reviews = await Review.find({ user: req.user.id })
      .populate("book", "title author isbn coverImage")
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Review.countDocuments({ user: req.user.id });

    res.json({
      reviews,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total,
    });
  } catch (error) {
    logger.error("Error fetching user reviews:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Get review by ID
router.get("/:id", async (req, res) => {
  try {
    const review = await Review.findById(req.params.id)
      .populate("user", "firstName lastName")
      .populate("book", "title author isbn");

    if (!review || !review.isActive) {
      return res.status(404).json({ message: "Review not found" });
    }

    res.json(review);
  } catch (error) {
    logger.error("Error fetching review:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Create review
router.post(
  "/",
  [
    authenticateToken,
    body("bookId").isMongoId(),
    body("rating").isInt({ min: 1, max: 5 }),
    body("title").trim().isLength({ min: 1, max: 200 }),
    body("content").trim().isLength({ min: 10, max: 2000 }),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { bookId, rating, title, content } = req.body;

      // Check if book exists
      const book = await Book.findById(bookId);
      if (!book) {
        return res.status(404).json({ message: "Book not found" });
      }

      // Check if user has already reviewed this book
      const existingReview = await Review.findOne({
        user: req.user.id,
        book: bookId,
      });

      if (existingReview) {
        return res
          .status(400)
          .json({ message: "You have already reviewed this book" });
      }

      // Analyze sentiment using AI
      let sentimentAnalysis = null;
      try {
        sentimentAnalysis = await analyzeSentiment(content);
      } catch (aiError) {
        logger.error("Error analyzing sentiment:", aiError);
        // Continue without AI analysis
      }

      const review = new Review({
        user: req.user.id,
        book: bookId,
        rating,
        title,
        content,
        sentimentScore: sentimentAnalysis?.score || 0,
        sentimentLabel: sentimentAnalysis?.label || "neutral",
        keywords: sentimentAnalysis?.keywords || [],
      });

      await review.save();

      // Update book's average rating
      await book.updateRating(rating);

      // Update book's popularity score
      await book.updatePopularityScore();

      const populatedReview = await Review.findById(review._id)
        .populate("user", "firstName lastName")
        .populate("book", "title author isbn");

      res.status(201).json(populatedReview);
    } catch (error) {
      logger.error("Error creating review:", error);
      res.status(500).json({ message: "Server error" });
    }
  }
);

// Update review
router.put(
  "/:id",
  [
    authenticateToken,
    body("rating").optional().isInt({ min: 1, max: 5 }),
    body("title").optional().trim().isLength({ min: 1, max: 200 }),
    body("content").optional().trim().isLength({ min: 10, max: 2000 }),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { rating, title, content } = req.body;

      const review = await Review.findById(req.params.id);
      if (!review) {
        return res.status(404).json({ message: "Review not found" });
      }

      // Check if user owns this review
      if (review.user.toString() !== req.user.id) {
        return res.status(403).json({ message: "Access denied" });
      }

      // Analyze sentiment if content is updated
      if (content && content !== review.content) {
        try {
          const sentimentAnalysis = await analyzeSentiment(content);
          review.sentimentScore = sentimentAnalysis?.score || 0;
          review.sentimentLabel = sentimentAnalysis?.label || "neutral";
          review.keywords = sentimentAnalysis?.keywords || [];
        } catch (aiError) {
          logger.error("Error analyzing sentiment:", aiError);
        }
      }

      // Update fields
      if (rating !== undefined) review.rating = rating;
      if (title !== undefined) review.title = title;
      if (content !== undefined) review.content = content;

      review.updatedAt = new Date();
      await review.save();

      // Update book's average rating if rating changed
      if (rating !== undefined && rating !== review.rating) {
        const book = await Book.findById(review.book);
        if (book) {
          await book.updateRating(rating);
        }
      }

      const updatedReview = await Review.findById(review._id)
        .populate("user", "firstName lastName")
        .populate("book", "title author isbn");

      res.json(updatedReview);
    } catch (error) {
      logger.error("Error updating review:", error);
      res.status(500).json({ message: "Server error" });
    }
  }
);

// Delete review
router.delete("/:id", authenticateToken, async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);
    if (!review) {
      return res.status(404).json({ message: "Review not found" });
    }

    // Check if user owns this review or is admin
    if (review.user.toString() !== req.user.id && req.user.role !== "admin") {
      return res.status(403).json({ message: "Access denied" });
    }

    // Soft delete
    review.isActive = false;
    review.deletedAt = new Date();
    await review.save();

    res.json({ message: "Review deleted successfully" });
  } catch (error) {
    logger.error("Error deleting review:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Mark review as helpful
router.post("/:id/helpful", authenticateToken, async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);
    if (!review || !review.isActive) {
      return res.status(404).json({ message: "Review not found" });
    }

    // Check if user has already marked this review as helpful
    const helpfulIndex = review.helpfulBy.indexOf(req.user.id);

    if (helpfulIndex > -1) {
      // Remove helpful mark
      review.helpfulBy.splice(helpfulIndex, 1);
      review.helpfulCount = Math.max(0, review.helpfulCount - 1);
    } else {
      // Add helpful mark
      review.helpfulBy.push(req.user.id);
      review.helpfulCount += 1;
    }

    await review.save();

    res.json({
      helpfulCount: review.helpfulCount,
      isHelpful: helpfulIndex === -1,
    });
  } catch (error) {
    logger.error("Error marking review as helpful:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Get all reviews (Admin only)
router.get(
  "/admin/all",
  [authenticateToken, authorizeRoles("admin")],
  async (req, res) => {
    try {
      const {
        page = 1,
        limit = 20,
        bookId,
        userId,
        rating,
        sentiment,
      } = req.query;

      const query = {};
      if (bookId) query.book = bookId;
      if (userId) query.user = userId;
      if (rating) query.rating = parseInt(rating);
      if (sentiment) query.sentimentLabel = sentiment;

      const reviews = await Review.find(query)
        .populate("user", "firstName lastName email")
        .populate("book", "title author isbn")
        .sort({ createdAt: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit);

      const total = await Review.countDocuments(query);

      res.json({
        reviews,
        totalPages: Math.ceil(total / limit),
        currentPage: page,
        total,
      });
    } catch (error) {
      logger.error("Error fetching all reviews:", error);
      res.status(500).json({ message: "Server error" });
    }
  }
);

// Get review statistics (Admin only)
router.get(
  "/admin/statistics",
  [authenticateToken, authorizeRoles("admin")],
  async (req, res) => {
    try {
      const totalReviews = await Review.countDocuments({ isActive: true });
      const averageRating = await Review.aggregate([
        { $match: { isActive: true } },
        { $group: { _id: null, avg: { $avg: "$rating" } } },
      ]);

      const ratingDistribution = await Review.aggregate([
        { $match: { isActive: true } },
        {
          $group: {
            _id: "$rating",
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: -1 } },
      ]);

      const sentimentDistribution = await Review.aggregate([
        { $match: { isActive: true } },
        {
          $group: {
            _id: "$sentimentLabel",
            count: { $sum: 1 },
          },
        },
      ]);

      const reviewsByDay = await Review.aggregate([
        { $match: { isActive: true } },
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
        totalReviews,
        averageRating: averageRating[0]?.avg || 0,
        ratingDistribution,
        sentimentDistribution,
        reviewsByDay,
      });
    } catch (error) {
      logger.error("Error fetching review statistics:", error);
      res.status(500).json({ message: "Server error" });
    }
  }
);

module.exports = router;
