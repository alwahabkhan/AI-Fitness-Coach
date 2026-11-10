import type { NextApiRequest, NextApiResponse } from 'next';
import { getSessionFromRequest } from '@/lib/session';
import { NotificationService } from '@/lib/notifications/notification-service';

const notificationService = new NotificationService();

export default async function acknowledgeHandler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const session = getSessionFromRequest(req);
  if (!session?.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { id } = req.query;
  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Notification id is required' });
  }

  try {
    const notification = await notificationService.acknowledgeNotification(
      id,
      session.user.id
    );
    return res.status(200).json({ notification });
  } catch (err) {
    console.error('Failed to acknowledge notification', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

