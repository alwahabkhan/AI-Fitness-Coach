import { z } from 'zod';
import { NextApiRequest, NextApiResponse } from 'next';
import { getSessionFromRequest } from '@/lib/session';
import { promptInspectorService } from '@/lib/prompt-inspector';

const getQuerySchema = z.object({
  userId: z.string().min(1, 'User ID is required')
});

const putBodySchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  content: z.string().default('')
});

async function getHandler(query: z.infer<typeof getQuerySchema>) {
  const { userId } = query;
  const isValidTrainee = await promptInspectorService.validateTrainee(userId);
  if (!isValidTrainee) {
    throw new Error('Trainee not found');
  }

  const breakdown =
    await promptInspectorService.getNutritionPromptBreakdown(userId);

  return breakdown;
}

async function putHandler(body: z.infer<typeof putBodySchema>) {
  const { userId, content } = body;

  const isValidTrainee = await promptInspectorService.validateTrainee(userId);
  if (!isValidTrainee) {
    throw new Error('Trainee not found');
  }

  await saveNutritionPrompt(userId, content);

  return { message: 'Nutrition prompt saved successfully' };
}

async function saveNutritionPrompt(userId: string, content: string) {
  const userPrompt = await promptInspectorService.getUserSpecificPrompt(
    'nutrition',
    userId
  );

  if (userPrompt?.id) {
    const error = await promptInspectorService.updateUserSpecificPrompt(
      'nutrition',
      userPrompt.id,
      content
    );

    if (error) throw error;
  } else {
    const error = await promptInspectorService.createUserSpecificPrompt(
      'nutrition',
      userId,
      content
    );

    if (error) throw error;
  }
}

function createNutritionHandler() {
  return async (req: NextApiRequest, res: NextApiResponse) => {
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
      if (req.method === 'GET') {
        const { success, data, error } = getQuerySchema.safeParse(req.query);

        if (!success) {
          return res.status(400).json({
            error: 'Invalid query parameters',
            details: error.flatten().fieldErrors
          });
        }

        const result = await getHandler(data);
        return res.status(200).json(result);
      } else if (req.method === 'PUT') {
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
      console.error('Error in nutrition API:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  };
}

export default createNutritionHandler();
