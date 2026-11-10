import { NextApiRequest, NextApiResponse } from 'next';
import { createServerSupabase } from '@/lib/supabase';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const {
    query: { id }
  } = req;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Workout id is required' });
  }

  const supabase = createServerSupabase();

  // Fetch workout
  const { data: workout, error: workoutError } = await supabase
    .from('workout')
    .select('*')
    .eq('id', id)
    .single();

  if (workoutError || !workout) {
    return res.status(404).json({ error: 'Workout not found' });
  }

  // Fetch exercises for this workout
  const { data: exercises, error: exercisesError } = await supabase
    .from('exercise')
    .select('*')
    .eq('workout_id', id)
    .order('group', { ascending: true })
    .order('order', { ascending: true });

  if (exercisesError) {
    return res.status(500).json({ error: 'Failed to fetch exercises' });
  }

  return res.status(200).json({ workout, exercises });
}
