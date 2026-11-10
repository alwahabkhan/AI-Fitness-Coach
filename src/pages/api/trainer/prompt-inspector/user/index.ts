import { z } from 'zod';
import { NextApiRequest, NextApiResponse } from 'next';
import { getSessionFromRequest } from '@/lib/session';
import { promptInspectorService } from '@/lib/prompt-inspector';

const putBodySchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  agentContext: z.string().default('')
});

async function putHandler(body: z.infer<typeof putBodySchema>) {
  const { userId, agentContext } = body;

  // Validate that the user is a trainee
  const isValidTrainee = await promptInspectorService.validateTrainee(userId);
  if (!isValidTrainee) {
    throw new Error('Trainee not found');
  }

  // Update the user's agent context
  await updateUserAgentContext(userId, agentContext);

  return { message: 'User context updated successfully' };
}

async function updateUserAgentContext(userId: string, agentContext: string) {
  const supabase = promptInspectorService.getSupabaseClient();

  const { error } = await supabase
    .from('user')
    .update({
      agent_context: agentContext,
      updated_at: new Date().toISOString()
    })
    .eq('id', userId);

  if (error) throw error;
}

function createUserContextHandler() {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    // Verify user is authenticated and is a trainer
    const session = getSessionFromRequest(req);

    if (!session) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (session.user.role !== 'trainer' && session.user.role !== 'admin') {
      return res
        .status(403)
        .json({ error: 'Forbidden - Trainer or Admin access required' });
    }

    try {
      if (req.method === 'PUT') {
        const { success, data, error } = putBodySchema.safeParse(req.body);

        if (!success) {
          return res.status(400).json({
            error: 'Invalid request body',
            details: error.flatten().fieldErrors
          });
        }

        const result = await putHandler(data);
        return res.status(200).json(result);
      } else {
        return res.status(405).json({ error: 'Method not allowed' });
      }
    } catch (error) {
      if (error instanceof Error && error.message === 'Trainee not found') {
        return res.status(404).json({ error: 'Trainee not found' });
      }
      console.error('Error in user context API:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  };
}

export default createUserContextHandler();
