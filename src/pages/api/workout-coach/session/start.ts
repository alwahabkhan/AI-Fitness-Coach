import { z } from 'zod';
import { NextApiRequest, NextApiResponse } from 'next';
import { getSessionFromRequest } from '@/lib/session';
import { createServerSupabase } from '@/lib/supabase';

const bodySchema = z.object({
  workoutId: z.string().min(1, 'Workout ID is required'),
  messageThreadId: z.string().min(1).optional(),
  startTime: z.string().optional()
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

  if (session.user.role !== 'trainee') {
    return res.status(403).json({ error: 'Forbidden - Trainees only' });
  }

  const parseResult = bodySchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({
      error: 'Invalid request body',
      details: parseResult.error.flatten().fieldErrors
    });
  }

  const { workoutId, messageThreadId, startTime } = parseResult.data;

  try {
    const supabase = createServerSupabase();

    const { data: workout, error: workoutError } = await supabase
      .from('workout')
      .select('id, user_id')
      .eq('id', workoutId)
      .eq('user_id', session.user.id)
      .single();

    if (workoutError || !workout) {
      return res
        .status(404)
        .json({ error: 'Workout not found or access denied' });
    }

    const { data: existingSession, error: existingSessionError } =
      await supabase
        .from('workout_session')
        .select('id, start_time')
        .eq('workout_id', workoutId)
        .is('end_time', null)
        .order('start_time', { ascending: false })
        .limit(1)
        .maybeSingle();

    if (existingSessionError) {
      console.error('Error checking existing sessions:', existingSessionError);
      return res
        .status(500)
        .json({ error: 'Failed to verify existing sessions' });
    }

    if (existingSession) {
      return res.status(200).json({
        sessionId: existingSession.id,
        startTime: existingSession.start_time
      });
    }

    const startTimestamp = startTime
      ? new Date(startTime).toISOString()
      : new Date().toISOString();

    const { data: workoutSession, error: sessionError } = await supabase
      .from('workout_session')
      .insert({
        workout_id: workoutId,
        message_thread_id: messageThreadId || null,
        start_time: startTimestamp
      })
      .select('id, start_time')
      .single();

    if (sessionError || !workoutSession) {
      console.error('Error creating workout session:', sessionError);
      return res.status(500).json({ error: 'Failed to create workout session' });
    }

    return res.status(201).json({
      sessionId: workoutSession.id,
      startTime: workoutSession.start_time
    });
  } catch (error) {
    console.error('Error in workout session start API:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

