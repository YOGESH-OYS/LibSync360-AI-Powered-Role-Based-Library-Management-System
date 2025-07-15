const express = require("express");
const { body, validationResult } = require("express-validator");
const Book = require("../models/Book");
const User = require("../models/User");
const Borrowing = require("../models/Borrowing");
const Review = require("../models/Review");
const { authenticateToken } = require("../middleware/auth");
const { logger } = require("../utils/logger");
const {
  semanticSearch,
  getBookRecommendations,
  analyzeSentiment,
  predictOverdue,
  generateBookEmbedding,
} = require("../services/aiService");

const router = express.Router();

// Semantic search for books
router.get("/search", async (req, res) => {
  try {
    const { query, limit = 20, filters } = req.query;

    if (!query || query.trim().length < 2) {
      return res
        .status(400)
        .json({ message: "Search query must be at least 2 characters long" });
    }

    const searchResults = await semanticSearch(query, {
      limit: parseInt(limit),
      filters: filters ? JSON.parse(filters) : {},
    });

    res.json(searchResults);
  } catch (error) {
    logger.error("Error in semantic search:", error);
    res.status(500).json({ message: "Search failed" });
  }
});

// Get personalized book recommendations
router.get("/recommendations", authenticateToken, async (req, res) => {
  try {
    const { limit = 5 } = req.query;
    // Return random books from the database
    const count = await Book.countDocuments({ isActive: true, availableCopies: { $gt: 0 } });
    const random = Math.max(0, Math.floor(Math.random() * Math.max(1, count - limit)));
    const recommendations = await Book.find({ isActive: true, availableCopies: { $gt: 0 } })
      .skip(random)
      .limit(parseInt(limit))
      .select("title author coverImage isbn averageRating totalRatings availableCopies totalCopies")
      .populate("addedBy", "firstName lastName");
    res.json(recommendations);
  } catch (error) {
    logger.error("Error getting recommendations:", error);
    res.status(500).json({ message: "Failed to get recommendations" });
  }
});

// Get trending books based on AI analysis
router.get("/trending", async (req, res) => {
  try {
    const { limit = 10, period = "week" } = req.query;

    const trendingBooks = await Book.aggregate([
      {
        $match: {
          isActive: true,
          availableCopies: { $gt: 0 },
        },
      },
      {
        $addFields: {
          trendScore: {
            $add: [
              { $multiply: ["$popularityScore", 0.4] },
              { $multiply: ["$averageRating", 0.3] },
              { $multiply: ["$totalRatings", 0.2] },
              {
                $multiply: [
                  { $subtract: ["$totalCopies", "$availableCopies"] },
                  0.1,
                ],
              },
            ],
          },
        },
      },
      {
        $sort: { trendScore: -1 },
      },
      {
        $limit: parseInt(limit),
      },
      {
        $lookup: {
          from: "users",
          localField: "addedBy",
          foreignField: "_id",
          as: "addedBy",
        },
      },
      {
        $unwind: "$addedBy",
      },
      {
        $project: {
          title: 1,
          author: 1,
          isbn: 1,
          coverImage: 1,
          averageRating: 1,
          totalRatings: 1,
          availableCopies: 1,
          totalCopies: 1,
          trendScore: 1,
          "addedBy.firstName": 1,
          "addedBy.lastName": 1,
        },
      },
    ]);

    res.json(trendingBooks);
  } catch (error) {
    logger.error("Error getting trending books:", error);
    res.status(500).json({ message: "Failed to get trending books" });
  }
});

// Analyze text sentiment
router.post(
  "/sentiment",
  [body("text").trim().isLength({ min: 1, max: 5000 })],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { text } = req.body;

      const sentiment = await analyzeSentiment(text);

      res.json(sentiment);
    } catch (error) {
      logger.error("Error analyzing sentiment:", error);
      res.status(500).json({ message: "Sentiment analysis failed" });
    }
  }
);

// Predict overdue probability for a borrowing
router.get(
  "/predict-overdue/:borrowingId",
  authenticateToken,
  async (req, res) => {
    try {
      const borrowing = await Borrowing.findById(req.params.borrowingId)
        .populate("student", "firstName lastName")
        .populate("book", "title author");

      if (!borrowing) {
        return res.status(404).json({ message: "Borrowing not found" });
      }

      // Check if user has permission
      if (
        req.user.role !== "admin" &&
        req.user.role !== "staff" &&
        borrowing.student._id.toString() !== req.user.id
      ) {
        return res.status(403).json({ message: "Access denied" });
      }

      const prediction = await predictOverdue(borrowing);

      res.json(prediction);
    } catch (error) {
      logger.error("Error predicting overdue:", error);
      res.status(500).json({ message: "Prediction failed" });
    }
  }
);

// Get similar books
router.get("/similar/:bookId", async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    const book = await Book.findById(req.params.bookId);
    if (!book) {
      return res.status(404).json({ message: "Book not found" });
    }

    // Find similar books based on genre, subjects, and author
    const similarBooks = await Book.find({
      _id: { $ne: book._id },
      isActive: true,
      availableCopies: { $gt: 0 },
      $or: [
        { genre: { $in: book.genre } },
        { subjects: { $in: book.subjects } },
        { author: book.author },
      ],
    })
      .populate("addedBy", "firstName lastName")
      .sort({ popularityScore: -1, averageRating: -1 })
      .limit(parseInt(limit));

    res.json(similarBooks);
  } catch (error) {
    logger.error("Error finding similar books:", error);
    res.status(500).json({ message: "Failed to find similar books" });
  }
});

