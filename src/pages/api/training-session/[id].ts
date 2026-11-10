/* eslint-disable @typescript-eslint/no-explicit-any */
import { z } from 'zod';
import { NextApiRequest, NextApiResponse } from 'next';
import { getSessionFromRequest } from '@/lib/session';
import { createServerSupabase } from '@/lib/supabase';

const exerciseResultSchema = z.object({
  training_exercise_id: z.string().uuid(),
  sets_completed: z.array(
    z.object({
      set_number: z.number().min(1),
      reps: z.number().min(0),
      weight: z.number().min(0),
      rpe: z.number().min(1).max(10).optional(),
      completed_at: z.string(),
      notes: z.string().optional()
    })
  )
});

const sessionSummarySchema = z.object({
  total_duration_minutes: z.number().min(0),
  exercises_completed: z.number().min(0)
});

const resultsSchema = z.object({
  exercises: z.array(exerciseResultSchema),
  session_summary: sessionSummarySchema
});

const updateSessionSchema = z.object({
  end_time: z.string().optional(),
  status: z.enum(['in_progress', 'completed', 'cancelled']).optional(),
  results: resultsSchema.optional(),
  notes: z.string().optional(),
  perceived_exertion: z.number().min(1).max(10).optional(),
  operational_cost: z.number().min(0).optional(),
  agent_prompt: z.string().optional()
});

async function getTrainingSession(
  sessionId: string,
  userId: string,
  userRole: string
) {
  const supabase = createServerSupabase();

  let query = supabase
    .from('training_session')
    .select(
      `
      *,
      program:program_id(id, name),
      training_day:training_day_id(
        id, 
        name, 
        day_order,
        training_exercises:training_exercise(
          *,
          exercise:exercise_id(*)
        )
      ),
      user:user_id(id, name, email)
    `
    )
    .eq('id', sessionId);

  // Filter by user role
  if (userRole === 'trainee') {
    query = query.eq('user_id', userId);
  }

  const { data, error } = await query.single();
  if (error) throw error;
  return data;
}

async function updateTrainingSession(
  sessionId: string,
  data: z.infer<typeof updateSessionSchema>,
  userId: string,
  userRole: string
) {
  const supabase = createServerSupabase();

  // First get the current session
  const session = await getTrainingSession(sessionId, userId, userRole);

  // If changing status to completed and results are empty, populate them
  if (
    data.status === 'completed' &&
    (!session.results || Object.keys(session.results as any).length === 0)
  ) {
    const { calculateExerciseProgression, buildSessionResults } = await import(
      '@/lib/progression'
    );

    try {
      const progressedExercises = await calculateExerciseProgression(
        session.training_day_id,
        session.session_number
      );

      if (progressedExercises.length > 0) {
        // Fetch training exercise details
        const trainingExerciseIds = progressedExercises.map((ex) => ex.id);
        const { data: trainingExercises } = await supabase
          .from('training_exercise')
          .select(
            `
            id,
            exercise_id,
            exercise:exercise_id(id, name, video_url, main_muscle)
          `
          )
          .in('id', trainingExerciseIds);

        if (trainingExercises) {
          const exerciseMap = trainingExercises.reduce(
            (acc, te) => {
              acc[te.id] = te.exercise;
              return acc;
            },
            {} as Record<string, any>
          );

          const enrichedExercises = progressedExercises.map((progressed) => ({
            ...progressed,
            exercise: exerciseMap[progressed.id] || { name: 'Unknown Exercise' }
          }));

          const startTime = new Date(session.start_time);
          const results = buildSessionResults(enrichedExercises, startTime);

          // Calculate actual duration from start_time to end_time
          const endTime = data.end_time ? new Date(data.end_time) : new Date();
          const actualDurationSeconds = Math.max(
            0,
            Math.floor((endTime.getTime() - startTime.getTime()) / 1000)
          );
          const actualDurationMinutes = Math.round(actualDurationSeconds / 60);

          // Update results with actual duration
          results.session_summary.total_duration_minutes = actualDurationMinutes;

          // Update data with generated results
          data.results = results as any;

          // Set end_time if not provided
          if (!data.end_time) {
            data.end_time = endTime.toISOString();
          }
        }
      }
    } catch (error) {
      console.error('Error generating results for completed session:', error);
    }
  }

  const { data: updatedSession, error } = await supabase
    .from('training_session')
    .update(data)
    .eq('id', sessionId)
    .select(
      `
      *,
      program:program_id(id, name),
      training_day:training_day_id(
        id, 
        name, 
        day_order,
        training_exercises:training_exercise(
          *,
          exercise:exercise_id(*)
        )
      ),
      user:user_id(id, name, email)
    `
    )
    .single();

  if (error) throw error;
  return updatedSession;
}

async function deleteTrainingSession(
  sessionId: string,
  userId: string,
  userRole: string
) {
  const supabase = createServerSupabase();

  // Verify ownership for trainees
  if (userRole === 'trainee') {
    const { data: session, error } = await supabase
      .from('training_session')
      .select('user_id')
      .eq('id', sessionId)
      .eq('user_id', userId)
      .single();

    if (error || !session) {
      throw new Error('Training session not found or access denied');
    }
  }

  const { error } = await supabase
    .from('training_session')
    .delete()
    .eq('id', sessionId);

  if (error) throw error;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const session = getSessionFromRequest(req);
  if (!session?.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { id } = req.query;
  if (typeof id !== 'string') {
    return res.status(400).json({ error: 'Invalid session ID' });
  }

  try {
    if (req.method === 'GET') {
      const trainingSession = await getTrainingSession(
        id,
        session.user.id,
        session.user.role
      );
      return res.status(200).json(trainingSession);
    }

    if (req.method === 'PUT') {
      const { success, data, error } = updateSessionSchema.safeParse(req.body);
      if (!success) {
        return res.status(400).json({
          error: 'Invalid request body',
          details: error.flatten().fieldErrors
        });
      }

      const updatedSession = await updateTrainingSession(
        id,
        data,
        session.user.id,
        session.user.role
      );

      return res.status(200).json(updatedSession);
    }

    if (req.method === 'DELETE') {
      await deleteTrainingSession(id, session.user.id, session.user.role);
      return res.status(204).end();
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Training session API error:', error);
    if (error instanceof Error) {
      if (
        error.message.includes('not found') ||
        error.message.includes('access denied')
      ) {
        return res.status(404).json({ error: error.message });
      }
    }
    return res.status(500).json({ error: 'Internal server error' });
  }
}
