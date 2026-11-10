'use client';

import { useEffect, useState, useCallback } from 'react';
import { X, CheckCircle, AlertCircle, Bell, Check, Info, AlertTriangle } from 'lucide-react';
import { NotificationRecord } from '@/lib/notifications/types';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface NotificationPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function NotificationPanel({ isOpen, onClose }: NotificationPanelProps) {
  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/notifications?limit=50');
      if (response.ok) {
        const data = await response.json();
        setNotifications(data.notifications || []);
      }
    } catch (error) {
      console.error('Failed to fetch notifications', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
      // Poll for new notifications every 10 seconds when panel is open
      const interval = setInterval(fetchNotifications, 10000);
      return () => clearInterval(interval);
    }
  }, [isOpen, fetchNotifications]);

  const handleMarkAsRead = useCallback(async (id: string) => {
    try {
      await fetch(`/api/notifications/${id}/acknowledge`, {
        method: 'POST'
      });
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === id ? { ...n, status: 'acknowledged' as const } : n
        )
      );
      // Trigger refresh event for toast container
      window.dispatchEvent(new Event('notification-refresh'));
    } catch (error) {
      console.error('Failed to acknowledge notification', error);
    }
  }, []);

  const handleMarkAllAsRead = useCallback(async () => {
    const unreadNotifications = notifications.filter(
      (n) => n.status === 'pending'
    );
    
    try {
      await Promise.all(
        unreadNotifications.map((n) =>
          fetch(`/api/notifications/${n.id}/acknowledge`, {
            method: 'POST'
          })
        )
      );
      setNotifications((prev) =>
        prev.map((n) =>
          n.status === 'pending' ? { ...n, status: 'acknowledged' as const } : n
        )
      );
      // Trigger refresh event for toast container
      window.dispatchEvent(new Event('notification-refresh'));
    } catch (error) {
      console.error('Failed to mark all as read', error);
    }
  }, [notifications]);

  const getIconConfig = (alertType: string, title?: string) => {
    switch (alertType) {
      case 'success':
        return {
          icon: CheckCircle,
          bgColor: 'bg-green-500',
          iconColor: 'text-white'
        };
      case 'error':
        return {
          icon: AlertCircle,
          bgColor: 'bg-red-500',
          iconColor: 'text-white'
        };
      case 'reminder':
        // Check if it's a warning/reminder that should be orange
        if (title && (title.toLowerCase().includes('warning') || 
            title.toLowerCase().includes('limit'))) {
          return {
            icon: AlertTriangle,
            bgColor: 'bg-orange-500',
            iconColor: 'text-white'
          };
        }
        return {
          icon: Info,
          bgColor: 'bg-blue-500',
          iconColor: 'text-white'
        };
      default:
        return {
          icon: Info,
          bgColor: 'bg-gray-500',
          iconColor: 'text-white'
        };
    }
  };

  const unreadCount = notifications.filter((n) => n.status === 'pending').length;
  
  const filteredNotifications = filter === 'unread' 
    ? notifications.filter((n) => n.status === 'pending')
    : notifications;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9998]">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50"
        onClick={onClose}
      />
      
      {/* Panel */}
      <div className="fixed top-0 right-0 h-full w-full sm:w-96 sm:max-w-md bg-white shadow-2xl z-[9999] flex flex-col transform transition-transform duration-300 ease-out">
        {/* Header */}
        <div className="flex flex-col border-b border-gray-200 bg-white">
          <div className="flex flex-row items-center justify-between px-5 py-4">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 bg-blue-50 rounded-lg">
                <Bell className="h-5 w-5 text-blue-600" />
              </div>
              <h2 className="text-lg font-semibold text-gray-900 m-0">
                Notifications
              </h2>
              {unreadCount > 0 && (
                <span className="bg-red-500 text-white text-xs font-bold rounded-full px-2 py-0.5 min-w-[20px] text-center">
                  {unreadCount}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
             
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="p-2 text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
          </div>
            {unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleMarkAllAsRead}
                  className="text-sm text-gray-600 hover:text-gray-900"
                >
                  <Check className="h-4 w-4 mr-1.5" />
                  Mark all read
                </Button>
              )}
          
          {/* Filter Toggle */}
          <div className="flex pt-5 items-center gap-2 px-5 pb-3 border-t border-gray-100 bg-gray-50/50">
            <Button
              variant={filter === 'all' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setFilter('all')}
              className={cn(
                'text-sm px-4',
                filter === 'all' 
                  ? 'bg-blue-600 text-white hover:bg-blue-700' 
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              )}
            >
              All
            </Button>
            <Button
              variant={filter === 'unread' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setFilter('unread')}
              className={cn(
                'text-sm px-4',
                filter === 'unread'
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              )}
            >
              Unread
              {unreadCount > 0 && (
                <span className={cn(
                  'ml-1.5 text-xs font-bold rounded-full px-1.5 py-0.5',
                  filter === 'unread' 
                    ? 'bg-white/20 text-white' 
                    : 'bg-red-500 text-white'
                )}>
                  {unreadCount}
                </span>
              )}
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto bg-gray-50/30">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-gray-500">
              <Bell className="h-12 w-12 mb-2 opacity-50" />
              <p className="text-sm">{filter === 'unread' ? 'No unread notifications' : 'No notifications'}</p>
            </div>
          ) : (
            <div className="p-4">
              {(() => {
                // Group notifications by date
                const groupedByDate: Record<string, NotificationRecord[]> = {};
                filteredNotifications.forEach((notification) => {
                  const date = new Date(notification.createdAt);
                  const dateKey = date.toDateString();
                  if (!groupedByDate[dateKey]) {
                    groupedByDate[dateKey] = [];
                  }
                  groupedByDate[dateKey].push(notification);
                });

                const sortedDates = Object.keys(groupedByDate).sort((a, b) => {
                  return new Date(b).getTime() - new Date(a).getTime();
                });

                return (
                  <div className="space-y-4">
                    {sortedDates.map((dateKey) => {
                      const dateNotifications = groupedByDate[dateKey];
                      const date = new Date(dateKey);
                      const today = new Date();
                      const yesterday = new Date(today);
                      yesterday.setDate(yesterday.getDate() - 1);
                      
                      let dateLabel = '';
                      if (date.toDateString() === today.toDateString()) {
                        dateLabel = 'Today';
                      } else if (date.toDateString() === yesterday.toDateString()) {
                        dateLabel = 'Yesterday';
                      } else {
                        dateLabel = date.toLocaleDateString('en-US', { 
                          weekday: 'long', 
                          year: 'numeric', 
                          month: 'long', 
                          day: 'numeric' 
                        });
                      }

                      return (
                        <div key={dateKey} className="space-y-2.5">
                          {/* Date Divider */}
                          <div className="sticky top-0 bg-gray-50/95 backdrop-blur-sm py-2 z-10">
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-px bg-gray-300"></div>
                              <span className="text-xs font-semibold text-gray-500 px-2">
                                {dateLabel}
                              </span>
                              <div className="flex-1 h-px bg-gray-300"></div>
                            </div>
                          </div>
                          
                          {/* Notifications for this date */}
                          {dateNotifications.map((notification) => {
                            const isRead = notification.status === 'acknowledged';
                            const iconConfig = getIconConfig(notification.alertType, notification.title);
                            const IconComponent = iconConfig.icon;
                            
                            return (
                              <div
                                key={notification.id}
                                className={cn(
                                  'bg-white rounded-lg shadow-sm border border-gray-200 p-4 transition-all hover:shadow-md',
                                  isRead && 'opacity-60'
                                )}
                              >
                                <div className="flex items-start gap-3">
                                  {/* Icon Circle */}
                                  <div className={cn('rounded-full p-2 flex-shrink-0 shadow-sm', iconConfig.bgColor)}>
                                    <IconComponent className={cn('h-5 w-5', iconConfig.iconColor)} />
                                  </div>
                                  
                                  {/* Content */}
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-start justify-between gap-2">
                                      <div className="flex-1 min-w-0">
                                        <h4
                                          className={cn(
                                            'font-semibold text-sm mb-1',
                                            isRead ? 'text-gray-500' : 'text-gray-900'
                                          )}
                                        >
                                          {notification.title}
                                        </h4>
                                        <p
                                          className={cn(
                                            'text-sm break-words leading-relaxed mb-2',
                                            isRead ? 'text-gray-400' : 'text-gray-600'
                                          )}
                                        >
                                          {notification.message}
                                        </p>
                                        <p className="text-xs text-gray-400">
                                          {new Date(notification.createdAt).toLocaleTimeString('en-US', {
                                            hour: 'numeric',
                                            minute: '2-digit',
                                            hour12: true
                                          })}
                                        </p>
                                      </div>
                                      {!isRead && (
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => handleMarkAsRead(notification.id)}
                                          className="p-1.5 h-auto flex-shrink-0 hover:bg-gray-100 rounded-full"
                                          title="Mark as read"
                                        >
                                          <Check className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                                        </Button>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

