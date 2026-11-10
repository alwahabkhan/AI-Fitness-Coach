// This helper is for server-side use only
// For client-side, use the API endpoint directly
export async function createNotificationServerSide(
  alertType: 'success' | 'reminder' | 'error',
  message: string,
  userId: string,
  title?: string,
  deliveryChannels?: ('in_app' | 'chat' | 'email')[],
  messageThreadId?: string,
  metadata?: Record<string, unknown>
) {
  try {
    const { NotificationService } = await import('./notification-service');
    const notificationService = new NotificationService();
    
    return await notificationService.createNotification(
      {
        alertType,
        message,
        title,
        deliveryChannels: deliveryChannels || ['in_app', 'chat'],
        messageThreadId,
        metadata
      },
      userId
    );
  } catch (error) {
    console.error('Failed to create notification', error);
    return null;
  }
}

