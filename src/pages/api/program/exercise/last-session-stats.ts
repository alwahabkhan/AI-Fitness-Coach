/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextApiRequest, NextApiResponse } from 'next';
import { getSessionFromRequest } from '@/lib/session';
import { createServerSupabase } from '@/lib/supabase';

// Helper to calculate next reps (copied/adapted from lib/progression.ts since it's not exported for single usage)
function calculateNextReps(
  baseReps: number[],
  sessionNumber: number,
  rPlusOption: number,
  repsProgression: number
): number[] {
  if (sessionNumber === 0) return [...baseReps];

  let result = [...baseReps];

  switch (rPlusOption) {
    case 1: {
      result = result.map((r) => r + sessionNumber * repsProgression);
      return result;
    }
    case 2: {
      for (let session = 1; session <= sessionNumber; session++) {
        const minValue = Math.min(...result);
        const minIndex = result.indexOf(minValue);
        result[minIndex] += repsProgression;
      }
      return result;
    }
    case 3: {
      for (let session = 1; session <= sessionNumber; session++) {
        const indexed = result.map((val, idx) => ({ val, idx }));
        indexed.sort((a, b) => {
          if (a.val !== b.val) return a.val - b.val;
          return a.idx - b.idx;
        });
        result[indexed[0].idx] += repsProgression;
        result[indexed[1].idx] += repsProgression;
      }
      return result;
    }
    default: {
      result = result.map((r) => r + sessionNumber * repsProgression);
      return result;
    }
  }
}

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

  const { exercise_id, trainee_id } = req.query;

  if (!exercise_id || typeof exercise_id !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid exercise_id' });
  }

  // If trainee_id is not provided, default to the current user (if they are a trainee)
  // or return error if they are a trainer without a trainee_id
  let targetTraineeId = trainee_id as string;
  if (!targetTraineeId) {
    if (session.user.role === 'trainee') {
      targetTraineeId = session.user.id;
    } else {
      return res.status(400).json({ error: 'Missing trainee_id' });
    }
  }

  try {
    const supabase = createServerSupabase();

    // 1. Find the most recent COMPLETED session for this trainee that contains this exercise
    // We need to find the last `training_session` where `status` = 'completed'
    const { data: exercises, error: exerciseError } = await supabase
      .from('training_exercise')
      .select(
        `
        id,
        sets,
        reps,
        weights,
        reps_progression,
        weight_progression,
        r_plus_option,
        rest_seconds,
        group_number,
        notes,
        training_day:training_day_id (
          id,
          program:program_id (
            id,
            trainee_id
          )
        )
      `
      )
      .eq('exercise_id', exercise_id);

    if (exerciseError) throw exerciseError;

    // Filter for exercises belonging to the trainee
    const traineeExercises = exercises.filter(
      (ex: any) => ex.training_day?.program?.trainee_id === targetTraineeId
    );

    if (traineeExercises.length === 0) {
      return res.status(200).json(null); // No history found
    }

    // Now find the latest completed session for any of these training_exercises
    // We need to check `training_session` for the `training_day_id`s.
    const trainingDayIds = traineeExercises.map(
      (ex: any) => ex.training_day.id
    );

    const { data: sessions, error: sessionError } = await supabase
      .from('training_session')
      .select(
        `
        id,
        session_number,
        training_day_id,
        status,
        created_at,
        updated_at
      `
      )
      .in('training_day_id', trainingDayIds)
      .eq('status', 'completed')
      .order('updated_at', { ascending: false }) // Most recent first
      .limit(1);

    if (sessionError) throw sessionError;

    if (!sessions || sessions.length === 0) {
      return res.status(200).json(null);
    }

    const lastSession = sessions[0];

    // Find the training_exercise config that corresponds to this session's day
    const relevantExerciseConfig = traineeExercises.find(
      (ex: any) => ex.training_day.id === lastSession.training_day_id
    );

    if (!relevantExerciseConfig) return res.status(200).json(null);

    const nextSessionNumber = lastSession.session_number + 1;
    // Progression count = sessionNumber - 1
    const progressionCount = nextSessionNumber - 1;

    const baseReps = relevantExerciseConfig.reps || [];
    const baseWeights = relevantExerciseConfig.weights || [];
    const repsProgression = relevantExerciseConfig.reps_progression || 0;
    const weightProgression = relevantExerciseConfig.weight_progression || 0;
    const rPlusOption = relevantExerciseConfig.r_plus_option || 1;

    const nextReps = calculateNextReps(
      baseReps,
      progressionCount,
      rPlusOption,
      repsProgression
    );

    const nextWeights = baseWeights.map(
      (weight: number) => weight + weightProgression * progressionCount
    );

    return res.status(200).json({
      sets: relevantExerciseConfig.sets,
      reps: nextReps,
      weights: nextWeights,
      rest_seconds: relevantExerciseConfig.rest_seconds,
      group_number: relevantExerciseConfig.group_number,
      notes: relevantExerciseConfig.notes,
      reps_progression: repsProgression,
      weight_progression: weightProgression,
      r_plus_option: rPlusOption,
      source_session_date: lastSession.updated_at
    });
  } catch (error) {
    console.error('Error fetching last session stats:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
