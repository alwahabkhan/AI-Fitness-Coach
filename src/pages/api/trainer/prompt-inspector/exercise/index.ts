import { z } from 'zod';
import { NextApiRequest, NextApiResponse } from 'next';
import { getSessionFromRequest } from '@/lib/session';
import { createServerSupabase } from '@/lib/supabase';

const putBodySchema = z.object({
  exerciseId: z.string().min(1, 'Exercise ID is required'),
  content: z.string().default('')
});

async function putHandler(body: z.infer<typeof putBodySchema>) {
  const { exerciseId, content } = body;
  const supabase = createServerSupabase();

  // Check if this is a centralized_exercise ID (new system) or exercise ID (old system)
  const centralizedExerciseCheck = await supabase
    .from('centralized_exercise')
    .select('id')
    .eq('id', exerciseId)
    .maybeSingle();

  if (centralizedExerciseCheck.data) {
    // This is a centralized exercise ID
    // Update ALL training_exercise records that use this centralized exercise
    const { error } = await supabase
      .from('training_exercise')
      .update({ agent_context: content })
      .eq('exercise_id', exerciseId);

    if (error) throw error;

    return {
      message: 'Exercise context updated successfully for all instances'
    };
  } else {
    // Check if it's a legacy exercise (old system)
    const legacyExerciseCheck = await supabase
      .from('exercise')
      .select('id')
      .eq('id', exerciseId)
      .maybeSingle();

    if (legacyExerciseCheck.data) {
      // Update legacy exercise (old system)
      const { error } = await supabase
        .from('exercise')
        .update({ agent_context: content })
        .eq('id', exerciseId);

      if (error) throw error;

      return { message: 'Exercise context updated successfully' };
    } else {
      throw new Error('Exercise not found');
    }
  }
}

function createExerciseHandler() {
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
      if (req.method === 'PUT') {
        const { success, data, error } = putBodySchema.safeParse(req.body);

        if (!success) {
          return res
            .status(400)
            .json({ error: 'Invalid request body', details: error.errors });
        }

        const result = await putHandler(data);
        return res.status(200).json(result);
      }

      return res.status(405).json({ error: 'Method not allowed' });
    } catch (error) {
      console.error('Exercise context API error:', error);
      return res.status(500).json({
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };
}

export default createExerciseHandler();
