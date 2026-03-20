import { useState, useCallback, useEffect } from 'react';

const NOTIF_KEY = 'salesedge:notifications';

function loadNotifications() {
  try {
    const stored = localStorage.getItem(NOTIF_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.error('Failed to load notifications:', e);
  }
  return [];
}

function saveNotifications(notifs) {
  try {
    localStorage.setItem(NOTIF_KEY, JSON.stringify(notifs.slice(0, 50)));
  } catch (e) {
    console.error('Failed to save notifications:', e);
  }
}

export function useNotifications() {
  const [notifications, setNotifications] = useState(loadNotifications);
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    saveNotifications(notifications);
  }, [notifications]);

  const addNotification = useCallback((type, message, persistent = false) => {
    const notif = {
      id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      type,
      message,
      read: false,
      persistent,
      createdAt: new Date().toISOString(),
    };
    setNotifications(prev => [notif, ...prev]);
    setToasts(prev => [...prev, notif]);

    if (!persistent) {
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== notif.id));
      }, 4000);
    }

    return notif;
  }, []);

  const dismissToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const markAllRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  }, []);

  const getUnreadCount = useCallback(() => {
    return notifications.filter(n => !n.read).length;
  }, [notifications]);

  return { notifications, toasts, addNotification, dismissToast, markAllRead, getUnreadCount };
}
