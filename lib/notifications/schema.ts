import { z } from 'zod';
import {
  NotificationAlertType,
  NotificationDeliveryChannel,
  NotificationStatus
} from './types';

const alertTypeEnum = z.custom<NotificationAlertType>(
  (value) => value === 'success' || value === 'reminder' || value === 'error',
  'Invalid alert type'
);

const deliveryChannelEnum = z.custom<NotificationDeliveryChannel>(
  (value) => value === 'in_app' || value === 'chat' || value === 'email',
  'Invalid delivery channel'
);

const statusEnum = z.custom<NotificationStatus>(
  (value) => value === 'pending' || value === 'sent' || value === 'acknowledged',
  'Invalid status'
);

export const createNotificationSchema = z.object({
  alertType: alertTypeEnum,
  message: z.string().min(1, 'Message cannot be empty'),
  title: z.string().min(1).optional(),
  recipientUserId: z.string().uuid().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  deliveryChannels: z.array(deliveryChannelEnum).optional(),
  messageThreadId: z.string().uuid().optional()
});

export const listNotificationsSchema = z.object({
  status: statusEnum.optional(),
  alertType: alertTypeEnum.optional(),
  limit: z
    .number()
    .int()
    .positive()
    .max(100)
    .optional()
});

