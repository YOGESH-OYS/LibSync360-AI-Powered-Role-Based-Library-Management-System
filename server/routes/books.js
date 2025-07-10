const express = require("express");
const { body, validationResult } = require("express-validator");
const {
  verifyToken,
  requireStaff,
  optionalAuth,
} = require("../middleware/auth");
const { asyncHandler } = require("../middleware/errorHandler");
const { logger } = require("../utils/logger");
const {
  semanticSearch,
  getBookRecommendations,
} = require("../services/aiService");

const Book = require("../models/Book");

const router = express.Router();

// @route   GET /api/books
// @desc    Get all books with filters
// @access  Public
router.get(
  "/",
  optionalAuth,
  asyncHandler(async (req, res) => {
    const {
      search,
      genre,
      subjects,
      format,
      availableOnly,
      minRating,
      limit = 20,
      page = 1,
      sortBy = "popularityScore",
      sortOrder = "desc",
    } = req.query;

    try {
      const filters = {
        genre,
        subjects,
        format,
        availableOnly: availableOnly === "true",
        minRating: minRating ? parseFloat(minRating) : null,
        limit: parseInt(limit),
      };

      let books;
      if (search) {
        try {
          // Try AI semantic search first
          books = await semanticSearch(search, filters, parseInt(limit));
        } catch (aiError) {
          // Fall back to regular MongoDB search if AI search fails
          logger.warn(
            "AI search failed, falling back to regular search:",
            aiError.message
          );
          books = await Book.searchBooks(search, filters);
        }
      } else {
        books = await Book.searchBooks(null, filters);
      }

      // Apply sorting
      const sortField =
        sortBy === "title"
          ? "title"
          : sortBy === "author"
          ? "author"
          : sortBy === "rating"
          ? "averageRating"
          : "popularityScore";

      books.sort((a, b) => {
        const aVal = a[sortField] || 0;
        const bVal = b[sortField] || 0;
        return sortOrder === "asc" ? aVal - bVal : bVal - aVal;
      });

      // Apply pagination
      const skip = (parseInt(page) - 1) * parseInt(limit);
      const paginatedBooks = books.slice(skip, skip + parseInt(limit));

      res.json({
        success: true,
        books: paginatedBooks,
        pagination: {
          current: parseInt(page),
          total: Math.ceil(books.length / parseInt(limit)),
          hasNext: skip + paginatedBooks.length < books.length,
          hasPrev: page > 1,
          totalBooks: books.length,
        },
      });
    } catch (error) {
      logger.error("Get books error:", error);
      res.status(500).json({
        success: false,
        message: "Server error",
      });
    }
  })
);

// @route   GET /api/books/popular
// @desc    Get popular books
// @access  Public
router.get(
  "/popular",
  asyncHandler(async (req, res) => {
    const { limit = 10 } = req.query;

    try {
      const books = await Book.getPopularBooks(parseInt(limit));

      res.json({
        success: true,
        books,
      });
    } catch (error) {
      logger.error("Get popular books error:", error);
      res.status(500).json({
        success: false,
        message: "Server error",
      });
    }
  })
);

// @route   GET /api/books/recent
// @desc    Get recently added books
// @access  Public
router.get(
  "/recent",
  asyncHandler(async (req, res) => {
    const { limit = 10 } = req.query;

    try {
      const books = await Book.getRecentBooks(parseInt(limit));

      res.json({
        success: true,
        books,
      });
    } catch (error) {
      logger.error("Get recent books error:", error);
      res.status(500).json({
        success: false,
        message: "Server error",
      });
    }
  })
);

// @route   GET /api/books/recommendations
// @desc    Get personalized book recommendations
// @access  Private
router.get(
  "/recommendations",
  verifyToken,
  asyncHandler(async (req, res) => {
    const { limit = 5 } = req.query;

    try {
      const recommendations = await getBookRecommendations(req.user.id, {
        limit: parseInt(limit),
        type: "general",
      });

      res.json({
        success: true,
        data: recommendations,
        count: recommendations.length,
      });
    } catch (error) {
      logger.error("Get recommendations error:", error);
      res.status(500).json({
        success: false,
        message: "Server error",
      });
    }
  })
);

