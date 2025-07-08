import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  UserIcon,
  CurrencyDollarIcon,
  CalendarIcon,
} from "@heroicons/react/24/outline";
import { adminAPI } from "../../services/api";
import { toast } from "react-hot-toast";

const AdminFines = () => {
  const [fines, setFines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0,
  });

  // Filter states
  const [filters, setFilters] = useState({
    studentId: "",
    status: "",
  });

  // Fetch fines
  const fetchFines = async (page = 1) => {
    try {
      setLoading(true);
      const params = {
        page,
        limit: pagination.limit,
        ...filters,
      };

      const response = await adminAPI.getFines(params);

      // Check if response indicates session expired
      if (response.error === "session_expired") {
        return; // Let the global handler show the popup
      }

      setFines(Array.isArray(response.data?.fines) ? response.data.fines : []);
      setPagination(
        response.data?.pagination || { page: 1, limit: 20, total: 0, pages: 1 }
      );
    } catch (error) {
      console.error("Error fetching fines:", error);

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

      toast.error("Failed to load fines");
      setFines([]);
      setPagination({ page: 1, limit: 20, total: 0, pages: 1 });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFines();
  }, [filters]);

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({
      studentId: "",
      status: "",
    });
  };

  // Confirm fine payment
  const handleConfirmPayment = async (fineId) => {
    try {
      const response = await adminAPI.confirmFinePayment(fineId);

      // Check if response indicates session expired
      if (response.error === "session_expired") {
        return; // Let the global handler show the popup
      }

      // Update the fine in the local state
      setFines((prevFines) =>
        prevFines.map((fine) =>
          fine._id === fineId
            ? { ...fine, status: "paid", paidAt: new Date() }
            : fine
        )
      );

      toast.success("Fine payment confirmed successfully!");
    } catch (error) {
      console.error("Error confirming payment:", error);

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

      if (error.response?.data?.message) {
        toast.error(error.response.data.message);
      } else {
        toast.error("Failed to confirm payment");
      }
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "paid":
        return "bg-green-100 text-green-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "overdue":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "paid":
        return <CheckCircleIcon className="h-4 w-4" />;
      case "pending":
        return <ExclamationTriangleIcon className="h-4 w-4" />;
      case "overdue":
        return <ExclamationTriangleIcon className="h-4 w-4" />;
      default:
        return <ExclamationTriangleIcon className="h-4 w-4" />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Fine Management</h1>
          <p className="text-gray-600 mt-2">
            Manage and track all library fines
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                Status
              </label>
              <select
                value={filters.status}
                onChange={(e) => handleFilterChange("status", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Status</option>
                <option value="pending">Pending</option>
                <option value="paid">Paid</option>
                <option value="overdue">Overdue</option>
              </select>
            </div>
          </div>
        </motion.div>

        {/* Fines Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-lg shadow-sm border overflow-hidden"
        >
          <div className="px-6 py-4 border-b">
            <h3 className="text-lg font-semibold text-gray-900">
              Fine Records ({pagination.total})
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
                      Student Details
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Book Details
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Fine Details
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Issued By
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {fines.map((fine) => (
                    <motion.tr
                      key={fine._id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="hover:bg-gray-50"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10">
                            <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                              <UserIcon className="h-5 w-5 text-blue-600" />
                            </div>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {fine.student?.firstName} {fine.student?.lastName}
                            </div>
                            <div className="text-sm text-gray-500">
                              {fine.student?.registrationNumber}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {fine.book?.title}
                        </div>
                        <div className="text-sm text-gray-500">
                          {fine.book?.author}
                        </div>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          <div className="flex items-center">
                            <CurrencyDollarIcon className="h-4 w-4 mr-1" />
                            <span className="font-semibold">
                              ${fine.amount}
                            </span>
                          </div>
                          <div className="text-sm text-gray-500 mt-1">
                            {fine.reason}
                          </div>
                          <div className="text-xs text-gray-400 mt-1">
                            <CalendarIcon className="h-3 w-3 inline mr-1" />
                            {new Date(fine.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {fine.issuedBy?.firstName} {fine.issuedBy?.lastName}
                        </div>
                        <div className="text-sm text-gray-500">
                          Staff ID: {fine.issuedBy?._id}
                        </div>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(
                            fine.status
                          )}`}
                        >
                          {getStatusIcon(fine.status)}
                          <span className="ml-1">{fine.status}</span>
                        </span>
                        {fine.paidAt && (
                          <div className="text-xs text-green-600 mt-1">
                            Paid: {new Date(fine.paidAt).toLocaleDateString()}
                          </div>
                        )}
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap">
                        {fine.status === "pending" && (
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => handleConfirmPayment(fine._id)}
                            className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                          >
                            <CheckCircleIcon className="h-3 w-3 mr-1" />
                            Confirm Payment
                          </motion.button>
                        )}
                        {fine.status === "paid" && (
                          <span className="text-sm text-green-600 font-medium">
                            Payment Confirmed
                          </span>
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
                      onClick={() => fetchFines(page)}
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

        {/* Summary Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6"
        >
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <ExclamationTriangleIcon className="h-6 w-6 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">
                  Pending Fines
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {fines.filter((fine) => fine.status === "pending").length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircleIcon className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Paid Fines</p>
                <p className="text-2xl font-bold text-gray-900">
                  {fines.filter((fine) => fine.status === "paid").length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <CurrencyDollarIcon className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">
                  Total Amount
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  $
                  {fines.reduce((sum, fine) => sum + fine.amount, 0).toFixed(2)}
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default AdminFines;
