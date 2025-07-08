const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { logger } = require("../utils/logger");

// Verify JWT token
const verifyToken = async (req, res, next) => {
  try {
    let token = req.cookies.token;

    if (!token && req.headers.authorization) {
      token = req.headers.authorization.split(" ")[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Access token required",
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Check if user still exists
    const user = await User.findById(decoded.id).select("-password");
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User no longer exists",
      });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: "User account is deactivated",
      });
    }

    // Check if token matches the one stored in the user record
    if (!user.jwtToken || user.jwtToken !== token) {
      return res.status(401).json({
        success: false,
        message: "Session expired. Please log in again.",
      });
    }

    // Check if token is expired (by DB field)
    if (!user.jwtTokenExpiresAt || user.jwtTokenExpiresAt < new Date()) {
      user.jwtToken = null;
      user.jwtTokenExpiresAt = null;
      await user.save();
      return res.status(401).json({
        success: false,
        message: "Session expired. Please log in again.",
      });
    }

    // Check if password was changed after token was issued
    if (user.changedPasswordAfter(decoded.iat)) {
      return res.status(401).json({
        success: false,
        message: "Password recently changed, please log in again",
      });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({
        success: false,
        message: "Invalid token",
      });
    }

    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        message: "Token expired",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Authentication error",
    });
  }
};

// Alias for verifyToken to match route usage
const authenticateToken = verifyToken;

// Role-based access control
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Required roles: ${roles.join(", ")}`,
      });
    }

    next();
  };
};

// Alias for authorize to match route usage
const authorizeRoles = authorize;

// Admin only access
const requireAdmin = authorize("admin");

// Staff or admin access
const requireStaff = authorize("admin", "staff");

// Student access
const requireStudent = authorize("student");

// Self or admin access (for profile operations)
const requireSelfOrAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: "Authentication required",
    });
  }

  const targetUserId = req.params.userId || req.params.id;

  if (req.user.role === "admin" || req.user._id.toString() === targetUserId) {
    return next();
  }

  return res.status(403).json({
    success: false,
    message:
      "Access denied. You can only access your own profile or admin access required.",
  });
};

// Optional authentication (for public routes that can show different content for logged-in users)
const optionalAuth = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
      return next();
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select("-password");

    if (user && user.isActive) {
      req.user = user;
    }

    next();
  } catch (error) {
    // Continue without authentication if token is invalid
    next();
  }
};

// Rate limiting for authentication endpoints
const authRateLimit = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs
  message: "Too many authentication attempts, please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
};

module.exports = {
  verifyToken,
  authenticateToken,
  authorize,
  authorizeRoles,
  requireAdmin,
  requireStaff,
  requireStudent,
  requireSelfOrAdmin,
  optionalAuth,
  authRateLimit,
};
