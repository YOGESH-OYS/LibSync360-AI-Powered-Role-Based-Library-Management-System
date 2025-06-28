const winston = require('winston');
const path = require('path');

// Define log format
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Define console format for development
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let log = `${timestamp} [${level}]: ${message}`;
    if (Object.keys(meta).length > 0) {
      log += ` ${JSON.stringify(meta)}`;
    }
    return log;
  })
);

// Create logger instance
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  defaultMeta: { service: 'library-management' },
  transports: [
    // Write all logs with level 'error' and below to error.log
    new winston.transports.File({
      filename: path.join(__dirname, '../logs/error.log'),
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    // Write all logs with level 'info' and below to combined.log
    new winston.transports.File({
      filename: path.join(__dirname, '../logs/combined.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
  ],
});

// If we're not in production, log to console as well
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: consoleFormat
  }));
}

// Create a stream object for Morgan HTTP logging
logger.stream = {
  write: (message) => {
    logger.info(message.trim());
  },
};

// Helper methods for specific log types
logger.logAPI = (req, res, responseTime) => {
  logger.info('API Request', {
    method: req.method,
    url: req.url,
    statusCode: res.statusCode,
    responseTime: `${responseTime}ms`,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    userId: req.user?.id
  });
};

logger.logAuth = (action, userId, success, details = {}) => {
  logger.info('Authentication', {
    action,
    userId,
    success,
    ip: details.ip,
    userAgent: details.userAgent,
    ...details
  });
};

logger.logBookOperation = (operation, bookId, userId, details = {}) => {
  logger.info('Book Operation', {
    operation,
    bookId,
    userId,
    ...details
  });
};

logger.logBorrowingOperation = (operation, borrowingId, userId, details = {}) => {
  logger.info('Borrowing Operation', {
    operation,
    borrowingId,
    userId,
    ...details
  });
};

logger.logFineOperation = (operation, fineId, userId, details = {}) => {
  logger.info('Fine Operation', {
    operation,
    fineId,
    userId,
    ...details
  });
};

logger.logNotification = (type, recipientId, success, details = {}) => {
  logger.info('Notification', {
    type,
    recipientId,
    success,
    ...details
  });
};

logger.logAI = (operation, success, details = {}) => {
  logger.info('AI Operation', {
    operation,
    success,
    ...details
  });
};

module.exports = { logger }; 