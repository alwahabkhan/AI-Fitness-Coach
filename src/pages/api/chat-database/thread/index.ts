import { NextApiRequest, NextApiResponse } from 'next';
import { getSessionFromRequest } from '@/lib/session';
import { databaseAssistantService } from '@/lib/chat-database';

async function getThreadsHandler(userId: string) {
  const threads = await databaseAssistantService.loadThreads(userId);
  return threads;
}

async function createNewThreadHandler(userId: string) {
  const newThread = await databaseAssistantService.createNewThread(userId);
  return newThread;
}

function createThreadHandler() {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    const session = getSessionFromRequest(req);
    if (!session?.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const user = session.user;

    if (user.role !== 'admin') {
      return res.status(403).json({
        error: 'Access denied. Only admins can use the database assistant.'
      });
    }

    if (req.method === 'GET') {
      try {
        const threads = await getThreadsHandler(user.id);
        return res.status(200).json(threads);
      } catch (error) {
        console.error('Error loading threads:', error);
        return res.status(500).json({ error: 'Failed to load threads' });
      }
    } else if (req.method === 'POST') {
      try {
        const newThread = await createNewThreadHandler(user.id);
        return res.status(201).json(newThread);
      } catch (error) {
        console.error('Error creating thread:', error);
        return res.status(500).json({ error: 'Failed to create thread' });
      }
    } else {
      return res.status(405).json({ error: 'Method not allowed' });
    }
  };
}

export default createThreadHandler();
