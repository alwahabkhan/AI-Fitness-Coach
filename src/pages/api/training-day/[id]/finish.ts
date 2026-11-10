import { z } from 'zod';
import { NextApiRequest, NextApiResponse } from 'next';
import { getSessionFromRequest } from '@/lib/session';
import { createServerSupabase } from '@/lib/supabase';

const completedSetSchema = z.object({
  set_number: z.number().min(1),
  weight: z.number(),
  reps: z.number(),
  rpe: z.number().min(1).max(10).optional(),
  completed_at: z.string(),
  notes: z.string().optional()
});

const exerciseResultSchema = z.object({
  training_exercise_id: z.string().uuid(),
  sets_completed: z.array(completedSetSchema)
});

const sessionSummarySchema = z.object({
  total_duration_minutes: z.number(),
  exercises_completed: z.number()
});

const bodySchema = z.object({
  session_id: z
    .string()
    .uuid()
    .optional()
    .or(z.literal(''))
    .transform((val) => (val === '' ? undefined : val)),
  session_number: z.number().min(1).default(1),
  message_thread_id: z
    .string()
    .uuid()
    .optional()
    .or(z.literal(''))
    .transform((val) => (val === '' ? undefined : val)),
  start_time: z.string(),
  exercises: z.array(exerciseResultSchema),
  session_summary: sessionSummarySchema,
  agent_prompt: z
    .string()
    .optional()
    .or(z.literal(''))
    .transform((val) => (val === '' ? undefined : val)),
  operational_cost: z.number().default(0)
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

  const { id: trainingDayId } = req.query;
  if (!trainingDayId || typeof trainingDayId !== 'string') {
    return res.status(400).json({ error: 'Invalid training day ID' });
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

    // Verify the training day belongs to the user's program
    const { data: trainingDay, error: dayError } = await supabase
      .from('training_day')
      .select('id, program_id, program:program_id(id, trainee_id)')
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

    // Calculate actual duration - prefer elapsed_seconds from stored results (accounts for paused time)
    const startTime = data.start_time ? new Date(data.start_time) : new Date();
    const endTime = new Date();

    // Create or update the training session
    // First try to find by session_id if provided, otherwise by session_number
    interface TrainingSession {
      id: string;
      start_time: string | null;
      results: unknown;
      session_number: number;
    }
    let existingSession: TrainingSession | null = null;
    
    if (data.session_id) {
      const { data: sessionById, error: sessionByIdError } = await supabase
        .from('training_session')
        .select('id, start_time, results, session_number')
        .eq('id', data.session_id)
        .eq('training_day_id', trainingDayId)
        .eq('user_id', user.id)
        .single();
      
      if (!sessionByIdError && sessionById) {
        existingSession = sessionById;
        // Use the existing session's session_number if it exists
        if (existingSession.session_number) {
          data.session_number = existingSession.session_number;
        }
      }
    }
    
    // If not found by session_id, try by session_number
    if (!existingSession) {
      const { data: sessionByNumber, error: sessionByNumberError } = await supabase
        .from('training_session')
        .select('id, start_time, results, session_number')
        .eq('training_day_id', trainingDayId)
        .eq('session_number', data.session_number)
        .eq('user_id', user.id)
        .single();
      
      if (!sessionByNumberError && sessionByNumber) {
        existingSession = sessionByNumber;
      }
    }

    let trainingSession;
    let actualDurationMinutes = data.session_summary.total_duration_minutes;

    if (existingSession) {
      // Use existing start_time if available, otherwise use provided start_time
      const sessionStartTime = existingSession.start_time 
        ? new Date(existingSession.start_time)
        : startTime;
      const sessionEndTime = new Date();
      
      // Try to get elapsed_seconds from stored results (accounts for paused time)
      interface SessionResults {
        session_summary?: {
          elapsed_seconds?: number;
          paused_seconds?: number;
          total_duration_minutes?: number;
        };
      }
      const existingResults = (existingSession.results as SessionResults | null) || {};
      const existingSessionSummary = existingResults.session_summary || {};
      const storedElapsedSeconds = existingSessionSummary.elapsed_seconds;
      
      if (storedElapsedSeconds !== undefined && storedElapsedSeconds > 0) {
        // Use stored elapsed_seconds which accounts for paused time
        actualDurationMinutes = Math.round(storedElapsedSeconds / 60);
      } else {
        // Fallback to calculating from start_time to end_time
        const sessionDurationSeconds = Math.max(
          0,
          Math.floor((sessionEndTime.getTime() - sessionStartTime.getTime()) / 1000)
        );
        actualDurationMinutes = Math.round(sessionDurationSeconds / 60);
      }

      // Prepare results with actual duration and preserve elapsed_seconds/paused_seconds
      const results = {
        exercises: data.exercises,
        session_summary: {
          ...data.session_summary,
          total_duration_minutes: actualDurationMinutes,
          // Preserve elapsed_seconds and paused_seconds if they exist
          elapsed_seconds: existingSessionSummary.elapsed_seconds,
          paused_seconds: existingSessionSummary.paused_seconds
        }
      };

      // Update existing session
      const { data: updated, error: updateError } = await supabase
        .from('training_session')
        .update({
          end_time: sessionEndTime.toISOString(),
          status: 'completed',
          results,
          operational_cost: data.operational_cost,
          agent_prompt: data.agent_prompt,
          message_thread_id: data.message_thread_id
        })
        .eq('id', existingSession.id)
        .select()
        .single();

      if (updateError) {
        console.error('Error updating training session:', updateError);
        return res
          .status(500)
          .json({ error: 'Failed to update training session' });
      }
      trainingSession = updated;
    } else {
      // Prepare results for new session
      const results = {
        exercises: data.exercises,
        session_summary: {
          ...data.session_summary,
          total_duration_minutes: actualDurationMinutes
        }
      };
      
      // Calculate the correct session number if not provided or if it's 1 (might be default)
      let finalSessionNumber = data.session_number;
      if (finalSessionNumber === 1) {
        // Check if there are existing completed sessions for this day
        const { data: existingSessions } = await supabase
          .from('training_session')
          .select('session_number')
          .eq('training_day_id', trainingDayId)
          .eq('user_id', user.id)
          .eq('status', 'completed');
        
        if (existingSessions && existingSessions.length > 0) {
          const maxSessionNumber = Math.max(
            ...existingSessions.map((s: { session_number: number | null }) => s.session_number || 1)
          );
          finalSessionNumber = maxSessionNumber + 1;
          console.log(`Calculated session number ${finalSessionNumber} from ${existingSessions.length} existing sessions`);
        }
      }
      
      // Create new session
      const { data: created, error: createError } = await supabase
        .from('training_session')
        .insert({
          program_id: trainingDay.program_id,
          training_day_id: trainingDayId,
          session_number: finalSessionNumber,
          user_id: user.id,
          start_time: startTime.toISOString(),
          end_time: endTime.toISOString(),
          status: 'completed',
          results,
          operational_cost: data.operational_cost,
          agent_prompt: data.agent_prompt,
          message_thread_id: data.message_thread_id
        })
        .select()
        .single();

      if (createError) {
        console.error('Error creating training session:', createError);
        return res
          .status(500)
          .json({ error: 'Failed to create training session' });
      }
      trainingSession = created;
      console.log(`Created new session with session_number: ${finalSessionNumber}`);
    }

    return res.status(201).json({
      trainingSession,
      message: 'Training session saved successfully'
    });
  } catch (err) {
    console.error('Error in training day finish API:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
