const express = require("express");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { body, validationResult } = require("express-validator");
const rateLimit = require("express-rate-limit");

const User = require("../models/User");
const {
  verifyToken,
  requireAdmin,
  authRateLimit,
} = require("../middleware/auth");
const { asyncHandler } = require("../middleware/errorHandler");
const { logger } = require("../utils/logger");
const { sendEmail } = require("../services/emailService");

const router = express.Router();

// Rate limiting for auth endpoints
const authLimiter = rateLimit(authRateLimit);

// Generate JWT token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });
};

const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  maxAge: 3 * 60 * 60 * 1000, // 3 hours in ms
};

// @route   POST /api/auth/login
// @desc    Authenticate user & get token
// @access  Public
router.post(
  "/login",
  authLimiter,
  [
    body("username", "Username is required").notEmpty(),
    body("password", "Password is required").notEmpty(),
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array(),
      });
    }

    const { username, password } = req.body;

    try {
      // Find user by username or email
      const user = await User.findOne({
        $or: [{ username: username }, { email: username }],
      });

      if (!user) {
        logger.logAuth("login", null, false, {
          username,
          ip: req.ip,
          userAgent: req.get("User-Agent"),
        });
        return res.status(401).json({
          success: false,
          message: "Invalid credentials",
        });
      }

      // Check if user is active
      if (!user.isActive) {
        logger.logAuth("login", user._id, false, {
          reason: "account_deactivated",
          ip: req.ip,
          userAgent: req.get("User-Agent"),
        });
        return res.status(401).json({
          success: false,
          message: "Account is deactivated",
        });
      }

      // Check password
      const isMatch = await user.comparePassword(password);
      if (!isMatch) {
        logger.logAuth("login", user._id, false, {
          reason: "invalid_password",
          ip: req.ip,
          userAgent: req.get("User-Agent"),
        });
        return res.status(401).json({
          success: false,
          message: "Invalid credentials",
        });
      }

      // Update last login
      user.lastLogin = new Date();
      await user.save();

      // Generate token
      const token = generateToken(user._id);

      // Decode token to get expiry
      const decoded = jwt.decode(token);
      user.jwtToken = token;
      user.jwtTokenExpiresAt = new Date(decoded.exp * 1000); // exp is in seconds
      await user.save();

      // Set JWT as HTTP-only cookie
      res.cookie("token", token, cookieOptions);

      logger.logAuth("login", user._id, true, {
        role: user.role,
        ip: req.ip,
        userAgent: req.get("User-Agent"),
      });

      res.json({
        success: true,
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          registrationNumber: user.registrationNumber,
          academicCredentials: user.academicCredentials,
        },
      });
    } catch (error) {
      logger.error("Login error:", error);
      res.status(500).json({
        success: false,
        message: "Server error",
      });
    }
  })
);

// @route   POST /api/auth/register
// @desc    Register a new user (Admin only)
// @access  Private (Admin)
router.post(
  "/register",
  verifyToken,
  requireAdmin,
  [
    body("username", "Username is required").notEmpty().isLength({ min: 3 }),
    body("email", "Please include a valid email").isEmail(),
    body("password", "Password must be at least 6 characters").isLength({
      min: 6,
    }),
    body("firstName", "First name is required").notEmpty(),
    body("lastName", "Last name is required").notEmpty(),
    body("role", "Role is required").isIn(["student", "staff"]),
    body("registrationNumber").optional().notEmpty(),
    body("rollNumber").optional().notEmpty(),
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array(),
      });
    }

    const {
      username,
      email,
      password,
      firstName,
      lastName,
      role,
      registrationNumber,
      rollNumber,
      academicCredentials,
      phone,
      address,
    } = req.body;

    try {
      // Check if user already exists
      const existingUser = await User.findOne({
        $or: [{ username }, { email }],
      });

      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: "User already exists",
        });
      }

      // Check if registration number is unique for students
      if (role === "student" && registrationNumber) {
        const existingStudent = await User.findOne({ registrationNumber });
        if (existingStudent) {
          return res.status(400).json({
            success: false,
            message: "Registration number already exists",
          });
        }
      }

      // Create user
      let user;
      if (role === "staff") {
        user = await User.createStaff({
          username,
          email,
          password,
          firstName,
          lastName,
          phone,
          address,
        });
      } else {
        user = await User.createStudent({
          username,
          email,
          password,
          firstName,
          lastName,
          registrationNumber,
          rollNumber,
          academicCredentials,
          phone,
          address,
        });
      }

      logger.logAuth("register", user._id, true, {
        role: user.role,
        createdBy: req.user.id,
      });

      res.status(201).json({
        success: true,
        message: "User created successfully",
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          registrationNumber: user.registrationNumber,
        },
      });
    } catch (error) {
      logger.error("Registration error:", error);
      res.status(500).json({
        success: false,
        message: "Server error",
      });
    }
  })
);

// @route   GET /api/auth/me
// @desc    Get current user
// @access  Private
router.get(
  "/me",
  verifyToken,
  asyncHandler(async (req, res) => {
    try {
      const user = await User.findById(req.user.id).select("-password");

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      res.json({
        success: true,
        user,
      });
    } catch (error) {
      logger.error("Get user error:", error);
      res.status(500).json({
        success: false,
        message: "Server error",
      });
    }
  })
);

