import { z } from 'zod';
import { NextApiRequest, NextApiResponse } from 'next';
import { getSessionFromRequest } from '@/lib/session';
import { createServerSupabase } from '@/lib/supabase';
import { workoutSummaryAgent } from '@/lib/ai/summary-agent';

const completedSetSchema = z.object({
  weight: z.number(),
  reps: z.number(),
  completed_at: z.string()
});

const exerciseResultSchema = z.object({
  exercise_id: z.string(),
  sets_completed: z.array(completedSetSchema),
  notes: z.string().optional(),
  perceived_exertion: z.number().min(1).max(10).optional()
});

const sessionSummarySchema = z.object({
  total_duration_minutes: z.number(),
  exercises_completed: z.number(),
  total_volume: z.number(),
  summary_message: z.string().optional()
});

const bodySchema = z.object({
  sessionId: z.string().uuid().optional(),
  workoutId: z.string().min(1, 'Workout ID is required'),
  messageThreadId: z.string().min(1, 'Message thread ID is required'),
  startTime: z.string().min(1, 'Start time is required'),
  exercises: z.array(exerciseResultSchema),
  sessionSummary: sessionSummarySchema,
  agentPrompt: z.string().optional(),
  operationalCost: z.number().default(0)
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

  const user = session.user;
  if (user.role !== 'trainee') {
    return res.status(403).json({ error: 'Forbidden - Trainees only' });
  }

  const { success, data, error } = bodySchema.safeParse(req.body);
  if (!success) {
    return res.status(400).json({
      error: 'Invalid request body',
      details: error.flatten().fieldErrors
    });
  }

  try {
    const supabase = createServerSupabase();

    // Verify the workout belongs to the user
    const { data: workout, error: workoutError } = await supabase
      .from('workout')
      .select('id, user_id')
      .eq('id', data.workoutId)
      .eq('user_id', user.id)
      .single();

    if (workoutError || !workout) {
      return res
        .status(404)
        .json({ error: 'Workout not found or access denied' });
    }

    // Generate summary message with agent
    let summaryMessage = '';
    try {
      summaryMessage = await workoutSummaryAgent.generateSummary({
        exercises: data.exercises,
        sessionSummary: data.sessionSummary,
        startTime: data.startTime
      });
    } catch (error) {
      console.error('Error generating workout summary:', error);
      // Fallback to default message if agent fails
      summaryMessage =
        'Great workout! You completed your session successfully.';
    }

    const endTime = new Date().toISOString();

    let existingSessionRecord:
      | {
          id: string;
          workout_id: string;
          start_time: string | null;
          end_time: string | null;
        }
      | null = null;

    if (data.sessionId) {
      const { data: existingSession, error: existingSessionError } =
        await supabase
          .from('workout_session')
          .select('id, workout_id, start_time, end_time')
          .eq('id', data.sessionId)
          .single();

      if (existingSessionError || !existingSession) {
        console.error('Error fetching workout session:', existingSessionError);
        return res.status(404).json({ error: 'Workout session not found' });
      }

      if (existingSession.workout_id !== data.workoutId) {
        return res.status(400).json({
          error: 'Session does not belong to the provided workout'
        });
      }

      if (existingSession.end_time) {
        return res.status(400).json({
          error: 'Workout session already completed'
        });
      }

      existingSessionRecord = existingSession;
    }

    const startTimeForDuration =
      existingSessionRecord?.start_time || data.startTime;

    const durationSeconds = startTimeForDuration
      ? Math.max(
          0,
          Math.floor(
            (new Date(endTime).getTime() -
              new Date(startTimeForDuration).getTime()) /
              1000
          )
        )
      : null;
    const durationMinutes =
      durationSeconds !== null
        ? Number((durationSeconds / 60).toFixed(1))
        : data.sessionSummary.total_duration_minutes;

    const results = {
      exercises: data.exercises,
      session_summary: {
        ...data.sessionSummary,
        summary_message: summaryMessage,
        actual_duration_seconds: durationSeconds,
        actual_duration_minutes: durationMinutes
      }
    };

    let workoutSession = null;
    let sessionError = null;

    if (data.sessionId) {
      const updatePayload: Record<string, unknown> = {
        message_thread_id: data.messageThreadId,
        end_time: endTime,
        operational_cost: data.operationalCost,
        agent_prompt: data.agentPrompt,
        results
      };

      if (!existingSessionRecord?.start_time && data.startTime) {
        updatePayload.start_time = data.startTime;
      }

      const { data: updatedSession, error: updateError } = await supabase
        .from('workout_session')
        .update(updatePayload)
        .eq('id', data.sessionId)
        .select()
        .single();

      workoutSession = updatedSession;
      sessionError = updateError;
    } else {
      const { data: insertedSession, error: insertError } = await supabase
        .from('workout_session')
        .insert({
          workout_id: data.workoutId,
          message_thread_id: data.messageThreadId,
          start_time: data.startTime,
          end_time: endTime,
          operational_cost: data.operationalCost,
          agent_prompt: data.agentPrompt,
          results
        })
        .select()
        .single();

      workoutSession = insertedSession;
      sessionError = insertError;
    }

    if (sessionError || !workoutSession) {
      console.error('Error saving workout session:', sessionError);
      return res.status(500).json({ error: 'Failed to save workout session' });
    }

    return res.status(data.sessionId ? 200 : 201).json({
      workoutSession,
      durationSeconds,
      message: 'Workout session saved successfully'
    });
  } catch (err) {
    console.error('Error in workout session finish API:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
