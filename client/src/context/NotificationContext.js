import React, { createContext, useContext, useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { notificationsAPI } from "../services/api";

const NotificationContext = createContext();

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error(
      "useNotifications must be used within a NotificationProvider"
    );
  }
  return context;
};

export const NotificationProvider = ({ children }) => {
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const location = useLocation();

  // Fetch unread count
  const fetchUnreadCount = async () => {
    try {
      const response = await notificationsAPI.getAll({ limit: 1 });
      const count = response.data.unreadCount || 0;
      setUnreadCount(count);
    } catch (error) {
      console.error("Error fetching unread count:", error);
      setUnreadCount(0);
    } finally {
      setLoading(false);
    }
  };

  // Reset count when navigating to notifications page
  useEffect(() => {
    if (location.pathname === "/notifications") {
      setUnreadCount(0);
    }
  }, [location.pathname]);

  // Fetch initial count
  useEffect(() => {
    fetchUnreadCount();
  }, []);

  // Poll for updates every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (location.pathname !== "/notifications") {
        fetchUnreadCount();
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [location.pathname]);

  // Function to manually update count (called when new notifications arrive)
  const updateUnreadCount = (newCount) => {
    setUnreadCount(newCount);
  };

  // Function to reset count
  const resetUnreadCount = () => {
    setUnreadCount(0);
  };

  const value = {
    unreadCount,
    loading,
    updateUnreadCount,
    resetUnreadCount,
    fetchUnreadCount,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};
