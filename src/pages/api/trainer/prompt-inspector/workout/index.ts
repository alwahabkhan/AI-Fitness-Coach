import { z } from 'zod';
import { NextApiRequest, NextApiResponse } from 'next';
import { getSessionFromRequest } from '@/lib/session';
import { promptInspectorService } from '@/lib/prompt-inspector';

const getQuerySchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  workoutId: z.string().optional()
});

const putBodySchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  workoutId: z.string().optional(),
  content: z.string().default('')
});

const patchBodySchema = z.object({
  workoutId: z.string().min(1, 'Workout ID is required'),
  content: z.string().default('')
});

async function getHandler(query: z.infer<typeof getQuerySchema>) {
  const { userId, workoutId } = query;

  const isValidTrainee = await promptInspectorService.validateTrainee(userId);
  if (!isValidTrainee) {
    throw new Error('Trainee not found');
  }

  if (workoutId) {
    const isValidWorkout =
      await promptInspectorService.validateWorkoutOwnership(workoutId, userId);

    if (!isValidWorkout) {
      throw new Error('Workout not found or does not belong to trainee');
    }

    const breakdown = await promptInspectorService.getWorkoutPromptBreakdown(
      userId,
      workoutId
    );

    return breakdown;
  }

  // If no workoutId provided, return basic workout prompt breakdown + workouts list
  const breakdown =
    await promptInspectorService.getWorkoutPromptBreakdown(userId);
  const workouts = await promptInspectorService.getWorkoutsForTrainee(userId);

  return {
    ...breakdown,
    workouts
  };
}

async function putHandler(body: z.infer<typeof putBodySchema>) {
  const { userId, workoutId, content } = body;

  const isValidTrainee = await promptInspectorService.validateTrainee(userId);
  if (!isValidTrainee) {
    throw new Error('Trainee not found');
  }

  if (workoutId) {
    const isValidWorkout =
      await promptInspectorService.validateWorkoutOwnership(workoutId, userId);
    if (!isValidWorkout) {
      throw new Error('Workout not found or does not belong to trainee');
    }
  }

  await saveWorkoutPrompt(userId, content);

  return { message: 'Workout prompt saved successfully' };
}

async function saveWorkoutPrompt(userId: string, content: string) {
  const userPrompt = await promptInspectorService.getUserSpecificPrompt(
    'workout',
    userId
  );

  if (userPrompt?.id) {
    const error = await promptInspectorService.updateUserSpecificPrompt(
      'workout',
      userPrompt.id,
      content
    );

    if (error) throw error;
  } else {
    const error = await promptInspectorService.createUserSpecificPrompt(
      'workout',
      userId,
      content
    );
    console.log('error', error);

    if (error) throw error;
  }
}

async function patchHandler(body: z.infer<typeof patchBodySchema>) {
  const { workoutId, content } = body;

  // Check if it's a program or legacy workout and get the user ID
  const supabase = promptInspectorService.getSupabaseClient();

  // First check if it's a program
  const { data: programData } = await supabase
    .from('program')
    .select('trainee_id')
    .eq('id', workoutId)
    .maybeSingle();

  let userId: string;

  if (programData) {
    userId = programData.trainee_id;
  } else {
    // Check legacy workout table
    const { data: workoutData } = await supabase
      .from('workout')
      .select('user_id')
      .eq('id', workoutId)
      .maybeSingle();

    if (!workoutData) {
      throw new Error('Workout or Program not found');
    }

    userId = workoutData.user_id;
  }

  // Update the workout/program's agent_context
  await promptInspectorService.updateWorkoutContext(workoutId, content);

  // Get the updated workout breakdown
  const updatedBreakdown =
    await promptInspectorService.getWorkoutPromptBreakdown(userId, workoutId);

  return updatedBreakdown;
}

function createWorkoutHandler() {
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
        console.log('success', success);
        console.log('data', data);
        console.log('error', error);

        if (!success) {
          return res.status(400).json({
            error: 'Invalid request body',
            details: error.flatten().fieldErrors
          });
        }

        const result = await putHandler(data);
        return res.status(200).json(result);
      } else if (req.method === 'PATCH') {
        const { success, data, error } = patchBodySchema.safeParse(req.body);

        if (!success) {
          return res.status(400).json({
            error: 'Invalid request body',
            details: error.flatten().fieldErrors
          });
        }

        const result = await patchHandler(data);
        return res.status(200).json(result);
      } else {
        return res.status(405).json({ error: 'Method not allowed' });
      }
    } catch (error) {
      if (error instanceof Error && error.message === 'Trainee not found') {
        return res.status(404).json({ error: 'Trainee not found' });
      }
      if (
        error instanceof Error &&
        error.message === 'Workout not found or does not belong to trainee'
      ) {
        return res
          .status(404)
          .json({ error: 'Workout not found or does not belong to trainee' });
      }
      console.error('Error in workout API:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  };
}

export default createWorkoutHandler();