// Generate book embeddings (Admin only)
router.post(
  "/generate-embeddings",
  [authenticateToken, require("../middleware/auth").authorizeRoles("admin")],
  async (req, res) => {
    try {
      const { bookId } = req.body;

      if (bookId) {
        // Generate embedding for specific book
        const book = await Book.findById(bookId);
        if (!book) {
          return res.status(404).json({ message: "Book not found" });
        }

        const embedding = await generateBookEmbedding(book);
        book.aiEmbedding = embedding;
        await book.save();

        res.json({ message: "Embedding generated successfully", bookId });
      } else {
        // Generate embeddings for all books without embeddings
        const booksWithoutEmbeddings = await Book.find({
          aiEmbedding: { $exists: false },
          isActive: true,
        }).limit(100); // Process in batches

        let processed = 0;
        for (const book of booksWithoutEmbeddings) {
          try {
            const embedding = await generateBookEmbedding(book);
            book.aiEmbedding = embedding;
            await book.save();
            processed++;
          } catch (error) {
            logger.error(
              `Error generating embedding for book ${book._id}:`,
              error
            );
          }
        }

        res.json({
          message: `Generated embeddings for ${processed} books`,
          processed,
          total: booksWithoutEmbeddings.length,
        });
      }
    } catch (error) {
      logger.error("Error generating embeddings:", error);
      res.status(500).json({ message: "Failed to generate embeddings" });
    }
  }
);

// Get AI insights and analytics
router.get(
  "/insights",
  [authenticateToken, require("../middleware/auth").authorizeRoles("admin")],
  async (req, res) => {
    try {
      // Popular genres based on borrowings
      const popularGenres = await Book.aggregate([
        {
          $lookup: {
            from: "borrowings",
            localField: "_id",
            foreignField: "book",
            as: "borrowings",
          },
        },
        {
          $unwind: "$genre",
        },
        {
          $group: {
            _id: "$genre",
            borrowCount: { $sum: { $size: "$borrowings" } },
            avgRating: { $avg: "$averageRating" },
          },
        },
        {
          $sort: { borrowCount: -1 },
        },
        {
          $limit: 10,
        },
      ]);

      // Reading patterns by department
      const readingPatterns = await User.aggregate([
        {
          $match: {
            role: "student",
            "academicCredentials.department": { $exists: true },
          },
        },
        {
          $lookup: {
            from: "borrowings",
            localField: "_id",
            foreignField: "student",
            as: "borrowings",
          },
        },
        {
          $group: {
            _id: "$academicCredentials.department",
            studentCount: { $sum: 1 },
            totalBorrowings: { $sum: { $size: "$borrowings" } },
            avgBorrowingsPerStudent: { $avg: { $size: "$borrowings" } },
          },
        },
        {
          $sort: { totalBorrowings: -1 },
        },
      ]);

      // Sentiment analysis of reviews
      const reviewSentiments = await Review.aggregate([
        {
          $match: { isActive: true },
        },
        {
          $group: {
            _id: "$sentimentLabel",
            count: { $sum: 1 },
            avgRating: { $avg: "$rating" },
          },
        },
      ]);

      // Overdue prediction accuracy
      const overdueStats = await Borrowing.aggregate([
        {
          $match: {
            returnedAt: { $exists: true },
          },
        },
        {
          $addFields: {
            wasOverdue: { $gt: ["$returnedAt", "$dueDate"] },
            overdueDays: {
              $max: [
                0,
                {
                  $divide: [
                    { $subtract: ["$returnedAt", "$dueDate"] },
                    1000 * 60 * 60 * 24,
                  ],
                },
              ],
            },
          },
        },
        {
          $group: {
            _id: null,
            totalReturns: { $sum: 1 },
            overdueReturns: { $sum: { $cond: ["$wasOverdue", 1, 0] } },
            avgOverdueDays: { $avg: "$overdueDays" },
          },
        },
      ]);

      res.json({
        popularGenres,
        readingPatterns,
        reviewSentiments,
        overdueStats: overdueStats[0] || {},
      });
    } catch (error) {
      logger.error("Error getting AI insights:", error);
      res.status(500).json({ message: "Failed to get insights" });
    }
  }
);

// Get reading recommendations based on user's academic profile
router.get("/academic-recommendations", authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user || user.role !== "student") {
      return res
        .status(400)
        .json({ message: "Only students can get academic recommendations" });
    }

    const { department, year, subjects } = user.academicCredentials;

    if (!department) {
      return res.status(400).json({ message: "Academic department not found" });
    }

    // Find books relevant to user's academic profile
    const academicBooks = await Book.find({
      isActive: true,
      availableCopies: { $gt: 0 },
      $or: [
        { subjects: { $in: subjects || [] } },
        { tags: { $regex: department, $options: "i" } },
        { description: { $regex: department, $options: "i" } },
      ],
    })
      .populate("addedBy", "firstName lastName")
      .sort({ popularityScore: -1, averageRating: -1 })
      .limit(20);

    // Group by relevance
    const recommendations = {
      highlyRelevant: academicBooks.slice(0, 5),
      relevant: academicBooks.slice(5, 10),
      general: academicBooks.slice(10, 20),
    };

    res.json(recommendations);
  } catch (error) {
    logger.error("Error getting academic recommendations:", error);
    res.status(500).json({ message: "Failed to get academic recommendations" });
  }
});

module.exports = router;
