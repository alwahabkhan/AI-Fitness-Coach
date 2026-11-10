/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import { getSessionFromRequest } from '@/lib/session';
import { createServerSupabase } from '@/lib/supabase';

const requestSchema = z.object({
  traineeIds: z.array(z.string().uuid())
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const session = getSessionFromRequest(req);
  if (!session || session.user.role !== 'admin') {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const { traineeIds } = requestSchema.parse(req.body);

    if (traineeIds.length === 0) {
      return res.status(200).json({ sessionCounts: {} });
    }

    const supabase = createServerSupabase();

    // Get all completed training sessions for these trainees
    const { data: sessions, error } = await supabase
      .from('training_session')
      .select('id, user_id')
      .eq('status', 'completed')
      .in('user_id', traineeIds);

    if (error) {
      console.error('Error fetching trainee sessions:', error);
      return res.status(500).json({ error: 'Failed to fetch session counts' });
    }

    // Count sessions per trainee
    const sessionCounts: Record<string, number> = {};
    traineeIds.forEach((id) => {
      sessionCounts[id] = 0;
    });

    sessions?.forEach((session: any) => {
      if (session.user_id) {
        sessionCounts[session.user_id] =
          (sessionCounts[session.user_id] || 0) + 1;
      }
    });

    return res.status(200).json({ sessionCounts });
  } catch (error) {
    console.error('Error in trainee sessions API:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
