const express = require("express");
const router = express.Router();
const { body, validationResult } = require("express-validator");
// const auth = require('../middleware/auth');
const { verifyToken, authorize } = require("../middleware/auth");
const Book = require("../models/Book");
const User = require("../models/User");
const Borrowing = require("../models/Borrowing");
const Fine = require("../models/Fine");
const { logger } = require("../utils/logger");

// Admin middleware - ensure user is admin
// const adminAuth = [auth, authorize(['admin'])];
const adminAuth = [verifyToken, authorize("admin")];

// GET /api/admin/stats - Get admin dashboard statistics
router.get("/stats", adminAuth, async (req, res) => {
  try {
    // Get total books count
    const totalBooks = await Book.countDocuments({ isActive: true });

    // Get total copies of all books
    const totalCopiesResult = await Book.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: null, total: { $sum: "$totalCopies" } } },
    ]);
    const totalCopies = totalCopiesResult[0]?.total || 0;

    // Get currently borrowed books count
    const borrowedBooks = await Borrowing.countDocuments({ returnedAt: null });

    // Calculate available books (total copies - borrowed books)
    const availableBooks = Math.max(0, totalCopies - borrowedBooks);

    // Get user counts by role
    const totalStudents = await User.countDocuments({
      role: "student",
      isActive: true,
    });
    const totalStaff = await User.countDocuments({
      role: "staff",
      isActive: true,
    });

    // Get active borrowings count
    const activeBorrowings = await Borrowing.countDocuments({
      returnedAt: null,
    });

    // Calculate pending fines (books overdue by more than 60 days)
    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

    const overdueBorrowings = await Borrowing.find({
      returnedAt: null,
      dueDate: { $lt: sixtyDaysAgo },
    });

    const pendingFines = overdueBorrowings.length;

    const stats = {
      totalBooks,
      totalCopies,
      availableBooks,
      borrowedBooks,
      totalStudents,
      totalStaff,
      activeBorrowings,
      pendingFines,
    };

    logger.info(
      `Admin stats retrieved by user ${req.user._id}: ${JSON.stringify(stats)}`
    );
    res.json({ success: true, data: stats });
  } catch (error) {
    logger.error("Error fetching admin stats:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch statistics" });
  }
});

// GET /api/admin/books - Get all books with admin data
router.get("/books", adminAuth, async (req, res) => {
  try {
    const { page = 1, limit = 20, search = "", genre = "" } = req.query;
    const skip = (page - 1) * limit;

    let query = { isActive: true };

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { author: { $regex: search, $options: "i" } },
        { isbn: { $regex: search, $options: "i" } },
      ];
    }

    if (genre) {
      query.genre = { $in: [genre] };
    }

    console.log("ADMIN BOOKS QUERY:", query); // Debug log

    const [books, total] = await Promise.all([
      Book.find(query)
        .populate("addedBy", "firstName lastName")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(), // Convert to plain objects for better performance
      Book.countDocuments(query),
    ]);

    // Ensure books have proper structure even if populate fails
    const processedBooks = books.map((book) => ({
      ...book,
      addedBy: book.addedBy || { firstName: "Unknown", lastName: "User" },
      availableCopies: typeof book.availableCopies === 'number' ? book.availableCopies : (book.totalCopies || 0),
      totalCopies: book.totalCopies || 1,
      genre: Array.isArray(book.genre) ? book.genre : [book.genre || "Unknown"],
      coverImage:
        book.coverImage ||
        "https://via.placeholder.com/300x400/4A90E2/FFFFFF?text=No+Cover",
    }));

    res.json({
      success: true,
      data: {
        books: processedBooks,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    logger.error("Error fetching admin books:", error);
    res.status(500).json({ success: false, message: "Failed to fetch books" });
  }
});

// POST /api/admin/books - Add new book (Admin only)
router.post(
  "/books",
  adminAuth,
  [
    body("title")
      .trim()
      .isLength({ min: 1, max: 200 })
      .withMessage("Title is required and must be less than 200 characters"),
    body("author")
      .trim()
      .isLength({ min: 1, max: 100 })
      .withMessage("Author is required and must be less than 100 characters"),
    body("isbn")
      .trim()
      .isLength({ min: 10, max: 17 })
      .withMessage("ISBN must be between 10-17 characters"),
    body("description")
      .optional()
      .trim()
      .isLength({ max: 2000 })
      .withMessage("Description must be less than 2000 characters"),
    body("genre")
      .isArray({ min: 1 })
      .withMessage("At least one genre is required"),
    body("totalCopies")
      .isInt({ min: 1 })
      .withMessage("Total copies must be at least 1"),
    body("availableCopies")
      .isInt({ min: 0 })
      .withMessage("Available copies cannot be negative"),
    body("coverImage")
      .optional()
      .isURL()
      .withMessage("Cover image must be a valid URL"),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

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
        addedBy: req.user._id,
        lastUpdatedBy: req.user._id,
      };

      const book = await Book.create(bookData);
      await book.populate("addedBy", "firstName lastName");

      logger.info(`New book added by admin ${req.user._id}: ${book.title}`);
      res.status(201).json({ success: true, data: book });
    } catch (error) {
      logger.error("Error adding book:", error);
      res.status(500).json({ success: false, message: "Failed to add book" });
    }
  }
);

