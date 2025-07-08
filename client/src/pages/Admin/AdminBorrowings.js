import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  CalendarIcon,
  UserIcon,
  BookOpenIcon,
} from "@heroicons/react/24/outline";
import { adminAPI } from "../../services/api";
import { toast } from "react-hot-toast";

const AdminBorrowings = () => {
  const [borrowings, setBorrowings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0,
  });

  // Filter states
  const [filters, setFilters] = useState({
    staffId: "",
    studentId: "",
    bookName: "",
    startDate: "",
    endDate: "",
  });

  // Fetch borrowings
  const fetchBorrowings = async (page = 1) => {
    try {
      setLoading(true);
      const params = {
        page,
        limit: pagination.limit,
        ...filters,
      };

      const response = await adminAPI.getBorrowings(params);

      // Check if response indicates session expired
      if (response.error === "session_expired") {
        return; // Let the global handler show the popup
      }

      setBorrowings(
        Array.isArray(response.data?.borrowings) ? response.data.borrowings : []
      );
      setPagination(
        response.data?.pagination || { page: 1, limit: 20, total: 0, pages: 1 }
      );
    } catch (error) {
      console.error("Error fetching borrowings:", error);

      // Check if it's a session expired error
      const isSessionExpired =
        error.response?.status === 401 &&
        error.response?.data?.message
          ?.toLowerCase()
          .includes("session expired");

      if (isSessionExpired) {
        // Don't show error toast for session expired - let global handler show popup
        return;
      }

      toast.error("Failed to load borrowings");
      setBorrowings([]);
      setPagination({ page: 1, limit: 20, total: 0, pages: 1 });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBorrowings();
  }, [filters]);

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({
      staffId: "",
      studentId: "",
      bookName: "",
      startDate: "",
      endDate: "",
    });
  };

  const getStatusColor = (borrowing) => {
    if (borrowing.returnedAt) return "bg-green-100 text-green-800";
    if (new Date(borrowing.dueDate) < new Date())
      return "bg-red-100 text-red-800";
    return "bg-blue-100 text-blue-800";
  };

  const getStatusText = (borrowing) => {
    if (borrowing.returnedAt) return "Returned";
    if (new Date(borrowing.dueDate) < new Date()) return "Overdue";
    return "Active";
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Borrowing Logs</h1>
          <p className="text-gray-600 mt-2">
            Monitor all lending activities across the library
          </p>
        </div>

        {/* Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-lg shadow-sm border p-6 mb-6"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <FunnelIcon className="h-5 w-5 mr-2" />
              Filters
            </h3>
            <button
              onClick={clearFilters}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Clear all
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Staff ID
              </label>
              <input
                type="text"
                value={filters.staffId}
                onChange={(e) => handleFilterChange("staffId", e.target.value)}
                placeholder="Search by staff ID..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Student ID
              </label>
              <input
                type="text"
                value={filters.studentId}
                onChange={(e) =>
                  handleFilterChange("studentId", e.target.value)
                }
                placeholder="Search by student ID..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Book Name
              </label>
              <input
                type="text"
                value={filters.bookName}
                onChange={(e) => handleFilterChange("bookName", e.target.value)}
                placeholder="Search by book name..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start Date
              </label>
              <input
                type="date"
                value={filters.startDate}
                onChange={(e) =>
                  handleFilterChange("startDate", e.target.value)
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                End Date
              </label>
              <input
                type="date"
                value={filters.endDate}
                onChange={(e) => handleFilterChange("endDate", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </motion.div>

        {/* Borrowings Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-lg shadow-sm border overflow-hidden"
        >
          <div className="px-6 py-4 border-b">
            <h3 className="text-lg font-semibold text-gray-900">
              Borrowing Records ({pagination.total})
            </h3>
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Book Details
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Student
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Staff
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Dates
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {borrowings.map((borrowing) => (
                    <motion.tr
                      key={borrowing._id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="hover:bg-gray-50"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10">
                            <img
                              className="h-10 w-10 rounded-lg object-cover"
                              src={
                                borrowing.book?.coverImage ||
                                "https://via.placeholder.com/40x40/4A90E2/FFFFFF?text=B"
                              }
                              alt=""
                            />
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {borrowing.book?.title}
                            </div>
                            <div className="text-sm text-gray-500">
                              {borrowing.book?.author}
                            </div>
                            <div className="text-xs text-gray-400">
                              ISBN: {borrowing.book?.isbn}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {borrowing.student?.firstName}{" "}
                          {borrowing.student?.lastName}
                        </div>
                        <div className="text-sm text-gray-500">
                          {borrowing.student?.registrationNumber}
                        </div>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {borrowing.lentBy?.firstName}{" "}
                          {borrowing.lentBy?.lastName}
                        </div>
                        <div className="text-sm text-gray-500">
                          Staff ID: {borrowing.lentBy?._id}
                        </div>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          <div className="flex items-center">
                            <CalendarIcon className="h-4 w-4 mr-1" />
                            Borrowed:{" "}
                            {new Date(
                              borrowing.borrowedAt
                            ).toLocaleDateString()}
                          </div>
                          <div className="flex items-center mt-1">
                            <CalendarIcon className="h-4 w-4 mr-1" />
                            Due:{" "}
                            {new Date(borrowing.dueDate).toLocaleDateString()}
                          </div>
                          {borrowing.returnedAt && (
                            <div className="flex items-center mt-1 text-green-600">
                              <CalendarIcon className="h-4 w-4 mr-1" />
                              Returned:{" "}
                              {new Date(
                                borrowing.returnedAt
                              ).toLocaleDateString()}
                            </div>
                          )}
                        </div>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(
                            borrowing
                          )}`}
                        >
                          {getStatusText(borrowing)}
                        </span>
                        {new Date(borrowing.dueDate) < new Date() &&
                          !borrowing.returnedAt && (
                            <div className="text-xs text-red-600 mt-1">
                              {Math.ceil(
                                (new Date() - new Date(borrowing.dueDate)) /
                                  (1000 * 60 * 60 * 24)
                              )}{" "}
                              days overdue
                            </div>
                          )}
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="px-6 py-4 border-t">
              <div className="flex justify-between items-center">
                <div className="text-sm text-gray-700">
                  Showing {(pagination.page - 1) * pagination.limit + 1} to{" "}
                  {Math.min(
                    pagination.page * pagination.limit,
                    pagination.total
                  )}{" "}
                  of {pagination.total} results
                </div>
                <div className="flex space-x-2">
                  {Array.from(
                    { length: pagination.pages },
                    (_, i) => i + 1
                  ).map((page) => (
                    <button
                      key={page}
                      onClick={() => fetchBorrowings(page)}
                      className={`px-3 py-2 rounded-lg text-sm ${
                        page === pagination.page
                          ? "bg-blue-600 text-white"
                          : "bg-white text-gray-700 border hover:bg-gray-50"
                      }`}
                    >
                      {page}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default AdminBorrowings;
