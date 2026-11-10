import type { NextApiRequest, NextApiResponse } from 'next';
import { getSessionFromRequest } from '@/lib/session';
import { NotificationService } from '@/lib/notifications/notification-service';
import { createNotificationSchema, listNotificationsSchema } from '@/lib/notifications/schema';

const notificationService = new NotificationService();

export default async function notificationHandler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const session = getSessionFromRequest(req);

  if (!session?.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method === 'POST') {
    const { success, data, error } = createNotificationSchema.safeParse(req.body);

    if (!success) {
      return res.status(400).json({
        error: 'Invalid request body',
        details: error.flatten().fieldErrors
      });
    }

    try {
      const notification = await notificationService.createNotification(
        data,
        session.user.id
      );
      return res.status(201).json({ notification });
    } catch (err) {
      console.error('Failed to create notification', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  if (req.method === 'GET') {
    const { success, data, error } = listNotificationsSchema.safeParse({
      status: req.query.status,
      alertType: req.query.alertType,
      limit: req.query.limit ? Number(req.query.limit) : undefined
    });

    if (!success) {
      return res.status(400).json({
        error: 'Invalid query parameters',
        details: error.flatten().fieldErrors
      });
    }

    try {
      const notifications = await notificationService.listNotifications(
        session.user.id,
        data
      );
      return res.status(200).json({ notifications });
    } catch (err) {
      console.error('Failed to list notifications', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  res.setHeader('Allow', 'GET, POST');
  return res.status(405).json({ error: 'Method not allowed' });
}

