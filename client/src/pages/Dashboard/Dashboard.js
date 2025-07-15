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
  booksAPI,
} from "../../services/api";
import { toast } from "react-hot-toast";
import {
  isSessionExpiredResponse,
  isSessionExpiredError,
} from "../../utils/sessionUtils";
import axios from "../../services/api";

const Dashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({});
  const [recentBorrowings, setRecentBorrowings] = useState([]);
  const [overdueBooks, setOverdueBooks] = useState([]);
  const [unreadNotifications, setUnreadNotifications] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lendModalOpen, setLendModalOpen] = useState(false);
  const [studentSearch, setStudentSearch] = useState("");
  const [studentResults, setStudentResults] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [studentDetails, setStudentDetails] = useState(null);
  const [lendBookModalOpen, setLendBookModalOpen] = useState(false);
  const [bookSearch, setBookSearch] = useState("");
  const [bookResults, setBookResults] = useState([]);
  const [studentDetailsLoading, setStudentDetailsLoading] = useState(false);
  const [studentDetailsError, setStudentDetailsError] = useState(null);
  const [showBookDropdown, setShowBookDropdown] = useState(false);
  const [bookDropdownSearch, setBookDropdownSearch] = useState("");
  const [bookDropdownResults, setBookDropdownResults] = useState([]);
  const [bookDropdownPage, setBookDropdownPage] = useState(1);
  const [returnModalOpen, setReturnModalOpen] = useState(false);

  // --- Return Modal State ---
  const [returnStudentSearch, setReturnStudentSearch] = useState("");
  const [returnStudentResults, setReturnStudentResults] = useState([]);
  const [returnSelectedStudent, setReturnSelectedStudent] = useState(null);
  const [returnStudentDetails, setReturnStudentDetails] = useState(null);
  const [returnStudentDetailsLoading, setReturnStudentDetailsLoading] =
    useState(false);
  const [returnStudentDetailsError, setReturnStudentDetailsError] =
    useState(null);
  const [returnSelectedBookId, setReturnSelectedBookId] = useState("");

  // --- Student Dashboard hooks for books and fines ---
  const [allBooks, setAllBooks] = useState([]);
  const [fines, setFines] = useState([]);
  useEffect(() => {
    if (user.role === "student") {
      booksAPI.getAll({}).then((res) => setAllBooks(res.data.books || []));
      finesAPI.getMyFines({}).then((res) => setFines(res.data.fines || []));
    }
  }, [user.role]);

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
        // Only show error for dashboard data, not for recommendations
        // toast.error("Failed to load dashboard data");
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [user.role]);

  // Student search
  useEffect(() => {
    if (lendModalOpen && studentSearch.length > 0) {
      axios
        .get(
          `/users/students/search?search=${encodeURIComponent(studentSearch)}`
        )
        .then((res) => setStudentResults(res.data))
        .catch(() => setStudentResults([]));
    } else {
      setStudentResults([]);
    }
  }, [studentSearch, lendModalOpen]);

  // Fetch student details
  const handleSelectStudent = (student) => {
    setSelectedStudent(student);
    setStudentDetails(null);
    setStudentDetailsLoading(true);
    setStudentDetailsError(null);
    axios
      .get(`/users/${student._id}`)
      .then((res) => {
        setStudentDetails(res.data);
        setStudentDetailsLoading(false);
      })
      .catch(() => {
        setStudentDetails(null);
        setStudentDetailsLoading(false);
        setStudentDetailsError("Failed to load student details.");
      });
  };

  // Book search
  useEffect(() => {
    if (lendBookModalOpen && bookSearch.length > 0) {
      axios
        .get(`/books/search/available?search=${encodeURIComponent(bookSearch)}`)
        .then((res) => setBookResults(res.data))
        .catch(() => setBookResults([]));
    } else {
      setBookResults([]);
    }
  }, [bookSearch, lendBookModalOpen]);

  // Lend book action
  const handleLendBook = (bookId) => {
    axios
      .post("/borrowings/lend", { studentId: selectedStudent._id, bookId })
      .then(() => {
        setLendBookModalOpen(false);
        // Refresh student details
        axios
          .get(`/users/${selectedStudent._id}`)
          .then((res) => setStudentDetails(res.data));
      });
  };

  // Return book action (for demo, not in UI yet)
  const handleReturnBook = (bookId) => {
    axios
      .post("/borrowings/return", { studentId: selectedStudent._id, bookId })
      .then(() => {
        // Refresh student details
        axios
          .get(`/users/${selectedStudent._id}`)
          .then((res) => setStudentDetails(res.data));
      });
  };

  // Book search for dropdown
  useEffect(() => {
    if (showBookDropdown && bookDropdownSearch.length > 0) {
      axios
        .get(
          `/books/search/available?search=${encodeURIComponent(
            bookDropdownSearch
          )}`
        )
        .then((res) => setBookDropdownResults(res.data))
        .catch(() => setBookDropdownResults([]));
    } else if (showBookDropdown) {
      axios
        .get(`/books/search/available`)
        .then((res) => setBookDropdownResults(res.data))
        .catch(() => setBookDropdownResults([]));
    } else {
      setBookDropdownResults([]);
    }
    setBookDropdownPage(1);
  }, [bookDropdownSearch, showBookDropdown]);

  const booksPerPage = 4;
  const pagedBooks = bookDropdownResults.slice(
    (bookDropdownPage - 1) * booksPerPage,
    bookDropdownPage * booksPerPage
  );
  const totalBookPages = Math.ceil(bookDropdownResults.length / booksPerPage);

  const handleLendBookDropdown = (bookId) => {
    axios
      .post("/borrowings/lend", { studentId: selectedStudent._id, bookId })
      .then(() => {
        setShowBookDropdown(false);
        // Refresh student details
        axios
          .get(`/users/${selectedStudent._id}`)
          .then((res) => setStudentDetails(res.data));
      });
  };

  useEffect(() => {
    if (returnModalOpen && returnStudentSearch.length > 0) {
      axios
        .get(
          `/users/students/search?search=${encodeURIComponent(
            returnStudentSearch
          )}`
        )
        .then((res) => setReturnStudentResults(res.data))
        .catch(() => setReturnStudentResults([]));
    } else if (returnModalOpen) {
      setReturnStudentResults([]);
    }
  }, [returnStudentSearch, returnModalOpen]);

  const handleReturnSelectStudent = (student) => {
    setReturnSelectedStudent(student);
    setReturnStudentDetails(null);
    setReturnStudentDetailsLoading(true);
    setReturnStudentDetailsError(null);
    axios
      .get(`/users/${student._id}`)
      .then((res) => {
        setReturnStudentDetails(res.data);
        setReturnStudentDetailsLoading(false);
      })
      .catch(() => {
        setReturnStudentDetails(null);
        setReturnStudentDetailsLoading(false);
        setReturnStudentDetailsError("Failed to load student details.");
      });
  };

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
                  <button
                    onClick={() => setLendModalOpen(true)}
                    className="btn-primary"
                  >
                    <BookOpenIcon className="mr-2 h-4 w-4" />
                    Lend Book
                  </button>
                  <button
                    className="btn-secondary"
                    onClick={() => setReturnModalOpen(true)}
                  >
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

      case "student": {
        // --- Student Dashboard: Polished UI ---
        const currentBorrowedBooks = fines
          .filter((f) => f.borrowing && f.borrowing.status !== "returned")
          .map((f) => f.borrowing?.book)
          .filter(Boolean);
        let recommended = [];
        if (allBooks.length > 0) {
          const shuffled = [...allBooks].sort(() => 0.5 - Math.random());
          recommended = shuffled.slice(0, 4);
        }
        return (
          <div className="container mx-auto px-4 py-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-6">
              Welcome, {user.firstName}!
            </h1>
            {/* My Current Borrowings */}
            <div className="bg-white rounded-lg shadow-md p-6 mb-8">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <BookOpenIcon className="h-6 w-6 text-blue-500" /> My Current
                Borrowings
              </h2>
              {currentBorrowedBooks.length === 0 ? (
                <div className="text-gray-500">
                  You have no books currently borrowed.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {currentBorrowedBooks.map((book, idx) => (
                    <div
                      key={book._id || idx}
                      className="bg-blue-50 rounded-lg p-4 flex flex-col shadow hover:shadow-lg transition"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <BookOpenIcon className="h-5 w-5 text-blue-400" />
                        <span className="font-semibold text-gray-900 truncate">
                          {book.title || "Book"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {/* Recommended Books (random from all books) */}
            <div className="bg-white rounded-lg shadow-md p-6 mb-8">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <StarIcon className="h-6 w-6 text-yellow-500" /> Recommended
                Books
              </h2>
              {recommended.length === 0 ? (
                <div className="text-gray-500">
                  No recommendations at this time.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {recommended.map((book, idx) => (
                    <div
                      key={book._id || idx}
                      className="bg-yellow-50 rounded-lg p-4 flex flex-col shadow hover:shadow-lg transition"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <StarIcon className="h-5 w-5 text-yellow-400" />
                        <span className="font-semibold text-gray-900 truncate">
                          {book.title || "Book"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        );
      }

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
                {user.role === "student"
                  ? `${user.academicCredentials.department}`
                  : ""}{" "}
                •{" "}
                {user.role === "admin"
                  ? "Administrator"
                  : user.role === "staff"
                  ? "Library Staff"
                  : `Year ${user.academicCredentials.year}`}
                {"     "}• {user.registrationNumber}
              </p>
            </div>
            <div className="text-right">
              <p className="text-blue-100">E-mail</p>
              <p className="text-3xl font-bold">{user.email}</p>
            </div>
          </div>
        </div>

        {/* Role-specific content */}
        {getRoleSpecificContent()}
      </div>
      {/* Lend Book Modal: Student Search (Full-page style) */}
      {lendModalOpen && (
        <div
          style={{
            position: "fixed",
            top: "0.5cm",
            left: "0.5cm",
            right: "0.5cm",
            bottom: "0.5cm",
            background: "var(--modal-bg, #181f2a)",
            zIndex: 1000,
            borderRadius: "16px",
            boxShadow: "0 8px 32px rgba(0,0,0,0.25)",
            padding: "2rem",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "flex-start",
            color: "#fff", // Make all text white
          }}
        >
          <h2 style={{ fontSize: "2rem", marginBottom: "1rem", color: "#fff" }}>
            Select Student
          </h2>
          <input
            value={studentSearch}
            onChange={(e) => setStudentSearch(e.target.value)}
            placeholder="Search students..."
            style={{
              width: "60%",
              padding: "0.75rem",
              fontSize: "1.1rem",
              borderRadius: "8px",
              border: "1px solid #444",
              marginBottom: "1.5rem",
              color: "#fff",
              background: "#222e3c",
            }}
          />
          <ul
            style={{
              width: "60%",
              maxHeight: "300px",
              overflowY: "auto",
              marginBottom: "2rem",
            }}
          >
            {studentResults.map((stu) => (
              <li
                key={stu._id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "0.75rem",
                  borderBottom: "1px solid #333",
                  cursor: "pointer",
                  color: "#fff",
                }}
                onClick={() => {
                  setLendModalOpen(false);
                  handleSelectStudent(stu); // Only close modal, do not reset selectedStudent
                }}
              >
                <span>
                  {stu.firstName} {stu.lastName} (
                  {stu.registrationNumber || stu.rollNumber})
                </span>
                <span
                  style={{
                    display: "flex",
                    gap: "1.5rem",
                    alignItems: "center",
                    fontSize: "0.95rem",
                  }}
                >
                  <span title="Books currently borrowed">
                    📚 {stu.borrowedBooks ? stu.borrowedBooks.length : 0}
                  </span>
                  <span title="Year">
                    {stu.academicCredentials?.year
                      ? `Year ${stu.academicCredentials.year}`
                      : ""}
                  </span>
                  <span title="Department">
                    {stu.academicCredentials?.department || ""}
                  </span>
                  <span
                    title="Status"
                    style={{
                      color: stu.isActive ? "#4ade80" : "#f87171",
                      fontWeight: 600,
                    }}
                  >
                    {stu.isActive ? "🟢 Active" : "🔴 Inactive"}
                  </span>
                </span>
              </li>
            ))}
          </ul>
          <button
            onClick={() => setLendModalOpen(false)}
            style={{
              marginTop: "auto",
              padding: "0.75rem 2rem",
              fontSize: "1.1rem",
              borderRadius: "8px",
              background: "#222e3c",
              color: "#fff",
              border: "none",
            }}
          >
            Close
          </button>
        </div>
      )}
      {/* Student Details Modal (Full-page style) */}
      {selectedStudent && (
        <div
          style={{
            position: "fixed",
            top: "0.5cm",
            left: "0.5cm",
            right: "0.5cm",
            bottom: "0.5cm",
            background: "var(--modal-bg, #181f2a)",
            zIndex: 1000,
            borderRadius: "16px",
            boxShadow: "0 8px 32px rgba(0,0,0,0.25)",
            padding: "2rem",
            display: "flex",
            flexDirection: "column",
            color: "#fff",
            overflowY: "auto",
          }}
        >
          {studentDetailsLoading && (
            <div
              style={{
                textAlign: "center",
                width: "100%",
                marginTop: "4rem",
                fontSize: "1.5rem",
              }}
            >
              Loading student details...
            </div>
          )}
          {studentDetailsError && (
            <div
              style={{
                color: "#f87171",
                textAlign: "center",
                width: "100%",
                marginTop: "4rem",
                fontSize: "1.2rem",
              }}
            >
              {studentDetailsError}
            </div>
          )}
          {studentDetails && (
            <>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  width: "100%",
                }}
              >
                <div>
                  <h2 style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>
                    {studentDetails.firstName} {studentDetails.lastName}
                  </h2>
                  <div style={{ marginBottom: "0.5rem" }}>
                    <span style={{ marginRight: "1.5rem" }}>
                      Reg#:{" "}
                      <b>
                        {studentDetails.registrationNumber ||
                          studentDetails.rollNumber}
                      </b>
                    </span>
                    <span style={{ marginRight: "1.5rem" }}>
                      Year:{" "}
                      <b>{studentDetails.academicCredentials?.year || "-"}</b>
                    </span>
                    <span style={{ marginRight: "1.5rem" }}>
                      Dept:{" "}
                      <b>
                        {studentDetails.academicCredentials?.department || "-"}
                      </b>
                    </span>
                    <span>
                      Status:{" "}
                      <b
                        style={{
                          color: studentDetails.isActive
                            ? "#4ade80"
                            : "#f87171",
                        }}
                      >
                        {studentDetails.isActive ? "🟢 Active" : "🔴 Inactive"}
                      </b>
                    </span>
                  </div>
                  <div style={{ marginBottom: "0.5rem" }}>
                    <span style={{ marginRight: "1.5rem" }}>
                      Email: <b>{studentDetails.email}</b>
                    </span>
                    <span>
                      Phone: <b>{studentDetails.phone || "-"}</b>
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setSelectedStudent(null);
                    setStudentDetails(null);
                  }}
                  style={{
                    padding: "0.5rem 1.5rem",
                    fontSize: "1.1rem",
                    borderRadius: "8px",
                    background: "#222e3c",
                    color: "#fff",
                    border: "none",
                  }}
                >
                  Close
                </button>
              </div>
              <hr style={{ border: "1px solid #333", margin: "1.5rem 0" }} />
              {/* Stats */}
              <div
                style={{ display: "flex", gap: "2.5rem", marginBottom: "2rem" }}
              >
                <div
                  style={{
                    background: "#222e3c",
                    borderRadius: "10px",
                    padding: "1.2rem 2.5rem",
                    minWidth: "180px",
                    textAlign: "center",
                  }}
                >
                  <div style={{ fontSize: "1.2rem", marginBottom: "0.3rem" }}>
                    Total Borrowed
                  </div>
                  <div style={{ fontSize: "2rem", fontWeight: 700 }}>
                    {studentDetails.totalBooksBorrowed || 0}
                  </div>
                </div>
                <div
                  style={{
                    background: "#222e3c",
                    borderRadius: "10px",
                    padding: "1.2rem 2.5rem",
                    minWidth: "180px",
                    textAlign: "center",
                  }}
                >
                  <div style={{ fontSize: "1.2rem", marginBottom: "0.3rem" }}>
                    Currently Borrowed
                  </div>
                  <div style={{ fontSize: "2rem", fontWeight: 700 }}>
                    {studentDetails.currentlyBorrowedCount || 0}
                  </div>
                </div>
                <div
                  style={{
                    background: "#222e3c",
                    borderRadius: "10px",
                    padding: "1.2rem 2.5rem",
                    minWidth: "180px",
                    textAlign: "center",
                  }}
                >
                  <div style={{ fontSize: "1.2rem", marginBottom: "0.3rem" }}>
                    Fines Paid
                  </div>
                  <div style={{ fontSize: "2rem", fontWeight: 700 }}>
                    {studentDetails.totalFinesPaid || 0}
                  </div>
                </div>
                <div
                  style={{
                    background: "#f87171",
                    borderRadius: "10px",
                    padding: "1.2rem 2.5rem",
                    minWidth: "180px",
                    textAlign: "center",
                    color: "#fff",
                  }}
                >
                  <div style={{ fontSize: "1.2rem", marginBottom: "0.3rem" }}>
                    Current Fines
                  </div>
                  <div style={{ fontSize: "2rem", fontWeight: 700 }}>
                    ₹{studentDetails.currentFines || 0}
                  </div>
                </div>
              </div>
              {/* Borrowed Books */}
              <div style={{ marginBottom: "2rem" }}>
                <h3 style={{ fontSize: "1.3rem", marginBottom: "0.7rem" }}>
                  Currently Borrowed Books
                </h3>
                <ul
                  style={{
                    background: "#232b39",
                    borderRadius: "8px",
                    padding: "1rem",
                    minHeight: "60px",
                  }}
                >
                  {studentDetails.borrowedBooks &&
                  studentDetails.borrowedBooks.filter((b) => !b.returnedAt)
                    .length > 0 ? (
                    studentDetails.borrowedBooks
                      .filter((b) => !b.returnedAt)
                      .map((b) => (
                        <li
                          key={b.bookId}
                          style={{
                            marginBottom: "0.7rem",
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                          }}
                        >
                          <span>
                            <b>{b.title}</b> (ISBN: {b.isbn})<br />
                            Borrowed: {new Date(b.borrowedAt).toLocaleString()}
                            <br />
                            Due: {new Date(b.dueAt).toLocaleString()}
                          </span>
                          <span
                            style={{
                              color: b.fineAccrued > 0 ? "#f87171" : "#4ade80",
                              fontWeight: 600,
                            }}
                          >
                            Fine: ₹{b.fineAccrued || 0}
                          </span>
                        </li>
                      ))
                  ) : (
                    <li>No books currently borrowed.</li>
                  )}
                </ul>
              </div>
              {/* Returned Books */}
              <div>
                <h3 style={{ fontSize: "1.3rem", marginBottom: "0.7rem" }}>
                  Returned Books
                </h3>
                <ul
                  style={{
                    background: "#232b39",
                    borderRadius: "8px",
                    padding: "1rem",
                    minHeight: "60px",
                  }}
                >
                  {studentDetails.borrowedBooks &&
                  studentDetails.borrowedBooks.filter((b) => b.returnedAt)
                    .length > 0 ? (
                    studentDetails.borrowedBooks
                      .filter((b) => b.returnedAt)
                      .map((b) => (
                        <li
                          key={b.bookId}
                          style={{
                            marginBottom: "0.7rem",
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                          }}
                        >
                          <span>
                            <b>{b.title}</b> (ISBN: {b.isbn})<br />
                            Borrowed: {new Date(b.borrowedAt).toLocaleString()}
                            <br />
                            Returned: {new Date(b.returnedAt).toLocaleString()}
                          </span>
                          <span style={{ color: "#4ade80", fontWeight: 600 }}>
                            Fine Paid: ₹{b.fineAccrued || 0}
                          </span>
                        </li>
                      ))
                  ) : (
                    <li>No books returned yet.</li>
                  )}
                </ul>
              </div>
              {/* Book Lending Dropdown */}
              <div style={{ width: "100%", marginTop: "1.5rem" }}>
                <button
                  onClick={() => setShowBookDropdown((v) => !v)}
                  style={{
                    padding: "0.7rem 2rem",
                    fontSize: "1.1rem",
                    borderRadius: "8px",
                    background: "#2563eb",
                    color: "#fff",
                    border: "none",
                    marginBottom: "1rem",
                  }}
                >
                  {showBookDropdown ? "Close Book Lend" : "Lend New Book"}
                </button>
                {showBookDropdown && (
                  <div
                    style={{
                      background: "#232b39",
                      borderRadius: "10px",
                      padding: "1.5rem",
                      marginTop: "0.5rem",
                    }}
                  >
                    <input
                      value={bookDropdownSearch}
                      onChange={(e) => setBookDropdownSearch(e.target.value)}
                      placeholder="Search books..."
                      style={{
                        width: "60%",
                        padding: "0.75rem",
                        fontSize: "1.1rem",
                        borderRadius: "8px",
                        border: "1px solid #444",
                        marginBottom: "1.5rem",
                        color: "#fff",
                        background: "#181f2a",
                      }}
                    />
                    <div
                      style={{
                        display: "flex",
                        flexWrap: "nowrap",
                        gap: "1.5rem",
                        marginBottom: "1.5rem",
                        minHeight: "320px",
                        justifyContent: "flex-start",
                      }}
                    >
                      {pagedBooks.length > 0 ? (
                        pagedBooks.map((book) => (
                          <div
                            key={book._id}
                            style={{
                              background: "#181f2a",
                              borderRadius: "12px",
                              boxShadow: "0 2px 8px rgba(0,0,0,0.18)",
                              padding: "1.2rem",
                              minWidth: "240px",
                              maxWidth: "260px",
                              width: "260px",
                              color: "#fff",
                              display: "flex",
                              flexDirection: "column",
                              justifyContent: "space-between",
                              alignItems: "stretch",
                              position: "relative",
                              height: "450px",
                            }}
                          >
                            {book.coverImage && (
                              <img
                                src={book.coverImage}
                                alt={book.title}
                                style={{
                                  width: "100%",
                                  height: "140px",
                                  objectFit: "cover",
                                  borderRadius: "8px",
                                  marginBottom: "0.7rem",
                                  background: "#232b39",
                                }}
                              />
                            )}
                            <div
                              style={{
                                flex: 1,
                                display: "flex",
                                flexDirection: "column",
                                justifyContent: "flex-start",
                              }}
                            >
                              <h4
                                style={{
                                  margin: 0,
                                  fontSize: "1.13rem",
                                  fontWeight: 700,
                                  color: "#fff",
                                  marginBottom: "0.35rem",
                                  lineHeight: "1.2",
                                  textAlign: "left",
                                  wordBreak: "break-word",
                                }}
                              >
                                {book.title}
                              </h4>
                              <p
                                style={{
                                  margin: 0,
                                  fontSize: "1rem",
                                  color: "#a5b4fc",
                                  marginBottom: "0.25rem",
                                  textAlign: "left",
                                  wordBreak: "break-word",
                                }}
                              >
                                {book.author}
                              </p>
                              <p
                                style={{
                                  margin: 0,
                                  fontSize: "0.97rem",
                                  color: "#cbd5e1",
                                  textAlign: "left",
                                  wordBreak: "break-word",
                                }}
                              >
                                ISBN: {book.isbn}
                              </p>
                            </div>
                            <div
                              style={{
                                display: "flex",
                                flex: 1,
                                flexDirection: "column",
                                justifyContent: "flex-end",
                              }}
                            >
                              <button
                                onClick={() => handleLendBookDropdown(book._id)}
                                style={{
                                  marginTop: "1.1rem",
                                  padding: "0.6rem 1.4rem",
                                  borderRadius: "7px",
                                  background: "#4ade80",
                                  color: "#181f2a",
                                  border: "none",
                                  fontWeight: 700,
                                  fontSize: "1.05rem",
                                  alignSelf: "stretch",
                                  marginBottom: 0,
                                }}
                              >
                                Lend
                              </button>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div style={{ color: "#f87171", fontSize: "1.1rem" }}>
                          No books found.
                        </div>
                      )}
                      {/* Add placeholder cards for alignment if less than 4 books */}
                      {pagedBooks.length > 0 &&
                        pagedBooks.length < 4 &&
                        Array.from({ length: 4 - pagedBooks.length }).map(
                          (_, i) => (
                            <div
                              key={`placeholder-${i}`}
                              style={{
                                minWidth: "240px",
                                maxWidth: "260px",
                                width: "240px",
                                background: "transparent",
                                boxShadow: "none",
                                height: "400px",
                              }}
                            />
                          )
                        )}
                    </div>
                    {/* Pagination: <, page number, > */}
                    {totalBookPages > 1 && (
                      <div
                        style={{
                          display: "flex",
                          gap: "0.7rem",
                          justifyContent: "center",
                          alignItems: "center",
                          marginTop: "2.5rem",
                        }}
                      >
                        <button
                          onClick={() =>
                            setBookDropdownPage(bookDropdownPage - 1)
                          }
                          disabled={bookDropdownPage === 1}
                          style={{
                            padding: "0.4rem 1.1rem",
                            borderRadius: "6px",
                            background:
                              bookDropdownPage === 1 ? "#222e3c" : "#2563eb",
                            color: "#fff",
                            border: "none",
                            fontWeight: 600,
                            fontSize: "1.2rem",
                            cursor:
                              bookDropdownPage === 1
                                ? "not-allowed"
                                : "pointer",
                            opacity: bookDropdownPage === 1 ? 0.5 : 1,
                            display: "flex",
                            alignItems: "center",
                            width: "44px",
                            justifyContent: "center",
                          }}
                        >
                          <span style={{ fontSize: "1.3rem" }}>&lt;</span>
                        </button>
                        <span
                          style={{
                            fontSize: "1.1rem",
                            fontWeight: 600,
                            color: "#fff",
                            padding: "0.4rem 1.1rem",
                            background: "#2563eb",
                            borderRadius: "6px",
                            width: "44px",
                            textAlign: "center",
                            display: "inline-block",
                          }}
                        >
                          {bookDropdownPage}
                        </span>
                        <button
                          onClick={() =>
                            setBookDropdownPage(bookDropdownPage + 1)
                          }
                          disabled={bookDropdownPage === totalBookPages}
                          style={{
                            padding: "0.4rem 1.1rem",
                            borderRadius: "6px",
                            background:
                              bookDropdownPage === totalBookPages
                                ? "#222e3c"
                                : "#2563eb",
                            color: "#fff",
                            border: "none",
                            fontWeight: 600,
                            fontSize: "1.2rem",
                            cursor:
                              bookDropdownPage === totalBookPages
                                ? "not-allowed"
                                : "pointer",
                            opacity:
                              bookDropdownPage === totalBookPages ? 0.5 : 1,
                            display: "flex",
                            alignItems: "center",
                            width: "44px",
                            justifyContent: "center",
                          }}
                        >
                          <span style={{ fontSize: "1.3rem" }}>&gt;</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}
      {/* Lend New Book Modal */}
      {lendBookModalOpen && (
        <div className="modal">
          <h2>Select Book to Lend</h2>
          <input
            value={bookSearch}
            onChange={(e) => setBookSearch(e.target.value)}
            placeholder="Search books..."
          />
          <div>
            {bookResults.map((book) => (
              <div key={book._id} className="book-card">
                <h4>{book.title}</h4>
                <p>{book.author}</p>
                <p>ISBN: {book.isbn}</p>
                <button onClick={() => handleLendBook(book._id)}>Lend</button>
              </div>
            ))}
          </div>
          <button onClick={() => setLendBookModalOpen(false)}>Close</button>
        </div>
      )}
      {/* Process Return Modal */}
      {returnModalOpen && (
        <div
          style={{
            position: "fixed",
            top: "0.5cm",
            left: "0.5cm",
            right: "0.5cm",
            bottom: "0.5cm",
            background: "var(--modal-bg, #181f2a)",
            zIndex: 1000,
            borderRadius: "16px",
            boxShadow: "0 8px 32px rgba(0,0,0,0.25)",
            padding: "2rem",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "flex-start",
            color: "#fff",
          }}
        >
          <h2 style={{ fontSize: "2rem", marginBottom: "1rem", color: "#fff" }}>
            Process Book Return
          </h2>
          {/* Student Search */}
          {!returnSelectedStudent && (
            <>
              <input
                value={returnStudentSearch}
                onChange={(e) => setReturnStudentSearch(e.target.value)}
                placeholder="Search students..."
                style={{
                  width: "60%",
                  padding: "0.75rem",
                  fontSize: "1.1rem",
                  borderRadius: "8px",
                  border: "1px solid #444",
                  marginBottom: "1.5rem",
                  color: "#fff",
                  background: "#222e3c",
                }}
              />
              <ul
                style={{
                  width: "60%",
                  maxHeight: "300px",
                  overflowY: "auto",
                  marginBottom: "2rem",
                }}
              >
                {returnStudentResults.map((stu) => (
                  <li
                    key={stu._id}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "0.75rem",
                      borderBottom: "1px solid #333",
                      cursor: "pointer",
                      color: "#fff",
                    }}
                    onClick={() => handleReturnSelectStudent(stu)}
                  >
                    <span>
                      {stu.firstName} {stu.lastName} (
                      {stu.registrationNumber || stu.rollNumber})
                    </span>
                    <span
                      style={{
                        display: "flex",
                        gap: "1.5rem",
                        alignItems: "center",
                        fontSize: "0.95rem",
                      }}
                    >
                      <span title="Books currently borrowed">
                        📚 {stu.borrowedBooks ? stu.borrowedBooks.length : 0}
                      </span>
                      <span title="Year">
                        {stu.academicCredentials?.year
                          ? `Year ${stu.academicCredentials.year}`
                          : ""}
                      </span>
                      <span title="Department">
                        {stu.academicCredentials?.department || ""}
                      </span>
                      <span
                        title="Status"
                        style={{
                          color: stu.isActive ? "#4ade80" : "#f87171",
                          fontWeight: 600,
                        }}
                      >
                        {stu.isActive ? "🟢 Active" : "🔴 Inactive"}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            </>
          )}
          {/* Student Profile and Borrowed Books Dropdown */}
          {returnSelectedStudent && (
            <>
              {returnStudentDetailsLoading ? (
                <div
                  style={{
                    textAlign: "center",
                    width: "100%",
                    marginTop: "2rem",
                    fontSize: "1.5rem",
                  }}
                >
                  Loading student details...
                </div>
              ) : returnStudentDetailsError ? (
                <div
                  style={{
                    color: "#f87171",
                    textAlign: "center",
                    width: "100%",
                    marginTop: "2rem",
                    fontSize: "1.2rem",
                  }}
                >
                  {returnStudentDetailsError}
                </div>
              ) : returnStudentDetails ? (
                <>
                  <div style={{ width: "100%", marginBottom: "1.5rem" }}>
                    <h3 style={{ fontSize: "1.3rem", marginBottom: "0.7rem" }}>
                      {returnStudentDetails.firstName}{" "}
                      {returnStudentDetails.lastName} (
                      {returnStudentDetails.registrationNumber ||
                        returnStudentDetails.rollNumber}
                      )
                    </h3>
                    <div style={{ marginBottom: "0.5rem" }}>
                      <span style={{ marginRight: "1.5rem" }}>
                        Year:{" "}
                        <b>
                          {returnStudentDetails.academicCredentials?.year ||
                            "-"}
                        </b>
                      </span>
                      <span style={{ marginRight: "1.5rem" }}>
                        Dept:{" "}
                        <b>
                          {returnStudentDetails.academicCredentials
                            ?.department || "-"}
                        </b>
                      </span>
                      <span>
                        Status:{" "}
                        <b
                          style={{
                            color: returnStudentDetails.isActive
                              ? "#4ade80"
                              : "#f87171",
                          }}
                        >
                          {returnStudentDetails.isActive
                            ? "🟢 Active"
                            : "🔴 Inactive"}
                        </b>
                      </span>
                    </div>
                    <div style={{ marginBottom: "0.5rem" }}>
                      <span style={{ marginRight: "1.5rem" }}>
                        Email: <b>{returnStudentDetails.email}</b>
                      </span>
                      <span>
                        Phone: <b>{returnStudentDetails.phone || "-"}</b>
                      </span>
                    </div>
                  </div>
                  {/* Dropdown of currently borrowed books */}
                  <div style={{ width: "100%", marginBottom: "1.5rem" }}>
                    <label
                      htmlFor="return-book-dropdown"
                      style={{
                        fontWeight: 600,
                        marginBottom: "0.5rem",
                        display: "block",
                      }}
                    >
                      Select Book to Return
                    </label>
                    <select
                      id="return-book-dropdown"
                      value={returnSelectedBookId}
                      onChange={(e) => setReturnSelectedBookId(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "0.75rem",
                        fontSize: "1.1rem",
                        borderRadius: "8px",
                        border: "1px solid #444",
                        marginBottom: "1rem",
                        color: "#222e3c",
                        background: "#fff",
                      }}
                    >
                      <option value="">Select a book</option>
                      {returnStudentDetails.borrowedBooks &&
                        returnStudentDetails.borrowedBooks
                          .filter((b) => !b.returnedAt)
                          .map((b) => (
                            <option key={b.bookId} value={b.bookId}>
                              {b.title} (ISBN: {b.isbn}) - Fine: ₹
                              {b.fineAccrued || 0}
                            </option>
                          ))}
                    </select>
                  </div>
                  <button
                    style={{
                      padding: "0.75rem 2rem",
                      fontSize: "1.1rem",
                      borderRadius: "8px",
                      background: "#4ade80",
                      color: "#181f2a",
                      border: "none",
                      fontWeight: 700,
                      marginBottom: "1rem",
                    }}
                    // TODO: Add return logic here
                  >
                    Return
                  </button>
                  <button
                    onClick={() => {
                      setReturnSelectedStudent(null);
                      setReturnStudentDetails(null);
                      setReturnSelectedBookId("");
                    }}
                    style={{
                      marginTop: 0,
                      padding: "0.75rem 2rem",
                      fontSize: "1.1rem",
                      borderRadius: "8px",
                      background: "#222e3c",
                      color: "#fff",
                      border: "none",
                    }}
                  >
                    Back
                  </button>
                </>
              ) : null}
            </>
          )}
          <button
            onClick={() => setReturnModalOpen(false)}
            style={{
              marginTop: "auto",
              padding: "0.75rem 2rem",
              fontSize: "1.1rem",
              borderRadius: "8px",
              background: "#222e3c",
              color: "#fff",
              border: "none",
            }}
          >
            Close
          </button>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
