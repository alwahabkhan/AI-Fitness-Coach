/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextApiRequest, NextApiResponse } from 'next';
import { getSessionFromRequest } from '@/lib/session';
import { calculateExerciseProgression } from '@/lib/progression';
import { createServerSupabase } from '@/lib/supabase';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const session = getSessionFromRequest(req);
  if (!session?.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const { training_day_id, session_number } = req.body;

    if (!training_day_id || !session_number) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const progressedExercises = await calculateExerciseProgression(
      training_day_id,
      session_number
    );

    // Fetch full training exercise details including centralized exercise data
    const supabase = createServerSupabase();
    const trainingExerciseIds = progressedExercises.map((ex) => ex.id);

    const { data: trainingExercises, error } = await supabase
      .from('training_exercise')
      .select(
        `
        id,
        exercise_id,
        rest_seconds,
        reps,
        weights,
        reps_progression,
        weight_progression,
        r_plus_option,
        group_number,
        notes,
        exercise:exercise_id(
          id,
          name,
          video_url,
          main_muscle
        )
      `
      )
      .in('id', trainingExerciseIds);

    if (error) throw error;

    // Fetch last completed session for each exercise to get date/time
    const lastSessionMap: Record<string, { date: string; time: string }> = {};
    
    // Get all completed sessions for this training day, ordered by most recent
    const { data: completedSessions } = await supabase
      .from('training_session')
      .select('id, start_time, end_time, results')
      .eq('training_day_id', training_day_id)
      .eq('status', 'completed')
      .order('start_time', { ascending: false });

    if (completedSessions && completedSessions.length > 0) {
      // Create a map to track which exercises we've found sessions for
      const foundExercises = new Set<string>();
      
      // Go through sessions from most recent to oldest
      for (const session of completedSessions) {
        const sessionDate = session.end_time || session.start_time;
        
        if (sessionDate && session.results) {
          const date = new Date(sessionDate);
          const formattedDate = date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
          });
          const formattedTime = date.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
          });

          const results = session.results as any;
          results.exercises?.forEach((ex: any) => {
            const exerciseId = ex.training_exercise_id;
            // Only set if we haven't found a more recent session for this exercise
            if (!foundExercises.has(exerciseId) && trainingExerciseIds.includes(exerciseId)) {
              lastSessionMap[exerciseId] = {
                date: formattedDate,
                time: formattedTime
              };
              foundExercises.add(exerciseId);
            }
          });
        }
      }
    }

    // Create a map for quick lookup
    const exerciseMap =
      trainingExercises?.reduce(
        (acc, te) => {
          acc[te.id] = te;
          return acc;
        },
        {} as Record<string, any>
      ) || {};

    // Merge progression data with training exercise details
    const enrichedExercises = progressedExercises.map((progressed) => {
      const trainingExercise = exerciseMap[progressed.id];

      return {
        id: progressed.id,
        sets: progressed.sets,
        reps: trainingExercise?.reps || [], // Base reps for calculating next session
        weights: trainingExercise?.weights || [], // Base weights for calculating next session
        session_reps: progressed.session_reps,
        session_weights: progressed.session_weights,
        reps_progression: progressed.reps_progression,
        weight_progression: progressed.weight_progression,
        r_plus_option: trainingExercise?.r_plus_option || 1,
        exercise_id: trainingExercise?.exercise_id,
        exercise: trainingExercise?.exercise || { name: 'Unknown Exercise' },
        rest_seconds: trainingExercise?.rest_seconds,
        group_number: trainingExercise?.group_number,
        notes: trainingExercise?.notes,
        last_session: lastSessionMap[progressed.id]
          ? `${lastSessionMap[progressed.id].date} ${lastSessionMap[progressed.id].time}`
          : 'Not Found'
      };
    });

    return res.status(200).json({ exercises: enrichedExercises });
  } catch (error) {
    console.error('Progression calculation error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
