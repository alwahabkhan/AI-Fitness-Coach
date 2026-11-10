'use client';

import { useEffect, useState } from 'react';
import { X, CheckCircle, AlertCircle, Bell, Info, AlertTriangle } from 'lucide-react';
import { NotificationRecord } from '@/lib/notifications/types';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface NotificationToastProps {
  notification: NotificationRecord;
  onDismiss: (id: string) => void;
  actionButton?: {
    label: string;
    onClick: () => void;
  };
}

export function NotificationToast({ notification, onDismiss, actionButton }: NotificationToastProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(() => onDismiss(notification.id), 300);
    }, 5000);

    return () => clearTimeout(timer);
  }, [notification.id, onDismiss]);

  const getIconConfig = () => {
    switch (notification.alertType) {
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
        const titleLower = notification.title.toLowerCase();
        if (titleLower.includes('warning') || 
            titleLower.includes('limit') ||
            titleLower.includes('break')) {
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

  const getActionButtonColor = () => {
    switch (notification.alertType) {
      case 'error':
        return 'text-red-600 hover:text-red-700 hover:bg-red-50';
      case 'reminder':
        return 'text-blue-600 hover:text-blue-700 hover:bg-blue-50';
      default:
        return 'text-blue-600 hover:text-blue-700 hover:bg-blue-50';
    }
  };

  if (!isVisible) return null;

  const iconConfig = getIconConfig();
  const IconComponent = iconConfig.icon;

  return (
    <div
      className="bg-white rounded-lg shadow-lg p-4 mb-3 min-w-[320px] max-w-[420px] flex items-start gap-3"
      style={{
        animation: 'slideIn 0.3s ease-out',
      }}
    >
      {/* Icon Circle */}
      <div className={cn('rounded-full p-2 flex-shrink-0', iconConfig.bgColor)}>
        <IconComponent className={cn('h-5 w-5', iconConfig.iconColor)} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <h4 className="font-semibold text-sm text-gray-900 mb-0.5">
          {notification.title}
        </h4>
        <p className="text-sm text-gray-600 break-words leading-relaxed">
          {notification.message}
        </p>
      </div>

      {/* Actions */}
      <div className="flex items-start gap-2 flex-shrink-0">
        {actionButton && (
          <Button
            variant="ghost"
            size="sm"
            onClick={actionButton.onClick}
            className={cn('text-sm px-3 py-1 h-auto', getActionButtonColor())}
          >
            {actionButton.label}
          </Button>
        )}
        <button
          onClick={() => {
            setIsVisible(false);
            setTimeout(() => onDismiss(notification.id), 300);
          }}
          className="text-gray-400 hover:text-gray-600 transition-colors p-1"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

