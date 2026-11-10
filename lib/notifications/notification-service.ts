import { createServerSupabase } from '../supabase';
import { ALERT_TYPE_CONFIG } from './config';
import {
  CreateNotificationInput,
  ListNotificationsFilters,
  NotificationAlertType,
  NotificationDeliveryChannel,
  NotificationRecord,
  NotificationStatus
} from './types';
import { createNotificationSchema, listNotificationsSchema } from './schema';
import { NotificationAgentBridge } from './agent-bridge';
import type { Database } from '@/database/database.types';

type NotificationInsert =
  Database['public']['Tables']['notification']['Insert'];
type NotificationRow = {
  id: string;
  recipient_user_id: string;
  created_by: string | null;
  message_thread_id: string | null;
  alert_type: NotificationAlertType;
  status: NotificationStatus;
  title: string;
  message: string;
  metadata: Record<string, unknown>;
  delivery_channels: NotificationDeliveryChannel[];
  acknowledged_at: string | null;
  created_at: string;
  updated_at: string;
};

function mapRowToRecord(row: NotificationRow): NotificationRecord {
  return {
    id: row.id,
    recipientUserId: row.recipient_user_id,
    createdByUserId: row.created_by,
    messageThreadId: row.message_thread_id,
    alertType: row.alert_type,
    status: row.status,
    title: row.title,
    message: row.message,
    metadata: row.metadata || {},
    deliveryChannels: row.delivery_channels || [],
    acknowledgedAt: row.acknowledged_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export class NotificationService {
  private supabase = createServerSupabase();
  private agentBridge = new NotificationAgentBridge();

  async createNotification(
    payload: CreateNotificationInput,
    requestedByUserId: string
  ): Promise<NotificationRecord> {
    const data = createNotificationSchema.parse(payload);
    const config = ALERT_TYPE_CONFIG[data.alertType];

    const deliveryChannels =
      data.deliveryChannels ?? config.defaultChannels;
    const recipientUserId = data.recipientUserId ?? requestedByUserId;
    const shouldNotifyAgent = deliveryChannels.includes('chat');

    let messageThreadId = data.messageThreadId ?? null;
    if (shouldNotifyAgent) {
      messageThreadId = await this.agentBridge.ensureThread(
        recipientUserId,
        messageThreadId
      );
    }

    const record: NotificationInsert = {
      recipient_user_id: recipientUserId,
      alert_type: data.alertType,
      status: 'pending' as NotificationStatus,
      title: data.title ?? config.defaultTitle,
      message: data.message,
      metadata: (data.metadata ?? {}) as NotificationInsert['metadata'],
      delivery_channels: deliveryChannels,
      created_by: requestedByUserId,
      message_thread_id: messageThreadId
    };

    const { data: inserted, error } = await this.supabase
      .from('notification')
      .insert(record)
      .select()
      .single<NotificationRow>();

    if (error || !inserted) {
      console.error('Failed to create notification', error);
      throw new Error('Failed to create notification');
    }

    const notification = mapRowToRecord(inserted);

    if (shouldNotifyAgent) {
      await this.agentBridge.publish(notification);
    }

    return notification;
  }

  async listNotifications(
    recipientUserId: string,
    filters: ListNotificationsFilters = {}
  ): Promise<NotificationRecord[]> {
    const parsed = listNotificationsSchema.parse(filters);
    let query = this.supabase
      .from('notification')
      .select('*')
      .eq('recipient_user_id', recipientUserId)
      .order('created_at', { ascending: false })
      .limit(parsed.limit ?? 25);

    if (parsed.status) {
      query = query.eq('status', parsed.status);
    }

    if (parsed.alertType) {
      query = query.eq('alert_type', parsed.alertType);
    }

    const { data, error } = await query;

    if (error || !data) {
      console.error('Failed to fetch notifications', error);
      throw new Error('Failed to fetch notifications');
    }

    return (data as NotificationRow[]).map(mapRowToRecord);
  }

  async acknowledgeNotification(
    notificationId: string,
    userId: string
  ): Promise<NotificationRecord> {
    const { data, error } = await this.supabase
      .from('notification')
      .update({
        status: 'acknowledged',
        acknowledged_at: new Date().toISOString()
      })
      .eq('id', notificationId)
      .eq('recipient_user_id', userId)
      .select()
      .single<NotificationRow>();

    if (error || !data) {
      console.error('Failed to acknowledge notification', error);
      throw new Error('Failed to acknowledge notification');
    }

    return mapRowToRecord(data);
  }
}