// DELETE /api/admin/books/:id - Delete book (Admin only)
router.delete("/books/:id", adminAuth, async (req, res) => {
  try {
    const book = await Book.findById(req.params.id);
    if (!book) {
      return res
        .status(404)
        .json({ success: false, message: "Book not found" });
    }

    // Check if book is currently borrowed
    const activeBorrowings = await Borrowing.countDocuments({
      book: req.params.id,
      returnedAt: null,
    });

    if (activeBorrowings > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete book. It has ${activeBorrowings} active borrowings.`,
      });
    }

    await Book.findByIdAndDelete(req.params.id);

    logger.info(`Book deleted by admin ${req.user._id}: ${book.title}`);
    res.json({ success: true, message: "Book deleted successfully" });
  } catch (error) {
    logger.error("Error deleting book:", error);
    res.status(500).json({ success: false, message: "Failed to delete book" });
  }
});

// GET /api/admin/borrowings - Get all borrowing logs with filtering
router.get("/borrowings", adminAuth, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      staffId = "",
      studentId = "",
      bookName = "",
      startDate = "",
      endDate = "",
    } = req.query;

    const skip = (page - 1) * limit;
    let query = {};

    // Build filter query
    if (staffId) {
      query.lentBy = staffId;
    }
    if (studentId) {
      query.student = studentId;
    }
    if (bookName) {
      query["book.title"] = { $regex: bookName, $options: "i" };
    }
    if (startDate || endDate) {
      query.borrowedAt = {};
      if (startDate) query.borrowedAt.$gte = new Date(startDate);
      if (endDate) query.borrowedAt.$lte = new Date(endDate);
    }

    const [borrowings, total] = await Promise.all([
      Borrowing.find(query)
        .populate("book", "title author isbn")
        .populate("student", "firstName lastName registrationNumber")
        .populate("lentBy", "firstName lastName")
        .sort({ borrowedAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Borrowing.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: {
        borrowings,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    logger.error("Error fetching admin borrowings:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch borrowings" });
  }
});

// GET /api/admin/fines - Get all fines with filtering
router.get("/fines", adminAuth, async (req, res) => {
  try {
    const { page = 1, limit = 20, studentId = "", status = "" } = req.query;

    const skip = (page - 1) * limit;
    let query = {};

    if (studentId) {
      query.student = studentId;
    }
    if (status) {
      query.status = status;
    }

    const [fines, total] = await Promise.all([
      Fine.find(query)
        .populate("student", "firstName lastName registrationNumber")
        .populate("issuedBy", "firstName lastName")
        .populate("book", "title author")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Fine.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: {
        fines,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    logger.error("Error fetching admin fines:", error);
    res.status(500).json({ success: false, message: "Failed to fetch fines" });
  }
});

// PUT /api/admin/fines/:id/confirm-payment - Confirm fine payment
router.put("/fines/:id/confirm-payment", adminAuth, async (req, res) => {
  try {
    const fine = await Fine.findById(req.params.id);
    if (!fine) {
      return res
        .status(404)
        .json({ success: false, message: "Fine not found" });
    }

    if (fine.status === "paid") {
      return res
        .status(400)
        .json({ success: false, message: "Fine is already paid" });
    }

    fine.status = "paid";
    fine.paidAt = new Date();
    fine.paidBy = req.user._id;
    await fine.save();

    logger.info(`Fine payment confirmed by admin ${req.user._id}: ${fine._id}`);
    res.json({ success: true, data: fine });
  } catch (error) {
    logger.error("Error confirming fine payment:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to confirm payment" });
  }
});

// PUT /api/admin/books/:id - Update book (Admin only)
router.put("/books/:id", adminAuth, async (req, res) => {
  try {
    const book = await Book.findById(req.params.id);
    if (!book) {
      return res
        .status(404)
        .json({ success: false, message: "Book not found" });
    }

    // Update fields (except _id, isbn, addedBy)
    const updatableFields = [
      "title",
      "author",
      "publisher",
      "publicationYear",
      "edition",
      "description",
      "genre",
      "subjects",
      "language",
      "pages",
      "format",
      "condition",
      "location",
      "totalCopies",
      "availableCopies",
      "lendingPeriod",
      "canBeReserved",
      "tags",
      "coverImage",
    ];
    updatableFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        book[field] = req.body[field];
      }
    });
    book.lastUpdatedBy = req.user._id;
    await book.save();

    logger.info(`Book updated by admin ${req.user._id}: ${book.title}`);
    res.json({ success: true, data: book });
  } catch (error) {
    logger.error("Error updating book:", error);
    res.status(500).json({ success: false, message: "Failed to update book" });
  }
});

module.exports = router;
