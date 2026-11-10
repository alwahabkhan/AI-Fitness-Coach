import { NextApiRequest, NextApiResponse } from 'next';
import { getSessionFromRequest } from '@/lib/session';
import { promptInspectorService } from '@/lib/prompt-inspector';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const session = getSessionFromRequest(req);
    if (!session) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (session.user.role !== 'trainer' && session.user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const type = req.query.type as 'workout' | 'nutrition';
    if (!type || (type !== 'workout' && type !== 'nutrition')) {
      return res.status(400).json({ error: 'Invalid type parameter' });
    }

    if (req.method === 'GET') {
      const globalPrompt = await promptInspectorService.getGlobalPrompt(type);
      return res.status(200).json({ content: globalPrompt?.content || '' });
    }

    if (req.method === 'PUT') {
      // Only admins can update global prompts
      if (session.user.role !== 'admin') {
        return res
          .status(403)
          .json({ error: 'Forbidden - Admin access required' });
      }

      const { content } = req.body;
      if (typeof content !== 'string') {
        return res.status(400).json({ error: 'Invalid content' });
      }

      await promptInspectorService.updateGlobalPrompt(type, content);
      return res
        .status(200)
        .json({ message: 'Global prompt updated successfully' });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Error in global prompt API:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
