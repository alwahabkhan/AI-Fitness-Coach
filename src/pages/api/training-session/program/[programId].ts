import { NextApiRequest, NextApiResponse } from 'next';
import { getSessionFromRequest } from '@/lib/session';
import { createServerSupabase } from '@/lib/supabase';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const session = getSessionFromRequest(req);
  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { programId } = req.query;

  if (!programId || typeof programId !== 'string') {
    return res.status(400).json({ error: 'Program ID is required' });
  }

  try {
    const supabase = createServerSupabase();

    // Verify the user has access to this program
    const { data: program, error: programError } = await supabase
      .from('program')
      .select('trainee_id, trainer_id')
      .eq('id', programId)
      .single();

    if (programError || !program) {
      return res.status(404).json({ error: 'Program not found' });
    }

    // Check if user is trainee or trainer for this program
    if (
      program.trainee_id !== session.user.id &&
      program.trainer_id !== session.user.id &&
      session.user.role !== 'admin'
    ) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Fetch all training sessions for this program
    const { data: sessions, error: sessionsError } = await supabase
      .from('training_session')
      .select('*')
      .eq('program_id', programId)
      .order('created_at', { ascending: true });

    if (sessionsError) {
      throw sessionsError;
    }

    return res.status(200).json(sessions || []);
  } catch (error) {
    console.error('Error fetching program sessions:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
