import { NextApiRequest, NextApiResponse } from 'next';
import { getSessionFromRequest } from '@/lib/session';
import { createServerSupabase } from '@/lib/supabase';
import {
  CreateTrainingExerciseRequest,
  TrainingExerciseWithDetails,
  normalizeExerciseArrays
} from '@/database/program-builder.types';

// Validation helper for exercise arrays
function validateExerciseArrays(
  sets: number,
  reps?: number[],
  weights?: number[]
): string[] {
  const errors: string[] = [];

  if (sets < 1 || sets > 99) {
    errors.push('Sets must be between 1 and 99');
  }

  if (reps && reps.length !== sets) {
    errors.push(
      `Reps array length (${reps.length}) must match sets count (${sets})`
    );
  }

  if (weights && weights.length !== sets) {
    errors.push(
      `Weights array length (${weights.length}) must match sets count (${sets})`
    );
  }

  if (reps && reps.some((r) => r < 1 || r > 100)) {
    errors.push('All reps values must be between 1 and 100');
  }

  if (weights && weights.some((w) => w < 0 || w > 1000)) {
    errors.push('All weight values must be between 0 and 1000');
  }

  return errors;
}

async function createTrainingExercise(
  data: CreateTrainingExerciseRequest
): Promise<TrainingExerciseWithDetails> {
  const supabase = createServerSupabase();

  // Validate input data
  const sets = data.sets || 3;
  const validationErrors = validateExerciseArrays(
    sets,
    data.reps,
    data.weights
  );

  if (validationErrors.length > 0) {
    throw new Error(`Validation failed: ${validationErrors.join(', ')}`);
  }

  // Normalize arrays to match sets count
  const { reps, weights } = normalizeExerciseArrays(
    sets,
    data.reps,
    data.weights
  );

  // If no exercise_order provided, auto-assign the next available one
  if (!data.exercise_order) {
    const { data: existingExercises } = await supabase
      .from('training_exercise')
      .select('exercise_order')
      .eq('training_day_id', data.training_day_id)
      .order('exercise_order', { ascending: false })
      .limit(1);

    const maxOrder = existingExercises?.[0]?.exercise_order || 0;
    data.exercise_order = maxOrder + 1;
  }

  // Prepare the data with normalized arrays
  const exerciseData = {
    ...data,
    sets,
    reps,
    weights // Note: using 'weights' instead of 'weight'
  };

  const { data: exercise, error } = await supabase
    .from('training_exercise')
    .insert(exerciseData)
    .select(
      `
      *,
      exercise:exercise_id(*)
    `
    )
    .single();

  if (error) throw error;
  return exercise;
}

async function getTrainingExercises(
  dayId: string
): Promise<TrainingExerciseWithDetails[]> {
  const supabase = createServerSupabase();
  const { data, error } = await supabase
    .from('training_exercise')
    .select(
      `
      *,
      exercise:exercise_id(*)
    `
    )
    .eq('training_day_id', dayId)
    .order('exercise_order');

  if (error) throw error;
  return data || [];
}

async function updateTrainingExercise(
  id: string,
  data: Partial<CreateTrainingExerciseRequest>
): Promise<TrainingExerciseWithDetails> {
  const supabase = createServerSupabase();

  // If sets are being updated, ensure arrays match
  if (data.sets !== undefined) {
    const validationErrors = validateExerciseArrays(
      data.sets,
      data.reps,
      data.weights
    );

    if (validationErrors.length > 0) {
      throw new Error(`Validation failed: ${validationErrors.join(', ')}`);
    }

    // Normalize arrays to match new sets count
    const { reps, weights } = normalizeExerciseArrays(
      data.sets,
      data.reps,
      data.weights
    );

    data.reps = reps;
    data.weights = weights;
  }

  const { data: exercise, error } = await supabase
    .from('training_exercise')
    .update(data)
    .eq('id', id)
    .select(
      `
      *,
      exercise:exercise_id(*)
    `
    )
    .single();

  if (error) throw error;
  return exercise;
}

