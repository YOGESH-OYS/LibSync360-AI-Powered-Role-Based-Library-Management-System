import React, { useState, useEffect } from "react";
import { userAPI } from "../../services/api";
import { toast } from "react-hot-toast";

const DeleteUserModal = ({ open, onClose, user, onUserDeleted }) => {
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      document.body.classList.add("overflow-hidden");
    } else {
      document.body.classList.remove("overflow-hidden");
    }
    return () => {
      document.body.classList.remove("overflow-hidden");
    };
  }, [open]);

  if (!open || !user) return null;

  const handleDelete = async () => {
    setLoading(true);
    try {
      await userAPI.delete(user._id);
      toast.success("User deleted successfully");
      if (onUserDeleted) onUserDeleted();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to delete user");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-8 relative border-4 border-red-500">
        <button
          className="absolute top-2 right-2 text-gray-400 hover:text-gray-600"
          onClick={onClose}
          disabled={loading}
        >
          ×
        </button>
        <h2 className="text-2xl font-bold mb-4 text-red-600">Delete User</h2>
        <p className="mb-6 text-gray-700">
          Are you sure you want to{" "}
          <span className="font-semibold text-red-600">permanently delete</span>{" "}
          user{" "}
          <span className="font-semibold">
            {user.firstName} {user.lastName}
          </span>
          ?<br />
          This action cannot be undone.
        </p>
        <div className="flex justify-end space-x-4">
          <button
            className="px-6 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </button>
          <button
            className="px-6 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
            onClick={handleDelete}
            disabled={loading}
          >
            {loading ? "Deleting..." : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteUserModal;
