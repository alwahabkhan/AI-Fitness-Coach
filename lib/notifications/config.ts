import {
  NotificationAlertType,
  NotificationDeliveryChannel
} from './types';

interface AlertConfig {
  label: string;
  defaultTitle: string;
  defaultChannels: NotificationDeliveryChannel[];
  severity: 'low' | 'medium' | 'high';
}

export const ALERT_TYPE_CONFIG: Record<NotificationAlertType, AlertConfig> = {
  success: {
    label: 'Success',
    defaultTitle: 'Success',
    defaultChannels: ['in_app'],
    severity: 'low'
  },
  reminder: {
    label: 'Reminder',
    defaultTitle: 'Reminder',
    defaultChannels: ['in_app', 'chat'],
    severity: 'medium'
  },
  error: {
    label: 'Error',
    defaultTitle: 'Action needed',
    defaultChannels: ['in_app', 'email'],
    severity: 'high'
  }
};

