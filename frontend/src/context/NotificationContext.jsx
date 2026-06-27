import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from './AuthContext';

const NotificationContext = createContext();

export const useNotifications = () => useContext(NotificationContext);

export const NotificationProvider = ({ children }) => {
  const { user } = useAuth();
  const activeLabId = user?.active_lab ? String(user.active_lab) : null;
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data } = await axios.get('/api/notifications');
      setNotifications(data.notifications || []);
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  }, [user, activeLabId]);

  const fetchUnreadCount = useCallback(async () => {
    if (!user) return;
    try {
      const { data } = await axios.get('/api/notifications/unread');
      setUnreadCount(data.count || 0);
    } catch (err) {
      console.error('Failed to fetch unread count:', err);
      setUnreadCount(0);
    }
  }, [user, activeLabId]);

  const markAsRead = async (id) => {
    try {
      await axios.patch(`/api/notifications/${id}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, status: 'read', isRead: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }
  };

  const dismissNotification = async (id) => {
    try {
      const n = notifications.find((notif) => notif._id === id);
      await axios.patch(`/api/notifications/${id}/dismiss`);
      setNotifications((prev) => prev.filter((item) => item._id !== id));
      if (n && n.status === 'unread') {
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    } catch (err) {
      console.error('Failed to dismiss notification:', err);
    }
  };

  // Refetch when user or active lab changes — keeps feed lab-isolated
  useEffect(() => {
    if (user) {
      setNotifications([]);
      setUnreadCount(0);
      fetchNotifications();
      fetchUnreadCount();
      const interval = setInterval(() => {
        fetchUnreadCount();
      }, 30000);
      return () => clearInterval(interval);
    }

    setNotifications([]);
    setUnreadCount(0);
  }, [user, activeLabId, fetchNotifications, fetchUnreadCount]);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        loading,
        fetchNotifications,
        markAsRead,
        dismissNotification,
        refresh: () => {
          fetchNotifications();
          fetchUnreadCount();
        }
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};
