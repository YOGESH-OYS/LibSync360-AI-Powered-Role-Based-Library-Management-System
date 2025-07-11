const express = require("express");
const { body, validationResult } = require("express-validator");
const User = require("../models/User");
const { authenticateToken, authorizeRoles } = require("../middleware/auth");
const { logger } = require("../utils/logger");

const router = express.Router();

// Get current user profile
router.get("/profile", authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .select("-password")
      .populate("currentBorrowingsCount")
      .populate("unpaidFines");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json(user);
  } catch (error) {
    logger.error("Error fetching user profile:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Update user profile
router.put(
  "/profile",
  [
    authenticateToken,
    body("firstName").optional().trim().isLength({ min: 2, max: 50 }),
    body("lastName").optional().trim().isLength({ min: 2, max: 50 }),
    body("phone")
      .optional()
      .matches(/^[0-9+\-\s()]+$/),
    body("address.street").optional().trim(),
    body("address.city").optional().trim(),
    body("address.state").optional().trim(),
    body("address.zipCode").optional().trim(),
    body("address.country").optional().trim(),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const user = await User.findById(req.user.id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Update allowed fields
      const allowedFields = ["firstName", "lastName", "phone", "address"];
      allowedFields.forEach((field) => {
        if (req.body[field] !== undefined) {
          user[field] = req.body[field];
        }
      });

      await user.save();

      const updatedUser = await User.findById(user._id).select("-password");
      res.json(updatedUser);
    } catch (error) {
      logger.error("Error updating user profile:", error);
      res.status(500).json({ message: "Server error" });
    }
  }
);

// Change password
router.put(
  "/change-password",
  [
    authenticateToken,
    body("currentPassword").isLength({ min: 6 }),
    body("newPassword").isLength({ min: 6 }),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { currentPassword, newPassword } = req.body;

      const user = await User.findById(req.user.id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const isPasswordValid = await user.comparePassword(currentPassword);
      if (!isPasswordValid) {
        return res
          .status(400)
          .json({ message: "Current password is incorrect" });
      }

      user.password = newPassword;
      await user.save();

      res.json({ message: "Password updated successfully" });
    } catch (error) {
      logger.error("Error changing password:", error);
      res.status(500).json({ message: "Server error" });
    }
  }
);

// Get all users (Admin only)
router.get(
  "/",
  [authenticateToken, authorizeRoles("admin")],
  async (req, res) => {
    try {
      const {
        page = 1,
        limit = 10,
        role,
        search,
        department,
        status,
      } = req.query;

      const query = {};
      if (role) query.role = role;
      if (department) query["academicCredentials.department"] = department;
      if (status) query.isActive = status === "active";
      if (search) {
        query.$or = [
          { firstName: { $regex: search, $options: "i" } },
          { lastName: { $regex: search, $options: "i" } },
          { email: { $regex: search, $options: "i" } },
          { username: { $regex: search, $options: "i" } },
          { registrationNumber: { $regex: search, $options: "i" } },
        ];
      }

      // Get paginated users
      const users = await User.find(query)
        .select("-password")
        .sort({ createdAt: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit)
        .lean();

      // Add status field to each user
      users.forEach((user) => {
        user.status = user.isActive ? "active" : "inactive";
      });

      const total = await User.countDocuments(query);

      // Get counts for each role and total users
      const [adminCount, staffCount, studentCount, totalCount] =
        await Promise.all([
          User.countDocuments({ role: "admin" }),
          User.countDocuments({ role: "staff" }),
          User.countDocuments({ role: "student" }),
          User.countDocuments({}),
        ]);

      // Get available roles and departments
      const availableRoles = ["admin", "staff", "student"];
      const departmentsAgg = await User.aggregate([
        {
          $match: {
            "academicCredentials.department": { $exists: true, $ne: null },
          },
        },
        { $group: { _id: "$academicCredentials.department" } },
        { $sort: { _id: 1 } },
      ]);
      const availableDepartments = departmentsAgg
        .map((dep) => dep._id)
        .filter(Boolean);

      res.json({
        users,
        pagination: {
          total,
          page: Number(page),
          limit: Number(limit),
          pages: Math.ceil(total / limit),
        },
        counts: {
          admin: adminCount,
          staff: staffCount,
          student: studentCount,
          total: totalCount,
        },
        availableRoles,
        availableDepartments,
      });
    } catch (error) {
      logger.error("Error fetching users:", error);
      res.status(500).json({ message: "Server error" });
    }
  }
);

// Get user by ID (Admin and Staff for students)
router.get(
  "/:id",
  [authenticateToken, authorizeRoles("admin", "staff")],
  async (req, res) => {
    try {
      const user = await User.findById(req.params.id)
        .select("-password")
        .populate("currentBorrowingsCount")
        .populate("unpaidFines");

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // If staff, only allow viewing students
      if (req.user.role === "staff" && user.role !== "student") {
        return res.status(403).json({ message: "Forbidden" });
      }

      // Add totalBooksBorrowed and currentlyBorrowedCount
      const totalBooksBorrowed = user.borrowedBooks
        ? user.borrowedBooks.length
        : 0;
      const currentlyBorrowedCount = user.borrowedBooks
        ? user.borrowedBooks.filter((b) => !b.returnedAt).length
        : 0;
      const userObj = user.toObject();
      userObj.totalBooksBorrowed = totalBooksBorrowed;
      userObj.currentlyBorrowedCount = currentlyBorrowedCount;

      res.json(userObj);
    } catch (error) {
      logger.error("Error fetching user:", error);
      res.status(500).json({ message: "Server error" });
    }
  }
);

// Update user (Admin only)
router.put(
  "/:id",
  [
    authenticateToken,
    authorizeRoles("admin"),
    body("firstName").optional().trim().isLength({ min: 2, max: 50 }),
    body("lastName").optional().trim().isLength({ min: 2, max: 50 }),
    body("email").optional().isEmail(),
    body("role").optional().isIn(["admin", "staff", "student"]),
    body("isActive").optional().isBoolean(),
    body("academicCredentials.department").optional().trim(),
    body("academicCredentials.year").optional().isInt({ min: 1, max: 5 }),
    body("academicCredentials.semester").optional().isInt({ min: 1, max: 10 }),
    body("academicCredentials.cgpa").optional().isFloat({ min: 0, max: 10 }),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const user = await User.findById(req.params.id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Update allowed fields
      const allowedFields = [
        "firstName",
        "lastName",
        "email",
        "role",
        "isActive",
        "academicCredentials",
        "phone",
        "address",
      ];

      allowedFields.forEach((field) => {
        if (req.body[field] !== undefined) {
          user[field] = req.body[field];
        }
      });

      await user.save();

      const updatedUser = await User.findById(user._id).select("-password");
      res.json(updatedUser);
    } catch (error) {
      logger.error("Error updating user:", error);
      res.status(500).json({ message: "Server error" });
    }
  }
);

// Delete user (Admin only)
router.delete(
  "/:id",
  [authenticateToken, authorizeRoles("admin")],
  async (req, res) => {
    try {
      const user = await User.findById(req.params.id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Check if user has active borrowings
      const Borrowing = require("../models/Borrowing");
      const activeBorrowings = await Borrowing.countDocuments({
        student: user._id,
        returnedAt: null,
      });

      if (activeBorrowings > 0) {
        return res.status(400).json({
          message: "Cannot delete user with active borrowings",
        });
      }

      await User.findByIdAndDelete(req.params.id);
      res.json({ message: "User deleted successfully" });
    } catch (error) {
      logger.error("Error deleting user:", error);
      res.status(500).json({ message: "Server error" });
    }
  }
);

// Get user statistics
router.get(
  "/:id/statistics",
  [authenticateToken, authorizeRoles("admin")],
  async (req, res) => {
    try {
      const user = await User.findById(req.params.id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const statistics = await user.getStatistics();
      res.json(statistics);
    } catch (error) {
      logger.error("Error fetching user statistics:", error);
      res.status(500).json({ message: "Server error" });
    }
  }
);

// Add new user (Admin only)
router.post(
  "/",
  [
    authenticateToken,
    authorizeRoles("admin"),
    body("username").notEmpty().withMessage("Username is required"),
    body("email").isEmail().withMessage("Valid email is required"),
    body("password")
      .isLength({ min: 6 })
      .withMessage("Password (min 6 chars) is required"),
    body("firstName").notEmpty().withMessage("First name is required"),
    body("lastName").notEmpty().withMessage("Last name is required"),
    body("registrationNumber")
      .notEmpty()
      .withMessage("Registration number is required"),
    body("role")
      .isIn(["admin", "staff", "student"])
      .withMessage("Role is required"),
    // Student-specific
    body("rollNumber")
      .if(body("role").equals("student"))
      .notEmpty()
      .withMessage("Roll number is required"),
    body("academicCredentials.department")
      .if(body("role").equals("student"))
      .notEmpty()
      .withMessage("Department is required"),
    body("academicCredentials.year")
      .if(body("role").equals("student"))
      .notEmpty()
      .withMessage("Year is required"),
    body("academicCredentials.semester")
      .if(body("role").equals("student"))
      .notEmpty()
      .withMessage("Semester is required"),
    body("academicCredentials.cgpa")
      .if(body("role").equals("student"))
      .notEmpty()
      .withMessage("CGPA is required"),
    body("phone")
      .if(body("role").equals("student"))
      .notEmpty()
      .withMessage("Phone is required"),
    body("address.street")
      .if(body("role").equals("student"))
      .notEmpty()
      .withMessage("Street is required"),
    body("address.city")
      .if(body("role").equals("student"))
      .notEmpty()
      .withMessage("City is required"),
    body("address.state")
      .if(body("role").equals("student"))
      .notEmpty()
      .withMessage("State is required"),
    body("address.zipCode")
      .if(body("role").equals("student"))
      .notEmpty()
      .withMessage("Zip code is required"),
    body("address.country")
      .if(body("role").equals("student"))
      .notEmpty()
      .withMessage("Country is required"),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }
      const { username, email, registrationNumber } = req.body;
      // Uniqueness checks
      if (await User.findOne({ username })) {
        return res.status(400).json({ message: "Username already exists" });
      }
      if (await User.findOne({ email })) {
        return res.status(400).json({ message: "Email already exists" });
      }
      if (await User.findOne({ registrationNumber })) {
        return res
          .status(400)
          .json({ message: "Registration number already exists" });
      }
      // Prepare user object (let pre-save hook hash password)
      const userData = { ...req.body };
      // Remove fields not needed for staff/admin
      if (userData.role !== "student") {
        delete userData.rollNumber;
        delete userData.academicCredentials;
        delete userData.phone;
        delete userData.address;
      }
      // Save user
      const user = await User.create(userData);
      const userObj = user.toObject();
      delete userObj.password;
      res.status(201).json(userObj);
    } catch (error) {
      logger.error("Error creating user:", error);
      res.status(500).json({ message: "Server error" });
    }
  }
);

// Verify current password for sensitive actions
router.post(
  "/verify-password",
  [authenticateToken, body("password").isLength({ min: 6 })],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }
      const { password } = req.body;
      const user = await User.findById(req.user.id);
      if (!user) {
        return res
          .status(404)
          .json({ success: false, message: "User not found" });
      }
      const isMatch = await user.comparePassword(password);
      if (!isMatch) {
        return res
          .status(401)
          .json({ success: false, message: "Incorrect password" });
      }
      return res.json({ success: true });
    } catch (error) {
      logger.error("Error verifying password:", error);
      res.status(500).json({ success: false, message: "Server error" });
    }
  }
);

// Staff: Search/filter students for lending
router.get(
  "/students/search",
  authenticateToken,
  authorizeRoles("staff"),
  async (req, res) => {
    const { search } = req.query;
    const query = { role: "student" };
    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: "i" } },
        { lastName: { $regex: search, $options: "i" } },
        { registrationNumber: { $regex: search, $options: "i" } },
        { rollNumber: { $regex: search, $options: "i" } },
      ];
    }
    const students = await User.find(query).select("-password").limit(20);
    res.json(students);
  }
);

module.exports = router;
