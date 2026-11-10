import { NextApiRequest, NextApiResponse } from 'next';
import { getSessionFromRequest } from '@/lib/session';
import { nutritionCoachService } from '@/lib/chat-nutrition';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST' && req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const session = getSessionFromRequest(req);
  if (!session?.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const user = session.user;

  if (user.role !== 'trainee') {
    return res.status(403).json({ error: 'Forbidden - Trainees only' });
  }

  try {
    if (req.method === 'POST') {
      return createThread(res, user.id);
    } else if (req.method === 'DELETE') {
      return deleteThread(res, req.body.threadId);
    }
  } catch (error) {
    console.error('Error in nutrition coach threads API:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function createThread(res: NextApiResponse, id: string) {
  const newThread = await nutritionCoachService.createNewThread(id);
  return res.status(201).json({ thread: newThread });
}

async function deleteThread(res: NextApiResponse, threadId: string) {
  if (!threadId) {
    return res.status(400).json({ error: 'Thread ID is required' });
  }
  await nutritionCoachService.deleteThread(threadId as string);
  return res.status(200).json({ message: 'Thread deleted' });
}
