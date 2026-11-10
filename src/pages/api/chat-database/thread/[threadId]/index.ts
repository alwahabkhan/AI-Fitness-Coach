import { NextApiRequest, NextApiResponse } from 'next';
import { getSessionFromRequest } from '@/lib/session';
import { databaseAssistantService } from '@/lib/chat-database';

async function getMessagesHandler(userId: string, threadId: string) {
  const messages = await databaseAssistantService.loadMessages(
    userId,
    threadId
  );
  return messages;
}

async function deleteThreadHandler(threadId: string) {
  await databaseAssistantService.deleteThread(threadId);
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

    const { threadId } = req.query;

    if (!threadId || typeof threadId !== 'string') {
      return res.status(400).json({ error: 'Thread ID is required' });
    }

    if (req.method === 'GET') {
      try {
        const messages = await getMessagesHandler(user.id, threadId);
        return res.status(200).json(messages);
      } catch (error) {
        if (error instanceof Error && error.message === 'Thread not found') {
          return res.status(404).json({ error: 'Thread not found' });
        }
        console.error('Error loading messages:', error);
        return res.status(500).json({ error: 'Failed to load messages' });
      }
    } else if (req.method === 'DELETE') {
      try {
        await deleteThreadHandler(threadId);
        return res.status(204).end();
      } catch (error) {
        console.error('Error deleting thread:', error);
        return res.status(500).json({ error: 'Failed to delete thread' });
      }
    } else {
      return res.status(405).json({ error: 'Method not allowed' });
    }
  };
}

export default createThreadHandler();
