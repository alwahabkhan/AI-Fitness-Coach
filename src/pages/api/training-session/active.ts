import { NextApiRequest, NextApiResponse } from 'next';
import { getSessionFromRequest } from '@/lib/session';
import { createServerSupabase } from '@/lib/supabase';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const session = getSessionFromRequest(req);
  if (!session?.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const trainingDayId = req.query.trainingDayId as string;

  if (!trainingDayId) {
    return res.status(400).json({ error: 'Training Day ID is required' });
  }

  const supabase = createServerSupabase();

  try {
    // Find the most recent in-progress session for this user and training day
    const { data: activeSession, error } = await supabase
      .from('training_session')
      .select('id, start_time, status')
      .eq('user_id', session.user.id)
      .eq('training_day_id', trainingDayId)
      .eq('status', 'in_progress')
      .order('start_time', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    if (!activeSession) {
      return res.status(200).json(null);
    }

    // If session exists, try to fetch its latest snapshot
    const { data: snapshot } = await supabase
      .from('session_state_snapshot')
      .select('snapshot_data')
      .eq('session_id', activeSession.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    // Return the session combined with the snapshot data (if any)
    return res.status(200).json({
      ...activeSession,
      snapshot_data: snapshot?.snapshot_data || null
    });
  } catch (error) {
    console.error('Error fetching active session:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
