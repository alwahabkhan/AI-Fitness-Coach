import { NextApiRequest, NextApiResponse } from 'next';
import { getSessionFromRequest } from '@/lib/session';
import { promptInspectorService } from '@/lib/prompt-inspector';
import { UserWithoutPassword } from '@/lib/auth';

async function getHandler(currentUser: UserWithoutPassword) {
  const users = await promptInspectorService.getTrainees(currentUser);
  return { users };
}

function createTraineesHandler() {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    if (req.method !== 'GET') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
      const session = getSessionFromRequest(req);

      if (!session) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      if (session.user.role !== 'trainer' && session.user.role !== 'admin') {
        return res
          .status(403)
          .json({ error: 'Forbidden - Trainer access required' });
      }

      const result = await getHandler(session.user);
      return res.status(200).json(result);
    } catch (error) {
      console.error('Error in trainees API:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  };
}

export default createTraineesHandler();
