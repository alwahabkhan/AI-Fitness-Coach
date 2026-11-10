export type NotificationAlertType = 'success' | 'reminder' | 'error';

export type NotificationStatus = 'pending' | 'sent' | 'acknowledged';

export type NotificationDeliveryChannel = 'in_app' | 'chat' | 'email';

export interface NotificationRecord {
  id: string;
  recipientUserId: string;
  createdByUserId: string | null;
  messageThreadId: string | null;
  alertType: NotificationAlertType;
  status: NotificationStatus;
  title: string;
  message: string;
  metadata: Record<string, unknown>;
  deliveryChannels: NotificationDeliveryChannel[];
  acknowledgedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateNotificationInput {
  alertType: NotificationAlertType;
  message: string;
  title?: string;
  recipientUserId?: string;
  metadata?: Record<string, unknown>;
  deliveryChannels?: NotificationDeliveryChannel[];
  messageThreadId?: string;
}

export interface ListNotificationsFilters {
  status?: NotificationStatus;
  alertType?: NotificationAlertType;
  limit?: number;
}

