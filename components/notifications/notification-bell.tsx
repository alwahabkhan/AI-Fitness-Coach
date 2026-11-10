'use client';

import { useState, useEffect } from 'react';
import { Bell } from 'lucide-react';
import { NotificationPanel } from './notification-panel';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isClient) return;

    const fetchUnreadCount = async () => {
      try {
        const response = await fetch('/api/notifications?status=pending&limit=1');
        if (response.ok) {
          const data = await response.json();
          const notifications = data.notifications || [];
          
          // Get total count by fetching with a higher limit or using a count endpoint
          const countResponse = await fetch('/api/notifications?status=pending&limit=100');
          if (countResponse.ok) {
            const countData = await countResponse.json();
            setUnreadCount((countData.notifications || []).length);
          } else {
            setUnreadCount(notifications.length > 0 ? 99 : 0);
          }
        }
      } catch (error) {
        console.error('Failed to fetch unread count', error);
      }
    };

    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 5000);
    return () => clearInterval(interval);
  }, [isClient, isOpen]);

  if (!isClient) return null;

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsOpen(true)}
        className="relative p-2"
        aria-label="Notifications"
      >
        <Bell className="h-6 w-6" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center transform translate-x-1/2 -translate-y-1/2">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </Button>
      <NotificationPanel
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
      />
    </>
  );
}

