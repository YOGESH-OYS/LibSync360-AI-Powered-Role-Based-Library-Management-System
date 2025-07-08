import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  UserIcon,
  UserGroupIcon,
  AcademicCapIcon,
  EnvelopeIcon,
  PhoneIcon,
  CalendarIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import { userAPI } from "../../services/api";
import { toast } from "react-hot-toast";
import {
  isSessionExpiredResponse,
  isSessionExpiredError,
} from "../../utils/sessionUtils";
import AddUserModal from "./AddUserModal";
import EditUserModal from "./EditUserModal";
import DeleteUserModal from "./DeleteUserModal";

const AdminUsers = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20, //SETS THE LIMIT ON THE NUMBER OF ROW ON A PAGE OR HANDLES NEXT PAGE
    total: 0,
    pages: 0,
  });

  // Filter states
  const [filters, setFilters] = useState({
    search: "",
    role: "",
    department: "",
    status: "",
  });

  // Add state for role counts
  const [roleCounts, setRoleCounts] = useState({
    admin: 0,
    staff: 0,
    student: 0,
    total: 0,
  });

  // Add state for available roles and departments
  const [availableRoles, setAvailableRoles] = useState([
    "admin",
    "staff",
    "student",
  ]);
  const [availableDepartments, setAvailableDepartments] = useState([
    "Computer Science",
    "Mathematics",
    "Physics",
    "Chemistry",
    "Biology",
    "Engineering",
    "Library",
  ]);

  const [isAddUserOpen, setAddUserOpen] = useState(false);
  const [isEditUserOpen, setEditUserOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [isDeleteUserOpen, setDeleteUserOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);

  // Fetch users
  const fetchUsers = async (page = 1) => {
    try {
      console.log("Fetching users...");
      setLoading(true);
      const params = {
        page,
        limit: pagination.limit,
        ...filters,
      };

      const response = await userAPI.getAll(params);
      // IF NEEDED WE CAN USE API RESPONSE FROM THE BROWSER INSPWCT
      // console.log("API response:", response);

      if (isSessionExpiredResponse(response)) {
        return; // Let the global handler show the popup
      }

      setUsers(response.data.users);
      setPagination(response.data.pagination);
      // Extract role counts if present, else fallback to 0
      setRoleCounts(
        response.data.counts || {
          admin: 0,
          staff: 0,
          student: 0,
          total: 0,
        }
      );
      // Extract available roles and departments if present
      if (response.data.availableRoles) {
        setAvailableRoles(response.data.availableRoles);
      }
      if (response.data.availableDepartments) {
        setAvailableDepartments(response.data.availableDepartments);
      }
    } catch (error) {
      console.error("Error fetching users:", error);
      if (isSessionExpiredError(error)) {
        return;
      }
      toast.error("Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [filters]);

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({
      search: "",
      role: "",
      department: "",
      status: "",
    });
  };

  const getRoleIcon = (role) => {
    switch (role) {
      case "admin":
        return <UserIcon className="h-5 w-5 text-red-600" />;
      case "staff":
        return <UserGroupIcon className="h-5 w-5 text-blue-600" />;
      case "student":
        return <AcademicCapIcon className="h-5 w-5 text-green-600" />;
      default:
        return <UserIcon className="h-5 w-5 text-gray-600" />;
    }
  };

  const getRoleColor = (role) => {
    switch (role) {
      case "admin":
        return "bg-red-100 text-red-800";
      case "staff":
        return "bg-blue-100 text-blue-800";
      case "student":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusColor = (status) => {
    return status === "active"
      ? "bg-green-100 text-green-800"
      : "bg-red-100 text-red-800";
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              User Management
            </h1>
            <p className="text-gray-600 mt-2">
              Manage all library users and their accounts
            </p>
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors flex items-center"
            onClick={() => setAddUserOpen(true)}
          >
            <PlusIcon className="h-5 w-5 mr-2" />
            Add New User
          </motion.button>
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

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Search
              </label>
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  value={filters.search}
                  onChange={(e) => handleFilterChange("search", e.target.value)}
                  placeholder="Search by name, email, ID, or registration number..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Role
              </label>
              <select
                value={filters.role}
                onChange={(e) => handleFilterChange("role", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Roles</option>
                {availableRoles.map((role) => (
                  <option key={role} value={role}>
                    {role.charAt(0).toUpperCase() + role.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Department
              </label>
              <select
                value={filters.department}
                onChange={(e) =>
                  handleFilterChange("department", e.target.value)
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Departments</option>
                {availableDepartments.map((dep) => (
                  <option key={dep} value={dep}>
                    {dep}
                  </option>
                ))}
              </select>
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
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>
        </motion.div>

        {/* User Table and Summary */}
        {users.length === 0 && !loading && (
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4 text-yellow-800 rounded">
            No users found. This may be due to a backend or data issue.
          </div>
        )}

        {/* Summary Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-6"
        >
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center">
              <div className="p-2 bg-red-100 rounded-lg">
                <UserIcon className="h-6 w-6 text-red-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Admins</p>
                <p className="text-2xl font-bold text-gray-900">
                  {users.filter((user) => user.role === "admin").length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <UserGroupIcon className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Staff</p>
                <p className="text-2xl font-bold text-gray-900">
                  {users.filter((user) => user.role === "staff").length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <AcademicCapIcon className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Students</p>
                <p className="text-2xl font-bold text-gray-900">
                  {users.filter((user) => user.role === "student").length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center">
              <div className="p-2 bg-gray-100 rounded-lg">
                <UserIcon className="h-6 w-6 text-gray-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Users</p>
                <p className="text-2xl font-bold text-gray-900">
                  {users.length}
                </p>
              </div>
            </div>
          </div>
        </motion.div>
        <br />

        {/* Users Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-lg shadow-sm border overflow-hidden"
        >
          <div className="px-6 py-4 border-b">
            <h3 className="text-lg font-semibold text-gray-900">
              User Records ({pagination.total})
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
                      User Details
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Contact Info
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Role & Department
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
                  {users.map((user) => (
                    <motion.tr
                      key={user._id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="hover:bg-gray-50"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10">
                            <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center">
                              {getRoleIcon(user.role)}
                            </div>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {user.firstName} {user.lastName}
                            </div>
                            <div className="text-sm text-gray-500">
                              ID:{" "}
                              {user.registrationNumber || user._id.slice(-8)}
                            </div>
                            {user.year && (
                              <div className="text-xs text-gray-400">
                                Year {user.year}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          <div className="flex items-center">
                            <EnvelopeIcon className="h-4 w-4 mr-1 text-gray-400" />
                            {user.email}
                          </div>
                          {user.phone && (
                            <div className="flex items-center mt-1">
                              <PhoneIcon className="h-4 w-4 mr-1 text-gray-400" />
                              {user.phone}
                            </div>
                          )}
                        </div>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          <span
                            className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full ${getRoleColor(
                              user.role
                            )}`}
                          >
                            {user.role}
                          </span>
                          {user.department && (
                            <div className="text-sm text-gray-500 mt-1">
                              {user.department}
                            </div>
                          )}
                        </div>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(
                            user.isActive ? "active" : "inactive"
                          )}`}
                        >
                          {user.isActive ? "Active" : "Inactive"}
                        </span>
                        <div className="text-xs text-gray-400 mt-1">
                          <CalendarIcon className="h-3 w-3 inline mr-1" />
                          Joined:{" "}
                          {new Date(user.createdAt).toLocaleDateString()}
                        </div>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <button
                            className="text-blue-600 hover:text-blue-900"
                            onClick={() => {
                              setSelectedUser(user);
                              setEditUserOpen(true);
                            }}
                          >
                            <PencilIcon className="h-4 w-4" />
                          </button>
                          <button
                            className="text-red-600 hover:text-red-900"
                            onClick={() => {
                              setUserToDelete(user);
                              setDeleteUserOpen(true);
                            }}
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        </div>
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
                      onClick={() => fetchUsers(page)}
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

        {/* HERE WAS THE STATS */}

        <AddUserModal
          open={isAddUserOpen}
          onClose={() => setAddUserOpen(false)}
          onUserAdded={fetchUsers}
          availableRoles={availableRoles}
          availableDepartments={availableDepartments}
        />

        <EditUserModal
          open={isEditUserOpen}
          onClose={() => setEditUserOpen(false)}
          user={selectedUser}
          onUserUpdated={fetchUsers}
          availableRoles={availableRoles}
          availableDepartments={availableDepartments}
        />

        {isDeleteUserOpen && userToDelete && (
          <DeleteUserModal
            open={isDeleteUserOpen}
            onClose={() => setDeleteUserOpen(false)}
            user={userToDelete}
            onUserDeleted={() => {
              setDeleteUserOpen(false);
              setUserToDelete(null);
              fetchUsers();
            }}
          />
        )}
      </div>
    </div>
  );
};

export default AdminUsers;
