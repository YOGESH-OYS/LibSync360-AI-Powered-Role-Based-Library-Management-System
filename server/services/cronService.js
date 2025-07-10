const cron = require("node-cron");
const { logger } = require("../utils/logger");
const Borrowing = require("../models/Borrowing");
const Fine = require("../models/Fine");
const Notification = require("../models/Notification");
const {
  sendReminderNotification,
  sendOverdueNotification,
  sendFineNotification,
} = require("./emailService");
const User = require("../models/User");

// Initialize cron jobs
const initializeCronJobs = () => {
  logger.info("Initializing cron jobs...");

  // Daily fine calculation and overdue notifications (runs at 9 AM daily)
  cron.schedule(
    "0 9 * * *",
    async () => {
      logger.info(
        "Running daily fine calculation and overdue notifications..."
      );
      await processOverdueBooks();
    },
    {
      scheduled: true,
      timezone: "Asia/Kolkata",
    }
  );

  // Reminder notifications (runs at 10 AM daily)
  cron.schedule(
    "0 10 * * *",
    async () => {
      logger.info("Running reminder notifications...");
      await sendReminderNotifications();
    },
    {
      scheduled: true,
      timezone: "Asia/Kolkata",
    }
  );

  // Weekly fine summary (runs every Monday at 8 AM)
  cron.schedule(
    "0 8 * * 1",
    async () => {
      logger.info("Running weekly fine summary...");
      await generateWeeklyFineSummary();
    },
    {
      scheduled: true,
      timezone: "Asia/Kolkata",
    }
  );

  // Monthly statistics update (runs on 1st of every month at 6 AM)
  cron.schedule(
    "0 6 1 * *",
    async () => {
      logger.info("Running monthly statistics update...");
      await updateMonthlyStatistics();
    },
    {
      scheduled: true,
      timezone: "Asia/Kolkata",
    }
  );

  // Clean up old notifications (runs daily at 2 AM)
  cron.schedule(
    "0 2 * * *",
    async () => {
      logger.info("Running notification cleanup...");
      await cleanupOldNotifications();
    },
    {
      scheduled: true,
      timezone: "Asia/Kolkata",
    }
  );

  // Update fines for overdue borrowedBooks every minute
  setInterval(async () => {
    const now = new Date();
    const students = await User.find({ role: "student" });
    for (const student of students) {
      let updated = false;
      for (const borrowed of student.borrowedBooks) {
        if (!borrowed.returnedAt && borrowed.dueAt < now) {
          const minsOverdue = Math.floor((now - borrowed.dueAt) / 60000) + 1;
          const fine = minsOverdue * 10;
          if (borrowed.fineAccrued !== fine) {
            borrowed.fineAccrued = fine;
            updated = true;
          }

          // --- Create or update Fine document in real time ---
          const borrowingRecord = await Borrowing.findOne({
            student: student._id,
            book: borrowed.bookId,
            status: { $ne: "returned" },
          });
          if (borrowingRecord) {
            let fineDoc = await Fine.findOne({
              borrowing: borrowingRecord._id,
            });
            if (!fineDoc) {
              fineDoc = new Fine({
                student: student._id,
                borrowing: borrowingRecord._id,
                book: borrowed.bookId,
                amount: fine,
                reason: "overdue",
                status: "pending",
              });
            } else {
              fineDoc.amount = fine;
            }
            await fineDoc.save();
          }
          // --- END ---
        }
      }
      if (updated) {
        student.currentFines = student.borrowedBooks.reduce(
          (sum, b) => sum + (b.fineAccrued || 0),
          0
        );
        await student.save();
      }
    }
  }, 60 * 1000); // every minute

  logger.info("Cron jobs initialized successfully");
};

// Process overdue books and calculate fines
const processOverdueBooks = async () => {
  try {
    const overdueBorrowings = await Borrowing.getOverdueBorrowings();
    const dailyFineAmount = parseInt(process.env.DAILY_FINE_AMOUNT) || 5;

    for (const borrowing of overdueBorrowings) {
      const daysOverdue = borrowing.daysOverdue;
      const currentFine = daysOverdue * dailyFineAmount;

      // Update borrowing status
      borrowing.status = "overdue";
      await borrowing.save();

      // Create or update fine
      let fine = await Fine.findOne({ borrowing: borrowing._id });

      if (!fine) {
        fine = new Fine({
          student: borrowing.student._id,
          borrowing: borrowing._id,
          amount: currentFine,
          reason: "overdue",
        });
      } else {
        fine.amount = currentFine;
      }

      await fine.save();

      // Send overdue notification
      try {
        await sendOverdueNotification(borrowing, daysOverdue, currentFine);

        // Create in-app notification
        await Notification.createNotification({
          recipientId: borrowing.student._id,
          type: "overdue",
          title: "Book Overdue",
          message: `Your book "${borrowing.book.title}" is ${daysOverdue} days overdue. Current fine: ₹${currentFine}`,
          relatedBook: borrowing.book._id,
          relatedBorrowing: borrowing._id,
          relatedFine: fine._id,
          priority: "high",
        });

        // Update borrowing notification record
        await borrowing.addNotification({
          type: "overdue",
          sentVia: "email",
        });

        logger.logBorrowingOperation(
          "overdue_notification",
          borrowing._id,
          borrowing.student._id,
          {
            daysOverdue,
            fineAmount: currentFine,
          }
        );
      } catch (notificationError) {
        logger.error("Failed to send overdue notification:", notificationError);
      }
    }

    logger.info(`Processed ${overdueBorrowings.length} overdue borrowings`);
  } catch (error) {
    logger.error("Error processing overdue books:", error);
  }
};