// @route   GET /api/books/:id
// @desc    Get book by ID
// @access  Public
router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    try {
      const book = await Book.findById(id)
        .populate("addedBy", "firstName lastName")
        .populate("lastUpdatedBy", "firstName lastName");

      if (!book) {
        return res.status(404).json({
          success: false,
          message: "Book not found",
        });
      }

      res.json({
        success: true,
        book,
      });
    } catch (error) {
      logger.error("Get book error:", error);
      res.status(500).json({
        success: false,
        message: "Server error",
      });
    }
  })
);

// @route   POST /api/books
// @desc    Add new book (Staff/Admin only)
// @access  Private (Staff/Admin)
router.post(
  "/",
  verifyToken,
  requireStaff,
  [
    body("title", "Title is required").notEmpty().isLength({ max: 200 }),
    body("author", "Author is required").notEmpty().isLength({ max: 100 }),
    body("isbn", "Valid ISBN is required").matches(/^[0-9\-]{10,17}$/),
    body("totalCopies", "Total copies must be at least 1").isInt({ min: 1 }),
    body("description").optional().isLength({ max: 2000 }),
    body("genre").optional().isArray(),
    body("subjects").optional().isArray(),
    body("publicationYear")
      .optional()
      .isInt({ min: 1800, max: new Date().getFullYear() }),
    body("format")
      .optional()
      .isIn(["hardcover", "paperback", "ebook", "audiobook"]),
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array(),
      });
    }

    try {
      // Check if ISBN already exists
      const existingBook = await Book.findOne({ isbn: req.body.isbn });
      if (existingBook) {
        return res.status(400).json({
          success: false,
          message: "Book with this ISBN already exists",
        });
      }

      const bookData = {
        ...req.body,
        addedBy: req.user.id,
        lastUpdatedBy: req.user.id,
      };

      const book = new Book(bookData);
      await book.save();

      await book.populate("addedBy", "firstName lastName");

      logger.logBookOperation("create", book._id, req.user.id, {
        title: book.title,
        isbn: book.isbn,
      });

      res.status(201).json({
        success: true,
        message: "Book added successfully",
        book,
      });
    } catch (error) {
      logger.error("Add book error:", error);
      res.status(500).json({
        success: false,
        message: "Server error",
      });
    }
  })
);

// @route   PUT /api/books/:id
// @desc    Update book (Staff/Admin only)
// @access  Private (Staff/Admin)
router.put(
  "/:id",
  verifyToken,
  requireStaff,
  [
    body("title").optional().notEmpty().isLength({ max: 200 }),
    body("author").optional().notEmpty().isLength({ max: 100 }),
    body("description").optional().isLength({ max: 2000 }),
    body("genre").optional().isArray(),
    body("subjects").optional().isArray(),
    body("publicationYear")
      .optional()
      .isInt({ min: 1800, max: new Date().getFullYear() }),
    body("format")
      .optional()
      .isIn(["hardcover", "paperback", "ebook", "audiobook"]),
    body("condition").optional().isIn(["excellent", "good", "fair", "poor"]),
    body("totalCopies").optional().isInt({ min: 1 }),
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array(),
      });
    }

    const { id } = req.params;

    try {
      const book = await Book.findById(id);
      if (!book) {
        return res.status(404).json({
          success: false,
          message: "Book not found",
        });
      }

      // Update book
      Object.assign(book, req.body, { lastUpdatedBy: req.user.id });
      await book.save();

      await book.populate("lastUpdatedBy", "firstName lastName");

      logger.logBookOperation("update", book._id, req.user.id, {
        title: book.title,
      });

      res.json({
        success: true,
        message: "Book updated successfully",
        book,
      });
    } catch (error) {
      logger.error("Update book error:", error);
      res.status(500).json({
        success: false,
        message: "Server error",
      });
    }
  })
);

