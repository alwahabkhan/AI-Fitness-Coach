'use client';

// Client-side helper to create notifications via API
export async function createNotificationClient(
  alertType: 'success' | 'reminder' | 'error',
  message: string,
  title?: string,
  deliveryChannels?: ('in_app' | 'chat' | 'email')[],
  messageThreadId?: string
) {
  try {
    const response = await fetch('/api/notifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        alertType,
        message,
        title,
        deliveryChannels: deliveryChannels || ['in_app'],
        messageThreadId
      })
    });

    if (!response.ok) {
      console.error('Failed to create notification');
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error('Error creating notification', error);
    return null;
  }
}

// Helper to create error notifications for data sync failures
export async function notifyDataSyncError(error: Error | string, context?: string) {
  const errorMessage = error instanceof Error ? error.message : error;
  const message = context
    ? `Data sync failed: ${errorMessage} (${context})`
    : `Data sync failed: ${errorMessage}`;

  return createNotificationClient(
    'error',
    message,
    'Sync Error',
    ['in_app', 'chat']
  );
}

