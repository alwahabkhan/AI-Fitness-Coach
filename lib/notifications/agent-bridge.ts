import { createServerSupabase } from '../supabase';
import { WorkoutCoachService } from '../workout-coach';
import { NotificationRecord } from './types';

export class NotificationAgentBridge {
  private supabase = createServerSupabase();
  private workoutCoachService = new WorkoutCoachService();

  async ensureThread(
    userId: string,
    existingThreadId?: string | null
  ): Promise<string> {
    if (existingThreadId) {
      return existingThreadId;
    }

    const { data: existing } = await this.supabase
      .from('message_thread')
      .select('id')
      .eq('owner_user_id', userId)
      .eq('type', 'workout_coach')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existing?.id) {
      return existing.id;
    }

    const { data: created, error } = await this.supabase
      .from('message_thread')
      .insert({
        owner_user_id: userId,
        type: 'workout_coach',
        title: 'Workout Coach Session',
        meta: { source: 'notification_bridge' }
      })
      .select('id')
      .single();

    if (error || !created?.id) {
      throw new Error('Failed to create agent message thread');
    }

    return created.id;
  }

  async publish(notification: NotificationRecord): Promise<void> {
    if (
      !notification.deliveryChannels.includes('chat') ||
      !notification.messageThreadId
    ) {
      return;
    }

    const content = this.buildMessage(notification);

    await this.workoutCoachService.saveMessage(
      notification.messageThreadId,
      content,
      'system',
      null,
      {
        notificationId: notification.id,
        alertType: notification.alertType
      }
    );
  }

  private buildMessage(notification: NotificationRecord): string {
    const prefix = {
      success: '✅ Success alert',
      reminder: '🔔 Reminder',
      error: '⚠️ Error alert'
    }[notification.alertType];

    return `${prefix}: ${notification.title}\n\n${notification.message}`;
  }
}

