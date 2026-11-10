import { z } from 'zod';
import { NextApiRequest, NextApiResponse } from 'next';
import { WorkoutCoachService } from '@/lib/workout-coach';
import { getSessionFromRequest } from '@/lib/session';

const bodySchema = z.object({
  threadId: z.string().min(1, 'Thread ID is required'),
  content: z.string().min(1, 'Message content is required'),
  type: z.enum(['user', 'assistant', 'system'])
});

const workoutCoachService = new WorkoutCoachService();

async function handler(body: z.infer<typeof bodySchema>, userId: string) {
  const { threadId, content, type } = body;
  // Only save the message, nothing else
  const message = await workoutCoachService.saveMessage(
    threadId,
    content,
    type,
    type === 'user' ? userId : null
  );
  return message;
}

export default async function createMessageHandler(
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

  const { success, data, error } = bodySchema.safeParse(req.body);
  if (!success) {
    return res.status(400).json({
      error: 'Invalid request body',
      details: error.flatten().fieldErrors
    });
  }

  try {
    const message = await handler(data, user.id);
    return res.status(200).json({ message });
  } catch (err) {
    console.error('Error saving workout coach message:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
