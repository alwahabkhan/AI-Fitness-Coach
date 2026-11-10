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

  const user = session.user;
  if (user.role !== 'trainee') {
    return res.status(403).json({ error: 'Forbidden - Trainees only' });
  }

  const { id: workoutId } = req.query;
  if (!workoutId || typeof workoutId !== 'string') {
    return res.status(400).json({ error: 'Invalid workout ID' });
  }

  try {
    const supabase = createServerSupabase();

    // Verify the workout belongs to the user and get workout details
    const { data: workout, error: workoutError } = await supabase
      .from('workout')
      .select('id, name, user_id')
      .eq('id', workoutId)
      .eq('user_id', user.id)
      .single();

    if (workoutError || !workout) {
      return res
        .status(404)
        .json({ error: 'Workout not found or access denied' });
    }

    // Get the most recent completed workout session
    const { data: session, error: sessionError } = await supabase
      .from('workout_session')
      .select('*')
      .eq('workout_id', workoutId)
      .not('end_time', 'is', null)
      .order('end_time', { ascending: false })
      .limit(1)
      .single();

    if (sessionError || !session) {
      return res
        .status(404)
        .json({ error: 'No completed workout session found' });
    }

    // Get exercise details for this workout
    const { data: exercises, error: exercisesError } = await supabase
      .from('exercise')
      .select('id, name, execution_meta')
      .eq('workout_id', workoutId)
      .order('group', { ascending: true })
      .order('order', { ascending: true });

    if (exercisesError) {
      return res.status(500).json({ error: 'Failed to load exercise details' });
    }

    // Parse session results with proper typing
    const results = session.results as {
      session_summary?: {
        total_duration_minutes?: number;
        exercises_completed?: number;
        total_volume?: number;
        summary_message?: string;
      };
      exercises?: {
        exercise_id: string;
        sets_completed: {
          weight: number;
          reps: number;
          completed_at: string;
        }[];
      }[];
    };

    const sessionSummary = results.session_summary || {};
    const exerciseResults = results.exercises || [];

    // Build exercise breakdown
    const exerciseBreakdown = exerciseResults
      .map((result) => {
        const exercise = exercises?.find((ex) => ex.id === result.exercise_id);
        if (!exercise) return null;

        const executionMeta = exercise.execution_meta as { sets?: number };
        const setsCompleted = result.sets_completed || [];

        // Find the best set (highest weight * reps)
        let bestSet = { weight: 0, reps: 0 };
        if (setsCompleted.length > 0) {
          bestSet = setsCompleted.reduce((best, current) => {
            const currentScore = current.weight * current.reps;
            const bestScore = best.weight * best.reps;
            return currentScore > bestScore ? current : best;
          });
        }

        return {
          name: exercise.name,
          setsCompleted: setsCompleted.length,
          totalSets: executionMeta.sets || 0,
          bestSet: {
            weight: bestSet.weight,
            reps: bestSet.reps
          }
        };
      })
      .filter(Boolean);

    const summary = {
      workoutName: workout.name,
      duration: sessionSummary.total_duration_minutes || 0,
      exercisesCompleted:
        sessionSummary.exercises_completed || exerciseBreakdown.length,
      totalVolume: sessionSummary.total_volume || 0,
      exercises: exerciseBreakdown,
      summaryMessage: sessionSummary.summary_message || ''
    };

    return res.status(200).json(summary);
  } catch (err) {
    console.error('Error in workout summary API:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