async function deleteTrainingExercise(id: string): Promise<void> {
  const supabase = createServerSupabase();
  const { error } = await supabase
    .from('training_exercise')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const session = getSessionFromRequest(req);
  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    if (req.method === 'POST') {
      // Trainees can create exercises if the program is assigned to them
      if (session.user.role === 'trainee') {
        const supabase = createServerSupabase();
        // Verify the training day belongs to a program assigned to this trainee
        const { data: day } = await supabase
          .from('training_day')
          .select('program_id')
          .eq('id', req.body.training_day_id)
          .single();

        if (day) {
          const { data: program } = await supabase
            .from('program')
            .select('trainee_id')
            .eq('id', day.program_id)
            .single();

          if (program?.trainee_id !== session.user.id) {
            return res
              .status(403)
              .json({ error: 'You can only add exercises to programs assigned to you' });
          }
        } else {
          return res
            .status(404)
            .json({ error: 'Training day not found' });
        }
      }

      // Log the incoming data for debugging
      console.log('Creating exercise with data:', req.body);

      const exercise = await createTrainingExercise(req.body);
      return res.status(201).json(exercise);
    }

    if (req.method === 'GET') {
      const { day_id } = req.query;
      if (typeof day_id !== 'string') {
        return res
          .status(400)
          .json({ error: 'day_id query parameter required' });
      }

      const exercises = await getTrainingExercises(day_id);
      return res.status(200).json(exercises);
    }

    if (req.method === 'PUT') {
      const { id } = req.query;
      if (typeof id !== 'string') {
        return res.status(400).json({ error: 'Exercise ID required' });
      }

      // Trainees can update exercises if the program is assigned to them
      if (session.user.role === 'trainee') {
        const supabase = createServerSupabase();
        // Check ownership chain: exercise -> day -> program
        const { data: exercise } = await supabase
          .from('training_exercise')
          .select('training_day_id')
          .eq('id', id)
          .single();

        if (exercise) {
          const { data: day } = await supabase
            .from('training_day')
            .select('program_id')
            .eq('id', exercise.training_day_id)
            .single();

          if (day) {
            const { data: program } = await supabase
              .from('program')
              .select('trainee_id')
              .eq('id', day.program_id)
              .single();

            if (program?.trainee_id !== session.user.id) {
              return res
                .status(403)
                .json({ error: 'You can only edit exercises in programs assigned to you' });
            }
          }
        }
      }

      const exercise = await updateTrainingExercise(id, req.body);
      return res.status(200).json(exercise);
    }

    if (req.method === 'DELETE') {
      const { id } = req.query;
      if (typeof id !== 'string') {
        return res.status(400).json({ error: 'Exercise ID required' });
      }

      // Trainees can delete exercises if the program is assigned to them
      if (session.user.role === 'trainee') {
        const supabase = createServerSupabase();
        // Check ownership chain: exercise -> day -> program
        const { data: exercise } = await supabase
          .from('training_exercise')
          .select('training_day_id')
          .eq('id', id)
          .single();

        if (exercise) {
          const { data: day } = await supabase
            .from('training_day')
            .select('program_id')
            .eq('id', exercise.training_day_id)
            .single();

          if (day) {
            const { data: program } = await supabase
              .from('program')
              .select('trainee_id')
              .eq('id', day.program_id)
              .single();

            if (program?.trainee_id !== session.user.id) {
              return res
                .status(403)
                .json({ error: 'You can only delete exercises in programs assigned to you' });
            }
          }
        }
      }

      await deleteTrainingExercise(id);
      return res.status(200).json({ message: 'Exercise deleted successfully' });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Training exercises API error:', error);

    // Handle validation errors specifically
    if (error instanceof Error && error.message.includes('Validation failed')) {
      return res.status(400).json({
        error: 'Validation error',
        details: error.message
      });
    }

    return res.status(500).json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
