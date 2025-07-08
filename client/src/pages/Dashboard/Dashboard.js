import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  BookOpenIcon,
  UserIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  ChartBarIcon,
  AcademicCapIcon,
  UserGroupIcon,
  BellIcon,
  CalendarIcon,
  StarIcon,
  ArrowRightIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import { useAuth } from "../../context/AuthContext";
import {
  borrowingsAPI,
  finesAPI,
  notificationsAPI,
  aiAPI,
  adminAPI,
} from "../../services/api";
import { toast } from "react-hot-toast";
import {
  isSessionExpiredResponse,
  isSessionExpiredError,
} from "../../utils/sessionUtils";

const Dashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({});
  const [recentBorrowings, setRecentBorrowings] = useState([]);
  const [overdueBooks, setOverdueBooks] = useState([]);
  const [unreadNotifications, setUnreadNotifications] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);

        // Fetch data based on user role
        if (user.role === "admin") {
          // Admin dashboard - get admin-specific stats
          const [statsRes, borrowingsRes, overdueRes, notificationsRes] =
            await Promise.all([
              adminAPI.getStats(),
              adminAPI.getBorrowings({ limit: 10 }),
              borrowingsAPI.getOverdue({ limit: 10 }),
              notificationsAPI.getAll({ limit: 10 }),
            ]);

          // Check if any response indicates session expired
          if (
            isSessionExpiredResponse(statsRes) ||
            isSessionExpiredResponse(borrowingsRes) ||
            isSessionExpiredResponse(overdueRes) ||
            isSessionExpiredResponse(notificationsRes)
          ) {
            return; // Let the global handler show the popup
          }

          setStats(statsRes.data || {});
          setRecentBorrowings(
            Array.isArray(borrowingsRes.data?.borrowings)
              ? borrowingsRes.data.borrowings
              : []
          );
          setOverdueBooks(
            Array.isArray(overdueRes.data?.borrowings)
              ? overdueRes.data.borrowings
              : []
          );
          setUnreadNotifications(
            Array.isArray(notificationsRes.data?.notifications)
              ? notificationsRes.data.notifications
              : []
          );
        } else if (user.role === "student") {
          const [
            borrowingsRes,
            finesRes,
            notificationsRes,
            recommendationsRes,
          ] = await Promise.all([
            borrowingsAPI.getMyBorrowings({ limit: 5 }),
            finesAPI.getMyFines({ limit: 5 }),
            notificationsAPI.getAll({ limit: 5, read: false }),
            aiAPI.getRecommendations(5, "general"),
          ]);

          // Check if any response indicates session expired
          if (
            isSessionExpiredResponse(borrowingsRes) ||
            isSessionExpiredResponse(finesRes) ||
            isSessionExpiredResponse(notificationsRes) ||
            isSessionExpiredResponse(recommendationsRes)
          ) {
            return; // Let the global handler show the popup
          }

          setRecentBorrowings(borrowingsRes.data.borrowings || []);
          setStats({
            currentBorrowings: borrowingsRes.data.total || 0,
            totalFines: finesRes.data.total || 0,
            unreadNotifications: notificationsRes.data.unreadCount || 0,
          });
          setUnreadNotifications(notificationsRes.data.notifications || []);
          setRecommendations(recommendationsRes.data || []);
        } else {
          // Staff dashboard
          const [borrowingsRes, overdueRes, notificationsRes] =
            await Promise.all([
              borrowingsAPI.getAll({ limit: 10 }),
              borrowingsAPI.getOverdue({ limit: 10 }),
              notificationsAPI.getAll({ limit: 10 }),
            ]);

          // Check if any response indicates session expired
          if (
            isSessionExpiredResponse(borrowingsRes) ||
            isSessionExpiredResponse(overdueRes) ||
            isSessionExpiredResponse(notificationsRes)
          ) {
            return; // Let the global handler show the popup
          }

          setRecentBorrowings(borrowingsRes.data.borrowings || []);
          setOverdueBooks(overdueRes.data.borrowings || []);
          setUnreadNotifications(notificationsRes.data.notifications || []);
          setStats({
            totalBorrowings: borrowingsRes.data.total || 0,
            overdueBooks: overdueRes.data.total || 0,
            unreadNotifications: notificationsRes.data.unreadCount || 0,
          });
        }
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
        if (isSessionExpiredError(error)) {
          return;
        }
        toast.error("Failed to load dashboard data");
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [user.role]);

  const getRoleSpecificContent = () => {
    switch (user.role) {
      case "admin":
        return (
          <div className="space-y-8">
            {/* Admin Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="bg-white p-6 rounded-lg shadow-sm border hover:shadow-md transition-shadow"
              >
                <div className="flex items-center">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <BookOpenIcon className="h-6 w-6 text-blue-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">
                      Total Books
                    </p>
                    <motion.p
                      className="text-2xl font-bold text-gray-900"
                      initial={{ scale: 1 }}
                      animate={{ scale: [1, 1.1, 1] }}
                      transition={{ duration: 0.5, delay: 0.2 }}
                    >
                      {stats.totalBooks || 0}
                    </motion.p>
                  </div>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="bg-white p-6 rounded-lg shadow-sm border hover:shadow-md transition-shadow"
              >
                <div className="flex items-center">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <UserIcon className="h-6 w-6 text-green-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">
                      Available Books
                    </p>
                    <motion.p
                      className="text-2xl font-bold text-gray-900"
                      initial={{ scale: 1 }}
                      animate={{ scale: [1, 1.1, 1] }}
                      transition={{ duration: 0.5, delay: 0.3 }}
                    >
                      {stats.availableBooks || 0}
                    </motion.p>
                  </div>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="bg-white p-6 rounded-lg shadow-sm border hover:shadow-md transition-shadow"
              >
                <div className="flex items-center">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <AcademicCapIcon className="h-6 w-6 text-purple-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">
                      Students
                    </p>
                    <motion.p
                      className="text-2xl font-bold text-gray-900"
                      initial={{ scale: 1 }}
                      animate={{ scale: [1, 1.1, 1] }}
                      transition={{ duration: 0.5, delay: 0.4 }}
                    >
                      {stats.totalStudents || 0}
                    </motion.p>
                  </div>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
                className="bg-white p-6 rounded-lg shadow-sm border hover:shadow-md transition-shadow"
              >
                <div className="flex items-center">
                  <div className="p-2 bg-orange-100 rounded-lg">
                    <UserGroupIcon className="h-6 w-6 text-orange-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Staff</p>
                    <motion.p
                      className="text-2xl font-bold text-gray-900"
                      initial={{ scale: 1 }}
                      animate={{ scale: [1, 1.1, 1] }}
                      transition={{ duration: 0.5, delay: 0.5 }}
                    >
                      {stats.totalStaff || 0}
                    </motion.p>
                  </div>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.4 }}
                className="bg-white p-6 rounded-lg shadow-sm border hover:shadow-md transition-shadow"
              >
                <div className="flex items-center">
                  <div className="p-2 bg-red-100 rounded-lg">
                    <ExclamationTriangleIcon className="h-6 w-6 text-red-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">
                      Pending Fines
                    </p>
                    <motion.p
                      className="text-2xl font-bold text-gray-900"
                      initial={{ scale: 1 }}
                      animate={{ scale: [1, 1.1, 1] }}
                      transition={{ duration: 0.5, delay: 0.6 }}
                    >
                      {stats.pendingFines || 0}
                    </motion.p>
                  </div>
                </div>
              </motion.div>
            </div>

            {/* Admin Quick Actions */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.5 }}
              className="bg-white rounded-lg shadow-sm border p-6"
            >
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Quick Actions
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Link
                  to="/admin/books"
                  className="flex items-center justify-center p-4 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                >
                  <PlusIcon className="h-5 w-5 text-blue-600 mr-2" />
                  <span className="font-medium text-blue-900">Add Book</span>
                </Link>
                <Link
                  to="/admin/borrowings"
                  className="flex items-center justify-center p-4 bg-green-50 hover:bg-green-100 rounded-lg transition-colors"
                >
                  <BookOpenIcon className="h-5 w-5 text-green-600 mr-2" />
                  <span className="font-medium text-green-900">
                    View Borrowings
                  </span>
                </Link>
                <Link
                  to="/admin/fines"
                  className="flex items-center justify-center p-4 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
                >
                  <ExclamationTriangleIcon className="h-5 w-5 text-red-600 mr-2" />
                  <span className="font-medium text-red-900">Manage Fines</span>
                </Link>
                <Link
                  to="/admin/users"
                  className="flex items-center justify-center p-4 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors"
                >
                  <UserGroupIcon className="h-5 w-5 text-purple-600 mr-2" />
                  <span className="font-medium text-purple-900">
                    User Management
                  </span>
                </Link>
              </div>
            </motion.div>

            {/* Recent Activity Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.6 }}
                className="card"
              >
                <div className="card-header">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Recent Borrowings
                  </h3>
                </div>
                <div className="card-body">
                  {recentBorrowings.length > 0 ? (
                    <div className="space-y-3">
                      {recentBorrowings.map((borrowing) => (
                        <div
                          key={borrowing._id}
                          className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                        >
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">
                              {borrowing.book?.title}
                            </p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              {borrowing.student?.firstName}{" "}
                              {borrowing.student?.lastName}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              Due:{" "}
                              {new Date(borrowing.dueDate).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 dark:text-gray-400">
                      No recent borrowings
                    </p>
                  )}
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.7 }}
                className="card"
              >
                <div className="card-header">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Overdue Books
                  </h3>
                </div>
                <div className="card-body">
                  {overdueBooks.length > 0 ? (
                    <div className="space-y-3">
                      {overdueBooks.map((borrowing) => (
                        <div
                          key={borrowing._id}
                          className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-900/20 rounded-lg"
                        >
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">
                              {borrowing.book?.title}
                            </p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              {borrowing.student?.firstName}{" "}
                              {borrowing.student?.lastName}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-red-600 dark:text-red-400">
                              {Math.ceil(
                                (new Date() - new Date(borrowing.dueDate)) /
                                  (1000 * 60 * 60 * 24)
                              )}{" "}
                              days overdue
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 dark:text-gray-400">
                      No overdue books
                    </p>
                  )}
                </div>
              </motion.div>
            </div>
          </div>
        );

      case "staff":
        return (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="card"
            >
              <div className="card-header">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Recent Borrowings
                </h3>
              </div>
              <div className="card-body">
                {recentBorrowings.length > 0 ? (
                  <div className="space-y-3">
                    {recentBorrowings.map((borrowing) => (
                      <div
                        key={borrowing._id}
                        className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                      >
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {borrowing.book?.title}
                          </p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {borrowing.student?.firstName}{" "}
                            {borrowing.student?.lastName}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            Due:{" "}
                            {new Date(borrowing.dueDate).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 dark:text-gray-400">
                    No recent borrowings
                  </p>
                )}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="card"
            >
              <div className="card-header">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Quick Actions
                </h3>
              </div>
              <div className="card-body">
                <div className="grid grid-cols-2 gap-4">
                  <button className="btn-primary">
                    <BookOpenIcon className="mr-2 h-4 w-4" />
                    Lend Book
                  </button>
                  <button className="btn-secondary">
                    <ClockIcon className="mr-2 h-4 w-4" />
                    Process Return
                  </button>
                  <button className="btn-secondary">
                    <ExclamationTriangleIcon className="mr-2 h-4 w-4" />
                    Manage Fines
                  </button>
                  <button className="btn-secondary">
                    <UserIcon className="mr-2 h-4 w-4" />
                    Help Student
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        );

      case "student":
        return (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="card"
            >
              <div className="card-header">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  My Current Borrowings
                </h3>
              </div>
              <div className="card-body">
                {recentBorrowings.length > 0 ? (
                  <div className="space-y-3">
                    {recentBorrowings.map((borrowing) => (
                      <div
                        key={borrowing._id}
                        className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                      >
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {borrowing.book?.title}
                          </p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {borrowing.book?.author}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            Due:{" "}
                            {new Date(borrowing.dueDate).toLocaleDateString()}
                          </p>
                          {new Date(borrowing.dueDate) < new Date() && (
                            <p className="text-sm text-red-600 dark:text-red-400">
                              Overdue
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 dark:text-gray-400">
                    No current borrowings
                  </p>
                )}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="card"
            >
              <div className="card-header">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Recommended Books
                </h3>
              </div>
              <div className="card-body">
                {recommendations.length > 0 ? (
                  <div className="space-y-3">
                    {recommendations.map((book) => (
                      <div
                        key={book._id}
                        className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg"
                      >
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {book.title}
                          </p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {book.author}
                          </p>
                        </div>
                        <div className="text-right">
                          <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                            <span className="mr-1">★</span>
                            {book.averageRating?.toFixed(1) || "N/A"}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 dark:text-gray-400">
                    No recommendations available
                  </p>
                )}
              </div>
            </motion.div>
          </div>
        );

      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      {/* <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <BookOpenIcon className="h-8 w-8 text-blue-600" />
              <span className="ml-2 text-xl font-bold text-gray-900">
                {user.role === "admin"
                  ? "Admin Dashboard"
                  : user.role === "staff"
                  ? "Staff Dashboard"
                  : "Student Dashboard"}
              </span>
            </div>
            <div className="flex items-center space-x-4">
              <button className="relative p-2 text-gray-600 hover:text-gray-900">
              </button>
              <div className="flex items-center space-x-2">
                <UserIcon className="h-6 w-6 text-gray-600" />
                <span className="text-gray-900 font-medium">
                  {user.firstName} {user.lastName}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div> */}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl p-6 mb-8 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold mb-2">
                Welcome back, {user.firstName}!
              </h1>
              <p className="text-blue-100">
                {user.department} •{" "}
                {user.role === "admin"
                  ? "Administrator"
                  : user.role === "staff"
                  ? "Library Staff"
                  : `Year ${user.year}`}{" "}
                • {user.registrationNumber}
              </p>
            </div>
            <div className="text-right">
              <p className="text-blue-100">Reading Streak</p>
              <p className="text-3xl font-bold">
                {stats.readingStreak || 0} days
              </p>
            </div>
          </div>
        </div>

        {/* Role-specific content */}
        {getRoleSpecificContent()}
      </div>
    </div>
  );
};

export default Dashboard;
