import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
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
  MagnifyingGlassIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '../../context/AuthContext';
import { borrowingsAPI, finesAPI, notificationsAPI, aiAPI } from '../../services/api';

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
        if (user.role === 'student') {
          const [borrowingsRes, finesRes, notificationsRes, recommendationsRes] = await Promise.all([
            borrowingsAPI.getMyBorrowings({ limit: 5 }),
            finesAPI.getMyFines({ limit: 5 }),
            notificationsAPI.getAll({ limit: 5, read: false }),
            aiAPI.getRecommendations(5, 'general')
          ]);

          setRecentBorrowings(borrowingsRes.data.borrowings || []);
          setStats({
            currentBorrowings: borrowingsRes.data.total || 0,
            totalFines: finesRes.data.total || 0,
            unreadNotifications: notificationsRes.data.unreadCount || 0
          });
          setUnreadNotifications(notificationsRes.data.notifications || []);
          setRecommendations(recommendationsRes.data || []);
        } else {
          // Admin/Staff dashboard
          const [borrowingsRes, overdueRes, notificationsRes] = await Promise.all([
            borrowingsAPI.getAll({ limit: 10 }),
            borrowingsAPI.getOverdue({ limit: 10 }),
            notificationsAPI.getAll({ limit: 10 })
          ]);

          setRecentBorrowings(borrowingsRes.data.borrowings || []);
          setOverdueBooks(overdueRes.data.borrowings || []);
          setUnreadNotifications(notificationsRes.data.notifications || []);
          setStats({
            totalBorrowings: borrowingsRes.data.total || 0,
            overdueBooks: overdueRes.data.total || 0,
            unreadNotifications: notificationsRes.data.unreadCount || 0
          });
        }
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [user.role]);

  const getRoleSpecificContent = () => {
    switch (user.role) {
      case 'admin':
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
                      <div key={borrowing._id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {borrowing.book?.title}
                          </p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {borrowing.student?.firstName} {borrowing.student?.lastName}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            Due: {new Date(borrowing.dueDate).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 dark:text-gray-400">No recent borrowings</p>
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
                  Overdue Books
                </h3>
              </div>
              <div className="card-body">
                {overdueBooks.length > 0 ? (
                  <div className="space-y-3">
                    {overdueBooks.map((borrowing) => (
                      <div key={borrowing._id} className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {borrowing.book?.title}
                          </p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {borrowing.student?.firstName} {borrowing.student?.lastName}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-red-600 dark:text-red-400">
                            {Math.ceil((new Date() - new Date(borrowing.dueDate)) / (1000 * 60 * 60 * 24))} days overdue
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 dark:text-gray-400">No overdue books</p>
                )}
              </div>
            </motion.div>
          </div>
        );

      case 'staff':
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
                      <div key={borrowing._id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {borrowing.book?.title}
                          </p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {borrowing.student?.firstName} {borrowing.student?.lastName}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            Due: {new Date(borrowing.dueDate).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 dark:text-gray-400">No recent borrowings</p>
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

      case 'student':
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
                      <div key={borrowing._id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
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
                            Due: {new Date(borrowing.dueDate).toLocaleDateString()}
                          </p>
                          {new Date(borrowing.dueDate) < new Date() && (
                            <p className="text-sm text-red-600 dark:text-red-400">Overdue</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 dark:text-gray-400">No current borrowings</p>
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
                      <div key={book._id} className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
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
                            {book.averageRating?.toFixed(1) || 'N/A'}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 dark:text-gray-400">No recommendations available</p>
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
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <BookOpenIcon className="h-8 w-8 text-blue-600" />
              <span className="ml-2 text-xl font-bold text-gray-900">Student Dashboard</span>
            </div>
            <div className="flex items-center space-x-4">
              <button className="relative p-2 text-gray-600 hover:text-gray-900">
                <BellIcon className="h-6 w-6" />
                {unreadNotifications.length > 0 && (
                  <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                    {unreadNotifications.length}
                  </span>
                )}
              </button>
              <div className="flex items-center space-x-2">
                <UserIcon className="h-6 w-6 text-gray-600" />
                <span className="text-gray-900 font-medium">{user.firstName} {user.lastName}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl p-6 mb-8 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold mb-2">Welcome back, {user.firstName}!</h1>
              <p className="text-blue-100">
                {user.department} • Year {user.year} • {user.registrationNumber}
              </p>
            </div>
            <div className="text-right">
              <p className="text-blue-100">Reading Streak</p>
              <p className="text-3xl font-bold">{stats.readingStreak || 0} days</p>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Link 
            to="/books" 
            className="bg-white p-4 rounded-lg shadow-sm border hover:shadow-md transition-shadow flex items-center space-x-3"
          >
            <MagnifyingGlassIcon className="h-6 w-6 text-blue-600" />
            <span className="font-medium">Search Books</span>
          </Link>
          <Link 
            to="/my-books" 
            className="bg-white p-4 rounded-lg shadow-sm border hover:shadow-md transition-shadow flex items-center space-x-3"
          >
            <BookOpenIcon className="h-6 w-6 text-green-600" />
            <span className="font-medium">My Books</span>
          </Link>
          <Link 
            to="/borrowings" 
            className="bg-white p-4 rounded-lg shadow-sm border hover:shadow-md transition-shadow flex items-center space-x-3"
          >
            <ClockIcon className="h-6 w-6 text-orange-600" />
            <span className="font-medium">Borrowings</span>
          </Link>
          <Link 
            to="/fines" 
            className="bg-white p-4 rounded-lg shadow-sm border hover:shadow-md transition-shadow flex items-center space-x-3"
          >
            <ExclamationTriangleIcon className="h-6 w-6 text-red-600" />
            <span className="font-medium">Fines</span>
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white p-6 rounded-lg shadow-sm border">
                <div className="flex items-center">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <BookOpenIcon className="h-6 w-6 text-blue-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Books Borrowed</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.currentBorrowings || stats.totalBorrowings || 0}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow-sm border">
                <div className="flex items-center">
                  <div className="p-2 bg-red-100 rounded-lg">
                    <ExclamationTriangleIcon className="h-6 w-6 text-red-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Overdue</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.overdueBooks || 0}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow-sm border">
                <div className="flex items-center">
                  <div className="p-2 bg-yellow-100 rounded-lg">
                    <ChartBarIcon className="h-6 w-6 text-yellow-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Total Fines</p>
                    <p className="text-2xl font-bold text-gray-900">${stats.totalFines || 0}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-white rounded-lg shadow-sm border">
              <div className="p-6 border-b">
                <h2 className="text-lg font-semibold text-gray-900">Recent Activity</h2>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  {recentBorrowings.map((borrowing) => (
                    <div key={borrowing._id} className="flex items-center space-x-4">
                      <div className={`p-2 rounded-full ${
                        borrowing.dueDate ? 'bg-green-100' : 'bg-red-100'
                      }`}>
                        {borrowing.dueDate ? <BookOpenIcon className="h-4 w-4 text-green-600" /> : <ExclamationTriangleIcon className="h-4 w-4 text-red-600" />}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">
                          {borrowing.book?.title}
                        </p>
                        <p className="text-sm text-gray-500">{new Date(borrowing.dueDate).toLocaleDateString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* AI Recommendations */}
            <div className="bg-white rounded-lg shadow-sm border">
              <div className="p-6 border-b">
                <h2 className="text-lg font-semibold text-gray-900">AI-Powered Recommendations</h2>
                <p className="text-sm text-gray-600 mt-1">Based on your reading history and preferences</p>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {recommendations.map((book) => (
                    <div key={book._id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                      <div className="flex space-x-3">
                        <img 
                          src={book.cover} 
                          alt={book.title}
                          className="w-16 h-24 object-cover rounded"
                        />
                        <div className="flex-1">
                          <h3 className="font-medium text-gray-900 text-sm">{book.title}</h3>
                          <p className="text-sm text-gray-600">{book.author}</p>
                          <p className="text-xs text-gray-500 mt-1">{book.reason}</p>
                          <button className="mt-2 text-xs text-blue-600 hover:text-blue-700">
                            View Details →
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Notifications */}
            <div className="bg-white rounded-lg shadow-sm border">
              <div className="p-4 border-b">
                <h3 className="text-lg font-semibold text-gray-900">Notifications</h3>
              </div>
              <div className="p-4">
                <div className="space-y-3">
                  {unreadNotifications.map((notification) => (
                    <div key={notification._id} className={`p-3 rounded-lg ${
                      notification.read ? 'bg-gray-50' : 'bg-blue-50'
                    }`}>
                      <p className="text-sm text-gray-900">{notification.title}</p>
                      <p className="text-xs text-gray-500 mt-1">{notification.message}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Reading Stats</h3>
              <div className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Books this month</span>
                  <span className="font-medium">3</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Average rating</span>
                  <span className="font-medium">4.2 ⭐</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Favorites</span>
                  <span className="font-medium">8</span>
                </div>
              </div>
            </div>

            {/* Upcoming Deadlines */}
            <div className="bg-white rounded-lg shadow-sm border">
              <div className="p-4 border-b">
                <h3 className="text-lg font-semibold text-gray-900">Upcoming Deadlines</h3>
              </div>
              <div className="p-4">
                <div className="space-y-3">
                  {recentBorrowings.map((borrowing) => (
                    <div key={borrowing._id} className="flex items-center space-x-3">
                      <div className={`p-2 rounded-full ${
                        new Date(borrowing.dueDate) < new Date() ? 'bg-red-100' : 'bg-green-100'
                      }`}>
                        {new Date(borrowing.dueDate) < new Date() ? <ExclamationTriangleIcon className="h-4 w-4 text-red-600" /> : <BookOpenIcon className="h-4 w-4 text-green-600" />}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">
                          {borrowing.book?.title}
                        </p>
                        <p className="text-xs text-gray-500">
                          {new Date(borrowing.dueDate).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard; 