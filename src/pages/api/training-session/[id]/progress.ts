import { z } from 'zod';
import { NextApiRequest, NextApiResponse } from 'next';
import { getSessionFromRequest } from '@/lib/session';
import { createServerSupabase } from '@/lib/supabase';

interface CompletedSet {
  set_number: number;
  weight: number;
  reps: number;
  rpe?: number;
  completed_at: string;
  notes?: string;
}

interface ExerciseResult {
  training_exercise_id: string;
  sets_completed?: CompletedSet[];
}

interface SessionResults {
  session_summary?: {
    elapsed_seconds?: number;
    paused_seconds?: number;
    last_activity_time?: string;
    total_duration_minutes?: number;
    exercises_completed?: number;
  };
  exercises?: ExerciseResult[];
}

interface UpdateData {
  results: SessionResults;
  start_time?: string;
}

const progressSchema = z.object({
  elapsed_seconds: z.number().min(0),
  paused_seconds: z.number().min(0).optional(),
  last_activity_time: z.string().optional(),
  workout_data: z.record(z.unknown()).optional(),
  results: z
    .object({
      exercises: z.array(z.unknown()).optional(),
      session_summary: z
        .object({
          total_duration_minutes: z.number().optional(),
          exercises_completed: z.number().optional()
        })
        .optional()
    })
    .optional()
});

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

  const { id: sessionId } = req.query;
  if (!sessionId || typeof sessionId !== 'string') {
    return res.status(400).json({ error: 'Invalid session ID' });
  }

  const { success, data, error } = progressSchema.safeParse(req.body);
  if (!success) {
    return res.status(400).json({
      error: 'Invalid request body',
      details: error.flatten().fieldErrors
    });
  }

  try {
    const supabase = createServerSupabase();

    // Verify session belongs to user
    const { data: trainingSession, error: sessionError } = await supabase
      .from('training_session')
      .select('id, results, start_time')
      .eq('id', sessionId)
      .eq('user_id', session.user.id)
      .single();

    if (sessionError || !trainingSession) {
      return res.status(403).json({ error: 'Session not found or access denied' });
    }

    // Get existing results or initialize
    const existingResults = (trainingSession.results as SessionResults | null) || {};
    const existingSessionSummary = existingResults.session_summary || {};

    // Merge exercise results intelligently
    const existingExercises = existingResults.exercises || [];
    const newExercises = (data.results?.exercises || []) as ExerciseResult[];
    
    // Create a map of existing exercises by training_exercise_id
    const exerciseMap = new Map<string, ExerciseResult>(
      existingExercises.map((ex) => [ex.training_exercise_id, ex])
    );
    
    // Update or add new exercises
    newExercises.forEach((newEx) => {
      const existing = exerciseMap.get(newEx.training_exercise_id);
      if (existing) {
        // Merge sets_completed arrays, avoiding duplicates
        const existingSets = existing.sets_completed || [];
        const newSets = newEx.sets_completed || [];
        const setMap = new Map<number, CompletedSet>(
          existingSets.map((s) => [s.set_number, s])
        );
        newSets.forEach((s) => {
          setMap.set(s.set_number, s);
        });
        exerciseMap.set(newEx.training_exercise_id, {
          ...existing,
          ...newEx,
          sets_completed: Array.from(setMap.values())
        });
      } else {
        exerciseMap.set(newEx.training_exercise_id, newEx);
      }
    });

    // Update results with new progress data
    const updatedResults = {
      ...existingResults,
      session_summary: {
        ...existingSessionSummary,
        elapsed_seconds: data.elapsed_seconds,
        paused_seconds: data.paused_seconds !== undefined 
          ? data.paused_seconds 
          : existingSessionSummary.paused_seconds || 0,
        last_activity_time: data.last_activity_time || new Date().toISOString(),
        total_duration_minutes: data.results?.session_summary?.total_duration_minutes 
          || existingSessionSummary.total_duration_minutes,
        exercises_completed: Math.max(
          existingSessionSummary.exercises_completed || 0,
          data.results?.session_summary?.exercises_completed || 0,
          exerciseMap.size
        )
      },
      // Use merged exercises
      exercises: Array.from(exerciseMap.values())
    };

    // Update the session with progress
    // Ensure start_time is set if not already set
    const updateData: UpdateData = {
      results: updatedResults
    };
    
    // If start_time is not set, set it to now (shouldn't happen, but safety check)
    if (!trainingSession.start_time) {
      updateData.start_time = new Date().toISOString();
    }

    // Cast to Json type for Supabase
    type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];
    
    const { error: updateError } = await supabase
      .from('training_session')
      .update({
        results: updatedResults as unknown as Json,
        ...(updateData.start_time && { start_time: updateData.start_time })
      })
      .eq('id', sessionId);

    if (updateError) {
      console.error('Error updating session progress:', updateError);
      return res.status(500).json({ error: 'Failed to save progress' });
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('Error saving session progress:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