// @route   POST /api/auth/change-password
// @desc    Change user password
// @access  Private
router.post(
  "/change-password",
  verifyToken,
  [
    body("currentPassword", "Current password is required").notEmpty(),
    body("newPassword", "New password must be at least 6 characters").isLength({
      min: 6,
    }),
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array(),
      });
    }

    const { currentPassword, newPassword } = req.body;

    try {
      const user = await User.findById(req.user.id);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      // Check current password
      const isMatch = await user.comparePassword(currentPassword);
      if (!isMatch) {
        return res.status(400).json({
          success: false,
          message: "Current password is incorrect",
        });
      }

      // Update password
      user.password = newPassword;
      await user.save();

      logger.logAuth("change_password", user._id, true);

      res.json({
        success: true,
        message: "Password changed successfully",
      });
    } catch (error) {
      logger.error("Change password error:", error);
      res.status(500).json({
        success: false,
        message: "Server error",
      });
    }
  })
);

// @route   POST /api/auth/forgot-password
// @desc    Send password reset email
// @access  Public
router.post(
  "/forgot-password",
  authLimiter,
  [body("email", "Please include a valid email").isEmail()],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array(),
      });
    }

    const { email } = req.body;

    try {
      const user = await User.findOne({ email });

      if (!user) {
        // Don't reveal if email exists or not
        return res.json({
          success: true,
          message:
            "If an account with that email exists, a password reset link has been sent",
        });
      }

      // Generate reset token
      const resetToken = jwt.sign(
        { id: user._id, type: "password_reset" },
        process.env.JWT_SECRET,
        { expiresIn: "1h" }
      );

      // Send email (implement email service)
      const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;

      try {
        await sendEmail({
          to: user.email,
          subject: "Password Reset Request",
          template: "password-reset",
          data: {
            name: user.firstName,
            resetUrl,
          },
        });

        logger.logAuth("forgot_password", user._id, true, { email });

        res.json({
          success: true,
          message:
            "If an account with that email exists, a password reset link has been sent",
        });
      } catch (emailError) {
        logger.error("Email send error:", emailError);
        res.status(500).json({
          success: false,
          message: "Error sending email",
        });
      }
    } catch (error) {
      logger.error("Forgot password error:", error);
      res.status(500).json({
        success: false,
        message: "Server error",
      });
    }
  })
);

// @route   POST /api/auth/reset-password
// @desc    Reset password with token
// @access  Public
router.post(
  "/reset-password",
  [
    body("token", "Token is required").notEmpty(),
    body("newPassword", "New password must be at least 6 characters").isLength({
      min: 6,
    }),
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array(),
      });
    }

    const { token, newPassword } = req.body;

    try {
      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      if (decoded.type !== "password_reset") {
        return res.status(400).json({
          success: false,
          message: "Invalid token",
        });
      }

      const user = await User.findById(decoded.id);

      if (!user) {
        return res.status(400).json({
          success: false,
          message: "Invalid token",
        });
      }

      // Update password
      user.password = newPassword;
      await user.save();

      logger.logAuth("reset_password", user._id, true);

      res.json({
        success: true,
        message: "Password reset successfully",
      });
    } catch (error) {
      if (
        error.name === "JsonWebTokenError" ||
        error.name === "TokenExpiredError"
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid or expired token",
        });
      }

      logger.error("Reset password error:", error);
      res.status(500).json({
        success: false,
        message: "Server error",
      });
    }
  })
);

// @route   POST /api/auth/logout
// @desc    Logout user (clear JWT from DB)
// @access  Private
router.post(
  "/logout",
  verifyToken,
  asyncHandler(async (req, res) => {
    const user = req.user;
    user.jwtToken = null;
    user.jwtTokenExpiresAt = null;
    await user.save();
    res.clearCookie("token", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    });
    res.json({ success: true, message: "Logged out successfully." });
  })
);

// @route   POST /api/auth/initialize-admin
// @desc    Initialize admin user (first time setup)
// @access  Public (only if no admin exists)
router.post(
  "/initialize-admin",
  [
    body("username", "Username is required").notEmpty(),
    body("email", "Please include a valid email").isEmail(),
    body("password", "Password must be at least 6 characters").isLength({
      min: 6,
    }),
    body("firstName", "First name is required").notEmpty(),
    body("lastName", "Last name is required").notEmpty(),
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
      // Check if admin already exists
      const existingAdmin = await User.findOne({ role: "admin" });
      if (existingAdmin) {
        return res.status(400).json({
          success: false,
          message: "Admin user already exists",
        });
      }

      const { username, email, password, firstName, lastName } = req.body;

      // Create admin user
      const admin = await User.createAdmin({
        username,
        email,
        password,
        firstName,
        lastName,
      });

      logger.logAuth("initialize_admin", admin._id, true);

      res.status(201).json({
        success: true,
        message: "Admin user created successfully",
        user: {
          id: admin._id,
          username: admin.username,
          email: admin.email,
          firstName: admin.firstName,
          lastName: admin.lastName,
          role: admin.role,
        },
      });
    } catch (error) {
      logger.error("Initialize admin error:", error);
      res.status(500).json({
        success: false,
        message: "Server error",
      });
    }
  })
);

module.exports = router;
