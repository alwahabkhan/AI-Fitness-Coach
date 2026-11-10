import { NextApiRequest, NextApiResponse } from 'next';
import { getSessionFromRequest } from '@/lib/session';
import { createServerSupabase } from '@/lib/supabase';
import {
  UpdateTrainingDayRequest,
  TrainingDayWithExercises
} from '@/database/program-builder.types';

async function getTrainingDay(id: string): Promise<TrainingDayWithExercises> {
  const supabase = createServerSupabase();
  const { data: trainingDay, error } = await supabase
    .from('training_day')
    .select(
      `
      *,
      training_exercises:training_exercise(
        *,
        exercise:exercise_id(*)
      )
    `
    )
    .eq('id', id)
    .single();

  if (error) throw error;
  return trainingDay;
}

async function updateTrainingDay(
  id: string,
  data: UpdateTrainingDayRequest
): Promise<TrainingDayWithExercises> {
  const supabase = createServerSupabase();

  // Update the training day
  const { error } = await supabase
    .from('training_day')
    .update(data)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;

  // Fetch the complete data with exercises
  return await getTrainingDay(id);
}

async function deleteTrainingDay(id: string): Promise<void> {
  const supabase = createServerSupabase();

  // First delete all exercises in this training day
  const { error: exercisesError } = await supabase
    .from('training_exercise')
    .delete()
    .eq('training_day_id', id);

  if (exercisesError) throw exercisesError;

  // Then delete the training day
  const { error } = await supabase.from('training_day').delete().eq('id', id);

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
    return res.status(400).json({ error: 'Invalid training day ID' });
  }

  try {
    if (req.method === 'GET') {
      const trainingDay = await getTrainingDay(id);
      return res.status(200).json(trainingDay);
    }

    if (req.method === 'PUT') {
      if (session.user.role === 'trainee') {
        const supabase = createServerSupabase();
        const { data: day } = await supabase
          .from('training_day')
          .select('program_id')
          .eq('id', id)
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

      const trainingDay = await updateTrainingDay(id, req.body);
      return res.status(200).json(trainingDay);
    }

    if (req.method === 'DELETE') {
      if (session.user.role === 'trainee') {
        const supabase = createServerSupabase();
        const { data: day } = await supabase
          .from('training_day')
          .select('program_id')
          .eq('id', id)
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

      await deleteTrainingDay(id);
      return res.status(204).end();
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Training day API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
