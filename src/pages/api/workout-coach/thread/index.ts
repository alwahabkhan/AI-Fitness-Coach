import { NextApiRequest, NextApiResponse } from 'next';
import { getSessionFromRequest } from '@/lib/session';
import { WorkoutCoachService } from '@/lib/workout-coach';

const workoutCoachService = new WorkoutCoachService();

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
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
    }
  } catch (error) {
    console.error('Error in workout coach threads API:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function createThread(res: NextApiResponse, id: string) {
  const newThread = await workoutCoachService.createNewThread(id);
  return res.status(201).json({ thread: newThread });
}
