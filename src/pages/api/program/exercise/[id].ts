/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextApiRequest, NextApiResponse } from 'next';
import { getSessionFromRequest } from '@/lib/session';
import { createServerSupabase } from '@/lib/supabase';
import {
  UpdateTrainingExerciseRequest,
  TrainingExerciseWithDetails
} from '@/database/program-builder.types';

async function getTrainingExercise(
  id: string
): Promise<TrainingExerciseWithDetails> {
  const supabase = createServerSupabase();
  const { data: exercise, error } = await supabase
    .from('training_exercise')
    .select(
      `
      *,
      exercise:exercise_id(*)
    `
    )
    .eq('id', id)
    .single();

  if (error) throw error;
  return exercise;
}

async function updateTrainingExercise(
  id: string,
  data: UpdateTrainingExerciseRequest
): Promise<TrainingExerciseWithDetails> {
  const supabase = createServerSupabase();

  // Validate allowed fields
  const allowedUpdates = [
    'exercise_id',
    'exercise_order',
    'group_number',
    'sets',
    'reps',
    'weights',
    'rest_seconds',
    'reps_progression',
    'weight_progression',
    'r_plus_option',
    'notes'
  ];

  const updates: Record<string, any> = {};
  for (const key of Object.keys(data)) {
    if (allowedUpdates.includes(key)) {
      updates[key] = (data as any)[key];
    }
  }

  // Update the training exercise
  const { error } = await supabase
    .from('training_exercise')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;

  // Fetch the complete data with exercise details
  return await getTrainingExercise(id);
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

  const { id } = req.query;
  if (typeof id !== 'string') {
    return res.status(400).json({ error: 'Invalid training exercise ID' });
  }

  try {
    if (req.method === 'GET') {
      const exercise = await getTrainingExercise(id);
      return res.status(200).json(exercise);
    }

    if (req.method === 'PUT') {
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
                .json({ error: 'You can only edit programs assigned to you' });
            }
          }
        }
      }

      const exercise = await updateTrainingExercise(id, req.body);
      return res.status(200).json(exercise);
    }

    if (req.method === 'DELETE') {
      if (session.user.role === 'trainee') {
        const supabase = createServerSupabase();
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
                .json({ error: 'You can only edit programs assigned to you' });
            }
          }
        }
      }

      await deleteTrainingExercise(id);
      return res.status(204).end();
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Training exercise API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
