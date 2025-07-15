import React, { useState, useEffect } from "react";
import { notificationsAPI, userAPI } from "../../services/api";
import {
  UserIcon,
  UserGroupIcon,
  AcademicCapIcon,
  ChevronDownIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import { useAuth } from "../../context/AuthContext";
import { useNotifications } from "../../context/NotificationContext";
import { toast } from "react-hot-toast";

const roleIcon = (role) => {
  if (!role) {
    // console.log(`${role}`, senderObj);
    return <UserIcon className="h-6 w-6 text-gray-600" />;
  }
  const normalized = String(role).trim().toLowerCase();
  // console.log("roleIcon debug:", { role, normalized, senderObj });
  switch (normalized) {
    case "admin":
      return <UserIcon className="h-6 w-6 text-red-600" />;
    case "staff":
      return <UserGroupIcon className="h-6 w-6 text-blue-600" />;
    case "student":
      return <AcademicCapIcon className="h-6 w-6 text-green-600" />;
    default:
      // console.log("this from default", senderObj);
      return;
  }
};

const Notifications = () => {
  const { user } = useAuth();
  const { resetUnreadCount, fetchUnreadCount } = useNotifications();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [sentReceived, setSentReceived] = useState("received");
  const [expanded, setExpanded] = useState(null);
  const [composeOpen, setComposeOpen] = useState(false);
  const [composeRole, setComposeRole] = useState("");
  const [composeDepartment, setComposeDepartment] = useState("");
  const [composeUsers, setComposeUsers] = useState([]);
  const [composeTitle, setComposeTitle] = useState("");
  const [composeMessage, setComposeMessage] = useState("");
  const [composeLoading, setComposeLoading] = useState(false);
  const [allUsers, setAllUsers] = useState([]);
  const [allDepartments, setAllDepartments] = useState([]);
  const [userSearch, setUserSearch] = useState("");
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [notificationToDelete, setNotificationToDelete] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [sendToAll, setSendToAll] = useState(false);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const resp = await notificationsAPI.getAll({ sentReceived });
      setNotifications(resp.data.notifications || []);
    } catch (err) {
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  };

  // Mark notifications as read when page is visited
  const markNotificationsAsRead = async () => {
    try {
      await notificationsAPI.markAllAsRead();
      resetUnreadCount();
    } catch (error) {
      console.error("Error marking notifications as read:", error);
    }
  };

  useEffect(() => {
    fetchNotifications();
    // Mark notifications as read when page is visited
    markNotificationsAsRead();
  }, [sentReceived]);

  useEffect(() => {
    console.log("Fetched notifications:", notifications);
  }, [notifications]);

  useEffect(() => {
    console.log("Current user:", user);
  }, [user]);

  // Fetch all users and departments for admin compose
  useEffect(() => {
    if (user?.role === "admin" && composeOpen) {
      userAPI.getAll({ limit: 1000 }).then((resp) => {
        setAllUsers(resp.data.users || []);
        setAllDepartments(resp.data.availableDepartments || []);
      });
    }
  }, [user, composeOpen]);

  // Filter users based on search
  const filteredUsers = allUsers.filter(
    (user) =>
      user.registrationNumber
        ?.toLowerCase()
        .includes(userSearch.toLowerCase()) ||
      user.firstName?.toLowerCase().includes(userSearch.toLowerCase()) ||
      user.lastName?.toLowerCase().includes(userSearch.toLowerCase())
  );

  // Filter notifications
  const filtered = notifications.filter((n) => {
    // Search by message or title
    const matchesSearch =
      n.message.toLowerCase().includes(search.toLowerCase()) ||
      n.title.toLowerCase().includes(search.toLowerCase());
    // Filter by sender role
    const matchesRole =
      !roleFilter || (n.sender && n.sender.role === roleFilter);
    return matchesSearch && matchesRole;
  });

  const handleSendNotification = async () => {
    setComposeLoading(true);
    try {
      if (user.role === "admin") {
        // Admin: use the new broadcast endpoint
        const recipients = {
          all: sendToAll,
          roles: [],
          departments: [],
          userIds: [],
        };

        if (!sendToAll) {
          if (composeUsers.length > 0) {
            recipients.userIds = composeUsers;
          } else if (composeRole) {
            recipients.roles = [composeRole];
            if (composeDepartment) {
              recipients.departments = [composeDepartment];
            }
          }
        }

        // Remove duplicates and force all to string
        const uniqueUserIds = [
          ...new Set(recipients.userIds.map((u) => u.toString())),
        ];

        // Always include the sender (admin) as a recipient
        if (!uniqueUserIds.includes(user._id.toString())) {
          uniqueUserIds.push(user._id.toString());
        }

        await notificationsAPI.adminBroadcast({
          type: "system",
          title: composeTitle,
          message: composeMessage,
          recipients,
        });
      } else {
        // Staff/Student: send to all admins
        await notificationsAPI.broadcastAdmins({
          type: "system",
          title: composeTitle,
          message: composeMessage,
        });
      }
      setComposeOpen(false);
      setComposeTitle("");
      setComposeMessage("");
      setComposeRole("");
      setComposeDepartment("");
      setComposeUsers([]);
      setSendToAll(false);
      setUserSearch("");
      toast.success("Notification sent!");
      fetchNotifications();
      // Refresh unread count after sending notification
      setTimeout(() => {
        fetchUnreadCount();
      }, 1000);
    } catch (err) {
      toast.error("Failed to send notification.");
    } finally {
      setComposeLoading(false);
    }
  };

  const handleDeleteNotification = async () => {
    if (!notificationToDelete) return;

    setDeleteLoading(true);
    try {
      await notificationsAPI.adminDelete(notificationToDelete._id);
      toast.success("Notification deleted successfully");
      setDeleteModalOpen(false);
      setNotificationToDelete(null);
      fetchNotifications();
    } catch (err) {
      toast.error("Failed to delete notification");
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleTakeAction = async (notification) => {
    if (!notification) return;

    try {
      await notificationsAPI.adminTakeAction({
        notificationId: notification._id,
        action: "take_action_required", // Assuming 'take_action_required' is the action
      });
      toast.success("Action taken successfully!");
      fetchNotifications();
      // Refresh unread count after taking action
      setTimeout(() => {
        fetchUnreadCount();
      }, 1000);
    } catch (err) {
      toast.error("Failed to take action on notification.");
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-4">Notifications</h1>
      <div className="flex flex-col md:flex-row md:items-end gap-4 mb-6">
        <input
          type="text"
          placeholder="Search notifications..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full md:w-1/3 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {user.role === "admin" && (
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-8 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Roles</option>
            <option value="admin">Admin</option>
            <option value="staff">Staff</option>
            <option value="student">Student</option>
          </select>
        )}
        <select
          value={sentReceived}
          onChange={(e) => setSentReceived(e.target.value)}
          className="px-10 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="received">Received</option>
          <option value="sent">Sent</option>
          <option value="all">All</option>
        </select>
      </div>
      {/* Compose Notification UI */}
      <div className="mb-6">
        <button
          className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          onClick={() => setComposeOpen(true)}
        >
          Compose Notification
        </button>
        {composeOpen && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30"
            style={{ overflow: "hidden" }}
          >
            <div className="bg-white rounded-lg shadow-lg w-full max-w-2xl p-6 relative border-4 border-blue-400 max-h-[80vh] overflow-y-auto">
              <button
                className="absolute top-2 right-2 text-gray-400 hover:text-gray-600"
                onClick={() => {
                  setComposeOpen(false);
                  setComposeTitle("");
                  setComposeMessage("");
                  setComposeRole("");
                  setComposeDepartment("");
                  setComposeUsers([]);
                  setSendToAll(false);
                  setUserSearch("");
                }}
                disabled={composeLoading}
              >
                ×
              </button>
              <h2 className="text-2xl font-bold mb-4">Compose Notification</h2>
              {user.role === "admin" && (
                <>
                  <div className="mb-2">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={sendToAll}
                        onChange={(e) => setSendToAll(e.target.checked)}
                        className="mr-2"
                      />
                      <span className="text-sm font-medium">
                        Send to All Users
                      </span>
                    </label>
                  </div>
                  {!sendToAll && (
                    <>
                      <div className="mb-2">
                        <label className="block text-sm font-medium mb-1">
                          Send to Role
                        </label>
                        <select
                          value={composeRole}
                          onChange={(e) => setComposeRole(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-2"
                        >
                          <option value="">-- Select Role --</option>
                          <option value="admin">Admin</option>
                          <option value="staff">Staff</option>
                          <option value="student">Student</option>
                        </select>
                      </div>
                      <div className="mb-2">
                        <label className="block text-sm font-medium mb-1">
                          Department (optional)
                        </label>
                        <select
                          value={composeDepartment}
                          onChange={(e) => setComposeDepartment(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-2"
                        >
                          <option value="">-- All Departments --</option>
                          {allDepartments.map((dep) => (
                            <option key={dep} value={dep}>
                              {dep}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="mb-2">
                        <label className="block text-sm font-medium mb-1">
                          Or Select Specific Users
                        </label>
                        <input
                          type="text"
                          value={userSearch}
                          onChange={(e) => setUserSearch(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-2"
                          placeholder="Search by registration number, first name, or last name"
                        />
                      </div>
                      <div className="mb-2">
                        <select
                          multiple
                          value={composeUsers}
                          onChange={(e) =>
                            setComposeUsers(
                              Array.from(
                                e.target.selectedOptions,
                                (o) => o.value
                              )
                            )
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-2 h-20"
                        >
                          {filteredUsers.map((u) => (
                            <option key={u._id} value={u._id}>
                              {u.registrationNumber} - {u.firstName}{" "}
                              {u.lastName} ({u.role})
                            </option>
                          ))}
                        </select>
                      </div>
                    </>
                  )}
                </>
              )}
              <div className="mb-2">
                <label className="block text-sm font-medium mb-1">Title</label>
                <input
                  type="text"
                  value={composeTitle}
                  onChange={(e) => setComposeTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-2"
                  placeholder="Enter notification title"
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">
                  Message
                </label>
                <textarea
                  value={composeMessage}
                  onChange={(e) => setComposeMessage(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  rows={3}
                  placeholder="Enter your message"
                />
              </div>
              <div className="flex justify-end">
                <button
                  className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                  onClick={handleSendNotification}
                  disabled={composeLoading || !composeTitle || !composeMessage}
                >
                  {composeLoading ? "Sending..." : "Send"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center text-gray-500 py-12">
          No notifications found.
        </div>
      ) : (
        <ul className="space-y-4">
          {filtered.map((n) => {
            // Sender role and icon
            const senderRole =
              n.sender?.role ||
              (Array.isArray(n.sender) && n.sender[0]?.role) ||
              null;
            const senderName = n.sender
              ? `${n.sender.firstName || n.sender[0]?.firstName || ""} ${
                  n.sender.lastName || n.sender[0]?.lastName || ""
                }`.trim()
              : "System";
            const iconBg =
              senderRole === "admin"
                ? "bg-red-100"
                : senderRole === "staff"
                ? "bg-blue-100"
                : senderRole === "student"
                ? "bg-green-100"
                : "bg-gray-100";
            const isOpen = expanded === n._id;
            return (
              <li
                key={n._id}
                className={`bg-white rounded-lg shadow-sm border p-4 flex items-start gap-4 relative ${
                  n.type === "fine" &&
                  n.metadata?.action === "take_action_required"
                    ? "border-red-600 bg-red-50"
                    : (n.type === "fine" || n.type === "return") &&
                      n.metadata?.books
                    ? "border-blue-600 bg-blue-50"
                    : "border-blue-200"
                }`}
              >
                {/* Profile Icon */}
                <div className={`flex flex-col items-center mr-2`}>
                  <div
                    className={`rounded-full p-2 ${iconBg} flex items-center justify-center`}
                  >
                    {roleIcon(senderRole, n.sender)}
                  </div>
                  <span className="text-xs text-gray-400 mt-1 capitalize">
                    {senderRole
                      ? senderRole.charAt(0).toUpperCase() + senderRole.slice(1)
                      : "User"}
                  </span>
                </div>
                {/* Main Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-gray-900 truncate block">
                      {n.title}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400 ml-2 whitespace-nowrap">
                        {new Date(n.createdAt).toLocaleString()}
                      </span>
                      {user.role === "admin" && (
                        <button
                          className="text-red-500 hover:text-red-700 transition-colors"
                          onClick={() => {
                            setNotificationToDelete(n);
                            setDeleteModalOpen(true);
                          }}
                          title="Delete notification"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      )}
                      <button
                        className={`transition-transform duration-200 ${
                          isOpen ? "rotate-180" : ""
                        }`}
                        onClick={() => setExpanded(isOpen ? null : n._id)}
                        aria-label={isOpen ? "Collapse" : "Expand"}
                      >
                        <ChevronDownIcon className="h-5 w-5 text-gray-500" />
                      </button>
                    </div>
                  </div>
                  <div className="text-xs text-gray-500 mb-1">
                    {n.recipients ? (
                      // Sent notification
                      <>
                        From:{" "}
                        <span className="font-medium text-gray-700">
                          {senderName}
                        </span>
                      </>
                    ) : (
                      // Received notification
                      <>
                        From:{" "}
                        <span className="font-medium text-gray-700">
                          {senderName}
                        </span>
                      </>
                    )}
                  </div>
                  {/* Collapsible Body */}
                  <div
                    className={`transition-all duration-300 overflow-hidden ${
                      isOpen
                        ? "max-h-[1000px] opacity-100 mt-2"
                        : "max-h-0 opacity-0"
                    }`}
                    style={{ minHeight: isOpen ? "2rem" : 0 }}
                  >
                    {(n.type === "fine" || n.type === "return") &&
                    n.metadata?.books ? (
                      <div className="space-y-2">
                        <div className="flex flex-wrap gap-8 mb-2">
                          <div>
                            <div className="text-gray-800 font-medium">
                              Student Details
                            </div>
                            <div className="ml-2 text-gray-700 text-sm">
                              <div>
                                <span className="font-semibold">Name:</span>{" "}
                                {n.metadata.studentName}
                              </div>
                              <div>
                                <span className="font-semibold">
                                  Reg Number:
                                </span>{" "}
                                {n.metadata.registrationNumber}
                              </div>
                              {n.metadata.department && (
                                <div>
                                  <span className="font-semibold">
                                    Department:
                                  </span>{" "}
                                  {n.metadata.department}
                                </div>
                              )}
                              {n.metadata.year && (
                                <div>
                                  <span className="font-semibold">Year:</span>{" "}
                                  {n.metadata.year}
                                </div>
                              )}
                            </div>
                          </div>
                          <div>
                            <div className="text-gray-800 font-medium">
                              Returned At
                            </div>
                            <div className="ml-2 text-gray-700 text-sm">
                              {n.metadata.timestamp
                                ? new Date(
                                    n.metadata.timestamp
                                  ).toLocaleString()
                                : ""}
                            </div>
                          </div>
                        </div>
                        <div className="text-gray-800 font-medium mt-2">
                          Books Returned
                        </div>
                        <ul className="ml-4 list-disc text-gray-700 text-sm">
                          {JSON.parse(n.metadata.books || "[]").map((b, i) => (
                            <li key={i} className="flex items-center gap-2">
                              <span className="font-semibold">{b.title}</span>
                              <span className="text-gray-500">
                                (ISBN: {b.isbn})
                              </span>
                              {b.fine && Number(b.fine) > 0 && (
                                <span className="ml-2 text-red-600 font-semibold">
                                  Fine: ₹{b.fine}
                                </span>
                              )}
                            </li>
                          ))}
                        </ul>
                        {n.metadata.totalFine &&
                          Number(n.metadata.totalFine) > 0 && (
                            <div className="mt-2 text-xl font-bold text-red-600">
                              Total Fine: ₹{n.metadata.totalFine}
                            </div>
                          )}
                        {user.role === "admin" &&
                          n.type === "fine" &&
                          n.metadata?.action === "take_action_required" && (
                            <button
                              className="bg-red-600 text-white px-4 py-2 rounded mt-2 md:mt-0 md:ml-4"
                              onClick={() => handleTakeAction(n)}
                            >
                              Take Action
                            </button>
                          )}
                      </div>
                    ) : (
                      <div className="text-gray-700 mb-1">{n.message}</div>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30">
          <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Delete Notification</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete this notification?
              <br />
              <span className="font-semibold">Delete</span> will remove it only
              for you.
              <br />
              <span className="font-semibold">Delete for All</span> will remove
              it for all users.
            </p>
            <div className="flex justify-end gap-3">
              <button
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded hover:bg-gray-50"
                onClick={() => {
                  setDeleteModalOpen(false);
                  setNotificationToDelete(null);
                }}
                disabled={deleteLoading}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
                onClick={handleDeleteNotification}
                disabled={deleteLoading}
              >
                {deleteLoading ? "Deleting..." : "Delete"}
              </button>
              <button
                className="px-4 py-2 bg-red-700 text-white rounded hover:bg-red-800 disabled:opacity-50"
                onClick={async () => {
                  if (!notificationToDelete) return;
                  setDeleteLoading(true);
                  try {
                    await notificationsAPI.adminDeleteForAll({
                      sender:
                        notificationToDelete.sender._id ||
                        notificationToDelete.sender,
                      type: notificationToDelete.type,
                      title: notificationToDelete.title,
                      message: notificationToDelete.message,
                      relatedBook:
                        notificationToDelete.relatedBook?._id ||
                        notificationToDelete.relatedBook ||
                        null,
                      relatedBorrowing:
                        notificationToDelete.relatedBorrowing?._id ||
                        notificationToDelete.relatedBorrowing ||
                        null,
                    });
                    toast.success("Notification deleted for all users");
                    setDeleteModalOpen(false);
                    setNotificationToDelete(null);
                    fetchNotifications();
                  } catch (err) {
                    toast.error("Failed to delete for all");
                  } finally {
                    setDeleteLoading(false);
                  }
                }}
                disabled={deleteLoading}
              >
                {deleteLoading ? "Deleting..." : "Delete for All"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Notifications;
