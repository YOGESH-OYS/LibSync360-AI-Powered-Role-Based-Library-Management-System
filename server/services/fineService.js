const Fine = require("../models/Fine");
const Borrowing = require("../models/Borrowing");
const User = require("../models/User");
const { logger } = require("../utils/logger");

class FineService {
  /**
   * Calculate and create fines for overdue books
   * Fines are ₹5 per day after 60 days overdue
   */
  static async calculateOverdueFines() {
    try {
      const sixtyDaysAgo = new Date();
      sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

      // Find all overdue borrowings that don't have fines yet
      const overdueBorrowings = await Borrowing.find({
        returnedAt: null,
        dueDate: { $lt: sixtyDaysAgo },
      }).populate("student book");

      let finesCreated = 0;

      for (const borrowing of overdueBorrowings) {
        // Check if fine already exists for this borrowing
        const existingFine = await Fine.findOne({
          borrowing: borrowing._id,
          status: { $in: ["pending", "overdue"] },
        });

        if (!existingFine) {
          // Calculate days overdue
          const daysOverdue = Math.floor(
            (new Date() - new Date(borrowing.dueDate)) / (1000 * 60 * 60 * 24)
          );
          const fineAmount = daysOverdue * 5; // ₹5 per day

          // Create fine record
          await Fine.create({
            student: borrowing.student._id,
            book: borrowing.book._id,
            borrowing: borrowing._id,
            amount: fineAmount,
            reason: `Book overdue by ${daysOverdue} days`,
            status: "pending",
            issuedBy: borrowing.lentBy,
            dueDate: borrowing.dueDate,
            daysOverdue: daysOverdue,
          });

          finesCreated++;
          logger.info(
            `Fine created for borrowing ${borrowing._id}: ₹${fineAmount}`
          );
        }
      }

      logger.info(
        `Fine calculation completed. ${finesCreated} new fines created.`
      );
      return finesCreated;
    } catch (error) {
      logger.error("Error calculating overdue fines:", error);
      throw error;
    }
  }

  /**
   * Get pending fines for a student
   */
  static async getStudentFines(studentId) {
    try {
      const fines = await Fine.find({
        student: studentId,
        status: { $in: ["pending", "overdue"] },
      }).populate("book", "title author");

      return fines;
    } catch (error) {
      logger.error("Error fetching student fines:", error);
      throw error;
    }
  }

  /**
   * Mark fine as paid
   */
  static async markFineAsPaid(fineId, paidBy) {
    try {
      const fine = await Fine.findByIdAndUpdate(
        fineId,
        {
          status: "paid",
          paidAt: new Date(),
          paidBy: paidBy,
        },
        { new: true }
      );

      logger.info(`Fine ${fineId} marked as paid by ${paidBy}`);
      return fine;
    } catch (error) {
      logger.error("Error marking fine as paid:", error);
      throw error;
    }
  }

  /**
   * Get fine statistics for admin dashboard
   */
  static async getFineStats() {
    try {
      const [pendingFines, totalFines, totalAmount] = await Promise.all([
        Fine.countDocuments({ status: "pending" }),
        Fine.countDocuments({}),
        Fine.aggregate([{ $group: { _id: null, total: { $sum: "$amount" } } }]),
      ]);

      return {
        pendingFines,
        totalFines,
        totalAmount: totalAmount[0]?.total || 0,
      };
    } catch (error) {
      logger.error("Error fetching fine stats:", error);
      throw error;
    }
  }
}

module.exports = FineService;