// @route   DELETE /api/books/:id
// @desc    Delete book (Admin only)
// @access  Private (Admin)
router.delete(
  "/:id",
  verifyToken,
  requireStaff,
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    try {
      const book = await Book.findById(id);
      if (!book) {
        return res.status(404).json({
          success: false,
          message: "Book not found",
        });
      }

      // Check if book has active borrowings
      const Borrowing = require("../models/Borrowing");
      const activeBorrowings = await Borrowing.countDocuments({
        book: id,
        status: { $in: ["borrowed", "overdue"] },
      });

      if (activeBorrowings > 0) {
        return res.status(400).json({
          success: false,
          message: `Cannot delete book with ${activeBorrowings} active borrowings`,
        });
      }

      // Soft delete by setting isActive to false
      book.isActive = false;
      book.lastUpdatedBy = req.user.id;
      await book.save();

      logger.logBookOperation("delete", book._id, req.user.id, {
        title: book.title,
      });

      res.json({
        success: true,
        message: "Book deleted successfully",
      });
    } catch (error) {
      logger.error("Delete book error:", error);
      res.status(500).json({
        success: false,
        message: "Server error",
      });
    }
  })
);

// @route   GET /api/books/search/suggestions
// @desc    Get search suggestions
// @access  Public
router.get(
  "/search/suggestions",
  asyncHandler(async (req, res) => {
    const { q } = req.query;

    if (!q || q.length < 2) {
      return res.json({
        success: true,
        suggestions: [],
      });
    }

    try {
      const suggestions = await Book.find({
        $or: [
          { title: { $regex: q, $options: "i" } },
          { author: { $regex: q, $options: "i" } },
        ],
        isActive: true,
      })
        .select("title author")
        .limit(10)
        .sort({ popularityScore: -1 });

      res.json({
        success: true,
        suggestions,
      });
    } catch (error) {
      logger.error("Get search suggestions error:", error);
      res.status(500).json({
        success: false,
        message: "Server error",
      });
    }
  })
);

// @route   GET /api/books/stats/overview
// @desc    Get book statistics overview
// @access  Public
router.get(
  "/stats/overview",
  asyncHandler(async (req, res) => {
    try {
      const totalBooks = await Book.countDocuments({ isActive: true });
      const availableBooks = await Book.countDocuments({
        isActive: true,
        availableCopies: { $gt: 0 },
      });
      const totalCopies = await Book.aggregate([
        { $match: { isActive: true } },
        { $group: { _id: null, total: { $sum: "$totalCopies" } } },
      ]);

      const genreStats = await Book.aggregate([
        { $match: { isActive: true } },
        { $unwind: "$genre" },
        { $group: { _id: "$genre", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 5 },
      ]);

      res.json({
        success: true,
        stats: {
          totalBooks,
          availableBooks,
          totalCopies: totalCopies[0]?.total || 0,
          topGenres: genreStats,
        },
      });
    } catch (error) {
      logger.error("Get book stats error:", error);
      res.status(500).json({
        success: false,
        message: "Server error",
      });
    }
  })
);

// AI-powered semantic search
router.get("/search/semantic", async (req, res) => {
  try {
    const { query, limit = 20, filters = {} } = req.query;

    if (!query || query.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: "Search query must be at least 2 characters long",
      });
    }

    const result = await semanticSearch(query, {
      limit: parseInt(limit),
      filters,
    });

    res.json({
      success: true,
      data: result.books,
      total: result.total,
      query: query.trim(),
    });
  } catch (error) {
    logger.error("Semantic search error:", error);
    res.status(500).json({
      success: false,
      message: "Search failed. Please try again.",
    });
  }
});

// Staff: Search/filter available books for lending
router.get(
  "/search/available",
  verifyToken,
  requireStaff,
  asyncHandler(async (req, res) => {
    const { search } = req.query;
    const query = { isActive: true, availableCopies: { $gt: 0 } };
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { author: { $regex: search, $options: "i" } },
        { isbn: { $regex: search, $options: "i" } },
      ];
    }
    const books = await Book.find(query).limit(20);
    res.json(books);
  })
);

module.exports = router;
