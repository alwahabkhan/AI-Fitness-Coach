import { z } from 'zod';
import { NextApiRequest, NextApiResponse } from 'next';
import { getSessionFromRequest } from '@/lib/session';
import { createServerSupabase } from '@/lib/supabase';
import {
  ensureProgramWithinSessionCap,
  SessionCapExceededError
} from '@/lib/program-session-cap';
import { createNotificationServerSide } from '@/lib/notifications/helpers';

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

const createSessionSchema = z.object({
  program_id: z.string().uuid(),
  training_day_id: z.string().uuid(),
  session_number: z.number().min(1).default(1),
  start_time: z.string().optional(),
  message_thread_id: z.string().uuid().optional(),
  agent_prompt: z.string().optional()
});


async function createTrainingSession(
  data: z.infer<typeof createSessionSchema>,
  userId: string
) {
  const supabase = createServerSupabase();

  // Verify the program and training day belong to the user
  const { data: program, error: programError } = await supabase
    .from('program')
    .select('id, trainee_id')
    .eq('id', data.program_id)
    .eq('trainee_id', userId)
    .single();

  if (programError || !program) {
    throw new Error('Program not found or access denied');
  }

  const { data: trainingDay, error: dayError } = await supabase
    .from('training_day')
    .select('id')
    .eq('id', data.training_day_id)
    .eq('program_id', data.program_id)
    .single();

  if (dayError || !trainingDay) {
    throw new Error('Training day not found');
  }

  await ensureProgramWithinSessionCap(supabase, data.program_id);

  const { data: session, error } = await supabase
    .from('training_session')
    .insert({
      ...data,
      user_id: userId,
      start_time: data.start_time || new Date().toISOString()
    })
    .select(
      `
      *,
      program:program_id(id, name),
      training_day:training_day_id(id, name, day_order)
    `
    )
    .single();

  if (error) throw error;
  return session;
}

async function getTrainingSessions(
  userId: string,
  userRole: string,
  programId?: string,
  status?: string,
  filterUserId?: string
) {
  const supabase = createServerSupabase();

  let query = supabase
    .from('training_session')
    .select(
      `
      *,
      program:program_id(id, name),
      training_day:training_day_id(id, name, day_order),
      user:user_id(id, name, email)
    `
    )
    .order('start_time', { ascending: false });

  // Filter by program if specified
  if (programId) {
    query = query.eq('program_id', programId);
  }

  // Filter by status if specified
  if (status) {
    query = query.eq(
      'status',
      status as 'in_progress' | 'completed' | 'cancelled'
    );
  }

  // Filter by user_id: trainees can only see their own, trainers/admins can filter by specific user
  if (userRole === 'trainee') {
    query = query.eq('user_id', userId);
  } else if (filterUserId) {
    query = query.eq('user_id', filterUserId);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const session = getSessionFromRequest(req);
  if (!session?.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    if (req.method === 'POST') {
      if (session.user.role !== 'trainee') {
        return res
          .status(403)
          .json({ error: 'Only trainees can create training sessions' });
      }

      const { success, data, error } = createSessionSchema.safeParse(req.body);
      if (!success) {
        return res.status(400).json({
          error: 'Invalid request body',
          details: error.flatten().fieldErrors
        });
      }

      const trainingSession = await createTrainingSession(
        data,
        session.user.id
      );

      // Create session start notification
      try {
        const trainingDay = trainingSession.training_day as { name?: string };
        await createNotificationServerSide(
          'reminder',
          `Your ${trainingDay?.name || 'training'} session has started. Let's get moving!`,
          session.user.id,
          'Session Started',
          ['in_app', 'chat'],
          data.message_thread_id
        );
      } catch (err) {
        console.error('Failed to create session start notification', err);
      }

      return res.status(201).json(trainingSession);
    }

    if (req.method === 'GET') {
      const { program_id, status, user_id } = req.query;
      const sessions = await getTrainingSessions(
        session.user.id,
        session.user.role,
        typeof program_id === 'string' ? program_id : undefined,
        typeof status === 'string' ? status : undefined,
        typeof user_id === 'string' ? user_id : undefined
      );
      return res.status(200).json(sessions);
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Training session API error:', error);
    if (error instanceof SessionCapExceededError) {
      return res.status(409).json({ error: error.message, usage: error.usage });
    }
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
