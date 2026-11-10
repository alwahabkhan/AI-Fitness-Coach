import { z } from 'zod';
import { NextApiRequest, NextApiResponse } from 'next';
import { createServerSupabase } from '@/lib/supabase';
import { getSessionFromRequest } from '@/lib/session';

const exerciseDataSchema = z.object({
  group: z.number().min(1, 'Group must be at least 1'),
  youtubeLink: z
    .string()
    .url('Valid YouTube URL is required')
    .optional()
    .or(z.literal('')),
  name: z.string().min(1, 'Exercise name is required'),
  sets: z.number().min(1, 'Sets must be at least 1'),
  rest: z.number().min(0, 'Rest must be non-negative'),
  weights: z
    .number()
    .min(0, 'Weight must be non-negative')
    .or(
      z.string().refine((val) => val.toLowerCase().includes('bw'), {
        message: 'Weight must be in BW format'
      })
    ),
  reps: z.number().min(1, 'Reps must be at least 1')
});

const workoutDaySchema = z.object({
  day: z.number().min(1, 'Day must be at least 1'),
  exercises: z
    .array(exerciseDataSchema)
    .min(1, 'At least one exercise is required')
});

const importedWorkoutSchema = z.object({
  name: z.string().min(1, 'Workout name is required'),
  workoutDays: z
    .array(workoutDaySchema)
    .min(1, 'At least one workout day is required')
});

const postBodySchema = z.object({
  workout: importedWorkoutSchema,
  userId: z.string().uuid('Valid user ID is required')
});

async function postHandler(body: z.infer<typeof postBodySchema>) {
  const { workout, userId } = body;
  const supabase = createServerSupabase();

  // Verify the target user exists and is a trainee
  const { data: targetUser, error: userError } = await supabase
    .from('user')
    .select('id, role')
    .eq('id', userId)
    .single();

  if (userError || !targetUser) {
    throw new Error('Target user not found');
  }

  if (targetUser.role !== 'trainee') {
    throw new Error('Can only import workouts for trainees');
  }

  const createdWorkouts: Array<{ id: string; name: string; day: number }> = [];

  // Create a workout for each day
  for (const workoutDay of workout.workoutDays) {
    const workoutName = `${workout.name} - Day ${workoutDay.day}`;

    const { data: createdWorkout, error: workoutError } = await supabase
      .from('workout')
      .insert({
        user_id: userId,
        name: workoutName,
        agent_context: null
      })
      .select('id, name')
      .single();

    if (workoutError) {
      console.error('Error creating workout:', workoutError);
      throw new Error('Failed to create workout');
    }

    createdWorkouts.push({
      id: createdWorkout.id,
      name: createdWorkout.name,
      day: workoutDay.day
    });

    for (let i = 0; i < workoutDay.exercises.length; i++) {
      const exercise = workoutDay.exercises[i];

      const executionMeta = {
        sets: exercise.sets,
        reps: exercise.reps,
        weight: exercise.weights,
        rest_seconds: exercise.rest
      };

      const { error: exerciseError } = await supabase.from('exercise').insert({
        workout_id: createdWorkout.id,
        name: exercise.name,
        execution_meta: executionMeta,
        group: exercise.group,
        order: i + 1, // Sequential order within the workout
        video_url: exercise.youtubeLink || null,
        agent_context: null
      });

      if (exerciseError) {
        console.error('Error creating exercise:', exerciseError);
        throw new Error('Failed to create exercise');
      }
    }
  }

  return {
    success: true,
    message: `Successfully imported ${workout.workoutDays.length} workout day(s)`,
    createdWorkouts
  };
}

function createWorkoutImportHandler() {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
      const session = getSessionFromRequest(req);

      if (!session) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      if (session.user.role !== 'trainer') {
        return res
          .status(403)
          .json({ error: 'Forbidden - Trainer access required' });
      }

      const { success, data, error } = postBodySchema.safeParse(req.body);

      if (!success) {
        return res.status(400).json({
          error: 'Invalid request body',
          details: error.flatten().fieldErrors
        });
      }

      const result = await postHandler(data);
      return res.status(200).json(result);
    } catch (error) {
      if (error instanceof Error) {
        if (
          error.message === 'Target user not found' ||
          error.message === 'Can only import workouts for trainees'
        ) {
          return res.status(400).json({ error: error.message });
        }
        if (
          error.message === 'Failed to create workout' ||
          error.message === 'Failed to create exercise'
        ) {
          console.error('Database error:', error);
          return res.status(500).json({ error: 'Database operation failed' });
        }
      }
      console.error('Error in workout import API:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  };
}

export default createWorkoutImportHandler();