// Send reminder notifications for books due soon
const sendReminderNotifications = async () => {
  try {
    const reminderDays = parseInt(process.env.REMINDER_DAYS_BEFORE_DUE) || 2;
    const borrowingsDueSoon = await Borrowing.getBorrowingsDueSoon(
      reminderDays
    );

    for (const borrowing of borrowingsDueSoon) {
      const dueDate = new Date(borrowing.dueDate);
      const today = new Date();
      const daysRemaining = Math.ceil(
        (dueDate - today) / (1000 * 60 * 60 * 24)
      );

      // Check if reminder was already sent today
      const todayNotifications = borrowing.notificationsSent.filter(
        (n) =>
          n.type === "reminder" &&
          new Date(n.sentAt).toDateString() === today.toDateString()
      );

      if (todayNotifications.length === 0) {
        try {
          await sendReminderNotification(borrowing, daysRemaining);

          // Create in-app notification
          await Notification.createNotification({
            recipientId: borrowing.student._id,
            type: "reminder",
            title: "Book Due Soon",
            message: `Your book "${borrowing.book.title}" is due in ${daysRemaining} days`,
            relatedBook: borrowing.book._id,
            relatedBorrowing: borrowing._id,
            priority: "medium",
          });

          // Update borrowing notification record
          await borrowing.addNotification({
            type: "reminder",
            sentVia: "email",
          });

          logger.logBorrowingOperation(
            "reminder_notification",
            borrowing._id,
            borrowing.student._id,
            {
              daysRemaining,
            }
          );
        } catch (notificationError) {
          logger.error(
            "Failed to send reminder notification:",
            notificationError
          );
        }
      }
    }

    logger.info(`Sent ${borrowingsDueSoon.length} reminder notifications`);
  } catch (error) {
    logger.error("Error sending reminder notifications:", error);
  }
};

// Generate weekly fine summary
const generateWeeklyFineSummary = async () => {
  try {
    const startOfWeek = new Date();
    startOfWeek.setDate(startOfWeek.getDate() - 7);

    const weeklyFines = await Fine.find({
      createdAt: { $gte: startOfWeek },
    })
      .populate("student", "firstName lastName email")
      .populate("borrowing", "book");

    const totalFines = weeklyFines.reduce((sum, fine) => sum + fine.amount, 0);
    const paidFines = weeklyFines
      .filter((fine) => fine.isPaid)
      .reduce((sum, fine) => sum + fine.amount, 0);
    const unpaidFines = totalFines - paidFines;

    logger.info("Weekly fine summary:", {
      totalFines,
      paidFines,
      unpaidFines,
      fineCount: weeklyFines.length,
    });

    // TODO: Send summary to admin/staff
  } catch (error) {
    logger.error("Error generating weekly fine summary:", error);
  }
};

// Update monthly statistics
const updateMonthlyStatistics = async () => {
  try {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    // Update book popularity scores
    const Book = require("../models/Book");
    const books = await Book.find({ isActive: true });

    for (const book of books) {
      await book.updatePopularityScore();
    }

    logger.info("Updated monthly statistics");
  } catch (error) {
    logger.error("Error updating monthly statistics:", error);
  }
};

// Clean up old notifications
const cleanupOldNotifications = async () => {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const result = await Notification.deleteMany({
      createdAt: { $lt: thirtyDaysAgo },
      isRead: true,
    });

    logger.info(`Cleaned up ${result.deletedCount} old notifications`);
  } catch (error) {
    logger.error("Error cleaning up old notifications:", error);
  }
};

// Manual trigger functions for testing
const triggerOverdueProcessing = async () => {
  logger.info("Manually triggering overdue processing...");
  await processOverdueBooks();
};

const triggerReminderNotifications = async () => {
  logger.info("Manually triggering reminder notifications...");
  await sendReminderNotifications();
};

const triggerFineSummary = async () => {
  logger.info("Manually triggering fine summary...");
  await generateWeeklyFineSummary();
};

module.exports = {
  initializeCronJobs,
  processOverdueBooks,
  sendReminderNotifications,
  generateWeeklyFineSummary,
  updateMonthlyStatistics,
  cleanupOldNotifications,
  triggerOverdueProcessing,
  triggerReminderNotifications,
  triggerFineSummary,
};
