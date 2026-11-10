import { NextApiRequest, NextApiResponse } from 'next';
import { getSessionFromRequest } from '@/lib/session';
import { workoutService } from '@/lib/workout';

async function getHandler() {
  const workouts = await workoutService.getAllWorkoutsWithUserInfo();
  return { workouts };
}

function createWorkoutsHandler() {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    if (req.method !== 'GET') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
      const session = getSessionFromRequest(req);

      if (!session) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      if (session.user.role !== 'trainer') {
        return res
          .status(403)
          .json({ error: 'Forbidden - Trainer access required' });
      }

      const result = await getHandler();
      return res.status(200).json(result);
    } catch (error) {
      if (error instanceof Error) {
        if (
          error.message === 'Failed to fetch workouts' ||
          error.message === 'Failed to fetch exercises'
        ) {
          console.error('Database error:', error);
          return res.status(500).json({ error: 'Database operation failed' });
        }
      }
      console.error('Error in workouts API:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  };
}

export default createWorkoutsHandler();
