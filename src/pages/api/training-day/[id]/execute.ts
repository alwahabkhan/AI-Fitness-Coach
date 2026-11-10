import { NextApiRequest, NextApiResponse } from 'next';
import { getSessionFromRequest } from '@/lib/session';
import { createServerSupabase } from '@/lib/supabase';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const session = getSessionFromRequest(req);
  if (!session?.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { id } = req.query;
  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Invalid training day ID' });
  }

  try {
    const supabase = createServerSupabase();

    // Fetch training day with exercises and program details
    const { data: trainingDay, error } = await supabase
      .from('training_day')
      .select(
        `
        *,
        program:program_id (
          id,
          name,
          trainee_id
        ),
        training_exercises:training_exercise (
          *,
          exercise:exercise_id (
            id,
            name,
            video_url,
            prompt_exercise_description
          )
        )
      `
      )
      .eq('id', id)
      .single();

    if (error || !trainingDay) {
      return res.status(404).json({ error: 'Training day not found' });
    }

    // Verify the training day belongs to the user
    if (trainingDay.program.trainee_id !== session.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Sort exercises by order
    const sortedExercises = (trainingDay.training_exercises || []).sort(
      (a, b) => (a.exercise_order || 0) - (b.exercise_order || 0)
    );

    return res.status(200).json({
      trainingDay,
      program: trainingDay.program,
      exercises: sortedExercises
    });
  } catch (error) {
    console.error('Error fetching training day for execution:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
