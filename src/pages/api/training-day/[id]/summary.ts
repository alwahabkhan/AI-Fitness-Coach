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

  const { id: trainingDayId } = req.query;
  if (!trainingDayId || typeof trainingDayId !== 'string') {
    return res.status(400).json({ error: 'Invalid training day ID' });
  }

  try {
    const supabase = createServerSupabase();

    // Verify the training day belongs to the user
    const { data: trainingDay, error: dayError } = await supabase
      .from('training_day')
      .select(
        `
        id, 
        name, 
        program:program_id(trainee_id)
      `
      )
      .eq('id', trainingDayId)
      .single();

    if (dayError || !trainingDay) {
      return res
        .status(404)
        .json({ error: 'Training day not found or access denied' });
    }

    // Check ownership
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const program = trainingDay.program as any;
    if (program.trainee_id !== user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Get the most recent completed training session for this training day
    const { data: trainingSession, error: sessionError } = await supabase
      .from('training_session')
      .select('*')
      .eq('training_day_id', trainingDayId)
      .eq('status', 'completed')
      .order('start_time', { ascending: false })
      .limit(1)
      .single();

    if (sessionError || !trainingSession) {
      return res
        .status(404)
        .json({ error: 'No completed training session found' });
    }

    // Get exercise details for this training day
    const { data: exercises, error: exercisesError } = await supabase
      .from('training_exercise')
      .select(
        `
        id,
        exercise:exercise_id (
          name
        ),
        sets
      `
      )
      .eq('training_day_id', trainingDayId)
      .order('exercise_order');

    if (exercisesError) {
      return res.status(500).json({ error: 'Failed to load exercise details' });
    }

    // Parse session results
    const results = trainingSession.results as {
      session_summary?: {
        total_duration_minutes?: number;
        exercises_completed?: number;
        total_volume?: number;
        summary_message?: string;
      };
      exercises?: {
        training_exercise_id: string;
        sets_completed: {
          set_number: number;
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
        const exercise = exercises?.find(
          (ex) => ex.id === result.training_exercise_id
        );
        if (!exercise) return null;

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
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          name: (exercise.exercise as any)?.name || 'Unknown Exercise',
          setsCompleted: setsCompleted.length,
          totalSets: exercise.sets || 0,
          bestSet: {
            weight: bestSet.weight,
            reps: bestSet.reps
          }
        };
      })
      .filter(Boolean);

    const summary = {
      workoutName: trainingDay.name,
      duration: sessionSummary.total_duration_minutes || 0,
      exercisesCompleted:
        sessionSummary.exercises_completed || exerciseBreakdown.length,
      totalVolume: sessionSummary.total_volume || 0,
      exercises: exerciseBreakdown,
      summaryMessage: sessionSummary.summary_message || ''
    };

    return res.status(200).json(summary);
  } catch (err) {
    console.error('Error in training day summary API:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
