import { NextApiRequest, NextApiResponse } from 'next';

import { nutritionCoachService } from '@/lib/chat-nutrition';
import { getSessionFromRequest } from '@/lib/session';
import type { ThreadDebugInfo } from '@/database/derived.types';

function createDebugHandler() {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    if (req.method !== 'GET') {
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

    const { threadId } = req.query;

    if (!threadId || typeof threadId !== 'string') {
      return res.status(400).json({ error: 'Thread ID is required' });
    }

    try {
      const thread = await nutritionCoachService.getThreadById(
        user.id,
        threadId
      );

      if (!thread) {
        return res.status(404).json({ error: 'Thread not found' });
      }

      const threadMeta = thread.meta as { debug?: ThreadDebugInfo } | null;
      const debugInfo = threadMeta?.debug;

      if (!debugInfo) {
        return res
          .status(404)
          .json({ error: 'No debug information available for this thread' });
      }

      return res.status(200).json({
        debugInfo
      });
    } catch (error) {
      console.error('Error fetching thread debug info:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  };
}

export default createDebugHandler();
