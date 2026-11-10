import { NextApiRequest, NextApiResponse } from 'next';
import { getSessionFromRequest } from '@/lib/session';
import { createServerSupabase } from '@/lib/supabase';
import { z } from 'zod';

const snapshotSchema = z.object({
  snapshot_data: z.record(z.any()),
  snapshot_type: z.string().optional()
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const session = getSessionFromRequest(req);
  if (!session?.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const sessionId = req.query.id as string;
  const supabase = createServerSupabase();

  // GET: Retrieve the latest snapshot for this session
  if (req.method === 'GET') {
    try {
      const { data, error } = await supabase
        .from('session_state_snapshot')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') {
        // PGRST116 is "no rows found"
        throw error;
      }

      return res.status(200).json(data || {});
    } catch (error) {
      console.error('Error fetching snapshot:', error);
      return res.status(500).json({ error: 'Failed to fetch snapshot' });
    }
  }

  // POST: Save a new snapshot
  if (req.method === 'POST') {
    try {
      const {
        success,
        data,
        error: zodError
      } = snapshotSchema.safeParse(req.body);

      if (!success) {
        return res.status(400).json({
          error: 'Invalid request body',
          details: zodError.flatten()
        });
      }

      // Verify session belongs to user before saving
      const { data: trainingSession, error: sessionError } = await supabase
        .from('training_session')
        .select('id')
        .eq('id', sessionId)
        .eq('user_id', session.user.id)
        .single();

      if (sessionError || !trainingSession) {
        return res
          .status(403)
          .json({ error: 'Session not found or access denied' });
      }

      // Insert the snapshot
      const { error: insertError } = await supabase
        .from('session_state_snapshot')
        .insert({
          session_id: sessionId,
          snapshot_data: data.snapshot_data,
          snapshot_type: data.snapshot_type || 'auto_save'
        });

      if (insertError) throw insertError;

      return res.status(200).json({ success: true });
    } catch (error) {
      console.error('Error saving snapshot:', error);
      return res.status(500).json({ error: 'Failed to save snapshot' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
