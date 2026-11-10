'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { NotificationToast } from './notification-toast';
import { NotificationRecord } from '@/lib/notifications/types';

// Custom event to trigger refresh when notifications are marked as read
const NOTIFICATION_REFRESH_EVENT = 'notification-refresh';
const SHOWN_TOASTS_KEY = 'notification_shown_toasts';

// Get shown toast IDs from localStorage
const getShownToastIds = (): Set<string> => {
  if (typeof window === 'undefined') return new Set();
  try {
    const stored = localStorage.getItem(SHOWN_TOASTS_KEY);
    if (stored) {
      const ids = JSON.parse(stored) as string[];
      // Clean up old IDs (keep only last 100)
      return new Set(ids.slice(-100));
    }
  } catch (error) {
    console.error('Failed to read shown toasts from localStorage', error);
  }
  return new Set();
};

// Save shown toast ID to localStorage
const markToastAsShown = (id: string) => {
  if (typeof window === 'undefined') return;
  try {
    const shownIds = getShownToastIds();
    shownIds.add(id);
    const idsArray = Array.from(shownIds).slice(-100); // Keep only last 100
    localStorage.setItem(SHOWN_TOASTS_KEY, JSON.stringify(idsArray));
  } catch (error) {
    console.error('Failed to save shown toast to localStorage', error);
  }
};

export function NotificationContainer() {
  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
  const [isClient, setIsClient] = useState(false);
  const hasFetchedInitial = useRef(false);
  const shownToastIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    setIsClient(true);
    shownToastIdsRef.current = getShownToastIds();
  }, []);

  const fetchNotifications = useCallback(async () => {
    try {
      const response = await fetch('/api/notifications?status=pending&limit=5');
      if (response.ok) {
        const data = await response.json();
        const fetchedNotifications = data.notifications || [];
        
        // Filter out notifications that have already been shown as toasts
        const newNotifications = fetchedNotifications.filter(
          (n: NotificationRecord) => {
            const alreadyShown = shownToastIdsRef.current.has(n.id);
            // Mark as shown immediately to prevent duplicates
            if (!alreadyShown) {
              shownToastIdsRef.current.add(n.id);
              markToastAsShown(n.id);
            }
            return !alreadyShown;
          }
        );
        
        // Only update if we have new notifications
        if (newNotifications.length > 0) {
          setNotifications((prev) => {
            const prevIds = new Set(prev.map(n => n.id));
            const trulyNew = newNotifications.filter(
              (n: NotificationRecord) => !prevIds.has(n.id)
            );
            
            if (trulyNew.length > 0) {
              return [...prev, ...trulyNew];
            }
            return prev;
          });
        }
      }
    } catch (error) {
      console.error('Failed to fetch notifications', error);
    }
  }, []);

  useEffect(() => {
    if (!isClient) return;
    
    // Fetch once on initial load
    if (!hasFetchedInitial.current) {
      fetchNotifications();
      hasFetchedInitial.current = true;
    }
    
    // Poll for new notifications every 30 seconds to detect new ones
    // localStorage tracking ensures each notification shows as toast only once
    const pollInterval = setInterval(() => {
      fetchNotifications();
    }, 30000); // 30 seconds
    
    // Listen for refresh events from notification panel (when notifications are marked as read)
    // Also listen for workout completion events
    const handleRefresh = () => {
      fetchNotifications();
    };
    window.addEventListener(NOTIFICATION_REFRESH_EVENT, handleRefresh);
    
    // Listen for workout completion to immediately check for new notifications
    const handleWorkoutComplete = () => {
      // Wait a bit for server to process, then fetch
      setTimeout(() => {
        fetchNotifications();
      }, 2000);
    };
    window.addEventListener('workout-completed', handleWorkoutComplete);
    
    return () => {
      clearInterval(pollInterval);
      window.removeEventListener(NOTIFICATION_REFRESH_EVENT, handleRefresh);
      window.removeEventListener('workout-completed', handleWorkoutComplete);
    };
  }, [fetchNotifications, isClient]);

  const handleDismiss = useCallback((id: string) => {
    // Just remove from toast display, don't acknowledge
    // User can mark as read manually in the notification panel
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const getActionButton = (notification: NotificationRecord) => {
    // Error notifications with sync failures get Retry button
    if (notification.alertType === 'error' && 
        (notification.message.toLowerCase().includes('sync') || 
         notification.message.toLowerCase().includes('connection'))) {
      return {
        label: 'Retry',
        onClick: () => {
          // Retry logic - could reload page or retry the failed operation
          if (notification.message.toLowerCase().includes('sync')) {
            window.location.reload();
          }
        }
      };
    }
    
    // Reminder notifications about upcoming sessions get View button
    if (notification.alertType === 'reminder' && 
        notification.title.toLowerCase().includes('upcoming')) {
      return {
        label: 'View',
        onClick: () => {
          // Navigate to session or open calendar
          window.location.href = '/trainee';
        }
      };
    }
    
    return undefined;
  };

  if (!isClient || notifications.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-[9999] flex flex-col items-end pointer-events-none">
      {notifications.map((notification) => (
        <div key={notification.id} className="pointer-events-auto">
          <NotificationToast
            notification={notification}
            onDismiss={handleDismiss}
            actionButton={getActionButton(notification)}
          />
        </div>
      ))}
    </div>
  );
}

